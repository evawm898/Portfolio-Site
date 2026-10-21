// tools/verify-knit-lab.mjs — the knit-lab spike's numbers, measured in Node on the shipped modules.
//
//   node tools/verify-knit-lab.mjs [--out <dir>] [--jobs N] [--browser] [--scale] [--only a,b]
//   node tools/verify-knit-lab.mjs --run '<spec json>'      one simulation, JSON on stdout (internal)
//
// Every simulation is its own child process (--jobs at a time, default 4). Each settles a 10 x 10
// swatch (frictionless, the SETTLE_FRICTION default) and runs the automatic test: STEPPED and
// quasi-static (move the driven jaw one step, hold until the swatch is in equilibrium, record, repeat)
// to LOAD_LIMIT and back, along the wales (the comb) or the courses (the side jaws). The pass-through
// certificate is on for the audited runs. --only runs a subset of the checks' specs (iteration only:
// the gate is the full run). --scale adds the size-vs-speed table (reported, not gated).
//
// THE GATES. Every check is a pure function of measured runs, and every one is also handed an
// input it must REJECT (a "must-fail"); a check that cannot fail is not a check.
//   Q  quasi-static  μ 0.25: hysteresis and permanent set agree within 10% (relative) across two step
//                 sizes x two hold tolerances; μ 0: under 2% of the loading work lost. Must-fails: the
//                 phase-2 test (continuous pull, phase-2 friction) at 1.5 and 0.5 d/s; the phase-2
//                 frictionless test.
//   H  hold       held at the peak (in the jam) for 600 frames the load stays within 2%. Must-fail:
//                 the phase-2 friction (FRICTION_MODE 'substep'), which ratchets the jam tighter.
//   T  topology   each drawn start is its chart: each leg of each loop passes once through exactly the
//                 loops it was pulled through, knit legs -1 and purl legs +1 (linking numbers). Must-
//                 fails: a decrease drawn without its top parent's head moved over (k2tog and ssk);
//                 the rib's purl loops drawn knitwise.
//   O  order      every decrease keeps the parent its record lists first on top — a k2tog leaning
//                 right, an ssk left — on the drawn start, settled, and after the test. Must-fail: the
//                 ssk swatch read against a record with each decrease's parents swapped.
//   F  friction   at μ 0.25 the curve keeps a soft region before the jam (jam >= 12%, soft region at
//                 most twice the frictionless one). Must-fail: friction capped by a normal multiplier
//                 accumulated across substeps.
//   I  inextensible  strain < 1% before the jam; the load never falls below 90% of its running peak
//                 past the jam; the loading ends on the LOAD LIMIT, not the 5% strain stop. Must-fails:
//                 a yarn 2,000x more compliant; the one-sweep Gauss-Seidel stretch solve; the yarn's
//                 end left untied.
//   C  cycle      friction adds the loop: μ 0.25 loses at least 3 points more of the loading work
//                 than μ 0, with no less set. Must-fail: μ 0 against itself.
//   E  eyelet     >= 4 openings of inscribed radius >= 1 d in the eyelet course, settled and at +20%,
//                 for the k2tog and the ssk eyelet; the eyelet swatch jams >= 5 points away from plain.
//                 Must-fails: the plain swatch's openings; plain against itself.
//   D  direction  jersey pulled along the courses is softer (load per unit strain per unit width of
//                 fabric across the pull) and jams later than along the wales. Must-fail: wale against
//                 wale.
//   R  rib        1x1 rib pulled along the courses jams at >= 1.25x jersey's extension, and at rest
//                 (width released) draws in to <= 0.95x jersey's width. Must-fail: jersey against itself.
//   S  safety     no yarn pair closer than ½ d and the certificate unbroken on the audited runs.
//   W  worker     (--browser) the page keeps drawing while it settles: gaps between animation frames
//                 p95 < 60 ms, none > 100 ms, with the simulation in a Web Worker. Must-fail: #WORKER=0.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);

