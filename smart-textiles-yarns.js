// smart-textiles-yarns.js — part 02 of /smart-textiles.html: the ways a yarn is made to conduct.
// Every scene shows the PROCESS on the left and the yarn CUT ACROSS on the right, with electrons
// (petrol dots) wherever the cross-section actually carries current. Drawing kit: smart-textiles-core.js.
import {
  C, TAU, clamp, lerp, ease, seg, eseg, fr, pulse, rng, mix, poly, path, line, rect, circ, grp, txt, tag,
  callout, strand, arrow, measure, at, electrons, sample, helixRuns, plot,
} from './smart-textiles-core.js';

const VB = '0 0 360 230';
const hex7 = r => [{ x: 0, y: 0 }, ...Array.from({ length: 6 }, (_, k) => ({ x: 2 * r * Math.cos(k * TAU / 6), y: 2 * r * Math.sin(k * TAU / 6) }))];
const hex19 = r => { const out = hex7(r); for (let k = 0; k < 12; k++) { const ring = k % 2 === 0 ? 4 * r : 2 * r * Math.sqrt(3); const a = k * TAU / 12; out.push({ x: ring * Math.cos(a), y: ring * Math.sin(a) }); } return out; };
// a yarn moving along a polyline: a band with travelling ticks so the motion reads
function movingYarn(pts, t, o = {}) {
  const cum = measure(pts), L = cum[cum.length - 1], w = o.w || 5;
  let s = strand(poly(pts), o.edge || C.ink, w, { halo: 1.4, op: 0.9 }) + path(poly(pts), { stroke: C.bg, 'stroke-width': w - 1.6 });
  if (o.fill) s += path(poly(pts), { stroke: o.fill, 'stroke-width': w - 1.6, 'stroke-opacity': o.fillOp ?? 1 });
  // ticks: short marks across the band, moving with the yarn
  const n = Math.round(L / 9);
  for (let i = 0; i < n; i++) {
    const u = fr(i / n + t * (o.laps || 1)), p = at(pts, cum, u), nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
    const col = o.tickColor ? o.tickColor(u) : C.ink;
    s += line(p.x - nx * (w / 2 - 1), p.y - ny * (w / 2 - 1), p.x + nx * (w / 2 - 1), p.y + ny * (w / 2 - 1), { stroke: col, 'stroke-width': 0.8, 'stroke-opacity': 0.75 });
  }
  return s;
}
// a roller / guide, spinning
function roller(x, y, r, t, o = {}) {
  const a = t * TAU * (o.turns || 2) * (o.dir || 1);
  let s = circ(x, y, r, { fill: C.raised, stroke: C.dim, 'stroke-width': 1 });
  for (let k = 0; k < 3; k++) { const b = a + k * TAU / 3; s += line(x, y, x + (r - 1.5) * Math.cos(b), y + (r - 1.5) * Math.sin(b), { stroke: C.faint, 'stroke-width': 0.8 }); }
  return s + circ(x, y, 1.4, { fill: C.dim });
}
function xsFrame(cx, cy, R, label) {
  return circ(cx, cy, R, { fill: 'none', stroke: C.hair, 'stroke-width': 0.8, 'stroke-dasharray': '2 2' }) + tag(cx, cy + R + 11, label || 'cut across', { anchor: 'middle' });
}
// electrons orbiting a ring
function ringElectrons(cx, cy, r, t, n = 3, laps = 1, o = {}) {
  let s = '';
  for (let i = 0; i < n; i++) { const a = TAU * (i / n + t * laps) + (o.phase || 0); s += circ(cx + r * Math.cos(a), cy + r * Math.sin(a), o.r || 1.2, { fill: C.petrol, 'fill-opacity': o.op ?? null }); }
  return s;
}
const liquid = (x, y, w, h, t, label) => {
  let s = rect(x, y, w, h, { fill: 'color-mix(in srgb, var(--petrol, #1c6b6b) 14%, transparent)', stroke: C.line, 'stroke-width': 1, rx: 4 });
  const wave = sample(40, u => ({ x: x + u * w, y: y + 4 + 1.2 * Math.sin(u * TAU * 3 + t * TAU * 2) }));
  s += path(poly(wave), { stroke: C.dim, 'stroke-width': 0.8, 'stroke-opacity': 0.6 });
  if (label) s += tag(x + 5, y + h - 5, label);
  return s;
};

// ============================================================================================
// 1 · METAL PLATED — silver deposited onto nylon from a bath (electroless plating)
// ============================================================================================
const plated = {
  vb: VB, dur: 7000,
  draw(t) {
    let s = liquid(36, 96, 168, 84, t, 'Ag⁺ bath · silver salt + reducer');
    const pts = [{ x: 4, y: 52 }, { x: 44, y: 52 }, { x: 58, y: 150 }, { x: 182, y: 150 }, { x: 196, y: 52 }, { x: 236, y: 52 }];
    const cum = measure(pts), L = cum[cum.length - 1], inBath = cum[2] / L, outBath = cum[3] / L;
    // the yarn: undyed nylon (ink outline) until it is in the bath, silver after
    const before = [pts[0], pts[1], pts[2]], after = [pts[3], pts[4], pts[5]];
    s += movingYarn(before, t, { w: 6, laps: 0.6 });
    const mid = sample(24, u => ({ x: lerp(58, 182, u), y: 150 }));
    s += strand(poly(mid), C.ink, 6, { halo: 1.4, op: 0.9 }) + path(poly(mid), { stroke: C.bg, 'stroke-width': 4.4 });
    // silver builds up along the bath run
    for (let i = 0; i < 24; i++) { const a = mid[i], b = mid[i + 1]; s += line(a.x, a.y, b.x, b.y, { stroke: C.silver, 'stroke-width': 4.4, 'stroke-opacity': f(i / 24) }); }
    function f(u) { return Math.round(clamp(u * 1.1) * 100) / 100; }
    s += strand(poly(after), C.silver, 6, { halo: 1.4 });
    for (let i = 0; i < 12; i++) { const u = fr(i / 12 + t * 1.6), p = at(after, measure(after), u); s += line(p.x - 2.2, p.y - 0.8, p.x + 2.2, p.y + 0.8, { stroke: C.bg, 'stroke-width': 0.8, 'stroke-opacity': 0.5 }); }
    s += roller(58, 150, 7, t, { dir: 1 }) + roller(182, 150, 7, t, { dir: 1 });
    // silver ions drifting to the yarn and landing on it
    const R = rng(11);
    for (let i = 0; i < 26; i++) {
      const x0 = 50 + R() * 140, y0 = 108 + R() * 64, ph = R(), k = fr(t * 1.4 + ph), tx = 64 + R() * 112;
      const x = lerp(x0, tx, ease(k)), y = lerp(y0, 150 + (R() - 0.5) * 4, ease(k));
      if (k > 0.92) continue;
      s += circ(x, y, 1.6, { fill: C.silver, 'fill-opacity': 0.85 }) + txt(x + 2, y - 1.5, '+', { size: 5.5, fill: C.dim });
    }
    s += tag(8, 42, 'nylon in');
    s += tag(236, 42, 'silver out', { anchor: 'end' });
    // the three bath steps, the current one lit
    const steps = ['1 seed the surface (Pd / Sn)', '2 Ag⁺ reduced to Ag metal on it', '3 rinse, dry, wind'];
    const cur = Math.floor(fr(t) * 3);
    steps.forEach((st, i) => { s += txt(36, 196 + i * 11, st, { size: 8, fill: i === cur ? C.ink : C.faint }); });
    // cross-section: seven nylon filaments, each getting a silver skin
    const cx = 298, cy = 92, r = 10.5, skin = 2.6 * eseg(fr(t), 0.04, 0.5) * (1 - eseg(fr(t), 0.94, 1));
    s += xsFrame(cx, cy, 44, 'cut across');
    for (const p of hex7(r)) {
      s += circ(cx + p.x, cy + p.y, r - 0.6, { fill: C.bg, stroke: C.ink, 'stroke-width': 1 });
      if (skin > 0.15) s += circ(cx + p.x, cy + p.y, r - 0.6, { fill: 'none', stroke: C.silver, 'stroke-width': skin });
      if (skin > 2) s += ringElectrons(cx + p.x, cy + p.y, r - 0.6, t, 2, 1.5, { r: 1 });
    }
    s += callout(cx + 2 * r + r, cy - 6, 350, cy - 52, 'silver skin', { anchor: 'end' });
    s += callout(cx, cy, 352, cy + 62, 'nylon core', { anchor: 'end' });
    return s;
  },
};

