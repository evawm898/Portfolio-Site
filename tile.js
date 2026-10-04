/* tile.js — the /tile page. Everything geometric lives in tile-geometry.js
   (the tile, its curves, the editor's operations, the guardrails, the SVGs) and
   tile-roller.js (the rollers, their meshes and STLs); this file draws them and
   routes the hand. Every edit goes through the geometry module's own
   operations, which BLOCK an edit that would make the outline cross itself: a
   blocked drag leaves the point where it last was valid, and the status line
   says why. Read tile-design-doc.md before changing any of it. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as G from './tile-geometry.js';
import * as RL from './tile-roller.js';

const STORE = 'tessellation-rollers-v1';
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const NS = 'http://www.w3.org/2000/svg';
const D2R = Math.PI / 180;

/* ---------------- state ---------------- */
let tile = G.defaultTile();
let print = { ...RL.PRINT_DEFAULTS };
let rollers = { ...RL.ROLLER_DEFAULTS };
let sel = null;                 // { which: 'A'|'B', i } an interior point, or { corner: k }
let status = '';
let thin = null;                // thinAnalysis of the CURRENT tile, or null while stale
let thinUrl = '';
let close = [];
let built = null;
let drag = null;                // the pointer gesture in progress
let edFrame = null;             // the editor's world→screen frame (held during a drag)
let org = [0, 0];               // where the tile's C0 is drawn, world mm (moves only while a corner is dragged)
const stats = { blocked: 0, builds: 0, buildMs: 0, thinMs: 0, edits: 0 };

const $ = (id) => document.getElementById(id);
const edSvg = $('edSvg'), patchSvg = $('patchSvg');

/* ---------------- frames ---------------- */
function fitFrame(svg, x0, y0, x1, y1, pad) {
  const W = svg.clientWidth || 600, H = svg.clientHeight || 400;
  const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6);
  const s = Math.max(1e-6, Math.min((W - 2 * pad) / w, (H - 2 * pad) / h));
  return { s, ox: W / 2 - (s * (x0 + x1)) / 2, oy: H / 2 + (s * (y0 + y1)) / 2, W, H };
}
const toS = (F, p) => [F.ox + F.s * p[0], F.oy - F.s * p[1]];
const fromS = (F, X, Y) => [(X - F.ox) / F.s, (F.oy - Y) / F.s];
const fmt = (v) => v.toFixed(2);
const pathD = (F, pts, closed, off = [0, 0]) => {
  let d = '';
  for (let k = 0; k < pts.length; k++) { const [X, Y] = toS(F, [pts[k][0] + off[0], pts[k][1] + off[1]]); d += (k ? 'L' : 'M') + fmt(X) + ' ' + fmt(Y); }
  return d + (closed ? 'Z' : '');
};
function eventScreen(svg, ev) { const r = svg.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

/* the four copies of the two edges, as drawn on the editor: [which, copy, offset] */
function copies(t) {
  const { tA, tB } = G.latticeVectors(t);
  return [['A', 0, [0, 0]], ['A', 1, tB], ['B', 0, [0, 0]], ['B', 1, tA]];
}
const copyOffset = (t, which, copy) => {
  if (!copy) return [0, 0];
  const { tA, tB } = G.latticeVectors(t);
  return which === 'A' ? tB : tA;
};

function editorFrame() {
  const o = G.outline(tile);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of o.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const m = 0.26 * Math.max(x1 - x0, y1 - y0);
  return fitFrame(edSvg, x0 - m, y0 - m, x1 + m, y1 + m, 8);
}

/* ---------------- the editor ---------------- */
function drawEditor() {
  const W = edSvg.clientWidth || 600, H = edSvg.clientHeight || 400;
  edSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (!drag || !edFrame) edFrame = editorFrame();
  const F = edFrame;
  const o = G.outline(tile);
  const { tA, tB } = o;
  let s = '';
  // the eight neighbours, faint, so an edit is seen landing on them too
  for (let k = -1; k <= 1; k++) for (let m = -1; m <= 1; m++) {
    if (!m && !k) continue;
    const off = add2(org, [m * tA[0] + k * tB[0], m * tA[1] + k * tB[1]]);
    s += `<path class="ghost" d="${pathD(F, o.pts, true, off)}"/>`;
  }
  s += `<path class="cell" d="${pathD(F, o.pts, true, org)}"/>`;
  if (thin && thinUrl && !drag) {
    const fr = thin.frame, [X, Y] = toS(F, add2(org, [fr.gx, fr.gy + fr.ny * fr.h]));
    s += `<image class="thin" href="${thinUrl}" x="${fmt(X)}" y="${fmt(Y)}" width="${fmt(F.s * fr.nx * fr.h)}" height="${fmt(F.s * fr.ny * fr.h)}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`;
  }
  // the four edge copies, each with a wide transparent twin to click on
  const dense = { A: o.A.pts, B: o.B.pts };
  for (const [which, copy, off] of copies(tile)) {
    const d = pathD(F, dense[which], false, add2(org, off));
    s += `<path class="edge ${which}" d="${d}"/>`;
    s += `<path class="edge-hit" data-which="${which}" data-copy="${copy}" d="${d}"/>`;
  }
  // tags, outside the tile's own box so they never sit on a line of it
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of o.pts) { const [X, Y] = toS(F, add2(org, p)); bx0 = Math.min(bx0, X); bx1 = Math.max(bx1, X); by0 = Math.min(by0, Y); by1 = Math.max(by1, Y); }
  const tag = (which, txt, X, Y, anchor) => { s += `<text class="tag ${which}" x="${fmt(X)}" y="${fmt(Y)}" text-anchor="${anchor}">${txt}</text>`; };
  const narrow = W < 480;                      // a phone: short tags, or they run off the side
  tag('A', `${narrow ? 'A' : 'edge A'} · ${tile.pitchA.toFixed(1)} mm`, (bx0 + bx1) / 2, by1 + 16, 'middle');
  tag('A', narrow ? 'A, again' : 'its copy (the same edge)', (bx0 + bx1) / 2, by0 - 8, 'middle');
  tag('B', narrow ? 'B' : `edge B · ${tile.pitchB.toFixed(1)} mm`, bx0 - 10, (by0 + by1) / 2 - 4, 'end');
  tag('', `θ ${tile.angle.toFixed(0)}°`, bx0 - 10, (by0 + by1) / 2 + 10, 'end');
  tag('B', narrow ? 'B' : 'its copy', bx1 + 10, (by0 + by1) / 2 + 4, 'start');
  // θ as an arc at C0, from edge A's direction to edge B's
  const [cx, cy] = toS(F, org), ra = 18, th = tile.angle * D2R;
  s += `<path class="chord" d="M${fmt(cx + ra)} ${fmt(cy)}A${ra} ${ra} 0 0 0 ${fmt(cx + ra * Math.cos(th))} ${fmt(cy - ra * Math.sin(th))}"/>`;
  // close-point rings: both copies of each too-close pair
  for (const c of close) {
    const { chain } = G.edgeChain(tile, c.which);
    for (const copy of [0, 1]) {
      const off = add2(org, copyOffset(tile, c.which, copy));
      for (const idx of [c.i, c.j]) { const [X, Y] = toS(F, add2(chain[idx], off)); s += `<circle class="ring" cx="${fmt(X)}" cy="${fmt(Y)}" r="10"/>`; }
    }
  }
  // interior points, on both copies of their edge
  for (const which of ['A', 'B']) {
    const pts = which === 'A' ? tile.edgeA : tile.edgeB;
    const { chain } = G.edgeChain(tile, which);
    for (let i = 0; i < pts.length; i++) {
      const isSel = sel && sel.which === which && sel.i === i;
      for (const copy of [0, 1]) {
        const [X, Y] = toS(F, add2(chain[i + 1], add2(org, copyOffset(tile, which, copy))));
        const cls = `pt ${which}${copy ? ' copy' : ''}${isSel ? ' is-sel' : ''}`;
        const data = `data-which="${which}" data-i="${i}" data-copy="${copy}"`;
        s += pts[i][2]
          ? `<rect class="${cls}" ${data} x="${fmt(X - 5)}" y="${fmt(Y - 5)}" width="10" height="10" transform="rotate(45 ${fmt(X)} ${fmt(Y)})"/>`
          : `<circle class="${cls}" ${data} cx="${fmt(X)}" cy="${fmt(Y)}" r="5.5"/>`;
      }
    }
  }
  // the four corners: one point of the lattice, drawn four times; drag one to resize
  for (let k = 0; k < 4; k++) {
    const [X, Y] = toS(F, add2(org, G.cornerAt(tile, k)));
    const cls = `corner${sel && sel.corner !== undefined ? ' is-sel' : ''}`;
    s += tile.cornerSmooth
      ? `<circle class="${cls}" data-corner="${k}" cx="${fmt(X)}" cy="${fmt(Y)}" r="7"/>`
      : `<rect class="${cls}" data-corner="${k}" x="${fmt(X - 6.5)}" y="${fmt(Y - 6.5)}" width="13" height="13"/>`;
  }
  edSvg.innerHTML = s;
  edSvg.classList.toggle('is-dragging', !!drag);
  $('edStatus').textContent = status;
}