// ---- mutants: one text substitution each in a copy of a module --------------------------------
const MUTANTS = {
  'friction-cap-accumulates': { file: 'knit-lab-sim.js', from: 'this.lamC.fill(0, 0, this.nPairs); this.lamT.fill(0, 0, this.nPairs);', to: 'this.lamT.fill(0, 0, this.nPairs);' },
  'decrease-head-not-moved': { file: 'knit-lab-sim.js', from: '+ headShift.get(id) * ramp(u, K.s0, K.s1)', to: '+ 0' },
  'purl-drawn-knitwise': { file: 'knit-lab-sim.js', from: "if (l.kind === 'purl') return -1;", to: "if (l.kind === 'purl') return 1;" },
};
async function loadSim(mutant) {
  if (!mutant) return import(pathToFileURL(path.join(ROOT, 'knit-lab-sim.js')).href);
  const m = MUTANTS[mutant]; let src = fs.readFileSync(path.join(ROOT, m.file), 'utf8');
  if (src.split(m.from).length !== 2) throw new Error(`mutant ${mutant}: anchor not found exactly once`);
  src = src.replace(m.from, m.to).replace(/from '\.\//g, `from '${pathToFileURL(ROOT).href}/`);
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'knit-mut-')), 'sim.mjs');
  fs.writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}
const T = await import(pathToFileURL(path.join(ROOT, 'knit-lab-topology.js')).href);
const A = await import(pathToFileURL(path.join(ROOT, 'knit-lab-analysis.js')).href);
const makeSwatch = s => (s === 'eyelet' ? T.makeEyelet(10, 10) : s === 'eyelet-ssk' ? T.makeEyelet(10, 10, 5, 'ssk') : s === 'rib' ? T.makeRib(10, 10) : T.makeStockinette(10, 10));
const HOLE_R = 1.0, MID = 0.2;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

// ---- one simulation (child process) ----------------------------------------------------------
if (flag('--run')) {
  const spec = JSON.parse(opt('--run'));
  const { KnitSim, PARAMS } = await loadSim(spec.mutant);
  const P = { ...PARAMS, ...(spec.params || {}) };
  const topo = makeSwatch(spec.swatch), band = topo.eyelet ?? 5;
  const sim = new KnitSim(topo, P); sim.audit = !!spec.audit;
  const L = A.legLinks(topo, sim.x, sim.loopOf, sim.uOf);
  const order = () => A.decreaseOrder(topo, sim.x, sim.loopOf, sim.uOf);
  const out = { name: spec.name, spec, n: sim.n, loopLength: sim.loopLength, start: { bad: L.bad, undetermined: L.undetermined, loops: L.pairs, closest: sim.countOverlaps(0.5).min, order: order() } };
  const holeReport = () => { const h = A.holes(sim.x, sim.n), b = A.holesInCourse(h, sim.x, sim.course, sim.n, band); return { band: b.slice(0, 8).map(o => +o.r.toFixed(3)), open: b.filter(o => o.r >= HOLE_R).length }; };
  let deep = 0, t0 = performance.now();
  while (sim.phase === 'settling') { sim.stepFrame(); if (sim.frame % 20 === 0) deep = Math.max(deep, sim.countOverlaps(0.5).pairs); }
  const st = sim.settledAt;
  out.settle = { frames: st.frames, hitCap: st.hitCap, gap: sim.jawGap(), span: sim.waleSpan(), wallMs: performance.now() - t0, msPerSubstep: st.ms / st.steps, deep, certFail: sim.stats.certFail, certSteps: sim.stats.certSteps, worstMargin: sim.stats.worstMargin, closest: sim.stats.minDist, strain: sim.maxStrain(), order: order() };
  out.holesSettled = topo.eyelet ? holeReport() : null;
  sim.stats.certFail = 0; sim.stats.certSteps = 0; sim.stats.worstMargin = Infinity; sim.stats.minDist = Infinity;
  sim.startTest(spec.dir || 'wale', true); deep = 0; t0 = performance.now();
  const rows = []; let mid = null, frames = 0;
  while (sim.phase !== 'done' && sim.phase !== 'held' && frames < 90000) {
    const nSteps = sim.steps.length;
    sim.stepFrame(); frames++;
    if (!out.free && sim.freeAt) out.free = { ...sim.freeAt, frames: sim.freeAt.frames };
    if (!sim.step && (sim.phase === 'pulling' || sim.phase === 'unloading' || sim.phase === 'returned')) rows.push({ ext: +sim.extension().toFixed(6), load: +sim.testLoad().toFixed(2), phase: sim.phase, strain: +sim.stats.maxStrain.toFixed(7) });
    const justRecorded = sim.steps.length > nSteps ? sim.steps[sim.steps.length - 1] : null;
    if (topo.eyelet && !mid && ((justRecorded && justRecorded.phase === 'pulling' && justRecorded.ext >= MID - 1e-9) || (!sim.step && sim.phase === 'pulling' && sim.extension() >= MID))) mid = { ext: sim.extension(), ...holeReport() };
    if (spec.peakHold && !out.peakHold && sim.step && sim.phase === 'unloading') {      // hold the jaws still at the peak
      sim.phase = 'held'; const ls = [];
      for (let f = 0; f < spec.peakHold; f++) { sim.stepFrame(); ls.push(sim.testLoad()); }
      sim.phase = 'unloading';
      out.peakHold = { frames: spec.peakHold, start: mean(ls.slice(0, 20)), end: mean(ls.slice(-20)), max: Math.max(...ls), min: Math.min(...ls) };
    }
    if (spec.audit && sim.frame % 10 === 0) deep = Math.max(deep, sim.countOverlaps(0.5).pairs);
  }
  out.holesMid = mid;
  out.endOrder = order();
  const testRows = sim.step ? sim.steps.map(s => ({ ext: s.ext, load: s.load, top: s.top, phase: s.phase, strain: s.strain, frames: s.frames, converged: s.converged, step: true })) : rows;
  out.pull = { rows: testRows, stepped: !!sim.step, frames, unconverged: sim.unconverged || 0, loadEnd: sim.loadEnd, peak: sim.peak, restHeight: sim.restHeight, wallMs: performance.now() - t0, deep, certFail: sim.stats.certFail, certSteps: sim.stats.certSteps, worstMargin: sim.stats.worstMargin, closest: sim.stats.minDist, strainStopped: sim.strainStopped, side: sim.sideGrip || null };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

// ---- the size-vs-speed table (--scale), in the parent -----------------------------------------
async function scaleTable() {
  const { KnitSim, PARAMS } = await loadSim();
  const rowsOut = [];
  for (const [w, frames] of [[10, 40], [20, 20], [30, 10], [40, 6]]) {
    const sim = new KnitSim(T.makeStockinette(w, w), { ...PARAMS });
    for (let f = 0; f < 3; f++) sim.stepFrame();                  // past the first pair-list build
    const t0 = sim.timing.totalMs, s0 = sim.timing.steps;
    for (let f = 0; f < frames; f++) sim.stepFrame();
    const ms = (sim.timing.totalMs - t0) / (sim.timing.steps - s0);
    rowsOut.push({ swatch: `${w} x ${w}`, points: sim.n, pairs: sim.nPairs, msPerSubstep: ms, msPerFrame: ms * PARAMS.SUBSTEPS_PER_FRAME, usPerPoint: 1000 * ms / sim.n });
  }
  return rowsOut;
}

// ---- the parent: run everything, then judge -------------------------------------------------
const OUT = path.resolve(opt('--out', fs.mkdtempSync(path.join(os.tmpdir(), 'knit-lab-'))));
fs.mkdirSync(OUT, { recursive: true });
const JOBS = +opt('--jobs', Math.min(4, os.cpus().length));
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++; };
const mustFail = (verdict, msg) => { const ok = !verdict.ok; console.log(`${ok ? 'PASS' : 'FAIL'}  must-fail: ${msg} -> ${verdict.ok ? 'ACCEPTED (the check cannot fail)' : 'rejected: ' + verdict.why}`); if (!ok) failed++; };
const pct = (v, k = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(k)}%` : String(v));
const fmt = (v, k = 0) => (Number.isFinite(v) ? v.toFixed(k) : String(v));

// The phase-2 test, as it was: a continuous pull, the phase-2 friction, settled with friction on.
const PHASE2 = { PROTOCOL: 'continuous', FRICTION_MODE: 'substep', SETTLE_FRICTION: null, PULL_DAMPING: 1 };
const SPECS = [
  { name: 'plain', swatch: 'plain', audit: true, peakHold: 600 },
  { name: 'plain-step0.5', swatch: 'plain', params: { STEP_EXT: 0.005 } },
  { name: 'plain-tol0.05', swatch: 'plain', params: { STEP_TOL: 0.0005 } },
  { name: 'plain-step0.5-tol0.05', swatch: 'plain', params: { STEP_EXT: 0.005, STEP_TOL: 0.0005 } },
  { name: 'plain-mu0', swatch: 'plain', params: { FRICTION: 0 } },
  { name: 'eyelet', swatch: 'eyelet', audit: true },
  { name: 'eyelet-ssk', swatch: 'eyelet-ssk' },
  { name: 'plain-course', swatch: 'plain', dir: 'course' },
  { name: 'rib-course', swatch: 'rib', dir: 'course', audit: true },
  { name: 'mf-phase2-fast', swatch: 'plain', params: { ...PHASE2 } },
  { name: 'mf-phase2-slow', swatch: 'plain', params: { ...PHASE2, PULL_SPEED: 0.5 } },
  { name: 'mf-phase2-mu0', swatch: 'plain', params: { ...PHASE2, FRICTION: 0 } },
  { name: 'mf-friction-substep', swatch: 'plain', params: { FRICTION_MODE: 'substep' }, peakHold: 600 },
  { name: 'mf-friction-accumulates', swatch: 'plain', mutant: 'friction-cap-accumulates' },
  { name: 'mf-gauss-seidel-stretch', swatch: 'plain', params: { STRETCH_SOLVER: 'gs' } },
  { name: 'mf-compliant-yarn', swatch: 'plain', params: { STRETCH_COMPLIANCE: 2e-6 } },
  { name: 'mf-tail-untied', swatch: 'plain', params: { TAIL_TIED: 0 } },
];
const ONLY = opt('--only', null);
const RUN = ONLY ? SPECS.filter(s => ONLY.split(',').includes(s.name)) : SPECS;

function runChild(spec) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--run', JSON.stringify(spec)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_NO_WARNINGS: '1' } });
    let o = '', e = ''; p.stdout.on('data', d => (o += d)); p.stderr.on('data', d => (e += d));
    p.on('close', code => (code === 0 ? resolve(JSON.parse(o)) : reject(new Error(`${spec.name}: exit ${code}\n${e}`))));
  });
}
console.log(`running ${RUN.length} simulations, ${JOBS} at a time…`);
const t0 = Date.now(), runs = {}, queue = RUN.slice();
await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) { const s = queue.shift(); const r = await runChild(s); runs[s.name] = r; fs.writeFileSync(path.join(OUT, `${s.name}.json`), JSON.stringify(r)); console.log(`  ${s.name}: settled ${r.settle.frames} frames, test ${r.pull.frames} frames, ${r.pull.stepped ? `${r.pull.rows.length} steps (${r.pull.unconverged} unconverged)` : 'continuous'} (${fmt((r.settle.wallMs + r.pull.wallMs) / 1000, 0)} s)`); } }));
console.log(`(${fmt((Date.now() - t0) / 1000, 0)} s)`);