// ============================================================================================
// 2 · CONDUCTIVE POLYMER COATED — dip, squeeze, dry (PEDOT:PSS or polypyrrole)
// ============================================================================================
const polymer = {
  vb: VB, dur: 6500,
  draw(t) {
    let s = liquid(30, 110, 96, 66, t, 'PEDOT:PSS dispersion');
    const pts = [{ x: 4, y: 60 }, { x: 46, y: 60 }, { x: 62, y: 156 }, { x: 98, y: 156 }, { x: 150, y: 71 }, { x: 250, y: 71 }];
    const cum = measure(pts);
    s += movingYarn([pts[0], pts[1], pts[2]], t, { w: 6, laps: 0.6 });
    s += movingYarn([pts[2], pts[3], pts[4], pts[5]], t, { w: 6, laps: 0.6, fill: C.pedot, edge: C.pedot });
    s += roller(62, 156, 6, t) + roller(98, 156, 6, t);
    // squeeze rollers (the pad): excess drips back into the trough
    s += roller(150, 61, 9, t, { dir: -1, turns: 3 }) + roller(150, 81, 9, t, { dir: 1, turns: 3 });
    for (let i = 0; i < 3; i++) { const k = fr(t * 1.5 + i / 3), y = lerp(92, 114, k * k); s += circ(lerp(142, 120, k), y, 1.6, { fill: C.pedot, 'fill-opacity': 1 - k * 0.6 }); }
    s += tag(150, 46, 'squeeze', { anchor: 'middle' });
    // dryer: heat shimmer rising
    s += rect(176, 52, 66, 38, { fill: 'none', stroke: C.line, 'stroke-width': 1, rx: 3 });
    for (let i = 0; i < 5; i++) {
      const x = 186 + i * 12, ph = t * TAU * 2 + i;
      const wv = sample(12, u => ({ x: x + 2 * Math.sin(u * TAU * 1.5 + ph), y: 86 - u * 12 - fr(t * 2 + i * 0.2) * 6 }));
      s += path(poly(wv), { stroke: C.plum, 'stroke-width': 0.9, 'stroke-opacity': 0.7 });
    }
    s += tag(209, 46, 'dry / cure', { anchor: 'middle' });
    s += tag(8, 50, 'yarn in');
    s += txt(30, 198, 'or polymerised on the yarn: dip in monomer,', { size: 8, fill: C.faint });
    s += txt(30, 209, 'then an oxidant grows the polymer in place', { size: 8, fill: C.faint });
    // cross-section: filaments with a film that also bridges the gaps between them
    const cx = 298, cy = 104, r = 9.5, k = eseg(fr(t), 0.05, 0.45) * (1 - eseg(fr(t), 0.94, 1));
    s += xsFrame(cx, cy, 42);
    const pos = hex7(r);
    if (k > 0.05) {
      // the bridging film: a rounded hull around the bundle
      s += circ(cx, cy, 3 * r + 1.5 * k, { fill: C.pedot, 'fill-opacity': 0.25 * k, stroke: C.pedot, 'stroke-width': 2.2 * k });
    }
    for (const p of pos) s += circ(cx + p.x, cy + p.y, r - 0.6, { fill: C.bg, stroke: C.ink, 'stroke-width': 1 }) + (k > 0.05 ? circ(cx + p.x, cy + p.y, r - 0.6, { fill: 'none', stroke: C.pedot, 'stroke-width': 1.4 * k }) : '');
    if (k > 0.8) s += ringElectrons(cx, cy, 3 * r + 1.5, t, 4, 0.5, { r: 1.2 });
    s += callout(cx + 3 * r, cy - 14, 352, cy - 58, 'polymer film', { anchor: 'end' });
    return s;
  },
};