/* ---------------- the 3 x 3 preview ---------------- */
function drawPatch() {
  const W = patchSvg.clientWidth || 500, H = patchSvg.clientHeight || 400;
  patchSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const tiles = G.patch(tile, 1);
  const { tA, tB } = G.latticeVectors(tile);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of tiles) for (const [x, y] of q.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const F = fitFrame(patchSvg, x0, y0, x1, y1, 14);
  let s = '';
  for (const q of tiles) s += `<path class="${!q.m && !q.k ? 'centre' : (q.m + q.k) % 2 === 0 ? 't0' : 't1'}" d="${pathD(F, q.pts, true)}"/>`;
  if (thin && thinUrl) {
    const fr = thin.frame;
    for (const q of tiles) {
      const off = [q.m * tA[0] + q.k * tB[0], q.m * tA[1] + q.k * tB[1]];
      const [X, Y] = toS(F, add2(off, [fr.gx, fr.gy + fr.ny * fr.h]));
      s += `<image class="thin" href="${thinUrl}" x="${fmt(X)}" y="${fmt(Y)}" width="${fmt(F.s * fr.nx * fr.h)}" height="${fmt(F.s * fr.ny * fr.h)}" preserveAspectRatio="none"/>`;
    }
  }
  // the cut lines, each drawn once: roller A's (four rows) and roller B's (four columns)
  for (let k = -1; k <= 2; k++) s += `<path class="la" d="${pathD(F, G.chainLine(tile, 'A', [-tA[0] + k * tB[0], -tA[1] + k * tB[1]], 3), false)}"/>`;
  for (let m = -1; m <= 2; m++) s += `<path class="lb" d="${pathD(F, G.chainLine(tile, 'B', [m * tA[0] - tB[0], m * tA[1] - tB[1]], 3), false)}"/>`;
  for (let k = -1; k <= 2; k++) for (let m = -1; m <= 2; m++) { const [X, Y] = toS(F, [m * tA[0] + k * tB[0], m * tA[1] + k * tB[1]]); s += `<circle class="knot" cx="${fmt(X)}" cy="${fmt(Y)}" r="2.2"/>`; }
  patchSvg.innerHTML = s;
}