// per-run readings. soft: load per unit strain of the soft region; softW: the same per d of fabric
// ACROSS the pull (the width for a wale pull, the height for a course pull), so the two directions compare.
const read = r => { const rows = r.pull.rows, jam = A.findJam(rows), cyc = A.cycleStats(rows, r.pull.restHeight); const across = r.spec.dir === 'course' ? r.settle.gap : r.settle.span; return { rows, jam, cyc, soft: jam.soft / r.pull.restHeight, softW: jam.soft / across }; };
const R = Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, read(r)]));
const has = (...ks) => ks.every(k => runs[k]);

// ---- the checks (pure) ------------------------------------------------------------------------
const V = (ok, why) => ({ ok, why });
const spread = a => Math.max(...a) / Math.min(...a) - 1;
function quasiStatic(ms) {
  const L = ms.map(m => m.cyc.lossFraction), S = ms.map(m => m.cyc.set);
  return V(spread(L) < 0.10 && spread(S) < 0.10 && S.every(s => s > 0), `loss ${L.map(v => pct(v)).join(' / ')} (spread ${pct(spread(L))}), set ${S.map(v => pct(v, 2)).join(' / ')} (spread ${pct(spread(S))})`);
}
function frictionlessNoLoss(m) { return V(m.cyc.lossFraction < 0.02, `${pct(m.cyc.lossFraction)} of the loading work lost (set ${pct(m.cyc.set, 2)})`); }
function holdsStill(r) { const h = r.peakHold; if (!h) return V(false, 'no peak hold recorded'); const d = h.end / h.start - 1; return V(Math.abs(d) < 0.02 && h.max / h.start < 1.05, `${h.frames} frames at the peak: load ${fmt(h.start)} -> ${fmt(h.end)} (${d >= 0 ? '+' : ''}${pct(d)}), highest ${fmt(h.max)}`); }
function topologyOK(start) { return V(start.bad.length === 0 && start.undetermined === 0, start.bad.length ? `${start.bad.length} loop(s) wrong, e.g. ${start.bad[0]}` : start.undetermined ? `${start.undetermined} pairs undetermined` : 'every leg passes through its parents, the right way'); }
function orderOK(o, lean) { return V(o.rows.length > 0 && o.bad.length === 0 && o.rows.every(q => q.leans === lean), o.rows.length ? `${o.rows.length} decreases, top head in front by ${o.rows.map(q => fmt(q.dz, 2)).join(', ')} d; leaning ${[...new Set(o.rows.map(q => q.leans))].join('/')}${o.bad.length ? '; ' + o.bad[0] : ''}` : 'no decreases'); }
function softRegion(mu, zero) {
  const ratio = mu.soft / zero.soft;
  return V(mu.jam.ext >= 0.12 && ratio <= 2, `jam at ${pct(mu.jam.ext, 0)}, soft region ${fmt(mu.soft)} per d = ${fmt(ratio, 2)}x the frictionless ${fmt(zero.soft)}`);
}
function strainBeforeJam(m) {   // up to the jam; if no jam came first, over the whole loading
  const jam = Number.isFinite(m.jam.ext), lim = jam ? m.jam.ext : Infinity;
  const s = Math.max(0, ...m.rows.filter(r => r.phase === 'pulling' && r.ext < lim).map(r => Math.abs(r.strain)));
  return V(s < 0.01, `largest |strain| ${jam ? `before the jam (${pct(m.jam.ext, 0)})` : 'over the whole loading (no jam reached)'}: ${pct(s, 3)}`);
}
function noCollapse(m) {
  const b = A.bin(m.rows.filter(r => r.phase === 'pulling'), 0.01).filter(p => p.ext >= m.jam.ext);
  let run = -Infinity, worst = Infinity, at = NaN;
  for (const p of b) { run = Math.max(run, p.load); const f = p.load / run; if (f < worst) { worst = f; at = p.ext; } }
  return V(b.length > 0 && worst >= 0.9, b.length ? `past the jam the load never fell below ${pct(worst, 0)} of its running peak${worst < 1 ? ` (at ${pct(at, 0)})` : ''}` : 'no jam found');
}
function endedOnLoad(r) { return V(r.pull.loadEnd === 'load' && !r.pull.strainStopped, `loading ended on: ${r.pull.loadEnd}${r.pull.strainStopped ? ' (the 5% strain stop)' : ''}`); }
function frictionAddsLoop(mu, zero) { const d = mu.cyc.lossFraction - zero.cyc.lossFraction; return V(d >= 0.03 && mu.cyc.set >= zero.cyc.set, `loss ${pct(mu.cyc.lossFraction)} against ${pct(zero.cyc.lossFraction)} frictionless (+${fmt(d * 100, 1)} points); set ${pct(mu.cyc.set, 2)} against ${pct(zero.cyc.set, 2)}`); }
function eyeletsOpen(r) { const a = r.holesSettled, b = r.holesMid; return V(!!a && a.open >= 4 && !!b && b.open >= 4, `openings >= ${HOLE_R} d in the eyelet course: ${a ? a.open : '—'} settled (r ${a ? a.band.slice(0, 5).join(', ') : '—'}), ${b ? b.open : '—'} at +${pct(MID, 0)} (r ${b ? b.band.slice(0, 5).join(', ') : '—'})`); }
function jamDiffers(e, p) { const d = e.jam.ext - p.jam.ext; return V(Math.abs(d) >= 0.05, `jam ${pct(e.jam.ext, 0)} against ${pct(p.jam.ext, 0)} (${d >= 0 ? '+' : ''}${fmt(d * 100, 0)} points)`); }
function courseVsWale(c, w) { return V(c.jam.ext >= w.jam.ext + 0.05 && c.softW < w.softW, `jam ${pct(c.jam.ext, 0)} across against ${pct(w.jam.ext, 0)} along the wales; soft region per unit strain per d across the pull ${fmt(c.softW)} against ${fmt(w.softW)} (${fmt(c.softW / w.softW, 2)}x)`); }
function ribVsJersey(rc, jc, rr, jr) { const k = rc.jam.ext / jc.jam.ext, wr = rr.free.span / jr.free.span; return V(k >= 1.25 && wr <= 0.95, `jam along the courses ${pct(rc.jam.ext, 0)} against jersey's ${pct(jc.jam.ext, 0)} (${fmt(k, 2)}x); width at rest, released: ${fmt(rr.free.span, 1)} d against ${fmt(jr.free.span, 1)} d (${fmt(wr, 3)}x)`); }
function safe(r) { return V(r.settle.deep === 0 && r.pull.deep === 0 && r.settle.certFail === 0 && r.pull.certFail === 0, `deep overlaps ${r.settle.deep}/${r.pull.deep}; certificate ${r.settle.certSteps - r.settle.certFail}/${r.settle.certSteps} settling, ${r.pull.certSteps - r.pull.certFail}/${r.pull.certSteps} testing; closest ${fmt(Math.min(r.settle.closest, r.pull.closest), 3)} d`); }
const gate = (v, msg) => check(v.ok, `${msg}: ${v.why}`);