// ============================================================================================
// 3 · CARBON-LOADED — carbon black compounded into the melt, extruded; it conducts only past percolation
// ============================================================================================
const PERC = (() => {
  const R = rng(303), pts = [], cx = 292, cy = 74, rad = 40;
  while (pts.length < 150) { const x = (R() * 2 - 1) * rad, y = (R() * 2 - 1) * rad; if (Math.hypot(x, y) < rad - 3) pts.push({ x: cx + x, y: cy + y }); }
  return { pts, cx, cy, rad, d: 9.6 };
})();
function spanning(n) {
  const { pts, cx, rad, d } = PERC, P = pts.slice(0, n), prev = new Array(n).fill(-2), q = [];
  for (let i = 0; i < n; i++) if (P[i].x < cx - rad + 10) { prev[i] = -1; q.push(i); }
  let hit = -1;
  for (let h = 0; h < q.length && hit < 0; h++) {
    const i = q[h];
    if (P[i].x > cx + rad - 10) { hit = i; break; }
    for (let j = 0; j < n; j++) if (prev[j] === -2 && Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y) < d) { prev[j] = i; q.push(j); }
  }
  if (hit < 0) return null;
  const chain = []; for (let i = hit; i >= 0; i = prev[i]) chain.push(P[i]);
  return chain;
}
const carbon = {
  vb: VB, dur: 9000,
  draw(t) {
    let s = '';
    // extruder: barrel, turning screw, hopper
    s += rect(16, 58, 142, 34, { fill: C.raised, stroke: C.dim, 'stroke-width': 1, rx: 3 });
    s += line(20, 75, 154, 75, { stroke: C.faint, 'stroke-width': 2 });
    for (let i = -1; i < 12; i++) { const x = 22 + ((i + fr(t * 3)) * 12); if (x < 20 || x > 150) continue; s += path(`M${x},60 L${x + 7},90`, { stroke: C.dim, 'stroke-width': 1.3 }); }
    s += path('M40,58 L30,30 L70,30 L60,58', { stroke: C.dim, 'stroke-width': 1, fill: C.bg });
    const R = rng(5);
    for (let i = 0; i < 16; i++) { const k = fr(t * 1.2 + R()), x = 36 + R() * 28, y = lerp(24, 64, k); if (i % 3) s += circ(x, y, 2.2, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8 }); else s += circ(x, y, 1.3, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.4 }); }
    s += tag(18, 20, 'polymer + carbon black');
    // melt moving right with carbon in it
    for (let i = 0; i < 26; i++) { const x = 70 + fr(R() + t * 0.8) * 86, y = 64 + R() * 22; s += circ(x, y, 1, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.3 }); }
    // die + spinneret, filament drawn down and thinning
    s += path('M158,60 L172,66 L172,84 L158,90 Z', { stroke: C.dim, 'stroke-width': 1, fill: C.raised });
    const fil = sample(30, u => ({ x: 176 + 30 * u * u, y: 75 + u * 120 }));
    for (let i = 0; i < 30; i++) { const a = fil[i], b = fil[i + 1], w = lerp(6, 2.2, i / 30); s += line(a.x, a.y, b.x, b.y, { stroke: C.carbon, 'stroke-width': w }) + line(a.x, a.y, b.x, b.y, { stroke: C.dim, 'stroke-width': 0.4, 'stroke-opacity': 0.5 }); }
    for (let i = 0; i < 8; i++) { const u = fr(i / 8 + t * 1.5), p = at(fil, measure(fil), u); s += circ(p.x, p.y, 0.8, { fill: C.dim }); }
    s += tag(212, 196, 'drawn + cooled', { anchor: 'middle' });
    // cross-section: loading ramps up; once a chain of touching particles spans the fibre, it conducts
    const load = eseg(fr(t), 0.02, 0.72) * (1 - eseg(fr(t), 0.93, 1)), n = Math.round(load * PERC.pts.length);
    s += circ(PERC.cx, PERC.cy, PERC.rad, { fill: C.raised, stroke: C.ink, 'stroke-width': 1 });
    const chain = spanning(n);
    for (let i = 0; i < n; i++) s += circ(PERC.pts[i].x, PERC.pts[i].y, 2.6, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.5 });
    if (chain) {
      s += path(poly(chain), { stroke: C.petrol, 'stroke-width': 1.4, 'stroke-opacity': 0.8 });
      s += electrons(chain, t * 3, { n: 5, r: 1.3 });
    }
    s += tag(352, PERC.cy + PERC.rad + 11, chain ? 'a touching path: conducts' : 'isolated: insulates', { anchor: 'end' });
    // percolation curve: conductivity (log) vs loading
    const wt = load * 30, sig = v => 0.06 + 0.88 / (1 + Math.exp(-(v - 0.5) * 16));
    s += plot({ x: 250, y: 150, w: 100, h: 50, u: load, f: sig, mode: 'time', title: 'conductivity', readout: Math.round(wt) + ' wt%', xl: 'carbon →', yl: 'log', ref: [{ v: 0.5, label: '' }], grid: [] });
    s += line(300, 150, 300, 200, { stroke: C.faint, 'stroke-dasharray': '2 2', 'stroke-width': 0.7 }) + tag(300, 212, 'percolation', { anchor: 'middle', size: 6.5 });
    return s;
  },
};

// ============================================================================================
// 4 · BICOMPONENT — two melts meet in the spinneret: a conductive part placed where it is wanted
// ============================================================================================
const BICO = ['sheath', 'core', 'stripe'];
function bicoSection(cx, cy, r, kind, on, t) {
  let s = '';
  const plain = { fill: C.bg, stroke: C.ink, 'stroke-width': 1 }, cond = { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.7 };
  if (kind === 'sheath') { s += circ(cx, cy, r, cond) + circ(cx, cy, r * 0.62, plain); if (on) s += ringElectrons(cx, cy, r * 0.82, t, 4, 1); }
  if (kind === 'core') { s += circ(cx, cy, r, plain) + circ(cx, cy, r * 0.42, cond); if (on) s += ringElectrons(cx, cy, r * 0.22, t, 2, 1); }
  if (kind === 'stripe') {
    s += circ(cx, cy, r, plain);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; s += circ(cx + r * 0.78 * Math.cos(a), cy + r * 0.78 * Math.sin(a), r * 0.26, cond); if (on) s += circ(cx + r * 0.78 * Math.cos(a), cy + r * 0.78 * Math.sin(a), 1.1, { fill: C.petrol, 'fill-opacity': 0.5 + 0.5 * Math.sin(t * TAU * 4 + k) }); }
  }
  return s;
}
const bico = {
  vb: VB, dur: 9000,
  draw(t) {
    const which = Math.floor(fr(t) * 3), kind = BICO[which];
    let s = '';
    // the spin pack: two channels converging on one capillary
    s += path('M28,20 L28,70 L86,112', { stroke: C.dim, 'stroke-width': 1 }) + path('M50,20 L50,62 L94,96', { stroke: C.dim, 'stroke-width': 1 });
    s += path('M178,20 L178,70 L120,112', { stroke: C.dim, 'stroke-width': 1 }) + path('M156,20 L156,62 L112,96', { stroke: C.dim, 'stroke-width': 1 });
    s += path('M86,112 L94,96 L112,96 L120,112 L110,130 L96,130 Z', { stroke: C.dim, 'stroke-width': 1, fill: C.raised });
    const flowA = sample(20, u => u < 0.6 ? { x: 39, y: 22 + u / 0.6 * 44 } : { x: lerp(39, 98, (u - 0.6) / 0.4), y: lerp(66, 106, (u - 0.6) / 0.4) });
    const flowB = sample(20, u => u < 0.6 ? { x: 167, y: 22 + u / 0.6 * 44 } : { x: lerp(167, 108, (u - 0.6) / 0.4), y: lerp(66, 106, (u - 0.6) / 0.4) });
    const cA = measure(flowA), cB = measure(flowB);
    for (let i = 0; i < 9; i++) { const u = fr(i / 9 + t * 2); const a = at(flowA, cA, u), b = at(flowB, cB, u); s += circ(a.x, a.y, 2, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8 }) + circ(b.x, b.y, 2, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.6 }); }
    s += tag(39, 14, 'plain melt', { anchor: 'middle' }) + tag(167, 14, 'carbon-loaded melt', { anchor: 'middle' });
    // the filament leaving the capillary, and its section growing as it emerges
    const fil = [{ x: 103, y: 130 }, { x: 103, y: 210 }];
    s += strand(poly(fil), C.ink, 7, { halo: 1.2 }) + path(poly(fil), { stroke: C.bg, 'stroke-width': 5.4 });
    if (kind === 'sheath') s += path(poly(fil), { stroke: C.carbon, 'stroke-width': 5.4 }) + path(poly(fil), { stroke: C.bg, 'stroke-width': 2.6 });
    if (kind === 'core') s += path(poly(fil), { stroke: C.carbon, 'stroke-width': 2.2 });
    if (kind === 'stripe') { s += line(101.4, 130, 101.4, 210, { stroke: C.carbon, 'stroke-width': 1.4 }) + line(105, 130, 105, 210, { stroke: C.carbon, 'stroke-width': 1.4 }); }
    for (let i = 0; i < 6; i++) { const y = 130 + fr(i / 6 + t * 2) * 80; s += line(99.5, y, 106.5, y, { stroke: C.bg, 'stroke-width': 0.8, 'stroke-opacity': 0.6 }); }
    // the three placements, the current one large
    const names = { sheath: ['Conductive sheath', 'current on the outside; easy to contact'], core: ['Conductive core', 'insulated by its own sheath'], stripe: ['Conductive stripes', 'a little conductor at the surface; for static control'] };
    s += bicoSection(270, 74, 36, kind, true, t);
    s += txt(270, 128, names[kind][0], { anchor: 'middle', size: 9, fill: C.ink });
    names[kind][1].split('; ').forEach((ln, i) => { s += txt(270, 140 + i * 10, ln, { anchor: 'middle', size: 7.5, fill: C.dim }); });
    BICO.forEach((k, i) => { const x = 232 + i * 38; s += bicoSection(x, 182, 12, k, false, t); if (i === which) s += circ(x, 182, 16, { fill: 'none', stroke: C.petrol, 'stroke-width': 1 }); });
    return s;
  },
};

