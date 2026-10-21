// tools/verify-knit-lab.mjs — the knit-lab spike's numbers, measured in Node on the shipped modules.
//
//   node tools/verify-knit-lab.mjs [--out <dir>] [--jobs N] [--browser] [--rates] [--scale]
//   node tools/verify-knit-lab.mjs --run '<spec json>'      one simulation, JSON on stdout (internal)
//
// Every simulation is its own child process (--jobs at a time, default 4). Each settles a 10 x 10
// swatch and runs the automatic load-unload test (KnitSim.startPull(true, true): load to
// LOAD_LIMIT, unload to the start, hold). The pass-through certificate is on for the two
// reference runs.
//
// THE GATES. Every check is a pure function of measured runs, and every one is also handed an
// input it must REJECT (a "must-fail"); a check that cannot fail is not a check.
//   T  topology   the drawn start is the charted knit: each leg of each loop passes once through
//                 exactly the loops it was pulled through (linking numbers, knit-lab-analysis.js).
//                 Must-fail: the k2tog drawn without its right parent's head moved over.
//   F  friction   at μ 0.25 the curve keeps a soft region before the jam: the jam (stiffness 10x
//                 the 0-10% region) is at >= 12% and the soft region is at most twice as stiff as
//                 the frictionless swatch's. Must-fail: friction capped by a normal multiplier
//                 accumulated across substeps (the bug the brief asked about).
//   I  inextensible  strain < 1% before the jam; the load never falls below 90% of its running
//                 peak past the jam; the loading ends on the LOAD LIMIT, not on the 5% strain stop.
//                 Must-fails: a yarn 2,000x more compliant (strain > 1%); the old one-sweep stretch
//                 solve (it ends on the strain stop — its strain before its own jam is 0.97%, a knife
//                 edge, so it is not used for the 1% check); the yarn's end left untied (the load
//                 collapses past the jam).
//   C  cycle      μ 0.25: at least 15% of the loading work lost and at least 2% permanent set;
//                 μ 0: under a third of that loss and under half that set. Must-fails: each
//                 condition handed the other swatch's numbers.
//   E  eyelet     at least 4 openings of inscribed radius >= 1 d in the eyelet course, settled and
//                 at +20%; the eyelet swatch jams at least 5 points of extension away from plain.
//                 Must-fails: the plain swatch's openings; plain against itself.
//   S  safety     no yarn pair closer than ½ d and the certificate unbroken on the audited runs.
//   W  worker     (--browser) the page keeps drawing while it settles: gaps between animation
//                 frames p95 < 60 ms, none > 100 ms, with the simulation in a Web Worker. Must-fail:
//                 the same page with #WORKER=0 (the simulation on the page's thread).

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
  'k2tog-head-not-moved': { file: 'knit-lab-sim.js', from: '+ headShift.get(id) * ramp(u, K.s0, K.s1)', to: '+ 0' },
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
const makeSwatch = s => (s === 'eyelet' ? T.makeEyelet(10, 10) : T.makeStockinette(10, 10));
const HOLE_R = 1.0, MID = 0.2;