/* ---------------- editing ---------------- */
function commit(r, what) {
  if (r.ok) { tile = r.tile; status = ''; stats.edits++; return true; }
  status = what ? `Blocked (${what}): ${r.reason}.` : `Blocked: ${r.reason}.`;
  stats.blocked++;
  return false;
}
function afterEdit({ heavy = true } = {}) {
  close = G.closePoints(tile, print.bladeWall);
  thin = null; thinUrl = '';
  drawEditor(); drawPatch(); writeSelNote(); writeTileCtrls();
  if (heavy) scheduleHeavy();
}
function selectedIsCorner() { return sel && sel.corner !== undefined; }

/* A double-click is detected HERE, on the second press: every press redraws
   the editor, so the element a native dblclick would name is gone by then. */
let lastPress = null;
const DOUBLE_MS = 450, DOUBLE_PX = 6;
edSvg.addEventListener('pointerdown', (ev) => {
  if (ev.button !== undefined && ev.button !== 0) return;
  const t = ev.target, d = t.dataset || {};
  const [X, Y] = eventScreen(edSvg, ev);
  const hit = d.corner !== undefined ? `c${d.corner}` : d.i !== undefined ? `${d.which}${d.i}` : null;
  const now = performance.now();
  const isDouble = hit && lastPress && lastPress.hit === hit && now - lastPress.t < DOUBLE_MS && Math.hypot(X - lastPress.X, Y - lastPress.Y) < DOUBLE_PX;
  lastPress = isDouble ? null : { hit, t: now, X, Y };
  if (isDouble) {
    if (d.i !== undefined) { sel = { which: d.which, i: +d.i }; deleteSelected(); }
    else { sel = { corner: +d.corner }; status = 'Corners cannot be deleted — they are the lattice.'; drawEditor(); writeSelNote(); }
    ev.preventDefault();
    return;
  }
  if (d.corner !== undefined) {
    sel = { corner: +d.corner };
    const k = +d.corner, o = (k + 2) % 4;
    drag = { kind: 'corner', k, o, opposite: add2(org, G.cornerAt(tile, o)), id: ev.pointerId, start: [X, Y], moved: false };
  } else if (d.i !== undefined) {
    sel = { which: d.which, i: +d.i };
    drag = { kind: 'pt', which: d.which, i: +d.i, copy: +d.copy, id: ev.pointerId, start: [X, Y], moved: false };
  } else if (d.copy !== undefined && t.classList.contains('edge-hit')) {
    // add a point ON the curve (the click projected onto it), then carry on dragging it
    const which = d.which, copy = +d.copy;
    const q = sub2(sub2(fromS(edFrame, X, Y), org), copyOffset(tile, which, copy));
    const pts = G.edgeDense(tile, which).pts;
    let best = Infinity, at = q;
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1], ab = sub2(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18;
      const u = Math.max(0, Math.min(1, ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1]) / L2));
      const p = [a[0] + u * ab[0], a[1] + u * ab[1]], e = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (e < best) { best = e; at = p; }
    }
    const r = G.insertPoint(tile, which, G.toLattice(tile, at[0], at[1]));
    if (commit(r, 'add')) {
      sel = { which, i: r.index };
      drag = { kind: 'pt', which, i: r.index, copy, id: ev.pointerId, start: [X, Y], moved: false };
    }
    afterEdit();
  } else {
    sel = null; status = '';
    drawEditor(); writeSelNote();
    return;
  }
  if (drag) { edSvg.setPointerCapture(ev.pointerId); edFrame = edFrame || editorFrame(); }
  drawEditor(); writeSelNote();
  ev.preventDefault();
});
edSvg.addEventListener('pointermove', (ev) => {
  if (!drag || ev.pointerId !== drag.id) return;
  const [X, Y] = eventScreen(edSvg, ev);
  if (!drag.moved && Math.hypot(X - drag.start[0], Y - drag.start[1]) < 3) return;   // a click, not yet a drag
  drag.moved = true;
  const w = fromS(edFrame, X, Y);
  if (drag.kind === 'pt') {
    const q = sub2(sub2(w, org), copyOffset(tile, drag.which, drag.copy));
    commit(G.movePoint(tile, drag.which, drag.i, G.toLattice(tile, q[0], q[1])), 'move');
  } else {
    if (commit(G.resizeFromCorner(tile, drag.k, w, drag.opposite), 'resize')) org = sub2(drag.opposite, G.cornerAt(tile, drag.o));
  }
  afterEdit({ heavy: false });
});
function endDrag(ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  drag = null; org = [0, 0]; edFrame = null;
  afterEdit();
}
edSvg.addEventListener('pointerup', endDrag);
edSvg.addEventListener('pointercancel', endDrag);
function deleteSelected() {
  if (!sel) return;
  if (selectedIsCorner()) { status = 'Corners cannot be deleted — they are the lattice.'; drawEditor(); return; }
  if (commit(G.deletePoint(tile, sel.which, sel.i), 'delete')) sel = null;
  afterEdit();
}
function toggleSelected() {
  if (!sel) { status = 'Select a point first (click it), then S toggles sharp ↔ smooth.'; drawEditor(); return; }
  commit(selectedIsCorner() ? G.toggleCorner(tile) : G.togglePoint(tile, sel.which, sel.i), 'sharp ↔ smooth');
  afterEdit();
}
window.addEventListener('keydown', (ev) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { if (sel) { ev.preventDefault(); deleteSelected(); } }
  else if (ev.key === 's' || ev.key === 'S') toggleSelected();
  else if (ev.key === 'Escape') { sel = null; status = ''; drawEditor(); writeSelNote(); }
});
$('deletePoint').addEventListener('click', deleteSelected);
$('toggleSharp').addEventListener('click', toggleSelected);
$('resetTile').addEventListener('click', () => { tile = G.defaultTile(); sel = null; status = ''; afterEdit(); });
$('straightTile').addEventListener('click', () => {
  const next = G.cloneTile(tile); next.edgeA = []; next.edgeB = [];
  commit({ ok: true, tile: next }); sel = null; afterEdit();
});
function writeSelNote() {
  const e = $('selNote');
  if (!sel) { e.textContent = 'No point selected. Click a point (or a corner) to select it.'; return; }
  if (selectedIsCorner()) { e.textContent = `The corners — ${tile.cornerSmooth ? 'smooth' : 'sharp'}. All four are one point of the lattice, so they share one sharpness and cannot be deleted.`; return; }
  const list = sel.which === 'A' ? tile.edgeA : tile.edgeB;
  const p = list[sel.i];
  if (!p) { sel = null; return writeSelNote(); }
  e.textContent = `Edge ${sel.which}, point ${sel.i + 1} of ${list.length} — ${p[2] ? 'sharp' : 'smooth'}. Its copy on the ${sel.which === 'A' ? 'top' : 'right'} edge is the same point.`;
}

