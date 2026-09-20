#!/usr/bin/env node
// shot-beach-stages.mjs — ONE WAVE FROZEN AT EACH OF THE SIX STAGES, through
// the shipped renderer, before any life cycle is wired.
//
//   node tools/shot-beach-stages.mjs <dir> [--ref <reference-sheet.png>]
//
// The brief's own order: confirm the stages READ before the mechanics. So each
// cell is a written-down state — a wave record with its `age` set to land in
// one stage — drawn by the real `createRenderer`, never a picture of one.
//
// EVERY CELL CARRIES ITS OWN MEASUREMENT, READ BACK OFF THE RENDERED PIXELS,
// and that is the point rather than a nicety. The reference's crest-to-face
// contrast is the strongest edge anywhere in its frame (153 luminance levels
// in sequence A, 157 in sequence C, against 27-40 for the strongest edge
// elsewhere), and "does this drawing have a dark face" is exactly the question
// a picture alone cannot answer — the first cut of this scene drew a white
// stripe and passed 133 checks. So every cell reports the crest, the face and
// the gap between them, measured the same way tools/beach-reference.mjs
// measures the footage, and the two sheets are meant to be read side by side.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE. This renderer is not deterministic
// between page sessions (the repo's own contact-sheet rule), and none of these
// cells needs one: every number here is a property of ONE frame.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = path.resolve(argv.find(a => !a.startsWith('--')) || path.join(REPO, 'shots-beach-stages'));
const refAt = argv.indexOf('--ref');
const REF = refAt >= 0 ? path.resolve(argv[refAt + 1]) : null;

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules'].filter(Boolean);
  for (const r of roots) { const e = path.join(r, 'playwright', 'index.js'); if (fs.existsSync(e)) return require(e); }
  return require('playwright');
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serve() {
  const s = http.createServer((req, res) => {
    const p = path.join(REPO, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r({ s, port: s.address().port })));
}

const W = 900, H = 600;
// WHICH AGE LANDS IN WHICH STAGE IS DERIVED FROM THE WAVE'S OWN RECORD, never
// typed. A written-down age would drift the moment a duration moved, and the
// cell would then be captioned with a stage it is not in — which is the
// stale-fixture failure this repo already has a rule about.
// ANCHORED ON THE MEDIAN COLUMN'S OWN BREAK, not on the wave's. The first cut
// staged from `breakAge + peelS`, which is when the LAST column breaks — 1.4 s
// after the first one — so the cell captioned COLLAPSE showed a band 0.10 of
// frame height where the reference's is 0.035 at that stage. A peel is 1.4 s
// wide, so "how far through is this wave" has to name WHICH COLUMN.
// Each is written out whole rather than sharing a helper: these are
// STRINGIFIED into the page, so a reference to anything in this module is a
// ReferenceError at render time rather than a compile error here.
const AGES = {
  // SWELL and STEEPEN are anchored on the FIRST column's break, because both
  // are states of a wave NO PART of which has broken yet; the three after it
  // are anchored on the median column, because a peel is 1.4 s wide and "how
  // far through is this wave" has to name which column.
  swell:    (w) => w.breakAge - w.steepS - 0.9,
  steepen:  (w) => w.breakAge - w.steepS * 0.45,
  peel:     (w) => w.breakAge + w.peelS * 0.5 + 0.12,
  collapse: (w) => w.breakAge + w.peelS + 0.30,
  band:     (w) => w.breakAge + w.peelS + 1.9,
  swash:    (w) => w.preS + 0.45,
};
const TITLES = {
  swell:    ['1 · SWELL', 'a dark tonal ridge in the mid water. No foam. Moving shoreward and visible well before anything breaks.'],
  steepen:  ['2 · STEEPEN', 'the ridge narrows, its shoreward face darkens, a thin bright lip appears along the top.'],
  peel:     ['3 · PEEL', 'the break runs ALONG the crest from one end — broken at some columns and not at others, which is what a peel is.'],
  collapse: ['4 · COLLAPSE', 'the lip thickens into a turbulent mass with a DARK FACE beneath it. The strongest edge in the frame.'],
  band:     ['5 · FOAM BAND', 'the mass widens, the dark face goes, and a broad turbulent white band travels shoreward and thins.'],
  swash:    ['6 · SWASH', 'the shipped two-line model. Stage six of a wave’s life, not a separate system.'],
};

const { chromium } = loadPlaywright();
const { s: server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/scene.html`);
fs.mkdirSync(OUT, { recursive: true });

async function cell(id, build) {
  const info = await page.evaluate(async ({ W, H, build }) => {
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.style.display = 'block'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d', { alpha: false });
    const shoreMod = await import('/scene/beach-shore.js');
    const drawMod = await import('/scene/beach-draw.js');
    const waveMod = await import('/scene/beach-wave.js');
    const shore = shoreMod.createShore(); shore.resize(W, H);
    const rend = drawMod.createRenderer(ctx, shore);

    // A written-down deterministic stream, so a cell is the same cell run to
    // run. Not rng.js: this tool is not the scene and must not pretend a seed
    // it did not get from the shell.
    let k = 0;
    const seq = [0.31, 0.77, 0.12, 0.58, 0.93, 0.40, 0.66, 0.05, 0.84, 0.23, 0.51, 0.71, 0.18, 0.62, 0.37, 0.88];
    const rand = { unit: () => seq[k++ % seq.length], range: (a, b) => a + (b - a) * seq[k++ % seq.length] };

    const st = build({ waveMod, rand });
    const wob = (u, kk) => Math.sin(u * 6.3 + kk) * 0.008 + Math.sin(u * 15.1 + kk * 2) * 0.004;
    const streaks = [];
    for (let i = 0; i < 230; i++) {
      streaks.push({ u: (i * 0.61803398) % 1,
        s: 0.015 + ((i * 0.38196601 + i * i * 0.007) % 1) * Math.max(0.02, st.swash - 0.04),
        len: 0.015 + ((i * 0.7320508) % 1) * 0.055 });
    }
    rend.draw({
      width: W, height: H, dpr: 2,
      swashAt: (u) => st.swash + wob(u, 1.7),
      wetAt: (u) => st.wet + wob(u, 4.1) * 0.7,
      glossDepth: st.gloss, frontFoam: st.frontFoam, frontSeed: 11, drift: 0,
      streaks, waves: st.waves,
    });

    // --- the measurement, off the rendered pixels -------------------------
    // THE ROW MEAN, AND NOT THE MEDIAN THE REFERENCE TOOL USES — because this
    // drawing is BILEVEL and that footage is continuous tone, and a median of
    // a bilevel field reports pure ink or pure paper and nothing in between.
    // Measured: a band at tone 0.67 delivers 87% coverage, so more than half
    // its pixels are ink and its row median reads L 24 — SOLID BLACK — for a
    // region whose actual value is L 51. The first cut of this tool used the
    // median for symmetry with tools/beach-reference.mjs and reported a dark
    // face 27 levels darker than anything the renderer can draw.
    //
    // A mean over a bilevel row IS its ink coverage, which is the quantity
    // that corresponds to the footage's luminance; the reference tool keeps
    // its median for its own reason, which is to reject a bird or a footprint
    // from a photograph. Same question, two media, two right answers.
    //
    // AVERAGED OVER A BAND OF ROWS, not one row, for the same reason: at a
    // 3.6 px pitch a single scanline can fall between two strokes.
    // AND OVER THE COLUMNS THAT HAVE ACTUALLY BROKEN, not the whole width.
    // A peel is 1.4 s wide, so during it half the frame has a band and half
    // does not, and a full-width figure is the average of a wave and no wave —
    // which is this scene's own sheared-band lesson arriving for a third
    // quantity. The reference tool is per column for the same reason.
    const M1 = waveMod;
    let x0 = 0, x1 = cv.width;
    if ((st.waves || []).length) {
      let best = null;
      for (const c of st.waves) {
        if (M1.crestAt(c, 0.5) >= 0.40) continue;
        if (!best || M1.bandWidthAt(c, M1.brokenAt(c, 0.5)) > M1.bandWidthAt(best, M1.brokenAt(best, 0.5))) best = c;
      }
      if (best) {
        const lo = [], hi = [];
        for (let i = 0; i <= 64; i++) { const u = i / 64; (M1.brokenAt(best, u) >= 0 ? lo : hi).push(u); }
        if (lo.length > 4) { x0 = Math.floor(Math.min(...lo) * cv.width); x1 = Math.ceil(Math.max(...lo) * cv.width); }
      }
    }
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const N = 200, prof = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const y0 = Math.floor(i * cv.height / N), y1 = Math.max(y0 + 1, Math.floor((i + 1) * cv.height / N));
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const p = (y * cv.width + x) * 4;
        sum += 0.2126 * img.data[p] + 0.7152 * img.data[p + 1] + 0.0722 * img.data[p + 2]; n++;
      }
      prof[i] = sum / n;
    }
    // crest = the brightest row band in the water; face = the darkest below it
    let hi = -1, ci = -1;
    for (let i = 0; i < Math.floor(0.40 * N); i++) if (prof[i] > hi) { hi = prof[i]; ci = i; }
    let last = ci; while (last + 1 < N && prof[last + 1] > 175) last++;
    let first = ci; while (first > 0 && prof[first - 1] > 175) first--;
    let lo = Infinity, fi = -1;
    for (let i = last + 1; i < Math.min(N, last + 1 + Math.floor(0.18 * N)); i++) if (prof[i] < lo) { lo = prof[i]; fi = i; }
    const amb = [];
    for (let i = fi + Math.floor(0.06 * N); i < Math.floor(0.42 * N); i++) amb.push(prof[i]);
    amb.sort((a, b) => a - b);
    // the strongest luminance step over 0.02 of frame height, and where
    const kk = Math.max(1, Math.round(0.02 * N));
    let eAll = 0, eAt = 0, eLow = 0;
    for (let i = 0; i + kk < N; i++) {
      const d = Math.abs(prof[i] - prof[i + kk]);
      if (d > eAll) { eAll = d; eAt = i / N; }
      if (i / N >= 0.30 && d > eLow) eLow = d;
    }
    const W_ = waveMod;
    const stages = (st.waves || []).map(wv =>
      [0, 0.5, 1].map(u => W_.STAGE_NAMES[W_.stageAt(wv, u, 0.40)]).join(' / ')
        + '   wave: ' + W_.STAGE_NAMES[W_.waveStage(wv, 0.40)]);
    const geo = (st.waves || []).map(wv => {
      const b = W_.brokenAt(wv, 0.5);
      return { crest: W_.crestAt(wv, 0.5), band: W_.bandWidthAt(wv, b),
               face: W_.faceDepthAt(wv, b), swell: W_.swellDepthAt(wv, b), broken: b };
    });
    return { rows: rend.rows, crest: hi, crestS: ci / N, face: lo, faceS: fi / N,
             band: (last + 1 - first) / N, ambient: amb.length ? amb[amb.length >> 1] : null,
             edge: { all: eAll, at: eAt, low: eLow }, stages, geo };
  }, { W, H, build: `RETURN` });
  return info;
}

// page.evaluate cannot take a function through JSON, so the builders are
// passed as SOURCE and evaluated in the page. Written out per cell rather than
// generated, so what a cell holds is readable here.
async function render(id, buildSrc) {
  const info = await page.evaluate(async ({ W, H, src }) => {
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.style.display = 'block'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d', { alpha: false });
    const shoreMod = await import('/scene/beach-shore.js');
    const drawMod = await import('/scene/beach-draw.js');
    const waveMod = await import('/scene/beach-wave.js');
    const shore = shoreMod.createShore(); shore.resize(W, H);
    const rend = drawMod.createRenderer(ctx, shore);
    let k = 0;
    const seq = [0.31, 0.77, 0.12, 0.58, 0.93, 0.40, 0.66, 0.05, 0.84, 0.23, 0.51, 0.71, 0.18, 0.62, 0.37, 0.88];
    const rand = { unit: () => seq[k++ % seq.length], range: (a, b) => a + (b - a) * seq[k++ % seq.length] };
    const st = (new Function('waveMod', 'rand', src))(waveMod, rand);
    const wob = (u, kk) => Math.sin(u * 6.3 + kk) * 0.008 + Math.sin(u * 15.1 + kk * 2) * 0.004;
    const streaks = [];
    for (let i = 0; i < 230; i++) {
      streaks.push({ u: (i * 0.61803398) % 1,
        s: 0.015 + ((i * 0.38196601 + i * i * 0.007) % 1) * Math.max(0.02, st.swash - 0.04),
        len: 0.015 + ((i * 0.7320508) % 1) * 0.055 });
    }
    rend.draw({ width: W, height: H, dpr: 2,
      swashAt: (u) => st.swash + wob(u, 1.7), wetAt: (u) => st.wet + wob(u, 4.1) * 0.7,
      glossDepth: st.gloss, frontFoam: st.frontFoam, frontSeed: 11, drift: 0, streaks, waves: st.waves });

    // THE ROW MEAN, AND NOT THE MEDIAN THE REFERENCE TOOL USES — because this
    // drawing is BILEVEL and that footage is continuous tone, and a median of
    // a bilevel field reports pure ink or pure paper and nothing in between.
    // Measured: a band at tone 0.67 delivers 87% coverage, so more than half
    // its pixels are ink and its row median reads L 24 — SOLID BLACK — for a
    // region whose actual value is L 51. The first cut of this tool used the
    // median for symmetry with tools/beach-reference.mjs and reported a dark
    // face 27 levels darker than anything the renderer can draw.
    //
    // A mean over a bilevel row IS its ink coverage, which is the quantity
    // that corresponds to the footage's luminance; the reference tool keeps
    // its median for its own reason, which is to reject a bird or a footprint
    // from a photograph. Same question, two media, two right answers.
    //
    // AVERAGED OVER A BAND OF ROWS, not one row, for the same reason: at a
    // 3.6 px pitch a single scanline can fall between two strokes.
    // AND OVER THE COLUMNS THAT HAVE ACTUALLY BROKEN, not the whole width.
    // A peel is 1.4 s wide, so during it half the frame has a band and half
    // does not, and a full-width figure is the average of a wave and no wave —
    // which is this scene's own sheared-band lesson arriving for a third
    // quantity. The reference tool is per column for the same reason.
    const M1 = waveMod;
    let x0 = 0, x1 = cv.width;
    if ((st.waves || []).length) {
      let best = null;
      for (const c of st.waves) {
        if (M1.crestAt(c, 0.5) >= 0.40) continue;
        if (!best || M1.bandWidthAt(c, M1.brokenAt(c, 0.5)) > M1.bandWidthAt(best, M1.brokenAt(best, 0.5))) best = c;
      }
      if (best) {
        const lo = [], hi = [];
        for (let i = 0; i <= 64; i++) { const u = i / 64; (M1.brokenAt(best, u) >= 0 ? lo : hi).push(u); }
        if (lo.length > 4) { x0 = Math.floor(Math.min(...lo) * cv.width); x1 = Math.ceil(Math.max(...lo) * cv.width); }
      }
    }
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const N = 200, prof = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const y0 = Math.floor(i * cv.height / N), y1 = Math.max(y0 + 1, Math.floor((i + 1) * cv.height / N));
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const p = (y * cv.width + x) * 4;
        sum += 0.2126 * img.data[p] + 0.7152 * img.data[p + 1] + 0.0722 * img.data[p + 2]; n++;
      }
      prof[i] = sum / n;
    }
    // THE SEARCH STOPS SEAWARD OF THE SHORE'S OWN FOAM BAND, and the first
    // cut of this tool did not: the brightest thing in the top 40% of a frame
    // whose dry sand is BARE PAPER is the shore band or the sand itself, so
    // every cell reported a crest at s 0.33 and a band 0.675 wide. That is
    // this repo's own "a band comparison cannot see an empty region" in a new
    // place — the instrument was answering a question about the sand while
    // being captioned about the wave.
    // THE WINDOW IS THE WAVE'S OWN, taken from the record, and the PIXELS in
    // it are what is measured. The record says where to look; it cannot say
    // what is there. Without it the instrument finds the brightest thing in
    // the frame, which on a drawing whose dry sand is BARE PAPER is the shore
    // band or the sand — and every cell reported a crest at s 0.31 with no
    // wave anywhere near it.
    const M0 = waveMod;
    const win = (st.waves || []).length ? (() => {
      // THE WIDEST BAND, NOT THE LAST WAVE. With four alive the last is the
      // swash, whose "band" is the shore's own — so the cell about a break
      // measured the shore.
      let wv = st.waves[0];
      for (const c of st.waves) {
        if (M0.bandWidthAt(c, M0.brokenAt(c, 0.5)) > M0.bandWidthAt(wv, M0.brokenAt(wv, 0.5))
            && M0.crestAt(c, 0.5) < 0.40) wv = c;
      }
      const c = M0.crestAt(wv, 0.5), bw = M0.bandWidthAt(wv, M0.brokenAt(wv, 0.5));
      return [Math.max(0, c - 0.05), Math.min(0.99, c + Math.max(bw, wv.bandMax) + 0.14)];
    })() : [0, Math.max(0.06, st.swash - 0.10)];
    const wStart = Math.floor(win[0] * N), wEnd = Math.floor(win[1] * N);
    let hi = -1, ci = wStart;
    for (let i = wStart; i < wEnd; i++) if (prof[i] > hi) { hi = prof[i]; ci = i; }
    let last = ci; while (last + 1 < wEnd && prof[last + 1] > 175) last++;
    let first = ci; while (first > wStart && prof[first - 1] > 175) first--;
    let lo = Infinity, fi = -1;
    for (let i = last + 1; i < Math.min(wEnd, last + 1 + Math.floor(0.18 * N)); i++) if (prof[i] < lo) { lo = prof[i]; fi = i; }
    const amb = [];
    for (let i = fi + Math.floor(0.05 * N); i < Math.min(N, wEnd + Math.floor(0.05 * N)); i++) amb.push(prof[i]);
    amb.sort((a, b) => a - b);
    // The strongest step INSIDE the wave's window against the strongest step
    // ANYWHERE ELSE IN THE WATER — the reference tool's own comparison, which
    // is what makes "the strongest edge in the picture" a ratio and not a
    // number. The sand is excluded on both sides: it is bare paper against a
    // toned lattice and its own boundary would win every time.
    const kk = Math.max(1, Math.round(0.02 * N));
    const sandFrom = Math.floor(Math.min(0.99, st.wet + 0.02) * N);
    let eAll = 0, eAt = 0, eLow = 0;
    for (let i = 0; i + kk < sandFrom; i++) {
      const d = Math.abs(prof[i] - prof[i + kk]);
      if (i >= wStart && i < wEnd) { if (d > eAll) { eAll = d; eAt = i / N; } }
      else if (d > eLow) eLow = d;
    }
    const M = waveMod;
    const stages = (st.waves || []).map(wv =>
      [0, 0.5, 1].map(u => M.STAGE_NAMES[M.stageAt(wv, u, 0.40)]).join(' / ') + '  → ' + M.STAGE_NAMES[M.waveStage(wv, 0.40)]);
    const geo = (st.waves || []).map(wv => {
      const b = M.brokenAt(wv, 0.5);
      return { crest: M.crestAt(wv, 0.5), band: M.bandWidthAt(wv, b), face: M.faceAmountOf(wv),
               swell: M.swellDepthAt(wv, b), broken: b };
    });
    return { rows: rend.rows, crest: hi, crestS: ci / N, face: lo, faceS: fi / N,
             band: hi > 175 ? (last + 1 - first) / N : 0, ambient: amb.length ? amb[amb.length >> 1] : null,
             edge: { all: eAll, at: eAt, low: eLow }, stages, geo };
  }, { W, H, src: buildSrc });
  const file = path.join(OUT, `${id}.png`);
  await page.locator('canvas').screenshot({ path: file });
  return { ...info, file: path.basename(file) };
}

const ONE = (stage) => `
  const w = waveMod.makeWave({ rand, energy: 0.55 });
  w.age = (${AGES[stage].toString()})(w);
  return { swash: ${stage === 'swash' ? '0.58' : '0.42'}, wet: 0.60, gloss: ${stage === 'swash' ? '0.01' : '0.03'},
           frontFoam: ${stage === 'swash' ? '1.0' : '0.35'}, waves: [w] };`;

const CELLS = [];
for (const k of ['swell', 'steepen', 'peel', 'collapse', 'band', 'swash']) {
  CELLS.push({ id: `0${CELLS.length + 1}-${k}`, title: TITLES[k][0], note: TITLES[k][1], src: ONE(k) });
}
// AND THE STATE THE BRIEF CALLS NORMAL: four waves at four stages at once.
// The reference carries a mean of 1.3 to 3.4 bright bands PER COLUMN, so one
// wave at a time was never the picture.
CELLS.push({ id: '07-four-at-once', title: 'FOUR AT ONCE — the normal state, not an edge case',
  note: 'a swell at the back, one peeling, an older band mid-frame, and a swash draining at the front. The reference carries 1.3–3.4 bright bands per column.',
  src: `
  const mk = (e, f) => { const w = waveMod.makeWave({ rand, energy: e }); w.age = f(w); return w; };
  const waves = [
    mk(0.45, (w) => w.breakAge - w.steepS - 1.2),
    mk(0.70, (w) => w.breakAge + w.peelS * 0.5),
    mk(0.55, (w) => w.breakAge + w.peelS + 1.6),
    mk(0.40, (w) => w.preS + 0.9),
  ];
  return { swash: 0.55, wet: 0.62, gloss: 0.02, frontFoam: 0.8, waves };` });
// The control: the same frame with no wave in it at all, which is what the
// merged scene draws at every moment.
CELLS.push({ id: '08-no-waves', title: 'CONTROL — the field with no wave in it',
  note: 'the merged scene, at every moment. The tone ramp, the swell displacement, the streaks and the swash — and nothing between the top of frame and the shore.',
  src: `return { swash: 0.42, wet: 0.60, gloss: 0.03, frontFoam: 0.35, waves: [] };` });

const shot = [];
for (const c of CELLS) {
  const r = await render(c.id, c.src);
  shot.push({ ...c, ...r });
  console.log(`  ${c.id.padEnd(18)} crest ${r.crest.toFixed(0).padStart(3)} @${r.crestS.toFixed(3)}`
    + `  face ${r.face.toFixed(0).padStart(3)} @${r.faceS.toFixed(3)}`
    + `  Δ ${(r.crest - r.face).toFixed(0).padStart(3)}`
    + `  band ${r.band.toFixed(3)}  strongest edge ${r.edge.all.toFixed(0)} at ${r.edge.at.toFixed(3)}`
    + ` (${(r.edge.all / Math.max(1, r.edge.low)).toFixed(1)}x the strongest edge elsewhere in the water)`);
  for (const st of r.stages) console.log(`                     u 0/0.5/1: ${st}`);
}

let refTag = '';
if (REF && fs.existsSync(REF)) {
  fs.copyFileSync(REF, path.join(OUT, 'reference.png'));
  refTag = `<h2>The reference, for comparison</h2>
  <p style="color:#9aa;max-width:1100px">Sequence A of the footage — one break caught from the swell on, every third frame.
  Each cell carries its own crest, face and the gap between them, measured by <code>tools/beach-reference.mjs</code> the same way
  the cells above are measured.</p>
  <figure><img src="reference.png" style="max-width:1400px"></figure>`;
}

fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>Scene 3 — the six stages</title>
<style>body{background:#111;color:#ddd;font:13px/1.55 ui-monospace,monospace;margin:0;padding:24px}
h1{font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#bbb;margin-top:34px}
figure{margin:0 0 30px}img{width:100%;max-width:900px;display:block;border:1px solid #333}
figcaption{margin-top:7px;color:#9aa}b{color:#fff}code{color:#8cc}
table{border-collapse:collapse;margin:6px 0 0;font-size:12px}td,th{padding:1px 12px 1px 0;text-align:left;color:#889}
th{color:#aab;font-weight:600}</style>
<h1>Scene 3 — a wave as an object — the six stages, static</h1>
<p style="color:#9aa;max-width:1100px">One wave, frozen at each stage, through the shipped renderer.
No life cycle is wired: every cell sets a wave record's <code>age</code> and draws it.
Which age lands in which stage is <b>derived from the record</b>, never typed, so a cell cannot be captioned with a stage it is not in.<br>
Every number below is measured off the <b>rendered pixels</b>. The reference's crest-to-face gap is
<b>153</b> luminance levels (sequence A) and <b>157</b> (sequence C), against 27&ndash;40 for the strongest edge elsewhere in its frame.</p>
${shot.map(c => `<figure><img src="${c.file}"><figcaption><b>${c.title}</b><br>${c.note}
<table>
<tr><th>crest</th><td>${c.crest.toFixed(0)} at s ${c.crestS.toFixed(3)}</td><th>face</th><td>${c.face.toFixed(0)} at s ${c.faceS.toFixed(3)}</td><th>crest &minus; face</th><td><b style="color:#fff">${(c.crest - c.face).toFixed(0)}</b></td></tr>
<tr><th>foam band</th><td>${c.band.toFixed(3)} of frame height</td><th>face vs ambient water</th><td>${c.ambient === null ? '&mdash;' : (c.face - c.ambient).toFixed(0)}</td><th>strongest edge</th><td>${c.edge.all.toFixed(0)} at s ${c.edge.at.toFixed(3)} &mdash; ${(c.edge.all / Math.max(1, c.edge.low)).toFixed(1)}&times; the strongest edge elsewhere in the water</td></tr>
${c.stages.map((s, i) => `<tr><th>wave ${i + 1}</th><td colspan="5">stage at u 0 / 0.5 / 1: ${s} &nbsp;&nbsp; crest ${c.geo[i].crest.toFixed(3)} &middot; band ${c.geo[i].band.toFixed(3)} &middot; face ${c.geo[i].face.toFixed(3)} &middot; swell ${c.geo[i].swell.toFixed(3)}</td></tr>`).join('')}
</table></figcaption></figure>`).join('\n')}
${refTag}
`);
console.log(`\n${shot.length} cells -> ${OUT}`);
if (errs.length) console.log('PAGE ERRORS:', errs);
await browser.close(); server.close();
