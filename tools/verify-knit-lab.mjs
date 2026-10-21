// tools/verify-knit-lab.mjs — the knit-lab spike's numbers, measured in Node on the shipped modules.
//
//   node tools/verify-knit-lab.mjs [--out <dir>] [--quick] [--no-scale] [--rates]
//
// 1. TOPOLOGY   the stockinette record validates; three broken records are refused by name; the
//               geometry builder refuses a yarn over and a k2tog by name rather than guessing.
// 2. SETTLE     from the rough start to settled, with the pass-through CERTIFICATE on at every
//               substep (KnitSim.auditBefore/After): frames, simulated seconds, wall time, ms per
//               substep, closest approach, overlaps deeper than half a diameter, largest strain.
// 3. PULL       the comb driven up at PULL_SPEED to PULL_MAX_EXTENSION, certificate still on,
//               logging the bottom jaw's reaction against extension; the curve's shape is reported
//               as tangent stiffness by 5% band (soft initial region, then stiffening?), the peak
//               and what follows it. --rates repeats the pull from the same settled swatch at
//               4 / 1.5 / 0.5 d/s. (Early runs suggested the jam load depended on speed; it was
//               the swatch unravelling from its free end, since tied to the comb.)
// 4. SCALING    ms per substep against swatch size, no certificate, so the interactive ceiling can
//               be read off.
//
// Writes summary.json and force-extension.csv into --out (default: a temp dir). It asserts only
// what must hold for the numbers to mean anything (topology refusals, no deep overlaps, no failed
// certificate) and REPORTS the rest; the spike's questions are answered by the numbers.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeStockinette, validateTopology } from '../knit-lab-topology.js';
import { KnitSim, PARAMS } from '../knit-lab-sim.js';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const OUT = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'knit-lab-'));
fs.mkdirSync(OUT, { recursive: true });
const QUICK = flag('--quick');
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++; };
const fmt = (v, k = 2) => Number.isFinite(v) ? v.toFixed(k) : String(v);
const summary = { params: PARAMS, machine: { cpus: os.cpus().length, model: os.cpus()[0]?.model, node: process.version } };

// ---- 1. topology ------------------------------------------------------------------------------
console.log('\n== 1. topology');
{
  const t = makeStockinette(10, 10);
  check(validateTopology(t).length === 0, `10 x 10 stockinette validates (${t.loops.length} loops)`);
  const broken = (mut, why) => { const t2 = makeStockinette(4, 4); mut(t2); const bad = validateTopology(t2); check(bad.length > 0, `refused: ${why} -> "${bad[0]}"`); };
  broken(t => { t.loops[t.rows[3][1]].through = [t.rows[1][1]]; }, 'a loop pulled through a loop two courses down');
  broken(t => { t.loops[t.rows[2][0]].through = [t.rows[1][1]]; }, 'a loop that nothing holds (it would ladder)');
  broken(t => { t.loops[t.rows[2][1]].through = [t.rows[1][0], t.rows[1][1], t.rows[1][2]]; }, 'three parents');
  const yo = makeStockinette(4, 4); yo.loops[yo.rows[2][1]].through = []; yo.loops[yo.rows[2][1]].kind = 'yo'; yo.loops[yo.rows[2][2]].through = [yo.rows[1][1], yo.rows[1][2]];
  check(validateTopology(yo).length === 0, 'a yarn over beside a k2tog is a valid RECORD (data change only)');
  let msg = ''; try { new KnitSim(yo); } catch (e) { msg = e.message; }
  check(/only draws plain knit/.test(msg), `...and the geometry builder refuses it by name: "${msg.slice(0, 90)}..."`);
}

