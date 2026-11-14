// smart-textiles-act.js — parts 05 and 06 of /smart-textiles.html: textiles that ACT (heat, change
// colour, move a muscle, change shape) and that COMMUNICATE and POWER themselves (antenna, energy
// harvesting). Drawing kit: smart-textiles-core.js.
import {
  C, TAU, clamp, lerp, ease, seg, eseg, fr, pulse, rng, mix, poly, path, line, rect, circ, txt, tag,
  callout, strand, arrow, measure, at, electrons, sample, plot,
} from './smart-textiles-core.js';

const VB = '0 0 360 230';
// first-order response: on during [a, b) of the loop, time constant k (in loop units)
function firstOrder(v, a, b, k) {
  const rise = x => 1 - Math.exp(-x / k);
  if (v < a) { const end = rise(b - a); return end * Math.exp(-(v + 1 - b) / k); }
  if (v < b) { const start = rise(b - a) * Math.exp(-(a + 1 - b) / k); return start + (1 - start) * rise(v - a); }
  const top = (() => { const start = rise(b - a) * Math.exp(-(a + 1 - b) / k); return start + (1 - start) * rise(b - a); })();
  return top * Math.exp(-(v - b) / k);
}
function switchIcon(x, y, on) {
  return circ(x, y, 2, { fill: C.dim }) + circ(x + 18, y, 2, { fill: C.dim }) + line(x, y, on ? x + 18 : x + 15, on ? y : y - 9, { stroke: C.ink, 'stroke-width': 1.4 }) + tag(x + 9, y + 12, on ? 'on' : 'off', { anchor: 'middle' });
}

// ============================================================================================
// HEATING — current through a resistive yarn turns into heat: P = I²R
// ============================================================================================
const SERP = (() => { const p = []; for (let k = 0; k < 7; k++) { const y = 52 + k * 17; if (k % 2 === 0) p.push({ x: 40, y }, { x: 200, y }); else p.push({ x: 200, y }, { x: 40, y }); } return p; })();
const heater = {
  vb: VB, dur: 9000,
  draw(t) {
    let s = '';
    const T = fr(t), on = T > 0.06 && T < 0.5, temp = firstOrder(T, 0.06, 0.5, 0.11);
    s += rect(24, 38, 192, 128, { fill: C.raised, stroke: C.hair, rx: 6 });
    const yarnCol = mix(C.indigo, C.plum, temp);
    s += strand(poly(SERP), yarnCol, 3.2, { halo: 1.2, haloColor: C.raised });
    if (on) s += electrons(SERP, t * 3, { n: 30, r: 1.3 });
    // warmth rising off the panel
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * 26, ph = T * TAU * 3 + i;
      s += path(poly(sample(10, u => ({ x: x + 2.5 * Math.sin(u * 7 + ph), y: 34 - u * 14 - fr(T * 3 + i * 0.3) * 3 }))), { stroke: C.plum, 'stroke-width': 1, 'stroke-opacity': temp * 0.8 });
    }
    // supply and switch
    s += strand(`M40,52 L14,52 L14,190 L60,190`, C.silver, 1.4, { halo: 0.8 }) + strand(`M200,154 L200,178 L100,178 L100,190 L84,190`, C.silver, 1.4, { halo: 0.8 });
    s += switchIcon(62, 190, on) + rect(110, 182, 22, 16, { fill: 'none', stroke: C.dim, rx: 2 }) + tag(121, 193, 'batt', { anchor: 'middle', size: 6 });
    s += txt(232, 34, 'P = I²R = V²/R', { size: 11, fill: C.ink });
    s += txt(232, 48, 'a battery fixes V:', { size: 8, fill: C.faint }) + txt(232, 59, 'less R, more heat', { size: 8, fill: C.faint }) + txt(232, 70, '(longer is colder)', { size: 8, fill: C.faint });
    s += plot({ x: 232, y: 112, w: 112, h: 60, u: T, f: v => 0.08 + 0.82 * firstOrder(v, 0.06, 0.5, 0.11), title: 'temperature', readout: `${Math.round(22 + 18 * temp)} °C`, grid: [], color: C.plum });
    s += plot({ x: 232, y: 196, w: 112, h: 14, u: T, f: v => (v > 0.06 && v < 0.5 ? 0.85 : 0.1), title: '', grid: [], color: C.petrol, n: 200 });
    s += tag(232, 192, 'current');
    return s;
  },
};

