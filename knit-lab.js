// knit-lab.js — the page: starts the simulation (in a Web Worker, knit-lab-worker.js), draws what it
// reports, logs the load-unload test and plots it. The simulation is knit-lab-sim.js, driven by
// knit-lab-engine.js; the knit is knit-lab-topology.js; the readings are knit-lab-analysis.js.

import { PARAMS } from './knit-lab-sim.js';
import { findJam, cycleStats } from './knit-lab-analysis.js';

// Experiments: any PARAMS key can be overridden from the URL hash, e.g.
// knit-lab.html#FRICTION=0&PULL_SPEED=4 (and #WALES=12&COURSES=8, #SWATCH=eyelet). #WORKER=0 runs
// the simulation on the page's own thread, as the first version did (for comparison).
const HASH = new URLSearchParams(location.hash.slice(1));
const OVERRIDE = {};
for (const [k, v] of HASH) if (k in PARAMS) OVERRIDE[k] = typeof PARAMS[k] === 'number' ? +v : v;
const WALES = Math.max(2, +HASH.get('WALES') || 10), COURSES = Math.max(3, +HASH.get('COURSES') || 10);
const USE_WORKER = HASH.get('WORKER') !== '0' && typeof Worker !== 'undefined';
const P = { ...PARAMS, ...OVERRIDE };
const CHUNK = 3;                 // segments per depth-sorted drawing chunk

const css = getComputedStyle(document.documentElement);
const tok = (n, f) => (css.getPropertyValue(n).trim() || f);
const INK = tok('--ink', '#e9ecec'), PETROL = tok('--petrol-bright', '#2fa3a3'), LINE = tok('--line', '#232727'), DIM = tok('--ink-dim', '#8b9494'), BLACK = tok('--black', '#060707');

const canvas = document.getElementById('klCanvas'), ctx = canvas.getContext('2d');
const chart = document.getElementById('klChart'), cctx = chart.getContext('2d');
const $ = id => document.getElementById(id);

let swatch = HASH.get('SWATCH') === 'eyelet' ? 'eyelet' : 'plain';
let init = null, st = null, view = null, drawMs = 0, paused = false, log = [], drag = null, dirty = false;
const results = {};              // per swatch: the last completed test { rows, jam, cycle, restHeight }
const raf = { last: 0, maxGapSettling: 0, maxGapTesting: 0, frames: 0 };

// ---- the engine ------------------------------------------------------------------------------
let send;
if (USE_WORKER) {
  const worker = new Worker('knit-lab-worker.js', { type: 'module' });
  worker.onmessage = e => receive(e.data);
  worker.onerror = e => { $('klStatus').textContent = `worker failed: ${e.message || e}`; };
  send = m => worker.postMessage(m);
} else {
  const { createEngine } = await import('./knit-lab-engine.js');
  const engine = createEngine(m => queueMicrotask(() => receive(m)), 80);   // the first version's 80 ms bursts
  send = m => engine(m);
}

function receive(m) {
  if (m.type === 'error') { $('klStatus').textContent = m.message; return; }
  if (m.type === 'init') { init = m; st = null; view = null; log = []; return; }
  if (m.type === 'grabbed') { if (drag) drag.off0 = m.pullOffset; return; }
  if (m.type !== 'state' || !init || m.gen !== init.gen) return;
  const wasDone = st && st.phase === 'done';
  st = m; dirty = true;
  if (m.rows.length) log.push(...m.rows);
  if (m.phase === 'done' && !wasDone && log.length) {
    results[swatch] = { rows: log.slice(), jam: findJam(log), cycle: cycleStats(log, m.restHeight), restHeight: m.restHeight, peak: m.peak, loadEnd: m.loadEnd };
  }
}

function start(sw = swatch) {
  swatch = sw; init = null; st = null; view = null; log = []; drag = null;
  document.querySelectorAll('[data-swatch]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.swatch === swatch)));
  $('klTest').disabled = true; $('klCsv').disabled = true;
  send({ type: 'start', swatch, params: OVERRIDE, wales: WALES, courses: COURSES });
}

// ---- view: fit the swatch, with room above it for the pull -----------------------------------
function bounds(x, n) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { const a = x[3 * i], b = x[3 * i + 1]; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }
  return { x0, x1, y0, y1 };
}
function fitTarget(b) {
  let y1 = b.y1;
  if (st.restHeight || st.phase === 'settled') {
    const h = st.restHeight || (b.y1 - b.y0);
    y1 = Math.max(b.y1, b.y0 + h * 1.55 + (b.y1 - b.y0 - h));
  }
  const W = canvas.clientWidth, H = canvas.clientHeight, pad = 28;
  const s = Math.min((W - 2 * pad) / (b.x1 - b.x0), (H - 2 * pad) / (y1 - b.y0));
  return { s, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + y1) / 2 };
}
function updateView(b) {
  const t = fitTarget(b);
  if (!view || st.phase === 'settling') view = view ? { s: lerp(view.s, t.s), cx: lerp(view.cx, t.cx), cy: lerp(view.cy, t.cy) } : t;
  else if (!view.frozen) view = { ...t, frozen: st.phase !== 'settled' };
}
const lerp = (a, b) => a + (b - a) * 0.15;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  for (const c of [canvas, chart]) { c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr); }
  if (view) view.frozen = false;
  dirty = true;
  if (st && init) drawChart();   // resizing a canvas clears it; the chart is otherwise redrawn only every 4th frame
}

