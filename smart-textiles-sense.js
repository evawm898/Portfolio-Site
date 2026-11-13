// smart-textiles-sense.js — part 04 of /smart-textiles.html: textiles that SENSE. Each scene shows the
// mechanism and, beside it, the reading it produces (a live trace whose cursor runs with the loop).
// Drawing kit: smart-textiles-core.js.
import {
  C, TAU, clamp, lerp, ease, seg, eseg, fr, pulse, rng, mix, poly, path, line, rect, circ, txt, tag,
  callout, strand, arrow, measure, at, electrons, sample, plot,
} from './smart-textiles-core.js';

const VB = '0 0 360 230';
// a fingertip pressing down from above: an outline, so it reads as "something" and not a material
function finger(cx, yTip, w = 26) {
  return path(`M${cx - w / 2},${yTip - 60} L${cx - w / 2},${yTip - 12} Q${cx - w / 2},${yTip} ${cx},${yTip} Q${cx + w / 2},${yTip} ${cx + w / 2},${yTip - 12} L${cx + w / 2},${yTip - 60}`, { stroke: C.ink, 'stroke-width': 1.2, fill: C.bg })
    + path(`M${cx - w / 2 + 5},${yTip - 30} Q${cx},${yTip - 24} ${cx + w / 2 - 5},${yTip - 30}`, { stroke: C.faint, 'stroke-width': 0.8 });
}
const press = t => pulse(fr(t), 0.12, 0.32, 0.55, 0.78);       // 0 -> 1 -> 0 each loop

// ============================================================================================
// RESISTIVE PRESSURE — a carbon-coated fibre layer between two conductive fabrics
// ============================================================================================
const RFIB = (() => { const R = rng(71), f = []; for (let i = 0; i < 26; i++) f.push({ x: 22 + R() * 196, y: R(), len: 30 + R() * 40, ang: (R() - 0.5) * 0.5, ph: R() * TAU }); return f; })();
const RCON = (() => { const R = rng(72), c = []; for (let i = 0; i < 40; i++) c.push({ x: 40 + R() * 160, y: R(), th: R() }); return c; })();
const resistive = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const F = press(t), cx = 120, top = 54, bot = 116;
    const dip = x => F * 20 * Math.exp(-(((x - cx) / 38) ** 2));    // how far the top layer is pushed down here
    // bottom electrode
    s += rect(14, bot, 212, 6, { fill: C.silver });
    // fibres of the sensing layer, squeezed under the finger
    for (const f of RFIB) {
      const pts = sample(10, u => {
        const x = f.x + (u - 0.5) * f.len * Math.cos(f.ang);
        const yy = lerp(top + 7 + dip(x), bot - 3, f.y) + (u - 0.5) * f.len * Math.sin(f.ang) * (1 - dip(x) / 30) + Math.sin(u * 6 + f.ph) * 1.5;
        return { x: clamp(x, 16, 224), y: clamp(yy, top + 6 + dip(x), bot - 2) };
      });
      s += strand(poly(pts), C.carbon, 2.2, { halo: 0.5 }) + path(poly(pts), { stroke: C.dim, 'stroke-width': 0.4, 'stroke-opacity': 0.7 });
    }
    // top electrode, bent by the finger
    const topLine = sample(40, u => ({ x: 14 + u * 212, y: top + dip(14 + u * 212) }));
    s += path(poly(topLine), { stroke: C.silver, 'stroke-width': 6 });
    s += finger(cx, top - 3 + dip(cx), 30);
    // contact points: more fibres touch the more it is squeezed
    const nOn = Math.round(6 + F * 30);
    for (let i = 0; i < nOn; i++) { const c = RCON[i], d = dip(c.x) / 20; if (d < c.th * 0.9 && i > 5) continue; s += circ(c.x, lerp(top + 9 + dip(c.x), bot - 4, c.y), 1.5, { fill: C.petrol }); }
    // current from the top electrode to the bottom one, through the contacts
    const nPaths = Math.round(1 + F * 5);
    for (let k = 0; k < nPaths; k++) { const x = cx + (k - (nPaths - 1) / 2) * 12; s += electrons([{ x, y: top + 3 + dip(x) }, { x: x + 3, y: (top + bot) / 2 + dip(x) / 2 }, { x, y: bot }], t * 4 + k * 0.3, { n: 3, r: 1.3 }); }
    s += tag(232, top + 3, 'conductive fabric');
    s += tag(232, (top + bot) / 2 + 3, 'carbon-coated fibres');
    s += tag(232, bot + 5, 'conductive fabric');
    // readings
    const R = v => 1 / (1 + 6 * v);
    s += plot({ x: 30, y: 150, w: 150, h: 54, u: fr(t), f: v => R(press(v)) * 0.9 + 0.05, title: 'resistance', readout: `${Math.round(R(F) * 50)} kΩ`, xl: 'time', grid: [] });
    s += plot({ x: 214, y: 150, w: 120, h: 54, mode: 'xy', u: F, curve: v => ({ x: v, y: R(v) * 0.9 + 0.05 }), title: 'R vs force', xl: 'force →', grid: [], color: C.petrol });
    return s;
  },
};

