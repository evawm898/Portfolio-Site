// scene/studio-cats.js — the DIRECTOR: two cats, one room, and the rules that
// keep them a pair of animals rather than two animations. DOM-free.
//
// THE RULES, AND WHERE EACH ONE IS ENFORCED:
//   * a cat reaches a surface only by traversing edges: the director starts
//     legs, and `startLeg` throws if a leg does not start where the cat is.
//     Nothing anywhere writes a cat onto a node it did not walk or jump to.
//   * the two never share a surface: a route is planned with the other cat's
//     node AND the node it has reserved blocked, and a leg re-checks its target
//     before it starts.
//   * one cat in motion at a time: a relocation starts only while the other is
//     not on a leg; a click that asks for one waits in a queue until it is.
//   * they never run the same action at once: a click picks from what the
//     other cat is NOT doing.
//   * stillness is the baseline: a spontaneous relocation is due 20-60 s after
//     the last one ended, at most one at a time.
//   * a click is an action, never a costume change or a teleport; a click
//     during a leg is queued (one slot); an over-clicked cat flicks an ear and
//     ignores you.
//   * a long idle on a comfortable perch ends in sleep, and a sleeping cat needs
//     a wake-up beat before it will go anywhere.

import { NODES, EDGES, route, restSpot, ledgeAt, ledgeLength } from './studio-room.js';
import { createCat, stepCat, startLeg, startAction, isLeg, rnd, sample, tween } from './studio-cat.js';

export const SPONTANEOUS = [20, 60];   // seconds between relocations, at most one at a time
export const SLEEP_AFTER = [45, 95];   // seconds of idle on a comfortable perch
export const CLICK_WINDOW = 5;         // seconds
export const CLICK_LIMIT = 4;          // clicks inside the window that make a cat stop listening
export const CLICK_COOLDOWN = 6;       // seconds it then ignores you
export const CLICK_MIN_GAP = 1.2;      // a second accepted click this soon is too soon

const DEST_WEIGHT = { sill: 3, chaise: 2.2, chairL: 1.3, chairR: 1.3, table: 1, floor: 1.1 };
const PERCH_ACTIONS = ['stretch', 'groom', 'look', 'reposition', 'settleDown'];

export function initialCats(seed) {
  const sillPath = NODES.sill.area.path;
  const s = ledgeAt(sillPath, ledgeLength(sillPath) * 0.27);
  return [
    createCat({ id: 'ink', seed: (seed * 2654435761) >>> 0, node: 'chaise', x: 177, z: 300, heading: Math.PI, posture: 'sit' }),
    createCat({ id: 'soot', seed: (seed * 40503 + 977) >>> 0, node: 'sill', x: s.x, z: s.z, heading: s.heading, posture: 'loaf' }),
  ];
}

export function createDirector({ seed = 1, cats = null } = {}) {
  const D = {
    t: 0,
    rs: (seed ^ 0x51ed27) >>> 0 || 1,
    cats: cats || initialCats(seed),
    nextMove: 0,
    trav: [null, null],       // { legs:[edge ids], i, dest }
    queue: [null, null],
    clicks: [[], []],
    ignoreUntil: [-1, -1],
    lastAccepted: [-99, -99],
    idleFor: [0, 0],
    sleepAt: [0, 0],
    log: [],
    paused: false,
    hold: false,              // dev: no spontaneous moves
  };
  const r = () => rnd(D);
  const rr = (a) => a[0] + (a[1] - a[0]) * r();
  D.nextMove = rr(SPONTANEOUS);
  D.sleepAt = [rr(SLEEP_AFTER), rr(SLEEP_AFTER)];
  for (const c of D.cats) for (let i = 0; i < 90; i++) stepCat(c, 1 / 60);
  return D;
}

const note = (D, what, extra = {}) => {
  D.log.push({ t: D.t, what, ...extra });
  if (D.log.length > 200) D.log.splice(0, D.log.length - 200);
};

const other = (i) => 1 - i;
export const moving = (D, i) => !!D.trav[i] || isLeg(D.cats[i]);
const reserved = (D, i) => (D.trav[i] ? D.trav[i].dest : D.cats[i].node);