// ============================================================================================
// 5 · METAL FILAMENT — stainless steel bundle-drawn through dies, then the cladding is dissolved
// ============================================================================================
const bundle = {
  vb: VB, dur: 7000,
  draw(t) {
    let s = '';
    // widths at each stage; dies between them
    const stages = [{ x0: 4, x1: 64, h: 40 }, { x0: 74, x1: 132, h: 28 }, { x0: 142, x1: 196, h: 19 }, { x0: 206, x1: 248, h: 13 }];
    const cy = 92;
    stages.forEach((st, i) => {
      s += rect(st.x0, cy - st.h / 2, st.x1 - st.x0, st.h, { fill: C.copper, 'fill-opacity': 0.28, stroke: C.copper, 'stroke-width': 1 });
      for (let k = 0; k < 5; k++) { const y = cy - st.h / 2 + (k + 0.5) * st.h / 5; s += line(st.x0, y, st.x1, y, { stroke: C.steel, 'stroke-width': Math.max(0.8, st.h / 9) }); }
      const n = 7, step = (st.x1 - st.x0) / n, off = fr(t * (1 + i * 0.7)) * step;
      for (let k = 0; k < n; k++) { const x = st.x0 + k * step + off; if (x < st.x1) s += line(x, cy - st.h / 2, x, cy + st.h / 2, { stroke: C.bg, 'stroke-width': 0.6, 'stroke-opacity': 0.5 }); }
      if (i < 3) {
        const x = st.x1 + 5, a = st.h / 2 + 10, b = stages[i + 1].h / 2;
        s += path(`M${x - 6},${cy - a} L${x + 4},${cy - b - 1} L${x + 4},${cy - b - 10}`, { stroke: C.dim, 'stroke-width': 1.2 }) + path(`M${x - 6},${cy + a} L${x + 4},${cy + b + 1} L${x + 4},${cy + b + 10}`, { stroke: C.dim, 'stroke-width': 1.2 });
        s += tag(x, cy + a + 12, 'die', { anchor: 'middle' });
      }
    });
    // leach bath: cladding dissolves, the fine steel filaments come out loose
    s += liquid(252, 70, 50, 46, t, '');
    s += tag(277, 128, 'acid: cladding off', { anchor: 'middle' });
    for (let k = 0; k < 5; k++) {
      const y0 = cy - 6 + k * 3, spread = (k - 2) * 3.2;
      s += path(poly(sample(12, u => ({ x: 252 + u * 104, y: y0 + spread * ease(clamp((u - 0.4) / 0.6)) + Math.sin(u * 9 + k + t * TAU) * 0.6 }))), { stroke: C.steel, 'stroke-width': 1.1 });
    }
    s += electrons(sample(12, u => ({ x: 300 + u * 56, y: cy - 6 + 2 * 3 })), t * 2, { n: 4 });
    s += tag(4, 52, 'steel rods in a') + tag(4, 61, 'copper / iron matrix');
    // sections above each stage: the same hexagonal bundle, smaller each time
    const xs = [34, 103, 169, 227], rs = [3.2, 2.2, 1.5, 1.05];
    xs.forEach((x, i) => {
      const y = 166, R = rs[i] * 4.4;
      s += circ(x, y, R + rs[i] * 1.2, { fill: C.copper, 'fill-opacity': 0.28, stroke: C.copper, 'stroke-width': 0.8 });
      for (const p of hex19(rs[i] * 0.55)) s += circ(x + p.x, y + p.y, rs[i] * 0.5, { fill: C.steel });
    });
    s += txt(130, 200, 'each die: thinner, longer — to ~8–12 µm filaments', { anchor: 'middle', size: 8, fill: C.faint });
    const y = 166; s += circ(320, y, 13, { fill: 'none', stroke: C.hair, 'stroke-dasharray': '2 2' });
    for (const p of hex19(1.4)) s += circ(320 + p.x * 1.3, y + p.y * 1.3, 1.3, { fill: C.steel });
    s += tag(320, y + 22, 'free bundle', { anchor: 'middle' });
    return s;
  },
};

