// smart-textiles-fabric.js — part 03 of /smart-textiles.html: getting the conductor INTO a fabric.
// Woven, knitted, embroidered (lockstitch), couched (tailored fibre placement), and printed. Each one
// builds itself on a loop, then shows the current path it made. Drawing kit: smart-textiles-core.js.
import {
  C, TAU, clamp, lerp, ease, seg, eseg, fr, pulse, rng, mix, poly, path, line, rect, circ, txt, tag,
  callout, strand, arrow, measure, at, electrons, sample, plot,
} from './smart-textiles-core.js';
import { JERSEY_REST, weftCourse, crossings, notchPath, toPath } from './textile-knit-loops.js';

const VB = '0 0 360 230';

// ============================================================================================
// WOVEN — picks laid one at a time across the warp; conductive warp and weft cross at nodes
// ============================================================================================
const woven = {
  vb: VB, dur: 11000,
  draw(t) {
    let s = '';
    const cols = 11, rows = 9, gx = 17, gy = 17, x0 = 22, y0 = 28, wW = 5.4;
    const condCol = c => c === 2 || c === 7, condRow = r => r === 2 || r === 6;
    const T = fr(t), build = seg(T, 0.02, 0.8), done = build * rows, cur = Math.floor(done), k = done - cur;
    const hold = eseg(T, 0.8, 0.86) * (1 - eseg(T, 0.96, 1));
    const yOf = r => y0 + (rows - 1 - r) * gy;          // the fell: new picks go in at the top
    // warp, full length
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * gx, col = condCol(c) ? C.silver : C.ink;
      s += strand(`M${x},${y0 - 14} L${x},${y0 + rows * gy}`, col, wW, { halo: 1, op: condCol(c) ? 1 : 0.55, cap: 'butt' });
    }
    // picks: complete ones, then the one going in (its end follows the shuttle)
    for (let r = 0; r <= Math.min(cur, rows - 1); r++) {
      const y = yOf(r), frac = r < cur ? 1 : ease(k), xe = x0 - 10 + frac * (cols * gx + 4);
      const col = condRow(r) ? C.silver : C.ink;
      s += strand(`M${x0 - 10},${y} L${xe},${y}`, col, wW, { halo: 1, op: condRow(r) ? 1 : 0.55, cap: 'butt' });
      // plain weave: where the warp is over, redraw that bit of warp on top
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * gx; if (x > xe) break;
        if ((r + c) % 2 === 0) s += strand(`M${x},${y - gy / 2 + 1} L${x},${y + gy / 2 - 1}`, condCol(c) ? C.silver : C.ink, wW, { halo: 1, op: condCol(c) ? 1 : 0.55, cap: 'butt' });
      }
      if (r === cur && build < 1) s += path(`M${xe},${y - 4} L${xe + 14},${y - 2} L${xe + 16},${y} L${xe + 14},${y + 2} L${xe},${y + 4} Z`, { fill: C.raised, stroke: C.dim, 'stroke-width': 0.8 });
    }
    // where a conductive weft crosses a conductive warp: an addressable node
    for (let r = 0; r < rows; r++) if (condRow(r) && r < cur) for (let c = 0; c < cols; c++) if (condCol(c)) {
      const x = x0 + c * gx, y = yOf(r), p = 0.5 + 0.5 * Math.sin(t * TAU * 3 + r + c);
      s += circ(x, y, 6 + 2 * p, { fill: 'none', stroke: C.petrol, 'stroke-width': 1, 'stroke-opacity': 0.4 + 0.5 * p });
    }
    if (hold > 0.01) {
      // current down a conductive warp, out along a conductive weft
      const pathA = [{ x: x0 + 7 * gx, y: y0 - 14 }, { x: x0 + 7 * gx, y: yOf(2) }, { x: x0 - 10, y: yOf(2) }];
      s += electrons(pathA, t * 4, { n: 7, r: 1.5, op: hold });
    }
    s += tag(x0 + 2 * gx, y0 - 18, 'conductive warp', { anchor: 'middle' });
    s += tag(x0 + 7 * gx, y0 + rows * gy + 12, 'conductive weft \u00b7 node = a crossing you can address', { anchor: 'middle' });
    // the loom, side on: two warp sheets swap (the shed), the reed beats each pick in
    const lx = 238, ly = 112, half = Math.sin(k * Math.PI), up = cur % 2 ? 1 : -1;
    s += tag(lx - 6, ly - 52, 'from the side: the shed');
    const fell = lx + 74;
    s += line(lx - 4, ly, fell, ly, { stroke: C.ink, 'stroke-width': 1.2, 'stroke-opacity': 0.5 });
    const shedY = 14 * half;
    s += line(lx - 4, ly, lx + 30, ly - up * shedY, { stroke: C.ink, 'stroke-width': 1 }) + line(lx + 30, ly - up * shedY, fell, ly, { stroke: C.ink, 'stroke-width': 1 });
    s += line(lx - 4, ly, lx + 30, ly + up * shedY, { stroke: C.silver, 'stroke-width': 1 }) + line(lx + 30, ly + up * shedY, fell, ly, { stroke: C.silver, 'stroke-width': 1 });
    s += rect(lx + 27, ly - 30, 6, 60, { fill: 'none', stroke: C.faint, 'stroke-width': 0.8, rx: 1 }) + tag(lx + 30, ly + 42, 'heddles', { anchor: 'middle', size: 6.5 });
    const reed = lx + 44 + 26 * (k > 0.85 ? (k - 0.85) / 0.15 : 0) * 1;
    s += line(reed, ly - 24, reed, ly + 24, { stroke: C.dim, 'stroke-width': 1.6 }) + tag(reed, ly - 28, 'reed', { anchor: 'middle', size: 6.5 });
    if (half > 0.3) s += circ(lerp(lx + 40, fell - 6, k), ly, 2.6, { fill: condRow(cur) ? C.silver : C.bg, stroke: C.ink, 'stroke-width': 0.8 });
    s += line(fell, ly - 8, fell + 18, ly - 8, { stroke: C.hair }) + line(fell, ly + 8, fell + 18, ly + 8, { stroke: C.hair });
    s += tag(fell + 9, ly + 20, 'cloth', { anchor: 'middle', size: 6.5 });
    return s;
  },
};