// ---- 2. settle --------------------------------------------------------------------------------
console.log('\n== 2. settle (10 x 10, pass-through certificate on every substep)');
const sim = new KnitSim(makeStockinette(10, 10));
sim.audit = true;
const init = { points: sim.n, segments: sim.nSeg, loopLength: sim.loopLength, yarnLength: sim.yarnLength, initialMin: sim.countOverlaps(0.5).min };
console.log(`points ${sim.n}, segment ${fmt(sim.seg, 3)} d, yarn ${fmt(sim.yarnLength, 0)} d = ${fmt(sim.loopLength, 2)} d per loop; start: closest approach ${fmt(init.initialMin, 3)} d`);
let deepWorst = 0, strainWorst = 0, t0 = performance.now();
const settleTrace = [];
while (sim.phase === 'settling') {
  sim.stepFrame();
  if (sim.frame % 20 === 0) {
    const o = sim.countOverlaps(0.5); deepWorst = Math.max(deepWorst, o.pairs); strainWorst = Math.max(strainWorst, Math.abs(sim.maxStrain()));
    if (sim.frame % 200 === 0) { settleTrace.push({ frame: sim.frame, rms: sim.stats.rmsSpeed, height: sim.jawGap(), combLoad: sim.combLoad }); console.log(`  frame ${sim.frame}: rms ${fmt(sim.stats.rmsSpeed, 3)} d/s, jaw gap ${fmt(sim.jawGap(), 2)} d, comb load ${fmt(sim.combLoad, 0)}`); }
  }
}
const auditWall = performance.now() - t0;
const st = sim.settledAt;
summary.settle = { ...init, frames: st.frames, simSeconds: st.simSeconds, substeps: st.steps, msPerSubstepAudited: st.ms / st.steps, wallMsAudited: auditWall, hitCap: st.hitCap,
  closestApproach: sim.stats.minDist, deepOverlapsWorst: deepWorst, maxStrainWorst: strainWorst, certSubsteps: sim.stats.certSteps, certFailed: sim.stats.certFail, worstMargin: sim.stats.worstMargin,
  restHeight: sim.jawGap(), width: sim.bounds().x1 - sim.bounds().x0, trace: settleTrace };
console.log(`settled after ${st.frames} frames = ${fmt(st.simSeconds, 1)} s simulated, ${st.steps} substeps${st.hitCap ? ' (HIT THE FRAME CAP — not converged by the criterion)' : ''}`);
console.log(`audited wall ${fmt(auditWall / 1000, 1)} s; ms/substep with the certificate ${fmt(st.ms / st.steps, 3)}`);
check(deepWorst === 0, `no yarn pair closer than 0.5 d while settling (worst sample: ${deepWorst} pairs; closest approach ${fmt(sim.stats.minDist, 3)} d)`);
check(sim.stats.certFail === 0, `pass-through certificate held on ${sim.stats.certSteps - sim.stats.certFail} of ${sim.stats.certSteps} substeps (worst margin ${fmt(sim.stats.worstMargin, 4)} d)`);
console.log(`largest yarn strain while settling: ${fmt(strainWorst * 100, 2)}%; settled jaw gap ${fmt(summary.settle.restHeight, 2)} d (${fmt(summary.settle.restHeight / 9, 2)} d per course), width ${fmt(summary.settle.width, 1)} d`);