// ============================================================================================
// 6 · SPUN BLEND — short stainless fibres drafted and twisted together with polyester staple
// ============================================================================================
const DRAFT = { v1: 1, v2: 2.2, v3: 6, z1: 78, z2: 150, z3: 214 };
DRAFT.m2 = DRAFT.z1 + (DRAFT.z2 - DRAFT.z1) * DRAFT.v1 / DRAFT.v2;
DRAFT.m3 = DRAFT.m2 + (DRAFT.z3 - DRAFT.z2) * DRAFT.v1 / DRAFT.v3;
const xOfM = m => m < DRAFT.z1 ? m : m < DRAFT.m2 ? DRAFT.z1 + (m - DRAFT.z1) * DRAFT.v2 / DRAFT.v1 : DRAFT.z2 + (m - DRAFT.m2) * DRAFT.v3 / DRAFT.v1;
const SPUN = (() => { const R = rng(66), f = []; for (let i = 0; i < 110; i++) f.push({ m: R() * 200, y: (R() - 0.5) * 30, ang: (R() - 0.5) * 0.6, len: 18 + R() * 14, steel: i % 9 === 0, ph: R() * TAU }); return f; })();
const spun = {
  vb: VB, dur: 8000,
  draw(t) {
    let s = '';
    const cy = 82, P = 200;
    for (const f of SPUN) {
      const m = fr((f.m + t * P) / P) * P - 10, x = xOfM(m);
      if (x > DRAFT.z3 + 6 || x < 0) continue;
      // the sliver narrows as it is drafted: y scaled toward the axis
      const sq = x < DRAFT.z1 ? 1 : x < DRAFT.z2 ? lerp(1, 0.5, (x - DRAFT.z1) / (DRAFT.z2 - DRAFT.z1)) : lerp(0.5, 0.18, clamp((x - DRAFT.z2) / (DRAFT.z3 - DRAFT.z2)));
      const ang = f.ang * sq, y = cy + f.y * sq, dx = Math.cos(ang) * f.len / 2, dy = Math.sin(ang) * f.len / 2;
      const crimp = sample(8, u => ({ x: x - dx + 2 * dx * u, y: y - dy + 2 * dy * u + (f.steel ? 0 : Math.sin(u * TAU * 1.5 + f.ph) * 1.1 * sq) }));
      s += f.steel ? strand(poly(crimp), C.steel, 1.6, { halo: 0.8 }) : strand(poly(crimp), C.ink, 0.9, { halo: 0.6, op: 0.75 });
    }
    // roller pairs, speeds rising
    [[DRAFT.z1, DRAFT.v1, 'back'], [DRAFT.z2, DRAFT.v2, 'middle'], [DRAFT.z3, DRAFT.v3, 'front']].forEach(([x, v, nm]) => {
      s += roller(x, cy - 26, 9, t * v * 0.4, { dir: -1 }) + roller(x, cy + 26, 9, t * v * 0.4);
      s += tag(x, cy + 48, nm, { anchor: 'middle' }) + tag(x, cy + 57, (v === 1 ? '1' : v.toFixed(1).replace('.0', '')) + '× speed', { anchor: 'middle', size: 6.5 });
    });
    // the twisted yarn leaving the front rollers
    const y0 = cy, x0 = DRAFT.z3 + 8, x1 = 258, rr = 4.2;
    s += rect(x0, y0 - rr, x1 - x0, rr * 2, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.6 });
    for (let k = 0; k < 9; k++) { const x = x0 + fr(k / 9 + t * 2.5) * (x1 - x0 - 6); const steel = k % 4 === 0; s += line(x, y0 + rr, x + 6, y0 - rr, { stroke: steel ? C.steel : C.ink, 'stroke-width': steel ? 1.4 : 0.8, 'stroke-opacity': steel ? 1 : 0.7 }); }
    s += arrow(236, cy - 16, 236, cy - 8, { color: C.dim }) + tag(236, cy - 20, 'twist', { anchor: 'middle' });
    s += txt(10, 200, 'conduction hops fibre to fibre where they touch,', { size: 8, fill: C.faint });
    s += txt(10, 211, 'so resistance depends on twist and steel share', { size: 8, fill: C.faint });
    // section: mostly polyester, a few steel fibres; electrons hop between touching steel fibres
    const cx = 312, cyy = 104, R = rng(9), pts = [];
    while (pts.length < 34) { const a = R() * TAU, d = Math.sqrt(R()) * 30; const p = { x: cx + d * Math.cos(a), y: cyy + d * Math.sin(a) }; if (pts.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 8.5)) pts.push(p); if (R() > 0.999) break; }
    s += xsFrame(cx, cyy, 38, 'steel + polyester');
    const steelIdx = [0, 5, 9, 14, 21];
    pts.forEach((p, i) => { s += circ(p.x, p.y, 4, steelIdx.includes(i) ? { fill: C.steel } : { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8 }); });
    const hop = steelIdx.map(i => pts[i]).filter(Boolean).sort((a, b) => a.x - b.x);
    if (hop.length > 1) { s += path(poly(hop), { stroke: C.petrol, 'stroke-width': 0.8, 'stroke-dasharray': '2 2' }); s += electrons(hop, t * 2, { n: 3, r: 1.3 }); }
    
    return s;
  },
};

// ============================================================================================
// 7 · TWISTED / PLIED — a conductive strand and a plain one twisted around each other
// ============================================================================================
const plied = {
  vb: VB, dur: 5000,
  draw(t) {
    let s = '';
    const yc = 90, x0 = 14, x1 = 250, R = 9, pitch = 46, ph = -t * TAU;
    const A = helixRuns(x0, x1, yc, R, pitch, ph), B = helixRuns(x0, x1, yc, R, pitch, ph + Math.PI);
    const back = [], front = [];
    for (const r of A) (r.front ? front : back).push({ ...r, c: C.silver });
    for (const r of B) (r.front ? front : back).push({ ...r, c: C.ink });
    for (const r of back) s += strand(poly(r.pts), r.c, 6, { halo: 1.2, op: 0.45 });
    for (const r of front) s += strand(poly(r.pts), r.c, 6, { halo: 1.4 });
    // the conductive strand's own filaments: fine lines on its front runs
    for (const r of A) if (r.front && r.pts.length > 2) s += electrons(r.pts, t * 2, { n: 2, r: 1.2 });
    s += tag(x0, yc - 22, 'silver-plated multifilament');
    s += tag(x0, yc + 28, 'polyester or cotton ply');
    s += arrow(x1 + 4, yc - 20, x1 + 4, yc + 20, { color: C.dim }) + tag(x1 + 8, yc + 2, 'S ply');
    // ply angle explanation
    s += txt(14, 150, 'Plying adds strength and wraps the fragile', { size: 8, fill: C.faint });
    s += txt(14, 161, 'conductor in a hard-wearing yarn; it also sets', { size: 8, fill: C.faint });
    s += txt(14, 172, 'how much of it is on the surface to make contact.', { size: 8, fill: C.faint });
    // section: two plies
    const cx = 312, cy = 100, rot = -t * TAU;
    s += xsFrame(cx, cy, 34);
    const a = { x: cx + 12 * Math.cos(rot), y: cy + 12 * Math.sin(rot) }, b = { x: cx - 12 * Math.cos(rot), y: cy - 12 * Math.sin(rot) };
    s += circ(a.x, a.y, 11, { fill: C.bg, stroke: C.silver, 'stroke-width': 1 });
    for (const p of hex7(2.6)) s += circ(a.x + p.x * 1.4, a.y + p.y * 1.4, 2.4, { fill: C.silver });
    s += circ(b.x, b.y, 11, { fill: C.bg, stroke: C.ink, 'stroke-width': 1 });
    for (const p of hex7(2.6)) s += circ(b.x + p.x * 1.4, b.y + p.y * 1.4, 2.4, { fill: 'none', stroke: C.ink, 'stroke-width': 0.6 });
    return s;
  },
};

