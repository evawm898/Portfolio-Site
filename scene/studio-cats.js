// scene/studio-cats.js — the DIRECTOR: two cats, one room, and the rules that
// keep them a pair of animals rather than two animations. DOM-free.
//
// THE AMBIENT RULES (Eva's revised spec), AND WHERE EACH IS ENFORCED:
//   * the pair is BUSY: a deliberate action starts every 5-12 s across the two
//     cats (ACTION_EVERY), chosen for the cat and the surface it is on — walk
//     somewhere on the floor and sit, look at something, groom, stretch,
//     shift along a perch, change posture, jump somewhere, doze. Stillness is a
//     beat between actions, not the default.
//   * walking to a spot on the floor is an action in its own right, and it is
//     usually followed by something there (a sit, a look, a groom) — a cat
//     wanders, settles, does a thing, moves on.
//   * both cats may move at once; they may not MIRROR each other: neither
//     starts what the other is doing, or what it started in the last
//     MIRROR_WINDOW seconds.
//   * a doze is brief: a cat curls up for DOZE seconds and wakes on its own.
//   * a cat reaches a surface only by traversing edges: the director starts
//     legs, and `startLeg` throws if a leg does not start where the cat is.
//     Nothing anywhere writes a cat onto a node it did not walk or jump to.
//   * the two never share a perch: a route is planned with the other cat's
//     node AND the node it has reserved blocked. The FLOOR is shared, and on it
//     they keep apart (FLOOR_APART): a walk target, a landing and a launch are
//     refused if they come too close to where the other cat is or is going.
//   * a click is an action, never a costume change or a teleport; a click
//     during a leg is queued (one slot); an over-clicked cat flicks an ear and
//     ignores you.

import { NODES, EDGES, route, restSpot, ledgeAt, ledgeLength, rootAllowed } from './studio-room.js';
import { createCat, stepCat, startLeg, startAction, isLeg, rnd, sample, tween } from './studio-cat.js';

export const ACTION_EVERY = [5, 12];   // seconds between deliberate actions, across the pair
export const MIRROR_WINDOW = 4;        // seconds: the other cat may not start the same thing this soon
export const DOZE = [8, 20];           // seconds asleep, then it wakes by itself
export const FLOOR_APART = 55;         // cm between two cats on the floor, at rest or headed there
export const CLICK_WINDOW = 5;         // seconds
export const CLICK_LIMIT = 4;          // clicks inside the window that make a cat stop listening
export const CLICK_COOLDOWN = 6;       // seconds it then ignores you
export const CLICK_MIN_GAP = 1.2;      // a second accepted click this soon is too soon

const DEST_WEIGHT = { sill: 3, chaise: 2.2, chairL: 1.3, chairR: 1.3, table: 1, floor: 2.2 };
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
    nextMove: 0,              // when the next deliberate action is due
    trav: [null, null],       // { legs:[edge ids], i, dest }
    queue: [null, null],
    chain: [[], []],          // what a compound action does next, in order
    walkTo: [null, null],     // where a cat walking on the floor is headed
    wakeAt: [-1, -1],         // a dozing cat wakes at this time
    started: [[], []],        // [kind, t] of recent starts, for the mirror rule
    clicks: [[], []],
    ignoreUntil: [-1, -1],
    lastAccepted: [-99, -99],
    lastDoze: [-99, -99],
    log: [],
    paused: false,
    hold: false,              // dev: no spontaneous actions
  };
  const r = () => rnd(D);
  D.nextMove = 1.5 + 3 * r();
  for (const c of D.cats) for (let i = 0; i < 90; i++) stepCat(c, 1 / 60);
  return D;
}

const note = (D, what, extra = {}) => {
  D.log.push({ t: D.t, what, ...extra });
  if (D.log.length > 200) D.log.splice(0, D.log.length - 200);
};

const other = (i) => 1 - i;
export const moving = (D, i) => !!D.trav[i] || isLeg(D.cats[i]);
export const busy = (D, i) => moving(D, i) || !!D.cats[i].prog || D.chain[i].length > 0;
const reserved = (D, i) => (D.trav[i] ? D.trav[i].dest : D.cats[i].node);