// ---- Q: quasi-static --------------------------------------------------------------------------
if (has('plain', 'plain-step0.5', 'plain-tol0.05', 'plain-step0.5-tol0.05', 'plain-mu0', 'mf-phase2-fast', 'mf-phase2-slow', 'mf-phase2-mu0')) {
  console.log('\n== Q. the stepped test is quasi-static');
  for (const k of ['plain', 'plain-step0.5', 'plain-tol0.05', 'plain-step0.5-tol0.05', 'plain-mu0', 'mf-phase2-fast', 'mf-phase2-slow', 'mf-phase2-mu0']) {
    const c = R[k].cyc, r = runs[k]; console.log(`  ${k.padEnd(24)} ${r.pull.stepped ? `${r.pull.rows.length} steps, ${r.pull.unconverged} unconverged, ${fmt(mean(r.pull.rows.map(q => q.frames)), 0)} frames a hold` : 'continuous'}: ${pct(c.lossFraction)} lost, set ${pct(c.set, 2)}, jam ${pct(R[k].jam.ext, 0)}, peak ${fmt(r.pull.peak.load)} at ${pct(r.pull.peak.ext, 0)}`);
  }
  gate(quasiStatic(['plain', 'plain-step0.5', 'plain-tol0.05', 'plain-step0.5-tol0.05'].map(k => R[k])), 'μ 0.25: loss and set agree across step 1% / 0.5% x tolerance 0.2% / 0.05%');
  mustFail(quasiStatic([R['mf-phase2-fast'], R['mf-phase2-slow']]), 'the phase-2 test at 1.5 and 0.5 d/s');
  gate(frictionlessNoLoss(R['plain-mu0']), 'μ 0: the stepped cycle loses under 2%');
  mustFail(frictionlessNoLoss(R['mf-phase2-mu0']), 'the phase-2 test, frictionless');
}

