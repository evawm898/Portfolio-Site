#!/usr/bin/env node
/* bug-wing-library-fit.mjs [--sheet <file> ...] [--out <dir>] — the DEV-TIME batch
   fit behind the wing-shape library (bug-project-design-doc.md §12). Not page code.

   Reads Eva's reference sheets (grids of top-down butterflies; stock art, one
   watermarked) from tools/bug-wing-sources/ — GITIGNORED, never committed — and:
     1. SPLITS each sheet into individual butterflies: luminance under SPLIT_LUM,
        4-connected components after a small closing (so an antenna's thin gap to
        the head does not split a butterfly), components under MIN_AREA_FRAC of
        the sheet dropped (watermark strokes, specks). Each crop keeps only its
        own component (closed by KEEP_GROW px) on white, so a neighbour's wingtip
        or a watermark line through the box is not fitted.
     2. FITS each crop with the shipped image -> bug fitter (bug-image.js
        imageToBug, on the default bug at the default 72 mm wingspan and 0.6 mm
        tolerance). The record kept is the WING OUTLINES only: each pair's
        control points in the page's own (u, w) format, its stretch, its length
        relative to the forewing, and the tagged TAIL group when one was found.
     3. DEDUPES near-identical shapes (see `shapeDistance`).
     4. Writes <out>/candidates.json and a numbered contact sheet
        <out>/contact.html (+ .png): source crop | fitted outline over the crop |
        the fitted bug's own SVG export.

   Nothing here is shipped: bug-wing-library.js is written from candidates.json
   after Eva's keep/drop list (`--emit <keep-list>`). */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as G from '../bug-geometry.js';
import { imageToBug } from '../bug-image.js';
import { encodePNG } from './verify-bug-image-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tools/bug-wing-sources');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const KEPT = args.includes('--kept');   // only Eva's kept 17 (step 2): the exploded sheet
/* --add: a NEW batch for the shipped library (§13.5). Every sheet is fitted, deduped
   against the CURRENT library (bug-wing-library.js) as well as within the batch, and
   numbered on from the library's last id, on the step-2 exploded sheet. */
const ADD = args.includes('--add');
const OUT = path.resolve(opt('--out', path.join(SRC, KEPT ? 'out-kept' : ADD ? 'out-add' : 'out')));
fs.mkdirSync(OUT, { recursive: true });

export const SPLIT_LUM = 215;        // darker than this is "butterfly" for the split only (the fit does its own Otsu)
export const CLOSE_PX = 3;           // closing radius before labelling
export const MIN_AREA_FRAC = 0.004;  // a butterfly is at least 0.4% of the sheet
export const KEEP_GROW = 6;          // the crop keeps its component grown by this
export const PAD_FRAC = 0.3;     // white margin round each crop, of its larger side (the fitter refuses a crop more than 55% subject)
export const DEDUPE_FRAC = 0.03;
/* Eva's keep/drop ruling on the step-1 sheet: #6, #15 and #19 struck (under the floor),
   the near-duplicate (sheet-1#17, of #7) out; the other 17 kept. Keyed by the crop's
   name, so a re-run of the split reproduces the same set. */
export const KEEP = ['sheet-1#1', 'sheet-1#2', 'sheet-1#3', 'sheet-1#4', 'sheet-1#5', 'sheet-1#7', 'sheet-1#8', 'sheet-1#9', 'sheet-1#10', 'sheet-1#11', 'sheet-1#12', 'sheet-1#13', 'sheet-1#14', 'sheet-1#16', 'sheet-1#18', 'sheet-1#19', 'sheet-1#21'];     // near-identical: shape distance under 3% of the wingspan

export function decode(file) {
  const id = execFileSync('identify', ['-format', '%w %h', file]).toString().trim().split(' ').map(Number);
  const data = execFileSync('convert', [file, '-alpha', 'off', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 28 });
  return { width: id[0], height: id[1], data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}
const lumAt = (img, k) => 0.299 * img.data[4 * k] + 0.587 * img.data[4 * k + 1] + 0.114 * img.data[4 * k + 2];

function dilate(M, W, H, r) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y * W + x])
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) out[Y * W + X] = 1;
    }
  return out;
}
function erode(M, W, H, r) {
  const inv = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) inv[k] = M[k] ? 0 : 1;
  const d = dilate(inv, W, H, r); for (let k = 0; k < W * H; k++) d[k] = d[k] ? 0 : 1; return d;
}
function label(M, W, H) {
  const lab = new Int32Array(W * H).fill(-1), comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!M[s] || lab[s] >= 0) continue;
    const id = comps.length, st = [s]; lab[s] = id;
    let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    while (st.length) {
      const k = st.pop(), x = k % W, y = (k / W) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (M[q] && lab[q] < 0) { lab[q] = id; st.push(q); } }
    }
    comps.push({ id, n, x0, y0, x1, y1 });
  }
  return { lab, comps };
}

