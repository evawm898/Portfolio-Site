// Gate for /plot — the curve viewer for the bloom generator's grid export.
//
//   node tools/verify-plot.mjs [--negative-control] [--mutant=<id>]
//
// TWO HALVES, the same division the /print gates use and for the same reason.
//
// PART ONE drives the SHIPPED functions in plot-grid.js — densityToEvery(),
// keepsIndex(), readGridScene(), selectStrips(), stripsToSegments(),
// dimToFog() — over fixtures whose right answer can be written down. On the
// real 15,148-segment grid a wrong stride, a wrong family split or a fog range
// that is merely plausible all still draw a plausible picture, and there is
// nothing on screen to compare them against.
//
// PART TWO drives the page in a real browser and measures every pixel claim
// against the ACTUAL RENDERED FRAMEBUFFER — `__plot.readPixels()` reads it back
// through gl.readPixels straight after a render, so the numbers are the
// renderer's own and no DOM panel is ever counted as ink.
//
// THE ADDITIVE CHECK RESTS ON A CALIBRATION, NOT A THRESHOLD PULLED FROM THE
// AIR. Tone mapping is off and the material colour is set in linear space, so
// the brightest pixel a SINGLE fully-covered line can produce is exactly
// sRGB(brightness) — antialiasing and the depth dim can only lower it. Any
// pixel above that is accumulation, and there is no other way to get one.
//
// THE CENSUS IS RECOUNTED INDEPENDENTLY. `extras.kind actually separates the
// families` is not checked by asking the page whether it thinks it did: this
// file parses the .glb's own JSON chunk and counts the strips itself, then
// requires the page to agree strip for strip and segment for segment.
//
// --negative-control re-serves deliberately broken copies of plot.js and
// plot-grid.js through this gate's own HTTP server (and imports the broken
// module for part one), and fails if a mutation does not apply, if a check the
// mutant NAMES stays green, or if a check it did not name goes red.
//
// FIVE CHECKS IN THIS FILE EXIST IN THEIR CURRENT FORM BECAUSE THE FIRST SWEEP
// FOUND THEM WEAK OR ENTANGLED, and each is worth not re-learning:
//   * `kind/the-two-families-partition-the-grid` was `u + v = both`, which is
//     satisfied by collapsing every strip into one family — the reader mutation
//     left it green at 15148 + 0 = 15148. It is anchored to the file's own
//     per-family counts now.
//   * `readout/the-draw-panel-names-the-stride` only looked for the words
//     "every 10th", which the panel still printed beside "280 of 280 lines"
//     with the stride switched off. It has to agree with the drawn state.
//   * `dim/zero-is-off-and-the-read-out-says-so` was one-sided, and "0 is off"
//     is satisfied by a dim that is never applied at any setting.
//   * `select/*` were driven from readGridScene()'s output, so a broken READER
//     reported as a broken SELECTOR and hid behind it. They run on records
//     written down here instead.
//   * `panels/a-collapsed-panel-still-drives-the-draw` and
//     `bytes/garbage-is-reported-and-not-thrown` were driven through, and
//     chained off, machinery other mutations break — so they reported on
//     whatever else was wrong rather than on themselves.
//
// Dev-only deps, not in package.json (same convention as the other gates):
//   npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control') || args.some(a => a.startsWith('--mutant='));
const ONLY = (() => { const a = args.find(x => x.startsWith('--mutant=')); return a ? a.slice(9) : null; })();

const GRID = 'assets/plot-test/bloom-grid-live.glb';
const VIEW = [0.62, 0.46, 1];          // the page's own home direction
const LOW_VIEW = [0.92, 0.14, 1];      // a low angle, where the whorls overlap most

// ===========================================================================
// MUTANTS. `file` is the module the edit lands in; part one imports the broken
// copy and part two is served it.
const MUTANTS = [
  {
    id: 'blending-is-not-additive', file: 'plot.js',
    from: '  blending: THREE.AdditiveBlending,', to: '  blending: THREE.NormalBlending,',
    breaks: ['blend/the-material-is-additive', 'blend/crossings-exceed-a-single-line'],
  },
  {
    id: 'every-strip-reads-as-a-u-line', file: 'plot-grid.js',
    from: "  return k === 'u' || k === 'v' ? k : 'other';", to: "  return 'u';",
    breaks: ['read/kind-comes-from-the-extras-not-the-geometry',
             'read/an-untagged-strip-is-not-guessed-at',
             'census/the-page-agrees-with-the-file',
             'kind/u-only-and-v-only-are-different-line-sets',
             'kind/the-two-families-partition-the-grid',
             'kind/u-only-and-v-only-are-different-pictures',
             'density/the-v-slider-thins-v-and-leaves-u-alone'],
    // The partition check is on this list only because it was ANCHORED to the
    // file's own counts. In its first form — u + v = both — this mutation left
    // it green at 15148 + 0 = 15148.
  },
  {
    id: 'the-stride-is-ignored', file: 'plot-grid.js',
    from: '  if (every <= 1) return true;', to: '  if (every >= 1) return true;',
    // `readout/...` is on this list only because it was strengthened to agree
    // with the drawn state: naming the stride, which the panel still did, is
    // satisfied by a stride that does nothing.
    breaks: ['density/a-stride-thins-the-middle',
             'density/the-u-slider-thins-u-and-leaves-v-alone',
             'density/the-v-slider-thins-v-and-leaves-u-alone',
             'density/the-dead-travel-at-the-sparse-end-is-told',
             'density/thinning-the-grid-thins-the-picture',
             'readout/the-draw-panel-names-the-stride'],
    // The HATCH check is deliberately NOT on this list. With the stride ignored
    // every position of both sliders really does draw the same lines, and the
    // page hatches both tracks end to end — a true report of a broken state.
    // The mark is a biconditional against the range the page derived, so it
    // stays green here; what catches the mutation is that the read-out then
    // says "you are in it" at every position, including density 12.
  },
  {
    id: 'the-source-is-read-as-y-up', file: 'plot.js',
    from: 'container.rotation.x = -Math.PI / 2;', to: 'container.rotation.x = 0;',
    breaks: ['zup/the-attachment-ring-is-flat'],
  },
  {
    id: 'a-mesh-gltf-is-accepted-silently', file: 'plot.js',
    from: '  if (!info.strips.length) {', to: '  if (info.strips.length < 0) {',
    breaks: ['mesh/a-mesh-gltf-fails-visibly', 'mesh/the-message-names-what-it-found',
             'mesh/the-grid-on-screen-survives'],
  },
  {
    id: 'the-depth-dim-is-never-applied', file: 'plot.js',
    from: '  if (sph && s.depthDim > 0) {', to: '  if (sph && s.depthDim > 1e9) {',
    // The last of these is on the list only because it became a biconditional:
    // "0 is off" is satisfied by a dim that is never applied at any setting.
    breaks: ['dim/the-far-side-fades', 'dim/the-fog-is-solved-on-the-live-camera',
             'dim/zero-is-off-and-the-read-out-says-so'],
  },
  {
    id: 'the-weight-slider-does-nothing', file: 'plot.js',
    from: '  material.linewidth = s.weight;', to: '  material.linewidth = 1.1;',
    breaks: ['weight/changes-the-ink-and-not-the-lines'],
  },
  {
    id: 'the-far-plane-is-guessed-rather-than-solved', file: 'plot-grid.js',
    from: '  const t = 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);', to: '  const t = y;',
    breaks: ['dim/the-slider-inverts-smoothstep-exactly',
             'dim/the-fog-is-solved-on-the-live-camera'],
  },
];

