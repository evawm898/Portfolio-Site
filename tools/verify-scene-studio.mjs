#!/usr/bin/env node
// verify-scene-studio.mjs — the behaviour gate for scene 4: the studio bay
// window and its two cats.
//
//   node tools/verify-scene-studio.mjs [--no-browser] [--negative-control] [--mutant=a,b]
//
// NOTHING IN CI COVERS /scene, so this runs by hand. It is in two halves:
//
// PART ONE drives the shipped modules in Node. Every number it holds the cats
// to is WRITTEN DOWN HERE FROM THE BRIEF — 200-400 ms notice, 500-1200 ms
// gather, 80-120 ms launch, 250-450 ms flight, apex 15-25% of the rise above the
// landing surface, hind paws 60-100 ms after the forepaws, 120-180 ms
// compression, 300-800 ms settle, 20-60 s between relocations — never imported
// from the module under test. And the MEASURED side is the motion's output, not
// its bookkeeping: contact times are read off the paw heights the cat samples,
// the apex off the arc it actually flew, gravity off the second difference of
// its height. A clause that read `cat.events` for when a paw landed would be
// asking the planner whether the planner was right.
//
// PART TWO drives the real page: it loads, it draws, a real click on a drawn
// cat reaches that cat, and ?dev=1's panel is fenced from the shell's input.
//
// --negative-control is REQUIRED before quoting a pass from a changed harness:
// it copies the studio modules beside themselves, applies one deliberate defect
// at a time, and fails unless every check that defect names goes red (and no
// other does). Each anchor is checked before any mutant runs.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE = path.join(REPO, 'scene');
const STUDIO = ['studio-room.js', 'studio-cat.js', 'studio-rig.js', 'studio-cats.js', 'studio-draw.js', 'studio-dev.js', 'scene-studio.js'];
const argv = process.argv.slice(2);
const NO_BROWSER = argv.includes('--no-browser');
const NEG = argv.includes('--negative-control');
const ONLY = (argv.find(a => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);

process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ModuleTypelessPackageJsonWarning' && !/Reparsing/.test(w.message)) console.warn(String(w)); });

// ---------------------------------------------------------------- the brief --
const BRIEF = {
  notice: [200, 400], gather: [500, 1200], launch: [80, 120], flight: [250, 450],
  apex: [0.15, 0.25], hindLag: [60, 100], compress: [120, 180], recover: [100, 200],
  settle: [300, 800],
  // the ambient spec as REVISED (Eva, after viewing #493): a deliberate action
  // every 5-12 s across the pair, at least one cat usually doing something,
  // dozes brief and self-ending, two cats free to move at once but never in
  // step, the floor shared but never by two cats on top of each other
  actionEvery: [5, 12], busyShare: 0.6, doze: [8, 20], floorApart: 55,
};

// ---------------------------------------------------------------- harness ---
let results = [];
let section = '';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function check(name, fn) {
  const full = `${section}/${slug(name)}`;
  try { results.push({ name: full, ok: true, detail: fn() || '' }); }
  catch (e) { results.push({ name: full, ok: false, detail: e && e.message ? e.message : String(e) }); }
}
async function checkAsync(name, fn) {
  const full = `${section}/${slug(name)}`;
  try { results.push({ name: full, ok: true, detail: (await fn()) || '' }); }
  catch (e) { results.push({ name: full, ok: false, detail: e && e.message ? e.message : String(e) }); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const inRange = (v, r, what, slack = 0.5) => assert(v >= r[0] - slack && v <= r[1] + slack, `${what}: ${v.toFixed(1)} outside [${r[0]}, ${r[1]}]`);

async function load(dir) {
  const imp = (f) => import(pathToFileURL(path.join(dir, f)).href + `?v=${Date.now()}${Math.random()}`);
  // the modules import each other relatively, so one directory is one tree
  const room = await import(pathToFileURL(path.join(dir, 'studio-room.js')).href);
  const cat = await import(pathToFileURL(path.join(dir, 'studio-cat.js')).href);
  const cats = await import(pathToFileURL(path.join(dir, 'studio-cats.js')).href);
  const rig = await import(pathToFileURL(path.join(dir, 'studio-rig.js')).href);
  void imp;
  return { room, cat, cats, rig, dir };
}

// ---------------------------------------------------------------- measures --
const DT = 1 / 240;

function phasesOf(R) {
  const ph = R.events.filter(e => e.type === 'phase').map(e => [e.k, e.t - R.t0]);
  const end = R.samples.length * DT;
  return ph.map(([k, t], i) => ({ k, t, d: ((i + 1 < ph.length ? ph[i + 1][1] : end) - t) * 1000 }));
}

// Contacts, read off the PAWS: the first sample after the airborne stretch at
// which a paw is on the landing surface, for the fore pair and the hind pair.
function contacts(R, M) {
  const dstY = M.room.NODES[R.edge.to].y;
  const S = R.samples;
  const airAt = S.findIndex(s => s.Cy - s.y > -1e9 && Math.abs(s.y - dstY) > 0.01 && Math.abs(s.y - M.room.NODES[R.edge.from].y) > 0.01);
  // ON the surface means AT its height and STAYING there: a paw in flight
  // passes through that height on the way up, which is not a landing
  const at = (s, a, b) => Math.abs(s[`toe${a}y`] - dstY) < 0.02 && Math.abs(s[`toe${b}y`] - dstY) < 0.02;
  const on = (i, a, b) => { for (let k = 0; k < 6; k++) if (!S[i + k] || !at(S[i + k], a, b)) return false; return true; };
  let fore = -1, hind = -1;
  for (let i = Math.max(0, airAt); i < S.length; i++) {
    if (fore < 0 && on(i, 'FL', 'FR')) fore = i;
    if (hind < 0 && on(i, 'HL', 'HR')) hind = i;
    if (fore >= 0 && hind >= 0) break;
  }
  return { fore: fore * DT, hind: hind * DT, foreI: fore, hindI: hind, airAt };
}

// A LINEAR SEGMENT is a run of samples moving at a constant non-zero rate: the
// second difference vanishes against the first. 24 samples is 100 ms.
function linearRuns(series, minRun = 24) {
  let run = 0, worst = 0, at = -1;
  for (let i = 2; i < series.length; i++) {
    const d1 = series[i] - series[i - 1], d0 = series[i - 1] - series[i - 2];
    const d2 = d1 - d0;
    const moving = Math.abs(d1) > 1e-7;
    const flat = Math.abs(d2) <= 1e-9 * Math.abs(d1) + 1e-13;
    if (moving && flat) { run++; if (run > worst) { worst = run; at = i; } } else run = 0;
  }
  return worst >= minRun ? { run: worst, at } : null;
}

// ----------------------------------------------------------------- PART ONE --
async function partOne(M) {
  const { room, cat: K, cats: C, rig } = M;
  const E = room.EDGES;

  section = 'graph';
  check('every edge the brief names exists with its declared type', () => {
    const want = [
      ['floor', 'chair', 'up'], ['chair', 'floor', 'down'], ['chair', 'table', 'up'], ['table', 'chair', 'down'],
      ['chair', 'sill', 'up'], ['floor', 'chaise', 'up'], ['chaise', 'floor', 'down'], ['chaise', 'sill', 'up'],
      ['floor', 'sill', 'up'], ['table', 'sill', 'across'], ['sill', 'table', 'across'], ['table', 'floor', 'down'],
    ];
    for (const [a, b, t] of want) {
      const hit = E.find(e => e.from.startsWith(a) && e.to.startsWith(b) && e.type === t);
      assert(hit, `no ${t} edge ${a} -> ${b}`);
    }
    return `${E.length} edges`;
  });
  check('rise and run are what the launch and landing say', () => {
    for (const e of E) {
      const rise = room.NODES[e.to].y - room.NODES[e.from].y;
      const run = Math.hypot(e.land[0] - e.launch[0], e.land[1] - e.launch[1]);
      assert(Math.abs(rise - e.rise) < 1e-9 && Math.abs(run - e.run) < 1e-9, `${e.id} declares rise ${e.rise} run ${e.run}, geometry says ${rise} ${run}`);
      assert(e.type !== 'up' || rise > 0, `${e.id} is an up edge that does not rise`);
      assert(e.type !== 'down' || rise < 0, `${e.id} is a down edge that does not drop`);
    }
    return 'all consistent';
  });
  check('every launch is on its source and both pairs of paws land on the target', () => {
    for (const e of E) {
      const c = Math.cos(e.heading), s = Math.sin(e.heading);
      assert(room.onSurface(e.from, e.launch[0] + c * 12, e.launch[1] + s * 12), `${e.id}: the forepaws gather off the source`);
      assert(room.onSurface(e.from, e.launch[0] - c * 12, e.launch[1] - s * 12), `${e.id}: the hind paws gather off the source`);
      assert(room.onSurface(e.to, e.land[0], e.land[1]), `${e.id}: the forepaws land off the target`);
      // a step across leaves the hind paws on the near edge; the settle walks them on
      const hindOn = room.onSurface(e.to, e.land[0] - c * 24, e.land[1] - s * 24) || (e.type === 'across' && room.onSurface(e.from, e.land[0] - c * 24, e.land[1] - s * 24));
      assert(hindOn, `${e.id}: the hind paws land off the target`);
    }
    return 'all edges';
  });
  check('a floor launch stands off in proportion to the rise', () => {
    const rows = [];
    for (const e of E.filter(x => x.from === 'floor' && x.type === 'up')) {
      const d = Math.hypot(e.aim.edge[0] - e.launch[0], e.aim.edge[1] - e.launch[1]) - room.FORE_TOE_U;
      const k = d / e.rise;
      rows.push(`${e.id} ${k.toFixed(3)}`);
      assert(Math.abs(k - room.STANDOFF_K) < 1e-6, `${e.id}: standoff ${d.toFixed(1)} cm for a ${e.rise} cm rise`);
    }
    return rows.join(', ');
  });
  check('the two-stage route to the sill is preferred and the direct one is legal', () => {
    const D = C.createDirector({ seed: 3 });
    D.cats[0].node = 'floor';    // a fixture: a director whose cat stands on the floor
    D.cats[1].node = 'table';
    let direct = 0, two = 0;
    for (let i = 0; i < 300; i++) {
      const legs = C.planRoute(D, 0, 'sill');
      if (legs.length === 1) direct++; else two++;
    }
    assert(two > direct * 3, `direct ${direct} vs two-stage ${two}: not a preference`);
    assert(direct > 0, 'the direct floor -> sill jump is never taken');
    return `two-stage ${two}, direct ${direct} of 300`;
  });

  // --- every edge, rehearsed
  const R = {};
  for (const e of E) R[e.id] = [3, 17, 101].map(seed => C.rehearse(e.id, { seed }));

  section = 'upjump';
  const ups = E.filter(e => e.type === 'up');
  check('seven phases in order, every duration inside the brief', () => {
    const order = ['notice', 'approach', 'gather', 'launch', 'flight', 'touch', 'compress', 'recover', 'settle'];
    for (const e of ups) for (const r of R[e.id]) {
      const ph = phasesOf(r).filter(p => p.k !== 'pose' && p.k !== 'abort' && p.k !== 'pause' && p.k !== 'hold');
      const seq = ph.map(p => p.k).filter((k, i, a) => a.indexOf(k) === i);
      assert(JSON.stringify(seq) === JSON.stringify(order), `${e.id}: ${seq.join(' > ')}`);
      for (const p of ph) {
        if (BRIEF[p.k]) inRange(p.d, BRIEF[p.k], `${e.id} ${p.k}`, 6);
        if (p.k === 'touch') inRange(p.d, BRIEF.hindLag, `${e.id} touch`, 6);
      }
    }
    return `${ups.length} edges x 3 seeds`;
  });
  check('the apex sits 15-25% of the rise above the landing surface', () => {
    const fr = [];
    for (const e of ups) for (const r of R[e.id]) {
      const air = r.samples.filter(s => Math.abs(s.y - room.NODES[e.from].y) > 0.01 && Math.abs(s.y - room.NODES[e.to].y) > 0.01);
      const apex = Math.max(...air.map(s => s.y));
      const f = (apex - room.NODES[e.to].y) / e.rise;
      fr.push(f);
      inRange(f, BRIEF.apex, `${e.id} apex`, 0.003);
    }
    return `${Math.min(...fr).toFixed(3)} .. ${Math.max(...fr).toFixed(3)}`;
  });
  check('the flight is a parabola under constant gravity, never eased', () => {
    let worst = 0;
    for (const e of ups) for (const r of R[e.id]) {
      const ph = phasesOf(r), f = ph.find(p => p.k === 'flight');
      const i0 = Math.round(f.t / DT) + 3, i1 = Math.round((f.t + f.d / 1000) / DT) - 3;
      const g = [];
      for (let i = i0 + 1; i < i1; i++) g.push(-(r.samples[i + 1].Cy - 2 * r.samples[i].Cy + r.samples[i - 1].Cy) / (DT * DT));
      const mean = g.reduce((a, b) => a + b, 0) / g.length;
      for (const x of g) worst = Math.max(worst, Math.abs(x - mean) / mean);
      assert(mean > 500, `${e.id}: gravity ${mean.toFixed(0)} cm/s^2`);
    }
    assert(worst < 0.02, `gravity varies by ${(worst * 100).toFixed(1)}% within a flight`);
    return `within ${(worst * 100).toFixed(2)}%`;
  });
  check('horizontal flight is near-linear but not linear', () => {
    for (const e of ups) for (const r of R[e.id]) {
      const ph = phasesOf(r), f = ph.find(p => p.k === 'flight');
      const i0 = Math.round(f.t / DT) + 2, i1 = Math.round((f.t + f.d / 1000) / DT) - 2;
      const S = r.samples;
      const s = (i) => (S[i].Cx - S[i0].Cx) * Math.cos(e.heading) + (S[i].Cz - S[i0].Cz) * Math.sin(e.heading);
      const v0 = (s(i0 + 2) - s(i0)) / (2 * DT), v1 = (s(i1) - s(i1 - 2)) / (2 * DT);
      const drop = 1 - v1 / v0;
      assert(drop > 0.02 && drop < 0.4, `${e.id}: horizontal speed changes by ${(drop * 100).toFixed(1)}% across the flight`);
    }
    return 'speed eases off by a drag, 2-40%';
  });
  check('forepaws land first and the hind paws 60-100 ms later', () => {
    const lags = [];
    for (const e of ups) for (const r of R[e.id]) {
      const c = contacts(r, M);
      assert(c.foreI > 0 && c.hindI > 0, `${e.id}: a pair of paws never reached the surface`);
      const lag = (c.hind - c.fore) * 1000;
      lags.push(lag);
      assert(lag > 0, `${e.id}: the hind paws landed first (${lag.toFixed(0)} ms)`);
      inRange(lag, BRIEF.hindLag, `${e.id} fore->hind`, 5);
    }
    return `${Math.min(...lags).toFixed(0)} .. ${Math.max(...lags).toFixed(0)} ms`;
  });
  check('the cat launches squared up to its target', () => {
    for (const e of ups) for (const r of R[e.id]) {
      const ph = phasesOf(r), l = ph.find(p => p.k === 'launch');
      const s = r.samples[Math.round(l.t / DT)];
      const err = Math.abs(Math.atan2(Math.sin(s.h - e.heading), Math.cos(s.h - e.heading)));
      assert(err < 0.06, `${e.id}: launched ${(err * 57.3).toFixed(1)} deg off its target`);
    }
    return 'within 3.4 deg';
  });
  check('the gather is randomised per jump, and so is every other phase', () => {
    const g = [], n = [], f = [];
    for (let s = 1; s <= 10; s++) {
      const r = C.rehearse('floor>chairL', { seed: s * 7919 });
      const ph = phasesOf(r);
      g.push(ph.find(p => p.k === 'gather').d); n.push(ph.find(p => p.k === 'notice').d); f.push(ph.find(p => p.k === 'flight').d);
    }
    // measured in 1/240 s steps, so a narrow range shows its quantum: the
    // flight is drawn "by height", a few tens of ms either side of its nominal
    for (const [name, xs, need] of [['gather', g, 9], ['notice', n, 8], ['flight', f, 6]]) {
      assert(new Set(xs.map(x => x.toFixed(1))).size >= need, `${name} repeats: ${xs.map(x => x.toFixed(0)).join(' ')}`);
    }
    const spread = Math.max(...g) - Math.min(...g);
    assert(spread > 250, `ten gathers span only ${spread.toFixed(0)} ms`);
    return `gather ${g.map(x => x.toFixed(0)).join(' ')} ms`;
  });
  check('a gather sometimes holds, sometimes aborts and re-gathers', () => {
    let hold = 0, abort = 0, tread = 0;
    const e = E.find(x => x.id === 'chairL>table');
    for (let s = 0; s < 400; s++) {
      const c = K.createCat({ id: 'x', seed: 1000 + s * 31, node: 'chairL', x: -60, z: 392, heading: 0, posture: 'stand' });
      const p = K.planLeg(c, e);
      if (p.phases.some(q => q.k === 'hold')) hold++;
      if (p.phases.some(q => q.k === 'abort')) abort++;
      if (p.phases.some(q => q.k === 'gather' && q.tread)) tread++;
    }
    assert(hold > 40 && hold < 160, `hold on ${hold} of 400`);
    assert(abort > 15 && abort < 90, `abort on ${abort} of 400`);
    assert(tread > 120, `tread on ${tread} of 400`);
    return `hold ${hold}, abort ${abort}, tread ${tread} of 400`;
  });

  section = 'downjump';
  const downs = E.filter(e => e.type === 'down');
  check('a down-jump is its own program: no gather, no launch', () => {
    for (const e of downs) for (const r of R[e.id]) {
      const ks = phasesOf(r).map(p => p.k);
      assert(!ks.includes('gather') && !ks.includes('launch'), `${e.id}: ${ks.join(' > ')}`);
      for (const k of ['peer', 'reach', 'pour', 'fall']) assert(ks.includes(k), `${e.id} has no ${k}`);
    }
    return `${downs.length} edges`;
  });
  check('the forepaws reach down and the hind paws leave last', () => {
    for (const e of downs) for (const r of R[e.id]) {
      const srcY = room.NODES[e.from].y;
      const S = r.samples;
      const leave = (a) => S.findIndex(s => s[`toe${a}y`] < srcY - 1.5 || s[`toe${a}y`] > srcY + 0.6);
      const fore = Math.min(leave('FL'), leave('FR')), hind = Math.min(leave('HL'), leave('HR'));
      assert(fore >= 0 && hind > fore, `${e.id}: fore leave ${fore}, hind ${hind}`);
      assert(S.slice(fore).some(s => s.toeFLy < srcY - 3), `${e.id}: the forepaws never reach below the edge`);
    }
    return 'fore before hind on every drop';
  });
  check('the drop is near free fall and lands fore-first, absorbing more', () => {
    let deep = 0;
    for (const e of downs) for (const r of R[e.id]) {
      const ph = phasesOf(r), f = ph.find(p => p.k === 'fall');
      const i0 = Math.round(f.t / DT) + 3, i1 = Math.round((f.t + f.d / 1000) / DT) - 3;
      const g = [];
      for (let i = i0 + 1; i < i1; i++) g.push(-(r.samples[i + 1].Cy - 2 * r.samples[i].Cy + r.samples[i - 1].Cy) / (DT * DT));
      const mean = g.reduce((a, b) => a + b, 0) / Math.max(1, g.length);
      assert(g.length < 3 || Math.abs(mean - 981) < 60, `${e.id}: falls at ${mean.toFixed(0)} cm/s^2`);
      const c = contacts(r, M);
      assert(c.foreI > 0 && c.hind > c.fore, `${e.id}: not fore-first`);
      const dstY = room.NODES[e.to].y;
      const low = Math.min(...r.samples.slice(c.hindI).map(s => s.Cy - dstY));
      deep = Math.max(deep, low);
    }
    const upLow = Math.min(...ups.flatMap(e => R[e.id].map(r => { const c = contacts(r, M); return Math.min(...r.samples.slice(c.hindI).map(s => s.Cy - room.NODES[e.to].y)); })));
    assert(deep < upLow, `a drop compresses to ${deep.toFixed(1)} cm, an up-jump to ${upLow.toFixed(1)}`);
    return `drop compresses to <= ${deep.toFixed(1)} cm, up-jumps to >= ${upLow.toFixed(1)}`;
  });

  section = 'motion';
  check('no channel moves linearly, in any jump, drop, step or action', () => {
    const hits = [];
    const runs = [...Object.values(R).flat()];
    // the actions, from a sitting cat on the chaise
    for (const a of ['stretch', 'groom', 'look', 'settleDown', 'wake', 'reposition']) {
      const c = K.createCat({ id: 'a', seed: 77, node: 'chaise', x: 177, z: 300, heading: Math.PI, posture: a === 'wake' ? 'curl' : 'sit' });
      for (let i = 0; i < 60; i++) K.stepCat(c, DT);
      K.startAction(c, a, a === 'reposition' ? { target: room.restSpot('chaise', 177, 300, 0) } : {});
      const samples = [];
      let g = 0;
      while (c.prog && g++ < 20 / DT) { K.stepCat(c, DT); samples.push(K.sample(c)); }
      runs.push({ samples, edge: { id: a } });
    }
    for (const r of runs) {
      const keys = Object.keys(r.samples[0]).filter(k => k !== 't');
      for (const k of keys) {
        const lin = linearRuns(r.samples.map(s => s[k]));
        if (lin) hits.push(`${r.edge.id}:${k} (${lin.run} samples)`);
      }
    }
    assert(!hits.length, `linear segments: ${hits.slice(0, 8).join(', ')}`);
    return `${runs.length} programs, every sampled channel`;
  });
  check('there is no linear ease to ask for', () => {
    for (const [name, f] of Object.entries(K.EASE)) {
      assert(Math.abs(f(0)) < 1e-12 && Math.abs(f(1) - 1) < 1e-12, `${name} does not run 0..1`);
      let lin = true;
      for (const t of [0.1, 0.3, 0.7, 0.9]) if (Math.abs(f(t) - t) > 1e-6) lin = false;
      assert(!lin, `${name} is linear`);
    }
    let threw = false;
    try { const c = K.createCat({ id: 'x', seed: 1, node: 'floor', x: 0, z: 200, heading: 0 }); K.tween(c, 'hipH', 3, 1, 'linear'); } catch { threw = true; }
    assert(threw, 'tween() accepted "linear"');
    return `${Object.keys(K.EASE).length} eases, none linear`;
  });
  check('every leg reaches its paws (no over-stretched limb)', () => {
    let worst = 0, where = '';
    const counts = [];
    for (const e of E) {
      const back = 8;
      const rs = room.restSpot(e.from, e.launch[0] - Math.cos(e.heading) * back, e.launch[1] - Math.sin(e.heading) * back, e.heading + 0.5);
      const c = K.createCat({ id: 'r', seed: 3, node: e.from, x: rs.x, z: rs.z, heading: rs.heading, posture: 'sit' });
      for (let i = 0; i < 60; i++) K.stepCat(c, DT);
      K.startLeg(c, e.id);
      let n = 0, mx = 0;
      while (c.prog && n++ < 30 / DT) { K.stepCat(c, DT); mx = Math.max(mx, rig.solveRig(c).over); }
      counts.push(mx);
      if (mx > worst) { worst = mx; where = e.id; }
    }
    const top = E.map((e, k) => [e.id, counts[k]]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, v]) => `${id} ${v.toFixed(2)} cm`);
    // a limb may fall short of its paw by a centimetre or two at full stretch
    // over the table-to-sill gap; more than that is a paw drawn floating off
    // the end of its leg (it was 5.3 cm before the stride and gather fixes)
    assert(worst < 2, `${where}: a limb falls ${worst.toFixed(2)} cm short of its paw`);
    return `largest shortfall: ${top.join(', ')}`;
  });

  section = 'director';
  // one long soak, every rule watched at every step
  const soak = (() => {
    const D = C.createDirector({ seed: 11 });
    const dt = 1 / 120;
    const out = { both: 0, same: 0, sameAction: 0, sameAt: '', jump: 0, jumpAt: '', nodeChanges: 0, illegal: [], travelStarts: [], ends: [], clicks: [], wakeFirst: 0, sleptTravel: 0, steps: 0,
      busy: 0, floorMin: Infinity, floorAt: '', dozes: [], dozeOn: [null, null], acts: {}, floorWalks: 0 };
    const prev = D.cats.map(c => ({ node: c.node, pos: [...c.pos], edge: null }));
    let lastLogLen = 0;
    for (let n = 0; n < 120 * 1500; n++) {
      if (n > 0 && n % (120 * 41) === 0) out.clicks.push(C.click(D, n % 2, D.t));
      const before = D.cats.map(c => (c.prog && c.prog.plan.edge) || null);
      C.stepDirector(D, dt);
      out.steps++;
      if (C.moving(D, 0) && C.moving(D, 1)) out.both++;
      if (D.cats[0].node === D.cats[1].node && D.cats[0].node !== 'floor') out.same++;
      const a0 = D.cats[0].action, a1 = D.cats[1].action;
      // a small action (not a walk or a jump) done by both at once is the
      // mirroring the spec forbids
      if (a0 && a1 && a0 === a1 && !['leg', 'reposition'].includes(a0)) { out.sameAction++; out.sameAt = `${a0} at ${D.t.toFixed(1)} s`; }
      // VISIBLY DOING SOMETHING: a program running (a walk, a groom, a jump...)
      if (D.cats.some((c, i) => c.prog || C.moving(D, i))) out.busy++;
      const [ca, cb] = D.cats;
      if (ca.node === 'floor' && cb.node === 'floor' && !ca.free && !cb.free) {
        const d = Math.hypot(ca.pos[0] - cb.pos[0], ca.pos[2] - cb.pos[2]);
        if (d < out.floorMin) { out.floorMin = d; out.floorAt = `${D.t.toFixed(1)} s`; }
      }
      D.cats.forEach((c, i) => {
        if (c.asleep && out.dozeOn[i] == null) out.dozeOn[i] = D.t;
        // a doze the director ended (not one a click woke)
        if (!c.asleep && out.dozeOn[i] != null) {
          const why = D.log.filter(l => l.cat === i && (l.what === 'wake' || l.what === 'click')).pop();
          if (why && why.what === 'wake') out.dozes.push(D.t - out.dozeOn[i]);
          out.dozeOn[i] = null;
        }
      });
      D.cats.forEach((c, i) => {
        // what can be SEEN to jump: the body centre and the four paws. (The
        // root is a bookkeeping point that re-centres under the paws at a
        // touchdown, by design, without moving anything drawn.)
        const now = [K.bodyCentre(c), ...[0, 1, 2, 3].map(k => K.toeWorld(c, k))];
        if (prev[i].vis) for (let k = 0; k < 5; k++) {
          const d = Math.hypot(now[k][0] - prev[i].vis[k][0], now[k][1] - prev[i].vis[k][1], now[k][2] - prev[i].vis[k][2]);
          // a paw whips at a launch; the body never moves faster than a jump
          const lim = k ? 2.5 : 1;   // the bar below is 6 cm for the body
          if (d / lim > out.jump) { out.jump = d / lim; out.jumpAt = `${c.id} ${k ? 'paw ' + k : 'body'} ${d.toFixed(2)} cm, ${c.prog ? c.prog.plan.phases[c.prog.i]?.k : 'idle'}`; }
        }
        prev[i].vis = now;
        if (c.node !== prev[i].node) {
          out.nodeChanges++;
          const e = before[i] && room.EDGES.find(x => x.id === before[i]);
          if (!e || e.from !== prev[i].node || e.to !== c.node) out.illegal.push(`${c.id} ${prev[i].node} -> ${c.node} (leg ${before[i]})`);
        }
        prev[i].node = c.node; prev[i].pos = [...c.pos];
      });
      // this step's own notes (the log is a bounded ring, so read by time)
      const fresh = [];
      for (let k = D.log.length - 1; k >= 0 && D.log[k].t === D.t; k--) fresh.unshift(D.log[k]);
      for (const l of fresh) {
        if (l.what === 'act') { out.travelStarts.push(l.t); out.acts[l.act] = (out.acts[l.act] || 0) + 1; }
      }
      lastLogLen = D.log.length;
    }
    return { out, D };
  })();
  check('a cat reaches a surface only by traversing an edge', () => {
    const o = soak.out;
    assert(o.nodeChanges > 20, `only ${o.nodeChanges} surface changes in 25 minutes`);
    assert(!o.illegal.length, o.illegal.slice(0, 4).join('; '));
    return `${o.nodeChanges} changes, every one at the end of its own leg`;
  });
  check('no position is ever set directly', () => {
    const o = soak.out;
    // the bar is the fastest LEGAL motion with room to spare: the direct
    // floor > sill jump peaks at 4.8 cm per 1/120 s in rehearsal (574 cm/s);
    // a set position is a jump of tens of centimetres
    assert(o.jump < 6, `a drawn point moved too far in one 1/120 s step: ${o.jumpAt} (body bar 6 cm, paws 15 cm)`);
    return `worst against its bar: ${o.jumpAt} (body bar 6 cm, paws 15 cm per 1/120 s)`;
  });
  check('two cats never share a perch, keep apart on the floor, and never do one small action together', () => {
    const o = soak.out;
    assert(o.same === 0, `shared a perch for ${o.same} steps`);
    assert(o.floorMin >= BRIEF.floorApart * 0.8, `two cats on the floor ${o.floorMin.toFixed(1)} cm apart at ${o.floorAt}`);
    assert(o.sameAction === 0, `the same small action together for ${o.sameAction} steps (${o.sameAt})`);
    return `${o.steps} steps clean; both travelling at once ${(100 * o.both / o.steps).toFixed(1)}% of the time; closest on the floor ${o.floorMin.toFixed(0)} cm`;
  });
  check('a deliberate action every 5-12 s across the pair, and usually one cat doing something', () => {
    const o = soak.out, s = o.travelStarts;
    assert(s.length >= 25 * 60 / BRIEF.actionEvery[1], `only ${s.length} actions in 25 minutes`);
    const gaps = s.slice(1).map((x, i) => x - s[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    inRange(mean, BRIEF.actionEvery, 'mean gap between actions', 0.01);
    assert(Math.min(...gaps) >= BRIEF.actionEvery[0] - 0.01, `two actions ${Math.min(...gaps).toFixed(2)} s apart`);
    // a cat that is busy when its turn comes passes the turn on a second later
    const late = gaps.filter(g => g > BRIEF.actionEvery[1] + 0.01).length;
    assert(late <= gaps.length * 0.1, `${late} of ${gaps.length} gaps past ${BRIEF.actionEvery[1]} s`);
    const share = o.busy / o.steps;
    assert(share >= BRIEF.busyShare, `a cat is doing something only ${(share * 100).toFixed(0)}% of the time`);
    const kinds = Object.entries(o.acts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
    assert((o.acts.wander || 0) >= 10, `only ${o.acts.wander || 0} floor walks in 25 minutes`);
    assert((o.acts.relocate || 0) >= 15, `only ${o.acts.relocate || 0} relocations in 25 minutes`);
    return `${s.length} actions, mean ${mean.toFixed(1)} s apart (${Math.min(...gaps).toFixed(1)}-${Math.max(...gaps).toFixed(1)}); a cat busy ${(share * 100).toFixed(0)}% of the time; ${kinds}`;
  });
  check('a doze is brief and ends on its own, and a sleeper wakes before it moves', () => {
    const o = soak.out;
    assert(o.dozes.length >= 3, `only ${o.dozes.length} dozes in 25 minutes`);
    for (const d of o.dozes) inRange(d, BRIEF.doze, 'a doze', 0.6);
    // a sleeper asked to travel wakes first
    const D = C.createDirector({ seed: 5 });
    D.hold = true;
    const cat = D.cats[0];
    K.startAction(cat, 'pose', { posture: 'curl' });
    for (let n = 0; n < 240 && cat.prog; n++) C.stepDirector(D, 1 / 120);
    assert(cat.asleep, 'a curl did not end asleep');
    const legs = C.planRoute(D, 0, 'floor');
    C.startTraversal(D, 0, legs, 'floor');
    assert(cat.prog && cat.prog.plan.action === 'wake', `a sleeper set off with ${cat.prog && (cat.prog.plan.action || cat.prog.plan.edge)}`);
    return `${o.dozes.length} dozes, ${Math.min(...o.dozes).toFixed(1)}-${Math.max(...o.dozes).toFixed(1)} s; a sleeper wakes before its first leg`;
  });
  check('a click mid-leg is queued, then served; nothing changes in the air', () => {
    const D = C.createDirector({ seed: 9 });
    D.hold = true;
    assert(C.forceEdge(D, 0, 'chaise>floor').startsWith('ok'), 'could not start a leg');
    let n = 0;
    while (!D.cats[0].free && n++ < 2000) C.stepDirector(D, 1 / 120);
    assert(D.cats[0].free, 'never airborne');
    const plan = JSON.stringify(D.cats[0].prog.plan);
    const out = C.click(D, 0, 100);
    assert(out === 'queued', `mid-air click answered "${out}"`);
    assert(JSON.stringify(D.cats[0].prog.plan) === plan, 'the jump changed under a click');
    n = 0;
    while (D.queue[0] && n++ < 120 * 20) C.stepDirector(D, 1 / 120);
    assert(!D.queue[0], 'the queued click was never served');
    const served = D.log.find(l => l.what === 'dequeue');
    assert(served, 'no dequeue');
    return `queued, then "${served.out}" once the leg was done`;
  });
  check('an over-clicked cat flicks an ear and ignores you', () => {
    const D = C.createDirector({ seed: 4 });
    D.hold = true;
    for (let k = 0; k < 400; k++) C.stepDirector(D, 1 / 120);
    const outs = [];
    for (let k = 0; k < 8; k++) { outs.push(C.click(D, 1, 50 + k * 0.25)); C.stepDirector(D, 1 / 120); }
    const accepted = outs.filter(o => !['ignored', 'overclicked', 'queued'].includes(o)).length;
    assert(accepted <= 1, `${accepted} of 8 rapid clicks started something: ${outs.join(' ')}`);
    assert(outs.includes('overclicked'), `never over-clicked: ${outs.join(' ')}`);
    const later = C.click(D, 1, 52);
    assert(later === 'ignored', `still listening during the cool-down: ${later}`);
    return outs.join(' ');
  });
  check('a click on a floor cat relocates it by a legal route', () => {
    const D = C.createDirector({ seed: 2 });
    D.hold = true;
    C.forceEdge(D, 0, 'chaise>floor');
    let n = 0;
    while (C.moving(D, 0) && n++ < 120 * 20) C.stepDirector(D, 1 / 120);
    while (D.cats[0].prog && n++ < 120 * 30) C.stepDirector(D, 1 / 120);
    assert(D.cats[0].node === 'floor', `ended on ${D.cats[0].node}`);
    const out = C.click(D, 0, 1000);
    assert(out === 'relocate', `a floor cat answered "${out}"`);
    assert(D.trav[0] && D.trav[0].legs.length >= 1, 'no route');
    return `relocated by ${D.trav[0].legs.join(' -> ')}`;
  });
  check('scrub and replay are exact', () => {
    const D = C.createDirector({ seed: 8 });
    D.hold = true;
    const f = C.forceEdge(D, 0, 'chaise>floor');
    assert(f.startsWith('ok'), f);
    let n = 0;
    while (C.moving(D, 0) && n++ < 120 * 30) C.stepDirector(D, 1 / 120);
    const a = C.scrubLeg(D, 2.1); const sa = JSON.stringify(D.cats[0]);
    const b = C.scrubLeg(D, 2.1); const sb = JSON.stringify(D.cats[0]);
    assert(a.phase === b.phase && sa === sb, 'two scrubs to one time disagree');
    const tr = C.traceLeg(D, ['t', 'Cy']);
    C.scrubLeg(D, tr.rows[200][0]);
    const cy = K.bodyCentre(D.cats[0])[1];
    assert(Math.abs(cy - tr.rows[200][1]) < 1e-9, `the trace says ${tr.rows[200][1]}, the scrub ${cy}`);
    return `scrub to 2.1 s: ${a.phase}, bit-identical twice; trace agrees`;
  });

  section = 'discipline';
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  check('no studio module schedules frames, binds listeners, or reaches the page', () => {
    const hits = [];
    for (const f of STUDIO.filter(x => x !== 'studio-dev.js')) {
      const src = strip(fs.readFileSync(path.join(M.dir, f), 'utf8'));
      src.split('\n').forEach((l, i) => {
        if (/requestAnimationFrame|setInterval|\bsetTimeout\b|addEventListener|\bdocument\s*\.|\bwindow\s*\.|\blocation\s*\.|Math\s*\.\s*random/.test(l)) hits.push(`${f}:${i + 1} ${l.trim().slice(0, 60)}`);
      });
    }
    assert(!hits.length, hits.join('\n'));
    return `${STUDIO.length - 1} modules clean`;
  });
  check('the dev harness listens only on what it made', () => {
    const src = strip(fs.readFileSync(path.join(M.dir, 'studio-dev.js'), 'utf8'));
    assert(!/\bdocument\s*\.|\bwindow\s*\.|\blocation\s*\.|requestAnimationFrame|setInterval|setTimeout|Math\s*\.\s*random/.test(src), 'studio-dev.js reaches past its container');
    return 'container-bound';
  });
}

// ----------------------------------------------------------------- PART TWO --
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const root of [...(process.env.NODE_PATH || '').split(path.delimiter), '/opt/node22/lib/node_modules', '/usr/lib/node_modules']) {
    if (root && fs.existsSync(path.join(root, 'playwright', 'index.js'))) return require(path.join(root, 'playwright'));
  }
  return require('playwright');
}

async function partTwo() {
  const { chromium } = loadPlaywright();
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const f = path.join(REPO, rel);
    if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const open = async (q) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
    page.__errs = [];
    page.on('pageerror', e => page.__errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') page.__errs.push(m.text()); });
    await page.goto(`${base}/scene.html?scene=4&seed=21${q}`);
    await page.waitForFunction(() => window.__scene && window.__scene.activeId === 4 && window.__scene.frames > 5);
    return page;
  };
  section = 'page';
  try {
    const page = await open('');
    await checkAsync('scene 4 loads, draws two planes, and throws nothing', async () => {
      await page.waitForTimeout(800);
      const st = await page.evaluate(() => ({ c: window.__scene.canvasCount, ch: window.__scene.stageChildren, run: window.__scene.running, s: window.__scene.sceneState() }));
      assert(st.c === 2 && st.ch === 2 && st.run, JSON.stringify(st).slice(0, 200));
      assert(st.s.cats.length === 2, 'not two cats');
      assert(!page.__errs.length, page.__errs.join('; '));
      return `${st.s.cats.map(c => `${c.id} on ${c.node}`).join(', ')}`;
    });
    await checkAsync('without ?dev=1 there is no panel and no text', async () => {
      const t = await page.evaluate(() => {
        const nav = document.querySelector('.scene-nav');
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const out = [];
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.textContent.trim() || nav.contains(n)) continue;
          const el = n.parentElement;
          if (el.closest('noscript') || el.closest('style') || el.closest('script')) continue;
          if (el.checkVisibility && !el.checkVisibility()) continue;
          out.push(n.textContent.trim().slice(0, 30));
        }
        return { out, dev: !!document.querySelector('.scene-dev') };
      });
      assert(!t.dev && !t.out.length, JSON.stringify(t));
      return 'none';
    });
    await checkAsync('a real click on a drawn cat reaches that cat', async () => {
      const at = await page.evaluate(() => window.__scene.sceneQuery('dev', { op: 'screen', cat: 1 }));
      const before = await page.evaluate(() => window.__scene.sceneState().log.length);
      await page.mouse.click(at.x, at.y);
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => window.__scene.sceneState());
      const hit = st.log.slice(before).find(l => l.what === 'click');
      assert(hit && hit.cat === 1, `the click logged ${JSON.stringify(st.log.slice(before))}`);
      return `cat 1 answered "${hit.out}"`;
    });
    await checkAsync('a click on the room does nothing', async () => {
      const before = await page.evaluate(() => window.__scene.sceneState().log.length);
      await page.mouse.click(640, 140);
      await page.waitForTimeout(200);
      const after = await page.evaluate((b) => window.__scene.sceneState().log.slice(b), before);
      assert(!after.some(l => l.what === 'click'), JSON.stringify(after));
      return 'no click logged';
    });
    await page.close();

    const dp = await open('&dev=1');
    await checkAsync('?dev=1 mounts the harness inside the stage', async () => {
      const r = await dp.evaluate(() => { const p = document.querySelector('.scene-dev'); return p && p.parentElement.id; });
      assert(r === 'scene-stage', `panel parent ${r}`);
      return 'in the stage';
    });
    await checkAsync('typing a digit into the harness does not change scene', async () => {
      const inp = dp.locator('.scene-dev input[type=number]').first();
      await inp.click();
      await inp.press('3');
      await dp.waitForTimeout(400);
      const id = await dp.evaluate(() => window.__scene.activeId);
      assert(id === 4, `scene ${id}`);
      return 'still scene 4';
    });
    await checkAsync('the harness forces an edge by a legal route', async () => {
      await dp.selectOption('.scene-dev select >> nth=1', 'chaise>floor');
      await dp.click('.scene-dev button:has-text("go")');
      const txt = await dp.locator('.scene-dev .ro').first().textContent();
      assert(/^ok/.test(txt), txt);
      await dp.evaluate(() => window.__scene.scenePump(8));
      const st = await dp.evaluate(() => window.__scene.sceneState().cats[0]);
      assert(st.node === 'floor', `ink is on ${st.node}`);
      return txt;
    });
    await checkAsync('the harness measures the last leg', async () => {
      await dp.click('.scene-dev button:has-text("measure")');
      const txt = await dp.locator('.scene-dev .ro').nth(1).textContent();
      assert(/chaise>floor/.test(txt) && /fore -> hind contact \d+ ms/.test(txt), txt);
      return txt.split('\n').slice(-1)[0].trim();
    });
    assert(!dp.__errs.length, dp.__errs.join('; '));
    await dp.close();
  } finally {
    await browser.close();
    server.close();
  }
}