// ---- one simulation (child process) ----------------------------------------------------------
if (flag('--run')) {
  const spec = JSON.parse(opt('--run'));
  const { KnitSim, PARAMS } = await loadSim(spec.mutant);
  const P = { ...PARAMS, ...(spec.params || {}) };
  const topo = makeSwatch(spec.swatch), band = topo.eyelet ?? 5;
  const sim = new KnitSim(topo, P); sim.audit = !!spec.audit;
  const L = A.legLinks(topo, sim.x, sim.loopOf, sim.uOf);
  const out = { name: spec.name, spec, n: sim.n, loopLength: sim.loopLength, start: { bad: L.bad, undetermined: L.undetermined, loops: L.pairs, closest: sim.countOverlaps(0.5).min } };
  const holeReport = () => { const h = A.holes(sim.x, sim.n), b = A.holesInCourse(h, sim.x, sim.course, sim.n, band); return { band: b.slice(0, 8).map(o => +o.r.toFixed(3)), open: b.filter(o => o.r >= HOLE_R).length }; };
  let deep = 0, t0 = performance.now();
  while (sim.phase === 'settling') { sim.stepFrame(); if (sim.frame % 20 === 0) deep = Math.max(deep, sim.countOverlaps(0.5).pairs); }
  const st = sim.settledAt;
  out.settle = { frames: st.frames, hitCap: st.hitCap, gap: sim.jawGap(), wallMs: performance.now() - t0, msPerSubstep: st.ms / st.steps, deep, certFail: sim.stats.certFail, certSteps: sim.stats.certSteps, worstMargin: sim.stats.worstMargin, closest: sim.stats.minDist, strain: sim.maxStrain() };
  out.holesSettled = holeReport();
  sim.stats.certFail = 0; sim.stats.certSteps = 0; sim.stats.worstMargin = Infinity; sim.stats.minDist = Infinity;
  sim.startPull(true, true); deep = 0; t0 = performance.now();
  const rows = []; let mid = null;
  while (sim.phase !== 'done') {
    sim.stepFrame();
    rows.push([+sim.extension().toFixed(6), +sim.stats.loadBottom.toFixed(2), sim.phase, +sim.stats.maxStrain.toFixed(7)]);
    if (!mid && sim.phase === 'pulling' && sim.extension() >= MID) mid = { ext: sim.extension(), ...holeReport() };
    if (spec.audit && sim.frame % 10 === 0) deep = Math.max(deep, sim.countOverlaps(0.5).pairs);
    if (rows.length > 20000) break;
  }
  out.holesMid = mid;
  out.pull = { rows, loadEnd: sim.loadEnd, peak: sim.peak, restHeight: sim.restHeight, wallMs: performance.now() - t0, deep, certFail: sim.stats.certFail, certSteps: sim.stats.certSteps, worstMargin: sim.stats.worstMargin, closest: sim.stats.minDist, strainStopped: sim.strainStopped };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
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

const SPECS = [
  { name: 'plain', swatch: 'plain', audit: true },
  { name: 'plain-mu0', swatch: 'plain', params: { FRICTION: 0 } },
  { name: 'eyelet', swatch: 'eyelet', audit: true },
  { name: 'mf-friction-accumulates', swatch: 'plain', mutant: 'friction-cap-accumulates' },
  { name: 'mf-gauss-seidel-stretch', swatch: 'plain', params: { STRETCH_SOLVER: 'gs' } },
  { name: 'mf-compliant-yarn', swatch: 'plain', params: { STRETCH_COMPLIANCE: 2e-6 } },
  { name: 'mf-tail-untied', swatch: 'plain', params: { TAIL_TIED: 0 } },
];
if (flag('--rates')) SPECS.push({ name: 'plain-slow', swatch: 'plain', params: { PULL_SPEED: 0.5 } }, { name: 'plain-mu0-slow', swatch: 'plain', params: { FRICTION: 0, PULL_SPEED: 0.5 } });

function runChild(spec) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--run', JSON.stringify(spec)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_NO_WARNINGS: '1' } });
    let o = '', e = ''; p.stdout.on('data', d => (o += d)); p.stderr.on('data', d => (e += d));
    p.on('close', code => (code === 0 ? resolve(JSON.parse(o)) : reject(new Error(`${spec.name}: exit ${code}\n${e}`))));
  });
}
console.log(`running ${SPECS.length} simulations, ${JOBS} at a time…`);
const t0 = Date.now(), runs = {}, queue = SPECS.slice();
await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) { const s = queue.shift(); const r = await runChild(s); runs[s.name] = r; console.log(`  ${s.name}: settled ${r.settle.frames} frames, test ${r.pull.rows.length} frames (${fmt((r.settle.wallMs + r.pull.wallMs) / 1000, 0)} s)`); } }));
console.log(`(${fmt((Date.now() - t0) / 1000, 0)} s)`);

// rows -> analysis rows; per-run readings
const rowsOf = r => r.pull.rows.map(([ext, load, phase, strain]) => ({ ext, load, phase: phase === 'held' ? 'pulling' : phase, strain }));
const read = r => { const rows = rowsOf(r), jam = A.findJam(rows), cyc = A.cycleStats(rows, r.pull.restHeight); return { rows, jam, cyc, soft: jam.soft / r.pull.restHeight }; };
const R = Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, read(r)]));

