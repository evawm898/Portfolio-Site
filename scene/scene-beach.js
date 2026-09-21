// scene/scene-beach.js — SCENE 3: a beach at the swash line.
//
// This file is WIRING. Every rule lives in a module beside it — the geometry in
// beach-shore.js, the two boundaries in beach-swash.js, the set energy in
// beach-sets.js, the drifting surface in beach-water.js, every mark in
// beach-brush.js — and all of those are DOM-free so the gate runs them without a
// browser. What is here is the order things happen in, the one place the
// outside world gets in, and the interface later sessions read.
//
// THE ONE INPUT: a scroll raises SET ENERGY. There is no click and no drag in
// this scene, by the brief, and nothing is scaffolded for one.
//
// THE INTERFACE FOR LATER SESSIONS IS EXACTLY THREE THINGS, and the brief says
// "and nothing else":
//
//   swashYAt(x)      given an x across the canvas, the current swash-edge y
//   highWaterYAt(x)  given an x, the current high-water y
//   overruns         an event feed, appended when a swash passes the normal
//                    high-water mark, each entry carrying the reached extent
//
// Birds need the first two. Mark-erasure needs all three. They are published on
// the scene object itself, so a later scene module reaches them the way the
// shell reaches `frame` — and they are NOT the same thing as `state()`, which
// is test chrome for tools/verify-scene.mjs and reports far more.
//
// BOTH QUERIES ARE IN SCREEN PIXELS, IN AND OUT. The boundaries live in beach
// coordinates (see beach-shore.js) and the shore owns the mapping, so this is
// the one place the two meet and no consumer needs to know what an `s` is.

import { makeRandom } from './rng.js';
import { createShore } from './beach-shore.js';
import { createSwash } from './beach-swash.js';
import { createSets, normalizeWheel } from './beach-sets.js';
import { createWater } from './beach-water.js';
import { createRenderer } from './beach-render.js';
import { stageAt, waveStage, crestAt, brokenAt, bandWidthAt, faceAmountOf, drawPhaseAt, sortWaves } from './beach-wave.js';
import { WATERLINE_S } from './beach-shore.js';

// A seed salt, for koi-pads.js's reason: every draw on a stream shifts every
// number taken after it, so the streak field and the waves are forked from the
// same seed rather than sharing one stream. Adding a streak would otherwise
// hand the beach a different set of waves.
export const WATER_SEED_SALT = 0x5eabeac4;

export const meta = {
  title: 'Beach swash line',
};