// ============================================================================================
// CAPACITIVE PRESSURE — two conductive layers either side of a spacer fabric; press, the gap closes
// ============================================================================================
const capacitive = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const F = press(t), cx = 120, top = 50, bot = 118, d0 = bot - top;
    const dip = x => F * 30 * Math.exp(-(((x - cx) / 46) ** 2));
    s += rect(14, bot, 212, 6, { fill: C.silver });
    // spacer fabric: pile monofilaments that bow as the gap closes
    for (let x = 22; x <= 218; x += 9) {
      const g = d0 - dip(x), bow = (d0 - g) * 0.6 * (x % 18 ? 1 : -1);
      s += path(`M${x},${top + dip(x) + 3} Q${x + bow},${(top + dip(x) + bot) / 2} ${x},${bot}`, { stroke: C.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.55 });
    }
    // field lines between the plates: closer gap, denser field (indigo, dashed)
    for (let x = 26; x <= 214; x += 12) {
      const g = d0 - dip(x), dens = clamp(1.1 - g / d0 + 0.25);
      s += line(x + 4, top + dip(x) + 5, x + 4, bot - 1, { stroke: C.indigo, 'stroke-width': 0.9, 'stroke-dasharray': '2 2.5', 'stroke-opacity': dens });
    }
    const topLine = sample(40, u => ({ x: 14 + u * 212, y: top + dip(14 + u * 212) }));
    s += path(poly(topLine), { stroke: C.silver, 'stroke-width': 6 });
    // charges on the plates: more stored the closer they are
    const n = Math.round(5 + F * 9);
    for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * 9; s += txt(x, top + dip(x) - 4, '+', { anchor: 'middle', size: 8, fill: C.ink }) + txt(x, bot + 14, '−', { anchor: 'middle', size: 8, fill: C.ink }); }
    s += finger(cx, top - 3 + dip(cx) - 6, 36);
    s += tag(232, top + 3, 'electrode');
    s += tag(232, (top + bot) / 2, 'spacer fabric');
    s += tag(232, (top + bot) / 2 + 9, '(air + pile yarns)');
    s += tag(232, bot + 5, 'electrode');
    s += txt(232, 140, 'C = εA / d', { size: 10, fill: C.ink });
    s += txt(232, 152, 'smaller gap d,', { size: 8, fill: C.faint }) + txt(232, 162, 'more charge stored', { size: 8, fill: C.faint });
    const Cap = v => 1 / (1 - 0.42 * v);
    s += plot({ x: 30, y: 158, w: 170, h: 50, u: fr(t), f: v => (Cap(press(v)) - 1) / 0.75 * 0.85 + 0.08, title: 'capacitance', readout: `${(12 * Cap(F)).toFixed(1)} pF`, xl: 'time', grid: [], color: C.indigo });
    return s;
  },
};