// --------------------------------------------------------------- mutants ----
const MUTANTS = [
  { id: 'a-linear-ease', file: 'studio-cat.js', from: "inOut: (t) => t * t * t * (t * (t * 6 - 15) + 10),", to: 'inOut: (t) => t + 1e-12 * t * (1 - t),',
    breaks: ['motion/no-channel-moves-linearly-in-any-jump-drop-step-or-action', 'motion/there-is-no-linear-ease-to-ask-for'], mayAlso: ['*'] },
  { id: 'the-flight-is-eased', file: 'studio-cat.js', from: '      const y = J.yL + J.vy0 * tt - 0.5 * J.g * tt * tt;\n      const k = tt / J.T;\n      const p = J.pitchL + (LAND_PITCH',
    to: '      const y = J.yL + (J.vy0 * J.T - 0.5 * J.g * J.T * J.T) * EASE.inOut(tt / J.T) + 0 * J.vy0;\n      const k = tt / J.T;\n      const p = J.pitchL + (LAND_PITCH',
    breaks: ['upjump/the-flight-is-a-parabola-under-constant-gravity-never-eased', 'upjump/the-apex-sits-15-25-of-the-rise-above-the-landing-surface'], mayAlso: ['upjump/*', 'motion/*', 'downjump/*'] },
  { id: 'the-apex-is-too-high', file: 'studio-cat.js', from: '  const ya = dstY + H_STAND + apex * rise;', to: '  const ya = dstY + H_STAND + (apex + 0.3) * rise;',
    // a higher arc is a faster body: that is the same defect, seen twice
    breaks: ['upjump/the-apex-sits-15-25-of-the-rise-above-the-landing-surface'], mayAlso: ['upjump/*', 'motion/*', 'downjump/*', 'director/*'] },
  // the touchdown order swapped: the hind pair is planted at the arc's end
  { id: 'hind-paws-land-first', file: 'studio-cat.js', from: '      for (const i of [0, 1]) {\n        const p = toeWorld(cat, i);', to: '      for (const i of [2, 3]) {\n        const p = toeWorld(cat, i);',
    breaks: ['upjump/forepaws-land-first-and-the-hind-paws-60-100-ms-later'], mayAlso: ['upjump/*', 'motion/*', 'downjump/*', 'director/*'] },
  { id: 'the-gather-is-not-random', file: 'studio-cat.js', from: '      d: between(cat, TIMING.gather),', to: '      d: (rnd(cat), 0.8),',
    breaks: ['upjump/the-gather-is-randomised-per-jump-and-so-is-every-other-phase'], mayAlso: [] },
  { id: 'the-down-jump-is-the-up-jump', file: 'studio-cat.js', from: "  if (edge.type === 'up') {\n    const gather", to: "  if (edge.type === 'up' || edge.type === 'down') {\n    const gather",
    breaks: ['downjump/a-down-jump-is-its-own-program-no-gather-no-launch'], mayAlso: ['downjump/*', 'motion/*', 'upjump/*', 'director/*'] },
  // the approach walk skipped: the cat is put at its launch spot
  { id: 'a-cat-is-put-at-its-launch-spot', file: 'studio-cats.js', from: '  D.lastLeg = { i, edge: id, snap: structuredClone(cat), dur: null };', to: '  cat.pos = [e.launch[0], cat.pos[1], e.launch[1]];\n  D.lastLeg = { i, edge: id, snap: structuredClone(cat), dur: null };',
    breaks: ['director/no-position-is-ever-set-directly'], mayAlso: ['director/*'] },
  { id: 'a-cat-is-set-onto-its-target', file: 'studio-cats.js', from: "  D.lastLeg = { i, edge: id, snap: structuredClone(cat), dur: null };\n  startLeg(cat, id);", to: "  D.lastLeg = { i, edge: id, snap: structuredClone(cat), dur: null };\n  startLeg(cat, id); cat.node = e.to;",
    breaks: ['director/a-cat-reaches-a-surface-only-by-traversing-an-edge'], mayAlso: ['director/*'] },
  // both guards gone: the destination filter and the route's blocked nodes
  { id: 'cats-may-share-a-surface', file: 'studio-cats.js', edits: [
      ["  const opts = Object.keys(NODES).filter(n => n !== cat.node && n !== o.node && n !== reserved(D, other(i)));", "  const opts = Object.keys(NODES).filter(n => n !== cat.node);"],
      ["  const blocked = [D.cats[o].node, reserved(D, o)].filter(n => n !== D.cats[i].node);", "  const blocked = [];"],
      ["  if (e.to === D.cats[other(i)].node) { note(D, 'blocked', { cat: i, edge: id }); D.trav[i] = null; return; }", ""]],
    breaks: ['director/two-cats-never-share-a-surface-never-move-at-once-never-run-one-action-together'], mayAlso: ['director/*'] },
  // both guards gone: the relocation's and the scheduler's
  { id: 'both-cats-move-at-once', file: 'studio-cats.js', edits: [
      ["function tryRelocate(D, i, why) {\n  if (moving(D, other(i))) return false;", "function tryRelocate(D, i, why) {"],
      ["  if (!D.hold && D.t >= D.nextMove && !moving(D, 0) && !moving(D, 1)) {", "  if (!D.hold && D.t >= D.nextMove) {"],
      ["      else D.nextMove = Infinity;   // re-armed when the traversal ends", "      else D.nextMove = D.t + 3;"],
      ["    const awake = [0, 1].filter(i => !D.cats[i].prog && !D.cats[i].asleep);", "    const awake = [0, 1].filter(i => !moving(D, i) && !D.cats[i].prog && !D.cats[i].asleep);"]],
    breaks: ['director/two-cats-never-share-a-surface-never-move-at-once-never-run-one-action-together'], mayAlso: ['director/*'] },
  { id: 'a-mid-air-click-applies', file: 'studio-cats.js', from: "  else if (moving(D, i)) { D.queue[i] = { at: wall }; out = 'queued'; }\n", to: '',
    breaks: ['director/a-click-mid-leg-is-queued-then-served-nothing-changes-in-the-air'], mayAlso: ['director/*'] },
  { id: 'no-rate-limit', file: 'studio-cats.js', from: 'export const CLICK_LIMIT = 4;', to: 'export const CLICK_LIMIT = 999;',
    breaks: ['director/an-over-clicked-cat-flicks-an-ear-and-ignores-you'], mayAlso: ['director/*'] },
  { id: 'every-jump-costs-the-same', file: 'studio-room.js', from: "  if (edge.type === 'up') return 1 + 0.9 * Math.pow(r, 1.8);", to: "  if (edge.type === 'up') return 1;",
    breaks: ['graph/the-two-stage-route-to-the-sill-is-preferred-and-the-direct-one-is-legal'], mayAlso: ['director/*'] },
  { id: 'relocations-every-few-seconds', file: 'studio-cats.js', from: 'export const SPONTANEOUS = [20, 60];', to: 'export const SPONTANEOUS = [2, 6];',
    breaks: ['director/a-spontaneous-relocation-comes-20-60-s-after-the-last-at-most'], mayAlso: ['director/*'] },
  { id: 'nobody-sleeps', file: 'studio-cats.js', from: 'export const SLEEP_AFTER = [45, 95];', to: 'export const SLEEP_AFTER = [4500, 9500];',
    breaks: ['director/a-long-idle-on-a-comfortable-perch-ends-asleep-and-a-sleeper-wakes-before-it-moves'], mayAlso: ['director/*'] },
  { id: 'a-module-calls-math-random', file: 'studio-rig.js', from: 'const TAIL_N = 12, TAIL_SEG = 2.4;', to: 'const TAIL_N = 12, TAIL_SEG = 2.4 + 0 * Math.random();',
    breaks: ['discipline/no-studio-module-schedules-frames-binds-listeners-or-reaches-the-page'], mayAlso: [] },
];

