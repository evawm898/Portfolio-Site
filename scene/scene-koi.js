// scene/scene-koi.js — SCENE 1: a koi pond in the rain.
//
// This file is WIRING. Every rule lives in a module beside it — the viewpoint
// in surface.js, the escalation in koi-storm.js, the ebb of the wind in
// koi-wind.js, the splash in koi-ripples.js, the fall in koi-rain.js, the fish
// in koi-fish.js, every mark in koi-draw.js — and all of those are free of the
// DOM so the gate can run them without a browser. What is here is the order
// things happen in and the two places the outside world gets in.
//
// THE TWO INPUTS, AND WHAT EACH REACHES:
//   a click  -> spawns a ripple AND adds a fifth of a downpour. The ripple goes
//               through the same spawner a raindrop uses, with bigger numbers,
//               and the fish cannot tell the two apart (see koi-ripples.js).
//   a scroll -> tilts the rain. It reaches the wind and nothing else: the koi
//               are underwater and the ripples are circles whatever the weather.
//
// CLICK TIMING IS WALL TIME, NOT SCENE TIME, and that is deliberate. "Five
// rapid clicks" is a statement about a hand, so it is measured against the
// clock the hand is on; the storm's own evolution runs on the frame clock,
// which stops with the tab. Nothing compares one to the other — the storm uses
// click times only against other click times.

import { makeRandom } from './rng.js';
import { createSurface } from './surface.js';
import { createStorm } from './koi-storm.js';
import { createWind, normalizeWheel } from './koi-wind.js';
import { createRipples, rollRipple, CLICK_RIPPLE } from './koi-ripples.js';
import { createRain } from './koi-rain.js';
import { createSchool } from './koi-fish.js';
import { createRenderer } from './koi-draw.js';

// The title is chrome-free: it names the tab and the stage's aria-label, and
// nothing draws it on screen. There is no blurb — "no chrome besides the nav"
// is literal, so the two interactions are discovered by trying them.
export const meta = {
  title: 'Koi rain pond',
};

export default function createKoiScene(host) {
  const { canvas, ctx } = host.canvas2d();
  const surface = createSurface();
  const rand = makeRandom(host.seed);

  const storm = createStorm();
  const wind = createWind();
  const ripples = createRipples();
  const rain = createRain({ rand, ripples });
  const school = createSchool({ rand, surface, width: host.width, height: host.height });
  const renderer = createRenderer(ctx, surface);

  let width = host.width, height = host.height;
  let clock = 0;

  // The pond opens with koi already in it — but they are still spawned OUTSIDE
  // the frame and swum in, in simulated time, before the first frame is drawn.
  // See scene/koi-fish.js: no koi is ever placed in view, the seed included.
  school.seed(width, height);

  const scene = {
    frame(dt) {
      clock += dt;
      storm.advance(dt);
      wind.advance(dt);
      const fallDir = wind.fallDir();
      rain.advance(dt, { width, height, intensity: storm.intensity, fallDir, surface });
      ripples.advance(dt);
      school.advance(dt, { ripples: ripples.list, intensity: storm.intensity, width, height });

      renderer.draw({
        width, height,
        fish: school.fish,
        ripples: ripples.list,
        drops: rain.drops,
        fallDir,
        storm,
        reducedMotion: host.reducedMotion,
        ripplePhase: clock,
      });
    },

    resize(w, h) { width = w; height = h; },

    // x, y are CSS pixels inside the stage. `wallSeconds` is the hand's own
    // clock (see the header).
    pointer(x, y, wallSeconds) {
      ripples.spawn(surface.px(x), surface.py(y), rollRipple(rand, CLICK_RIPPLE));
      storm.click(wallSeconds);
    },

    wheel(deltaY, deltaMode) {
      wind.scroll(normalizeWheel(deltaY, deltaMode, height));
    },

    dispose() {
      ripples.clear();
      rain.clear();
      school.fish.length = 0;
    },

    // Test chrome, in the spirit of /plot's __plot and /print's __printLineArt:
    // there is no panel on this page by design, so this is the only way a gate
    // can ask what the simulation is doing. It reports, it never decides.
    state() {
      return {
        intensity: storm.intensity,
        phase: storm.phase,
        flashes: storm.flashes,
        flash: storm.flash,
        wind: wind.value,
        windDeg: wind.angleDeg,
        windRad: wind.angleRad,
        ripples: ripples.list.length,
        rippleFields: ripples.list.length ? Object.keys(ripples.list[0]) : [],
        // Bounded by the ripple cap and only built when something asks, so a
        // gate can check WHERE a ripple landed rather than only that one did.
        ripplePositions: ripples.list.map(r => [r.x, r.y, r.maxR, r.age]),
        spawned: ripples.spawned,
        drops: rain.drops.length,
        landed: rain.landed,
        fish: school.fish.length,
        visible: school.visibleCount(width, height),
        target: school.target,
        traits: school.fish.map(f => ({ ...f.traits })),
        // Where every koi is and what it is doing, so a gate can watch the
        // real page for a fish that appeared or vanished in view rather than
        // only running the simulation in Node.
        fishAt: school.fish.map(f => [f.id, f.x, f.y, f.state]),
        // Bounded at 64 by the school. Whether a spawn was inside the frame is
        // decided on the far side by surface.visible(), not reported here.
        spawns: school.spawnLog.map(s2 => [s2.id, s2.x, s2.y, s2.w, s2.h]),
        arrivals: school.arrivals,
        departures: school.departures,
        recalls: school.recalls,
        squash: surface.squash,
        width, height, clock,
      };
    },
  };
  return scene;
}