// ============================================================================================
// THERMOCHROMIC + PELTIER — a Peltier element pumps heat into or out of the fabric; the ink above
// switches colour at its threshold, and a sensor closes the loop
// ============================================================================================
const peltier = {
  vb: VB, dur: 10000,
  draw(t) {
    let s = '';
    const T = fr(t), heating = T < 0.5, set = heating ? 0.85 : 0.15;
    // measured temperature chasing the setpoint (closed loop): a smooth approach each half
    const temp = v => { const h = v < 0.5; const k = h ? v : v - 0.5; const from = h ? 0.15 : 0.85, to = h ? 0.85 : 0.15; return to + (from - to) * Math.exp(-k / 0.07) * (1 + 0.6 * Math.sin(k * 30) * Math.exp(-k / 0.05)); };
    const tc = clamp(temp(T)), thr = 0.5, colK = clamp((tc - thr) / 0.12 + 0.5);
    // the fabric with its ink layer; the ink fades to light above the threshold (black-to-clear ink)
    const fx = 30, fw = 200;
    s += rect(fx, 40, fw, 12, { fill: mix(C.inkCold, C.inkHot, colK) }) + rect(fx, 52, fw, 8, { fill: C.raised, stroke: C.hair });
    for (let x = fx + 4; x < fx + fw; x += 8) s += circ(x, 56, 2, { fill: 'none', stroke: C.faint, 'stroke-width': 0.5 });
    s += tag(fx + fw + 6, 48, 'thermochromic ink') + tag(fx + fw + 6, 59, 'fabric');
    // Peltier: ceramic, copper bridges, alternating N and P pellets, ceramic
    const py0 = 68, py1 = 124;
    s += rect(fx + 10, py0, fw - 20, 6, { fill: C.ceramic, 'fill-opacity': 0.6 }) + rect(fx + 10, py1, fw - 20, 6, { fill: C.ceramic, 'fill-opacity': 0.6 });
    const nP = 8, pw = 12, gap = (fw - 40) / nP;
    for (let i = 0; i < nP; i++) {
      const x = fx + 20 + i * gap + (gap - pw) / 2, isN = i % 2 === 0;
      s += rect(x, py0 + 10, pw, py1 - py0 - 14, { fill: C.raised, stroke: C.dim, 'stroke-width': 0.8 });
      s += txt(x + pw / 2, py0 + 32, isN ? 'N' : 'P', { anchor: 'middle', size: 7.5, fill: C.dim });
      // copper bridges join pellets alternately on top and bottom: one series path through them all
      if (i < nP - 1) { const top = i % 2 === 0; s += rect(x + pw / 2 - 2, top ? py0 + 6 : py1 - 4, gap + 4, 4, { fill: C.copper }); }
      // carriers: electrons in N, holes in P; with the current one way they all carry heat UP
      for (let k = 0; k < 3; k++) {
        const u = fr(k / 3 + T * 6), y = heating ? lerp(py1 - 8, py0 + 14, u) : lerp(py0 + 14, py1 - 8, u);
        s += isN ? circ(x + pw / 2, y, 1.5, { fill: C.petrol }) : circ(x + pw / 2, y, 1.6, { fill: 'none', stroke: C.petrol, 'stroke-width': 0.9 });
      }
    }
    s += arrow(fx + fw + 14, heating ? py1 : py0 + 6, fx + fw + 14, heating ? py0 + 6 : py1, { color: heating ? C.plum : C.indigo, sw: 1.4 });
    s += tag(fx + fw + 22, (py0 + py1) / 2, heating ? 'heat pumped up' : 'heat pumped down');
    s += tag(fx + fw + 22, (py0 + py1) / 2 + 10, '(flip the current)', { size: 6.5 });
    s += tag(fx + 10, py1 + 18, 'Peltier element: ● electrons in N, ○ holes in P');
    // closed loop: setpoint vs measured, with the ink's switching threshold
    s += plot({ x: 40, y: 166, w: 290, h: 44, u: T, n: 160, series: [
      { f: v => (v < 0.5 ? 0.85 : 0.15), color: C.ink, dash: '3 2', noDot: true },
      { f: v => clamp(temp(v)), color: C.plum },
    ], ref: [{ v: 0.5, label: 'ink switches' }], title: 'setpoint (dashed) · fabric temperature (solid)', grid: [] });
    return s;
  },
};