// ===========================================================================
// A minimal GLB reader/writer, so the census can be recounted from the file
// itself and the failure fixtures can be built rather than committed.
function readGlb(buf) {
  const total = buf.readUInt32LE(8);
  let off = 12, json = null, bin = null;
  while (off < total) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body));
    if (type === 0x004E4942) bin = Buffer.from(body);
    off += 8 + len;
  }
  return { json, bin };
}
function writeGlb(json, bin) {
  const pad = (b, fill) => {
    const r = (4 - (b.length % 4)) % 4;
    return r ? Buffer.concat([b, Buffer.alloc(r, fill)]) : b;
  };
  const j = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const b = pad(bin || Buffer.alloc(0), 0);
  const chunks = [Buffer.alloc(8), j];
  chunks[0].writeUInt32LE(j.length, 0); chunks[0].writeUInt32LE(0x4E4F534A, 4);
  if (b.length) {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(b.length, 0); h.writeUInt32LE(0x004E4942, 4);
    chunks.push(h, b);
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([head, body]);
}

// The file's own census, counted here and not asked of the page.
function censusFromFile(json) {
  const live = new Set();
  const walk = i => { if (live.has(i)) return; live.add(i);
    for (const c of json.nodes[i].children || []) walk(c); };
  for (const n of json.scenes[json.scene ?? 0].nodes) walk(n);
  const c = { u: 0, v: 0, other: 0, strips: 0, uSegments: 0, vSegments: 0, otherSegments: 0, segments: 0 };
  const petals = new Set();
  for (const i of live) {
    const nd = json.nodes[i];
    if (nd.mesh === undefined) continue;
    if (nd.extras && Number.isFinite(nd.extras.petalIndex)) petals.add(nd.extras.petalIndex);
    for (const p of json.meshes[nd.mesh].primitives) {
      if ((p.mode ?? 4) !== 3) continue;                       // LINE_STRIP only
      const n = json.accessors[p.attributes.POSITION].count;
      if (n < 2) continue;
      const k = p.extras && (p.extras.kind === 'u' || p.extras.kind === 'v') ? p.extras.kind : 'other';
      c[k]++; c.strips++; c[`${k}Segments`] += n - 1; c.segments += n - 1;
    }
  }
  return { census: c, petals: petals.size };
}

// A triangles-only glTF: what someone drops when they reach for the STL-shaped
// export by mistake. Two triangles, mode 4, no line strips anywhere.
function meshOnlyGlb() {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0]);
  const bin = Buffer.from(pos.buffer);
  return writeGlb({
    asset: { version: '2.0', generator: 'verify-plot.mjs mesh fixture' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'a_solid' }],
    meshes: [{ name: 'a_solid', primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 6, type: 'VEC3',
                  min: [0, 0, 0], max: [1, 1, 0] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
    buffers: [{ byteLength: bin.length }],
  }, bin);
}

// The same grid with only its first four petals in the scene — a real second
// file for the swap, with a census that cannot be confused for the default's.
function trimmedGridGlb(json, bin, petals = 4) {
  const j = JSON.parse(JSON.stringify(json));
  j.scenes[j.scene ?? 0].nodes = j.scenes[j.scene ?? 0].nodes.slice(0, petals);
  return writeGlb(j, bin);
}

// ===========================================================================
let OVERRIDE = null;   // { file, text }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/plot') p = '/plot.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  const body = (OVERRIDE && p === '/' + OVERRIDE.file)
    ? Buffer.from(OVERRIDE.text, 'utf8') : readFileSync(f);
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(body);
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.PLOT_CHROME || '/opt/pw-browsers/chromium' });

async function loadGridModule(mutantId) {
  if (!mutantId || OVERRIDE.file !== 'plot-grid.js') return import('../plot-grid.js');
  const tmp = path.join(ROOT, `.plot-mutant-${mutantId}.js`);
  writeFileSync(tmp, OVERRIDE.text);
  try { return await import(`../.plot-mutant-${mutantId}.js?v=${Date.now()}`); }
  finally { setTimeout(() => { try { rmSync(tmp); } catch {} }, 0); }
}

