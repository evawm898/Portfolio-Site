/* ===================================================================
   beach-reference.mjs — every figure scene 3 quotes off the reference
   footage, re-derivable from a directory of extracted frames.

     node tools/beach-reference.mjs <dir-of-frame-dirs> [--sheet <out.png>]

   THE CLIPS ARE NOT IN THIS REPOSITORY AND MUST NOT BE. They are ~5 MB
   each, this repo forbids history rewriting, and a committed binary is
   therefore permanent. What IS committed is this tool and the numbers it
   produces, so a later session can re-derive them given the footage
   rather than inheriting them as folklore.

   Point it at a directory holding one subdirectory of PNG frames per
   recording, extracted at the clip's own frame rate, e.g.

     ffmpeg -i IMG_3911.mov -vsync 0 ref/c1/f%03d.png

   IT DECIDES WHICH RECORDINGS IT HAS RATHER THAN BEING TOLD. Two of the
   three clips handed to session 2 were THE SAME RECORDING — frame k of
   one is frame k+25 of the other, bit-identical — and the calibration
   that shipped quoted three of its four samples as independent when
   three of them were one clip. So the first thing this tool does is
   cross-correlate every pair and refuse to treat a duplicate as a
   second opinion.

   EVERY INSTRUMENT HERE IS PER COLUMN OR PER ROW-MEDIAN, NEVER A
   FULL-WIDTH MEAN, for the reason beach-draw.js already records about
   the shear and which applies twice over to a PEELING wave: a wave that
   has broken across part of the width has a row mean that is water.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';

// The drawing's own normalisation, RESTATED rather than imported from
// beach-draw.js — a reference figure whose scale came from the module it is
// used to calibrate is the entangled-reference trap this project names.
// (194 - L) / (194 - 47), from the shipped tone ladder's header.
const toneOf = (L) => (194 - L) / (194 - 47);

function lumRows(file, n) {
  // decodePNG always hands back RGBA, whatever the file's own colour type.
  const { width, height, data } = decodePNG(fs.readFileSync(file));
  const out = new Float64Array(n);
  const row = new Float64Array(width);
  for (let i = 0; i < n; i++) {
    // ONE representative row per band, and its MEDIAN across the width — so a
    // bird, a footprint or a wave that has broken across part of the width
    // cannot move the figure the way a mean would.
    const y = Math.min(height - 1, Math.floor((i + 0.5) * height / n));
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      row[x] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    }
    const v = Array.from(row).sort((a, b) => a - b);
    out[i] = v[v.length >> 1];
  }
  return out;
}

function lumFull(file) {
  const { width, height, data } = decodePNG(fs.readFileSync(file));
  const L = new Float64Array(width * height);
  for (let i = 0, p = 0; i < L.length; i++, p += 4) {
    L[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }
  return { L, width, height };
}

const frames = (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort().map(f => path.join(dir, f));

// --- is this recording a duplicate of that one? -----------------------------
// Downsampled whole-frame absolute difference at every shift. A shift whose
// residual is EXACTLY zero is not a similar shot; it is the same file offset.
function duplicateShift(a, b) {
  const small = (f) => { const { L, width, height } = lumFull(f); const g = new Float64Array(24 * 32);
    for (let i = 0; i < 24; i++) for (let j = 0; j < 32; j++)
      g[i * 32 + j] = L[Math.floor(i * height / 24) * width + Math.floor(j * width / 32)];
    return g; };
  const A = a.filter((_, i) => i % 5 === 0).map(small);
  const B = b.filter((_, i) => i % 5 === 0).map(small);
  let best = { d: Infinity, shift: 0 };
  for (let sh = 0; sh < Math.min(A.length, 20); sh++) {
    const n = Math.min(A.length - sh, B.length);
    if (n < 4) break;
    let s = 0, c = 0;
    for (let i = 0; i < n; i++) { for (let k = 0; k < A[i + sh].length; k++) s += Math.abs(A[i + sh][k] - B[i][k]); c += A[i + sh].length; }
    const d = s / c;
    if (d < best.d) best = { d, shift: sh * 5 };
  }
  return best;
}

// --- the instruments --------------------------------------------------------
const N = 200;   // row bands; 0.005 of frame height each

function bandProfile(file) { return lumRows(file, N); }

// THE FOAM THRESHOLD IS THE DRY SAND, NOT A CHOSEN LEVEL. The dry sand is the
// brightest thing in the frame that is not foam, so anything above it inside
// the WATER cannot be anything else.
function foamThreshold(files) {
  const v = files.filter((_, i) => i % 10 === 0).map(f => {
    const P = bandProfile(f); const s = Array.from(P.subarray(Math.floor(0.85 * N))).sort((a, b) => a - b);
    return s[s.length >> 1];
  }).sort((a, b) => a - b);
  return v[v.length >> 1];
}

function crestAndFace(P) {
  let hi = -1, ci = -1;
  for (let i = 0; i < Math.floor(0.40 * N); i++) if (P[i] > hi) { hi = P[i]; ci = i; }
  if (hi < 175) return null;
  let last = ci; while (last + 1 < N && P[last + 1] > 175) last++;
  let lo = Infinity, fi = -1;
  for (let i = last + 1; i < Math.min(N, last + 1 + Math.floor(0.18 * N)); i++) if (P[i] < lo) { lo = P[i]; fi = i; }
  if (fi < 0) return null;
  let first = ci; while (first > 0 && P[first - 1] > 175) first--;
  // the ambient water SHOREWARD of the face, which is what makes the face's
  // darkness a claim about the sea rather than about the foam
  const a = [];
  for (let i = fi + Math.floor(0.06 * N); i < Math.floor(0.42 * N); i++) a.push(P[i]);
  a.sort((x, y) => x - y);
  return { crestS: ci / N, crest: hi, faceS: fi / N, face: lo,
           band: (last + 1 - first) / N, ambient: a.length ? a[a.length >> 1] : NaN };
}

// The strongest luminance step over 0.02 of frame height, and where.
function strongestEdge(P, from = 0) {
  const k = Math.max(1, Math.round(0.02 * N));
  let best = 0, at = 0;
  for (let i = Math.floor(from * N); i + k < N; i++) {
    const d = Math.abs(P[i] - P[i + k]);
    if (d > best) { best = d; at = i / N; }
  }
  return { d: best, at };
}

// THE PEEL, per column block. A column is immune to the shear and to a wave
// that has broken across only part of the width; a row mean is not.
function peel(files, fps, sHi, cols = 64) {
  const th = foamThreshold(files);
  const onset = new Array(cols).fill(null);
  const frac = [];
  files.forEach((f, j) => {
    const { L, width, height } = lumFull(f);
    const rows = Math.floor(height * sHi), cw = Math.floor(width / cols);
    let hit = 0;
    for (let c = 0; c < cols; c++) {
      let n = 0, tot = 0;
      for (let y = 0; y < rows; y++) for (let x = c * cw; x < (c + 1) * cw; x++) { tot++; if (L[y * width + x] > th) n++; }
      if (n / tot > 0.02) { hit++; if (onset[c] === null) onset[c] = j / fps; }
    }
    frac.push(hit / cols);
  });
  const ok = onset.map((v, i) => [v, i]).filter(([v]) => v !== null);
  let slope = NaN, spread = NaN;
  if (ok.length > 4) {
    const xs = ok.map(([, i]) => i / (cols - 1)), ys = ok.map(([v]) => v);
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let num = 0, den = 0;
    for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    slope = num / den;
    spread = Math.max(...ys) - Math.min(...ys);
  }
  return { frac, onset, slope, spread, covered: ok.length, cols, th };
}

// How many separate bright bands a COLUMN carries — the count of waves alive.
function bandsPerColumn(file, sHi, th = 160) {
  const { L, width, height } = lumFull(file);
  const rows = Math.floor(height * sHi), minRun = Math.max(1, Math.floor(0.008 * height));
  const counts = [];
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 48))) {
    let runs = 0, cur = 0;
    for (let y = 0; y < rows; y++) {
      if (L[y * width + x] > th) cur++;
      else { if (cur >= minRun) runs++; cur = 0; }
    }
    if (cur >= minRun) runs++;
    counts.push(runs);
  }
  return counts;
}

// --- main -------------------------------------------------------------------
const root = process.argv[2];
if (!root) { console.error('usage: node tools/beach-reference.mjs <dir-of-frame-dirs>'); process.exit(2); }
const dirs = fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory()).sort();
const clips = dirs.map(d => ({ name: d, files: frames(path.join(root, d)) })).filter(c => c.files.length > 4);
console.log(`beach-reference: ${clips.length} frame directories under ${root}`);
for (const c of clips) console.log(`  ${c.name}: ${c.files.length} frames`);

console.log('\n=== 0. ARE ANY TWO OF THESE THE SAME RECORDING? ===');
const dup = [];
for (let i = 0; i < clips.length; i++) for (let j = i + 1; j < clips.length; j++) {
  const a = clips[i], b = clips[j];
  const s0 = decodePNG(fs.readFileSync(a.files[0])), s1 = decodePNG(fs.readFileSync(b.files[0]));
  if (s0.width !== s1.width || s0.height !== s1.height) { console.log(`  ${a.name} vs ${b.name}: different framing, not comparable`); continue; }
  const r = duplicateShift(a.files, b.files);
  const same = r.d < 0.005;
  console.log(`  ${a.name} vs ${b.name}: best shift ${r.shift}, mean |dL| ${r.d.toFixed(3)}`
    + (same ? `  -> THE SAME RECORDING (${b.name} frame k is ${a.name} frame k+${r.shift})` : ''));
  if (same) dup.push([a.name, b.name, r.shift]);
}
if (!dup.length) console.log('  no duplicates');

// Build the sequences: a duplicate pair becomes ONE sequence, extended.
const used = new Set();
const seqs = [];
for (const [an, bn, sh] of dup) {
  const a = clips.find(c => c.name === an), b = clips.find(c => c.name === bn);
  seqs.push({ name: `${an}+${bn}`, files: a.files.concat(b.files.slice(a.files.length - sh)), fps: 29.97 });
  used.add(an); used.add(bn);
}
for (const c of clips) if (!used.has(c.name)) seqs.push({ name: c.name, files: c.files, fps: 30 });

for (const s of seqs) {
  console.log(`\n${'='.repeat(70)}\nSEQUENCE ${s.name} — ${s.files.length} frames, ${(s.files.length / s.fps).toFixed(2)} s`);
  const sHi = 0.40;

  console.log('--- 1/2. crest, face, band and the face against the ambient water ---');
  console.log('     t    crestS  crestL   faceS  faceL   crest-face   face-ambient   band(s)   faceTone-ambientTone');
  for (let j = 0; j < s.files.length; j += Math.max(1, Math.round(s.fps / 6))) {
    const r = crestAndFace(bandProfile(s.files[j]));
    if (!r) continue;
    console.log(`  ${(j / s.fps).toFixed(2).padStart(5)}   ${r.crestS.toFixed(3)}  ${r.crest.toFixed(0).padStart(5)}`
      + `   ${r.faceS.toFixed(3)}  ${r.face.toFixed(0).padStart(5)}      ${(r.crest - r.face).toFixed(0).padStart(5)}`
      + `        ${Number.isFinite(r.ambient) ? (r.face - r.ambient).toFixed(0).padStart(5) : '    -'}`
      + `        ${r.band.toFixed(3)}`
      + `          ${Number.isFinite(r.ambient)
            ? (toneOf(r.face) - toneOf(r.ambient) >= 0 ? '+' : '') + (toneOf(r.face) - toneOf(r.ambient)).toFixed(2)
            : '  -  '}`);
  }

  console.log('--- 2b. is the crest-to-face edge the strongest in the frame? ---');
  console.log('     t    strongest |dL|  at s     strongest below s=0.30   ratio');
  for (let j = 0; j < s.files.length; j += Math.max(1, Math.round(s.fps / 3))) {
    const P = bandProfile(s.files[j]);
    const all = strongestEdge(P), below = strongestEdge(P, 0.30);
    console.log(`  ${(j / s.fps).toFixed(2).padStart(5)}      ${all.d.toFixed(0).padStart(5)}      ${all.at.toFixed(3)}`
      + `          ${below.d.toFixed(0).padStart(5)} at ${below.at.toFixed(3)}        ${(all.d / below.d).toFixed(1)}x`);
  }

  console.log('--- 3. the peel, per column block ---');
  const p = peel(s.files, s.fps, 0.26);
  console.log(`  foam threshold (the dry sand's own median) ${p.th.toFixed(0)};  ${p.covered}/${p.cols} column blocks ever break`);
  console.log(`  onset vs u: slope ${p.slope >= 0 ? '+' : ''}${p.slope.toFixed(3)} s across the frame`
    + `  (negative = peels RIGHT to LEFT);  spread ${p.spread.toFixed(2)} s`);
  const every = Math.max(1, Math.round(s.fps / 5));
  console.log('  columns carrying foam: ' + p.frac.filter((_, i) => i % every === 0)
    .map((v, i) => `${(i * every / s.fps).toFixed(1)}s:${(100 * v).toFixed(0)}%`).join('  '));

  console.log('--- 4. how many separate bright bands a COLUMN carries ---');
  for (let j = 0; j < s.files.length; j += Math.max(1, Math.round(s.fps / 2))) {
    const c = bandsPerColumn(s.files[j], 0.50);
    const mean = c.reduce((a, b) => a + b, 0) / c.length;
    console.log(`  t=${(j / s.fps).toFixed(2).padStart(5)}  mean ${mean.toFixed(2)}  max ${Math.max(...c)}`
      + `  ${(100 * c.filter(v => v >= 2).length / c.length).toFixed(0)}% of columns carry two or more`);
  }

  // THE ROWS ARE MARKED WITH WHETHER A BREAK IS IN THE PICTURE, because that
  // is the whole finding: `deep` and `foam` are properties of a WAVE AT A
  // STAGE and not of a place on the beach, so a fixed window reads a
  // different number depending on what is passing through it. `wet`, `dry`
  // and `gloss` hold across both, which is the control.
  console.log('--- 5. the five band figures at fixed windows; * = a break is in the picture ---');
  console.log('      t     deep L/T      shallow L/T     wet L/T        dry L/T       foam(peak) L/T');
  for (let j = 0; j < s.files.length; j += Math.max(1, Math.round(s.fps / 2))) {
    const P = bandProfile(s.files[j]);
    const med = (a, b) => { const v = Array.from(P.subarray(Math.floor(a * N), Math.floor(b * N))).sort((x, y) => x - y); return v[v.length >> 1]; };
    let foam = 0; for (let i = Math.floor(0.28 * N); i < Math.floor(0.45 * N); i++) foam = Math.max(foam, P[i]);
    const d = med(0, 0.05), sh = med(0.25, 0.31), w = med(0.55, 0.72), dr = med(0.80, 1.0);
    const f = (L) => `${L.toFixed(0).padStart(4)}/${toneOf(L).toFixed(2).padStart(5)}`;
    let brk = false;
    for (let i = 0; i < Math.floor(0.20 * N); i++) if (P[i] > 175) brk = true;
    console.log(`   ${(j / s.fps).toFixed(2).padStart(5)} ${brk ? '*' : ' '}  ${f(d)}      ${f(sh)}      ${f(w)}     ${f(dr)}     ${f(foam)}`);
  }
}
console.log('\nshipped for comparison: deep L47 · shallow L118 · gloss L125 · wet L152-161 · dry L186-194 · foam L191-197');