/* ---------------- the panel's controls ---------------- */
const PRINT_LABELS = {
  dough: ['Dough thickness', 'mm'], bladeHeight: ['Blade height', 'mm'], bladeWall: ['Blade wall (at the edge)', 'mm'],
  draft: ['Blade draft, each side', '°'], cylWall: ['Cylinder wall', 'mm'], pegSize: ['Peg / tooth size', 'mm'],
  bore: ['Axle bore', 'mm'], minCookie: ['Thinnest cookie part', 'mm'],
};
const printHost = $('printCtrls');
for (const [key, [lo, hi, step]] of Object.entries(RL.PRINT_RANGES)) {
  const [label, unit] = PRINT_LABELS[key] || [key, ''];
  const div = document.createElement('div');
  div.className = 'tl-ctrl';
  div.innerHTML = `<label for="${key}"><span>${label}</span><output id="${key}-out"></output></label><input type="range" id="${key}" min="${lo}" max="${hi}" step="${step}">`;
  printHost.appendChild(div);
  div.querySelector('input').addEventListener('input', (e) => { print[key] = +e.target.value; writeOutputs(); close = G.closePoints(tile, print.bladeWall); thin = null; thinUrl = ''; drawEditor(); drawPatch(); scheduleHeavy(); });
}
const unitOf = (key) => (PRINT_LABELS[key] ? PRINT_LABELS[key][1] : '');
function writeOutputs() {
  for (const key of Object.keys(RL.PRINT_RANGES)) { $(key).value = print[key]; $(`${key}-out`).textContent = `${(+print[key]).toFixed(1)} ${unitOf(key)}`; }
  for (const key of Object.keys(RL.ROLLER_RANGES)) { $(key).value = rollers[key]; $(`${key}-out`).textContent = String(rollers[key]); }
  writeTileCtrls();
}
function writeTileCtrls() {
  $('pitchA').value = tile.pitchA; $('pitchA-out').textContent = `${tile.pitchA.toFixed(1)} mm`;
  $('pitchB').value = tile.pitchB; $('pitchB-out').textContent = `${tile.pitchB.toFixed(1)} mm`;
  $('angle').value = tile.angle; $('angle-out').textContent = `${tile.angle.toFixed(0)}°`;
}
for (const key of ['pitchA', 'pitchB', 'angle']) {
  $(key).addEventListener('input', (e) => { commit(G.setParam(tile, key, +e.target.value), key === 'angle' ? 'angle' : 'pitch'); afterEdit(); });
}
for (const key of Object.keys(RL.ROLLER_RANGES)) {
  $(key).addEventListener('input', (e) => { rollers[key] = +e.target.value; writeOutputs(); scheduleHeavy(); });
}

/* ---------------- the heavy part: guardrails and rollers ---------------- */
let heavyTimer = 0;
function scheduleHeavy(delay = 120) {
  clearTimeout(heavyTimer);
  $('building').hidden = false;
  heavyTimer = setTimeout(heavyNow, delay);
}
function heavyNow() {
  clearTimeout(heavyTimer);
  let t0 = performance.now();
  thin = G.thinAnalysis(tile, print.minCookie);
  stats.thinMs = performance.now() - t0;
  thinUrl = thinImage(thin);
  close = G.closePoints(tile, print.bladeWall);
  t0 = performance.now();
  built = RL.buildAll(tile, print, rollers);
  stats.buildMs = performance.now() - t0; stats.builds++;
  $('building').hidden = true;
  drawEditor(); drawPatch(); writePanel(); rebuild3D(); save();
}
function thinImage(th) {
  if (!th.necks.length && !th.spikes.length) return '';
  const { nx, ny } = th.frame;
  const c = document.createElement('canvas'); c.width = nx; c.height = ny;
  const ctx = c.getContext('2d'), img = ctx.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!th.flagged[j * nx + i]) continue;
    const o = 4 * ((ny - 1 - j) * nx + i);           // raster row 0 is the bottom (y up)
    img.data[o] = 229; img.data[o + 1] = 72; img.data[o + 2] = 77; img.data[o + 3] = 170;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