// ---- drawing: shaded tubes, back to front -----------------------------------------------------
let order = null, keys = null;
function draw(b) {
  const dpr = window.devicePixelRatio || 1, W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BLACK; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(dpr, 0, 0, dpr, canvas.clientWidth / 2 * dpr, canvas.clientHeight / 2 * dpr);
  const x = st.x, n = init.n, s = view.s, cx = view.cx, cy = view.cy;
  const sx = i => (x[3 * i] - cx) * s, sy = i => -(x[3 * i + 1] - cy) * s;
  {   // bottom jaw
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) if (init.grip[i] === 1) { const y = x[3 * i + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    ctx.fillStyle = 'rgba(47,163,163,0.08)';
    ctx.fillRect((b.x0 - cx) * s - 10, -(y1 - cy) * s - 4, (b.x1 - b.x0) * s + 20, (y1 - y0) * s + 8);
  }
  const nChunks = Math.ceil((n - 1) / CHUNK);
  if (!order || order.length !== nChunks) { order = new Int32Array(nChunks); keys = new Float64Array(nChunks); }
  let z0 = Infinity, z1 = -Infinity;
  for (let k = 0; k < nChunks; k++) {
    const a = k * CHUNK, e = Math.min(n - 1, a + CHUNK);
    let z = 0; for (let i = a; i <= e; i++) z += x[3 * i + 2];
    keys[k] = z / (e - a + 1); order[k] = k;
    if (keys[k] < z0) z0 = keys[k]; if (keys[k] > z1) z1 = keys[k];
  }
  order.sort((p, q) => keys[p] - keys[q]);
  const d = P.YARN_DIAMETER * s, stripes = $('klStripes').checked;
  ctx.lineJoin = 'round';
  const zr = Math.max(1e-6, z1 - z0);
  let pinsDrawn = false;
  for (let o = 0; o < nChunks; o++) {
    const k = order[o], a = k * CHUNK, e = Math.min(n - 1, a + CHUNK);
    if (!pinsDrawn && keys[k] > 0) { drawPins(s, cx, cy); pinsDrawn = true; }
    const shade = 0.45 + 0.55 * (keys[k] - z0) / zr;
    const c = init.course[a];
    const base = stripes && Math.floor(c) % 2 === 1 ? [47, 163, 163] : [233, 236, 236];
    ctx.beginPath(); ctx.moveTo(sx(a), sy(a));
    for (let i = a + 1; i <= e; i++) ctx.lineTo(sx(i), sy(i));
    ctx.lineCap = 'butt'; ctx.strokeStyle = BLACK; ctx.lineWidth = d + Math.max(1, d * 0.18); ctx.stroke();
    ctx.lineCap = 'round'; ctx.strokeStyle = rgb(base, shade * 0.78); ctx.lineWidth = d; ctx.stroke();
    if (d > 3) {
      ctx.save(); ctx.translate(-d * 0.14, -d * 0.14);
      ctx.strokeStyle = rgb(base, Math.min(1, shade * 1.05)); ctx.lineWidth = d * 0.38; ctx.stroke();
      ctx.restore();
    }
  }
  if (!pinsDrawn) drawPins(s, cx, cy);
}
function drawPins(s, cx, cy) {   // the comb, seen end on: the pins run straight into the screen
  const r = P.PIN_RADIUS * s;
  ctx.fillStyle = '#34393a'; ctx.strokeStyle = PETROL; ctx.lineWidth = 1;
  for (const p of init.pins) { ctx.beginPath(); ctx.arc((p.x - cx) * s, -(p.y + st.pullOffset - cy) * s, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }
}
const rgb = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// ---- the load-unload plot: loading in petrol, unloading in ink; the other swatch's last test
// faint behind; a tick at each jam. Load on a LOG axis: the curve climbs three decades from the
// soft region to the limit, and on a linear axis everything below the jam is one flat line.
function drawChart() {
  const dpr = window.devicePixelRatio || 1, W = chart.width, H = chart.height;
  cctx.setTransform(1, 0, 0, 1, 0, 0); cctx.fillStyle = BLACK; cctx.fillRect(0, 0, W, H);
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = chart.clientWidth, h = chart.clientHeight, L = 34, B = 20, T = 8, R = 8;
  const other = results[swatch === 'plain' ? 'eyelet' : 'plain'];
  const all = [...log, ...(other ? other.rows : [])];
  const xmax = Math.max(0.2, ...all.map(p => p.ext)) * 1.05;
  const lo = 1e3, ymax = Math.max(P.LOAD_LIMIT, ...all.map(p => p.load)) * 1.3, span = Math.log10(ymax / lo);
  const X = e => L + (w - L - R) * Math.max(0, e) / xmax, Y = v => T + (h - T - B) * (1 - Math.log10(Math.max(lo, v) / lo) / span);
  cctx.strokeStyle = LINE; cctx.lineWidth = 1;
  cctx.strokeRect(L + 0.5, T + 0.5, w - L - R, h - T - B);
  cctx.fillStyle = DIM; cctx.font = '10px "IBM Plex Mono", monospace';
  const step = xmax > 0.45 ? 0.2 : 0.1;
  for (let e = 0; e <= xmax + 1e-9; e += step) cctx.fillText(`${Math.round(e * 100)}%`, X(e) - 8, h - 6);
  for (let v = lo; v <= ymax; v *= 10) { cctx.fillText(`1e${Math.round(Math.log10(v))}`, 2, Y(v) + 3); cctx.strokeStyle = '#141818'; cctx.beginPath(); cctx.moveTo(L + 1, Y(v) + 0.5); cctx.lineTo(w - R, Y(v) + 0.5); cctx.stroke(); }
  const path = (rs, color, width, dash = []) => {
    if (rs.length < 2) return;
    cctx.strokeStyle = color; cctx.lineWidth = width; cctx.setLineDash(dash); cctx.beginPath();
    rs.forEach((p, i) => (i ? cctx.lineTo(X(p.ext), Y(p.load)) : cctx.moveTo(X(p.ext), Y(p.load))));
    cctx.stroke(); cctx.setLineDash([]);
  };
  const jamTick = (j, color) => { if (!j || !Number.isFinite(j.ext)) return; cctx.strokeStyle = color; cctx.lineWidth = 1; cctx.beginPath(); cctx.moveTo(X(j.ext), h - B); cctx.lineTo(X(j.ext), h - B - 6); cctx.stroke(); };
  if (other) { path(other.rows.filter(r => r.phase === 'pulling'), '#3d4646', 1.2, [3, 3]); path(other.rows.filter(r => r.phase !== 'pulling'), '#3d4646', 1.2, [1, 2]); jamTick(other.jam, '#3d4646'); }
  path(log.filter(r => r.phase === 'pulling'), PETROL, 1.6);
  path(log.filter(r => r.phase !== 'pulling'), INK, 1.3);
  if (results[swatch] && st && st.phase === 'done') jamTick(results[swatch].jam, PETROL);
}

// ---- readouts --------------------------------------------------------------------------------
function readouts() {
  const r = results[swatch], o = results[swatch === 'plain' ? 'eyelet' : 'plain'];
  const pct = v => Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—';
  const rows = [
    ['swatch', init.label],
    ['phase', st.phase + (st.loadEnd && st.phase !== 'pulling' ? ` (loading ended on ${st.loadEnd})` : '')],
    ['simulation thread', USE_WORKER ? 'Web Worker' : 'this page (#WORKER=0)'],
    ['points / contact pairs', `${init.n} / ${st.nPairs}`],
    ['yarn length per loop', `${init.loopLength.toFixed(1)} d`],
    ['friction μ', `${init.params.FRICTION}`],
    ['ms per sim frame / substep', `${st.timing.frameMs.toFixed(1)} / ${st.timing.msPerSubstep.toFixed(2)}`],
    ['ms to draw a frame', drawMs.toFixed(1)],
    ['settle', st.settledAt ? `${st.settledAt.frames} frames · ${(st.settleWallMs / 1000).toFixed(1)} s wall` : `${st.settleFrames} frames…`],
    ['jaw gap', `${st.jawGap.toFixed(1)} d`],
    ['closest yarn approach', `${st.closest.toFixed(3)} d`],
    ['overlaps > ½ d now / worst', `${st.overlaps} / ${st.worstDeep}`, st.worstDeep > 0],
    ['largest yarn strain', `${(st.maxStrain * 100).toFixed(3)}%`, st.maxStrain > 0.01],
    ['extension', st.restHeight ? pct(st.extension) : '—'],
    ['load: bottom jaw / comb', `${st.stats.loadBottom.toFixed(0)} / ${st.stats.loadTop.toFixed(0)}`],
    ['jam (stiffness ×10 the soft region)', r ? `${pct(r.jam.ext)} at load ${Math.round(r.jam.load)}` : '—'],
    ['hysteresis (loading work lost)', r ? pct(r.cycle.lossFraction) : '—'],
    ['permanent set', r ? pct(r.cycle.set) : '—'],
  ];
  if (o) rows.push([`last ${o === results.plain ? 'plain' : 'eyelet'} test (grey)`, `jam ${pct(o.jam.ext)} · lost ${pct(o.cycle.lossFraction)} · set ${pct(o.cycle.set)}`]);
  $('klRo').innerHTML = rows.map(([k, v, bad]) => `<dt>${k}</dt><dd${bad ? ' class="is-bad"' : ''}>${v}</dd>`).join('');
  $('klProgress').style.width = `${(st.settleProgress * 100).toFixed(1)}%`;
  $('klStatus').textContent = st.phase === 'settling' ? `settling — ${Math.round(st.settleProgress * 100)}%`
    : st.phase === 'settled' ? 'settled. Run the test, or drag above the top course.'
    : st.phase === 'pulling' ? (st.pullAuto ? `loading at constant speed, until the bottom jaw reads ${P.LOAD_LIMIT.toExponential(1)}…` : 'pulling by hand')
    : st.phase === 'unloading' ? 'unloading: the comb going back to where it started…'
    : st.phase === 'returned' ? 'back at the start, holding…'
    : st.phase === 'done' ? `test done: ${r ? `jam at ${pct(r.jam.ext)}, ${pct(r.cycle.lossFraction)} of the loading work lost, set ${pct(r.cycle.set)}` : ''}` : st.phase;
  $('klTest').disabled = st.phase === 'settling' || (st.phase === 'pulling' && st.pullAuto) || st.phase === 'unloading' || st.phase === 'returned';
  $('klCsv').disabled = !log.length;
}

// ---- loop ------------------------------------------------------------------------------------
let roTick = 0;
function frame(t) {
  if (raf.last && st) {
    const gap = t - raf.last;
    if (st.phase === 'settling') raf.maxGapSettling = Math.max(raf.maxGapSettling, gap);
    else if (st.phase !== 'settled' && st.phase !== 'done') raf.maxGapTesting = Math.max(raf.maxGapTesting, gap);
  }
  raf.last = t; raf.frames++;
  if (st && init && (dirty || !view)) {
    const b = bounds(st.x, init.n);
    updateView(b);
    const td = performance.now(); draw(b); drawMs = performance.now() - td;
    dirty = false;
    if (++roTick % 4 === 0) { readouts(); drawChart(); }
  }
  requestAnimationFrame(frame);
}

// ---- controls --------------------------------------------------------------------------------
document.querySelectorAll('[data-swatch]').forEach(b => b.addEventListener('click', () => start(b.dataset.swatch)));
$('klTest').addEventListener('click', () => { log = []; send({ type: 'test' }); });
$('klPause').addEventListener('click', e => { paused = !paused; e.target.textContent = paused ? 'Resume' : 'Pause'; send({ type: 'pause', value: paused }); });
$('klRestart').addEventListener('click', () => start());
$('klCsv').addEventListener('click', () => {
  const csv = 'extension,load_bottom,load_top,max_strain,phase\n' + log.map(p => `${p.ext.toFixed(5)},${p.load.toFixed(3)},${p.top.toFixed(3)},${p.strain.toFixed(6)},${p.phase}`).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `knit-lab-${swatch}-load-unload.csv`; a.click();
});
const worldY = e => { const r = canvas.getBoundingClientRect(); return view.cy - (e.clientY - r.top - r.height / 2) / view.s; };
const topY = () => bounds(st.x, init.n).y1;
canvas.addEventListener('pointermove', e => {
  if (!st || !view) return;
  const pullable = st.phase !== 'settling' && worldY(e) > topY() - 3 * P.YARN_DIAMETER;
  canvas.classList.toggle('is-pullable', pullable || !!drag);
  if (drag) send({ type: 'drag', target: drag.off0 + worldY(e) - drag.y0 });
});
canvas.addEventListener('pointerdown', e => {
  if (!st || !view || st.phase === 'settling' || worldY(e) < topY() - 3 * P.YARN_DIAMETER) return;
  if (st.phase === 'settled' || st.pullAuto || st.phase === 'done') log = [];
  drag = { y0: worldY(e), off0: st.pullOffset };
  send({ type: 'grab' });
  canvas.setPointerCapture(e.pointerId);
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
window.addEventListener('resize', resize);

window.__knitLab = { PARAMS: P, USE_WORKER, raf, results, start, send, get swatch() { return swatch; }, get state() { return st; }, get init() { return init; }, get log() { return log; }, get drawMs() { return drawMs; } };
resize(); start(); requestAnimationFrame(frame);
