#!/usr/bin/env node
/* frame-drawing-template.mjs — writes the hand-drawn filigree's DRAWING TEMPLATE
   (docs/frame-drawing-template.svg) and the copy the generator reads
   (frame-drawn-placeholders.js, the same SVG as a string), filled with
   PLACEHOLDERS made from the forms round's measured profiles (frame-forms.js's
   FORMS, docs/frame-flow-grammar.md §9), so the pipeline runs end to end before
   anything is drawn and the person drawing sees the expected scale and style.

     node tools/frame-drawing-template.mjs           write both files
     node tools/frame-drawing-template.mjs --check   fail if either is stale

   The conventions are docs/frame-drawing-guide.md's; frame-svg-import.js reads
   them. Units: 10 drawing units per millimetre at the default 180 mm print
   (the `ruler` guide on every artboard is 1 mm long: the floor, the least
   printable stroke and gap). Each element is drawn STRAIGHTENED along +x from
   its `root`; "up" (−y in the SVG) is the side its end curls to. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FORMS } = await import(path.join(ROOT, 'frame-forms.js'));
const U = 10;                 // drawing units per mm
const M = 16;                 // the band width M at the default print (mm)
const F = 1.0;                // the floor (mm)
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, t) => a + (b - a) * t;
const reedW = (w0, w1, peak, w2) => (t) => (t < peak ? lerp(w0, w1, smooth(t / peak)) : lerp(w1, w2, smooth((t - peak) / (1 - peak))));

/* ---------- shape helpers, in the element's frame (mm, y up) ---------- */
// a band along a polyline path with half-widths: left side out, right side back, caps
function band(P, half, { startCap = 'flat', endCap = 'round' } = {}) {
  const n = P.length, N = P.map((_, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const L = P.map((p, i) => [p[0] + half[i] * N[i][0], p[1] + half[i] * N[i][1]]), Rt = P.map((p, i) => [p[0] - half[i] * N[i][0], p[1] - half[i] * N[i][1]]);
  const cap = (c, nrm, h, sgn) => { const out = [], a0 = Math.atan2(nrm[1], nrm[0]); for (let k = 1; k < 12; k++) { const a = a0 - sgn * Math.PI * k / 12; out.push([c[0] + h * Math.cos(a), c[1] + h * Math.sin(a)]); } return out; };
  const ring = [...L];
  if (endCap === 'round' && half[n - 1] > 0) ring.push(...cap(P[n - 1], N[n - 1], half[n - 1], 1));
  ring.push(...Rt.reverse());
  if (startCap === 'round' && half[0] > 0) ring.push(...cap(P[0], [-N[0][0], -N[0][1]], half[0], 1));
  return ring;
}
const straight = (L, ds = 0.25) => { const n = Math.max(2, Math.ceil(L / ds)), P = []; for (let i = 0; i <= n; i++) P.push([L * i / n, 0]); return P; };
const line = (pts) => pts;
// a turtle walk (heading th radians from +x toward +y, curvature ramps k0→k1, 1/mm)
function walk(x, y, th, segs, ds = 0.15) { const P = [[x, y]], H = [th]; for (const g of segs) { const n = Math.max(1, Math.ceil(g.len / ds)), d = g.len / n; for (let i = 0; i < n; i++) { const k = lerp(g.k0, g.k1, (i + 0.5) / n), h = th + k * d / 2; x += d * Math.cos(h); y += d * Math.sin(h); th += k * d; P.push([x, y]); H.push(th); } } return { P, H }; }
const circle = (c, r, n = 48) => { const o = []; for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n; o.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return o; };
const capsule = (a, b, r) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, a0 = Math.atan2(dy, dx), o = []; for (let k = 0; k <= 12; k++) { const t = a0 + Math.PI / 2 + Math.PI * k / 12; o.push([a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]); } for (let k = 0; k <= 12; k++) { const t = a0 - Math.PI / 2 + Math.PI * k / 12; o.push([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]); } return o; };
// lobes on the UP edge of a straight strap: the half-width there raised by bumps that rise slowly and drop sharply toward the tip
const lobed = (t, n, from, to, a) => { for (let q = 0; q < n; q++) { const t0 = from + (to - from) * q / n, t1 = from + (to - from) * (q + 1) / n; if (t >= t0 && t < t1) { const v = (t - t0) / (t1 - t0); return a * (v < 0.78 ? smooth(v / 0.78) : 1 - smooth((v - 0.78) / 0.22)); } } return 0; };
// a straight strap with a width profile (full width, mm), optional up-edge lobes; reeds as ridge lines
function strap(L, wOf, { lobes = null, reeds = 0, beads = false, channel = false } = {}) {
  const P = straight(L), n = P.length, up = [], dn = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1), h = wOf(t) / 2, l = lobes ? lobed(t, lobes.n, lobes.from, lobes.to, lobes.a) : 0; up.push([P[i][0], h + l]); dn.push([P[i][0], -h]); }
  const ring = [...dn, ...up.reverse()];
  const ridges = [], grooves = [];
  if (reeds) for (let q = 0; q < reeds; q++) { const f = reeds === 1 ? 0 : -0.8 + 1.6 * q / (reeds - 1), pl = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); if (t < 0.03 || t > 0.97) continue; pl.push([P[i][0], f * wOf(t) / 2 * 0.95]); } ridges.push(line(pl)); }
  if (beads) for (const sg of [-1, 1]) { const pl = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); if (t < 0.04 || t > 0.96) continue; pl.push([P[i][0], sg * 0.72 * wOf(t) / 2]); } ridges.push(pl); }
  if (channel) { const pl = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); if (t < 0.06 || t > 0.94) continue; pl.push([P[i][0], 0]); } grooves.push(pl); }
  return { ring, ridges, grooves };
}