// ---- 3. pull ----------------------------------------------------------------------------------
const MAXE = PARAMS.PULL_MAX_EXTENSION;
console.log(`\n== 3. pull to +${Math.round(MAXE * 100)}% at ${PARAMS.PULL_SPEED} d/s (certificate on)`);
const settledState = sim.snapshot();
sim.stats.certFail = 0; sim.stats.certSteps = 0; sim.stats.worstMargin = Infinity; sim.stats.minDist = Infinity;
const pull = runPull(sim, PARAMS.PULL_SPEED, MAXE, true);
const log = pull.log;
fs.writeFileSync(path.join(OUT, 'force-extension.csv'), 'extension,load_bottom,load_top,max_strain,mid_width\n' + log.map(r => [r.ext, r.bottom, r.top, r.strain, r.width].map(v => v.toFixed(5)).join(',')).join('\n') + '\n');
check(pull.deep === 0, `no yarn pair closer than 0.5 d while pulling (closest approach ${fmt(sim.stats.minDist, 3)} d)`);
check(sim.stats.certFail === 0, `pass-through certificate held on ${sim.stats.certSteps - sim.stats.certFail} of ${sim.stats.certSteps} pull substeps (worst margin ${fmt(sim.stats.worstMargin, 4)} d)`);
const shape = curveShape(log, summary.settle.restHeight, MAXE);
console.log('extension  load(bottom jaw)  tangent stiffness to next band (load per d of jaw travel)');
shape.bands.forEach((e, i) => console.log(`  ${String(Math.round(e * 100)).padStart(3)}%  ${fmt(shape.loads[i], 0).padStart(10)}  ${i < shape.k.length ? fmt(shape.k[i], 0).padStart(10) : ''}`));
console.log(`soft region (0-10%): ${fmt(shape.kSoft, 0)} per d; steepest before the peak: ${fmt(shape.kMax, 0)} per d at ${Math.round(shape.kMaxAt * 100)}% — ${fmt(shape.kMax / shape.kSoft, 1)}x`);
console.log(shape.endOverPeak >= 0.999 ? `load rises through every band measured (last band ${Math.round(shape.bands.at(-1) * 100)}%: ${fmt(shape.peak, 0)})`
  : `load peaks at ${Math.round(shape.peakAt * 100)}% (${fmt(shape.peak, 0)}) and falls to ${fmt(100 * shape.endOverPeak, 0)}% of it by ${Math.round(shape.bands.at(-1) * 100)}%`);
const w0 = log[0].width, w1 = log.filter(r => !r.hold).at(-1).width;
summary.pull = { speed: PARAMS.PULL_SPEED, maxExtension: MAXE, frames: log.length, wallMs: pull.wallMs, ...shape, maxStrain: pull.strain, certSubsteps: sim.stats.certSteps, certFailed: sim.stats.certFail,
  worstMargin: sim.stats.worstMargin, closestApproach: sim.stats.minDist, widthStart: w0, widthEnd: w1, holdLoadBottom: pull.holdBottom, holdLoadTop: pull.holdTop };
console.log(pull.strainStopped ? `the pull STOPPED at +${fmt(pull.stoppedAt * 100, 1)}%: a segment reached the ${PARAMS.STRAIN_STOP * 100}% strain stop (the knit had jammed)` : 'the pull reached its target without the strain stop');
summary.pull.strainStopped = pull.strainStopped; summary.pull.stoppedAt = pull.stoppedAt;
console.log(`largest yarn strain while pulling: ${fmt(pull.strain * 100, 2)}%; mid-height width ${fmt(w0, 1)} -> ${fmt(w1, 1)} d`);
console.log(`held at the end for 60 frames: bottom jaw ${fmt(pull.holdBottom, 0)}, comb ${fmt(pull.holdTop, 0)} (static equilibrium: these should agree)`);

// rate sensitivity: the same settled swatch pulled at three speeds (no certificate), to +40%
if (flag('--rates')) {
  console.log('\n== 3b. rate sensitivity (same settled swatch, to +40%)');
  sim.audit = false; summary.rates = [];
  for (const v of [4, 1.5, 0.5]) {
    sim.restore(settledState);
    const r = runPull(sim, v, 0.4, false), sh = curveShape(r.log, summary.settle.restHeight, 0.4);
    summary.rates.push({ speed: v, loads: sh.loads, bands: sh.bands, maxStrain: r.strain });
    console.log(`  ${v} d/s: ` + sh.bands.map((e, i) => `${Math.round(e * 100)}%:${fmt(sh.loads[i] / 1000, 1)}k`).join(' ') + ` · max strain ${fmt(r.strain * 100, 1)}%`);
  }
}