function fillHoles(M, W, H) {
  const out = new Uint8Array(W * H).fill(1), st = [];
  const push = (k) => { if (!M[k] && out[k]) { out[k] = 0; st.push(k); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (st.length) { const k = st.pop(), x = k % W, y = (k / W) | 0; if (x > 0) push(k - 1); if (x < W - 1) push(k + 1); if (y > 0) push(k - W); if (y < H - 1) push(k + W); }
  return out;
}
export function splitSheet(img) {
  const W = img.width, H = img.height;
  const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = lumAt(img, k) < SPLIT_LUM ? 1 : 0;
  const C = erode(dilate(M, W, H, CLOSE_PX), W, H, CLOSE_PX);
  for (let k = 0; k < W * H; k++) C[k] = C[k] || M[k];
  const { lab, comps } = label(C, W, H);
  const keep = comps.filter((c) => c.n >= MIN_AREA_FRAC * W * H);
  // reading order: rows (by centre y, grouped within a third of the median height), then x
  const mh = keep.map((c) => c.y1 - c.y0).sort((a, b) => a - b)[keep.length >> 1] || 1;
  keep.sort((a, b) => { const ay = (a.y0 + a.y1) / 2, by = (b.y0 + b.y1) / 2; return Math.abs(ay - by) > mh / 3 ? ay - by : (a.x0 + a.x1) - (b.x0 + b.x1); });
  return keep.map((c) => {
    // padded generously (PAD_FRAC of the larger side) and never clipped at the sheet's
    // edge: the crop is drawn on white, so out-of-sheet pixels are simply white
    const pad = Math.round(PAD_FRAC * Math.max(c.x1 - c.x0, c.y1 - c.y0));
    const x0 = c.x0 - pad, y0 = c.y0 - pad, x1 = c.x1 + pad, y1 = c.y1 + pad;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const inSheet = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H;
    const own = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) own[y * w + x] = inSheet(x + x0, y + y0) && lab[(y + y0) * W + x + x0] === c.id ? 1 : 0;
    const grown = dilate(own, w, h, KEEP_GROW);
    // the SILHOUETTE: the component with its holes filled (a glasswing's clear panes,
    // a white band are pattern, not holes), black on white
    const fill = fillHoles(own, w, h);
    const data = new Uint8ClampedArray(w * h * 4), sil = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = 4 * ((y + y0) * W + x + x0), d = 4 * (y * w + x);
      if (grown[y * w + x] && inSheet(x + x0, y + y0)) { data[d] = img.data[s]; data[d + 1] = img.data[s + 1]; data[d + 2] = img.data[s + 2]; } else data[d] = data[d + 1] = data[d + 2] = 255;
      sil[d] = sil[d + 1] = sil[d + 2] = fill[y * w + x] ? 20 : 245;
      data[d + 3] = sil[d + 3] = 255;
    }
    return { box: [x0, y0, w, h], img: { width: w, height: h, data }, sil: { width: w, height: h, data: sil } };
  });
}

/* The library record: wing outlines only, in the page's own format. */
export function recordOf(params) {
  const wp = G.resolveWingPairs(params);
  const fw = params.wings.first, hw = params.wings.last;
  return {
    pairs: params.wingPairs,
    fore: { points: fw.points.map((q) => q.slice()), stretch: fw.stretch },
    hind: { points: hw.points.map((q) => q.slice()), stretch: hw.stretch, lengthRatio: +(hw.length / fw.length).toFixed(4) },
    tail: params.wings.tail && params.wings.tail.on ? JSON.parse(JSON.stringify(params.wings.tail)) : null,
    _resolved: wp.length,
  };
}

/* SHAPE DISTANCE, the dedupe measure: each record applied to ONE reference bug
   (the default bug, its forewing at its default 41 mm, each pair at the
   sweep 0, as the page applies a library shape — flat), the
   top-down silhouette of its right wings sampled densely, and the symmetric
   Hausdorff distance between two silhouettes' boundaries, as a fraction of the
   default bug's wingspan. Taken on the APPLIED shapes rather than on control
   points, because two fits of one shape need not share a single point. */
export function applyRecord(base, rec) {
  const p = JSON.parse(JSON.stringify(base));
  p.wingPairs = 2;
  const L = p.wings.first.length;
  Object.assign(p.wings.first, { points: rec.fore.points.map((q) => q.slice()), stretch: rec.fore.stretch, sweep: 0 });
  Object.assign(p.wings.last, { points: rec.hind.points.map((q) => q.slice()), stretch: rec.hind.stretch, sweep: 0, length: +(L * rec.hind.lengthRatio).toFixed(3) });
  p.wings.unlinked = {};
  p.wings.tail = rec.tail ? JSON.parse(JSON.stringify(rec.tail)) : (p.wings.tail ? { ...p.wings.tail, on: false } : null);
  return p;
}
function rightWingBoundary(params) {
  const m = G.buildBug(params);
  const pts = [];
  for (const part of m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R'))
    for (const L of G.contourLoops(m, part)) for (let k = 0; k < L.length; k++) {
      const a = L[k], b = L[(k + 1) % L.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3));
      for (let t = 0; t < n; t++) pts.push([a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n]);
    }
  return pts;
}
function hausdorff(A, B) {
  const one = (P, Q) => { let w = 0; for (const p of P) { let d = Infinity; for (const q of Q) { const e = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (e < d) d = e; } if (d > w) w = d; } return Math.sqrt(w); };
  return Math.max(one(A, B), one(B, A));
}

/* ------------------------------------------------------------------ */
/* the gate's own smoothness measure (J), read out of tools/verify-bug.mjs so
   this sheet says what the gate would — never a second copy of the rule */
let JAG = null;
const JAGGED = () => { if (!JAG) { const src = fs.readFileSync(path.join(ROOT, 'tools/verify-bug.mjs'), 'utf8'); const a = src.indexOf('const JAG_DEADBAND'), b = src.indexOf('function smoothChecks'); JAG = new Function(src.slice(a, b).replace('export function', 'function') + '; return jaggedness;')(); } return JAG; };
/* One crop through the fitter: the silhouette first (the fitter's own Otsu
   cannot see a white band or a glass pane as wing), the source pixels if the
   silhouette is refused; a fit under the print floor at 0.6 mm is re-fitted at
   the nearest tolerance that clears it, and the sheet says so — never widened
   by hand. */