/* ---------------- the panel's read-outs ---------------- */
function clearSpan(R) { return R.L - 2 * (RL.RIM_WIDTH_MM + (R.Rtip - R.Rbody)); }
function fieldSize() {
  const { tA, tB } = G.latticeVectors(tile), KA = rollers.spanA, KB = rollers.spanB;
  const xs = [0, KA * tA[0], KB * tB[0], KA * tA[0] + KB * tB[0]], ys = [0, KA * tA[1], KB * tB[1], KA * tA[1] + KB * tB[1]];
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${(n / 1024).toFixed(0)} KB`);
const stlBytes = (m) => 84 + 50 * (m.indices.length / 3);
function writePanel() {
  if (!built) return;
  const L = built.layout, A = L.A, B = L.B;
  const [fw, fh] = fieldSize();
  const cookies = rollers.spanA * rollers.spanB;
  const lines = [
    `<b>Roller A</b> ⌀ <b>${A.dTip.toFixed(1)}</b> mm at the blades (body ${A.dBody.toFixed(1)}) · <b>${A.L.toFixed(0)}</b> mm long`,
    `  ${A.n} bars × ${A.pitchRoll.toFixed(1)} mm = ${A.C.toFixed(1)} mm round · cuts ${A.K} tiles across`,
    `<b>Roller B</b> ⌀ <b>${B.dTip.toFixed(1)}</b> mm at the blades (body ${B.dBody.toFixed(1)}) · <b>${B.L.toFixed(0)}</b> mm long`,
    `  ${B.n} bars × ${B.pitchRoll.toFixed(1)} mm = ${B.C.toFixed(1)} mm round · cuts ${B.K} tiles across`,
    `<b>${cookies}</b> cookies a sheet (${rollers.spanA} × ${rollers.spanB}), each ${G.cellArea(tile).toFixed(0)} mm² · field ${fw.toFixed(0)} × ${fh.toFixed(0)} mm`,
    `Track: row ${L.kStar} (the near border) · ${A.K + 1} pegs on one bar of A, ${B.n} teeth on B's collar`,
    `Triangles: A ${built.A.mesh.indices.length / 3} · B ${built.B.mesh.indices.length / 3} · handle ${built.H.mesh.indices.length / 3}`,
    `STL: A ${kb(stlBytes(built.A.mesh))} · B ${kb(stlBytes(built.B.mesh))} · handle ${kb(stlBytes(built.H.mesh))}`,
  ];
  $('derived').innerHTML = lines.join('\n');
  writeFlags();
  writeHowTo();
  const refused = L.flags.some((f) => f.stl);
  for (const b of document.querySelectorAll('[data-stl="A"],[data-stl="B"],#zipAll')) b.disabled = refused;
  $('exportMsg').textContent = refused ? L.flags.filter((f) => f.stl).map((f) => f.text).join(' ') : '';
  $('exportMsg').classList.toggle('is-bad', refused);
}
function flagList() {
  const out = [];
  if (built) for (const f of built.layout.flags) out.push({ level: f.stl ? 'bad' : 'warn', id: f.id, text: f.text });
  if (thin) {
    for (const n of thin.necks) out.push({ level: 'warn', id: 'neck', text: `A neck thinner than ${print.minCookie} mm (red): the cookie may snap there.` });
    for (const sp of thin.spikes) out.push({ level: 'warn', id: 'spike', text: `A spike thinner than ${print.minCookie} mm (red), ${sp.depth.toFixed(1)} mm long: it may break off, or stick in the cutter.` });
  }
  for (const c of close) out.push({ level: 'warn', id: 'close', text: `Two points on edge ${c.which} are ${c.d.toFixed(2)} mm apart (red rings) — finer than the ${print.bladeWall} mm blade can show.` });
  return out;
}
function writeFlags() {
  const list = flagList();
  const ul = $('flags');
  ul.innerHTML = list.length ? list.map((f) => `<li class="${f.level}" data-id="${f.id}">${f.text}</li>`).join('')
    : '<li class="ok">All clear: the tile tiles the plane, nothing is thinner than the thinnest cookie part, and both rollers print.</li>';
  const bad = list.filter((f) => f.level === 'bad').length, warn = list.length - bad;
  const cnt = $('flagCount');
  cnt.textContent = bad ? `${bad} refusing · ${warn} to check` : warn ? `${warn} to check` : 'clear';
  cnt.className = `tl-count${bad ? ' is-bad' : warn ? ' is-warn' : ''}`;
}
function writeHowTo() {
  const L = built.layout, A = L.A, B = L.B;
  const [fw, fh] = fieldSize();
  $('howto').innerHTML = `
    <ol>
      <li>Roll the dough <b>${print.dough} mm</b> thick on a floured board. The rollers run on the <b>rims at their ends</b>, on the board beside the dough — so keep the dough between them: under <b>${clearSpan(A).toFixed(0)} mm</b> across roller A's path and <b>${clearSpan(B).toFixed(0)} mm</b> across B's. The cut field is about ${fw.toFixed(0)} × ${fh.toFixed(0)} mm.</li>
      <li><b>Roller A</b> — the one with a row of pegs on one bar, and a groove on one end. Groove end on your <b>left</b>. Set it down at the near edge with the <b>pegged bar</b> about to touch the dough, roll it back to the edge, then <b>away from you</b> across the whole sheet in one pass. The pegs press a line of dimples into the near border: the <b>track</b>.</li>
      <li><b>Roller B</b> — the one with the toothed collar. Collar end <b>toward you</b>, collar on the track. Seat a tooth in the <b>first dimple</b> on the left, roll B back to the left edge, then <b>along the track</b> across the whole sheet in one pass. Each tooth drops into a dimple: that is what keeps B's lines on A's corners.</li>
      <li>Lift the border away. The ${rollers.spanA * rollers.spanB} cookies are already apart.</li>
    </ol>
    <p>Roll steadily and don't lift a roller mid-pass: they register by rolling without slipping. If a dimple is missing, seat the tooth in any other.</p>
    <p>The handle's pin fits either roller's bore (${print.bore} mm); hold the roller at both ends, or use two handles.</p>`;
}