// ---- H: hold ----------------------------------------------------------------------------------
if (has('plain', 'mf-friction-substep')) {
  console.log('\n== H. held in the jam, the load stays put');
  gate(holdsStill(runs.plain), 'μ 0.25, FRICTION_MODE memory');
  mustFail(holdsStill(runs['mf-friction-substep']), 'the phase-2 friction (each substep\'s slip only)');
}

// ---- T: topology -----------------------------------------------------------------------------
if (has('plain', 'eyelet', 'eyelet-ssk', 'rib-course')) {
  console.log('\n== T. topology: each drawn start is its chart');
  const bad3 = T.makeStockinette(4, 4); bad3.loops[bad3.rows[2][1]].through = [bad3.rows[1][0], bad3.rows[1][1], bad3.rows[1][2]];
  check(T.validateTopology(bad3).some(m => /3 parents/.test(m)), 'a loop pulled through three loops is refused by the record check');
  for (const s of ['eyelet', 'eyelet-ssk', 'rib']) { const t = makeSwatch(s); const c = t.eyelet ?? 1; check(T.validateTopology(t).length === 0, `the ${s} chart validates; course ${c}: ${t.rows[c].map(id => t.loops[id].kind).join(' ')}`); }
  gate(topologyOK(runs.plain.start), 'plain stockinette, drawn start');
  gate(topologyOK(runs.eyelet.start), 'eyelet (yo, k2tog), drawn start');
  gate(topologyOK(runs['eyelet-ssk'].start), 'eyelet (ssk, yo), drawn start');
  gate(topologyOK(runs['rib-course'].start), '1x1 rib, drawn start (purl legs the other way)');
  const M = await loadSim('decrease-head-not-moved'), Q = await loadSim('purl-drawn-knitwise');
  for (const s of ['eyelet', 'eyelet-ssk']) { const t = makeSwatch(s), y = M.buildYarn(t); mustFail(topologyOK(A.legLinks(t, y.pos, y.loopOf, y.uOf)), `the ${s} decreases drawn without the top parent's head moved over`); }
  { const t = makeSwatch('rib'), y = Q.buildYarn(t); mustFail(topologyOK(A.legLinks(t, y.pos, y.loopOf, y.uOf)), 'the rib\'s purl loops drawn knitwise'); }
  console.log(`  start: closest approach ${['plain', 'eyelet', 'eyelet-ssk', 'rib-course'].map(k => `${k} ${fmt(runs[k].start.closest, 3)} d`).join(', ')}; points ${['plain', 'eyelet', 'eyelet-ssk', 'rib-course'].map(k => runs[k].n).join(' / ')}; yarn per loop ${['plain', 'rib-course'].map(k => `${k} ${fmt(runs[k].loopLength, 2)} d`).join(', ')}`);
}