// ============================================================================================
// PRESSURE MAPPING — rows and columns of conductive yarn; the electronics scan one row at a time
// ============================================================================================
const NG = 8;
const matrix = {
  vb: VB, dur: 8000,
  draw(t) {
    let s = '';
    const x0 = 24, y0 = 24, g = 20, T = fr(t);
    // the pressing blob drifts along a loop (a foot rolling heel to toe, say)
    const bx = x0 + g * (2 + 3.5 * (0.5 - 0.5 * Math.cos(T * TAU))), by = y0 + g * (2.2 + 3 * (0.5 - 0.5 * Math.cos(T * TAU * 2)));
    const val = (r, c) => { const x = x0 + (c + 0.5) * g, y = y0 + (r + 0.5) * g; return clamp(1.15 * Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (2 * 22 ** 2))); };
    const scan = fr(t * 16) * NG, row = Math.floor(scan), col = Math.floor(fr(scan) * NG);
    // bottom layer: columns; top layer: rows (with the active one lit)
    for (let c = 0; c < NG; c++) { const x = x0 + (c + 0.5) * g; s += strand(`M${x},${y0 - 6} L${x},${y0 + NG * g + 6}`, C.silver, 3, { halo: 1, op: c === col ? 1 : 0.5 }); }
    for (let r = 0; r < NG; r++) { const y = y0 + (r + 0.5) * g; s += strand(`M${x0 - 6},${y} L${x0 + NG * g + 6},${y}`, C.silver, 3, { halo: 1, op: r === row ? 1 : 0.5 }); }
    // the pressure under the blob at each crossing, as a disc that grows
    for (let r = 0; r < NG; r++) for (let c = 0; c < NG; c++) { const v = val(r, c); if (v > 0.05) s += circ(x0 + (c + 0.5) * g, y0 + (r + 0.5) * g, 2 + v * 6, { fill: C.plum, 'fill-opacity': 0.25 + 0.6 * v }); }
    s += circ(bx, by, 26, { fill: 'none', stroke: C.ink, 'stroke-width': 0.8, 'stroke-dasharray': '3 3' });
    // the crossing being read right now
    s += circ(x0 + (col + 0.5) * g, y0 + (row + 0.5) * g, 5, { fill: 'none', stroke: C.petrol, 'stroke-width': 1.4 });
    s += arrow(x0 - 16, y0 + (row + 0.5) * g, x0 - 8, y0 + (row + 0.5) * g, { color: C.petrol, head: 3 }) + tag(x0 - 18, y0 - 8, 'drive', { size: 6.5 });
    s += arrow(x0 + (col + 0.5) * g, y0 + NG * g + 8, x0 + (col + 0.5) * g, y0 + NG * g + 16, { color: C.petrol, head: 3 }) + tag(x0 + NG * g, y0 + NG * g + 22, 'read', { anchor: 'end', size: 6.5 });
    // the image the electronics build, one cell at a time: cells already read this pass show now,
    // cells not yet read still show the previous pass
    const hx = 214, hy = 34, hg = 15;
    s += tag(hx, hy - 8, 'what the electronics see');
    for (let r = 0; r < NG; r++) for (let c = 0; c < NG; c++) {
      const read = r < row || (r === row && c <= col), v = read ? val(r, c) : val(r, c) * 0.92;
      s += rect(hx + c * hg, hy + r * hg, hg - 1.5, hg - 1.5, { fill: mix(C.raised, C.plum, clamp(v)), stroke: r === row && c === col ? C.petrol : 'none', 'stroke-width': 1.2 });
    }
    s += txt(hx, hy + NG * hg + 14, '64 crossings, 16 wires:', { size: 8, fill: C.faint });
    s += txt(hx, hy + NG * hg + 25, 'one row driven at a time', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// STRAIN — a stretchy yarn coated with conductive particles: stretch it, the contacts part
// ============================================================================================
const SPART = (() => { const R = rng(81), p = []; for (let i = 0; i < 70; i++) p.push({ u: R(), v: R() }); return p; })();
const strainSc = {
  vb: VB, dur: 7000,
  draw(t) {
    let s = '';
    const T = fr(t), e = pulse(T, 0.08, 0.42, 0.52, 0.86), L = 180 * (1 + 0.5 * e), x0 = 180 - L / 2, yc = 66, h = 34 / Math.sqrt(1 + 0.5 * e);
    s += rect(x0, yc - h / 2, L, h, { fill: C.bg, stroke: C.ink, 'stroke-width': 1, rx: h / 2 });
    s += arrow(x0 - 3, yc, x0 - 14, yc, { color: C.dim }) + arrow(x0 + L + 3, yc, x0 + L + 14, yc, { color: C.dim });
    // particles on the coating, carried apart with the surface
    const P = SPART.map(p => ({ x: x0 + 6 + p.u * (L - 12), y: yc - h / 2 + 3 + p.v * (h - 6) }));
    const link = 13.5;
    let links = 0;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      if (d < link) { links++; s += line(P[i].x, P[i].y, P[j].x, P[j].y, { stroke: C.petrol, 'stroke-width': 0.8, 'stroke-opacity': 0.75 }); }
    }
    for (const p of P) s += circ(p.x, p.y, 2.2, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.5 });
    s += tag(x0, yc - h / 2 - 8, `${links} particle contacts · strain ${Math.round(e * 50)} %`);
    s += tag(x0, yc + h / 2 + 13, 'elastic core, carbon coating');
    // R vs strain: loading and unloading take different paths (hysteresis)
    const load = T < 0.47;
    const up = u => 0.12 + 0.72 * u ** 1.6, down = u => 0.12 + 0.72 * u ** 0.75;
    s += plot({ x: 30, y: 140, w: 130, h: 62, mode: 'xy', u: 1, full: true, series: [
      { curve: u => ({ x: u, y: up(u) }), color: C.petrol, noDot: true },
      { curve: u => ({ x: u, y: down(u) }), color: C.petrol, dash: '3 2', noDot: true },
    ], title: 'R vs strain', xl: 'strain →', grid: [] });
    s += circ(30 + 130 * e, 140 + 62 - (load ? up(e) : down(e)) * 62, 2.6, { fill: C.petrol, stroke: C.bg });
    s += tag(158, 150, load ? 'solid: stretching' : 'dashed: relaxing', { size: 6.5, anchor: 'end' });
    s += plot({ x: 210, y: 140, w: 130, h: 62, u: T, f: v => { const ee = pulse(v, 0.08, 0.42, 0.52, 0.86); return v < 0.47 ? up(ee) : down(ee); }, title: 'resistance over time', grid: [], color: C.petrol });
    return s;
  },
};

