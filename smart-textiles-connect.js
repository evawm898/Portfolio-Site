// smart-textiles-connect.js — part 01 (Tao's three tiers) and part 07 (connecting the hard parts to the
// soft ones) of /smart-textiles.html. Snaps, hook and loop, magnetic pogo connectors, crimps, and a board
// sewn on and sealed. Drawing kit: smart-textiles-core.js.
import {
  C, TAU, clamp, lerp, ease, seg, eseg, fr, pulse, rng, mix, poly, path, line, rect, circ, txt, tag,
  callout, strand, arrow, measure, at, electrons, sample, plot,
} from './smart-textiles-core.js';

const VB = '0 0 360 230';
const fabricBand = (x, y, w, h = 7) => {
  let s = rect(x, y, w, h, { fill: C.raised, stroke: C.line, 'stroke-width': 0.8 });
  for (let xx = x + 4; xx < x + w; xx += 7) s += circ(xx, y + h / 2, 1.8, { fill: 'none', stroke: C.faint, 'stroke-width': 0.5 });
  return s;
};

// ============================================================================================
// 01 · TAO'S THREE TIERS — passive smart (sense), active smart (sense + react), very smart (+ adapt)
// The same cold-morning example in each: the air temperature falls and recovers.
// ============================================================================================
const tiers = {
  vb: '0 0 720 250', dur: 10000,
  draw(t) {
    let s = '';
    const T = fr(t);
    const air = v => 0.75 - 0.55 * pulse(v, 0.1, 0.35, 0.6, 0.85);         // ambient, falls then recovers
    const panels = [
      { x: 10, name: 'Passive smart', verb: 'senses', blocks: ['SENSE'] },
      { x: 250, name: 'Active smart', verb: 'senses and reacts', blocks: ['SENSE', 'ACT'] },
      { x: 490, name: 'Very smart', verb: 'senses, reacts and adapts', blocks: ['SENSE', 'DECIDE', 'ACT'] },
    ];
    // body temperature at the skin under each kind of garment
    const skin = [
      v => 0.2 + 0.7 * air(v),                                                  // nothing done about it
      v => { const a = air(v); const on = a < 0.5; return clamp(0.2 + 0.7 * a + (on ? 0.3 + 0.035 * Math.sin(v * 90) : 0)); },  // bang-bang heater, overshoot ripple
      v => { const a = air(v); const learn = clamp(v * 1.3); return clamp(0.66 + 0.04 * Math.sin(v * 20) * (1 - learn) - 0.02 * (a - 0.5)); },  // holds its own setpoint
    ];
    panels.forEach((p, i) => {
      const x = p.x;
      s += rect(x, 10, 220, 230, { fill: 'none', stroke: C.hair, rx: 6 });
      s += txt(x + 12, 32, p.name, { size: 13, fill: C.ink, weight: 500 });
      s += txt(x + 12, 46, p.verb, { size: 8.5, fill: C.dim });
      // the chain of blocks with a pulse travelling along it
      const bw = 56, gap = (196 - bw * 3) / 2;
      const allB = ['SENSE', 'DECIDE', 'ACT'];
      const xs = allB.map((_, k) => x + 12 + k * (bw + gap));
      const hasDecide = p.blocks.includes('DECIDE'), hasAct = p.blocks.includes('ACT');
      allB.forEach((b, k) => {
        const on = p.blocks.includes(b);
        s += rect(xs[k], 60, bw, 24, { fill: on ? C.raised : 'none', stroke: on ? C.dim : C.hair, 'stroke-dasharray': on ? null : '2 2', rx: 3 });
        s += tag(xs[k] + bw / 2, 75, b, { anchor: 'middle', fill: on ? C.ink : C.faint });
      });
      // links
      const link = (a, b, on) => line(xs[a] + bw, 72, xs[b], 72, { stroke: on ? C.dim : C.hair, 'stroke-width': 1, 'stroke-dasharray': on ? null : '2 2' });
      s += link(0, 1, hasDecide) + link(1, 2, hasDecide);
      if (hasAct && !hasDecide) s += path(`M${xs[0] + bw / 2},84 Q${(xs[0] + xs[2]) / 2 + bw / 2},104 ${xs[2] + bw / 2},84`, { stroke: C.dim, 'stroke-width': 1 });
      // signal pulse
      const k = fr(T * 3);
      if (!hasAct) { const px = xs[0] + bw + k * 30; s += circ(px, 72, 2.4, { fill: C.mint, 'fill-opacity': 1 - k }); s += tag(xs[0] + bw + 6, 98, 'a reading, to someone else', { size: 6.5 }); }
      else if (!hasDecide) { const q = sample(20, u => { const a = 1 - u; return { x: a * a * (xs[0] + bw / 2) + 2 * a * u * ((xs[0] + xs[2]) / 2 + bw / 2) + u * u * (xs[2] + bw / 2), y: a * a * 84 + 2 * a * u * 104 + u * u * 84 }; }); const pp = at(q, measure(q), k); s += circ(pp.x, pp.y, 2.4, { fill: C.mint }); s += tag(x + 12, 118, 'fixed rule: below X, heat', { size: 6.5 }); }
      else {
        const pts = [{ x: xs[0] + bw, y: 72 }, { x: xs[2], y: 72 }]; const pp = at(pts, measure(pts), k); s += circ(pp.x, pp.y, 2.4, { fill: C.mint });
        // the adapt loop back from ACT to DECIDE
        s += path(`M${xs[2] + bw / 2},84 Q${xs[2] + bw / 2},108 ${xs[1] + bw / 2 + 10},108 Q${xs[1] + bw / 2},108 ${xs[1] + bw / 2},84`, { stroke: C.dim, 'stroke-width': 1 });
        s += arrow(xs[1] + bw / 2 + 2, 92, xs[1] + bw / 2, 86, { color: C.dim, head: 3 });
        s += tag(xs[1] + bw / 2 + 14, 118, 'learns: adjusts its own rule', { size: 6.5, anchor: 'middle' });
      }
      // the garment and wearer over the cold spell
      s += plot({ x: x + 12, y: 140, w: 196, h: 70, u: T, n: 160, series: [
        { f: air, color: C.indigo, dash: '3 2', noDot: true },
        { f: skin[i], color: C.plum },
      ], grid: [], title: 'air (dashed) · at the skin (solid)' });
      const note = ['a thermistor yarn reports the drop', 'a heater switches on below a threshold', 'it learns how warm this wearer likes it'][i];
      s += txt(x + 12, 228, note, { size: 8, fill: C.dim });
    });
    return s;
  },
};