// ---- the checks (pure) ------------------------------------------------------------------------
const V = (ok, why) => ({ ok, why });
function topologyOK(start) { return V(start.bad.length === 0 && start.undetermined === 0, start.bad.length ? `${start.bad.length} loop(s) wrong, e.g. ${start.bad[0]}` : start.undetermined ? `${start.undetermined} pairs undetermined` : 'every leg passes through its parents'); }
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
function frictionLoop(c) { return V(c.cyc.lossFraction >= 0.15 && c.cyc.set >= 0.02, `${pct(c.cyc.lossFraction)} of the loading work lost, set ${pct(c.cyc.set)}`); }
function frictionlessVanishes(c, ref) { return V(c.cyc.lossFraction <= ref.cyc.lossFraction / 3 && c.cyc.set <= ref.cyc.set / 2, `${pct(c.cyc.lossFraction)} lost and set ${pct(c.cyc.set)}, against ${pct(ref.cyc.lossFraction)} / ${pct(ref.cyc.set)} with friction`); }
function eyeletsOpen(r) { const a = r.holesSettled, b = r.holesMid; return V(a.open >= 4 && b && b.open >= 4, `openings >= ${HOLE_R} d in the eyelet course: ${a.open} settled (r ${a.band.slice(0, 5).join(', ')}), ${b ? b.open : '—'} at +${pct(MID, 0)} (r ${b ? b.band.slice(0, 5).join(', ') : '—'})`); }
function jamDiffers(e, p) { const d = e.jam.ext - p.jam.ext; return V(Math.abs(d) >= 0.05, `jam ${pct(e.jam.ext, 0)} against ${pct(p.jam.ext, 0)} (${d >= 0 ? '+' : ''}${fmt(d * 100, 0)} points)`); }
function safe(r) { return V(r.settle.deep === 0 && r.pull.deep === 0 && r.settle.certFail === 0 && r.pull.certFail === 0, `deep overlaps ${r.settle.deep}/${r.pull.deep}; certificate ${r.settle.certSteps - r.settle.certFail}/${r.settle.certSteps} settling, ${r.pull.certSteps - r.pull.certFail}/${r.pull.certSteps} testing; closest ${fmt(Math.min(r.settle.closest, r.pull.closest), 3)} d`); }
const gate = (v, msg) => check(v.ok, `${msg}: ${v.why}`);

// ---- T: topology -----------------------------------------------------------------------------
console.log('\n== T. topology: the drawn start is the charted knit');
{
  const bad3 = T.makeStockinette(4, 4); bad3.loops[bad3.rows[2][1]].through = [bad3.rows[1][0], bad3.rows[1][1], bad3.rows[1][2]];
  check(T.validateTopology(bad3).some(m => /3 parents/.test(m)), 'a loop pulled through three loops is refused by the record check');
  const e = makeSwatch('eyelet'); const row = e.rows[e.eyelet].map(id => e.loops[id].kind);
  check(T.validateTopology(e).length === 0, `the eyelet chart validates; course ${e.eyelet}: ${row.join(' ')}`);
  gate(topologyOK(runs.plain.start), 'plain stockinette, drawn start');
  gate(topologyOK(runs.eyelet.start), 'eyelet row, drawn start (yo through nothing, k2tog through both parents)');
  const { buildYarn } = await loadSim('k2tog-head-not-moved');
  const y = buildYarn(e); mustFail(topologyOK(A.legLinks(e, y.pos, y.loopOf, y.uOf)), 'the k2tog drawn without its right parent\'s head moved over');
  console.log(`  start: closest approach ${fmt(runs.plain.start.closest, 3)} d plain, ${fmt(runs.eyelet.start.closest, 3)} d eyelet (drawn ${2.5}x deep, the plates closing)`);
}

// ---- F: friction ---------------------------------------------------------------------------
console.log('\n== F. friction: μ 0.25 still rearranges before the jam');
console.log(`  soft region (0-10%), load per d of jaw travel: μ 0 ${fmt(R['plain-mu0'].soft)}, μ 0.25 ${fmt(R.plain.soft)}; jam ${pct(R['plain-mu0'].jam.ext, 0)} / ${pct(R.plain.jam.ext, 0)}`);
gate(softRegion(R.plain, R['plain-mu0']), 'μ 0.25 has a soft region before the jam');
mustFail(softRegion(R['mf-friction-accumulates'], R['plain-mu0']), `friction capped by a normal multiplier accumulated across substeps (largest strain ${pct(Math.max(...R['mf-friction-accumulates'].rows.map(r => r.strain)), 0)})`);

// ---- I: inextensible --------------------------------------------------------------------------
console.log('\n== I. the yarn stays inextensible up to the jam, and the load does not collapse past it');
for (const k of ['plain', 'eyelet']) {
  gate(strainBeforeJam(R[k]), `${k}: strain < 1% before the jam`);
  gate(noCollapse(R[k]), `${k}: no collapse past the jam`);
  gate(endedOnLoad(runs[k]), `${k}: the test, not the strain safety, ends the loading (peak ${fmt(runs[k].pull.peak.load)} at ${pct(runs[k].pull.peak.ext)}; largest strain anywhere ${pct(Math.max(...R[k].rows.map(r => r.strain)), 3)})`);
}
mustFail(strainBeforeJam(R['mf-compliant-yarn']), 'a yarn 2,000x more compliant (STRETCH_COMPLIANCE 2e-6)');
mustFail(endedOnLoad(runs['mf-gauss-seidel-stretch']), `the one-sweep Gauss-Seidel stretch solve, the first version (${strainBeforeJam(R['mf-gauss-seidel-stretch']).why})`);
mustFail(noCollapse(R['mf-tail-untied']), 'the yarn\'s end left free (it unravels from the tail under load)');