// ============================================================================================
// 8 · WRAPPED (COVERED) — fine metal wire helically wound around an elastane core; stretch it
// ============================================================================================
const wrapped = {
  vb: VB, dur: 7000, state: { cover: 'single' },
  draw(t, st) {
    let s = '';
    const strain = 0.85 * pulse(fr(t), 0.1, 0.42, 0.55, 0.88);  // 0 -> 85 % -> 0
    const x0 = 14, L0 = 150, L = L0 * (1 + strain), x1 = x0 + L, yc = 78;
    const r0 = 8, rc = r0 / Math.sqrt(1 + strain);              // the core thins as it stretches
    const N = 7.5, pitch = L / N;
    // core: elastane, drawn as an undyed outline
    s += rect(x0, yc - rc, L, 2 * rc, { fill: C.bg, stroke: C.ink, 'stroke-width': 1, rx: rc });
    for (let k = 0; k < 14; k++) { const x = x0 + (k + 0.5) * L / 14; s += line(x - 2, yc - rc + 2, x + 2, yc + rc - 2, { stroke: C.faint, 'stroke-width': 0.6 }); }
    const wire = (ph, sign, col) => {
      const runs = helixRuns(x0, x1, yc, rc + 1.1, pitch, ph, { sign });
      return { back: runs.filter(r => !r.front), front: runs.filter(r => r.front), col };
    };
    const ws = [wire(0, 1, C.copper)];
    if (st.cover === 'double') ws.push(wire(Math.PI / 2, -1, C.silver));
    for (const w of ws) for (const r of w.back) s += strand(poly(r.pts), w.col, 1.7, { halo: 0.8, op: 0.4 });
    for (const w of ws) for (const r of w.front) s += strand(poly(r.pts), w.col, 1.7, { halo: 0.9 });
    // electrons follow the wire's helix (shown on the front runs)
    for (const r of ws[0].front) if (r.pts.length > 3) s += electrons(r.pts, t * 3, { n: 1, r: 1.2 });
    s += tag(x0, yc - 20, st.cover === 'double' ? 'two wires, opposite directions: balanced, no snarl' : 'Ag-Cu alloy wire, ~30–80 µm');
    s += tag(x0, yc + 26, 'elastane core');
    s += arrow(x1 + 4, yc, x1 + 18, yc, { color: C.dim }) + arrow(x0 - 2, yc, x0 - 12, yc, { color: C.dim });
    // read-outs: helix angle, and resistance vs strain (flat until the wire runs out of slack)
    const wl = Math.hypot(pitch, TAU * (r0 + 1.1)), angle = Math.atan2(pitch, TAU * (rc + 1.1)) * 180 / Math.PI;
    s += txt(14, 128, `strain ${Math.round(strain * 100)} %   helix ${Math.round(angle)}° to the axis`, { size: 8.5, fill: C.ink });
    s += txt(14, 140, 'the wire unwinds instead of stretching', { size: 8, fill: C.faint });
    const rOf = e => 0.18 + (e > 0.95 ? (e - 0.95) * 6 : 0) + 0.02 * e;
    s += plot({ x: 30, y: 160, w: 140, h: 44, mode: 'xy', u: strain / 1.15, curve: u => ({ x: u, y: rOf(u * 1.15) }), title: 'resistance vs strain', readout: '', xl: '→ 115 %', yl: 'R', ref: [{ v: 0.18 }], grid: [] });
    s += line(30 + 140 * 0.95 / 1.15, 160, 30 + 140 * 0.95 / 1.15, 204, { stroke: C.faint, 'stroke-dasharray': '2 2', 'stroke-width': 0.7 });
    s += tag(30 + 140 * 0.95 / 1.15 - 3, 168, 'wire straight', { anchor: 'end', size: 6.5 });
    s += plot({ x: 200, y: 160, w: 140, h: 44, u: fr(t), f: v => 0.85 * pulse(v, 0.1, 0.42, 0.55, 0.88) / 1.1 + 0.05, title: 'strain over time', grid: [], color: C.plum });
    return s;
  },
};

// ============================================================================================
// 9 · FLAT TAPE (TINSEL) — a thin flat metal ribbon wound around a textile core, like tape
// ============================================================================================
const tinsel = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const yc = 96, x0 = 6, xw = 112, x1 = 256, rc = 8, pitch = 18, band = 7;
    // the core runs right; left of the wrap point it is bare
    s += rect(x0, yc - rc, x1 - x0, 2 * rc, { fill: C.bg, stroke: C.ink, 'stroke-width': 1, rx: 3 });
    for (let k = 0; k < 18; k++) { const x = x0 + fr(k / 18 + t * 0.9) * (xw - x0); s += line(x, yc - rc + 1.5, x + 3, yc + rc - 1.5, { stroke: C.faint, 'stroke-width': 0.6 }); }
    // the ribbon: each turn is a parallelogram on the front face, drawn edge-lit
    const off = fr(t * 2) * pitch;
    for (let x = xw - pitch + off; x < x1; x += pitch) {
      if (x + band < xw) continue;
      const xa = Math.max(xw, x), xb = Math.min(x1, x + band);
      const slant = 7;
      const face = `M${xa},${yc + rc} L${xa + slant},${yc - rc} L${xb + slant},${yc - rc} L${xb},${yc + rc} Z`;
      s += path(face, { fill: C.silver, stroke: C.bg, 'stroke-width': 0.6 });
      s += line(xa + slant * 0.5, yc, xb + slant * 0.5, yc, { stroke: C.bg, 'stroke-width': 0.5, 'stroke-opacity': 0.4 });
    }
    // the ribbon feeding in from its spool, twisting edge-on to flat
    s += circ(xw + 3, 30, 14, { fill: C.raised, stroke: C.dim, 'stroke-width': 1 }) + circ(xw + 3, 30, 5, { fill: C.bg, stroke: C.dim });
    const a = t * TAU * 2; s += line(xw + 3, 30, xw + 3 + 12 * Math.cos(a), 30 + 12 * Math.sin(a), { stroke: C.faint });
    const feed = sample(16, u => ({ x: xw + 3 + u * 2, y: 44 + u * (yc - rc - 44) }));
    for (let i = 0; i < 16; i++) { const p = feed[i], q = feed[i + 1], w = lerp(1.2, band, (i + 0.5) / 16) * Math.abs(Math.cos(i / 16 * Math.PI * 0.5)); s += line(p.x, p.y, q.x, q.y, { stroke: C.silver, 'stroke-width': Math.max(1.2, w) }); }
    s += tag(xw + 22, 32, 'flat ribbon, ~10 µm thick');
    s += tag(x0, yc + 24, 'polyester core');
    s += electrons([{ x: xw + 10, y: yc }, { x: x1, y: yc }], t * 2, { n: 6, r: 1.3 });
    s += txt(14, 160, 'Flat foil wound with a slight overlap gives', { size: 8, fill: C.faint });
    s += txt(14, 171, 'a lot of metal surface for little bulk.', { size: 8, fill: C.faint });
    s += txt(14, 182, 'Several can share one core (tinsel wire).', { size: 8, fill: C.faint });
    // section: core, ribbon as a thin flat arc
    const cx = 312, cy = 100;
    s += xsFrame(cx, cy, 34);
    s += circ(cx, cy, 20, { fill: C.bg, stroke: C.ink, 'stroke-width': 1 });
    for (const p of hex7(4.6)) s += circ(cx + p.x * 0.95, cy + p.y * 0.95, 4, { fill: 'none', stroke: C.ink, 'stroke-width': 0.6 });
    const rot = t * TAU;
    s += path(`M${cx + 22 * Math.cos(rot)},${cy + 22 * Math.sin(rot)} A22,22 0 1 1 ${cx + 22 * Math.cos(rot - 0.5)},${cy + 22 * Math.sin(rot - 0.5)}`, { stroke: C.silver, 'stroke-width': 2.4 });
    return s;
  },
};