// ---- O: which parent of a decrease is on top --------------------------------------------------
if (has('eyelet', 'eyelet-ssk')) {
  console.log('\n== O. the decreases keep their order (k2tog leans right, ssk left)');
  for (const [k, lean] of [['eyelet', 'right'], ['eyelet-ssk', 'left']]) for (const [when, o] of [['drawn', runs[k].start.order], ['settled', runs[k].settle.order], ['after the test', runs[k].endOrder]]) gate(orderOK(o, lean), `${k}, ${when}`);
  { const t = makeSwatch('eyelet-ssk'), sw = { ...t, loops: t.loops.map(l => (l.through.length === 2 ? { ...l, through: [l.through[1], l.through[0]] } : l)) };
    const { buildYarn } = await loadSim(); const y = buildYarn(t);
    mustFail(orderOK(A.decreaseOrder(sw, y.pos, y.loopOf, y.uOf), 'left'), 'the ssk swatch read against a record with its parents swapped'); }
}

// ---- F: friction ---------------------------------------------------------------------------
if (has('plain', 'plain-mu0', 'mf-friction-accumulates')) {
  console.log('\n== F. friction: μ 0.25 still rearranges before the jam');
  console.log(`  soft region (0-10%), load per d of jaw travel: μ 0 ${fmt(R['plain-mu0'].soft)}, μ 0.25 ${fmt(R.plain.soft)}; jam ${pct(R['plain-mu0'].jam.ext, 0)} / ${pct(R.plain.jam.ext, 0)}`);
  gate(softRegion(R.plain, R['plain-mu0']), 'μ 0.25 has a soft region before the jam');
  mustFail(softRegion(R['mf-friction-accumulates'], R['plain-mu0']), `friction capped by a normal multiplier accumulated across substeps (largest strain ${pct(Math.max(...R['mf-friction-accumulates'].rows.map(r => r.strain)), 0)})`);
}