function runPull(s, speed, maxE, sampleDeep) {
  s.P = { ...s.P, PULL_SPEED: speed, PULL_MAX_EXTENSION: maxE };
  s.startPull(true);
  const out = []; let deep = 0, strain = 0; const t = performance.now();
  const row = hold => ({ ext: s.extension(), bottom: s.stats.loadBottom, top: s.stats.loadTop, strain: s.maxStrain(), width: midWidth(s), hold });
  while (s.pullOffset < s.pullTarget - 1e-9 && !s.strainStopped) {
    s.stepFrame(); out.push(row(false)); strain = Math.max(strain, Math.abs(out.at(-1).strain));
    if (sampleDeep && s.frame % 10 === 0) deep = Math.max(deep, s.countOverlaps(0.5).pairs);
  }
  for (let k = 0; k < 60; k++) { s.stepFrame(); out.push(row(true)); }
  const held = out.filter(r => r.hold);
  s.P = PARAMS;
  return { log: out, deep, strain, strainStopped: s.strainStopped, stoppedAt: s.strainStopped ? out.filter(r => !r.hold).at(-1).ext : null, wallMs: performance.now() - t, holdBottom: held.reduce((a, r) => a + r.bottom, 0) / held.length, holdTop: held.reduce((a, r) => a + r.top, 0) / held.length };
}
function curveShape(lg, h0, maxE) {
  const reached = Math.max(...lg.filter(r => !r.hold).map(r => r.ext));
  const bands = []; for (let e = 0; e <= Math.min(maxE, reached - 0.0125) + 1e-9; e += 0.05) bands.push(Math.round(e * 100) / 100);
  const loadAt = e => { const near = lg.filter(r => !r.hold && Math.abs(r.ext - e) < 0.0125); return near.length ? near.reduce((a, r) => a + r.bottom, 0) / near.length : NaN; };
  const loads = bands.map(loadAt);
  const k = bands.slice(1).map((e, i) => (loads[i + 1] - loads[i]) / (0.05 * h0));
  let pk = 0; loads.forEach((L, i) => { if (L > loads[pk]) pk = i; });
  const pre = k.slice(0, Math.max(1, pk));
  const kMax = Math.max(...pre), kMaxAt = bands[pre.indexOf(kMax)];
  const kSoft = (k[0] + k[1]) / 2;
  return { bands, loads, k, kSoft, kMax, kMaxAt, peak: loads[pk], peakAt: bands[pk], endOverPeak: loads.at(-1) / loads[pk] };
}

// ---- 4. scaling ------------------------------------------------------------------------------
if (!flag('--no-scale')) {
  console.log('\n== 4. ms per substep against swatch size (no certificate; 20 warm-up frames, then 10 timed)');
  summary.scaling = [];
  for (const n of QUICK ? [10, 20] : [10, 20, 30, 40]) {
    const s = new KnitSim(makeStockinette(n, n));
    for (let f = 0; f < 20; f++) s.stepFrame();
    const steps0 = s.timing.steps, ms0 = s.timing.totalMs;
    for (let f = 0; f < 10; f++) s.stepFrame();
    const ms = (s.timing.totalMs - ms0) / (s.timing.steps - steps0);
    const row = { wales: n, courses: n, points: s.n, pairs: s.nPairs, msPerSubstep: ms, usPerPoint: 1000 * ms / s.n, msPerFrame: ms * PARAMS.SUBSTEPS_PER_FRAME };
    summary.scaling.push(row);
    console.log(`  ${n} x ${n}: ${s.n} points, ${s.nPairs} contact pairs, ${fmt(ms, 3)} ms/substep (${fmt(row.usPerPoint, 3)} us/point), ${fmt(row.msPerFrame, 1)} ms per ${PARAMS.SUBSTEPS_PER_FRAME}-substep frame`);
  }
}

function midWidth(s) {   // x extent of the points within one course pitch of the jaws' mid-height
  const yMid = s.bottomY + s.jawGap() / 2, h = s.pitch.course;
  let x0 = Infinity, x1 = -Infinity;
  for (let i = 0; i < s.n; i++) { const y = s.x[3 * i + 1]; if (Math.abs(y - yMid) < h) { const x = s.x[3 * i]; if (x < x0) x0 = x; if (x > x1) x1 = x; } }
  return x1 - x0;
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(`\nwrote ${path.join(OUT, 'summary.json')} and force-extension.csv`);
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
