// knit-lab-engine.js — runs a KnitSim and reports on it by message. The page runs it in a Web Worker
// (knit-lab-worker.js) so settling and pulling never block drawing or input; with #WORKER=0 the
// page runs this very code on its own thread instead (the way the first version did), which is
// what tools/verify-knit-lab.mjs --browser measures against.
//
// In:  { type: 'start', swatch: 'plain' | 'eyelet', params, wales, courses }
//      { type: 'test' }                      load to LOAD_LIMIT, unload, hold (the automatic test)
//      { type: 'grab' } / { type: 'drag', target } / { type: 'release' }   pulling by hand
//      { type: 'pause', value }
// Out: { type: 'init', ... static description of the swatch }
//      { type: 'state', x (Float32Array, transferred), rows (new log rows), ... readouts }

import { makeStockinette, makeEyelet, validateTopology } from './knit-lab-topology.js';
import { KnitSim, PARAMS } from './knit-lab-sim.js';

export const SWATCHES = {
  plain: { label: 'stockinette', make: (w, c) => makeStockinette(w, c) },
  eyelet: { label: 'stockinette with an eyelet row', make: (w, c) => makeEyelet(w, c) },
};

export function createEngine(post, budgetMs = 30) {
  let sim = null, paused = false, timer = null, rows = [], gen = 0, settleWall = 0, settleStart = 0, worstDeep = 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function start(m) {
    const P = { ...PARAMS, ...(m.params || {}) };
    const sw = SWATCHES[m.swatch] ? m.swatch : 'plain';
    const topo = SWATCHES[sw].make(m.wales || 10, m.courses || 10);
    const bad = validateTopology(topo);
    if (bad.length) { post({ type: 'error', message: 'topology: ' + bad.join('; ') }); return; }
    sim = new KnitSim(topo, P);
    rows = []; worstDeep = 0; settleWall = 0; settleStart = now(); gen++;
    post({ type: 'init', gen, swatch: sw, label: SWATCHES[sw].label, n: sim.n, nSeg: sim.nSeg, course: new Float32Array(sim.course), grip: new Uint8Array(sim.grip),
      pins: sim.pins, loopLength: sim.loopLength, params: P, eyelet: topo.eyelet ?? null });
    schedule(0);
  }

  function schedule(ms) { clearTimeout(timer); timer = setTimeout(tick, ms); }

  function tick() {
    if (!sim) return;
    const busy = sim.phase === 'settling' || (sim.phase === 'pulling' && sim.pullAuto) || sim.phase === 'unloading' || sim.phase === 'returned';
    if (!paused) {
      const t0 = now();
      do {
        const before = sim.phase;
        sim.stepFrame();
        if (before === 'settling' && sim.phase !== 'settling') settleWall = now() - settleStart;
        if (sim.phase === 'pulling' || sim.phase === 'unloading' || sim.phase === 'returned') rows.push({ ext: sim.extension(), load: sim.stats.loadBottom, top: sim.stats.loadTop, strain: sim.stats.maxStrain, phase: sim.phase });
      } while (busy && now() - t0 < budgetMs && sim.phase !== 'done');
    }
    report();
    schedule(busy && !paused ? 0 : 16);
  }

  function report() {
    const ov = sim.countOverlaps(0.5);
    worstDeep = Math.max(worstDeep, ov.pairs);
    const x = new Float32Array(sim.x);
    post({
      type: 'state', gen, x, rows: rows.splice(0), phase: sim.phase, pullAuto: !!sim.pullAuto, pullOffset: sim.pullOffset, frame: sim.frame,
      settleProgress: sim.settleProgress(), drift: sim.drift, settledAt: sim.settledAt || null, settleWallMs: settleWall, settleFrames: sim.settleFrames,
      restHeight: sim.restHeight, extension: sim.extension(), jawGap: sim.jawGap(), maxStrain: sim.maxStrain(), loadEnd: sim.loadEnd || null, peak: sim.peak || null,
      strainStopped: !!sim.strainStopped, nPairs: sim.nPairs, overlaps: ov.pairs, worstDeep, closest: ov.min,
      stats: { rmsSpeed: sim.stats.rmsSpeed, loadBottom: sim.stats.loadBottom, loadTop: sim.stats.loadTop },
      timing: { frameMs: sim.timing.frameMs, msPerSubstep: sim.timing.steps ? sim.timing.totalMs / sim.timing.steps : 0 },
    }, [x.buffer]);
  }

  return function onMessage(m) {
    if (m.type === 'start') start(m);
    else if (!sim) return;
    else if (m.type === 'test') { rows = []; sim.startPull(true, true); schedule(0); }
    else if (m.type === 'grab') { if (sim.phase === 'settling') return; if (!sim.testing || sim.pullAuto) { rows = []; sim.startPull(false, false); } sim.pullTarget = sim.pullOffset; post({ type: 'grabbed', pullOffset: sim.pullOffset }); schedule(0); }
    else if (m.type === 'drag') sim.setPullTarget(m.target);
    else if (m.type === 'pause') { paused = !!m.value; schedule(0); }
  };
}