// ============================================================================================
// KNITTED — a weft-knit jersey built course by course, from the site's ONE loop geometry
// (/textile-knit-loops.js — the same strands textile 101 and the stretch simulator draw). Where a
// front strand crosses a back one, the back strand is notched in a mask, as textile-basics.js does.
// ============================================================================================
const KN = { W: 30, H: 24, n: 7, courses: 6, x0: 40, top: 46, SW: 3.4, HALO: 1.4, cond: [2, 3] };
let KNIT = null;
function knitGeometry() {
  if (KNIT) return KNIT;
  const L = JERSEY_REST.loopPerCourse * KN.H;
  const strands = Array.from({ length: KN.courses }, (_, c) => weftCourse({ x0: KN.x0, cy: KN.top + c * KN.H + 22, W: KN.W, L, n: KN.n }));
  const cums = strands.map(measure);
  const frac = (i, sx) => { const k = Math.floor(sx), u = sx - k, c = cums[i], L = c[c.length - 1]; return (c[Math.min(k, c.length - 1)] + (c[Math.min(k + 1, c.length - 1)] - c[Math.min(k, c.length - 1)]) * u) / L; };
  const bites = [];
  for (const x of crossings(strands)) {
    const F = x.front === 'a' ? x.a : x.b, B = x.front === 'a' ? x.b : x.a, sx = x.front === 'a' ? x.ia + x.ta : x.ib + x.tb;
    bites.push({ on: B, by: F, at: frac(F, sx), d: notchPath(strands[F], sx, KN.SW / 2 + KN.HALO + 0.6) });
  }
  return (KNIT = { strands, cums, bites, d: strands.map(toPath) });
}
const knit = {
  vb: VB, dur: 12000,
  draw(t) {
    const K = knitGeometry(), T = fr(t), N = KN.courses;
    const prog = i => { const order = N - 1 - i, d = 0.8 / N; return seg(T, order * d, (order + 1) * d); };
    const hold = eseg(T, 0.79, 0.86) * (1 - eseg(T, 0.97, 1));
    let defs = '', s = '';
    K.strands.forEach((pts, i) => {
      const p = prog(i); if (p <= 0) return;
      const b = K.bites.filter(x => x.on === i && prog(x.by) >= x.at).map(x => `<path d="${x.d}"/>`).join('');
      defs += `<mask id="st-km${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="230"><rect width="360" height="230" fill="#fff"/><g fill="none" stroke="#000" stroke-width="${KN.SW + 2 * KN.HALO}" stroke-linecap="round">${b}</g></mask>`;
      const cond = KN.cond.includes(i), dash = ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${Math.round(1000 * (1 - p))}"`;
      s += `<g mask="url(#st-km${i})" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
      if (cond) s += `<path d="${K.d[i]}" stroke="${C.silver}" stroke-width="${KN.SW}"${dash}/>`;
      else s += `<path d="${K.d[i]}" stroke="${C.faint}" stroke-width="${KN.SW}"${dash}/>`;
      s += '</g>';
      // the latch needle, riding the loop being formed
      if (p > 0 && p < 1) {
        const q = at(pts, K.cums[i], p), bob = Math.abs(Math.sin(p * KN.n * Math.PI));
        const x = q.x, top = q.y - 6 - bob * 10;
        s += line(x, top, x, top - 38, { stroke: C.dim, 'stroke-width': 1.6 }) + path(`M${x},${top} q-4.5,0 -4.5,-5`, { stroke: C.dim, 'stroke-width': 1.6 });
        s += tag(x + 6, Math.max(12, top - 30), 'needle');
      }
    });
    if (hold > 0.01) for (const i of KN.cond) s += electrons(K.strands[i], t * 1.5 + i * 0.1, { cum: K.cums[i], n: 16, r: 1.4, op: hold });
    const xr = KN.x0 + (KN.n - 0.5) * KN.W + 10;
    s += tag(xr, KN.top + 2.5 * KN.H + 26, 'conductive') + tag(xr, KN.top + 2.5 * KN.H + 35, 'courses');
    s += txt(xr, 30, 'One yarn makes', { size: 8, fill: C.faint });
    s += txt(xr, 41, 'a whole row of', { size: 8, fill: C.faint });
    s += txt(xr, 52, 'loops; each loop', { size: 8, fill: C.faint });
    s += txt(xr, 63, 'touches its', { size: 8, fill: C.faint });
    s += txt(xr, 74, 'neighbours, so', { size: 8, fill: C.faint });
    s += txt(xr, 85, 'current also', { size: 8, fill: C.faint });
    s += txt(xr, 96, 'shortcuts.', { size: 8, fill: C.faint });
    return `<defs>${defs}</defs>${s}`;
  },
};

// ============================================================================================
// EMBROIDERED — a lockstitch, cut through the fabric: the needle thread and the bobbin thread
// lock inside the cloth. Conductive thread usually goes in the bobbin.
// ============================================================================================
const embroidery = {
  vb: VB, dur: 4200,
  draw(t) {
    let s = '';
    const T = fr(t), fy = 120, fh = 14, P = 30, xn = 196;
    const feed = eseg(T, 0.8, 0.98);
    // fabric, cut through: woven yarn ends
    s += rect(0, fy, 360, fh, { fill: C.raised, stroke: C.line, 'stroke-width': 0.8 });
    for (let x = 0; x < 400; x += 10) { const xx = x - feed * P; if (xx > -4 && xx < 364) s += circ(xx, fy + fh / 2, 2.6, { fill: 'none', stroke: C.faint, 'stroke-width': 0.6 }); }
    // finished stitches: needle thread on top, bobbin underneath, locked at the fabric's middle
    const lock = fy + fh / 2;
    let top = [], bot = [];
    for (let i = 8; i >= 0; i--) { const x = xn - (i + feed) * P; top.push({ x, y: lock }, { x: x + 2, y: fy - 1.5 }, { x: x + P - 2, y: fy - 1.5 }); bot.push({ x, y: lock }, { x: x + 2, y: fy + fh + 1.5 }, { x: x + P - 2, y: fy + fh + 1.5 }); }
    const needleDown = pulse(T, 0, 0.22, 0.4, 0.62), ny = lerp(fy - 46, fy + fh + 26, needleDown);
    // the new stitch's needle-thread loop, caught by the hook below the fabric
    const hookA = T * TAU * 2 - Math.PI / 2;
    s += strand(poly(bot), C.silver, 2.2, { halo: 0.9 });
    s += strand(poly(top), C.ink, 1.8, { halo: 0.9 });
    // needle and its thread
    s += line(xn, fy - 90, xn, ny, { stroke: C.dim, 'stroke-width': 3 }) + path(`M${xn - 1.5},${ny} L${xn},${ny + 6} L${xn + 1.5},${ny}`, { stroke: C.dim, 'stroke-width': 1.5 });
    s += circ(xn, ny - 3, 1, { fill: C.bg });
    s += strand(`M${xn - feed * P},${lock} Q${xn - 4},${fy - 20} ${xn},${ny - 3}`, C.ink, 1.6, { halo: 0.8 });
    const loopOpen = pulse(T, 0.3, 0.45, 0.55, 0.75);
    if (loopOpen > 0.02) {
      const hx = xn + 18 * Math.cos(hookA), hy = fy + fh + 30 + 10 * Math.sin(hookA);
      s += strand(`M${xn},${fy + fh} C${xn - 20 * loopOpen},${fy + fh + 40 * loopOpen} ${hx + 18},${hy + 20 * loopOpen} ${xn + 2},${fy + fh}`, C.ink, 1.5, { halo: 0.8 });
    }
    // rotary hook and bobbin
    s += circ(xn, fy + fh + 34, 16, { fill: 'none', stroke: C.line, 'stroke-width': 1 }) + circ(xn, fy + fh + 34, 7, { fill: C.raised, stroke: C.silver, 'stroke-width': 2 });
    s += path(`M${xn + 16 * Math.cos(hookA)},${fy + fh + 34 + 16 * Math.sin(hookA)} l${4 * Math.cos(hookA + 1.6)},${4 * Math.sin(hookA + 1.6)}`, { stroke: C.dim, 'stroke-width': 2 });
    s += strand(`M${xn},${fy + fh + 27} Q${xn - 6},${fy + fh + 6} ${xn - feed * P - 2},${fy + fh + 1.5}`, C.silver, 1.6, { halo: 0.6 });
    const lab = (px, py, ly, str) => line(px, py, 14 + str.length * 5.1, ly - 3, { stroke: C.faint, 'stroke-width': 0.7 }) + circ(px, py, 1.3, { fill: C.dim }) + tag(10, ly, str);
    s += lab(xn - 1.5 * P, fy - 1.5, fy - 30, 'needle thread (polyester)');
    s += lab(xn - 2.5 * P, fy + fh + 1.5, fy + fh + 30, 'bobbin thread: conductive');
    s += lab(xn - (1 + feed) * P, lock, fy + fh + 48, 'they lock inside the cloth');
    s += tag(xn + 22, fy + fh + 38, 'rotary hook + bobbin');
    s += tag(xn + 10, fy - 70, 'needle');
    s += arrow(80, 20, 40, 20, { color: C.dim }) + tag(84, 23, 'fabric feeds');
    // the trace on the underside carries current between stitches
    s += electrons(bot.slice(0, bot.length - 3), t * 2, { n: 10, r: 1.3 });
    return s;
  },
};

// ============================================================================================
// COUCHED / TAILORED FIBRE PLACEMENT — a conductive roving laid along any curve, held by a zigzag
// ============================================================================================
const SPIRAL = sample(240, u => { const a = u * TAU * 2.6, r = 12 + u * 64; return { x: 150 + r * Math.cos(a), y: 116 + r * Math.sin(a) * 0.9 }; });
const SPIRAL_CUM = measure(SPIRAL);
const couching = {
  vb: VB, dur: 9000,
  draw(t) {
    let s = '';
    const T = fr(t), u = seg(T, 0.03, 0.8), hold = eseg(T, 0.8, 0.86) * (1 - eseg(T, 0.96, 1));
    s += rect(54, 22, 192, 190, { fill: C.raised, stroke: C.hair, rx: 4 });
    const n = Math.max(2, Math.round(u * SPIRAL.length)), laid = SPIRAL.slice(0, n);
    s += strand(poly(laid), C.silver, 3.4, { halo: 1 });
    // the zigzag holding thread: alternate sides of the path, every few units
    const L = SPIRAL_CUM[SPIRAL_CUM.length - 1], step = 5.5, zz = [];
    for (let d = 0, i = 0; d < u * L; d += step, i++) {
      const p = at(SPIRAL, SPIRAL_CUM, d / L), nx = -Math.sin(p.ang), ny = Math.cos(p.ang), side = i % 2 ? 4.2 : -4.2;
      zz.push({ x: p.x + nx * side, y: p.y + ny * side });
    }
    s += path(poly(zz), { stroke: C.ink, 'stroke-width': 0.6, 'stroke-opacity': 0.8 });
    // the placement head: a guide tube laying the roving, a needle going down beside it
    if (u < 1) {
      const p = at(SPIRAL, SPIRAL_CUM, u), bob = Math.abs(Math.sin(T * TAU * 30));
      s += circ(p.x, p.y, 7, { fill: 'none', stroke: C.dim, 'stroke-width': 1 }) + circ(p.x, p.y, 2 + bob * 1.2, { fill: C.dim });
      s += strand(`M${p.x},${p.y} L${p.x + 40},${p.y - 60}`, C.silver, 2, { halo: 0.8, op: 0.6 });
    }
    if (hold > 0.01) s += electrons(SPIRAL, t * 3, { cum: SPIRAL_CUM, n: 20, r: 1.4, op: hold });
    s += tag(254, 40, 'a coil: an antenna');
    s += tag(254, 49, 'or a charging loop');
    s += txt(254, 150, 'Any curve, any', { size: 8, fill: C.faint });
    s += txt(254, 161, 'yarn: even ones too', { size: 8, fill: C.faint });
    s += txt(254, 172, 'stiff to sew through', { size: 8, fill: C.faint });
    s += txt(254, 183, 'a needle.', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// PRINTED — conductive ink pushed through a screen onto the fabric, then cured
// ============================================================================================
const printed = {
  vb: VB, dur: 6000,
  draw(t) {
    let s = '';
    const T = fr(t), fy = 150, sy = 120;
    const sweep = seg(T, 0, 0.55), lift = eseg(T, 0.58, 0.7) * (1 - eseg(T, 0.95, 1)), cure = eseg(T, 0.7, 0.82) * (1 - eseg(T, 0.95, 1));
    s += rect(20, fy, 320, 12, { fill: C.raised, stroke: C.line, 'stroke-width': 0.8 });
    s += tag(24, fy + 24, 'fabric');
    // the screen: a mesh with an open stencil where the trace goes
    const y = sy - lift * 34, open = [[90, 150], [210, 270]];
    s += rect(36, y - 6, 288, 6, { fill: 'none', stroke: C.dim, 'stroke-width': 1 });
    for (let x = 38; x < 322; x += 4) { const inOpen = open.some(([a, b]) => x > a && x < b); s += line(x, y - 6, x, y, { stroke: inOpen ? C.faint : C.line, 'stroke-width': inOpen ? 0.5 : 2.2 }); }
    s += tag(36, y - 12, 'screen: emulsion blocks all but the trace');
    // the ink bead and the squeegee crossing it
    const xs = lerp(46, 312, sweep);
    if (T < 0.58) {
      s += path(`M${xs - 12},${y - 6} q6,-10 12,0`, { fill: C.silver, stroke: 'none' });
      s += path(`M${xs},${y - 40} L${xs + 6},${y - 6}`, { stroke: C.dim, 'stroke-width': 3 }) + rect(xs - 4, y - 52, 14, 12, { fill: C.raised, stroke: C.dim, 'stroke-width': 0.8 });
      s += xs < 260 ? tag(xs + 14, y - 44, 'squeegee') : tag(xs - 8, y - 44, 'squeegee', { anchor: 'end' });
    }
    // ink through the open mesh onto the fabric, behind the squeegee
    for (const [a, b] of open) {
      const e = Math.min(b, xs);
      if (e > a) s += rect(a, fy - 2.5, e - a, 2.5, { fill: C.silver, 'fill-opacity': lerp(0.9, 1, cure) });
    }
    if (cure > 0.01) {
      for (let i = 0; i < 6; i++) { const x = 70 + i * 40, ph = T * TAU * 3 + i; s += path(poly(sample(10, u => ({ x: x + 2 * Math.sin(u * 8 + ph), y: fy + 50 - u * 22 }))), { stroke: C.plum, 'stroke-width': 0.9, 'stroke-opacity': cure * 0.8 }); }
      s += tag(180, fy + 60, 'cure: the binder sets, silver flakes touch', { anchor: 'middle' });
      for (const [a, b] of open) s += electrons([{ x: a, y: fy - 1.2 }, { x: b, y: fy - 1.2 }], t * 3, { n: 4, r: 1.2, op: cure });
    }
    s += txt(20, 30, 'Silver-flake or carbon ink, stretchable binder.', { size: 8, fill: C.faint });
    s += txt(20, 41, 'Fast and cheap; sits ON the fabric, so it can', { size: 8, fill: C.faint });
    s += txt(20, 52, 'crack when stretched (see No. 06).', { size: 8, fill: C.faint });
    return s;
  },
};

export const FABRIC_SCENES = { woven, knit, embroidery, couching, printed };
