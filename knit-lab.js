// knit-lab.js — the page: runs KnitSim, draws it, logs the pull. The simulation is
// knit-lab-sim.js and the knit is knit-lab-topology.js; this file only reads them.

import { makeStockinette, validateTopology } from './knit-lab-topology.js';
import { KnitSim, PARAMS } from './knit-lab-sim.js';

// Experiments: any PARAMS key can be overridden from the URL hash, e.g.
// knit-lab.html#FRICTION=0.1&PULL_SPEED=4 (and #WALES=12&COURSES=8).
const HASH = new URLSearchParams(location.hash.slice(1));
for (const [k, v] of HASH) if (k in PARAMS && Number.isFinite(+v)) PARAMS[k] = +v;
const WALES = Math.max(2, +HASH.get('WALES') || 10), COURSES = Math.max(3, +HASH.get('COURSES') || 10);
const SETTLE_BUDGET_MS = 80;     // while settling, run as many sim frames per animation frame as fit (the bar still moves)
const CHUNK = 3;                 // segments per depth-sorted drawing chunk

const css = getComputedStyle(document.documentElement);
const tok = (n, f) => (css.getPropertyValue(n).trim() || f);
const INK = tok('--ink', '#e9ecec'), PETROL = tok('--petrol-bright', '#2fa3a3'), LINE = tok('--line', '#232727'), DIM = tok('--ink-dim', '#8b9494'), BLACK = tok('--black', '#060707');

const canvas = document.getElementById('klCanvas'), ctx = canvas.getContext('2d');
const chart = document.getElementById('klChart'), cctx = chart.getContext('2d');
const $ = id => document.getElementById(id);

let sim, view, drawMs = 0, paused = false, log = [], worstDeep = 0, settleWallMs = 0, settleWallStart = 0, drag = null;

function start() {
  const topo = makeStockinette(WALES, COURSES);
  const bad = validateTopology(topo);
  if (bad.length) throw new Error('topology: ' + bad.join('; '));
  sim = new KnitSim(topo, PARAMS);
  view = null; log = []; worstDeep = 0; settleWallMs = 0; settleWallStart = performance.now();
  $('klPull').disabled = true; $('klCsv').disabled = true;
  window.__knitLab.sim = sim;
}

// ---- view: fit the swatch, with room above it for the pull -----------------------------------
function fitTarget() {
  const b = sim.bounds();
  let y1 = b.y1;
  if (sim.restHeight || sim.phase === 'settled') {
    const h = sim.restHeight || (b.y1 - b.y0);
    y1 = Math.max(b.y1, b.y0 + h * (1 + PARAMS.PULL_MAX_EXTENSION) + (b.y1 - b.y0 - h));
  }
  const W = canvas.clientWidth, H = canvas.clientHeight, pad = 28;
  const s = Math.min((W - 2 * pad) / (b.x1 - b.x0), (H - 2 * pad) / (y1 - b.y0));
  return { s, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + y1) / 2 };
}
function updateView() {
  const t = fitTarget();
  if (!view || sim.phase === 'settling') view = view ? { s: lerp(view.s, t.s), cx: lerp(view.cx, t.cx), cy: lerp(view.cy, t.cy) } : t;
  else if (!view.frozen) view = { ...t, frozen: sim.phase === 'pulling' };
}
const lerp = (a, b) => a + (b - a) * 0.15;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  for (const c of [canvas, chart]) { c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr); }
  if (view) view.frozen = false;
}

