#!/usr/bin/env node
/* verify-frame-drawn.mjs — the hand-drawn filigree's gate (docs/frame-flow-study.md §12). Node only, no browser.
   The relief clauses on the drawn build (FW FC FT FB FP FM FV and DI DP DW DL DD DE DH) are the flow gate's
   (`node tools/verify-frame-flow.mjs --only drawn`); this file checks what that gate cannot see on the
   placeholders alone — the IMPORTER on written-down SVGs whose answer is known, and the BEND on spines whose
   image is known in closed form — and runs the NEGATIVE CONTROL over both.

     I1 the frame: the root is the origin, +x to the right, y UP (the SVG's y flipped), millimetres off the ruler
        (a file drawn at 5 units per mm reads the same millimetres as one at 10);
     I2 an open outline is an error;  I3 a self-crossing outline is an error;  I4 a hole under the 1 mm floor is an
        error;  I5 an element with no root guide is an error and is skipped;
     I6 names are read the way Illustrator and Inkscape write them (`_x2D_` escapes, `_2_` suffixes, data-name,
        inkscape:label, an element-prefixed layer id) — depth from `outline-front`;
     I7 transforms on groups and shapes (translate, scale, rotate, matrix) are applied;
     I8 the path commands (relative and absolute M L H V C S Q T A Z) draw what they say: an arc circle's area is
        πr² within 0.5 %, a rounded rectangle's within 0.5 % of its closed form;
     I9 the template (docs/frame-drawing-template.svg) imports with no problem, with the variants the guide promises
        (c-scroll 3, s-scroll 2, volute 2, flame 3, shell 1, foot 1; leaf 1, optional);
     W1 on a STRAIGHT spine the bend is a rigid map (exact to 1e-9);
     W2 on a CIRCULAR spine (radius 20) a point (x, y) lands at the radius R − sy·y, at the angle sx·x / R
        (within 2e-3 mm, the polyline's own chord error): arc length along the spine and offsets across it are kept;
     W3 an offset on the inside of a turn past DRAWN.fold of the radius is HELD there and counted.

     --negative-control   twelve mutants in COPIES of the drawn modules (every anchor checked first); each must
                          redden exactly the checks it names (this file's, and the flow gate's drawn clauses on
                          the rectangle, spawned with --root on the copy). */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEG = process.argv.includes('--negative-control');