/* ---------------- the rollers in 3D ---------------- */
const canvas = $('rollCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121215);
const camera = new THREE.PerspectiveCamera(28, 1, 1, 20000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;
controls.addEventListener('change', render3D);
scene.add(new THREE.HemisphereLight(0xffffff, 0x26262c, 1.5));
const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-1, 2, 1.4); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fd0d0, 0.6); rim.position.set(1.5, -0.6, -1.2); scene.add(rim);
const MAT = {
  body: new THREE.MeshStandardMaterial({ color: 0xd9d9d3, roughness: 0.66, metalness: 0, flatShading: true }),
  bladeA: new THREE.MeshStandardMaterial({ color: 0x6fb2b2, roughness: 0.55, metalness: 0, flatShading: true }),
  bladeB: new THREE.MeshStandardMaterial({ color: 0xd6a15c, roughness: 0.55, metalness: 0, flatShading: true }),
  peg: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0, flatShading: true }),
  handle: new THREE.MeshStandardMaterial({ color: 0xbfbfb8, roughness: 0.7, metalness: 0, flatShading: true }),
};
const groups = { A: new THREE.Group(), B: new THREE.Group(), H: new THREE.Group() };
for (const g of Object.values(groups)) scene.add(g);
let show = 'all', fitted = false;