// --------------------------------------------------- keeping apart on the floor --
// Where the other cat IS on the floor, and where it is GOING there: its root,
// its floor walk's target, and — on a leg that ends on the floor — the landing.
function floorClaims(D, i) {
  const o = D.cats[i], out = [];
  if (o.node === 'floor') out.push([o.pos[0], o.pos[2]]);
  if (D.walkTo[i]) out.push(D.walkTo[i]);
  const T = D.trav[i];
  if (T) for (const id of T.legs.slice(T.i)) {
    const e = EDGES.find(x => x.id === id);
    if (e.to === 'floor') out.push(e.land);
    if (e.from === 'floor') out.push(e.launch);
  }
  return out;
}
function clearOf(D, i, pts, apart = FLOOR_APART) {
  const claims = floorClaims(D, other(i));
  for (const p of pts) for (const q of claims) if (Math.hypot(p[0] - q[0], p[1] - q[1]) < apart) return false;
  return true;
}
// a straight walk on the floor, sampled: on the floor, out from under the
// furniture, and never past the other cat
// (the ends may sit near the table and chairs — a launch spot does, and so does
// where a cat lands off one — so it is the walk BETWEEN them that must not
// pass under the furniture)
function floorPathClear(D, i, from, to) {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(2, Math.ceil(L / 6));
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const x = from[0] + (to[0] - from[0]) * k / n, z = from[1] + (to[1] - from[1]) * k / n;
    const along = L * k / n;
    if (k > 0 && !rootAllowed('floor', x, z)) return false;
    if (along > 25 && along < L - 25) for (const b of NODES.floor.avoid) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return false;
    if (k) pts.push([x, z]);
  }
  return clearOf(D, i, pts);
}

// the walk a leg off the floor begins with: to a lead-in point squarely behind
// the launch spot, then onto it (the approach phase's own path)
function approachClear(D, i, e) {
  const c = D.cats[i], f = [Math.cos(e.heading), Math.sin(e.heading)];
  const lead = [e.launch[0] - f[0] * 14, e.launch[1] - f[1] * 14];
  return floorPathClear(D, i, [c.pos[0], c.pos[2]], lead) && floorPathClear(D, i, lead, e.launch);
}

function legsClear(D, i, legs) {
  for (const e of legs) {
    if (e.to === 'floor' && !clearOf(D, i, [e.land])) return false;
    if (e.from === 'floor' && !clearOf(D, i, [e.launch])) return false;
  }
  return true;
}

function pickDestination(D, i) {
  const cat = D.cats[i], o = D.cats[other(i)];
  const opts = Object.keys(NODES).filter(n => n !== cat.node && (n === 'floor' || (n !== o.node && n !== reserved(D, other(i)))));
  let total = 0;
  for (const n of opts) total += DEST_WEIGHT[n];
  let x = rnd(D) * total;
  for (const n of opts) { x -= DEST_WEIGHT[n]; if (x <= 0) return n; }
  return opts[opts.length - 1];
}

export function planRoute(D, i, dest) {
  const o = other(i);
  // the floor is shared; every other surface holds one cat
  const blocked = [D.cats[o].node, reserved(D, o)].filter(n => n !== D.cats[i].node && n !== 'floor');
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
  const o = D.cats[other(i)];
  const crowded = (e.to !== 'floor' && (e.to === o.node || e.to === reserved(D, other(i))))
    || !legsClear(D, i, [e])
    || (e.from === 'floor' && !approachClear(D, i, e));
  if (crowded) { note(D, 'blocked', { cat: i, edge: id }); D.trav[i] = null; return false; }
  // the dev harness replays and scrubs from exactly this state
  D.lastLeg = { i, edge: id, snap: structuredClone(cat), dur: null };
  startLeg(cat, id);
  return true;
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
  for (let tries = 0; tries < 6; tries++) {
    const dest = pickDestination(D, i);
    const legs = planRoute(D, i, dest);
    if (!legs || !legs.length || !legsClear(D, i, legs)) continue;
    const e0 = legs[0];
    if (e0.from === 'floor' && !approachClear(D, i, e0)) continue;
    startTraversal(D, i, legs, dest);
    if (!D.trav[i] && !D.cats[i].prog) continue;
    note(D, 'route', { cat: i, dest, why });
    return true;
  }
  return false;
}

function finishTraversal(D, i) {
  D.trav[i] = null;
  const cat = D.cats[i];
  const x = rnd(D);
  const posture = x < 0.55 ? 'sit' : x < 0.85 ? 'loaf' : 'stand';
  if (posture !== 'stand') startAction(cat, 'pose', { posture });
  // having arrived, it often does a thing there
  if (rnd(D) < 0.5) D.chain[i].push(rnd(D) < 0.55 ? 'look' : 'groom');
}