export function fitCrop(c, base, extra = {}) {
  let r = imageToBug(c.sil, base, { ...extra }), input = 'silhouette';
  if (!r.ok) { const r2 = imageToBug(c.img, base, { ...extra }); if (r2.ok) { r = r2; input = 'source pixels'; } }
  let tolUsed = 0.6;
  if ((KEPT || ADD) && r.ok && G.buildBug(r.params).floorViolations.length) {
    for (const tol of [0.45, 0.8, 0.35, 1.0, 0.25, 1.3]) {
      const r2 = imageToBug(input === 'silhouette' ? c.sil : c.img, base, { ...extra, toleranceMm: tol });
      if (r2.ok && !G.buildBug(r2.params).floorViolations.length) { r = r2; tolUsed = tol; break; }
    }
  }
  if (!r.ok) return { ok: false, reason: r.reason, input };
  const m = G.buildBug(r.params);
  const rw = m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R');
  return {
    ok: true, input, tolUsed,
    record: recordOf(r.params), notes: r.notes, transform: r.transform.matrix,
    fit: r.pairs.map((q) => ({ points: q.points, maxDevMm: +q.maxDevMm.toFixed(3), tail: q.tail ? (q.tail.inline ? 'inline' : q.tail.points) : null })),
    mode: r.pairs.length, split: r.split, splitMode: r.mode,
    svg: G.exportSvg(m).svg,
    overlay: m.parts.filter((q) => /^wing\d$/.test(q.kind)).flatMap((part) => G.contourLoops(m, part).map((L) => L.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]))),
    floor: (m.floorViolations || []).map((v) => `pair ${v.pair + 1}${v.kind ? ' ' + v.kind : ''}`),
    // each wing ALONE: its built planform (mm), root tab excluded
    wings: rw.map((q) => q.meta.planform.slice(1, -1).map(([u, w]) => [+u.toFixed(3), +w.toFixed(3)])),
    bridged: r.pairs.map((q) => (q.bridged || []).map((b) => `${b.kind} ${b.lengthMm} mm`).join(', ') || 'none'),
    modelNotes: m.notes,
    smooth: rw.map((q) => { const j = JAGGED()(q.meta.drawnMm, r.params.minDiameter); return j.jagged ? `JAGGED (${j.worst.kind})` : 'smooth'; }),
  };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