// ---- I: inextensible --------------------------------------------------------------------------
if (has('plain', 'eyelet', 'mf-compliant-yarn', 'mf-gauss-seidel-stretch', 'mf-tail-untied')) {
  console.log('\n== I. the yarn stays inextensible up to the jam, and the load does not collapse past it');
  for (const k of ['plain', 'eyelet', 'eyelet-ssk', 'plain-course', 'rib-course'].filter(k => runs[k])) {
    gate(strainBeforeJam(R[k]), `${k}: strain < 1% before the jam`);
    gate(noCollapse(R[k]), `${k}: no collapse past the jam`);
    gate(endedOnLoad(runs[k]), `${k}: the test, not the strain safety, ends the loading (peak ${fmt(runs[k].pull.peak.load)} at ${pct(runs[k].pull.peak.ext)}; largest strain anywhere ${pct(Math.max(...R[k].rows.map(r => Math.abs(r.strain))), 3)})`);
  }
  mustFail(strainBeforeJam(R['mf-compliant-yarn']), 'a yarn 2,000x more compliant (STRETCH_COMPLIANCE 2e-6)');
  mustFail(endedOnLoad(runs['mf-gauss-seidel-stretch']), `the one-sweep Gauss-Seidel stretch solve, the first version (${strainBeforeJam(R['mf-gauss-seidel-stretch']).why})`);
  mustFail(noCollapse(R['mf-tail-untied']), 'the yarn\'s end left free (it unravels from the tail under load)');
}

// ---- C: cycle ---------------------------------------------------------------------------------
if (has('plain', 'plain-mu0')) {
  console.log('\n== C. load-unload: friction makes the loop');
  for (const k of ['plain', 'plain-mu0', 'eyelet', 'eyelet-ssk', 'plain-course', 'rib-course'].filter(k => runs[k])) { const c = R[k].cyc; console.log(`  ${k.padEnd(13)} loading work ${fmt(c.workLoad)}, given back ${fmt(c.workUnload)}: ${pct(c.lossFraction)} lost; set ${pct(c.set, 2)} (at load ${fmt(c.setLoad)}: ${pct(c.setAtLoading, 1)} up, ${pct(c.setAtUnloading, 1)} down)`); }
  gate(frictionAddsLoop(R.plain, R['plain-mu0']), 'μ 0.25 against μ 0');
  mustFail(frictionAddsLoop(R['plain-mu0'], R['plain-mu0']), 'μ 0 against itself');
}

// ---- E: eyelet --------------------------------------------------------------------------------
if (has('plain', 'eyelet', 'eyelet-ssk')) {
  console.log('\n== E. eyelets');
  gate(eyeletsOpen(runs.eyelet), 'the yo, k2tog row opens into holes');
  gate(eyeletsOpen(runs['eyelet-ssk']), 'the ssk, yo row opens into holes');
  mustFail(eyeletsOpen({ holesSettled: runs.plain.holesSettled || { open: 0, band: [] }, holesMid: runs.plain.holesMid || { open: 0, band: [] } }), 'the plain swatch (no eyelet course: no openings measured)');
  gate(jamDiffers(R.eyelet, R.plain), 'the k2tog eyelet swatch jams at a different extension');
  gate(jamDiffers(R['eyelet-ssk'], R.plain), 'the ssk eyelet swatch jams at a different extension');
  mustFail(jamDiffers(R.plain, R.plain), 'plain against itself');
  console.log(`  soft region per d: eyelet ${fmt(R.eyelet.soft)}, ssk ${fmt(R['eyelet-ssk'].soft)}, plain ${fmt(R.plain.soft)}`);
}

// ---- D: direction -----------------------------------------------------------------------------
if (has('plain', 'plain-course')) {
  console.log('\n== D. jersey along the courses against along the wales');
  for (const k of ['plain', 'plain-course', 'rib-course'].filter(k => runs[k])) { const r = runs[k]; console.log(`  ${k.padEnd(13)} gauge ${fmt(r.pull.restHeight, 1)} d (${r.spec.dir === 'course' ? `side jaws ${r.pull.side.left} + ${r.pull.side.right} points; width released ${fmt(r.free.span, 1)} d after ${r.free.frames} frames` : 'comb to cast-on'}); soft region ${fmt(R[k].jam.soft)} per unit strain = ${fmt(R[k].softW)} per d across; jam ${pct(R[k].jam.ext, 0)}; peak ${fmt(r.pull.peak.load)} at ${pct(r.pull.peak.ext, 0)}`); }
  gate(courseVsWale(R['plain-course'], R.plain), 'jersey is softer and jams later along the courses');
  mustFail(courseVsWale(R.plain, R.plain), 'wale against wale');
}