/* ---------- the elements ---------- */
const ELS = [];
// C-scroll bodies: the channelled strap (two beads, a hollow between), narrowing to its volute's entry
const cW = FORMS.c.w * M, cWe = FORMS.c.wEntry * M;
const cProf = (t) => (t < 0.82 ? M * lerp(FORMS.c.w * 0.92, FORMS.c.w, Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.4))))) : M * lerp(FORMS.c.w, FORMS.c.wEntry, smooth((t - 0.82) / 0.18)));
for (const [n, aspect, tongue, note] of [[1, 3.0, false, 'stubby: a short shoulder, the crest C'], [2, 4.2, true, 'the shoulder C, with a TONGUE leaf hanging inside its arch (drawn at the back)'], [3, 5.5, false, 'long: the corner C, a long shoulder']]) {
  const L = aspect * cW, s = strap(L, cProf, { beads: true, channel: true });
  const parts = { '': [s.ring] }, ridges = [...s.ridges];
  if (tongue) {
    // the forms' tongue: from the crown, heading up and a little back, curving further back, pointed
    const tp = walk(0.5 * L, 0, Math.PI / 2 + 0.35, [{ len: FORMS.c.tongue[0] * M, k0: 0, k1: 0.6 / M }]);
    const half = tp.P.map((_, i, a) => { const t = i / (a.length - 1); return M * FORMS.c.tongue[1] * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * t))), 0.7) * Math.pow(Math.max(0, 1 - t), 0.4); });
    parts.back = [band(tp.P, half.map((h) => Math.max(0.05, h)), { endCap: 'none' })];
    ridges.push(tp.P.slice(Math.floor(0.05 * tp.P.length), Math.ceil(0.85 * tp.P.length)));
  }
  ELS.push({ name: `c-scroll-${n}`, label: `C-scroll body ${n} — ${note}`, size: { x1: L, y0: -cW / 2, y1: cW / 2 }, parts, ridges, grooves: s.grooves, holes: [], end: 'volute-1' });
}
// S-scrolls: the reeded stem (five reeds), lobed toward its node
for (const [n, aspect, note] of [[1, 4.5, 'short: a stem springing from the foot'], [2, 9.5, 'long: a stem running the flank']]) {
  const wOf = (t) => M * reedW(0.46, FORMS.stem.w, 0.25, 0.55)(t), L = aspect * FORMS.stem.w * M;
  const s = strap(L, wOf, { reeds: FORMS.stem.reeds, lobes: { n: 2, from: 0.6, to: 0.95, a: 0.14 * M } });
  ELS.push({ name: `s-scroll-${n}`, label: `S-scroll ${n} — ${note} (the S comes from its slot's spine)`, size: { x1: L, y0: -FORMS.stem.w * M / 2, y1: FORMS.stem.w * M / 2 }, parts: { '': [s.ring] }, ridges: s.ridges, grooves: [], holes: [], end: 'volute-2' });
}
// flames: the reeded flame (three reeds) swelling to its belly, lobed on the up edge
for (const [n, aspect, ws, la, note] of [[1, 6.4, 0.85, 0.13, 'the inner flame: long, low'], [2, 4.7, 0.85, 0.13, 'the middle flame'], [3, 3.1, 1.25, 0.2, 'the DOMINANT flame: wide, deep lobes']]) {
  const wOf = (t) => M * reedW(FORMS.flame.w[0], ws * FORMS.flame.w[1], FORMS.flame.peak, FORMS.flame.w[2])(t), wMax = M * ws * FORMS.flame.w[1], L = aspect * wMax;
  const s = strap(L, wOf, { reeds: FORMS.flame.reeds, lobes: { n: 3, from: 0.55, to: 0.95, a: la * M } });
  ELS.push({ name: `flame-${n}`, label: `leaf flame ${n} — ${note}`, size: { x1: L, y0: -wMax / 2, y1: wMax / 2 }, parts: { '': [s.ring] }, ridges: s.ridges, grooves: [], holes: [], end: 'volute-2' });
}
// the foot: a reeded strap curling under at its end (volute-1)
{
  const wOf = (t) => M * reedW(0.42, FORMS.foot.w, 0.3, 0.46)(t), L = 2.7 * FORMS.foot.w * M;
  const s = strap(L, wOf, { reeds: FORMS.foot.reeds });
  ELS.push({ name: 'foot-1', label: 'bottom foot / cartouche — the strap that pours from under the bottom shell and curls under', size: { x1: L, y0: -FORMS.foot.w * M / 2, y1: FORMS.foot.w * M / 2 }, parts: { '': [s.ring] }, ridges: s.ridges, grooves: [], holes: [], end: 'volute-1' });
}
// volute-1: the CLOSED curl — a spiral strap of ≥ 1.1 turns round a ball eye in a pierced ring
{
  const r0 = FORMS.vol.r0Max * M, wIn = cWe, wEnd = 1.6, rEnd = 3.4, turns = 1.2,   // the eye opened so a ball fits in its ring (forms' rEnd left no room for one)
    b = Math.log(r0 / rEnd) / (2 * Math.PI * turns);
  const P = [[-0.8, 0], [0, 0]];
  // the spiral: starting at the origin heading +x, its centre r0 up
  // a log spiral leaves its start at atan(b) to its circle's tangent: turned back by that, it leaves along +x (the stub)
  const al = -Math.atan(b), ca = Math.cos(al), sa = Math.sin(al), rot = ([x, y]) => [ca * x - sa * y, sa * x + ca * y];
  let phi = 0; const cen = rot([0, r0]);
  while (phi < 2 * Math.PI * turns) { const r = r0 * Math.exp(-b * phi), dphi = Math.min(0.12 / r, 2 * Math.PI * turns - phi); phi += dphi; const rr = r0 * Math.exp(-b * phi); P.push(rot([rr * Math.sin(phi), r0 - rr * Math.cos(phi)])); }
  const nP = P.length, total = nP - 2, half = [];
  for (let i = 0; i < nP; i++) {
    const t = i < 2 ? 0 : (i - 1) / total, tw = lerp(wIn, wEnd, smooth(t));
    let d = Infinity; for (let j = 1; j < nP; j++) { const dp = Math.abs(j - i) / total * turns; if (dp < 0.75) continue; d = Math.min(d, Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1])); }
    half.push(0.5 * (d === Infinity ? tw : Math.min(tw, d - FORMS.gap)));
  }
  const ring = band(P, half);
  // the eye: the largest empty circle inside the last turn, the ball concentric in a ring FORMS.eyeHole wide
  const i0 = Math.round(nP - 1 - (nP - 1) / turns), T = P.slice(i0), Th = half.slice(i0);
  let best = -Infinity, c = cen;
  for (let x = cen[0] - r0; x <= cen[0] + r0; x += 0.05) for (let y = cen[1] - r0; y <= cen[1] + r0; y += 0.05) { let m = Infinity; for (let k = 0; k < T.length; k++) m = Math.min(m, Math.hypot(T[k][0] - x, T[k][1] - y) - Th[k]); if (m > best && Math.hypot(x - cen[0], y - cen[1]) < r0 * 0.4) { best = m; c = [x, y]; } }
  const room = best - 0.1, ball = room - FORMS.eyeHole;
  if (!(ball >= 0.6)) throw new Error(`volute-1: the eye's room ${room.toFixed(2)} mm leaves no ball`);
  const end = P[nP - 1], dl = Math.hypot(end[0] - c[0], end[1] - c[1]) || 1;
  const to = [c[0] + (end[0] - c[0]) / dl * (room + 0.3), c[1] + (end[1] - c[1]) / dl * (room + 0.3)];
  ELS.push({ name: 'volute-1', label: 'volute end 1 — the CLOSED curl round a ball eye (C-scrolls, the foot); placed whole at its body\'s end', size: { x1: 2 * r0, y0: -wIn / 2, y1: 2 * r0 + wIn / 2 }, parts: { '': [ring], front: [circle(c, ball), capsule(c, to, 0.55)] }, ridges: [], grooves: [], holes: [circle(c, room, 64)], rigid: true, entry: wIn });
}
// volute-2: the OPEN hook — the strap turned over through half a turn at a constant radius, tapering
{
  const wIn = FORMS.flame.w[2] * M, wR = FORMS.flame.roll.w * M, rc = Math.max(0.27 * M, wR / 2 + FORMS.eyeHole / 2 + 0.15), arcT = 2 * Math.PI * 0.5 - 0.3;
  const tp = walk(-0.8, 0, 0, [{ len: 0.8, k0: 0, k1: 0 }, { len: 0.6 * rc, k0: 0, k1: 1 / rc }, { len: rc * arcT, k0: 1 / rc, k1: 1 / rc }]);
  const n = tp.P.length, iR = Math.round(n * (0.8 + 0.6 * rc) / (0.8 + 0.6 * rc + rc * arcT));
  const half = tp.P.map((_, i) => { if (i <= iR) return 0.5 * lerp(wIn, Math.min(wIn, wR * 1.15), smooth(i / Math.max(1, iR))); const t = (i - iR) / Math.max(1, n - 1 - iR); return 0.5 * lerp(Math.min(wIn, wR * 1.15), wR, smooth(Math.min(1, t * 3))) * lerp(1, 0.38, smooth((t - 0.45) / 0.55)); });
  ELS.push({ name: 'volute-2', label: 'volute end 2 — the OPEN hook (flame tips, the stem\'s node); placed whole at its body\'s end', size: { x1: rc * 1.6, y0: -wIn / 2, y1: 2 * rc + wR / 2 }, parts: { '': [band(tp.P, half)] }, ridges: [tp.P.slice(4, Math.round(n * 0.7))], grooves: [], holes: [], rigid: true, entry: wIn });
}
// the crest shell: a cupped fan, seven broad lobes touching at a scalloped rim, fluted, a rim bead
{
  const R = 30, span = 62 * Math.PI / 180, nL = 7, share = 2 * span * R / nL, parts = [];
  const sector = [[0, 0]]; for (let k = 0; k <= 30; k++) { const a = -span + 2 * span * k / 30; sector.push([0.84 * R * Math.cos(a), 0.84 * R * Math.sin(a)]); }
  parts.push(sector);
  const disc = [[0, -0.42 * R]]; for (let k = 0; k <= 32; k++) { const a = -Math.PI / 2 + Math.PI * k / 32; disc.push([0.42 * R * Math.cos(a), 0.42 * R * Math.sin(a)]); }
  parts.push(disc);
  const ridges = [], grooves = [];
  for (let q = -3; q <= 3; q++) {
    const a = q / 3 * span * (1 - 0.5 / nL), len = R * (1 - 0.08 * (q / 3) ** 2), d = [Math.cos(a), Math.sin(a)], P = [], half = [];
    for (let k = 0; k <= 24; k++) { const t = k / 24, r = len * lerp(0.3, 1, t); P.push([r * d[0], r * d[1]]); const wide = 0.5 * share * 1.15 * (r / R); half.push(Math.max(0.5, wide * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) * 0.75 + 0.25 : 1))); }
    parts.push(band(P, half));
    ridges.push([[0.2 * R * d[0], 0.2 * R * d[1]], [0.93 * len * d[0], 0.93 * len * d[1]]]);
    if (q < 3) { const a2 = (q + 0.5) / 3 * span * (1 - 0.5 / nL), e = [Math.cos(a2), Math.sin(a2)]; grooves.push([[0.25 * R * e[0], 0.25 * R * e[1]], [0.8 * R * e[0], 0.8 * R * e[1]]]); }
  }
  const rim = []; for (let k = 0; k <= 40; k++) { const a = -span * 0.92 + 2 * span * 0.92 * k / 40; rim.push([0.86 * R * Math.cos(a), 0.86 * R * Math.sin(a)]); }
  ridges.push(rim);
  ELS.push({ name: 'shell-1', label: 'crest shell — the fan on the axis (crest and bottom); placed whole, opening along +x; draw it symmetric about the spine', size: { x1: R, y0: -0.9 * R, y1: 0.9 * R }, parts: { '': parts }, ridges, grooves, holes: [], rigid: true });
}
// a small leaf (fan leaflets, the sheath, the curl-under): lobed, a midrib
{
  const w = FORMS.fan.w * M, L = 2.1 * w, P = straight(L), n = P.length;
  const half = P.map((_, i) => { const t = i / (n - 1), body = t < 0.3 ? 0.55 + 0.45 * smooth(t / 0.3) : Math.pow(Math.max(0, Math.cos((t - 0.3) / 0.7 * Math.PI / 2)), 0.8); let lb = 1; for (let q = 1; q <= 2; q++) { const tq = 0.3 + 0.6 * q / 2.5, e = (t - tq) / 0.05; lb -= 0.3 * Math.exp(-e * e); } return Math.max(0.12, 0.5 * w * body * lb); });
  ELS.push({ name: 'leaf-1', label: 'small leaf (optional) — the fan at the meeting, the sheath over the flames\' root, the curl-under', size: { x1: L, y0: -w / 2, y1: w / 2 }, parts: { '': [band(P, half, { endCap: 'round' })] }, ridges: [P.slice(Math.floor(0.05 * n), Math.ceil(0.85 * n))], grooves: [], holes: [] });
}