// ============================================================================================
// 10 · CORE-SPUN — staple fibres spun around a metal or conductive filament core
// ============================================================================================
const corespun = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const yc = 92, x0 = 6, xw = 120, x1 = 256, rc = 3;
    // the core: bare wire before the spinning point
    s += strand(`M${x0},${yc} L${x1},${yc}`, C.copper, 3, { halo: 1 });
    s += electrons([{ x: x0, y: yc }, { x: xw, y: yc }], t * 2, { n: 6, r: 1.2 });
    // a fibre ribbon approaching from below-left, fanning in to the spinning point
    const R = rng(21);
    for (let i = 0; i < 16; i++) {
      const k = fr(R() + t * 1.2), y0 = 150 + R() * 40, xa = 40 + R() * 40;
      const p = { x: lerp(xa, xw, k), y: lerp(y0, yc + 6, k) }, a = Math.atan2(yc - y0, xw - xa);
      s += strand(poly(sample(6, u => ({ x: p.x + (u - 0.5) * 16 * Math.cos(a), y: p.y + (u - 0.5) * 16 * Math.sin(a) + Math.sin(u * 7 + i) * 0.8 }))), C.ink, 0.9, { halo: 0.6, op: 0.7 });
    }
    s += tag(40, 205, 'staple fibre (cotton, aramid …)');
    // the covered section: a fuzzy sheath of helical fibres hides the wire
    const R2 = 9;
    s += rect(xw, yc - R2, x1 - xw, 2 * R2, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.5, rx: 4 });
    s += line(xw, yc, x1, yc, { stroke: C.copper, 'stroke-width': 1.4, 'stroke-opacity': 0.25 });
    for (let k = 0; k < 22; k++) { const x = xw + fr(k / 22 + t * 1.6) * (x1 - xw - 10); s += line(x, yc + R2 - 1, x + 9, yc - R2 + 1, { stroke: C.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.75 }); }
    // spinning point: a rotating hint
    const a = t * TAU * 4; s += path(`M${xw - 6 * Math.cos(a)},${yc - 14} Q${xw},${yc - 20} ${xw + 6 * Math.cos(a)},${yc - 14}`, { stroke: C.dim, 'stroke-width': 1 }) + arrow(xw + 6 * Math.cos(a), yc - 14, xw + 6 * Math.cos(a) + 2, yc - 12, { color: C.dim, head: 3 });
    s += tag(xw, yc - 24, 'spinning point', { anchor: 'middle' });
    s += tag(x0, yc - 10, 'copper or steel core');
    s += txt(140, 130, 'The sheath insulates, adds grip', { size: 8, fill: C.faint });
    s += txt(140, 141, 'and makes it feel like yarn.', { size: 8, fill: C.faint });
    const cx = 312, cy = 100;
    s += xsFrame(cx, cy, 34);
    s += circ(cx, cy, 5, { fill: C.copper }) + ringElectrons(cx, cy, 2.5, t, 2, 2, { r: 0.9 });
    const Rr = rng(4); for (let i = 0; i < 26; i++) { const ang = i / 26 * TAU + Rr() * 0.2, d = 10 + Rr() * 14; s += circ(cx + d * Math.cos(ang), cy + d * Math.sin(ang), 3, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.7 }); }
    return s;
  },
};