function pickDestination(D, i) {
  const cat = D.cats[i], o = D.cats[other(i)];
  const opts = Object.keys(NODES).filter(n => n !== cat.node && n !== o.node && n !== reserved(D, other(i)));
  let total = 0;
  for (const n of opts) total += DEST_WEIGHT[n];
  let x = rnd(D) * total;
  for (const n of opts) { x -= DEST_WEIGHT[n]; if (x <= 0) return n; }
  return opts[opts.length - 1];
}

export function planRoute(D, i, dest) {
  const o = other(i);
  const blocked = [D.cats[o].node, reserved(D, o)].filter(n => n !== D.cats[i].node);
  // "most of the time" the cheap route: each edge's cost wobbles per plan
  const jit = new Map(EDGES.map(e => [e.id, 0.7 + 0.7 * rnd(D)]));
  return route(D.cats[i].node, dest, { blocked, jitter: (e) => jit.get(e.id) });
}

export function startTraversal(D, i, legs, dest) {
  D.trav[i] = { legs: legs.map(e => e.id), i: 0, dest };
  note(D, 'travel', { cat: i, legs: D.trav[i].legs });
  const cat = D.cats[i];
  if (cat.asleep) { startAction(cat, 'wake'); return; }
  nextLeg(D, i);
}

function nextLeg(D, i) {
  const T = D.trav[i], cat = D.cats[i];
  if (!T || T.i >= T.legs.length) { D.trav[i] = null; return; }
  const id = T.legs[T.i];
  const e = EDGES.find(x => x.id === id);
  // the target must still be free when the leg begins
  if (e.to === D.cats[other(i)].node) { note(D, 'blocked', { cat: i, edge: id }); D.trav[i] = null; return; }
  // the dev harness replays and scrubs from exactly this state
  D.lastLeg = { i, edge: id, snap: structuredClone(cat), dur: null };
  startLeg(cat, id);
}

/** Dev: put the last leg's cat at time t into that leg, re-simulated from the
 *  snapshot taken as it began. Every draw is in the snapshot, so it is the same
 *  leg; only the step size is fixed (1/240 s) where the page's frames vary. */
export function scrubLeg(D, t, dt = 1 / 240) {
  const L = D.lastLeg;
  if (!L) return null;
  const cat = structuredClone(L.snap);
  startLeg(cat, L.edge);
  const n = Math.max(0, Math.round(t / dt));
  for (let k = 0; k < n && cat.prog; k++) stepCat(cat, dt);
  D.cats[L.i] = cat;
  const e = EDGES.find(x => x.id === L.edge);
  D.trav[L.i] = cat.prog ? { legs: [L.edge], i: 0, dest: e.to } : null;
  return { t: n * dt, done: !cat.prog, phase: cat.prog ? cat.prog.plan.phases[cat.prog.i].k : 'idle' };
}

/** Dev and gate: the last leg re-simulated at a fixed step, sampled. */
export function traceLeg(D, keys, dt = 1 / 240, every = 2) {
  const L = D.lastLeg;
  if (!L) return null;
  const cat = structuredClone(L.snap);
  startLeg(cat, L.edge);
  const t0 = cat.t, rows = [];
  let n = 0;
  while (cat.prog && n < 60 / dt) {
    stepCat(cat, dt); n++;
    if (n % every === 0) { const s = sample(cat); rows.push(keys.map(k => (k === 't' ? s.t - t0 : s[k]))); }
  }
  return { keys, rows, events: cat.events.filter(e => e.t >= t0).map(e => [e.type, e.t - t0, e.k || e.foot || '']), arc: cat.lastArc };
}

/** Dev: how long the last leg runs, end to end, at the fixed step. */
export function legLength(D, dt = 1 / 240) {
  const L = D.lastLeg;
  if (!L) return 0;
  if (L.dur != null) return L.dur;
  const cat = structuredClone(L.snap);
  startLeg(cat, L.edge);
  let n = 0;
  while (cat.prog && n < 60 / dt) { stepCat(cat, dt); n++; }
  L.dur = n * dt;
  L.phases = cat.prog ? [] : cat.events.filter(e => e.type === 'phase' && e.t >= L.snap.t).map(e => [e.k, e.t - L.snap.t]);
  L.contacts = cat.events.filter(e => (e.type === 'foreContact' || e.type === 'hindContact') && e.t >= L.snap.t).map(e => [e.type, e.t - L.snap.t]);
  L.arc = cat.lastArc || null;
  return L.dur;
}