function report(label) {
  const bad = results.filter(r => !r.ok);
  if (label) return bad;
  for (const r of results) console.log(`${r.ok ? '  ok ' : 'FAIL '} ${r.name}${r.detail ? ' — ' + String(r.detail).split('\n')[0].slice(0, 150) : ''}`);
  console.log(`\n${results.length - bad.length} of ${results.length} passed`);
  return bad;
}

async function main() {
  const M = await load(SCENE);
  await partOne(M);
  if (!NO_BROWSER && !NEG) await partTwo();
  const base = report();
  if (!NEG) process.exit(base.length ? 1 : 0);
  if (base.length) { console.log('the base pass is not clean; the negative control means nothing'); process.exit(1); }
  const names = new Set(results.map(r => r.name));
  const set = MUTANTS.filter(m => !ONLY.length || ONLY.includes(m.id));
  // every anchor, before any mutant runs
  for (const m of MUTANTS) {
    const src = fs.readFileSync(path.join(SCENE, m.file), 'utf8');
    for (const [from] of m.edits || [[m.from]]) {
      const n = src.split(from).length - 1;
      if (n !== 1) { console.log(`ANCHOR ${m.id}: matches ${n} times — ${from.slice(0, 60)}`); process.exit(1); }
    }
    for (const b of m.breaks) if (!names.has(b)) { console.log(`STALE ${m.id}: names ${b}, which the gate does not run`); process.exit(1); }
  }
  let failed = 0;
  // ONE DIRECTORY PER MUTANT: Node caches an ES module by its URL, so a reused
  // path hands every later mutant the first one's code (measured: fifteen
  // "misses" that were all the linear-ease mutant, cached)
  let seq = 0;
  for (const m of set) {
    const tmp = path.join(SCENE, `__mutant__studio_${seq++}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp);
    for (const f of STUDIO) fs.copyFileSync(path.join(SCENE, f), path.join(tmp, f));
    let src = fs.readFileSync(path.join(SCENE, m.file), 'utf8');
    for (const [from, to] of m.edits || [[m.from, m.to]]) src = src.replace(from, to);
    fs.writeFileSync(path.join(tmp, m.file), src);
    results = [];
    let crashed = null;
    try { await partOne(await load(tmp)); } catch (e) { crashed = e.message; }
    const red = new Set(results.filter(r => !r.ok).map(r => r.name));
    const missed = m.breaks.filter(b => !red.has(b));
    const allowed = (name) => m.breaks.includes(name) || m.mayAlso.some(p => p === '*' || (p.endsWith('*') ? name.startsWith(p.slice(0, -1)) : p === name));
    const stray = [...red].filter(n => !allowed(n));
    const ok = !crashed && !missed.length && !stray.length;
    if (!ok) failed++;
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${ok ? '  ok ' : 'MISS '} ${m.id}${crashed ? ' CRASHED ' + crashed : ''}${missed.length ? ' — stayed green: ' + missed.join(', ') : ''}${stray.length ? ' — unclaimed red: ' + stray.join(', ') : ''}`);
  }
  console.log(`\nnegative control: ${set.length - failed} of ${set.length} mutants caught`);
  process.exit(failed ? 1 : 0);
}

const sweepMutants = () => { for (const f of fs.readdirSync(SCENE)) if (f.startsWith('__mutant__studio')) fs.rmSync(path.join(SCENE, f), { recursive: true, force: true }); };
sweepMutants();
main().catch(e => { console.error(e); sweepMutants(); process.exit(1); });