// ============================================================================================
// SNAP FASTENER — the stud's bulb pushes the socket's spring apart, then it springs back behind it
// ============================================================================================
const snap = {
  vb: VB, dur: 5000,
  draw(t) {
    let s = '';
    const T = fr(t), close = pulse(T, 0.05, 0.32, 0.62, 0.88), cx = 120;
    const yb = lerp(78, 132, close), bR = 9, neck = 5.5, ys = 128;
    // stud radius at a given height
    const rAt = y => { const d = y - yb; return Math.abs(d) < bR ? Math.max(neck, Math.sqrt(bR * bR - d * d)) : (y < yb ? neck : 0); };
    const springX = Math.max(7.4, rAt(ys) + 1.2), engaged = yb > ys + 2;
    const clickK = clamp(1 - Math.abs(yb - ys - 4) / 4);
    // bottom fabric + its trace, socket body
    s += fabricBand(30, 160, 180);
    s += strand(`M${cx + 24},163.5 L230,163.5`, C.silver, 2, { halo: 0.6 });
    s += path(`M${cx - 26},160 L${cx - 26},120 Q${cx - 26},114 ${cx - 20},114 L${cx - 11},114 L${cx - 11},118 L${cx - 18},118 L${cx - 18},156 L${cx + 18},156 L${cx + 18},118 L${cx + 11},118 L${cx + 11},114 L${cx + 20},114 Q${cx + 26},114 ${cx + 26},120 L${cx + 26},160 Z`, { fill: C.steel, 'fill-opacity': 0.55, stroke: C.steel, 'stroke-width': 1 });
    // prongs through the fabric into the trace
    s += line(cx - 22, 160, cx - 22, 170, { stroke: C.steel, 'stroke-width': 2 }) + line(cx + 22, 160, cx + 22, 170, { stroke: C.steel, 'stroke-width': 2 });
    // the S-spring, cut through: two wires either side of the opening
    s += circ(cx - springX - 2.2, ys, 2.4, { fill: C.steel, stroke: C.ink, 'stroke-width': 0.6 }) + circ(cx + springX + 2.2, ys, 2.4, { fill: C.steel, stroke: C.ink, 'stroke-width': 0.6 });
    if (springX > 7.6) s += arrow(cx + springX + 6, ys, cx + springX + 14, ys, { color: C.dim, head: 3 }) + arrow(cx - springX - 6, ys, cx - springX - 14, ys, { color: C.dim, head: 3 });
    // the stud: top fabric, cap, neck, bulb
    const top = yb - 44;
    s += fabricBand(30, top - 10, 180);
    s += strand(`M10,${top - 6.5} L${cx - 24},${top - 6.5}`, C.silver, 2, { halo: 0.6 });
    s += rect(cx - 24, top - 3, 48, 6, { fill: C.steel, 'fill-opacity': 0.7, stroke: C.steel, rx: 2 });
    s += rect(cx - neck, top + 3, neck * 2, yb - top - 3, { fill: C.steel, 'fill-opacity': 0.9 });
    s += circ(cx, yb, bR, { fill: C.steel, 'fill-opacity': 0.9, stroke: C.ink, 'stroke-width': 0.6 });
    if (clickK > 0.1) s += txt(cx + 40, ys - 14, 'click', { size: 10, fill: C.ink, op: clickK });
    // current path once engaged: top trace -> stud -> spring -> socket -> bottom trace
    if (engaged) s += electrons([{ x: 10, y: top - 6.5 }, { x: cx, y: top - 6.5 }, { x: cx, y: yb }, { x: cx + springX + 2, y: ys }, { x: cx + 22, y: 150 }, { x: cx + 22, y: 163.5 }, { x: 230, y: 163.5 }], t * 3, { n: 10, r: 1.4 });
    s += tag(240, top - 4, 'stud (on the module)') + tag(240, 124, 'socket + spring') + tag(240, 167, 'garment trace');
    const R = v => { const c = pulse(fr(v), 0.05, 0.32, 0.62, 0.88); return lerp(78, 132, c) > ys + 2 ? 0.12 : 0.9; };
    s += plot({ x: 240, y: 186, w: 104, h: 26, u: T, n: 200, f: R, title: 'R: open / closed', grid: [], color: C.petrol });
    return s;
  },
};