/* ---------- the SVG ---------- */
const f2 = (v) => (Math.round(v * 100) / 100).toString();
const pathD = (ring, closed = true) => ring.map((q, i) => `${i ? 'L' : 'M'}${f2(q[0] * U)} ${f2(-q[1] * U)}`).join('') + (closed ? 'Z' : '');
const STYLE = { back: '#9a958d', '': '#4a4744', mid: '#4a4744', front: '#1d1c1a' };
const out = [];
const COLS = 3, PAD = 9;     // mm around the size box
let ox = 0, oy = 30, rowH = 0, col = 0;
const placed = [];
for (const e of ELS) {
  const bw = e.size.x1 + 2 * PAD + 8, bh = (e.size.y1 - e.size.y0) + 2 * PAD + 10;
  if (col === COLS) { col = 0; ox = 0; oy += rowH + 6; rowH = 0; }
  placed.push({ e, x: ox, y: oy, bw, bh });
  ox += bw + 6; rowH = Math.max(rowH, bh); col++;
}
const W = Math.max(...placed.map((p) => p.x + p.bw)), H = Math.max(...placed.map((p) => p.y + p.bh)) + 4;
out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W * U)} ${f2(H * U)}">`);
out.push(`<!-- The hand-drawn filigree's drawing template. Read docs/frame-drawing-guide.md. Generated by tools/frame-drawing-template.mjs with PLACEHOLDERS from the forms round's profiles: draw over them, keep the guides. 10 units = 1 mm at the default 180 mm print. -->`);
out.push(`<g id="sheet-notes" inkscape:label="sheet-notes" data-name="sheet-notes"><text x="${U * 2}" y="${U * 8}" font-family="monospace" font-size="${U * 2.6}">/frame — the hand-drawn filigree. Draw each element STRAIGHTENED along +x from its root; up = the side its end curls to.</text><text x="${U * 2}" y="${U * 14}" font-family="monospace" font-size="${U * 1.9}">layers: outline (filled, closed; outline-back/-mid/-front = depth) · detail (stroked: ridges) · groove (stroked: incised) · holes (closed: cut through) · guides (not built)</text><text x="${U * 2}" y="${U * 19}" font-family="monospace" font-size="${U * 1.9}">bodies are BENT along their slot; volutes and the shell are placed WHOLE · grey back, dark mid, black front · teal ridges, rust grooves, red holes · red bar = 1 mm</text></g>`);
for (const { e, x, y, bw, bh } of placed) {
  const rx = x + PAD + 4, ry = y + 8 + PAD + e.size.y1;      // the root, in mm on the sheet (y down)
  const nm = e.name, lab = (s) => `id="${nm}-${s}" inkscape:label="${s}" data-name="${s}"`;
  out.push(`<g id="${nm}" inkscape:label="${nm}" data-name="${nm}" transform="translate(${f2(rx * U)} ${f2(ry * U)})">`);
  // guides
  out.push(`<g ${lab('guides')} fill="none" stroke="#7aa0c8" stroke-width="${U * 0.12}">`);
  out.push(`<rect id="${nm}-artboard" data-name="artboard" x="${f2(-(PAD + 4) * U)}" y="${f2(-(8 + PAD + e.size.y1) * U)}" width="${f2(bw * U)}" height="${f2(bh * U)}" stroke="#c9c4ba" stroke-dasharray="${U} ${U}"/>`);
  out.push(`<text x="${f2(-(PAD + 2) * U)}" y="${f2(-(PAD + e.size.y1 + 3) * U)}" font-family="monospace" font-size="${U * 2.2}" fill="#333" stroke="none">${nm} · ${e.label.split(' — ')[0].replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`);
  out.push(`<text x="${f2(-(PAD + 2) * U)}" y="${f2(-(PAD + e.size.y1 + 0.6) * U)}" font-family="monospace" font-size="${U * 1.5}" fill="#666" stroke="none">${(e.label.split(' — ')[1] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, Math.floor(bw * 1.2))}</text>`);
  out.push(`<rect ${lab('size')} x="0" y="${f2(-e.size.y1 * U)}" width="${f2(e.size.x1 * U)}" height="${f2((e.size.y1 - e.size.y0) * U)}" stroke-dasharray="${U * 0.8} ${U * 0.5}"/>`);
  out.push(`<line ${lab('spine')} x1="${f2(-3 * U)}" y1="0" x2="${f2((e.size.x1 + 4) * U)}" y2="0" stroke="#d07a4a"/>`);
  out.push(`<path ${lab('growth')} d="M${f2((e.size.x1 + 4) * U)} 0l${f2(-1.6 * U)} ${f2(-0.8 * U)}m${f2(1.6 * U)} ${f2(0.8 * U)}l${f2(-1.6 * U)} ${f2(0.8 * U)}" stroke="#d07a4a"/>`);
  out.push(`<circle ${lab('root')} cx="0" cy="0" r="${f2(0.6 * U)}" fill="#d07a4a" stroke="none"/>`);
  out.push(`<path ${lab('up')} d="M${f2(-2 * U)} ${f2(-1 * U)}l0 ${f2(-2.4 * U)}l${f2(-0.6 * U)} ${f2(0.8 * U)}m${f2(0.6 * U)} ${f2(-0.8 * U)}l${f2(0.6 * U)} ${f2(0.8 * U)}" stroke="#d07a4a"/>`);
  out.push(`<rect ${lab('ruler')} x="0" y="${f2((-e.size.y0 + 3) * U)}" width="${f2(F * U)}" height="${f2(0.25 * U)}" fill="#c33" stroke="none"/>`);
  out.push(`<text x="${f2(1.6 * U)}" y="${f2((-e.size.y0 + 3.4) * U)}" font-family="monospace" font-size="${U * 1.4}" fill="#c33" stroke="none">1 mm: the least stroke / gap that prints</text>`);
  if (e.rigid) out.push(`<rect ${lab('rigid')} x="${f2(-1.2 * U)}" y="${f2(1.2 * U)}" width="${f2(0.8 * U)}" height="${f2(0.8 * U)}" fill="#7aa0c8" stroke="none"/>`);
  out.push(`</g>`);
  for (const [depth, rings] of Object.entries(e.parts)) {
    const layer = depth ? `outline-${depth}` : 'outline';
    out.push(`<g ${lab(layer)} fill="${STYLE[depth]}" stroke="none">${rings.map((r) => `<path d="${pathD(r)}"/>`).join('')}</g>`);
  }
  if (e.ridges.length) out.push(`<g ${lab('detail')} fill="none" stroke="#3aa39a" stroke-width="${U * 0.3}" stroke-linecap="round">${e.ridges.map((r) => `<path d="${pathD(r, false)}"/>`).join('')}</g>`);
  if (e.grooves.length) out.push(`<g ${lab('groove')} fill="none" stroke="#b8642e" stroke-width="${U * 0.3}" stroke-linecap="round">${e.grooves.map((r) => `<path d="${pathD(r, false)}"/>`).join('')}</g>`);
  if (e.holes.length) out.push(`<g ${lab('holes')} fill="#ffffff" stroke="#c33" stroke-width="${U * 0.12}">${e.holes.map((r) => `<path d="${pathD(r)}"/>`).join('')}</g>`);
  out.push(`</g>`);
}
out.push(`</svg>`);
const svg = out.join('\n') + '\n';
const js = `/* frame-drawn-placeholders.js — GENERATED by tools/frame-drawing-template.mjs; do not edit.
   The hand-drawn filigree's placeholder drawings: docs/frame-drawing-template.svg, as a string, so the
   generator (frame-drawn.js) runs end to end in Node and the page before anything is drawn. Regenerate
   with \`node tools/frame-drawing-template.mjs\`; \`--check\` fails when this file and the SVG disagree. */
export const PLACEHOLDER_SVG = ${JSON.stringify(svg)};
`;
const SVG_PATH = path.join(ROOT, 'docs/frame-drawing-template.svg'), JS_PATH = path.join(ROOT, 'frame-drawn-placeholders.js');
if (process.argv.includes('--check')) {
  const okS = fs.existsSync(SVG_PATH) && fs.readFileSync(SVG_PATH, 'utf8') === svg, okJ = fs.existsSync(JS_PATH) && fs.readFileSync(JS_PATH, 'utf8') === js;
  console.log(`${okS ? 'ok  ' : 'STALE'} docs/frame-drawing-template.svg\n${okJ ? 'ok  ' : 'STALE'} frame-drawn-placeholders.js`);
  process.exit(okS && okJ ? 0 : 1);
}
fs.writeFileSync(SVG_PATH, svg); fs.writeFileSync(JS_PATH, js);
console.log(`wrote ${path.relative(ROOT, SVG_PATH)} (${(svg.length / 1024).toFixed(1)} KB, ${ELS.length} elements) and ${path.relative(ROOT, JS_PATH)}`);