export default function createBeachScene(host) {
  const { ctx } = host.canvas2d();
  const shore = createShore();
  const rand = makeRandom(host.seed);
  const waterRand = makeRandom((host.seed ^ WATER_SEED_SALT) >>> 0);

  const swash = createSwash({ rand });
  const sets = createSets({ rand });
  const water = createWater({ rand: waterRand });
  const renderer = createRenderer(ctx, shore);

  let width = host.width, height = host.height;
  shore.resize(width, height);

  // THE BEACH OPENS WITH A SEA ALREADY RUNNING. Starting from a flat waterline
  // and a saturated level at its initial guess would show the first minute of
  // the beach settling, which is a thing a visitor should never see; the fields
  // are brought to a steady state in SIMULATED time before the first frame is
  // drawn. koi-fish.js's `seed()` does the same thing for the same reason.
  for (let i = 0; i < 3200; i++) {
    sets.advance(1 / 40);
    swash.advance(1 / 40, { energy: sets.energy, intervalScale: sets.intervalScale });
    water.advance(1 / 40, { energy: sets.energy });
  }
  swash.overruns.length = 0;

  const scene = {
    frame(dt) {
      sets.advance(dt);
      swash.advance(dt, { energy: sets.energy, intervalScale: sets.intervalScale });
      water.advance(dt, { energy: sets.energy });

      renderer.draw({
        width, height,
        // THE PUBLISHED EDGE, and the renderer draws THIS. It is the same
        // function `swashYAt(x)` answers with, scallops included, so the line
        // a bird stands on is the line on the screen.
        swashAt: (u) => swash.edgeAtU(u),
        wetAt: (u) => swash.wetAtU(u),
        // EVERY LIVE WAVE, not a break energy. The renderer is handed the
        // objects and draws them, and what the energy decided about each one
        // was frozen into its record at birth.
        waves: sortWaves(swash.waves),
        waterline: WATERLINE_S,
        frontSeed: 7,
        drift: water.drift,
      });
    },

    resize(w, h) { width = w; height = h; shore.resize(w, h); },

    wheel(deltaY, deltaMode) {
      sets.scroll(normalizeWheel(deltaY, deltaMode, height));
    },

    dispose() { swash.clear(); sets.clear(); water.clear(); },

    // --- THE PUBLISHED INTERFACE, and nothing else ------------------------
    swashYAt(x) { return shore.yAt(x, swash.edgeAtU(shore.uAtX(x))); },
    highWaterYAt(x) { return shore.yAt(x, swash.wetAtU(shore.uAtX(x))); },
    overruns: swash.overruns,

    // TEST CHROME, and it is chrome in the same sense as /print's setView and
    // /plot's rebuildAs: there is no control on this page that can reach it,
    // and nothing in the scene calls it. It advances the simulation in
    // SIMULATED time without drawing, so a gate or a sheet can put the beach in
    // an exact state — a wave at its peak, a set at full height, an overrun
    // eight seconds old — instead of waiting for one. Headless runs at about
    // two frames a second with dt clamped at 1/20, so scene time otherwise
    // advances at a tenth of real time and "wait for a swash to drain" is a
    // half-minute of wall clock per cell.
    __pump(seconds, step = 1 / 60) {
      const n = Math.max(0, Math.round(seconds / step));
      for (let i = 0; i < n; i++) {
        sets.advance(step);
        swash.advance(step, { energy: sets.energy, intervalScale: sets.intervalScale });
        water.advance(step, { energy: sets.energy });
      }
      return swash.clock;
    },

    // Test chrome, in the spirit of scene 1's: there is no panel on this page
    // by design, so this is the only way the gate can ask what the simulation
    // is doing. It reports; it never decides.
    state() {
      const us = [0, 0.25, 0.5, 0.75, 1];
      return {
        clock: swash.clock,
        width, height,
        tiltDeg: shore.tiltDeg,
        slope: shore.slope,
        waves: swash.waves.length,
        spawned: swash.spawned,
        waveFields: swash.waves.length ? Object.keys(swash.waves[0]) : [],
        // The six stages, per live wave, at five along-shore positions — so a
        // gate can watch a peel run across the frame rather than only that a
        // wave exists. Test chrome; nothing in the scene reads it.
        waveStages: swash.waves.map(w => ({
          age: w.age, preS: w.preS, crest: crestAt(w, 0.5),
          stage: waveStage(w, WATERLINE_S),
          at: [0, 0.25, 0.5, 0.75, 1].map(u => stageAt(w, u, WATERLINE_S)),
          band: bandWidthAt(w, brokenAt(w, 0.5)), face: faceAmountOf(w),
          // What the DRAWING is handed for this wave, so a gate can hold the
          // picture to the record without re-deriving either.
          height: w.height, seed: w.seed,
          phase: [0, 0.25, 0.5, 0.75, 1].map(u => drawPhaseAt(w, u)),
          lobes: w.drawA.cen.length + w.drawB.cen.length,
          lobeSum: w.drawA.cen.reduce((a, b) => a + b, 0) + w.drawA.rad.reduce((a, b) => a + b, 0)
            + w.drawB.cen.reduce((a, b) => a + b, 0) + w.drawB.rad.reduce((a, b) => a + b, 0),
        })),
        // Every wave's committed record, so a gate can watch a real wave run
        // rather than only that one exists.
        waveAt: swash.waves.map(w => [w.age, w.runup, w.advanceS, w.holdS, w.retreatS, w.peaked ? 1 : 0]),
        edge: us.map(u => swash.edgeAtU(u)),
        wet: us.map(u => swash.wetAtU(u)),
        sat: us.map(u => swash.satAtU(u)),
        edgeMin: Math.min(...swash.edge), edgeMax: Math.max(...swash.edge),
        wetMin: Math.min(...swash.wet), wetMax: Math.max(...swash.wet),
        satMin: Math.min(...swash.sat), satMax: Math.max(...swash.sat),
        glossDepth: swash.glossDepth,
        sheet: swash.sheet,
        energy: sets.energy,
        scrolled: sets.scrolled,
        natural: sets.natural,
        sets: sets.sets,
        overruns: swash.overruns.length,
        overrunAt: swash.overruns.map(o => [o.t, o.extent, o.over, o.at]),
        streaks: water.streaks.length,
        streakFields: water.streaks.length ? Object.keys(water.streaks[0]) : [],
        drift: water.drift,
        drawnWaves: renderer.waves,
        shear: shore.slope * width / height,
        // The published interface, sampled, so the gate can check the screen
        // mapping without reimplementing it.
        swashY: us.map(u => scene.swashYAt(u * width)),
        highWaterY: us.map(u => scene.highWaterYAt(u * width)),
      };
    },
  };
  return scene;
}