// ============================================================================================
// HOOK AND LOOP — hooks catch loops when pressed; peeling unhooks them one row at a time
// ============================================================================================
const NH = 9;
const HOOKS = Array.from({ length: NH }, (_, i) => ({ x: 34 + i * 24, h: 24 + (i * 7 % 5) * 1.6, lx: 40 + i * 24, lh: 26 + (i * 3 % 4) * 2 }));
const velcro = {
  vb: VB, dur: 8000,
  draw(t) {
    let s = '';
    const T = fr(t), yLoopBase = 150;
    const down = eseg(T, 0.04, 0.28), peel = seg(T, 0.5, 0.86), apart = eseg(T, 0.86, 0.98);
    // top tape height: comes down, rises a touch to set the hooks, then peels from the left
    const baseY = lerp(40, 112, down) - (T > 0.32 ? 4 * eseg(T, 0.32, 0.4) : 0);
    const peelX = lerp(10, 290, peel);
    const lift = x => T < 0.5 ? 0 : clamp((peelX - x) / 70) * 70 + apart * 60;
    const tapeY = x => baseY - lift(x) - (T >= 0.86 ? 0 : 0);
    // bottom tape with loops
    s += rect(20, yLoopBase, 240, 8, { fill: C.raised, stroke: C.line, 'stroke-width': 0.8 });
    let engagedN = 0;
    HOOKS.forEach((hk, i) => {
      const hookTip = tapeY(hk.x) + hk.h + 6;
      const caught = T > 0.3 && T < 0.86 && (T < 0.5 ? hookTip > yLoopBase - hk.lh + 2 : lift(hk.x) < 18);
      if (caught) engagedN++;
      // the loop is stretched up by a caught hook, until it lets go
      const loopTop = caught && lift(hk.x) > 0 ? Math.min(yLoopBase - hk.lh, hookTip - 3) : yLoopBase - hk.lh;
      s += strand(`M${hk.lx - 6},${yLoopBase} C${hk.lx - 9},${loopTop - 4} ${hk.lx + 9},${loopTop - 4} ${hk.lx + 6},${yLoopBase}`, C.silver, 1.4, { halo: 0.8 });
    });
    // top tape (follows the peel) and its hooks
    const tape = sample(30, u => ({ x: 20 + u * 240, y: tapeY(20 + u * 240) }));
    s += path(poly(tape), { stroke: C.raised, 'stroke-width': 9 }) + path(poly(tape), { stroke: C.line, 'stroke-width': 0.8 });
    HOOKS.forEach(hk => {
      const y0 = tapeY(hk.x) + 4, yl = y0 + hk.h, strain = clamp((lift(hk.x) - 6) / 14) * (lift(hk.x) < 20 ? 1 : 0);
      // a hook opens a little under load before it slips out
      const open = 4 * strain;
      s += strand(`M${hk.x},${y0} L${hk.x},${yl} Q${hk.x},${yl + 7} ${hk.x + 5 + open},${yl + 6} L${hk.x + 7 + open * 1.4},${yl - 1 + open}`, C.silver, 1.4, { halo: 0.9 });
    });
    if (engagedN > 2 && T < 0.86) {
      const hk = HOOKS[NH - 1];
      s += electrons([{ x: 266, y: tapeY(266) }, { x: hk.x, y: tapeY(hk.x) + 4 }, { x: hk.x, y: tapeY(hk.x) + hk.h }, { x: hk.lx, y: yLoopBase - hk.lh }, { x: hk.lx + 6, y: yLoopBase }, { x: 266, y: yLoopBase + 4 }], t * 3, { n: 6, r: 1.3 });
    }
    s += tag(266, baseY + 2, 'hooks');
    s += tag(266, yLoopBase + 6, 'loops');
    s += txt(236, 40, T < 0.3 ? 'pressing' : T < 0.5 ? 'engaged' : T < 0.86 ? 'peeling: row by row' : 'apart', { size: 9, fill: C.ink });
    const Rof = v => { const n = v < 0.3 ? 0 : v < 0.5 ? NH : v < 0.86 ? Math.round(NH * (1 - seg(v, 0.5, 0.86))) : 0; return n === 0 ? 0.92 : 0.1 + 0.6 / n; };
    s += plot({ x: 30, y: 178, w: 300, h: 30, u: T, n: 200, f: Rof, title: 'contact R: more hooks caught, lower R', grid: [], color: C.petrol });
    return s;
  },
};