// ---- drawing: shaded tubes, back to front -----------------------------------------------------
let order = null, keys = null;
function draw() {
  const dpr = window.devicePixelRatio || 1, W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BLACK; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(dpr, 0, 0, dpr, canvas.clientWidth / 2 * dpr, canvas.clientHeight / 2 * dpr);
  const x = sim.x, n = sim.n, s = view.s, cx = view.cx, cy = view.cy;
  const sx = i => (x[3 * i] - cx) * s, sy = i => -(x[3 * i + 1] - cy) * s;
  // bottom jaw
  {
    const b = sim.bounds();
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) if (sim.grip[i] === 1) { const y = x[3 * i + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    ctx.fillStyle = 'rgba(47,163,163,0.08)';
    ctx.fillRect((b.x0 - cx) * s - 10, -(y1 - cy) * s - 4, (b.x1 - b.x0) * s + 20, (y1 - y0) * s + 8);
  }
  const nChunks = Math.ceil((n - 1) / CHUNK);
  if (!order || order.length !== nChunks) { order = new Int32Array(nChunks); keys = new Float64Array(nChunks); }
  let z0 = Infinity, z1 = -Infinity;
  for (let k = 0; k < nChunks; k++) {
    const a = k * CHUNK, b = Math.min(n - 1, a + CHUNK);
    let z = 0; for (let i = a; i <= b; i++) z += x[3 * i + 2];
    keys[k] = z / (b - a + 1); order[k] = k;
    if (keys[k] < z0) z0 = keys[k]; if (keys[k] > z1) z1 = keys[k];
  }
  order.sort((p, q) => keys[p] - keys[q]);
  const d = PARAMS.YARN_DIAMETER * s, stripes = $('klStripes').checked;
  ctx.lineJoin = 'round';
  const zr = Math.max(1e-6, z1 - z0);
  let pinsDrawn = false;
  for (let o = 0; o < nChunks; o++) {
    const k = order[o], a = k * CHUNK, b = Math.min(n - 1, a + CHUNK);
    if (!pinsDrawn && keys[k] > 0) { drawPins(s, cx, cy); pinsDrawn = true; }
    const shade = 0.45 + 0.55 * (keys[k] - z0) / zr;
    const c = sim.course[a];
    const base = stripes && Math.floor(c) % 2 === 1 ? [47, 163, 163] : [233, 236, 236];
    ctx.beginPath(); ctx.moveTo(sx(a), sy(a));
    for (let i = a + 1; i <= b; i++) ctx.lineTo(sx(i), sy(i));
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
  const r = PARAMS.PIN_RADIUS * s;
  ctx.fillStyle = '#34393a'; ctx.strokeStyle = PETROL; ctx.lineWidth = 1;
  for (const p of sim.pins) { ctx.beginPath(); ctx.arc((p.x - cx) * s, -(p.y + sim.pullOffset - cy) * s, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }
}
const rgb = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

function drawChart() {
  const dpr = window.devicePixelRatio || 1, W = chart.width, H = chart.height;
  cctx.setTransform(1, 0, 0, 1, 0, 0); cctx.fillStyle = BLACK; cctx.fillRect(0, 0, W, H);
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = chart.clientWidth, h = chart.clientHeight, L = 34, B = 20, T = 8, R = 8;
  const xmax = Math.max(0.2, PARAMS.PULL_MAX_EXTENSION, ...log.map(p => p.ext));
  const ymax = Math.max(1e-9, ...log.map(p => p.load)) * 1.08;
  cctx.strokeStyle = LINE; cctx.lineWidth = 1;
  cctx.strokeRect(L + 0.5, T + 0.5, w - L - R, h - T - B);
  cctx.fillStyle = DIM; cctx.font = '10px "IBM Plex Mono", monospace';
  for (let e = 0; e <= xmax + 1e-9; e += 0.3) cctx.fillText(`${Math.round(e * 100)}%`, L + (w - L - R) * e / xmax - 8, h - 6);
  cctx.fillText('load', 2, T + 10);
  if (!log.length) return;
  cctx.strokeStyle = PETROL; cctx.lineWidth = 1.5; cctx.beginPath();
  log.forEach((p, i) => { const X = L + (w - L - R) * p.ext / xmax, Y = T + (h - T - B) * (1 - Math.max(0, p.load) / ymax); i ? cctx.lineTo(X, Y) : cctx.moveTo(X, Y); });
  cctx.stroke();
  cctx.fillStyle = DIM; cctx.fillText(ymax.toExponential(1), L + 4, T + 12);
}

// ---- readouts --------------------------------------------------------------------------------
function readouts() {
  const st = sim.stats, msStep = sim.timing.steps ? sim.timing.totalMs / sim.timing.steps : 0;
  const ov = sim.countOverlaps(0.5);
  worstDeep = Math.max(worstDeep, ov.pairs);
  const rows = [
    ['phase', sim.phase],
    ['points / segments', `${sim.n} / ${sim.nSeg}`],
    ['yarn length per loop', `${sim.loopLength.toFixed(1)} d`],
    ['contact pairs listed', sim.nPairs],
    ['ms per sim frame', `${sim.timing.frameMs.toFixed(1)} (${PARAMS.SUBSTEPS_PER_FRAME} substeps)`],
    ['ms per substep', msStep.toFixed(2)],
    ['ms to draw a frame', drawMs.toFixed(1)],
    ['settle', sim.settledAt ? `${sim.settledAt.frames} frames · ${(settleWallMs / 1000).toFixed(1)} s wall` : `${sim.settleFrames} frames…`],
    ['RMS point speed', `${(st.rmsSpeed || 0).toFixed(2)} d/s`],
    ['jaw gap', `${sim.jawGap().toFixed(1)} d${sim.phase === 'settling' && Number.isFinite(sim.drift) ? ` (moved ${sim.drift.toFixed(2)} in ${PARAMS.SETTLE_WINDOW} frames)` : ''}`],
    ['closest yarn approach', `${ov.min.toFixed(3)} d`],
    ['overlaps > ½ d now / worst', `${ov.pairs} / ${worstDeep}`, worstDeep > 0],
    ['largest yarn strain', `${(sim.maxStrain() * 100).toFixed(2)}%`],
    ['extension', sim.restHeight ? `${(sim.extension() * 100).toFixed(1)}%` : '—'],
    ['load: bottom jaw / comb', `${st.loadBottom.toFixed(0)} / ${st.loadTop.toFixed(0)}`],
  ];
  $('klRo').innerHTML = rows.map(([k, v, bad]) => `<dt>${k}</dt><dd${bad ? ' class="is-bad"' : ''}>${v}</dd>`).join('');
  $('klProgress').style.width = `${(sim.settleProgress() * 100).toFixed(1)}%`;
  $('klStatus').textContent = sim.phase === 'settling' ? `settling — ${Math.round(sim.settleProgress() * 100)}%`
    : sim.phase === 'settled' ? 'settled. Pull it, or drag above the top course.'
    : sim.pullAuto ? (sim.strainStopped ? `stopped at +${(sim.extension() * 100).toFixed(0)}%: the yarn itself reached ${(PARAMS.STRAIN_STOP * 100).toFixed(0)}% strain (jammed)` : sim.pullOffset >= sim.pullTarget ? 'pull complete' : 'pulling at constant speed…') : 'pulling by hand';
}

// ---- loop ------------------------------------------------------------------------------------
let roTick = 0;
function frame() {
  if (!paused) {
    if (sim.phase === 'settling') {
      const t0 = performance.now();
      do sim.stepFrame(); while (sim.phase === 'settling' && performance.now() - t0 < SETTLE_BUDGET_MS);
      if (sim.phase !== 'settling') { settleWallMs = performance.now() - settleWallStart; $('klPull').disabled = false; }
    } else if (sim.phase === 'pulling') {
      sim.stepFrame();
      log.push({ ext: sim.extension(), load: sim.stats.loadBottom, top: sim.stats.loadTop });
      $('klCsv').disabled = false;
    } else sim.stepFrame();
  }
  updateView();
  const td = performance.now(); draw(); drawMs = performance.now() - td;
  if (++roTick % 6 === 0) { readouts(); drawChart(); }
  requestAnimationFrame(frame);
}

// ---- controls --------------------------------------------------------------------------------
$('klPull').textContent = `Pull to +${Math.round(PARAMS.PULL_MAX_EXTENSION * 100)}%`;
$('klPull').addEventListener('click', () => { log = []; sim.startPull(true); });
$('klPause').addEventListener('click', e => { paused = !paused; e.target.textContent = paused ? 'Resume' : 'Pause'; });
$('klRestart').addEventListener('click', () => start());
$('klCsv').addEventListener('click', () => {
  const csv = 'extension,load_bottom,load_top\n' + log.map(p => `${p.ext.toFixed(5)},${p.load.toFixed(3)},${p.top.toFixed(3)}`).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'knit-lab-force.csv'; a.click();
});
const worldY = e => { const r = canvas.getBoundingClientRect(); return view.cy - (e.clientY - r.top - r.height / 2) / view.s; };
canvas.addEventListener('pointermove', e => {
  if (!sim || !view) return;
  const pullable = sim.phase !== 'settling' && worldY(e) > sim.bounds().y1 - 3 * PARAMS.YARN_DIAMETER;
  canvas.classList.toggle('is-pullable', pullable || !!drag);
  if (drag) sim.setPullTarget(drag.off0 + worldY(e) - drag.y0);
});
canvas.addEventListener('pointerdown', e => {
  if (!sim || sim.phase === 'settling' || worldY(e) < sim.bounds().y1 - 3 * PARAMS.YARN_DIAMETER) return;
  if (sim.phase === 'settled' || sim.pullAuto) { if (sim.phase === 'settled') log = []; sim.startPull(false); sim.pullTarget = sim.pullOffset; }
  drag = { y0: worldY(e), off0: sim.pullOffset };
  canvas.setPointerCapture(e.pointerId);
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
window.addEventListener('resize', resize);

window.__knitLab = { PARAMS, get log() { return log; }, get settleWallMs() { return settleWallMs; }, get worstDeep() { return worstDeep; }, get drawMs() { return drawMs; }, pause(v) { paused = v; } };
resize(); start(); requestAnimationFrame(frame);