// ============================================================================================
// EMS — electrodes in a sleeve pass small pulses through the skin; the muscle under them contracts
// ============================================================================================
const ems = {
  vb: VB, dur: 5000,
  draw(t) {
    let s = '';
    const T = fr(t), burst = T > 0.15 && T < 0.6, c = pulse(T, 0.15, 0.25, 0.55, 0.68);
    const sy = 56;
    // sleeve with two electrodes and leads
    s += rect(20, sy - 16, 210, 7, { fill: C.raised, stroke: C.hair });
    for (const x of [70, 170]) s += rect(x - 20, sy - 9, 40, 7, { fill: C.silver, rx: 2 });
    s += strand(`M70,${sy - 9} L70,${sy - 30} L110,${sy - 30}`, C.silver, 1.2, { halo: 0.7 }) + strand(`M170,${sy - 9} L170,${sy - 30} L140,${sy - 30}`, C.silver, 1.2, { halo: 0.7 });
    s += rect(110, sy - 37, 30, 14, { fill: C.raised, stroke: C.dim, rx: 2 }) + tag(125, sy - 27, 'stim', { anchor: 'middle', size: 6.5 });
    s += tag(234, sy - 10, 'textile electrodes');
    s += rect(20, sy - 2, 210, 10, { fill: C.skin, 'fill-opacity': 0.7 });
    // current spreads through tissue between the electrodes while the burst is on
    if (burst) for (let k = 0; k < 5; k++) {
      const pts = sample(20, u => ({ x: lerp(70, 170, u), y: sy + 6 + Math.sin(u * Math.PI) * (12 + k * 8) }));
      s += electrons(pts, t * 5 + k * 0.2, { n: 3, r: 1.1, op: 0.85 });
    }
    // the muscle: shorter and fatter as it contracts; its tendon pulls the finger
    const len = 190 * (1 - 0.14 * c), mx = 30, my = sy + 40, th = 13 * (1 + 0.35 * c);
    s += path(`M${mx},${my} Q${mx + len / 2},${my - th} ${mx + len},${my} Q${mx + len / 2},${my + th} ${mx},${my} Z`, { fill: C.muscle, 'fill-opacity': 0.8, stroke: C.muscle });
    for (let k = -2; k <= 2; k++) s += path(`M${mx + 8},${my + k * 2} Q${mx + len / 2},${my + k * th * 0.32} ${mx + len - 8},${my + k * 2}`, { stroke: C.bg, 'stroke-width': 0.5, 'stroke-opacity': 0.5 });
    const tx = mx + len, fxp = 300, fyp = my;
    s += line(tx, my, fxp - 20, my, { stroke: C.ink, 'stroke-width': 1 });
    const ang = -c * 0.9;
    s += circ(fxp - 20, fyp, 3, { fill: 'none', stroke: C.ink });
    s += path(`M${fxp - 20},${fyp} L${fxp - 20 + 40 * Math.cos(ang)},${fyp + 40 * Math.sin(ang)}`, { stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-opacity': 0.9 });
    s += tag(fxp - 20, fyp + 22, 'finger', { anchor: 'middle' });
    s += tag(mx, my + 26, c > 0.3 ? 'contracting' : 'relaxed');
    // the drive signal: biphasic pulses in a burst
    s += plot({ x: 30, y: 166, w: 300, h: 40, u: T, n: 600, f: v => { if (v < 0.15 || v > 0.6) return 0.5; const ph = fr(v * 90); return ph < 0.18 ? 0.92 : ph < 0.36 ? 0.08 : 0.5; }, title: 'drive: biphasic pulses (net charge zero)', grid: [], color: C.petrol });
    return s;
  },
};

// ============================================================================================
// SHAPE MEMORY — a nickel-titanium wire stitched in: heat it past its transition and it shortens
// ============================================================================================
const sma = {
  vb: VB, dur: 8000,
  draw(t) {
    let s = '';
    const T = fr(t), temp = firstOrder(T, 0.08, 0.5, 0.09);
    // hysteresis: contracts on the way up near 0.62, relaxes on the way down near 0.38
    const heatingUp = T > 0.08 && T < 0.5;
    const k = heatingUp ? clamp((temp - 0.5) / 0.25) : clamp((temp - 0.26) / 0.25);
    const kk = ease(k), L = 220 * (1 - 0.05 * kk);
    // the fabric gathers as the wire shortens
    const x0 = 20, yc = 64, amp = 2 + 12 * kk;
    const fab = sample(80, u => ({ x: x0 + u * L, y: yc + amp * Math.sin(u * TAU * 5) }));
    s += strand(poly(fab), C.ink, 7, { halo: 0, op: 0.35 }) + path(poly(fab), { stroke: C.bg, 'stroke-width': 4 });
    // the wire runs through channel stitches
    const wire = [{ x: x0, y: yc }, { x: x0 + L, y: yc }];
    s += strand(poly(wire), mix(C.steel, C.plum, temp * 0.6), 2, { halo: 1 });
    for (let i = 0; i <= 10; i++) { const x = x0 + i * L / 10; s += path(`M${x - 3},${yc - 5} L${x + 3},${yc + 5}`, { stroke: C.ink, 'stroke-width': 0.8 }); }
    if (heatingUp) s += electrons(wire, t * 3, { n: 10, r: 1.2 });
    s += tag(x0, yc - 22, `NiTi wire · ${heatingUp ? 'current on, heating' : 'cooling'}`);
    s += tag(x0 + L, yc + 28, `length ${Math.round(100 * (1 - 0.05 * kk))} %`, { anchor: 'end' });
    // crystal structure: sheared martensite (cool) to cubic austenite (hot)
    const cx = 280, cy = 64, g = 11, shear = 0.45 * (1 - kk);
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
      const zig = (r % 2 === 0 ? 1 : -1) * shear * g;
      s += circ(cx + c * g + zig, cy + r * g * (1 - 0.06 * (1 - kk)), 2.3, { fill: (r + c) % 2 === 0 ? C.steel : C.dim });
    }
    s += tag(cx, cy + 40, kk > 0.5 ? 'austenite: cubic, short' : 'martensite: sheared, long', { anchor: 'middle' });
    // length vs temperature: a loop, not a line
    const up = v => 1 - 0.9 * ease(clamp((v - 0.5) / 0.25)), down = v => 1 - 0.9 * ease(clamp((v - 0.26) / 0.25));
    s += plot({ x: 40, y: 140, w: 140, h: 64, mode: 'xy', u: 1, full: true, series: [
      { curve: v => ({ x: v, y: up(v) * 0.85 + 0.05 }), color: C.petrol, noDot: true },
      { curve: v => ({ x: v, y: down(v) * 0.85 + 0.05 }), color: C.petrol, dash: '3 2', noDot: true },
    ], title: 'length vs temperature', xl: 'temp →', grid: [] });
    s += circ(40 + 140 * temp, 140 + 64 - ((heatingUp ? up(temp) : down(temp)) * 0.85 + 0.05) * 64, 2.6, { fill: C.petrol, stroke: C.bg });
    s += txt(204, 150, 'Heating (solid) and', { size: 8, fill: C.faint }) + txt(204, 161, 'cooling (dashed) switch', { size: 8, fill: C.faint }) + txt(204, 172, 'at different temperatures:', { size: 8, fill: C.faint }) + txt(204, 183, 'hysteresis.', { size: 8, fill: C.faint });
    s += txt(204, 200, 'A few % of stroke, strong pull.', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// TEXTILE ANTENNA — conductive patch over a felt substrate over a conductive ground plane
// ============================================================================================
const antenna = {
  vb: VB, dur: 9000,
  draw(t) {
    let s = '';
    const T = fr(t), assemble = eseg(T, 0.02, 0.22) * (1 - eseg(T, 0.96, 1)), squash = pulse(T, 0.55, 0.65, 0.75, 0.85);
    const cx = 110, base = 120, sub = 22 * (1 - 0.35 * squash);
    const sep = (1 - assemble) * 26;
    // ground plane, substrate, patch (exploded, then stacked)
    s += path(`M${cx - 90},${base + sep} L${cx + 70},${base + sep} L${cx + 90},${base - 18 + sep} L${cx - 70},${base - 18 + sep} Z`, { fill: C.silver, 'fill-opacity': 0.7 });
    const sy = base - sub;
    s += path(`M${cx - 90},${sy + 0} L${cx + 70},${sy} L${cx + 70},${base} L${cx - 90},${base} Z`, { fill: C.raised, stroke: C.dim, 'stroke-width': 0.6 });
    s += path(`M${cx - 90},${sy} L${cx + 70},${sy} L${cx + 90},${sy - 18} L${cx - 70},${sy - 18} Z`, { fill: C.raised, stroke: C.dim, 'stroke-width': 0.8 });
    const py = sy - sep;
    s += path(`M${cx - 40},${py - 3} L${cx + 20},${py - 3} L${cx + 32},${py - 13} L${cx - 28},${py - 13} Z`, { fill: C.silver });
    s += strand(`M${cx - 6},${py - 8} L${cx - 6},${py + 10} L${cx - 6},${base + 30}`, C.copper, 1.4, { halo: 0.8 });
    s += tag(cx + 96, base - 6 + sep, 'conductive ground fabric');
    s += tag(cx + 96, sy - 6, `felt, ${Math.round(sub / 22 * 3 * 10) / 10} mm`);
    s += callout(cx + 24, py - 9, cx + 96, sy - 24, 'silver patch');
    // radiating: arcs leaving the patch's two radiating edges once assembled
    if (assemble > 0.95) for (let k = 0; k < 4; k++) {
      const r = 8 + fr(T * 6 + k / 4) * 52, o = 1 - r / 62;
      s += path(`M${cx - 28 - r * 0.7},${py - 13 - r * 0.7} A${r},${r} 0 0 1 ${cx + 32 + r * 0.7},${py - 13 - r * 0.7}`, { stroke: C.petrol, 'stroke-width': 1, 'stroke-opacity': o * 0.8 });
    }
    // squash it and the resonance moves: denser, thinner felt raises εᵣ and narrows the band
    if (squash > 0.05) s += arrow(cx - 66, py - 46, cx - 66, py - 16, { color: C.ink, op: squash }) + tag(cx - 72, py - 36, 'pressed', { anchor: 'end', op: squash });
    const f0 = 0.55 - 0.16 * squash;
    s += plot({ x: 220, y: 160, w: 120, h: 46, n: 120, u: f0, f: v => 0.9 - 0.75 * Math.exp(-(((v - f0) / 0.07) ** 2)), mode: 'time', title: 'return loss', readout: `${(2.45 - 0.35 * squash).toFixed(2)} GHz`, xl: 'freq →', grid: [], color: C.petrol, ref: [{ v: 0.9 - 0.75 }] });
    ['Frequency: patch length and', 'the felt’s permittivity (εᵣ).', 'Crush, stretch or wet the', 'felt and it detunes.'].forEach((l, i) => { s += txt(20, 170 + i * 11, l, { size: 8, fill: C.faint }); });
    return s;
  },
};

// ============================================================================================
// TRIBOELECTRIC — two materials touch and part; charge sloshes through a load each time
// ============================================================================================
const tribo = {
  vb: VB, dur: 4000,
  draw(t) {
    let s = '';
    const T = fr(t), gap = 4 + 36 * (0.5 + 0.5 * Math.cos(T * TAU)), x0 = 40, w = 160, yb = 120;
    const yt = yb - 10 - gap;
    // bottom: PTFE-like layer on an electrode (gets negative); top: nylon on an electrode (positive)
    s += rect(x0, yb, w, 6, { fill: C.silver }) + rect(x0, yb - 10, w, 10, { fill: C.raised, stroke: C.dim, 'stroke-width': 0.8 });
    s += rect(x0, yt - 16, w, 6, { fill: C.silver }) + rect(x0, yt - 10, w, 10, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8 });
    for (let i = 0; i < 9; i++) { const x = x0 + 10 + i * 17.5; s += txt(x, yb - 2, '−', { anchor: 'middle', size: 9, fill: C.ink }) + txt(x, yt - 1, '+', { anchor: 'middle', size: 9, fill: C.ink }); }
    s += tag(x0, yt - 22, 'nylon: gives up electrons') + tag(x0, yb + 18, 'PTFE / silicone: takes them');
    // external load: electrons run one way as they part, back as they meet
    const v = -Math.sin(T * TAU);                // d(gap)/dt, sign gives direction
    const loop = [{ x: x0 + w, y: yt - 13 }, { x: x0 + w + 22, y: yt - 13 }, { x: x0 + w + 22, y: (yt + yb) / 2 - 8 }, { x: x0 + w + 22, y: (yt + yb) / 2 + 8 }, { x: x0 + w + 22, y: yb + 3 }, { x: x0 + w, y: yb + 3 }];
    s += path(poly(loop), { stroke: C.silver, 'stroke-width': 1.2 });
    s += rect(x0 + w + 16, (yt + yb) / 2 - 8, 12, 16, { fill: C.bg, stroke: C.dim }) + tag(x0 + w + 32, (yt + yb) / 2 + 3, 'load');
    if (Math.abs(v) > 0.15) s += electrons(loop, t * 2.5 * Math.sign(v), { n: 5, r: 1.4, op: Math.abs(v), reverse: v < 0 });
    s += txt(260, 40, T < 0.5 ? 'pressing together' : 'pulling apart', { size: 9, fill: C.ink });
    s += plot({ x: 40, y: 160, w: 290, h: 44, u: T, n: 200, f: vv => 0.5 + 0.4 * -Math.sin(vv * TAU) * Math.exp(-((Math.cos(vv * TAU) * 1.2) ** 2)) * 1.6, title: 'current through the load: a pulse each way', grid: [], ref: [{ v: 0.5 }], color: C.petrol });
    return s;
  },
};

// ============================================================================================
// PIEZOELECTRIC — a PVDF fibre: bend it and its aligned dipoles put charge on its surfaces
// ============================================================================================
const piezo = {
  vb: VB, dur: 4000,
  draw(t) {
    let s = '';
    const T = fr(t), b = Math.sin(T * TAU), x0 = 30, L = 200, yc = 80, th = 14;
    const mid = u => ({ x: x0 + u * L, y: yc - b * 26 * Math.sin(u * Math.PI) });
    const top = sample(40, u => { const p = mid(u); return { x: p.x, y: p.y - th }; }), bot = sample(40, u => { const p = mid(u); return { x: p.x, y: p.y + th }; });
    s += path(poly(top) + 'L' + poly(bot.slice().reverse()).slice(1) + 'Z', { fill: C.raised, stroke: C.ink, 'stroke-width': 1 });
    s += path(poly(top), { stroke: C.silver, 'stroke-width': 2 }) + path(poly(bot), { stroke: C.silver, 'stroke-width': 2 });
    // dipoles inside, all pointing one way (poled), and the charge their strain leaves on the faces
    for (let i = 1; i < 12; i++) {
      const u = i / 12, p = mid(u), st = Math.abs(b) * Math.sin(u * Math.PI);
      s += arrow(p.x, p.y + 6 + st * 1.2, p.x, p.y - 6 - st * 1.2, { color: C.mint, head: 3, op: 0.7 });
      if (st > 0.2) s += txt(p.x, p.y - th - 4, b > 0 ? '+' : '−', { anchor: 'middle', size: 8, fill: C.ink }) + txt(p.x, p.y + th + 10, b > 0 ? '−' : '+', { anchor: 'middle', size: 8, fill: C.ink });
    }
    s += tag(x0 + L + 8, yc - th, 'electrode') + tag(x0 + L + 8, yc + 2, 'PVDF, poled') + tag(x0 + L + 8, yc + th + 4, 'electrode');
    s += plot({ x: 40, y: 160, w: 290, h: 44, u: T, n: 160, f: vv => 0.5 + 0.4 * Math.sin(vv * TAU), title: 'voltage across it follows the bend', grid: [], ref: [{ v: 0.5 }], color: C.mint });
    return s;
  },
};

// ============================================================================================
// THERMOELECTRIC — body heat on one face, cooler air on the other: legs of p and n yarn make a voltage
// ============================================================================================
const thermoE = {
  vb: VB, dur: 7000,
  draw(t) {
    let s = '';
    const T = fr(t), dT = 0.45 + 0.4 * Math.sin(T * TAU), x0 = 30, w = 220, yh = 128, yc = 48;
    s += rect(x0, yh, w, 14, { fill: C.skin, 'fill-opacity': 0.7 }) + tag(x0 + w + 6, yh + 10, 'skin, ~33 °C');
    for (let i = 0; i < 6; i++) { const x = x0 + 18 + i * 36, ph = T * TAU * 2 + i; s += path(poly(sample(10, u => ({ x: x + 2 * Math.sin(u * 8 + ph), y: yh - 2 - u * 10 }))), { stroke: C.plum, 'stroke-width': 0.9, 'stroke-opacity': 0.7 }); }
    s += tag(x0 + w + 6, yc - 10, `air, ${Math.round(33 - 25 * dT)} °C`);
    for (let i = 0; i < 4; i++) { const y = yc - 10 - i * 5, x = x0 + fr(T * 1.5 + i * 0.27) * (w - 40); s += path(poly(sample(12, u => ({ x: x + u * 40, y: y + 1.5 * Math.sin(u * 9 + i) }))), { stroke: C.indigo, 'stroke-width': 0.9, 'stroke-opacity': 0.4 + 0.5 * dT }); }
    // legs through the fabric's thickness, alternating p and n, joined top and bottom
    const n = 8, gap = w / n;
    const pathPts = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + gap * (i + 0.5), isP = i % 2 === 1;
      s += rect(x - 5, yc + 8, 10, yh - yc - 16, { fill: C.raised, stroke: isP ? C.dim : C.ink, 'stroke-width': 0.9, 'stroke-dasharray': isP ? '2 1.5' : null });
      s += txt(x, (yc + yh) / 2 + 3, isP ? 'p' : 'n', { anchor: 'middle', size: 8, fill: C.dim });
      if (i < n - 1) { const topJ = i % 2 === 0; s += rect(x - 1, topJ ? yc + 4 : yh - 8, gap + 2, 4, { fill: C.silver }); }
      // carriers diffuse from hot to cold in every leg
      for (let k = 0; k < 2; k++) { const u = fr(k / 2 + T * 3 * dT + i * 0.13), y = lerp(yh - 12, yc + 12, u); s += isP ? circ(x, y, 1.5, { fill: 'none', stroke: C.petrol, 'stroke-width': 0.9, 'stroke-opacity': dT + 0.1 }) : circ(x, y, 1.4, { fill: C.petrol, 'fill-opacity': dT + 0.1 }); }
    }
    s += plot({ x: 40, y: 168, w: 140, h: 40, mode: 'xy', u: dT, curve: v => ({ x: v, y: 0.1 + 0.8 * v }), title: 'voltage vs ΔT', xl: 'ΔT →', grid: [], color: C.petrol });
    s += txt(204, 178, 'Per leg: tens of µV per', { size: 8, fill: C.faint }) + txt(204, 189, 'kelvin in polymers, ~200 in', { size: 8, fill: C.faint }) + txt(204, 200, 'Bi₂Te₃. Many legs in series,', { size: 8, fill: C.faint }) + txt(204, 211, 'and still only microwatts.', { size: 8, fill: C.faint });
    return s;
  },
};

export const ACT_SCENES = { heater, peltier, ems, sma };
export const POWER_SCENES = { antenna, tribo, piezo, thermoE };