// sRGB transfer, matching the shader's own encode — the calibration the
// additive check is measured against.
const srgb = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// ===========================================================================
async function run({ mutant = null } = {}) {
  const G = await loadGridModule(mutant);
  const {
    densityToEvery, everyLabel, keepsIndex, readGridScene, selectStrips,
    stripsToSegments, boundsOf, dimToFog, fogFactor, MIN_DENSITY, MAX_DENSITY,
  } = G;

  const checks = new Map(), details = new Map();
  const check = (name, ok, detail = '') => {
    checks.set(name, !!ok); details.set(name, detail);
    if (!mutant) console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
    return !!ok;
  };
  const log = (...a) => { if (!mutant) console.log(...a); };

  // =========================================================================
  // PART ONE — the shipped arithmetic, on answers that can be written down.
  log('\n--- part one: plot-grid.js, on fixtures whose answer is written down ---');

  // --- the density slider --------------------------------------------------
  const ladder = [];
  for (let d = MIN_DENSITY; d <= MAX_DENSITY; d++) ladder.push(densityToEvery(d));
  check('density/the-slider-runs-the-other-way-from-its-stride',
    ladder[ladder.length - 1] === 1 && ladder[0] === MAX_DENSITY
    && ladder.every((n, i) => i === 0 || n < ladder[i - 1]),
    `density ${MIN_DENSITY}..${MAX_DENSITY} -> stride ${ladder.join(',')}`);

  // Written down: over columns 0..9 at stride 3, the kept set is {0,3,6,9} —
  // multiples of three, plus both margins (9 is the last, and is also 3*3).
  // At stride 4 it is {0,4,8,9}: 9 survives ONLY because it is the margin.
  const keptAt = (last, every) => {
    const k = [];
    for (let i = 0; i <= last; i++) if (keepsIndex(i, last, every)) k.push(i);
    return k;
  };
  check('density/a-stride-thins-the-middle',
    keptAt(9, 3).join(',') === '0,3,6,9' && keptAt(9, 4).join(',') === '0,4,8,9'
    && keptAt(9, 1).length === 10,
    `stride 3 -> {${keptAt(9, 3)}} · stride 4 -> {${keptAt(9, 4)}}`);
  check('density/both-margins-are-always-kept',
    [1, 2, 3, 4, 7, 12].every(e => keepsIndex(0, 9, e) && keepsIndex(9, 9, e)),
    'the u family’s two margins are the petal’s own outline');

  // --- packing -------------------------------------------------------------
  // Written down: a 4-point strip is 3 segments, and the pairs run (0,1)(1,2)(2,3).
  const strip4 = { kind: 'u', index: 0, last: 0, count: 4, segments: 3,
                   points: Float32Array.from([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]) };
  const packed = stripsToSegments([strip4]);
  check('strips/a-strip-of-n-points-is-n-minus-one-segments',
    packed.segments === 3 && packed.positions.length === 18
    && [...packed.positions].filter((_, i) => i % 3 === 0).join(',') === '0,1,1,2,2,3',
    `4 points -> ${packed.segments} segments, ${packed.positions.length} floats`);

  // --- reading a scene -----------------------------------------------------
  const IDENT = { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
  const shift = (x, y, z) => ({ elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1] });
  const attr = pts => ({ count: pts.length / 3, getX: i => pts[i * 3],
                         getY: i => pts[i * 3 + 1], getZ: i => pts[i * 3 + 2] });
  const strip = (userData, pts, mw = IDENT, extra = {}) => ({
    isLine: true, children: [], matrixWorld: mw,
    geometry: { userData, getAttribute: () => attr(pts) }, ...extra,
  });
  const petalNode = (i, kids) => ({ userData: { petalIndex: i }, children: kids });

  // A strip tagged `v` whose points run exactly like a u-line. The family must
  // come from the tag, never from the shape.
  const longPts = [0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0];
  const shortPts = [0, 0, 0, 0, 1, 0];
  const sceneA = { children: [petalNode(0, [
    strip({ kind: 'u', column: 0 }, longPts),
    strip({ kind: 'u', column: 1 }, longPts),
    strip({ kind: 'v', row: 0 }, longPts),      // <- u-shaped, tagged v
    strip({ kind: 'v', row: 1 }, shortPts),
  ])] };
  const readA = readGridScene(sceneA);
  check('read/kind-comes-from-the-extras-not-the-geometry',
    readA.census.u === 2 && readA.census.v === 2
    && readA.strips.filter(s => s.kind === 'v').some(s => s.count === 5),
    `u ${readA.census.u} · v ${readA.census.v}; the u-shaped strip tagged v stayed in v`);
  check('read/petals-come-from-the-node-above-the-strip',
    readA.petals === 1 && readA.strips.every(s => s.petal === 0), `${readA.petals} petal`);

  const sceneB = { children: [petalNode(0, [
    strip({ kind: 'u', column: 0 }, longPts, shift(10, 0, 0)),
    strip({ panel: 'full' }, longPts),                       // no kind at all
    { isLineSegments: true, isLine: true, children: [],
      matrixWorld: IDENT, geometry: { userData: { kind: 'u' }, getAttribute: () => attr(longPts) } },
    { isMesh: true, children: [], matrixWorld: IDENT,
      geometry: { userData: {}, getAttribute: () => attr(new Array(27).fill(0)) } },
  ])] };
  const readB = readGridScene(sceneB);
  check('read/the-world-matrix-is-applied',
    Math.abs(readB.strips.find(s => s.kind === 'u').points[0] - 10) < 1e-6,
    'a strip under a translated parent comes back translated');
  check('read/an-untagged-strip-is-not-guessed-at',
    readB.census.other === 1 && readB.census.u === 1,
    `untagged ${readB.census.other} · u ${readB.census.u} — an untagged strip lands in its own bucket`);
  // Kind-independent on purpose: a LINES primitive pairs its vertices
  // differently, so what matters is that it never became a strip at all —
  // asked as a count, not as a claim about which family it did not join.
  check('read/line-segments-are-not-read-as-strips',
    readB.found.lineSegments === 1 && readB.found.meshes === 1 && readB.strips.length === 2,
    `${readB.strips.length} strips read from 4 objects; `
    + `${readB.found.lineSegments} LINES and ${readB.found.meshes} mesh counted, neither paired`);
  check('read/a-mesh-only-scene-yields-no-strips-and-says-what-it-found',
    readGridScene({ children: [sceneB.children[0].children[3]] }).strips.length === 0
    && readGridScene({ children: [sceneB.children[0].children[3]] }).found.triangles === 3,
    '3 triangles, 0 strips');

  // --- selection -----------------------------------------------------------
  // Records written down here rather than taken from readGridScene(), so the
  // selector is tested apart from the reader — a reader that mislabels every
  // strip would otherwise show up as a selector failure and hide behind it.
  const all = { families: 'both', uDensity: MAX_DENSITY, vDensity: MAX_DENSITY };
  const rec = (kind, index, last, n) => ({ kind, index, last, count: n, segments: n - 1,
                                           points: new Float32Array(n * 3) });
  const bag = [rec('u', 0, 1, 5), rec('u', 1, 1, 5), rec('v', 0, 1, 3), rec('v', 1, 1, 3),
               rec('other', -1, -1, 2)];
  const sel = k => selectStrips(bag, { ...all, families: k }).map(t => t.kind);
  check('select/the-family-switch-picks-exactly-one-family',
    sel('both').join(',') === 'u,u,v,v,other'
    && sel('u').join(',') === 'u,u,other' && sel('v').join(',') === 'v,v,other',
    `both {${sel('both')}} · u {${sel('u')}} · v {${sel('v')}}`);
  check('select/an-untagged-strip-is-drawn-under-every-switch',
    ['both', 'u', 'v'].every(f => sel(f).includes('other')),
    'a strip the format did not tag is never made unreachable');

  // --- the depth dim -------------------------------------------------------
  let worst = 0;
  for (const y of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const f = dimToFog(y, 12, 60);
    worst = Math.max(worst, Math.abs(fogFactor(f.near, f.far, 60) - y));
  }
  check('dim/the-slider-inverts-smoothstep-exactly', worst < 1e-9,
    `worst |asked - delivered| over 7 amounts: ${worst.toExponential(2)}`);
  const f50 = dimToFog(0.5, 12, 60);
  check('dim/the-near-end-of-the-model-is-untouched',
    f50.near === 12 && fogFactor(f50.near, f50.far, 12) === 0,
    'near is pinned at the nearest point, where the fade is exactly 0');
  check('dim/zero-and-a-degenerate-range-are-off',
    dimToFog(0, 12, 60) === null && dimToFog(0.5, 60, 60) === null, 'both return null');

  // =========================================================================
  // PART TWO — the page.
  log('\n--- part two: the page, measured on the rendered framebuffer ---');

  const raw = readGlb(readFileSync(path.join(ROOT, GRID)));
  const fileCensus = censusFromFile(raw.json);

  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    const f = path.join(ROOT, 'node_modules/three', rel);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
  });
  await ctx.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/plot`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
  const loaded = await page.evaluate(() => window.__plot.ready);

  const set = o => page.evaluate(o => {
    for (const [k, v] of Object.entries(o)) {
      const el = document.getElementById(k);
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, o);
  const view = (dir, margin = 1.06) => page.evaluate(([d, m]) =>
    window.__plot.setView(d, m), [dir, margin]);
  const px = () => page.evaluate(() => { window.__plot.settle(); return window.__plot.readPixels(); });
  const q = fn => page.evaluate(fn);
  // The DRAW read-out is written by the render, so force one before reading it
  // rather than sampling whatever the last frame happened to say.
  const drawTextNow = () => page.evaluate(() => {
    window.__plot.renderNow(); return window.__plot.drawText();
  });
  // Same reason: scene.fog is (re-)solved during the render against the live
  // camera, so it is read after one and not before.
  const fogNow = () => page.evaluate(() => {
    window.__plot.renderNow(); return window.__plot.fogInfo();
  });
  const DEFAULTS = { families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                     brightness: 30, depthDim: 55 };
  const reset = async (o = {}) => { await set({ ...DEFAULTS, ...o }); await view(VIEW); };

  await reset();
  const drawn0 = await q(() => window.__plot.drawn());
  check('load/the-default-grid-draws', loaded === true && drawn0.total > 0,
    `${drawn0.total} segments from ${await q(() => window.__plot.source())}`);

  // --- the census, recounted from the file ---------------------------------
  const pageCensus = await q(() => window.__plot.census());
  const pagePetals = await q(() => window.__plot.petals());
  const same = ['u', 'v', 'other', 'strips', 'uSegments', 'vSegments', 'segments']
    .every(k => pageCensus[k] === fileCensus.census[k]);
  check('census/the-page-agrees-with-the-file',
    same && pagePetals === fileCensus.petals,
    `file: ${fileCensus.census.u} u · ${fileCensus.census.v} v · ${fileCensus.census.segments} segments`
    + ` · ${fileCensus.petals} petals   page: ${pageCensus.u} u · ${pageCensus.v} v · `
    + `${pageCensus.segments} segments · ${pagePetals} petals`);

  const assetX = await q(() => window.__plot.assetExtras());
  check('readout/the-export-mode-is-surfaced',
    !!assetX && (await q(() => window.__plot.gridText())).includes(`mode ${assetX.mode}`),
    `mode ${assetX && assetX.mode} · units ${assetX && assetX.units}`);

  // --- the two families ----------------------------------------------------
  await reset({ families: 'u' }); const uOnly = await q(() => window.__plot.drawn());
  const uPix = await px();
  await reset({ families: 'v' }); const vOnly = await q(() => window.__plot.drawn());
  const vPix = await px();
  await reset({ families: 'both' }); const bothD = await q(() => window.__plot.drawn());
  check('kind/u-only-and-v-only-are-different-line-sets',
    uOnly.u > 0 && uOnly.v === 0 && vOnly.v > 0 && vOnly.u === 0 && uOnly.u !== vOnly.v,
    `u only: ${uOnly.u} segments · v only: ${vOnly.v}`);
  // ANCHORED TO THE FILE'S OWN PER-FAMILY COUNTS, not to a sum. `u + v = both`
  // is satisfied by collapsing every strip into one family (measured: the
  // reader mutation left it green at 15148 + 0 = 15148), so the numbers each
  // side has to hit come from the .glb.
  check('kind/the-two-families-partition-the-grid',
    uOnly.u === fileCensus.census.uSegments && vOnly.v === fileCensus.census.vSegments
    && bothD.u === uOnly.u && bothD.v === vOnly.v && uOnly.u + vOnly.v === bothD.total,
    `u ${uOnly.u} + v ${vOnly.v} = ${bothD.total}, against the file's `
    + `${fileCensus.census.uSegments} + ${fileCensus.census.vSegments}`);
  check('kind/u-only-and-v-only-are-different-pictures',
    uPix.hash !== vPix.hash && uPix.ink > 1000 && vPix.ink > 1000,
    `u ink ${uPix.ink} px · v ink ${vPix.ink} px, different framebuffers`);

  // --- density -------------------------------------------------------------
  const uLadder = [], vLadder = [];
  for (const d of [12, 9, 6, 3, 1]) {
    await set({ ...DEFAULTS, uDensity: d });
    uLadder.push(await q(() => window.__plot.drawn()));
  }
  for (const d of [12, 9, 6, 3, 1]) {
    await set({ ...DEFAULTS, vDensity: d });
    vLadder.push(await q(() => window.__plot.drawn()));
  }
  // NON-INCREASING WITH REAL STEPS, NOT STRICTLY DECREASING. A stride can only
  // thin a family down to its two margins, so the sparse end of each slider has
  // dead travel whose length is a property of the FILE (10 columns bottom out
  // at stride 10; 29 rows are still thinning at 12). The range is fixed and the
  // saturation is told rather than trimmed — the same ruling `stamenSpread`
  // got — so what is asserted is the thinning, the dead travel and the fact
  // that the page says which is which, in both directions.
  check('density/the-u-slider-thins-u-and-leaves-v-alone',
    uLadder.every((r, i) => i === 0 || r.u <= uLadder[i - 1].u)
    && new Set(uLadder.map(r => r.u)).size >= 4
    && uLadder.every(r => r.v === uLadder[0].v),
    `u segments ${uLadder.map(r => r.u).join(' >= ')} · v held at ${uLadder[0].v}`);
  check('density/the-v-slider-thins-v-and-leaves-u-alone',
    vLadder.every((r, i) => i === 0 || r.v <= vLadder[i - 1].v)
    && new Set(vLadder.map(r => r.v)).size >= 4
    && vLadder.every(r => r.u === vLadder[0].u),
    `v segments ${vLadder.map(r => r.v).join(' >= ')} · u held at ${vLadder[0].u}`);

  // The dead travel, in both directions: the page must mark the positions where
  // dragging further left changes nothing, and must NOT mark the ones where it
  // still thins.
  const sat = await page.evaluate(() => {
    const r = { u: [], v: [] };
    for (const k of ['u', 'v']) {
      for (let d = 1; d <= 12; d++) {
        r[k].push({ d, key: window.__plot.selectionKey(k, d),
                    bottom: window.__plot.sparsestReached(k, d) });
      }
    }
    return r;
  });
  // Against the SELECTION, not against a line count: two strides can keep the
  // same number of lines and different ones (stride 3 keeps {0,3,6,9} of ten
  // columns, stride 4 keeps {0,4,8,9}), and a count test called eight of the u
  // slider's twelve positions dead where four are.
  const honest = ['u', 'v'].every(k => sat[k].every(row =>
    row.bottom === (row.d > 1 && sat[k][row.d - 2].key === row.key)));
  const uDead = sat.u.filter(r => r.bottom).map(r => r.d);
  const vDead = sat.v.filter(r => r.bottom).map(r => r.d);
  // Read the u ROW of the read-out, not the whole panel: the v row's answer is
  // the v family's business and an empty family is legitimately at its sparsest.
  const uRow = async () => (await drawTextNow())
    .split('\n').find(l => l.startsWith('u ')) || '';
  // The named range must be the RUN the per-step answers imply, for BOTH
  // families — not this file's particular numbers. A family the page has no
  // strips for genuinely IS dead at every position, and hard-coding "v has
  // none" made the reader mutation, which empties v, look like a dead-travel
  // defect.
  const runFrom = k => { let d = 1; while (d < 12 && sat[k][d].bottom) d++; return d; };
  const rng = await q(() => window.__plot.deadRange());
  const rangeIsTheRun = ['u', 'v'].every(k => rng[k] === runFrom(k));
  await set({ ...DEFAULTS, uDensity: rng.u });
  const inIt = await uRow();
  await set({ ...DEFAULTS, uDensity: 12 });
  const outOfIt = await uRow();
  const namesIt = rng.u > 1
    ? inIt.includes(`density 1–${rng.u} all draw the same lines`) && inIt.includes('you are in it')
      && outOfIt.includes(`density 1–${rng.u} all draw the same lines`)
      && !outOfIt.includes('you are in it')
    : !inIt.includes('draw the same lines') && !outOfIt.includes('draw the same lines');
  check('density/the-dead-travel-at-the-sparse-end-is-told',
    honest && rangeIsTheRun && namesIt,
    `dead steps — u at density ${uDead.length ? uDead.join(',') : 'none'} `
    + `(10 columns per petal), v at ${vDead.length ? vDead.join(',') : 'none'} (29 rows). `
    + `The read-out names the RANGE — density 1–${rng.u} on u, `
    + `${rng.v > 1 ? `1–${rng.v}` : 'none'} on v — at every position, and says when the `
    + 'slider is inside it.');

  // THE RANGE IS TOLD ON THE CONTROL TOO — `stamenSpread`'s convention, applied
  // to a slider whose dead travel is at the left end: the span is hatched with
  // a tick at its right edge, and the range itself is NOT narrowed.
  const uMark = await q(() => window.__plot.trackMark('u'));
  const vMark = await q(() => window.__plot.trackMark('v'));
  const bounds = await q(() => {
    const el = document.getElementById('uDensity');
    return { min: +el.min, max: +el.max, step: +el.step };
  });
  // Both directions, from the range the page itself derived: hatched exactly
  // when there is dead travel, and to exactly its extent.
  const markOK = [['u', uMark], ['v', vMark]].every(([k, m]) => (rng[k] > 1
    ? m.hatched && m.upTo === rng[k] && Math.abs(+m.fraction - (rng[k] - 1) / 11) < 1e-3
    : !m.hatched && m.upTo === null && m.fraction === null));
  check('density/the-dead-range-is-hatched-on-the-track-and-the-range-is-not-narrowed',
    markOK && bounds.min === 1 && bounds.max === 12 && bounds.step === 1,
    `u track hatched to density ${uMark.upTo} (${uMark.fraction} of the travel), `
    + `v ${vMark.hatched ? `hatched to ${vMark.upTo}` : 'not hatched'}; the slider is still `
    + `${bounds.min}..${bounds.max} step ${bounds.step} — the range is told, not narrowed`);

  await reset({ families: 'u', depthDim: 0 });
  const inkDense = (await px()).ink;
  await set({ ...DEFAULTS, families: 'u', depthDim: 0, uDensity: 3 });
  const inkSparse = (await px()).ink;
  check('density/thinning-the-grid-thins-the-picture', inkSparse < inkDense * 0.9,
    `${inkDense} ink px at every line, ${inkSparse} at every 10th`);
  // NAMING THE STRIDE IS NOT ENOUGH: with the stride ignored the panel still
  // printed "every 10th" beside "280 of 280 lines" and this check stayed green
  // (measured). It now has to agree with the drawn state and show a thinned one.
  const thinnedRow = (await drawTextNow()).split('\n')[0];
  const thinnedDrawn = await q(() => window.__plot.drawn());
  const thinnedCensus = await q(() => window.__plot.census());
  check('readout/the-draw-panel-names-the-stride',
    thinnedRow.includes('every 10th')
    && thinnedRow.includes(`${thinnedDrawn.uLines} of ${thinnedCensus.u} lines`)
    && thinnedRow.includes(`${thinnedDrawn.u} segments`)
    && thinnedDrawn.uLines < thinnedCensus.u,
    thinnedRow);

  // --- additive blending ---------------------------------------------------
  const mat = await q(() => window.__plot.materialInfo());
  check('blend/the-material-is-additive', mat.additive === true && mat.depthTest === false,
    `blending ${mat.blending}, depthTest ${mat.depthTest}`);

  // THE CALIBRATION. With tone mapping off and the colour set in linear space,
  // a fully-covered single line is exactly sRGB(brightness); coverage and the
  // depth dim can only take it lower. Anything above it is accumulation.
  const blendRows = [];
  for (const b of [25, 40]) {
    await reset({ families: 'both', depthDim: 0, brightness: b });
    const p = await px();
    const ceil = Math.round(srgb(b / 100) * 255);
    let above = 0;
    for (let i = ceil + 6; i < 256; i++) above += p.hist[i];
    blendRows.push({ b, ceil, max: p.max, above, ink: p.ink });
  }
  check('blend/crossings-exceed-a-single-line',
    blendRows.every(r => r.max > r.ceil + 6 && r.above > 200),
    blendRows.map(r => `brightness ${r.b}%: one line tops out at ${r.ceil}/255, `
      + `the frame reaches ${r.max} with ${r.above} px above it`).join(' | '));

  // --- weight --------------------------------------------------------------
  await reset({ families: 'u', depthDim: 0, weight: 0.6 });
  const thin = await px(); const thinD = await q(() => window.__plot.drawn());
  await set({ ...DEFAULTS, families: 'u', depthDim: 0, weight: 4 });
  const fat = await px(); const fatD = await q(() => window.__plot.drawn());
  check('weight/changes-the-ink-and-not-the-lines',
    fat.ink > thin.ink * 1.5 && fatD.total === thinD.total
    && (await q(() => window.__plot.materialInfo())).linewidth === 4,
    `${thinD.total} segments at both ends; ink ${thin.ink} px at 0.6 px -> ${fat.ink} px at 4.0 px`);

  // --- the depth dim, on the live camera -----------------------------------
  await reset({ depthDim: 0 });
  const noDim = await px();
  const fogOff = await fogNow();
  const textOff = await drawTextNow();
  await set({ ...DEFAULTS, depthDim: 55 });
  const fogOn = await fogNow();
  const textOn = await drawTextNow();
  // BOTH DIRECTIONS. "0 is off" alone is satisfied by a dim that is never
  // applied at any setting — measured: that mutation left the one-sided form
  // green.
  check('dim/zero-is-off-and-the-read-out-says-so',
    fogOff === null && textOff.includes('depth dim off')
    && fogOn !== null && textOn.includes('depth dim 55%')
    && textOn.includes('45% of its brightness'),
    'null and "off" at 0; a fog and "the farthest line draws at 45%" at 55');

  const dimRows = [];
  for (const d of [30, 60, 90]) {
    await set({ ...DEFAULTS, depthDim: d });
    const p = await px();
    const fog = await fogNow();
    const range = await q(() => window.__plot.depthRange());
    dimRows.push({ d, sum: p.sum, fog, range });
  }
  check('dim/the-far-side-fades',
    dimRows.every((r, i) => r.sum < (i === 0 ? noDim.sum : dimRows[i - 1].sum)),
    `total ink ${noDim.sum} off -> ${dimRows.map(r => r.sum).join(' > ')} at 30/60/90%`);
  const solved = dimRows.every(r => r.fog && r.range
    && Math.abs(r.fog.near - r.range.near) < 1e-3
    && Math.abs(fogFactor(r.fog.near, r.fog.far, r.range.far) - r.d / 100) < 1e-6);
  check('dim/the-fog-is-solved-on-the-live-camera', solved,
    dimRows.map(r => `${r.d}%: near ${r.fog ? r.fog.near.toFixed(2) : '—'} vs model `
      + `${r.range.near.toFixed(2)}, delivered `
      + `${r.fog ? (fogFactor(r.fog.near, r.fog.far, r.range.far) * 100).toFixed(3) : '—'}%`).join(' | '));

  // --- the Z-up correction -------------------------------------------------
  await reset();
  const att = await q(() => window.__plot.attachmentsWorld());
  const ys = att.map(a => a[1]);
  const spread = a => Math.max(...a) - Math.min(...a);
  check('zup/the-attachment-ring-is-flat',
    att.length > 4 && spread(ys) < 1e-4
    && spread(att.map(a => a[0])) > 1 && spread(att.map(a => a[2])) > 1,
    `${att.length} attachments: y spread ${spread(ys).toExponential(1)}, `
    + `x ${spread(att.map(a => a[0])).toFixed(2)}, z ${spread(att.map(a => a[2])).toFixed(2)}`);

  // --- orbit ---------------------------------------------------------------
  // The drag starts in the GAP between the two fixed columns, measured from
  // their real bounding boxes — a pointerdown that lands on a panel never
  // reaches the canvas and the orbit under test never happens.
  const gap = await q(() => {
    const l = document.getElementById('plot-left').getBoundingClientRect();
    const r = document.getElementById('plot-side').getBoundingClientRect();
    return { x: (l.right + r.left) / 2, y: window.innerHeight * 0.72,
             left: l.right, right: r.left };
  });
  const camBefore = await q(() => window.__plot.cameraInfo());
  const pixBefore = await px();
  await page.mouse.move(gap.x, gap.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(gap.x - i * 9, gap.y - i * 4);
  await page.mouse.up();
  const camAfter = await q(() => { window.__plot.settle(); return window.__plot.cameraInfo(); });
  const pixAfter = await px();
  const moved = Math.hypot(...camAfter.position.map((v, i) => v - camBefore.position[i]));
  check('orbit/a-drag-changes-the-projection',
    moved > camBefore.distance * 0.05 && pixAfter.hash !== pixBefore.hash,
    `camera moved ${moved.toFixed(1)} of a ${camBefore.distance.toFixed(1)} standoff, `
    + `drag started at x=${gap.x.toFixed(0)} (panels end ${gap.left.toFixed(0)} / `
    + `${gap.right.toFixed(0)}), framebuffer changed`);

  // --- a file that is not a grid -------------------------------------------
  const drop = async (bytes, name) => {
    await page.evaluate(async ([b64, n]) => {
      const bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const f = new File([arr], n, { type: 'model/gltf-binary' });
      const dt = new DataTransfer(); dt.items.add(f);
      document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 350));
    }, [Buffer.from(bytes).toString('base64'), name]);
  };

  await reset();
  const beforeBad = await q(() => window.__plot.drawn());
  await drop(meshOnlyGlb(), 'a-solid.glb');
  const meshErr = await q(() => window.__plot.error());
  const afterMesh = await q(() => window.__plot.drawn());
  check('mesh/a-mesh-gltf-fails-visibly', meshErr.length > 0
    && (await q(() => window.__plot.gridText())).includes(meshErr.slice(0, 40)),
    meshErr || '(no error reported)');
  check('mesh/the-message-names-what-it-found',
    /LINE_STRIP/.test(meshErr) && /triangle/.test(meshErr) && /mesh glTF/.test(meshErr),
    meshErr);
  check('mesh/the-grid-on-screen-survives',
    afterMesh.total === beforeBad.total && (await q(() => window.__plot.source())) === 'bloom-grid-live.glb',
    `${afterMesh.total} segments still drawn, source still `
    + `${await q(() => window.__plot.source())}`);

  // Its own baseline, taken after whatever the previous drop did: chaining it
  // off the mesh check's baseline made it a second casualty of that mutation
  // rather than a witness of its own.
  const beforeGarbage = await q(() => window.__plot.drawn());
  const sourceBefore = await q(() => window.__plot.source());
  await drop(Buffer.from('this is not a glb, it is a sentence about one'), 'notes.glb');
  check('bytes/garbage-is-reported-and-not-thrown',
    (await q(() => window.__plot.error())).length > 0
    && (await q(() => window.__plot.drawn())).total === beforeGarbage.total
    && (await q(() => window.__plot.source())) === sourceBefore
    && errs.length === 0,
    (await q(() => window.__plot.error())).slice(0, 90));

  // --- swapping in a real second grid ---------------------------------------
  const trimmed = trimmedGridGlb(raw.json, raw.bin, 4);
  await drop(trimmed, 'bloom-grid-4petals.glb');
  const swapped = await q(() => ({ c: window.__plot.census(), s: window.__plot.source(),
                                   p: window.__plot.petals(), e: window.__plot.error() }));
  const trimmedCensus = censusFromFile(readGlb(trimmed).json);
  check('swap/a-dropped-grid-replaces-the-one-on-screen',
    swapped.s === 'bloom-grid-4petals.glb' && swapped.p === 4 && swapped.e === ''
    && swapped.c.segments === trimmedCensus.census.segments
    && swapped.c.segments < fileCensus.census.segments,
    `${swapped.p} petals, ${swapped.c.segments} segments (the file says `
    + `${trimmedCensus.census.segments}); was ${fileCensus.census.segments}`);

  const tmpFile = path.join(os.tmpdir(), 'bloom-grid-live.glb');
  writeFileSync(tmpFile, readFileSync(path.join(ROOT, GRID)));
  await page.setInputFiles('#gridFile', tmpFile);
  await page.waitForFunction(() => window.__plot.petals() === 28, null, { timeout: 15000 })
    .catch(() => {});
  rmSync(tmpFile, { force: true });
  check('swap/the-file-input-loads-a-grid-too',
    (await q(() => window.__plot.petals())) === 28
    && (await q(() => window.__plot.census())).segments === fileCensus.census.segments
    && (await q(() => window.__plot.source())) === 'bloom-grid-live.glb',
    `back to ${await q(() => window.__plot.petals())} petals via the file input`);

  // --- the panels ----------------------------------------------------------
  const panels = await q(() => [...document.querySelectorAll('details.panel')]
    .map(d => ({ id: d.id, summary: d.querySelector('summary').textContent.trim(), open: d.open })));
  check('panels/every-panel-is-present-and-is-a-details',
    panels.length === 3 && panels.every(p => p.open)
    && panels.map(p => p.summary).join('|') === 'LOAD GRID|GRID|DRAW',
    panels.map(p => `${p.summary}(${p.id})`).join(' · '));

  // Driven through `brightness`, which no mutation in this file touches, so
  // this check reports on the panel and not on whatever else is broken. It
  // asserts the control reached the MATERIAL and that the frame was redrawn.
  await reset();
  const beforeCollapse = await q(() => window.__plot.materialInfo());
  const pixCollapseBefore = await px();
  await q(() => { document.getElementById('plot-draw').open = false; });
  await set({ ...DEFAULTS, brightness: 80 });
  const whileCollapsed = await q(() => window.__plot.materialInfo());
  const pixCollapseAfter = await px();
  const stillShut = await q(() => document.getElementById('plot-draw').open);
  await q(() => { document.getElementById('plot-draw').open = true; });
  check('panels/a-collapsed-panel-still-drives-the-draw',
    stillShut === false && Math.abs(whileCollapsed.colorLinear - 0.8) < 1e-6
    && whileCollapsed.colorLinear !== beforeCollapse.colorLinear
    && pixCollapseAfter.hash !== pixCollapseBefore.hash,
    `brightness ${beforeCollapse.colorLinear} -> ${whileCollapsed.colorLinear} with DRAW shut, `
    + 'and the framebuffer changed');

  // --- cost ----------------------------------------------------------------
  await reset({ families: 'both', uDensity: 12, vDensity: 12 });
  const frames = await q(() => { window.__plot.settle();
    const a = []; for (let i = 0; i < 15; i++) a.push(window.__plot.renderNow()); return a; });
  const median = frames.slice().sort((a, b) => a - b)[Math.floor(frames.length / 2)];
  check('cost/the-frame-is-trivial', median < 5,
    `${median.toFixed(2)} ms median over 15 settled frames at all `
    + `${fileCensus.census.segments} segments (worst ${Math.max(...frames).toFixed(2)} ms)`);

  check('page/no-errors', errs.length === 0, errs.join(' | '));
  if (!mutant) {
    log('\n--- GRID ---\n' + await q(() => window.__plot.gridText()));
    log('\n--- DRAW ---\n' + await q(() => window.__plot.drawText()));
  }
  await ctx.close();
  return { checks, details, errs, ok: [...checks.values()].every(Boolean) };
}