// ============================================================================================
// JOINT ANGLE — a strain strip over the elbow reads how far the arm is bent
// ============================================================================================
const angle = {
  vb: VB, dur: 7000,
  draw(t) {
    let s = '';
    const T = fr(t), bend = pulse(T, 0.06, 0.4, 0.55, 0.9), th = (8 + bend * 112) * Math.PI / 180;
    const ex = 122, ey = 118, Lu = 100, Lf = 92, w = 14;
    const d = { x: Math.cos(th), y: -Math.sin(th) }, n = { x: Math.sin(th), y: Math.cos(th) };   // forearm axis, its outer side
    // upper arm (to the left), forearm swinging up about the elbow
    s += line(ex - Lu, ey - w, ex - w * Math.tan(th / 2), ey - w, { stroke: C.ink, 'stroke-width': 1.2 });
    s += line(ex - Lu, ey + w, ex, ey + w, { stroke: C.ink, 'stroke-width': 1.2 });
    const inner0 = { x: ex - w * Math.tan(th / 2), y: ey - w };
    s += line(inner0.x, inner0.y, ex - n.x * w + d.x * Lf, ey - n.y * w + d.y * Lf, { stroke: C.ink, 'stroke-width': 1.2 });
    s += path(poly(sample(16, u => ({ x: ex + w * Math.sin(u * th), y: ey + w * Math.cos(u * th) }))), { stroke: C.ink, 'stroke-width': 1.2 });
    s += line(ex + n.x * w, ey + n.y * w, ex + n.x * w + d.x * Lf, ey + n.y * w + d.y * Lf, { stroke: C.ink, 'stroke-width': 1.2 });
    s += circ(ex, ey, 2, { fill: C.dim });
    // the sensor strip on the sleeve, round the outside of the elbow: it lengthens as the arm bends
    const r = w + 5;
    const strip = [
      ...sample(8, u => ({ x: ex - 52 + u * 52, y: ey + r })),
      ...sample(16, u => ({ x: ex + r * Math.sin(u * th), y: ey + r * Math.cos(u * th) })).slice(1),
      ...sample(8, u => ({ x: ex + n.x * r + d.x * u * 52, y: ey + n.y * r + d.y * u * 52 })).slice(1),
    ];
    const cum = measure(strip);
    s += path(poly(strip), { stroke: C.plum, 'stroke-width': 4.5, 'stroke-opacity': 0.5 + 0.5 * bend });
    for (let k = 0; k <= 16; k++) { const p = at(strip, cum, k / 16); s += circ(p.x, p.y, 1.1, { fill: C.bg }); }
    s += electrons(strip, t * 2, { cum, n: 6, r: 1.3 });
    s += tag(ex - 96, ey + r + 16, 'strain strip on the sleeve');
    // the reading sits inside the angle, on its bisector, so it never lands on the arm
    const bx = -1 + d.x, by = d.y, bl = Math.hypot(bx, by) || 1;
    s += txt(ex + bx / bl * 64, ey + by / bl * 64 + 4, `${Math.round(th * 180 / Math.PI)}\u00b0`, { size: 12, fill: C.ink, anchor: 'middle' });
    s += plot({ x: 214, y: 30, w: 126, h: 60, u: T, f: v => 0.1 + 0.8 * pulse(v, 0.06, 0.4, 0.55, 0.9), title: 'joint angle', grid: [], color: C.ink });
    s += plot({ x: 214, y: 120, w: 126, h: 60, u: T, f: v => 0.15 + 0.7 * pulse(v, 0.06, 0.4, 0.55, 0.9) ** 1.2, title: 'strip resistance', grid: [], color: C.petrol });
    s += txt(214, 204, 'calibrate once: R \u2192 degrees', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// TEMPERATURE — a fine metal wire: hotter, its atoms shake harder, electrons scatter more, R rises
// ============================================================================================
const temperature = {
  vb: VB, dur: 8000,
  draw(t) {
    let s = '';
    const T = fr(t), heat = 0.5 - 0.5 * Math.cos(T * TAU), x0 = 24, y0 = 34, cols = 10, rows = 5, g = 17;
    s += rect(x0 - 10, y0 - 12, cols * g + 4, rows * g + 8, { fill: C.raised, stroke: mix(C.indigo, C.plum, heat), 'stroke-width': 1.4, rx: 6 });
    // metal ions in their lattice, vibrating with amplitude set by temperature
    const amp = 0.6 + heat * 3.4, R = rng(91);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ph = R() * TAU, ph2 = R() * TAU;
      const x = x0 + c * g + amp * Math.sin(T * TAU * 23 + ph), y = y0 + r * g + amp * Math.cos(T * TAU * 19 + ph2);
      s += circ(x, y, 4, { fill: C.copper, 'fill-opacity': 0.85 });
    }
    // electrons drifting through, deflected more when the lattice shakes harder
    for (let i = 0; i < 10; i++) {
      const lane = y0 + 8.5 + (i % 4) * g, k = fr(i / 10 + T * 2.2);
      const x = x0 - 6 + k * (cols * g), y = lane + heat * 5 * Math.sin(k * 40 + i);
      s += circ(x, y, 1.6, { fill: C.petrol });
    }
    s += tag(x0 - 10, y0 + rows * g + 10, 'copper / nickel / platinum wire, close up');
    s += txt(x0 - 10, y0 + rows * g + 24, heat > 0.5 ? 'hot: atoms shake, electrons scatter' : 'cool: a clearer path', { size: 8, fill: C.ink });
    // thermometer and the readings
    const tc = 20 + heat * 30;
    s += rect(214, 26, 8, 70, { fill: 'none', stroke: C.dim, rx: 4 }) + rect(215.5, 26 + 70 * (1 - heat * 0.9 - 0.05), 5, 70 * (heat * 0.9 + 0.05), { fill: mix(C.indigo, C.plum, heat), rx: 2.5 });
    s += txt(228, 34, `${tc.toFixed(0)} °C`, { size: 10, fill: C.ink });
    s += txt(228, 46, `R = ${(100 * (1 + 0.00385 * (tc - 0))).toFixed(1)} Ω`, { size: 8.5, fill: C.ink });
    s += txt(228, 58, '(platinum, 100 Ω at 0 °C)', { size: 7.5, fill: C.dim });
    s += plot({ x: 40, y: 168, w: 130, h: 44, mode: 'xy', u: heat, curve: v => ({ x: v, y: 0.15 + 0.7 * v }), title: 'R vs temperature', xl: 'temp →', grid: [], color: C.petrol });
    s += plot({ x: 210, y: 168, w: 130, h: 44, u: T, f: v => 0.1 + 0.8 * (0.5 - 0.5 * Math.cos(v * TAU)), title: 'temperature', grid: [], color: C.plum });
    s += txt(238, 82, 'A straight line:', { size: 8, fill: C.faint }) + txt(238, 93, 'metals are easy', { size: 8, fill: C.faint }) + txt(238, 104, 'to calibrate.', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// BIOPOTENTIAL — textile electrodes on the skin pick up a muscle's electrical activity (EMG)
// ============================================================================================
const emg = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const T = fr(t), act = pulse(T, 0.15, 0.25, 0.5, 0.62);
    // electrodes (silver knit pads) on the skin, with a lead
    const sy = 62;
    for (const x of [80, 170]) {
      s += rect(x - 22, sy - 9, 44, 8, { fill: C.silver, rx: 2 });
      for (let k = 0; k < 7; k++) s += path(`M${x - 20 + k * 6},${sy - 9} q3,-3 6,0`, { stroke: C.bg, 'stroke-width': 0.7 });
      s += strand(`M${x},${sy - 9} L${x},${sy - 30} L${x < 120 ? 120 : 130},${sy - 40}`, C.silver, 1.4, { halo: 0.8 });
    }
    s += rect(108, sy - 50, 34, 14, { fill: C.raised, stroke: C.dim, rx: 2 }) + tag(125, sy - 40, 'amp', { anchor: 'middle', size: 6.5 });
    // skin and fat
    s += rect(14, sy - 1, 250, 10, { fill: C.skin, 'fill-opacity': 0.7 });
    s += rect(14, sy + 9, 250, 14, { fill: C.skin, 'fill-opacity': 0.35 });
    s += tag(268, sy + 6, 'skin') + tag(268, sy + 19, 'fat');
    // muscle fibres; action potentials sweep along them while the muscle works
    const thick = 1 + 0.18 * act;
    for (let k = 0; k < 6; k++) {
      const y = sy + 30 + k * 10 * thick;
      s += rect(18, y - 3.6 * thick, 242, 7.2 * thick, { fill: C.muscle, 'fill-opacity': 0.75, rx: 3.6 });
      if (act > 0.05) for (let j = 0; j < 2; j++) { const x = 18 + fr(T * 3 + k * 0.17 + j * 0.5) * 242; s += rect(x - 6, y - 3.6 * thick, 12, 7.2 * thick, { fill: C.mint, 'fill-opacity': act * 0.7, rx: 3 }); }
    }
    s += tag(268, sy + 52, 'muscle');
    s += txt(18, sy + 108, act > 0.3 ? 'contracting: fibres fire' : 'at rest', { size: 8.5, fill: C.ink });
    // the signal: noise at rest, a dense burst while it fires
    const R = rng(7);
    const sig = v => { const a = pulse(v, 0.15, 0.25, 0.5, 0.62); const n = Math.sin(v * 900) * 0.5 + Math.sin(v * 1370 + 1) * 0.35 + Math.sin(v * 523 + 2) * 0.3; return 0.5 + n * (0.03 + 0.38 * a); };
    s += plot({ x: 30, y: 192, w: 300, h: 30, u: T, n: 400, f: sig, title: '', grid: [], color: C.mint });
    s += tag(30, 186, 'EMG · microvolts to millivolts');
    return s;
  },
};

export const SENSE_SCENES = { resistive, capacitive, matrix, strain: strainSc, angle, temperature, emg };