// ---- R: rib -----------------------------------------------------------------------------------
if (has('plain-course', 'rib-course')) {
  console.log('\n== R. 1x1 rib against jersey, along the courses');
  gate(ribVsJersey(R['rib-course'], R['plain-course'], runs['rib-course'], runs['plain-course']), 'rib jams much later and draws in at rest');
  mustFail(ribVsJersey(R['plain-course'], R['plain-course'], runs['plain-course'], runs['plain-course']), 'jersey against itself');
}

// ---- S: safety -------------------------------------------------------------------------------
console.log('\n== S. no pass-through');
for (const k of ['plain', 'eyelet', 'rib-course'].filter(k => runs[k])) gate(safe(runs[k]), `${k} (audited)`);
if (runs.plain) console.log(`  settle: ${Object.entries(runs).filter(([k]) => !k.startsWith('mf')).map(([k, r]) => `${k} ${r.settle.frames}${r.settle.hitCap ? ' (CAP)' : ''}`).join(', ')} frames; ms per substep (audited) ${fmt(runs.plain.settle.msPerSubstep, 2)}`);

// ---- W: worker -------------------------------------------------------------------------------
if (flag('--browser')) {
  console.log('\n== W. the page keeps drawing while it settles');
  const w = await browserGaps();
  for (const [k, g] of Object.entries(w)) console.log(`  ${k}: ${g.frames} animation frames in ${fmt(g.ms / 1000, 1)} s of settling; gap p50 ${fmt(g.p50, 1)} ms, p95 ${fmt(g.p95, 1)} ms, longest ${fmt(g.max, 1)} ms${g.errors.length ? '; errors: ' + g.errors.join(' | ') : ''}`);
  const workerOK = g => V(g.p95 < 60 && g.max < 100 && g.errors.length === 0, `p95 ${fmt(g.p95, 1)} ms, longest gap ${fmt(g.max, 1)} ms`);
  gate(workerOK(w.worker), 'simulation in a Web Worker');
  mustFail(workerOK(w.main), 'the same page with #WORKER=0 (the simulation on the page\'s thread)');
}

// ---- the size-vs-speed table ------------------------------------------------------------------
if (flag('--scale')) {
  console.log('\n== size against speed (settling frames, this solver; not gated)');
  const tb = await scaleTable();
  const sub = (await loadSim()).PARAMS.SUBSTEPS_PER_FRAME;
  for (const r of tb) console.log(`  ${r.swatch.padEnd(8)} ${String(r.points).padStart(6)} points, ${String(r.pairs).padStart(7)} pairs: ${fmt(r.msPerSubstep, 2)} ms a substep, ${fmt(r.msPerFrame, 0)} ms a ${sub}-substep frame (${fmt(r.usPerPoint, 2)} µs a point)`);
  fs.writeFileSync(path.join(OUT, 'scale.json'), JSON.stringify(tb, null, 1));
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ params: (await loadSim()).PARAMS, runs: Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, { ...r, pull: { ...r.pull, rows: undefined }, jam: R[k].jam.ext, soft: R[k].soft, softW: R[k].softW, cycle: R[k].cyc }])) }, null, 1));
fs.writeFileSync(path.join(OUT, 'load-unload.csv'), 'run,extension,load,phase,max_strain\n' + Object.entries(runs).flatMap(([k, r]) => r.pull.rows.map(x => [k, x.ext, x.load, x.phase, x.strain].join(','))).join('\n') + '\n');
console.log(`\nwrote ${path.join(OUT, 'summary.json')} and load-unload.csv`);
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);

// ---- the browser half ---------------------------------------------------------------------------
async function browserGaps() {
  const { createRequire } = await import('node:module'); const require = createRequire(import.meta.url);
  let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
  const http = await import('node:http');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const browser = await pw.chromium.launch(), out = {};
  for (const [k, hash] of [['worker', ''], ['main', '#WORKER=0']]) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${server.address().port}/knit-lab.html${hash}`);
    await page.waitForFunction(() => window.__knitLab && window.__knitLab.state && window.__knitLab.state.phase === 'settling' && window.__knitLab.state.frame > 5, null, { timeout: 60000 });
    out[k] = { ...(await page.evaluate(() => new Promise(res => { const g = []; let last = 0; const t0 = performance.now(); const f = t => { if (last) g.push(t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else { g.sort((a, b) => a - b); res({ frames: g.length, ms: t - t0, p50: g[g.length >> 1], p95: g[Math.floor(g.length * 0.95)], max: g[g.length - 1], stillSettling: window.__knitLab.state.phase === 'settling' }); } }; requestAnimationFrame(f); }))), errors };
    await page.close();
  }
  await browser.close(); server.close();
  return out;
}
