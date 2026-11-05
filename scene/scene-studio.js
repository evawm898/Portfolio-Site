// scene/scene-studio.js — SCENE 4: a studio with a bay window, and two black
// cats who live in it.
//
// This file is WIRING. The room, its camera and its perch graph are in
// studio-room.js; one cat's state and motion in studio-cat.js; its drawable
// skeleton in studio-rig.js; the pair and their rules in studio-cats.js; every
// mark in studio-draw.js. All of those are DOM-free and the gate runs them in
// Node. The `?dev=1` harness is studio-dev.js and is the only DOM code here.
//
// THE ONE INPUT is a click (or tap) ON A CAT. It triggers an action — never a
// teleport, never a costume change. A click on the room does nothing.
//
// TWO PLANES: the room is drawn once per resize onto the back canvas; the front
// canvas carries the furniture and the cats in one painter's order every frame.
//
// THE SIMULATION IS STEPPED IN SLICES OF AT MOST 1/120 s, whatever the frame
// rate, so a slow frame cannot make a spring overshoot or a jump skip its
// contact; and the dev harness's slow motion is a time scale on the same steps.

import { createView, EDGES, NODES } from './studio-room.js';
import { createDirector, stepDirector, click, forceEdge, scrubLeg, legLength, traceLeg, moving } from './studio-cats.js';
import { TIMING, CHANCE, APEX_FRAC, H_STAND, sample } from './studio-cat.js';
import { solveRig } from './studio-rig.js';
import { drawRoom, drawActors } from './studio-draw.js';
import { mountDev, drawOverlay } from './studio-dev.js';

export const meta = { title: 'Studio bay window' };

const MAX_SLICE = 1 / 120;

export default function createStudioScene(host) {
  const back = host.canvas2d();
  const front = host.canvas2d();
  let view = createView(host.width, host.height);
  let D = createDirector({ seed: host.seed });
  let roomDirty = true;
  let rigs = D.cats.map(solveRig);
  const dev = { on: !!host.dev, timeScale: 1, overlay: { graph: false, arc: true }, frozen: false };

  function advance(dt) {
    let rem = dt;
    while (rem > 1e-9) {
      const s = Math.min(MAX_SLICE, rem);
      stepDirector(D, s);
      rem -= s;
    }
  }

  function legEdges() {
    return D.cats.map((c) => (c.prog && c.prog.plan.edge ? EDGES.find(e => e.id === c.prog.plan.edge) : null));
  }

  function render() {
    if (roomDirty) { drawRoom(back.ctx, view); roomDirty = false; }
    rigs = D.cats.map(solveRig);
    drawActors(front.ctx, view, D.cats, legEdges(), rigs);
    if (dev.on) drawOverlay(front.ctx, view, D, dev.overlay);
  }

  // THE CLICK HITS THE CAT THAT WAS DRAWN: its projected spine and head, the
  // nearest within its own radius plus a finger's slack.
  function hitCat(x, y) {
    let best = -1, bestD = Infinity;
    rigs.forEach((rig, i) => {
      for (const q of [...rig.spine, { p: rig.head.c, r: rig.head.r }]) {
        const p = view.p(q.p[0], q.p[1], q.p[2]);
        const d = Math.hypot(p.x - x, p.y - y) - q.r * p.s;
        if (d < 10 && d < bestD) { bestD = d; best = i; }
      }
    });
    return best;
  }

  const api = {
    get D() { return D; }, EDGES, NODES, TIMING, CHANCE, dev,
    force: (i, id) => { const r = forceEdge(D, i, id); return r; },
    scrub: (t) => { dev.frozen = true; const r = scrubLeg(D, t); render(); return r; },
    replay: () => { dev.frozen = false; scrubLeg(D, 0); return 'replaying'; },
    resume: () => { dev.frozen = false; },
    legLength: () => legLength(D),
    hold: (on) => { D.hold = !!on; },
  };
  if (dev.on) mountDev(host.panel(), api);

  const scene = {
    frame(dt) {
      if (!dev.frozen) advance(dt * dev.timeScale);
      render();
    },
    resize(w, h) { view = createView(w, h); roomDirty = true; },
    pointer(x, y, wall) {
      const i = hitCat(x, y);
      if (i >= 0) click(D, i, wall);
    },
    dispose() { D.cats.length = 0; },

    // TEST CHROME. The page has no panel outside ?dev=1, so this is the gate's
    // window in; it reports and never decides.
    __pump(seconds, step = 1 / 120) {
      const n = Math.max(0, Math.round(seconds / step));
      for (let i = 0; i < n; i++) stepDirector(D, step);
      return D.t;
    },
    dev(cmd) {
      switch (cmd && cmd.op) {
        case 'force': return api.force(cmd.cat, cmd.edge);
        case 'hold': api.hold(cmd.on); return D.hold;
        case 'scrub': return api.scrub(cmd.t);
        case 'replay': return api.replay();
        case 'resume': return api.resume();
        case 'legLength': return { dur: api.legLength(), phases: D.lastLeg && D.lastLeg.phases, contacts: D.lastLeg && D.lastLeg.contacts, edge: D.lastLeg && D.lastLeg.edge, cat: D.lastLeg && D.lastLeg.i };
        case 'trace': return traceLeg(D, cmd.keys, cmd.dt, cmd.every);
        case 'overlay': Object.assign(dev.overlay, cmd.set || {}); dev.on = true; return dev.overlay;
        case 'timeScale': dev.timeScale = cmd.v; return dev.timeScale;
        case 'screen': {
          // where a cat is on screen, for a gate that has to click one
          const rig = rigs[cmd.cat];
          const s = rig.spine[3];
          const p = view.p(s.p[0], s.p[1], s.p[2]);
          return { x: p.x, y: p.y };
        }
        case 'bounds': {
          const rig = rigs[cmd.cat];
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          const add = (q, r = 0) => { const p = view.p(q[0], q[1], q[2]); x0 = Math.min(x0, p.x - r * p.s); x1 = Math.max(x1, p.x + r * p.s); y0 = Math.min(y0, p.y - r * p.s); y1 = Math.max(y1, p.y + r * p.s); };
          rig.spine.forEach(s => add(s.p, s.r)); add(rig.head.c, rig.head.r);
          rig.legs.forEach(L => L.pts.forEach(q => add(q, 2))); rig.tail.forEach(t => add(t.p, t.r));
          rig.ears.forEach(tri => tri.forEach(q => add(q)));
          return { x0, y0, x1, y1 };
        }
        case 'project': { const p = view.p(cmd.x, cmd.y, cmd.z); return { x: p.x, y: p.y, s: p.s }; }
        default: return null;
      }
    },
    state() {
      return {
        t: D.t,
        hold: D.hold,
        nextMove: D.nextMove,
        cats: D.cats.map((c, i) => ({
          id: c.id, node: c.node, pos: [...c.pos], h: c.h, posture: c.posture, asleep: c.asleep,
          action: c.action, phase: c.prog ? c.prog.plan.phases[c.prog.i]?.k : null,
          edge: c.prog && c.prog.plan.edge, moving: moving(D, i), airborne: !!c.free,
          events: c.events.slice(-40).map(e => [e.type, e.t, e.k || e.foot || '']),
        })),
        log: D.log.slice(-40),
        queue: D.queue.map(q => !!q),
        ignoreUntil: [...D.ignoreUntil],
        apexFrac: APEX_FRAC, H: H_STAND,
        width: view.w, height: view.h,
      };
    },
  };
  return scene;
}