function tryRelocate(D, i, why) {
  if (moving(D, other(i))) return false;
  for (let tries = 0; tries < 5; tries++) {
    const dest = pickDestination(D, i);
    const legs = planRoute(D, i, dest);
    if (legs && legs.length) { startTraversal(D, i, legs, dest); note(D, why, { cat: i, dest }); return true; }
  }
  return false;
}

function finishTraversal(D, i) {
  D.trav[i] = null;
  const cat = D.cats[i];
  const x = rnd(D);
  const posture = x < 0.55 ? 'sit' : x < 0.85 ? 'loaf' : 'stand';
  if (posture !== 'stand') startAction(cat, 'pose', { posture });
  D.idleFor[i] = 0;
  D.nextMove = D.t + SPONTANEOUS[0] + (SPONTANEOUS[1] - SPONTANEOUS[0]) * rnd(D);
}

function clickAction(D, i) {
  const cat = D.cats[i];
  const otherAction = D.cats[other(i)].action;
  if (cat.node === 'floor' && !moving(D, other(i))) {
    if (tryRelocate(D, i, 'clickRelocate')) return 'relocate';
  }
  let pool = PERCH_ACTIONS.filter(a => a !== cat.lastAction && a !== otherAction);
  if (cat.posture === 'curl') pool = ['wake'];
  if (!pool.length) pool = ['look'];
  const name = pool[Math.floor(rnd(D) * pool.length) % pool.length];
  if (name === 'reposition') {
    const target = repositionTarget(D, cat);
    if (!target) { startAction(cat, 'look'); return 'look'; }
    startAction(cat, 'reposition', { target });
    return 'reposition';
  }
  if (name === 'settleDown' && cat.posture === 'loaf' && !NODES[cat.node].comfy) { startAction(cat, 'look'); return 'look'; }
  startAction(cat, name);
  return name;
}

function repositionTarget(D, cat) {
  const n = NODES[cat.node], a = n.area;
  if (a.kind === 'ledge') {
    const L = ledgeLength(a.path);
    const s = a.ends + (L - 2 * a.ends) * rnd(D);
    const q = ledgeAt(a.path, s);
    return restSpot(cat.node, q.x, q.z, rnd(D) < 0.5 ? q.heading : q.heading + Math.PI);
  }
  if (a.kind === 'rect' || a.kind === 'disk') {
    // a small surface: turn round where you are
    return restSpot(cat.node, cat.pos[0], cat.pos[2], cat.h + Math.PI);
  }
  const x = cat.pos[0] + (rnd(D) - 0.5) * 120, z = cat.pos[2] + (rnd(D) - 0.5) * 90;
  const r = restSpot('floor', Math.max(-170, Math.min(120, x)), Math.max(60, Math.min(330, z)), Math.atan2(z - cat.pos[2], x - cat.pos[0]));
  return r;
}

/** A click on cat i at wall time `wall`. Returns what the cat did. */
export function click(D, i, wall) {
  const cat = D.cats[i];
  const hist = D.clicks[i];
  hist.push(wall);
  while (hist.length && hist[0] < wall - CLICK_WINDOW) hist.shift();
  const flick = () => { if (!cat.tw.earL && !cat.tw.earR) tween(cat, rnd(D) < 0.5 ? 'earL' : 'earR', [[1, 0.08, 'out'], [0, 0.22, 'inOut']]); };
  let out;
  if (wall < D.ignoreUntil[i]) { flick(); out = 'ignored'; }
  else if (hist.length >= CLICK_LIMIT) { D.ignoreUntil[i] = wall + CLICK_COOLDOWN; flick(); out = 'overclicked'; }
  else if (moving(D, i)) { D.queue[i] = { at: wall }; out = 'queued'; }
  else if (wall - D.lastAccepted[i] < CLICK_MIN_GAP || cat.prog) { flick(); out = 'ignored'; }
  else {
    D.lastAccepted[i] = wall;
    if (cat.asleep) { startAction(cat, 'wake'); out = 'wake'; }
    else out = clickAction(D, i);
  }
  note(D, 'click', { cat: i, out });
  return out;
}