// ---- C: cycle ---------------------------------------------------------------------------------
console.log('\n== C. load-unload: hysteresis and permanent set');
for (const k of ['plain', 'plain-mu0', 'eyelet', ...(flag('--rates') ? ['plain-slow', 'plain-mu0-slow'] : [])]) {
  const c = R[k].cyc; console.log(`  ${k.padEnd(15)} loading work ${fmt(c.workLoad)}, given back ${fmt(c.workUnload)}: ${pct(c.lossFraction)} lost; set ${pct(c.set)} (at load ${fmt(c.setLoad)}: ${pct(c.setAtLoading, 0)} up, ${pct(c.setAtUnloading, 0)} down)`);
}
gate(frictionLoop(R.plain), 'μ 0.25: a visible loop and a nonzero set');
gate(frictionlessVanishes(R['plain-mu0'], R.plain), 'μ 0: loop and set nearly vanish');
mustFail(frictionLoop(R['plain-mu0']), 'the μ 0.25 condition handed the frictionless swatch');
mustFail(frictionlessVanishes(R.plain, R.plain), 'the μ 0 condition handed the swatch with friction');

// ---- E: eyelet --------------------------------------------------------------------------------
console.log('\n== E. eyelets');
gate(eyeletsOpen(runs.eyelet), 'the eyelet row opens into holes');
mustFail(eyeletsOpen(runs.plain), 'the plain swatch, same course');
gate(jamDiffers(R.eyelet, R.plain), 'the eyelet swatch jams at a different extension');
mustFail(jamDiffers(R.plain, R.plain), 'plain against itself');
console.log(`  soft region per d: eyelet ${fmt(R.eyelet.soft)}, plain ${fmt(R.plain.soft)}; load at the jam ${fmt(R.eyelet.jam.load)} / ${fmt(R.plain.jam.load)}`);

// ---- S: safety -------------------------------------------------------------------------------
console.log('\n== S. no pass-through');
gate(safe(runs.plain), 'plain (audited)');
gate(safe(runs.eyelet), 'eyelet (audited)');
console.log(`  settle: plain ${runs.plain.settle.frames} frames, eyelet ${runs.eyelet.settle.frames}${runs.plain.settle.hitCap || runs.eyelet.settle.hitCap ? ' (HIT THE CAP)' : ''}; ms per substep (audited) ${fmt(runs.plain.settle.msPerSubstep, 2)} / ${fmt(runs.eyelet.settle.msPerSubstep, 2)}`);

// ---- W: worker -------------------------------------------------------------------------------
if (flag('--browser')) {
  console.log('\n== W. the page keeps drawing while it settles');
  const w = await browserGaps();
  for (const [k, g] of Object.entries(w)) console.log(`  ${k}: ${g.frames} animation frames in ${fmt(g.ms / 1000, 1)} s of settling; gap p50 ${fmt(g.p50, 1)} ms, p95 ${fmt(g.p95, 1)} ms, longest ${fmt(g.max, 1)} ms${g.errors.length ? '; errors: ' + g.errors.join(' | ') : ''}`);
  // headless Chromium paints at ~30 fps here (p50 33 ms with nothing to do), so the bar is p95 under
  // 60 ms and no frame later than 100 ms; the first version held the thread 80 ms at a time
  const workerOK = g => V(g.p95 < 60 && g.max < 100 && g.errors.length === 0, `p95 ${fmt(g.p95, 1)} ms, longest gap ${fmt(g.max, 1)} ms`);
  gate(workerOK(w.worker), 'simulation in a Web Worker');
  mustFail(workerOK(w.main), 'the same page with #WORKER=0 (the simulation on the page\'s thread)');
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ params: (await loadSim()).PARAMS, runs: Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, { ...r, pull: { ...r.pull, rows: undefined }, jam: R[k].jam.ext, soft: R[k].soft, cycle: R[k].cyc }])) }, null, 1));
fs.writeFileSync(path.join(OUT, 'load-unload.csv'), 'run,extension,load_bottom,phase,max_strain\n' + Object.entries(runs).flatMap(([k, r]) => r.pull.rows.map(x => [k, ...x].join(','))).join('\n') + '\n');
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
    // 6 s of animation frames, inside the settle
    out[k] = { ...(await page.evaluate(() => new Promise(res => { const g = []; let last = 0; const t0 = performance.now(); const f = t => { if (last) g.push(t - last); last = t; if (t - t0 < 6000) requestAnimationFrame(f); else { g.sort((a, b) => a - b); res({ frames: g.length, ms: t - t0, p50: g[g.length >> 1], p95: g[Math.floor(g.length * 0.95)], max: g[g.length - 1], stillSettling: window.__knitLab.state.phase === 'settling' }); } }; requestAnimationFrame(f); }))), errors };
    await page.close();
  }
  await browser.close(); server.close();
  return out;
}