async function checks(root) {
  const out = [];
  const rec = (ok, name, detail) => out.push({ ok: !!ok, name, detail });
  const SI = await import(pathToFileURL(path.join(root, 'frame-svg-import.js')).href);
  const DR = await import(pathToFileURL(path.join(root, 'frame-drawn.js')).href);
  const svg = (inner, w = 400, h = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  const guides = (rx, ry, upm = 10) => `<g id="guides"><circle id="root" cx="${rx}" cy="${ry}" r="2"/><rect id="ruler" x="0" y="0" width="${upm}" height="1"/></g>`;
  const box = (r) => SI.ringBox([r]);
  const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
  const has = (P, re) => P.some((q) => re.test(q.message));
  // I1 the frame and the units
  {
    const r10 = SI.importDrawing(svg(`<g id="flame-1">${guides(100, 50, 10)}<g id="outline"><rect x="100" y="40" width="100" height="20"/></g></g>`));
    const r5 = SI.importDrawing(svg(`<g id="flame-1">${guides(100, 50, 5)}<g id="outline"><rect x="100" y="45" width="50" height="10"/></g></g>`));
    const a = r10.elements[0] && box(r10.elements[0].parts[0].rings[0]), b = r5.elements[0] && box(r5.elements[0].parts[0].rings[0]);
    // the up-direction: a shape drawn ABOVE the root on the page (smaller svg y) is at +y
    const up = SI.importDrawing(svg(`<g id="flame-1">${guides(100, 50, 10)}<g id="outline"><rect x="100" y="20" width="10" height="10"/></g></g>`));
    const u = up.elements[0] && box(up.elements[0].parts[0].rings[0]);
    rec(a && b && u && r10.unitsPerMm === 10 && r5.unitsPerMm === 5 && near(a.x0, 0) && near(a.x1, 10) && near(a.y0, -1) && near(a.y1, 1) && near(b.x0, 0) && near(b.x1, 10) && near(b.y0, -1) && near(b.y1, 1) && u.y0 > 0,
      'I1 the root is the origin, y up, millimetres off the ruler', a && b && u ? `10 u/mm box [${a.x0},${a.x1}]×[${a.y0},${a.y1}], 5 u/mm box [${b.x0},${b.x1}]×[${b.y0},${b.y1}] mm; a shape above the root reads y ${u.y0.toFixed(1)}..${u.y1.toFixed(1)}` : 'not imported');
  }
  // I2–I5 the errors
  {
    const open = SI.importDrawing(svg(`<g id="flame-1">${guides(10, 50)}<g id="outline"><path d="M10 40 L100 40 L100 60"/></g></g>`));
    rec(has(open.problems.filter((q) => q.level === 'error'), /open path/), 'I2 an open outline is an error', open.problems.map((q) => q.message).join('; ') || 'nothing said');
    const bow = SI.importDrawing(svg(`<g id="flame-1">${guides(10, 50)}<g id="outline"><path d="M10 40 L100 60 L100 40 L10 60 Z"/></g></g>`));
    rec(has(bow.problems.filter((q) => q.level === 'error'), /crosses itself/), 'I3 a self-crossing outline is an error', bow.problems.map((q) => q.message).join('; ') || 'nothing said');
    const tiny = SI.importDrawing(svg(`<g id="volute-1">${guides(10, 50)}<g id="outline"><rect x="10" y="30" width="80" height="40"/></g><g id="holes"><circle cx="50" cy="50" r="3"/></g></g>`));
    const ok = SI.importDrawing(svg(`<g id="volute-1">${guides(10, 50)}<g id="outline"><rect x="10" y="30" width="80" height="40"/></g><g id="holes"><circle cx="50" cy="50" r="6"/></g></g>`));
    rec(has(tiny.problems.filter((q) => q.level === 'error'), /under the 1 mm floor/) && !ok.problems.some((q) => q.level === 'error'), 'I4 a hole under the floor is an error (and a 1.2 mm one is not)', `0.6 mm hole: ${tiny.problems.map((q) => q.message).join('; ') || 'nothing said'}; 1.2 mm hole: ${ok.problems.filter((q) => q.level === 'error').length} errors`);
    const noRoot = SI.importDrawing(svg(`<g id="flame-1"><g id="guides"><rect id="ruler" width="10" height="1"/></g><g id="outline"><rect x="10" y="30" width="80" height="40"/></g></g>`));
    rec(has(noRoot.problems, /no `root`/) && noRoot.elements.length === 0, 'I5 no root guide: an error, the element skipped', `${noRoot.elements.length} elements; ${noRoot.problems.map((q) => q.message).join('; ')}`);
  }
  // I6 names
  {
    const r = SI.importDrawing(svg(`<g id="c-scroll-1_2_" data-name="c-scroll-1"><g id="c-scroll-1-guides"><circle id="c-scroll-1-root" cx="10" cy="50" r="2"/><rect id="ruler_1_" width="10" height="1"/></g><g id="outline_x2D_front"><rect x="10" y="40" width="50" height="20"/></g><g inkscape:label="detail" id="layer7"><path d="M10 50 L60 50"/></g><g data-name="outline-back" id="g99"><rect x="20" y="20" width="10" height="20"/></g></g>`));
    const e = r.elements[0];
    rec(e && e.name === 'c-scroll-1' && e.parts.some((p) => p.depth === 'front') && e.parts.some((p) => p.depth === 'back') && e.ridges.length === 1, 'I6 names read as Illustrator and Inkscape write them', e ? `${e.name}: parts ${e.parts.map((p) => p.depth || '(kind)').join(', ')}, ${e.ridges.length} ridge` : 'not imported');
  }
  // I7 transforms
  {
    const r = SI.importDrawing(svg(`<g id="flame-1" transform="translate(50 100)">${guides(0, 0)}<g id="outline" transform="scale(2)"><rect x="0" y="-5" width="10" height="10" transform="rotate(90 5 0)"/></g></g>`));
    const b = r.elements[0] && box(r.elements[0].parts[0].rings[0]);
    // scale(2) of a 10×10 square rotated about (5, 0): x 0..10, y −5..5 → (x 0..10 → 2× = 0..20 mm/10 = 0..2 mm); rotated: x 0..10, y −5..5 again
    rec(b && near(b.x0, 0, 1e-9) && near(b.x1, 2, 1e-9) && near(b.y0, -1, 1e-9) && near(b.y1, 1, 1e-9), 'I7 transforms applied', b ? `box [${b.x0.toFixed(6)},${b.x1.toFixed(6)}]×[${b.y0.toFixed(6)},${b.y1.toFixed(6)}] mm (want [0,2]×[−1,1])` : 'not imported');
  }
  // I8 path commands
  {
    const circ = SI.importDrawing(svg(`<g id="flame-1">${guides(0, 100)}<g id="outline"><path d="M 150 100 A 50 50 0 1 0 50 100 A 50 50 0 1 0 150 100 Z"/></g></g>`));
    const ca = circ.elements[0] ? Math.abs(SI.ringArea(circ.elements[0].parts[0].rings[0])) : 0, cw = Math.PI * 25;
    // a rounded rectangle 80 × 40 units, corner radius 10, in relative commands: H/V lines and C quarter circles (κ = 0.5523)
    const k = 10 * 0.5522847498;
    const rr = SI.importDrawing(svg(`<g id="flame-1">${guides(0, 100)}<g id="outline"><path d="m 20 80 h 60 c ${k} 0 10 ${10 - k} 10 10 v 20 c 0 ${k} ${-(10 - k)} 10 -10 10 h -60 s -10 ${-(10 - k)} -10 -10 v -20 q 0 -10 10 -10 z"/></g></g>`));
    const ra = rr.elements[0] ? Math.abs(SI.ringArea(rr.elements[0].parts[0].rings[0])) : 0;
    // closed form: 80×40 less three cubic corners (π·10²/4 each, within 0.03 %) and one QUADRATIC corner (area 10²/3 under its parabola, against a square's)
    const rw = (80 * 40 - 3 * (100 - Math.PI * 25) - (100 - 200 / 3)) / 100;
    rec(Math.abs(ca / cw - 1) < 0.005 && Math.abs(ra / rw - 1) < 0.005, 'I8 the path commands draw what they say', `arc circle ${ca.toFixed(3)} mm² against πr² ${cw.toFixed(3)}; rounded rectangle ${ra.toFixed(3)} against ${rw.toFixed(3)} mm²`);
  }
  // I9 the template
  {
    const PH = await import(pathToFileURL(path.join(root, 'frame-drawn-placeholders.js')).href);
    const r = SI.importDrawing(PH.PLACEHOLDER_SVG), n = (k) => r.elements.filter((e) => e.kind === k).length;
    const want = { 'c-scroll': 3, 's-scroll': 2, volute: 2, flame: 3, shell: 1, foot: 1, leaf: 1 };
    rec(!r.problems.length && Object.entries(want).every(([k, v]) => n(k) === v), 'I9 the template imports clean with its promised variants', `${r.problems.length} problems; ${Object.keys(want).map((k) => `${k} ${n(k)}`).join(', ')}`);
  }
  // W1–W3 the bend
  {
    const a = 30 * Math.PI / 180, t = [Math.cos(a), Math.sin(a)], nn = [-t[1], t[0]], p0 = [5, -3];
    const sp = DR.spineOf(Array.from({ length: 101 }, (_, i) => [p0[0] + 0.4 * i * t[0], p0[1] + 0.4 * i * t[1]]));
    const { f } = DR.bendMap(sp, 1.3, 0.7, -1);
    let worst = 0; for (const [x, y] of [[0, 0], [10, 3], [25, -4], [30.7, 1.1]]) { const q = f([x, y]), X = 1.3 * x, Y = -0.7 * y, w = [p0[0] + X * t[0] + Y * nn[0], p0[1] + X * t[1] + Y * nn[1]]; worst = Math.max(worst, Math.hypot(q[0] - w[0], q[1] - w[1])); }
    rec(worst < 1e-9, 'W1 a straight spine bends nothing (a rigid map)', `worst ${worst.toExponential(2)} mm`);
    const R = 20, arc = DR.spineOf(Array.from({ length: 4001 }, (_, i) => { const th = Math.PI / 2 * i / 4000; return [R * Math.cos(th), R * Math.sin(th)]; }));
    const b = DR.bendMap(arc, 1.1, 0.9, 1);
    let w2 = 0; for (const [x, y] of [[0, 0], [10, 2], [20, -3], [25, 5], [12, 8]]) { const q = b.f([x, y]), th = 1.1 * x / R, rr = R - 0.9 * y; w2 = Math.max(w2, Math.hypot(q[0] - rr * Math.cos(th), q[1] - rr * Math.sin(th))); }
    rec(w2 < 2e-3 && b.stats.held === 0, 'W2 a circular spine: arc length along and offsets across are kept', `worst ${w2.toExponential(2)} mm from (R − sy·y)·(cos, sin)(sx·x / R)`);
    const c = DR.bendMap(arc, 1, 1, 1), q = c.f([10, 0.95 * R]), rq = Math.hypot(q[0], q[1]);
    rec(c.stats.held === 1 && Math.abs(rq - (1 - DR.DRAWN.fold) * R) < 2e-3, 'W3 an offset past the fold limit is held and counted', `held ${c.stats.held}, the point at radius ${rq.toFixed(4)} (want ${((1 - DR.DRAWN.fold) * R).toFixed(4)})`);
  }
  return out;
}

if (!NEG) {
  const out = await checks(ROOT);
  for (const r of out) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  const bad = out.filter((r) => !r.ok).length;
  console.log(`\n${bad ? `FAIL — ${bad} check(s)` : 'PASS'}`);
  process.exit(bad ? 1 : 0);
}

/* ---------------- the negative control ---------------- */
const MUTANTS = [
  { id: 'the-depth-is-ignored', file: 'frame-drawn.js', from: "rank = { back: 0, mid: 1, front: 2 }[dp];", to: 'rank = 1;', breaks: ['DL'], mayAlso: ['DH'] },   // collapsed depth can let a hole cut a part that stood over it, or shut one a part stood in
  { id: 'the-stacking-floor-is-removed', file: 'frame-forms.js', from: 'if (R.under && R.under[k] > 0) raw[k]', to: 'if (false) raw[k]', breaks: ['DD'] },
  { id: 'the-holes-are-not-cut', file: 'frame-drawn.js', from: 'for (const h of dEl.holes) holes.push(', to: 'for (const h of []) holes.push(', breaks: ['DH'] },
  { id: 'the-ends-curl-the-wrong-way', file: 'frame-drawn.js', from: "(sl.cen[1] - sp.P[e][1]) * sp.N[e][1]) >= 0 ? 1 : -1;", to: "(sl.cen[1] - sp.P[e][1]) * sp.N[e][1]) >= 0 ? -1 : 1;", breaks: ['DE'], mayAlso: ['DW', 'DD', 'DL', 'FV', 'FP', 'FT', 'FC'] },
  { id: 'the-y-axis-is-not-flipped', file: 'frame-svg-import.js', from: '(root[1] - q[1]) / unitsPerMm', to: '(q[1] - root[1]) / unitsPerMm', breaks: ['I1', 'DE'], mayAlso: ['DW', 'DD', 'DL', 'FV', 'FP', 'FT', 'FC', 'I7', 'W1'] },
  { id: 'the-ruler-is-ignored', file: 'frame-svg-import.js', from: 'unitsPerMm = Math.max(b.x1 - b.x0, b.y1 - b.y0);', to: 'unitsPerMm = 10;', breaks: ['I1'], mayAlso: ['I6', 'I7', 'I8'] },
  { id: 'the-spine-is-not-relaxed', file: 'frame-drawn.js', from: 'for (let pass = 0; pass < 240; pass++) {', to: 'for (let pass = 0; pass < 0; pass++) {', breaks: ['DW'], mayAlso: ['FV', 'FP', 'FT', 'DD'] },
  { id: 'the-corner-jump-is-not-cut', file: 'frame-drawn.js', from: 'if (dw > 1 && dw > 4 * dl) {', to: 'if (false) {', breaks: ['DW'], mayAlso: ['FV', 'FP', 'FT', 'DD'] },
  { id: 'the-generator-copy-is-stale', file: 'frame-drawn-placeholders.js', from: 'export const PLACEHOLDER_SVG = "', to: 'export const PLACEHOLDER_SVG = "<!-- stale -->', breaks: ['DI'] },
  { id: 'a-self-crossing-goes-unseen', file: 'frame-svg-import.js', from: 'if (segX(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) out.push(ring[i]);', to: '', breaks: ['I3'], mayAlso: ['DW'] },
  { id: 'an-open-outline-goes-unseen', file: 'frame-svg-import.js', from: "if (!sub.closed) say('error'", to: "if (false) say('error'", breaks: ['I2'] },
  { id: 'the-bend-scales-across-by-the-length', file: 'frame-drawn.js', from: 'let Y = y * sy * side;', to: 'let Y = y * sx * side;', breaks: ['W1', 'W2'], mayAlso: ['DW', 'DD', 'FV', 'FP', 'FT', 'DL', 'DE'] },
];
const FILES = fs.readdirSync(ROOT).filter((f) => /^frame.*\.js$/.test(f));
// every anchor checked first, over ALL mutants: a `from` that moved, or now matches twice, disarms a mutant silently
let anchorsBad = 0;
for (const m of MUTANTS) { const src = fs.readFileSync(path.join(ROOT, m.file), 'utf8'), n = src.split(m.from).length - 1; if (n !== 1) { anchorsBad++; console.log(`FAIL anchor of ${m.id}: ${n} matches in ${m.file}`); } }
if (anchorsBad) process.exit(1);
console.log(`${MUTANTS.length} anchors match once each`);
let bad = 0;
for (const m of MUTANTS) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-drawn-mutant-'));
  for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.mkdirSync(path.join(dir, 'docs')); fs.copyFileSync(path.join(ROOT, 'docs/frame-drawing-template.svg'), path.join(dir, 'docs/frame-drawing-template.svg'));
  const p = path.join(dir, m.file); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(m.from, m.to));
  const red = new Set();
  for (const r of await checks(dir)) if (!r.ok) red.add(r.name.split(' ')[0]);
  const g = spawnSync(process.execPath, [path.join(ROOT, 'tools/verify-frame-flow.mjs'), '--root', dir, '--only', '^rect drawn$'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  for (const ln of (g.stdout || '').split('\n')) { const mm = /^FAIL {2}(\w+)/.exec(ln); if (mm) red.add(mm[1]); }
  if (g.status !== 0 && !/FAIL/.test(g.stdout || '')) red.add('crash');
  fs.rmSync(dir, { recursive: true, force: true });
  const missed = m.breaks.filter((c) => !red.has(c)), unclaimed = [...red].filter((c) => !m.breaks.includes(c) && !(m.mayAlso || []).includes(c));
  const ok = !missed.length && !unclaimed.length;
  if (!ok) bad++;
  console.log(`${ok ? ' ok ' : 'FAIL'} mutant ${m.id}: fired ${[...red].join(',') || 'nothing'}${missed.length ? ' MISSED ' + missed.join(',') : ''}${unclaimed.length ? ' UNCLAIMED ' + unclaimed.join(',') : ''}`);
}
console.log(`\n${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
process.exit(bad ? 1 : 0);