export function stepDirector(D, dt) {
  if (D.paused) return;
  D.t += dt;
  for (let i = 0; i < 2; i++) {
    const cat = D.cats[i];
    const wasLeg = isLeg(cat);
    const wasProg = !!cat.prog;
    const progAction = cat.prog && cat.prog.plan.action;
    stepCat(cat, dt);
    if (wasProg && !cat.prog) {
      if (progAction === 'pose' && cat.posture === 'curl') cat.asleep = true;
      if (progAction === 'settleDown' && cat.posture === 'curl') cat.asleep = true;
      if (wasLeg) {
        const T = D.trav[i];
        if (T) { T.i++; if (T.i < T.legs.length) nextLeg(D, i); else finishTraversal(D, i); }
      } else if (progAction === 'wake' && D.trav[i]) {
        nextLeg(D, i);
      }
    }
    // a queued click is served once the cat is free and nobody else is moving
    if (D.queue[i] && !cat.prog && !moving(D, i)) {
      D.queue[i] = null;
      D.lastAccepted[i] = -99;
      note(D, 'dequeue', { cat: i, out: clickAction(D, i) });
    }
    // sleep
    if (!cat.prog && !moving(D, i) && !cat.asleep && NODES[cat.node].comfy) {
      D.idleFor[i] += dt;
      if (D.idleFor[i] >= D.sleepAt[i]) {
        D.idleFor[i] = 0;
        D.sleepAt[i] = SLEEP_AFTER[0] + (SLEEP_AFTER[1] - SLEEP_AFTER[0]) * rnd(D);
        startAction(cat, 'settleDown');
        note(D, 'drowse', { cat: i, posture: cat.posture });
      }
    } else if (cat.prog || moving(D, i)) D.idleFor[i] = 0;
  }
  // a spontaneous relocation, at most one at a time
  if (!D.hold && D.t >= D.nextMove && !moving(D, 0) && !moving(D, 1)) {
    const awake = [0, 1].filter(i => !D.cats[i].prog && !D.cats[i].asleep);
    const idle = awake.length ? awake : [0, 1].filter(i => !D.cats[i].prog);
    if (idle.length) {
      const i = idle[Math.floor(rnd(D) * idle.length) % idle.length];
      if (!tryRelocate(D, i, 'spontaneous')) D.nextMove = D.t + 8;
      else D.nextMove = Infinity;   // re-armed when the traversal ends
    } else D.nextMove = D.t + 5;
  }
}

/** Dev: send cat i along one named edge (routing to its start if needed). */
export function forceEdge(D, i, edgeId) {
  const e = EDGES.find(x => x.id === edgeId);
  if (!e) return `no edge ${edgeId}`;
  if (moving(D, i) || moving(D, other(i))) return 'a cat is already moving';
  if (D.cats[other(i)].node === e.to) return `blocked: the other cat is on ${e.to}`;
  let legs = [];
  if (D.cats[i].node !== e.from) {
    if (D.cats[other(i)].node === e.from) return `blocked: the other cat is on ${e.from}`;
    const pre = planRoute(D, i, e.from);
    if (!pre) return `no route to ${e.from}`;
    legs = pre;
  }
  legs.push(e);
  D.cats[i].prog = null;
  startTraversal(D, i, legs, e.to);
  return `ok: ${legs.map(l => l.id).join(' -> ')}`;
}

// ------------------------------------------------------------ rehearsal ----
// One cat, alone in the room, sent along one edge from a rest spot on its
// source, sampled every step. This is what the gate and the contact sheets
// measure, and it is the SAME stepCat the page runs.
export function rehearse(edgeId, { seed = 7, dt = 1 / 240, posture = 'sit', offset = 8 } = {}) {
  const e = EDGES.find(x => x.id === edgeId);
  const back = offset;
  const r = restSpot(e.from, e.launch[0] - Math.cos(e.heading) * back, e.launch[1] - Math.sin(e.heading) * back, e.heading + 0.5);
  const cat = createCat({ id: 'r', seed, node: e.from, x: r.x, z: r.z, heading: r.heading, posture });
  for (let i = 0; i < 60; i++) stepCat(cat, dt);
  const plan = startLeg(cat, edgeId);
  const t0 = cat.t;
  const samples = [];
  let guard = 0;
  while (cat.prog && guard++ < 30 / dt) { stepCat(cat, dt); samples.push(sample(cat)); }
  return { cat, plan, samples, t0, events: cat.events.filter(x => x.t >= t0), edge: e };
}