async function main() {
  const sheets = args.includes('--sheet') ? args.flatMap((a, i) => (args[i - 1] === '--sheet' ? [a] : [])) : fs.readdirSync(SRC).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).sort().map((f) => path.join(SRC, f));
  const base = G.defaultParams();
  const cands = [];
  for (const file of sheets) {
    const img = decode(file);
    const crops = splitSheet(img);
    console.log(`${path.basename(file)}: ${img.width}x${img.height}, ${crops.length} butterflies`);
    crops.forEach((c, j) => {
      const name = `${path.basename(file).replace(/\.\w+$/, '')}#${j + 1}`;
      if (KEPT && !KEEP.includes(name)) return;
      if (ADD && ADD_DROPPED.includes(name)) { console.log(`  ${name}: dropped (Eva)`); return; }
      const t0 = Date.now();
      const entry = { name, sheet: path.basename(file), index: j + 1, box: c.box, cropPng: encodePNG(c.img).toString('base64'), ...fitCrop(c, base) };
      entry.ms = Date.now() - t0;
      // the same crop through the fitter as Eva last saw it: the deepest
      // concavity is the notch, split square to the body (§13.6's split off)
      if (ADD) entry.before = fitCrop(c, base, { notchLobes: false });
      if (!entry.ok) { console.log(`  ${name}: REFUSED — ${entry.reason}`); cands.push(entry); return; }
      console.log(`  ${name}: ${entry.mode} pair(s), points ${entry.fit.map((q) => q.points).join('/')}, tail ${entry.record.tail ? 'yes' : 'no'}${entry.floor.length ? ', FLOOR ' + entry.floor.join(', ') : ''} (${entry.ms} ms)`);
      cands.push(entry);
    });
  }
  // dedupe: applied to the default bug, Hausdorff over the right-wing boundary, / wingspan
  const ok = cands.filter((c) => c.ok);
  if (KEPT) return keptSheet(cands, base);
  if (ADD) return addSheet(cands, base);
  const span = 2 * Math.max(...rightWingBoundary(base).map((q) => q[0]));
  const bounds = ok.map((c) => rightWingBoundary(applyRecord(base, c.record)));
  const D = ok.map(() => ok.map(() => 0));
  for (let a = 0; a < ok.length; a++) for (let b = a + 1; b < ok.length; b++) D[a][b] = D[b][a] = hausdorff(bounds[a], bounds[b]) / span;
  const dupOf = new Map();
  for (let b = 0; b < ok.length; b++) for (let a = 0; a < b; a++) if (!dupOf.has(ok[a].name) && D[a][b] < DEDUPE_FRAC) { dupOf.set(ok[b].name, ok[a].name); break; }
  ok.forEach((c, a) => { c.dupOf = dupOf.get(c.name) || null; let n = null, nd = Infinity; ok.forEach((d, b) => { if (b !== a && D[a][b] < nd) { nd = D[a][b]; n = d.name; } }); c.nearest = { name: n, frac: +nd.toFixed(4), mm: +(nd * span).toFixed(2) }; });
  // number the survivors
  let num = 0; for (const c of cands) if (c.ok && !c.dupOf) c.num = ++num;
  const summary = { sheets: sheets.map((f) => path.basename(f)), butterflies: cands.length, fitted: ok.length, refused: cands.length - ok.length, duplicates: dupOf.size, survivors: num, dedupe: `Hausdorff distance between the applied shapes' right-wing silhouettes on the default bug (wingspan ${span.toFixed(1)} mm), duplicate under ${DEDUPE_FRAC * 100}% of the wingspan (${(DEDUPE_FRAC * span).toFixed(2)} mm)` };
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify({ summary, candidates: cands.map(({ cropPng, svg, overlay, ...rest }) => rest) }, null, 1));
  console.log(JSON.stringify(summary, null, 1));

  // contact sheet
  const cell = (c) => {
    const crop = `<img src="data:image/png;base64,${c.cropPng}">`;
    if (!c.ok) return `<div class="row ref"><div class="n">—</div><div class="c">${crop}</div><div class="c msg">REFUSED by the fitter:<br>${esc(c.reason)}</div><div class="c"></div><div class="meta">${esc(c.name)}</div></div>`;
    const [w, h] = [c.box[2], c.box[3]], M = c.transform;
    // one frame for both picture columns: the fitted wings' own bounds (world mm, y up), padded
    const all = c.overlay.flat(), xs = all.map((q) => q[0]), ys = all.map((q) => q[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys), mg = 0.12 * Math.max(bx1 - bx0, by1 - by0);
    const vb = [bx0 - mg, -by1 - mg, bx1 - bx0 + 2 * mg, by1 - by0 + 2 * mg];
    const pic = (op) => `<g transform="scale(1,-1)"><image href="data:image/png;base64,${c.cropPng}" width="${w}" height="${h}" transform="matrix(${M.join(',')})" opacity="${op}"/></g>`;
    const poly = c.overlay.map((L) => `<polygon points="${L.map(([x, y]) => `${x},${-y}`).join(' ')}"/>`).join('');
    const src = `<svg viewBox="${vb.join(' ')}">${pic(1)}</svg>`;
    const over = `<svg viewBox="${vb.join(' ')}">${pic(0.5)}<g fill="rgba(214,111,154,0.10)" stroke="#d6006f" stroke-width="${(vb[2] / 300).toFixed(3)}">${poly}</g></svg>`;
    const svg = c.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
    const tag = c.dupOf ? `<div class="n dup">dup<br><small>of #${cands.find((d) => d.name === c.dupOf).num}</small></div>` : `<div class="n">#${c.num}</div>`;
    const meta = `${esc(c.name)} · fitted from the ${c.input} · ${c.mode} pair${c.mode > 1 ? 's' : ''} found · points ${c.fit.map((q) => q.points).join(' / ')} · max dev ${c.fit.map((q) => q.maxDevMm).join(' / ')} mm · tail ${c.record.tail ? c.record.tail.points.length + ' pts' : 'none'} · nearest ${esc(c.nearest.name)} at ${c.nearest.mm} mm (${(c.nearest.frac * 100).toFixed(1)}%)${c.floor.length ? ' · <b>under the floor: ' + c.floor.join(', ') + '</b>' : ''}${c.notes.length ? '<br><span class="note">' + c.notes.map(esc).join('<br>') + '</span>' : ''}`;
    return `<div class="row${c.dupOf ? ' isdup' : ''}">${tag}<div class="c">${src}</div><div class="c">${over}</div><div class="c svg">${svg}</div><div class="meta">${meta}</div></div>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><title>wing library candidates</title><style>
body{font:12px/1.35 ui-monospace,monospace;background:#f4f3ee;color:#111;margin:16px;width:1180px}
h1{font-size:16px;margin:0 0 4px} .sum{margin:0 0 12px;max-width:1100px}
.row{display:grid;grid-template-columns:58px 250px 250px 250px 1fr;gap:8px;align-items:center;border-top:1px solid #ccc;padding:6px 0}
.c{height:190px;display:flex;align-items:center;justify-content:center;background:#fff}
.c img{max-width:100%;max-height:100%} .c svg{width:100%;height:100%}
.n{font-size:22px;font-weight:bold;text-align:center} .dup{color:#999;font-size:14px} .isdup{opacity:.55}
.meta{font-size:11px} .note{color:#7a4b00} .msg{color:#a00;padding:8px;font-size:11px}
.hdr{font-weight:bold;border:0}
</style><h1>Wing-shape library — batch fit candidates (step 1, for Eva's keep / drop list)</h1>
<p class="sum">${summary.sheets.join(', ')}: <b>${summary.butterflies}</b> butterflies split out · <b>${summary.fitted}</b> fitted · ${summary.refused} refused · <b>${summary.duplicates}</b> near-duplicates · <b>${summary.survivors} numbered survivors</b>.<br>Near-identical = ${esc(summary.dedupe)}.<br>Columns: source crop (its own component only, on white) | the fitted wing outlines (pink) over the crop, placed by the fit's own transform | the fitted bug's own SVG export (body from the fit, legs and antennae from the default bug). Fit: the shipped image → bug fitter, default bug, 72 mm wingspan, 0.6 mm tolerance.</p>
<div class="row hdr"><div>#</div><div>source</div><div>fit over source</div><div>fitted SVG</div><div>notes</div></div>
${cands.map(cell).join('\n')}`;
  fs.writeFileSync(path.join(OUT, 'contact.html'), html);
  try {
    const { chromium } = await import('playwright-core');
    const exe = fs.readdirSync('/opt/pw-browsers').find((d) => /^chromium-\d+$/.test(d));
    const b = await chromium.launch({ executablePath: path.join('/opt/pw-browsers', exe, 'chrome-linux/chrome') });
    const pg = await b.newPage({ viewport: { width: 1212, height: 800 } });
    await pg.goto('file://' + path.join(OUT, 'contact.html'));
    await pg.screenshot({ path: path.join(OUT, 'contact.png'), fullPage: true });
    await b.close();
    console.log('wrote', path.join(OUT, 'contact.png'));
  } catch (e) { console.log('(no screenshot: ' + e.message + ')'); }
}

/* STEP 2 — the kept 17, re-fitted (complete wings, the blended root): source |
   EXPLODED (each wing alone, side by side, its own closed outline) | assembled. */
async function keptSheet(cands, base, page = null) {
  const was = (name) => { const n = +name.split('#')[1]; return n < 17 ? n : n - 1; };   // the step-1 sheet's numbers (sheet-1#17 was the duplicate)
  if (!page) { let num = 0; for (const c of cands) if (c.ok) c.num = ++num; }
  const exploded = (c) => {
    const W = c.wings, gap = 4, boxes = W.map((P) => { const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; });
    let x = 0; const placed = W.map((P, k) => { const b = boxes[k], dx = x - b[0]; x += b[1] - b[0] + gap; return P.map(([u, w]) => [u + dx, w]); });
    const y0 = Math.min(...boxes.map((b) => b[2])), y1 = Math.max(...boxes.map((b) => b[3])), mg = 2;
    const vb = [-mg, -y1 - mg, x - gap + 2 * mg, y1 - y0 + 2 * mg];
    const pol = placed.map((P) => `<polygon points="${P.map(([u, w]) => `${u},${-w}`).join(' ')}" fill="#e9e7df" stroke="#0A0A0C" stroke-width="${(vb[2] / 400).toFixed(3)}" stroke-linejoin="round"/>`).join('');
    return `<svg viewBox="${vb.join(' ')}">${pol}</svg>`;
  };
  const row = (c) => {
    const src = `<img src="data:image/png;base64,${c.cropPng}">`;
    if (!c.ok) return `<div class="row"><div class="n">—</div><div class="c">${src}</div><div class="c msg">REFUSED: ${esc(c.reason)}</div><div class="c"></div><div class="meta">${esc(c.name)}</div></div>`;
    if (page && c.dupOf) return `<div class="row isdup"><div class="n dup">dup<br><small>of ${esc(c.dupOf)}</small></div><div class="c">${src}</div><div class="c wide">${exploded(c)}</div><div class="c svg">${c.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '')}</div><div class="meta">${esc(c.name)} · DUPLICATE of ${esc(c.dupOf)} — shape distance ${c.dupMm} mm (${c.dupPct}% of the wingspan, under the ${DEDUPE_FRAC * 100}% bar)</div></div>`;
    const svg = c.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
    const meta = `${esc(c.name)}${page ? ` · nearest library shape #${c.nearLib.id} at ${c.nearLib.mm} mm (${c.nearLib.pct}%)${c.nearNew ? ` · nearest in this batch ${esc(c.nearNew.name)} at ${c.nearNew.mm} mm (${c.nearNew.pct}%)` : ''}` : ` (step-1 #${was(c.name)})`} · points ${c.fit.map((q) => q.points).join(' / ')} · max dev ${c.fit.map((q) => q.maxDevMm).join(' / ')} mm · tail ${c.record.tail ? c.record.tail.points.length + ' pts (a TAIL group)' : 'none'} · J: ${c.smooth.join(' / ')}${c.tolUsed !== 0.6 ? ` · <b>fitted at ${c.tolUsed} mm</b> (at 0.6 mm an outline fell under the floor)` : ''}<br>never seen in the picture, completed as a smooth curve — fore: ${esc(c.bridged[0])}; hind: ${esc(c.bridged[1] || '—')}${c.floor.length ? '<br><b>under the floor: ' + c.floor.join(', ') + '</b>' : ''}${[...c.notes, ...c.modelNotes].length ? '<br><span class="note">' + [...c.notes, ...c.modelNotes].map(esc).join('<br>') + '</span>' : ''}`;
    return `<div class="row${c.floor.length ? ' floor' : ''}"><div class="n">#${c.num}${c.floor.length ? '<br><small class="fl">FLOOR</small>' : ''}</div><div class="c">${src}</div><div class="c wide">${exploded(c)}</div><div class="c svg">${svg}</div><div class="meta">${meta}</div></div>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><title>wing library — kept 17, exploded</title><style>
body{font:12px/1.35 ui-monospace,monospace;background:#f4f3ee;color:#111;margin:16px;width:1180px}
h1{font-size:16px;margin:0 0 4px} .sum{margin:0 0 12px;max-width:1140px}
.row{display:grid;grid-template-columns:40px 140px 500px 220px 1fr;gap:8px;align-items:center;border-top:1px solid #ccc;padding:6px 0}
.c{height:240px;display:flex;align-items:center;justify-content:center;background:#fff}
.c img{max-width:100%;max-height:100%} .c svg{width:100%;height:100%}
.n{font-size:20px;font-weight:bold;text-align:center} .meta{font-size:10.5px} .note{color:#7a4b00} .msg{color:#a00}
.hdr{font-weight:bold;border:0} .isdup{opacity:.5} .dup{color:#888;font-size:13px} .fl{color:#b00;font-size:11px} .floor{background:#fbe9e9}
</style>${page ? page.head : `<h1>Wing-shape library — the kept 17, re-fitted (step 2, for Eva's ruling on the EXPLODED column)</h1>
<p class="sum">Each wing is fitted as a COMPLETE shape: what the picture never showed (the split line between fore- and hindwing, the band the hindwing is tucked under, the run along the body) is replaced by a smooth curve tangent to the margin that was seen. Every wing then leaves the body through the BLENDED ROOT (default width 1.6 mm, fillet 0.9 mm). EXPLODED: each wing alone, in its own planform frame (span to the right, its root at the left), as the model builds it — the short edge at its left end is the root, inside the body.</p>`}
<div class="row hdr"><div>#</div><div>source</div><div>exploded — forewing (left) | hindwing (right)</div><div>assembled SVG</div><div>notes</div></div>
${cands.map(row).join('\n')}`;
  fs.writeFileSync(path.join(OUT, 'contact.html'), html);
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify(page ? { summary: page.summary, candidates: cands.map(({ cropPng, svg, overlay, ...rest }) => rest) } : cands.map(({ cropPng, svg, overlay, ...rest }) => rest), null, 1));
  await screenshot();
}

/* --add (§13.5): dedupe against the CURRENT library first (an entry applied
   the way the page applies it — at sweep 0, the angle in the points — measured
   by the same Hausdorff), then within the batch in reading order. The numbers
   are PINNED to the first sheet Eva saw (ADD_NUMBERS), so a shape keeps its
   number across re-fits; a shape that sheet did not number is numbered on
   after them. Every row shows the fit Eva last saw beside it (BEFORE: the
   deepest concavity is the notch, split square to the body) against the fit
   with the wing-either-side split (§13.6). MOTH-TYPE rows — forewings swept
   back over most of the hindwing — come FIRST (MOTH_ROWS), so they can be
   struck in one pass. The assembled SVG is the default bug. */
export const ADD_DROPPED = ['sheet-2#20', 'sheet-3#3', 'sheet-4#10', 'sheet-2#16'];   // this session's exclusions, NOT accepted by Eva (design doc §13.6, Status): #34 (judged = #22), #37 (under the floor), #50 (luna-type), #31 (hindwing fitted 79 deg back) — the audit session re-examines them
/* the moth-type crops, by eye from the sources: forewings swept back over most
   of the hindwing (heavily overlapped). #52's crop holds a tailed moth over a butterfly. */
export const MOTH_ROWS = ['sheet-3#1', 'sheet-3#5', 'sheet-3#6', 'sheet-4#3', 'sheet-4#11', 'sheet-4#12'];
export const ADD_NUMBERS = { 'sheet-2#1': 18, 'sheet-2#2': 19, 'sheet-2#3': 20, 'sheet-2#4': 21, 'sheet-2#5': 22, 'sheet-2#6': 23, 'sheet-2#7': 24, 'sheet-2#8': 25, 'sheet-2#9': 26, 'sheet-2#12': 27, 'sheet-2#13': 28, 'sheet-2#14': 29, 'sheet-2#15': 30, 'sheet-2#16': 31, 'sheet-2#17': 32, 'sheet-2#18': 33, 'sheet-2#20': 34, 'sheet-3#1': 35, 'sheet-3#2': 36, 'sheet-3#3': 37, 'sheet-3#4': 38, 'sheet-3#5': 39, 'sheet-3#6': 40, 'sheet-4#1': 41, 'sheet-4#2': 42, 'sheet-4#3': 43, 'sheet-4#4': 44, 'sheet-4#5': 45, 'sheet-4#6': 46, 'sheet-4#7': 47, 'sheet-4#8': 48, 'sheet-4#9': 49, 'sheet-4#10': 50, 'sheet-4#11': 51, 'sheet-4#12': 52, 'sheet-4#13': 53, 'sheet-4#14': 54, 'sheet-4#15': 55 };
async function addSheet(cands, base) {
  const lib = G.WING_LIBRARY;
  const span = 2 * Math.max(...rightWingBoundary(base).map((q) => q[0]));
  const pct = (d) => +(100 * d).toFixed(1), mm = (d) => +(d * span).toFixed(2);
  const libB = lib.map((s) => rightWingBoundary(applyRecord(base, s)));
  const ok = cands.filter((c) => c.ok), B = ok.map((c) => rightWingBoundary(applyRecord(base, c.record)));
  ok.forEach((c, a) => {
    let best = null; libB.forEach((L, k) => { const d = hausdorff(B[a], L) / span; if (!best || d < best.d) best = { d, id: lib[k].id }; });
    c.nearLib = { id: best.id, mm: mm(best.d), pct: pct(best.d) };
    if (best.d < DEDUPE_FRAC) { c.dupOf = `library #${best.id}`; c.dupMm = mm(best.d); c.dupPct = pct(best.d); }
  });
  const D = ok.map(() => ok.map(() => 0));
  for (let a = 0; a < ok.length; a++) for (let b = a + 1; b < ok.length; b++) D[a][b] = D[b][a] = hausdorff(B[a], B[b]) / span;
  for (let b = 0; b < ok.length; b++) {
    let n = null; ok.forEach((d, a) => { if (a !== b && (!n || D[a][b] < n.d)) n = { d: D[a][b], name: d.name }; });
    if (n) ok[b].nearNew = { name: n.name, mm: mm(n.d), pct: pct(n.d) };
    if (ok[b].dupOf) continue;
    for (let a = 0; a < b; a++) if (!ok[a].dupOf && D[a][b] < DEDUPE_FRAC) { ok[b].dupOf = ok[a].name; ok[b].dupMm = mm(D[a][b]); ok[b].dupPct = pct(D[a][b]); break; }
  }
  let next = Math.max(...Object.values(ADD_NUMBERS));
  for (const c of cands) c.num = ADD_NUMBERS[c.name] ?? (c.ok && !c.dupOf ? ++next : null);
  const numOf = (name) => (cands.find((d) => d.name === name) || {}).num;
  for (const c of ok) if (c.dupOf && !c.dupOf.startsWith('library')) c.dupOf = `#${numOf(c.dupOf)} (${c.dupOf})`;
  const dupLib = ok.filter((c) => c.dupOf && c.dupOf.startsWith('library')), dupNew = ok.filter((c) => c.dupOf && !c.dupOf.startsWith('library'));
  const surv = ok.filter((c) => !c.dupOf), under = surv.filter((c) => c.floor.length);
  // the split, before and after: changed when the pair count or the fitted fore/hind division moved
  const splitMoved = (c) => c.before && c.before.ok && (c.before.mode !== c.mode || (c.split && c.before.split && Math.hypot(c.split.root[0] - c.before.split.root[0], c.split.root[1] - c.before.split.root[1]) + Math.hypot(c.split.outer[0] - c.before.split.outer[0], c.split.outer[1] - c.before.split.outer[1]) > 1));
  const sheets = [...new Set(cands.map((c) => c.sheet))];
  const summary = { sheets, dropped: ADD_DROPPED, found: cands.length, fitted: ok.length, refused: cands.filter((c) => !c.ok).map((c) => `${c.name}: ${c.reason}`), duplicatesOfLibrary: dupLib.map((c) => `#${c.num} ${c.name} = ${c.dupOf} (${c.dupMm} mm)`), duplicatesInBatch: dupNew.map((c) => `#${c.num} ${c.name} = ${c.dupOf} (${c.dupMm} mm)`), survivors: surv.map((c) => `#${c.num} ${c.name}`), underFloor: under.map((c) => `#${c.num}: ${c.floor.join(', ')}`), refittedAt: surv.filter((c) => c.tolUsed !== 0.6).map((c) => `#${c.num} at ${c.tolUsed} mm`), splitMoved: ok.filter(splitMoved).map((c) => `#${c.num} ${c.name}: ${c.before.mode} -> ${c.mode} pair(s)`), dedupe: `Hausdorff between applied shapes' right-wing silhouettes on the default bug (wingspan ${span.toFixed(1)} mm), duplicate under ${DEDUPE_FRAC * 100}% (${(DEDUPE_FRAC * span).toFixed(2)} mm), against the ${lib.length}-shape library and within this batch` };
  console.log(JSON.stringify(summary, null, 1));

  const moths = cands.filter((c) => MOTH_ROWS.includes(c.name)), rest = cands.filter((c) => !MOTH_ROWS.includes(c.name));
  const exploded = (f, label = true) => {
    const W = f.wings, gap = 4, boxes = W.map((P) => { const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; });
    let x = 0; const placed = W.map((P, k) => { const b = boxes[k], dx = x - b[0]; x += b[1] - b[0] + gap; return P.map(([u, w]) => [u + dx, w]); });
    const y0 = Math.min(...boxes.map((b) => b[2])), y1 = Math.max(...boxes.map((b) => b[3])), mg = 2, top = 7;
    const vb = [-mg, -y1 - mg - top, x - gap + 2 * mg, y1 - y0 + 2 * mg + top];
    const fs = (vb[2] / 26).toFixed(2);
    const pol = placed.map((P) => `<polygon points="${P.map(([u, w]) => `${u},${-w}`).join(' ')}" fill="#e9e7df" stroke="#0A0A0C" stroke-width="${(vb[2] / 400).toFixed(3)}" stroke-linejoin="round"/>`).join('');
    const lab = label ? placed.map((P, k) => { const xs = P.map((q) => q[0]); return `<text x="${(Math.min(...xs) + Math.max(...xs)) / 2}" y="${-y1 - mg - 1}" font-size="${fs}" text-anchor="middle" font-family="monospace" fill="#a0004f">${k === 0 ? 'fore' : 'hind'}</text>`; }).join('') : '';
    return `<svg viewBox="${vb.join(' ')}">${pol}${lab}</svg>`;
  };
  const svgOf = (t) => t.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
  const row = (c) => {
    const src = `<img src="data:image/png;base64,${c.cropPng}">`;
    const bef = c.before && c.before.ok ? `<div class="c wide bef">${exploded(c.before)}</div>` : `<div class="c wide msg">${c.before ? 'before: REFUSED — ' + esc(c.before.reason) : ''}</div>`;
    if (!c.ok) return `<div class="row"><div class="n">${c.num ? '#' + c.num : '—'}</div><div class="c">${src}</div>${bef}<div class="c wide msg">REFUSED: ${esc(c.reason)}</div><div class="c"></div><div class="meta">${esc(c.name)}</div></div>`;
    const moved = splitMoved(c);
    if (c.dupOf) return `<div class="row isdup"><div class="n dup">dup<br><small>of ${esc(c.dupOf)}</small></div><div class="c">${src}</div>${bef}<div class="c wide">${exploded(c)}</div><div class="c svg">${svgOf(c.svg)}</div><div class="meta">${esc(c.name)} · DUPLICATE of ${esc(c.dupOf)} — ${c.dupMm} mm (${c.dupPct}% of the wingspan, under the ${DEDUPE_FRAC * 100}% bar)</div></div>`;
    const meta = `${esc(c.name)}${moved ? ` · <b>split moved</b> (before: ${c.before.mode} pair${c.before.mode > 1 ? 's' : ''}, ${c.before.splitMode})` : ''} · nearest library #${c.nearLib.id} at ${c.nearLib.mm} mm (${c.nearLib.pct}%)${c.nearNew ? ` · nearest new ${esc(c.nearNew.name)} at ${c.nearNew.mm} mm` : ''} · points ${c.fit.map((q) => q.points).join(' / ')} · max dev ${c.fit.map((q) => q.maxDevMm).join(' / ')} mm · tail ${c.record.tail ? c.record.tail.points.length + ' pts' : 'none'} · J ${c.smooth.join(' / ')}${c.tolUsed !== 0.6 ? ` · <b>fitted at ${c.tolUsed} mm</b>` : ''}${c.floor.length ? '<br><b class="fl">UNDER THE FLOOR: ' + c.floor.join(', ') + '</b>' : ''}${[...c.notes, ...c.modelNotes].length ? '<br><span class="note">' + [...c.notes, ...c.modelNotes].map(esc).join('<br>') + '</span>' : ''}`;
    return `<div class="row${c.floor.length ? ' floor' : ''}${moved ? ' moved' : ''}"><div class="n">#${c.num}${c.floor.length ? '<br><small class="fl">FLOOR</small>' : ''}</div><div class="c">${src}</div>${bef}<div class="c wide">${exploded(c)}</div><div class="c svg">${svgOf(c.svg)}</div><div class="meta">${meta}</div></div>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><title>wing library — new batch, moths first</title><style>
body{font:12px/1.35 ui-monospace,monospace;background:#f4f3ee;color:#111;margin:16px;width:1460px}
h1{font-size:16px;margin:0 0 4px} h2{font-size:14px;margin:18px 0 4px} .sum{margin:0 0 12px;max-width:1420px}
.row{display:grid;grid-template-columns:44px 120px 330px 330px 200px 1fr;gap:8px;align-items:center;border-top:1px solid #ccc;padding:6px 0}
.brow{display:grid;grid-template-columns:70px 330px 330px 1fr;gap:8px;align-items:center;border-top:1px solid #ccc;padding:6px 0}
.c{height:200px;display:flex;align-items:center;justify-content:center;background:#fff}
.c img{max-width:100%;max-height:100%} .c svg{width:100%;height:100%} .bef{background:#f0f0f0}
.n{font-size:18px;font-weight:bold;text-align:center} .meta{font-size:10.5px} .note{color:#7a4b00} .msg{color:#a00;font-size:11px;padding:6px}
.hdr{font-weight:bold;border:0} .isdup{opacity:.5} .dup{color:#888;font-size:13px} .fl{color:#b00} .floor{background:#fbe9e9} .moved .n{color:#a0004f}
</style>
<h1>Wing-shape library — the new batch, refitted (for Eva's keep / drop list) — MOTHS FIRST</h1>
<p class="sum">${sheets.join(', ')}: <b>${cands.length}</b> found (excluded this session, not yet ruled: #31, #34, #37, #50) · <b>${ok.length}</b> fitted · ${cands.length - ok.length} refused · <b>${dupLib.length}</b> duplicates of library shapes · ${dupNew.length} duplicates within the batch · <b>${surv.length} numbered survivors</b> (numbers as on the first sheet) · <b>${under.length} under the floor</b>${under.length ? ' (red rows)' : ''} · the fore/hind split moved on ${ok.filter(splitMoved).length} (number in pink).<br>
As in the #349 library, each wing's angle is in its points and a shape applies at sweep 0. The fore/hind split of one wing mass is now taken at a notch with a WING ON EACH SIDE of it (else the deepest concavity, as before), the split line running from the notch to the middle of the attachment.<br>
Columns: source | BEFORE (grey): the fit you last saw, exploded | AFTER: exploded (span to the right, root at the left — the short left edge is the root, inside the body) | the assembled bug's SVG, current default root | notes. Near-identical = ${esc(summary.dedupe)}.</p>
<div class="row hdr"><div>#</div><div>source</div><div>before — fore | hind</div><div>after — fore | hind</div><div>assembled SVG</div><div>notes</div></div>
${moths.length ? `<h2>MOTH-TYPE ROWS (${moths.length}) — before | after</h2>` + moths.map(row).join('\n') : ''}
<h2>THE REST (${rest.length})</h2>
${rest.map(row).join('\n')}
`;
  fs.writeFileSync(path.join(OUT, 'contact.html'), html);
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify({ summary, candidates: cands.map(({ cropPng, svg, overlay, before, ...rest }) => ({ ...rest, before: before && { ok: before.ok, mode: before.mode, split: before.split } })) }, null, 1));
  await screenshot(1492);
}
async function screenshot(width = 1212) {
  try {
    const { chromium } = await import('playwright-core');
    const exe = fs.readdirSync('/opt/pw-browsers').find((d) => /^chromium-\d+$/.test(d));
    const b = await chromium.launch({ executablePath: path.join('/opt/pw-browsers', exe, 'chrome-linux/chrome') });
    const pg = await b.newPage({ viewport: { width, height: 800 } });
    await pg.goto('file://' + path.join(OUT, 'contact.html'));
    await pg.screenshot({ path: path.join(OUT, 'contact.png'), fullPage: true });
    await b.close();
    console.log('wrote', path.join(OUT, 'contact.png'));
  } catch (e) { console.log('(no screenshot: ' + e.message + ')'); }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