function partMeshes(mesh, matFor) {
  const out = [];
  const byMat = new Map();
  for (const p of mesh.parts) { const m = matFor(p.name); if (!byMat.has(m)) byMat.set(m, []); byMat.get(m).push(p); }
  for (const [mat, parts] of byMat) {
    let nv = 0, nt = 0;
    for (const p of parts) { nv += p.v1 - p.v0; nt += p.t1 - p.t0; }
    const pos = new Float32Array(3 * nv), idx = new Uint32Array(3 * nt);
    let vo = 0, to = 0;
    for (const p of parts) {
      for (let i = 0; i < 3 * (p.v1 - p.v0); i++) pos[3 * vo + i] = mesh.positions[3 * p.v0 + i];
      for (let t = p.t0; t < p.t1; t++) for (let c = 0; c < 3; c++) idx[3 * to + 3 * (t - p.t0) + c] = mesh.indices[3 * t + c] - p.v0 + vo;
      vo += p.v1 - p.v0; to += p.t1 - p.t0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    out.push(new THREE.Mesh(geo, mat));
  }
  return out;
}
function setGroup(g, meshes, L, y, x) {
  for (const c of g.children.slice()) { g.remove(c); c.geometry.dispose(); }
  for (const m of meshes) { m.position.z = -L / 2; g.add(m); }
  g.rotation.set(0, Math.PI / 2, 0);            // the roller's axis (Z) along the world's x
  g.position.set(x, y, 0);
}
function rebuild3D() {
  if (!built) return;
  const A = built.layout.A, B = built.layout.B;
  // A above B, both lying along x; the handle beside them
  setGroup(groups.A, partMeshes(built.A.mesh, (n) => (n === 'body' ? MAT.body : /^bar/.test(n) ? MAT.bladeA : MAT.peg)), A.L, A.Rtip + 8, 0);
  setGroup(groups.B, partMeshes(built.B.mesh, (n) => (n === 'body' ? MAT.body : /^bar/.test(n) ? MAT.bladeB : MAT.peg)), B.L, -(B.Rtip + 8), 0);
  let hz = 0; for (let i = 2; i < built.H.mesh.positions.length; i += 3) hz = Math.max(hz, built.H.mesh.positions[i]);
  setGroup(groups.H, partMeshes(built.H.mesh, () => MAT.handle), hz, 0, Math.max(A.L, B.L) / 2 + 30 + hz / 2);
  applyShow(!fitted);
  fitted = true;
}
function applyShow(refit) {
  for (const [k, g] of Object.entries(groups)) g.visible = show === 'all' || show === k;
  document.querySelectorAll('#rollViews button').forEach((b) => b.classList.toggle('is-on', b.dataset.show === show));
  if (refit) fit3D();
  render3D();
}
/* frame the visible parts: the camera on a fixed 3/4 direction, pulled back
   until every corner of their box is inside the view with a margin */
function fit3D() {
  const box = new THREE.Box3();
  for (const g of Object.values(groups)) if (g.visible) box.expandByObject(g);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), r = box.getBoundingSphere(new THREE.Sphere()).radius;
  const dir = new THREE.Vector3(0.18, 0.62, 1).normalize();
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const fits = (dist) => {
    camera.position.copy(c).addScaledVector(dir, dist); camera.near = dist / 100; camera.far = dist * 10;
    camera.lookAt(c); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    return corners.every((p) => { const q = p.clone().project(camera); return Math.abs(q.x) < 0.92 && Math.abs(q.y) < 0.88 && q.z < 1; });
  };
  let lo = r * 0.3, hi = r * 20;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  fits(hi);
  controls.target.copy(c); controls.update();
}
function resize3D() {
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 300;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function render3D() { renderer.render(scene, camera); }
$('rollViews').addEventListener('click', (e) => { const v = e.target.dataset && e.target.dataset.show; if (!v) return; show = v; applyShow(true); });

/* ---------------- exports ---------------- */
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stem = () => `tile-${tile.pitchA.toFixed(0)}x${tile.pitchB.toFixed(0)}-${tile.angle.toFixed(0)}deg`;
function stlOf(which) {
  if (!built) heavyNow();
  if (which === 'H') return RL.exportStl(built.H.mesh, 'handle');
  return RL.exportStl(built[which].mesh, which, { layout: built.layout });
}
function tryStl(which) {
  try { return { ok: true, bytes: stlOf(which) }; }
  catch (e) { if (e instanceof RL.RefusedError) return { ok: false, reason: e.message }; throw e; }
}
for (const b of document.querySelectorAll('[data-stl]')) b.addEventListener('click', () => {
  const w = b.dataset.stl, r = tryStl(w);
  if (r.ok) download(`${stem()}-${w === 'H' ? 'handle' : `roller-${w}`}.stl`, r.bytes, 'model/stl');
  else { $('exportMsg').textContent = r.reason; $('exportMsg').classList.add('is-bad'); }
});
$('svgTile').addEventListener('click', () => download(`${stem()}-tile.svg`, G.tileSvg(tile).svg, 'image/svg+xml'));
$('svgPatch').addEventListener('click', () => download(`${stem()}-3x3.svg`, G.patchSvg(tile).svg, 'image/svg+xml'));
function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.JSZip) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('could not load the zip library'));
    document.head.appendChild(s);
  });
}
function readme() {
  const L = built.layout;
  const strip = (h) => h.replace(/<li>/g, '- ').replace(/<\/(li|p)>/g, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
  return [
    'Tessellation rollers — eva-maskalenko.com/tile', '',
    `Tile: ${tile.pitchA.toFixed(1)} x ${tile.pitchB.toFixed(1)} mm at ${tile.angle.toFixed(0)} degrees (${G.cellArea(tile).toFixed(0)} mm2 a cookie).`,
    `Roller A: diameter ${L.A.dTip.toFixed(1)} mm at the blades, ${L.A.L.toFixed(0)} mm long, ${L.A.n} bars. Roller B: ${L.B.dTip.toFixed(1)} mm, ${L.B.L.toFixed(0)} mm, ${L.B.n} bars.`,
    `Print: dough ${print.dough} mm, blades ${print.bladeHeight} mm tall and ${print.bladeWall} mm thin at the edge (draft ${print.draft} deg), axle bore ${print.bore} mm.`,
    'Print each roller standing on its end, no supports needed for the blades of a smooth tile; the handle grip-end down.', '',
    'HOW TO USE', strip($('howto').innerHTML), '',
    'FOOD SAFETY', [...document.querySelectorAll('details.tl-sec .tl-prose p')].slice(-2).map((p) => p.textContent.replace(/\s+/g, ' ').trim()).join('\n'), '',
    'design.json (in this zip) reopens the design on the page.', '',
  ].join('\n');
}
$('zipAll').addEventListener('click', async () => {
  const msg = $('exportMsg');
  const ra = tryStl('A'), rb = tryStl('B');
  if (!ra.ok || !rb.ok) { msg.textContent = (ra.reason || rb.reason); msg.classList.add('is-bad'); return; }
  try {
    msg.textContent = 'zipping…'; msg.classList.remove('is-bad');
    await loadScript(JSZIP_URL);
    const zip = new window.JSZip();
    zip.file('roller-A.stl', ra.bytes); zip.file('roller-B.stl', rb.bytes); zip.file('handle.stl', stlOf('H'));
    zip.file('README.txt', readme()); zip.file('design.json', JSON.stringify(designDoc(), null, 1));
    download(`${stem()}-rollers.zip`, await zip.generateAsync({ type: 'uint8array' }), 'application/zip');
    msg.textContent = '';
  } catch (e) { msg.textContent = `${e.message} — download the three STLs one by one instead.`; msg.classList.add('is-bad'); }
});

/* ---------------- designs ---------------- */
function designDoc() { return { format: G.DESIGN_FORMAT, version: G.DESIGN_VERSION, tile: G.cloneTile(tile), print: { ...print }, rollers: { ...rollers } }; }
function readNumbers(src, ranges, fallback) {
  const out = { ...fallback };
  if (!src || typeof src !== 'object') return { ok: true, out };
  for (const [k, [lo, hi]] of Object.entries(ranges)) {
    if (src[k] === undefined) continue;
    const v = src[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo - 1e-9 || v > hi + 1e-9) return { ok: false, reason: `${k} is ${JSON.stringify(v)}, outside ${lo}–${hi}` };
    out[k] = v;
  }
  return { ok: true, out };
}
function applyDesign(doc) {
  if (!doc || doc.format !== G.DESIGN_FORMAT) return { ok: false, reason: 'not a tessellation-roller design file' };
  if (doc.version > G.DESIGN_VERSION) return { ok: false, reason: `made by a newer version (${doc.version}) of this page` };
  const t = G.readTile(doc.tile);
  if (!t.ok) return t;
  const p = readNumbers(doc.print, RL.PRINT_RANGES, RL.PRINT_DEFAULTS); if (!p.ok) return p;
  const r = readNumbers(doc.rollers, RL.ROLLER_RANGES, RL.ROLLER_DEFAULTS); if (!r.ok) return r;
  tile = t.tile; print = p.out; rollers = r.out; sel = null; status = '';
  writeOutputs(); afterEdit();
  return { ok: true };
}
$('saveDesign').addEventListener('click', () => download(`${stem()}.json`, JSON.stringify(designDoc(), null, 1), 'application/json'));
$('openDesign').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  let r;
  try { r = applyDesign(JSON.parse(await f.text())); } catch (err) { r = { ok: false, reason: `unreadable (${err.message})` }; }
  $('designMsg').textContent = r.ok ? `Opened ${f.name}.` : `Not opened: ${r.reason}.`;
  $('designMsg').classList.toggle('is-bad', !r.ok);
  e.target.value = '';
});
let saveTimer = 0;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(designDoc())); } catch { /* private mode: nothing kept */ } }, 300); }
function restore() {
  try { const raw = localStorage.getItem(STORE); if (raw) return applyDesign(JSON.parse(raw)).ok; } catch { /* a bad entry is ignored */ }
  return false;
}