// ============================================================================================
// MAGNETIC POGO CONNECTOR — magnets pull the module into place; spring pins press onto pads
// ============================================================================================
const pogo = {
  vb: VB, dur: 5500,
  draw(t) {
    let s = '';
    const T = fr(t), approach = T < 0.5 ? ease(seg(T, 0.05, 0.3)) ** 2.2 : 1 - eseg(T, 0.65, 0.9);
    const yGap = lerp(50, 0, approach) + (1 - approach) * 3 * Math.sin(T * TAU * 3), base = 150, cx = 120;
    // garment side: fabric, pads, magnet
    s += fabricBand(20, base, 220);
    for (const dx of [-24, 0, 24]) s += rect(cx + dx - 7, base - 3, 14, 3, { fill: C.silver });
    s += rect(cx - 70, base - 6, 20, 6, { fill: C.magnet }) + rect(cx + 50, base - 6, 20, 6, { fill: C.magnet });
    s += tag(cx - 60, base + 20, 'N', { anchor: 'middle' }) + tag(cx + 60, base + 20, 'S', { anchor: 'middle' });
    // module side: housing, magnets, pins compressed as it seats
    const by = base - 6 - yGap - 30;
    s += rect(cx - 76, by, 152, 30, { fill: C.raised, stroke: C.dim, rx: 4 });
    s += rect(cx - 70, by + 24, 20, 6, { fill: C.magnet }) + rect(cx + 50, by + 24, 20, 6, { fill: C.magnet });
    const reach = 10, comp = clamp(reach - yGap) ;
    for (const dx of [-24, 0, 24]) {
      const x = cx + dx, pinLen = reach - comp, yTop = by + 12, yTip = by + 30 + pinLen;
      s += rect(x - 4, yTop, 8, 18, { fill: 'none', stroke: C.dim, 'stroke-width': 0.8 });
      // the spring inside the barrel, shorter as the pin is pushed in
      s += path(poly(sample(14, u => ({ x: x + (u * 14 % 2 < 1 ? -2.5 : 2.5) * 0 + 2.5 * Math.sin(u * TAU * 4), y: yTop + 2 + u * (12 - comp * 0.8) }))), { stroke: C.steel, 'stroke-width': 0.8 });
      s += rect(x - 2, by + 30 - comp, 4, pinLen + comp, { fill: C.copper, rx: 1.5 });
    }
    // field lines between the magnets as they near
    if (approach > 0.1) for (const mx of [cx - 60, cx + 60]) for (let k = 0; k < 3; k++) s += path(`M${mx - 6 + k * 6},${by + 30} L${mx - 6 + k * 6},${base - 6}`, { stroke: C.indigo, 'stroke-width': 0.8, 'stroke-dasharray': '2 2', 'stroke-opacity': approach * 0.8 });
    if (yGap < 1) s += electrons([{ x: 260, y: base + 3.5 }, { x: cx + 24, y: base + 3.5 }, { x: cx + 24, y: base - 3 }, { x: cx + 24, y: by + 14 }], t * 3, { n: 5, r: 1.3 });
    s += strand(`M${cx + 24},${base + 3.5} L260,${base + 3.5}`, C.silver, 1.6, { halo: 0.5 });
    s += tag(cx + 84, by + 10, 'module') + tag(cx + 84, by + 20, 'spring (pogo) pins');
    s += tag(cx + 128, base - 2, 'pads in the garment');
    s += txt(20, 30, 'Magnets do the aligning; springs keep the', { size: 8, fill: C.faint }) + txt(20, 41, 'force on each pad steady. Lifts straight off to wash.', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// CRIMP — sharp teeth pierce the fabric beside the conductive yarn and fold over to grip it
// ============================================================================================
const crimp = {
  vb: VB, dur: 5000,
  draw(t) {
    // the geometry is drawn at its own coordinates and scaled up about the yarn (K); labels are not scaled
    const K = 1.7, cx = 120, fy = 104, P = (x, y) => ({ x: cx + (x - cx) * K, y: fy + (y - fy) * K });
    let g = '', s = '';
    const T = fr(t), down = seg(T, 0, 0.36) ** 1.6, fold = eseg(T, 0.36, 0.52), back = eseg(T, 0.9, 1);
    const dRaw = lerp(-34, 0, down) - back * 34, curl = fold * (1 - back);
    g += fabricBand(cx - 66, fy, 132, 8);
    // conductive yarn in the fabric, cut across
    for (const dx of [-8, 0, 8]) g += circ(cx + dx, fy + 4, 3, { fill: C.silver });
    // the anvil below shapes the fold
    g += path(`M${cx - 40},${fy + 34} L${cx - 26},${fy + 34} Q${cx - 26},${fy + 22} ${cx - 16},${fy + 22} L${cx + 16},${fy + 22} Q${cx + 26},${fy + 22} ${cx + 26},${fy + 34} L${cx + 40},${fy + 34}`, { stroke: C.dim, 'stroke-width': 1.2 });
    // the crimp: a base plate with a tooth each side, and a tab that carries the current away
    const by = fy - 12 + dRaw;
    g += rect(cx - 28, by - 4, 56, 5, { fill: C.copper });
    g += rect(cx + 28, by - 4, 30, 3, { fill: C.copper });
    for (const side of [-1, 1]) {
      const x = cx + side * 20, tipLen = 30;
      const pts = sample(12, u => {
        const l = u * tipLen, bend = curl * Math.PI * 0.9;
        if (l < 20 || bend < 0.01) return { x, y: by + l };
        const a = ((l - 20) / 10) * bend, r = 10 / bend;
        return { x: x - side * r * (1 - Math.cos(a)), y: by + 20 + r * Math.sin(a) };
      });
      g += strand(poly(pts), C.copper, 2.6, { halo: 0.8 });
    }
    s += `<g transform="translate(${cx * (1 - K)},${fy * (1 - K)}) scale(${K})">${g}</g>`;
    if (curl > 0.9) {
      const a = P(cx + 8, fy + 4), b = P(cx + 20, fy + 2), c = P(cx + 20, by - 2), d = P(cx + 58, by - 2.5);
      s += electrons([a, b, c, d], t * 3, { n: 6, r: 1.5 });
    }
    const lab = P(cx + 58, by - 2.5), anv = P(cx + 40, fy + 34);
    s += tag(lab.x + 6, lab.y + 3, 'crimp tab');
    s += tag(lab.x + 6, lab.y + 12, 'tin-plated copper', { fill: C.faint });
    s += tag(anv.x + 8, anv.y + 3, 'anvil');
    s += tag(16, 22, T < 0.36 ? 'teeth come down' : T < 0.52 ? 'teeth pierce and fold' : T < 0.9 ? 'folded: gripping the yarn' : 'next one', { fill: C.ink });
    s += txt(16, 206, 'No solder: plated yarn takes solder badly, so the grip', { size: 8, fill: C.faint }) + txt(16, 217, 'is mechanical. Fast to apply on a press.', { size: 8, fill: C.faint });
    return s;
  },
};

// ============================================================================================
// SEWN ON, THEN SEALED — conductive thread looped through a board's plated holes; a TPU film
// laminated over it keeps sweat and washing out
// ============================================================================================
const sewn = {
  vb: VB, dur: 9000,
  draw(t) {
    let s = '';
    const T = fr(t), stitch = seg(T, 0, 0.5), seal = eseg(T, 0.55, 0.72) * (1 - eseg(T, 0.95, 1)), press = pulse(T, 0.55, 0.62, 0.7, 0.76);
    s += rect(20, 20, 320, 180, { fill: C.raised, stroke: C.hair, rx: 4 });
    // the board: a small PCB with four plated holes
    const bx = 120, byy = 70;
    s += rect(bx, byy, 80, 60, { fill: C.bg, stroke: C.mint, 'stroke-width': 1, rx: 3 });
    s += rect(bx + 26, byy + 18, 28, 24, { fill: C.raised, stroke: C.dim }) + tag(bx + 40, byy + 33, 'IC', { anchor: 'middle', size: 6.5 });
    const holes = [{ x: bx + 8, y: byy + 10 }, { x: bx + 72, y: byy + 10 }, { x: bx + 8, y: byy + 50 }, { x: bx + 72, y: byy + 50 }];
    holes.forEach(h => { s += circ(h.x, h.y, 4.5, { fill: C.bg, stroke: C.copper, 'stroke-width': 1.8 }); });
    // each hole gets a trace of running stitches from the edge, then three wraps through the hole
    const runs = [
      { h: 0, from: { x: 30, y: byy + 10 } }, { h: 1, from: { x: 330, y: byy + 10 } },
      { h: 2, from: { x: 30, y: byy + 50 } }, { h: 3, from: { x: 330, y: byy + 50 } },
    ];
    runs.forEach((r, i) => {
      const k = clamp(stitch * 4 - i), h = holes[r.h];
      const L = Math.abs(h.x - r.from.x) - 6, n = Math.floor(L / 9);
      const dir = Math.sign(h.x - r.from.x);
      const shown = Math.floor(n * clamp(k / 0.7));
      for (let j = 0; j < shown; j++) { const x = r.from.x + dir * j * 9; s += line(x, h.y, x + dir * 6, h.y, { stroke: C.silver, 'stroke-width': 1.8 }); }
      // wraps over the board edge into the hole
      const wraps = Math.floor(3 * clamp((k - 0.7) / 0.3));
      for (let w = 0; w < wraps; w++) { const a = (w - 1) * 0.5; s += path(`M${h.x - dir * 10},${h.y + a * 6} Q${h.x - dir * 4},${h.y + a * 6 - 3} ${h.x},${h.y}`, { stroke: C.silver, 'stroke-width': 1.4 }); }
      if (k > 0 && k < 1) s += circ(r.from.x + dir * shown * 9, h.y, 2.5, { fill: 'none', stroke: C.ink });
    });
    if (stitch >= 1) s += electrons([{ x: 30, y: byy + 10 }, { x: bx + 8, y: byy + 10 }], t * 3, { n: 5, r: 1.3 }) + electrons([{ x: bx + 72, y: byy + 50 }, { x: 330, y: byy + 50 }], t * 3, { n: 5, r: 1.3 });
    // the TPU film and the heat press coming down on it
    if (seal > 0.01) {
      s += rect(bx - 22, byy - 16, 124, 92, { fill: C.ink, 'fill-opacity': 0.08 * seal, stroke: C.ink, 'stroke-opacity': 0.5 * seal, 'stroke-dasharray': '4 3', rx: 10 });
      s += tag(bx + 116, byy + 33, 'TPU film,', { op: seal }) + tag(bx + 116, byy + 42, 'laminated', { op: seal });
    }
    if (press > 0.01) { s += rect(bx - 30, byy - 24 - (1 - press) * 20, 140, 108, { fill: 'none', stroke: C.plum, 'stroke-width': 1.4, rx: 6, 'stroke-opacity': press }); s += tag(bx + 40, byy + 98, 'heat press', { anchor: 'middle', op: press }); }
    s += tag(30, 40, 'conductive thread, running stitch');
    s += txt(30, 186, stitch < 1 ? 'stitching the traces and wrapping each pad' : seal > 0.5 ? 'sealed: sweat and washing kept off the joints' : 'sewn', { size: 8.5, fill: C.ink });
    return s;
  },
};

export const TIER_SCENES = { tiers };
export const CONNECT_SCENES = { snap, velcro, pogo, crimp, sewn };