// A FLOOR WANDER: somewhere 50-170 cm off, on the floor, out from under the
// furniture, reachable in a straight walk, and clear of the other cat.
function wanderTarget(D, i) {
  const cat = D.cats[i];
  for (let tries = 0; tries < 24; tries++) {
    const a = rnd(D) * Math.PI * 2, r = 50 + 120 * rnd(D);
    const x = cat.pos[0] + Math.cos(a) * r, z = cat.pos[2] + Math.sin(a) * r;
    if (!rootAllowed('floor', x, z)) continue;
    const q = restSpot('floor', x, z, a);
    if (!rootAllowed('floor', q.x, q.z)) continue;
    if (NODES.floor.avoid.some(b => q.x > b.x0 - 6 && q.x < b.x1 + 6 && q.z > b.z0 - 6 && q.z < b.z1 + 6)) continue;
    if (!floorPathClear(D, i, [cat.pos[0], cat.pos[2]], [q.x, q.z])) continue;
    // it ends facing somewhere of its own, not along the walk
    return { x: q.x, z: q.z, heading: a + (rnd(D) - 0.5) * 2.4 };
  }
  return null;
}

// ----------------------------------------------------------- choosing --
// What a cat may do next, and how much it wants to. The menu depends on the
// surface: a floor cat mostly wanders; a perch cat grooms, looks, stretches,
// shifts, dozes, or goes somewhere.
function menu(D, i) {
  const cat = D.cats[i], node = NODES[cat.node];
  const m = [];
  if (cat.node === 'floor') {
    m.push(['wander', 3.2], ['relocate', 1.5], ['groom', 0.8], ['look', 0.9], ['stretch', 0.5], ['pose', 0.6]);
  } else {
    m.push(['relocate', 1.8], ['groom', 1.0], ['look', 1.1], ['stretch', 0.6], ['pose', 0.7]);
    if (node.area.kind === 'ledge' || cat.node === 'chaise') m.push(['reposition', 1.0]);
    if (node.comfy && D.t - D.lastDoze[i] > 45) m.push(['doze', 0.45]);
  }
  return m;
}

// what a cat may do next, unasked, after each small action
const FOLLOW = { groom: ['look', 'pose'], look: ['groom', 'pose', 'look'], stretch: ['groom', 'look'], pose: ['look', 'groom'], reposition: ['look', 'groom', 'pose'], wake: ['look', 'groom'] };
const FOLLOW_P = 0.55;
const KIND = { wander: 'walk', reposition: 'walk', relocate: 'leg', doze: 'doze' };
const kindOf = (name) => KIND[name] || name;

function mirrored(D, i, name) {
  const o = other(i), k = kindOf(name);
  const oc = D.cats[o];
  // going somewhere (a walk, a jump) may overlap the other cat going
  // somewhere, so long as they did not set off together; a small action (a
  // groom, a look, a stretch) is never done by both at once
  const travel = k === 'walk' || k === 'leg';
  if (!travel && oc.action && kindOf(oc.action === 'leg' ? 'relocate' : oc.action) === k) return true;
  return D.started[o].some(([kk, t]) => kk === k && D.t - t < MIRROR_WINDOW);
}

function begin(D, i, name, why = 'act') {
  const cat = D.cats[i];
  let ok = false;
  switch (name) {
    case 'wander': {
      const t = wanderTarget(D, i);
      if (t) {
        startAction(cat, 'reposition', { target: t, posture: rnd(D) < 0.6 ? 'sit' : rnd(D) < 0.5 ? 'loaf' : 'stand' });
        D.walkTo[i] = [t.x, t.z];
        if (rnd(D) < 0.65) D.chain[i].push(rnd(D) < 0.6 ? 'look' : 'groom');
        ok = true;
      }
      break;
    }
    case 'relocate': ok = tryRelocate(D, i, why); break;
    case 'reposition': {
      const target = repositionTarget(D, cat);
      if (target) { startAction(cat, 'reposition', { target }); ok = true; }
      break;
    }
    case 'pose': {
      const cur = cat.posture;
      const opts = ['sit', 'loaf', 'stand'].filter(p => p !== cur);
      startAction(cat, 'pose', { posture: opts[Math.floor(rnd(D) * opts.length) % opts.length] });
      ok = true;
      break;
    }
    case 'doze':
      // down through its postures to a curl; it wakes by itself (stepDirector)
      if (cat.posture === 'stand') D.chain[i].push('settleDown', 'settleDown');
      else if (cat.posture === 'sit') D.chain[i].push('settleDown');
      startAction(cat, 'settleDown');
      D.lastDoze[i] = D.t;
      D.wakeAt[i] = -2;   // set once it is actually curled
      ok = true;
      break;
    default:
      startAction(cat, name);
      ok = true;
  }
  if (ok) { D.started[i].push([kindOf(name), D.t]); if (D.started[i].length > 12) D.started[i].shift(); note(D, why, { cat: i, act: name }); }
  return ok;
}