// ===========================================================================
const main = await run({});
console.log('\npage errors:', main.errs.length ? main.errs : 'none');
const failed = [...main.checks].filter(([, v]) => !v).map(([k]) => k);
console.log(`\n${main.checks.size} checks, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);

let mutantsOK = true;
if (NEG) {
  console.log('\n=== negative control ===');
  const wanted = ONLY ? ONLY.split(',') : null;
  for (const m of MUTANTS) {
    if (wanted && !wanted.includes(m.id)) continue;
    const src = readFileSync(path.join(ROOT, m.file), 'utf8');
    if (!src.includes(m.from)) {
      console.log(`  [FAIL] ${m.id}: mutation did not apply — the source it edits has moved`);
      mutantsOK = false; continue;
    }
    OVERRIDE = { file: m.file, text: src.replace(m.from, m.to) };
    const r = await run({ mutant: m.id });
    OVERRIDE = null;
    const red = [...r.checks].filter(([, v]) => !v).map(([k]) => k);
    const missed = m.breaks.filter(k => !red.includes(k));
    const extra = red.filter(k => !m.breaks.includes(k));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) mutantsOK = false;
    console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${m.id.padEnd(46)} red: ${red.length ? red.join(', ') : '(none)'}`);
    if (missed.length) console.log(`         MISSED (stayed green): ${missed.join(', ')}`);
    if (extra.length) console.log(`         UNCLAIMED (also red): ${extra.join(', ')}`);
    if (!ok) for (const k of [...missed, ...extra]) console.log(`           ${k}: ${r.details.get(k) || '(no detail)'}`);
  }
} else {
  console.log('\n(negative control not run — pass --negative-control to falsify every assertion above)');
}

await browser.close();
server.close();
const ok = main.ok && mutantsOK;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