/* ---------------- layout ---------------- */
function layoutAll() { edFrame = drag ? edFrame : null; drawEditor(); drawPatch(); resize3D(); render3D(); }
new ResizeObserver(() => layoutAll()).observe(document.querySelector('.tl-main'));

/* ---------------- test chrome (read by tools/verify-tile-page.mjs and tools/shot-tile.mjs) ---------------- */
window.__tile = {
  tile: () => G.cloneTile(tile),
  print: () => ({ ...print }),
  rollers: () => ({ ...rollers }),
  setDesign: (d) => applyDesign({ format: G.DESIGN_FORMAT, version: G.DESIGN_VERSION, tile: d.tile || tile, print: d.print || print, rollers: d.rollers || rollers }),
  flush: () => { heavyNow(); return true; },
  status: () => status,
  selection: () => (sel ? { ...sel } : null),
  blocked: () => stats.blocked,
  stats: () => ({ ...stats }),
  // the screen (client) position of interior point i of edge `which` on copy `copy`
  pointScreen: (which, i, copy = 0) => clientOf(add2(G.edgeChain(tile, which).chain[i + 1], add2(org, copyOffset(tile, which, copy)))),
  cornerScreen: (k) => clientOf(add2(org, G.cornerAt(tile, k))),
  // a point ON edge `which` copy `copy`, a fraction f of the way along its dense polyline
  edgeScreen: (which, copy, f) => { const p = G.edgeDense(tile, which).pts; return clientOf(add2(p[Math.round(f * (p.length - 1))], add2(org, copyOffset(tile, which, copy)))); },
  worldOf: (cx, cy) => { const r = edSvg.getBoundingClientRect(); return sub2(fromS(edFrame || editorFrame(), cx - r.left, cy - r.top), org); },
  flags: () => flagList().map((f) => ({ level: f.level, id: f.id })),
  layout: () => (built ? { dA: built.layout.A.dTip, dB: built.layout.B.dTip, LA: built.layout.A.L, LB: built.layout.B.L, kStar: built.layout.kStar, flags: built.layout.flags.map((f) => f.id), trisA: built.A.mesh.indices.length / 3, trisB: built.B.mesh.indices.length / 3, trisH: built.H.mesh.indices.length / 3 } : null),
  patchCounts: () => ({ tiles: patchSvg.querySelectorAll('path.t0,path.t1,path.centre').length, aLines: patchSvg.querySelectorAll('path.la').length, bLines: patchSvg.querySelectorAll('path.lb').length, thin: patchSvg.querySelectorAll('image.thin').length }),
  editorCounts: () => ({ points: edSvg.querySelectorAll('.pt').length, corners: edSvg.querySelectorAll('.corner').length, rings: edSvg.querySelectorAll('.ring').length, thin: edSvg.querySelectorAll('image.thin').length }),
  tryStl: (w) => { const r = tryStl(w); return r.ok ? { ok: true, bytes: r.bytes.length } : { ok: false, reason: r.reason }; },
  stlBytes: (w) => Array.from(stlOf(w)),
  tileSvg: () => G.tileSvg(tile).svg,
  patchSvg: () => G.patchSvg(tile).svg,
  show: (v) => { show = v; applyShow(true); },
  lookAt3D: (target, dir, dist) => {
    const c = new THREE.Vector3(...target), d = new THREE.Vector3(...dir).normalize();
    camera.position.copy(c).addScaledVector(d, dist); camera.near = dist / 100; camera.far = dist * 10; camera.updateProjectionMatrix();
    controls.target.copy(c); controls.update(); render3D();
  },
  // a peg / tooth of the built roller, in the 3D view's world: where it is and its outward direction
  anchorOf: (which, kind, m) => {
    const spec = built[which].spec, f = (kind === 'peg' ? spec.pegs : spec.teeth).find((q) => q.m === m);
    if (!f) return null;
    const g = groups[which], L = built.layout[which].L, R = built.layout[which].Rtip;
    g.updateMatrixWorld(true);
    const at = g.localToWorld(new THREE.Vector3(R * Math.cos(f.phi), R * Math.sin(f.phi), f.Z - L / 2));
    const out = new THREE.Vector3(Math.cos(f.phi), Math.sin(f.phi), 0).applyQuaternion(g.quaternion);
    return { at: at.toArray(), out: out.toArray() };
  },
  camera3D: () => ({ target: controls.target.toArray(), position: camera.position.toArray() }),
  render3D,
};
function clientOf(w) { const r = edSvg.getBoundingClientRect(); const [X, Y] = toS(edFrame || editorFrame(), w); return [r.left + X, r.top + Y]; }

/* ---------------- boot ---------------- */
restore();
writeOutputs();
afterEdit({ heavy: false });
resize3D();
heavyNow();