// ============================================================================================
// 11 · BRAIDED — strands from carriers circling in opposite directions interlace around a core
// ============================================================================================
function braidSegs(x0, x1, yc, R, pitch, ph, nPer) {
  // 2 sets of nPer helices, opposite hands; over / under alternate at each crossing (diamond 1/1)
  const segs = [], step = 1.4;
  for (let set = 0; set < 2; set++) for (let i = 0; i < nPer; i++) {
    const sign = set ? -1 : 1, off = TAU * i / nPer + (set ? Math.PI / nPer : 0);
    let prev = null;
    for (let x = x0; x <= x1; x += step) {
      const th = sign * (TAU * (x - x0) / pitch + ph) + off, c = Math.cos(th);
      const p = { x, y: yc + R * Math.sin(th) };
      if (prev && c > -0.15) {
        // crossings happen where two opposite-hand strands share a phase; the bump sets over/under
        const k = (TAU * (x - x0) / pitch + ph) * nPer / Math.PI, cell = Math.floor(k + 0.5) + i + (set ? 1 : 0);
        const near = 1 - Math.min(1, Math.abs(k - Math.round(k)) * 2.4);
        const bump = (cell % 2 === 0 ? 1 : -1) * (set ? -1 : 1) * 0.35 * near;
        segs.push({ a: prev, b: p, depth: c + bump, set, i, c });
      }
      prev = p;
    }
  }
  return segs.sort((a, b) => a.depth - b.depth);
}
const braid = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const yc = 84, x0 = 70, x1 = 252, R = 13, pitch = 58, nPer = 4;
    // core
    s += rect(x0 - 64, yc - 7, x1 - x0 + 64, 14, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.6, rx: 3 });
    // strands converging into the braid point from carriers (fan on the left)
    for (let k = 0; k < 8; k++) {
      const ang = TAU * k / 8 + t * TAU * (k % 2 ? -1 : 1) * 0.5, y = yc + 46 * Math.sin(ang), col = (k === 0 || k === 5) ? C.silver : C.dim;
      s += line(14, y, x0, yc + R * Math.sin(ang * 0.4), { stroke: col, 'stroke-width': 1, 'stroke-opacity': Math.cos(ang) > 0 ? 0.9 : 0.35 });
    }
    s += tag(18, yc - 52, 'from the carriers');
    const segs = braidSegs(x0, x1, yc, R, pitch, -t * TAU, nPer);
    for (const g of segs) {
      const silver = (g.set === 0 && g.i === 0) || (g.set === 1 && g.i === 2);
      const col = silver ? C.silver : C.ink, o = g.c < 0 ? 0.35 : 1;
      s += line(g.a.x, g.a.y, g.b.x, g.b.y, { stroke: C.bg, 'stroke-width': 5.2, 'stroke-linecap': 'butt' });
      s += line(g.a.x, g.a.y, g.b.x, g.b.y, { stroke: col, 'stroke-width': 3, 'stroke-opacity': o, 'stroke-linecap': 'round' });
    }
    s += tag(x1, yc + 26, 'diamond braid, 1 over 1 under', { anchor: 'end' });
    // the maypole: carriers on a serpentine track, half each way round (top view)
    const mx = 70, my = 176, mr = 30;
    s += circ(mx, my, mr, { fill: 'none', stroke: C.hair, 'stroke-width': 6 });
    for (let k = 0; k < 8; k++) {
      const dir = k % 2 ? -1 : 1, base = TAU * Math.floor(k / 2) / 4, a = base + dir * t * TAU * 0.25;
      const wob = Math.sin(a * 4) * 5 * dir, x = mx + (mr + wob) * Math.cos(a), y = my + (mr + wob) * Math.sin(a);
      const silver = k === 0 || k === 5;
      s += circ(x, y, 3.6, { fill: silver ? C.silver : C.bg, stroke: silver ? C.silver : C.ink, 'stroke-width': 1 });
      if (dir > 0) s += circ(x, y, 1, { fill: C.bg }); else s += line(x - 1.6, y, x + 1.6, y, { stroke: silver ? C.bg : C.ink, 'stroke-width': 0.8 });
    }
    s += circ(mx, my, 4, { fill: C.raised, stroke: C.dim });
    s += tag(mx + mr + 16, my - 10, 'carriers, seen from above:');
    s += tag(mx + mr + 16, my + 1, 'ringed ones run clockwise,');
    s += tag(mx + mr + 16, my + 11, 'barred ones counter-clockwise;');
    s += tag(mx + mr + 16, my + 21, 'each weaves in and out of the other set');
    // a conductive braid over an insulated core is a textile cable shield
    s += electrons(sample(20, u => ({ x: x0 + u * (x1 - x0), y: yc - R + 1 })), t * 2, { n: 6, r: 1.1, op: 0.9 });
    return s;
  },
};

// ============================================================================================
// THE LADDER — resistance per metre of each kind, on a log scale (orders of magnitude only)
// ============================================================================================
const LADDER = [
  { name: 'Wrapped / tinsel / core-spun copper or Ag-Cu wire', lo: 0.3, hi: 20, col: C.copper },
  { name: '100 % stainless steel filament or spun', lo: 8, hi: 150, col: C.steel },
  { name: 'Silver-plated nylon or polyester', lo: 5, hi: 1000, col: C.silver },
  { name: 'Stainless / polyester spun blend', lo: 500, hi: 1e5, col: C.steel },
  { name: 'Conductive-polymer coated', lo: 1e3, hi: 1e6, col: C.pedot },
  { name: 'Carbon-loaded and bicomponent', lo: 1e4, hi: 1e9, col: C.carbon },
];
const ladder = {
  vb: '0 0 720 220', dur: 12000,
  draw(t) {
    let s = '';
    const x0 = 300, x1 = 706, lo = -1, hi = 9, X = v => x0 + (Math.log10(v) - lo) / (hi - lo) * (x1 - x0);
    for (let d = lo; d <= hi; d++) {
      const x = X(10 ** d);
      s += line(x, 14, x, 170, { stroke: C.hair, 'stroke-width': 0.6 });
      const lab = d < 0 ? '0.1' : d < 3 ? String(10 ** d) : d < 6 ? (10 ** (d - 3)) + 'k' : d < 9 ? (10 ** (d - 6)) + 'M' : '1G';
      s += txt(x, 184, lab, { anchor: 'middle', size: 8.5 });
    }
    s += tag(x1, 198, 'Ω per metre (log)', { anchor: 'end' });
    // what each range is good for
    const zones = [[0.1, 50, 'power · heat'], [50, 1e5, 'signals · sensing'], [1e5, 1e9, 'anti-static']];
    zones.forEach(([a, b, nm]) => { s += line(X(a) + 2, 208, X(b) - 2, 208, { stroke: C.line, 'stroke-width': 2 }); s += tag((X(a) + X(b)) / 2, 218, nm, { anchor: 'middle', size: 6.8 }); });
    const cur = Math.floor(fr(t) * LADDER.length), k = fr(fr(t) * LADDER.length);
    LADDER.forEach((r, i) => {
      const y = 22 + i * 25, on = i === cur;
      s += txt(x0 - 10, y + 4, r.name, { anchor: 'end', size: 8.5, fill: on ? C.ink : C.dim });
      s += rect(X(r.lo), y - 5, X(r.hi) - X(r.lo), 10, { fill: r.col, 'fill-opacity': on ? 0.95 : 0.55, stroke: on ? C.ink : 'none', 'stroke-width': 0.8, rx: 5 });
      if (on) {
        // a probe reads along the range
        const v = 10 ** lerp(Math.log10(r.lo), Math.log10(r.hi), 0.5 + 0.5 * Math.sin(k * TAU)), x = X(v);
        s += line(x, y - 10, x, y + 10, { stroke: C.petrol, 'stroke-width': 1.4 }) + circ(x, y - 10, 2.2, { fill: C.petrol });
        const lab = v < 1 ? v.toFixed(1) : v < 1e3 ? Math.round(v) : v < 1e6 ? Math.round(v / 1e3) + ' k' : v < 999.5e6 ? Math.round(v / 1e6) + ' M' : (v / 1e9).toFixed(1).replace(/\.0$/, '') + ' G';
        s += x > x1 - 70 ? txt(x - 5, y - 9, lab + ' Ω/m', { size: 8, fill: C.ink, anchor: 'end' }) : txt(x + 5, y - 9, lab + ' Ω/m', { size: 8, fill: C.ink });
      }
    });
    return s;
  },
};

export const YARN_SCENES = { plated, polymer, carbon, bico, bundle, spun, plied, wrapped, tinsel, corespun, braid, ladder };