function chooseAndBegin(D, i) {
  const m = menu(D, i).filter(([n]) => !mirrored(D, i, n) && n !== D.cats[i].lastAction);
  for (let tries = 0; tries < 4 && m.length; tries++) {
    let total = 0;
    for (const [, w] of m) total += w;
    let x = rnd(D) * total, pick = m[m.length - 1][0];
    for (const [n, w] of m) { x -= w; if (x <= 0) { pick = n; break; } }
    if (begin(D, i, pick)) return true;
    m.splice(m.findIndex(q => q[0] === pick), 1);
  }
  return false;
}

function clickAction(D, i) {
  const cat = D.cats[i];
  const otherAction = D.cats[other(i)].action;
  if (cat.node === 'floor') {
    if (begin(D, i, rnd(D) < 0.5 ? 'relocate' : 'wander', 'clickRelocate')) return 'relocate';
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
      if ((progAction === 'pose' || progAction === 'settleDown') && cat.posture === 'curl') {
        cat.asleep = true;
        if (D.wakeAt[i] === -2 || D.wakeAt[i] < D.t) D.wakeAt[i] = D.t + DOZE[0] + (DOZE[1] - DOZE[0]) * rnd(D);
      }
      if (progAction === 'reposition') D.walkTo[i] = null;
      if (wasLeg) {
        const T = D.trav[i];
        if (T) { T.i++; if (T.i < T.legs.length) { if (!nextLeg(D, i)) finishTraversal(D, i); } else finishTraversal(D, i); }
      } else if (progAction === 'wake' && D.trav[i]) {
        nextLeg(D, i);
      }
      // the rest of a compound action — and often, unasked, one more small
      // thing where it is: a cat that has groomed looks round, one that has
      // looked shifts its weight
      if (!cat.prog && !D.trav[i] && !cat.asleep && !D.chain[i].length && !wasLeg && progAction && FOLLOW[progAction] && rnd(D) < FOLLOW_P) {
        const opts = FOLLOW[progAction].filter(a => !mirrored(D, i, a));
        if (opts.length) D.chain[i].push(opts[Math.floor(rnd(D) * opts.length) % opts.length]);
      }
      if (!cat.prog && !D.trav[i] && D.chain[i].length && !cat.asleep) {
        let nx = D.chain[i].shift();
        // the mirror rule holds for the second half of a compound too
        if (nx !== 'settleDown' && mirrored(D, i, nx)) nx = ['look', 'groom', 'pose'].find(a => a !== nx && !mirrored(D, i, a)) || null;
        if (nx === 'pose') { const opts = ['sit', 'loaf', 'stand'].filter(p => p !== cat.posture); startAction(cat, 'pose', { posture: opts[Math.floor(rnd(D) * opts.length) % opts.length] }); }
        else if (nx) startAction(cat, nx);
        if (nx) { D.started[i].push([kindOf(nx), D.t]); if (D.started[i].length > 12) D.started[i].shift(); }
      } else if (cat.asleep) D.chain[i].length = 0;
    }
    // a queued click is served once the cat is free
    if (D.queue[i] && !cat.prog && !moving(D, i)) {
      D.queue[i] = null;
      D.lastAccepted[i] = -99;
      D.chain[i].length = 0;
      note(D, 'dequeue', { cat: i, out: clickAction(D, i) });
    }
    // a doze ends by itself
    if (cat.asleep && !cat.prog && D.wakeAt[i] > 0 && D.t >= D.wakeAt[i]) {
      D.wakeAt[i] = -1;
      startAction(cat, 'wake');
      if (rnd(D) < 0.5) D.chain[i].push('stretch');
      note(D, 'wake', { cat: i });
    }
  }
  // THE PAIR'S CLOCK: a deliberate action every 5-12 s, to whichever cat is
  // free (the one free longest, if both are)
  if (!D.hold && D.t >= D.nextMove) {
    const free = [0, 1].filter(i => !busy(D, i) && !D.cats[i].asleep && !D.queue[i]);
    free.sort((a, b) => lastStart(D, a) - lastStart(D, b));
    let did = false;
    for (const i of free) if (chooseAndBegin(D, i)) { did = true; break; }
    D.nextMove = D.t + (did ? ACTION_EVERY[0] + (ACTION_EVERY[1] - ACTION_EVERY[0]) * rnd(D) : 1);
  }
}

const lastStart = (D, i) => (D.started[i].length ? D.started[i][D.started[i].length - 1][1] : -99);

/** Dev: send cat i along one named edge (routing to its start if needed). */
export function forceEdge(D, i, edgeId) {
  const e = EDGES.find(x => x.id === edgeId);
  if (!e) return `no edge ${edgeId}`;
  if (moving(D, i)) return 'that cat is already moving';
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
