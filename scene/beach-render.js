// scene/beach-render.js — the ADAPTER. A simulation record on one side, a
// drawing on the other, and nothing else.
//
// beach-brush.js is the drawing layer and it is pure: it owns no timing, no
// simulation and no input, it knows nothing about a wave record, and every
// number it draws from arrives in one plain object. beach-swash.js and
// beach-wave.js own the laws and know nothing about a canvas. This file is the
// only thing that has read both, and all it does is turn one into the other.
//
// THE ONE THING IT MUST NOT DO IS DECIDE ANYTHING. Every quantity below is
// either published by the simulation or read off a record that was committed
// at birth; there is no clock here, no state, and no constant that is not
// somebody else's, imported. If a number has to be chosen, it is chosen in the
// file that owns the law, not here.
//
// ---------------------------------------------------------------------------
// THE INVARIANT THIS FILE EXISTS FOR
//
// The drawn foam edge and the PUBLISHED swash edge are the same curve, because
// there is only one curve: `frontAt` below is `swash.edgeAtU` and the drawing
// consumes it. The scallops are generated in beach-swash.js from each wave's
// own seed at birth — not here, and not in the drawing — so a bird standing at
// `swashYAt(x)` stands on the line that was drawn, and a mark erased where the
// water reached is erased where the water is drawn to have reached.
//
// The second half of that is the SHEAR. beach-shore.js declares the
// shoreline's tilt as an ANGLE and every published query goes through it;
// beach-brush.js declares its own as a fraction of height dropped across the
// width, which is a different quantity and drew a different slope (5.0 degrees
// on a 4:3 frame, 3.8 on 16:9, against the shore's 3.0). Passing the shore's
// own slope through makes the drawing aspect-independent, which its header
// already claims to be, and makes the two lines one.
// ---------------------------------------------------------------------------

import { draw as drawFrame } from './beach-brush.js';
import { crestAt, drawPhaseAt, waveStage, SWASH, BIG_HEIGHT } from './beach-wave.js';
import { WATERLINE_S } from './beach-shore.js';

export function createRenderer(ctx, shore) {
  const r = {
    // Telemetry, in the shape the scene's `state()` already publishes. `waves`
    // is the count actually handed to the drawing, which is what a gate needs
    // in order to say one wave was drawn per record.
    waves: 0,
    marks: 0,

    draw(st) {
      const { width: w, height: h } = st;
      ctx.save();
      // THE SHELL ALREADY SET THE TRANSFORM and a renderer that sets its own
      // OVERWRITES it — scene.js's sizeCanvas() puts a dpr scale on every
      // canvas it hands out. `st.dpr` is passed ONLY by a tool that makes its
      // own canvas and therefore owns its own transform.
      if (st.dpr !== undefined) ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);

      // ONE SPEC PER LIVE RECORD, in the order the caller handed them, which
      // is seaward first. Everything here is READ: the crest is the record's
      // own (carrying its own along-shore wobble), the break phase is
      // beach-wave.js's map off the same `brokenAt` the stage labels use, and
      // the height, the seed and the stored lobes were all frozen at birth.
      // AND A SPENT WAVE IS NOT DRAWN. `waveStage` says SWASH once the crest
      // has crossed the waterline everywhere, which is where the drawing's own
      // phase reaches its spent end and where the swash front takes over the
      // same stretch of beach — so the wave is dropped at the one moment it has
      // nothing left to show. The label has one owner and it is not this file.
      // THE WATERLINE IS READ FROM THE SHORE rather than taken as an argument.
      // `stageAt` skips its SWASH branch when it is handed nothing, so a
      // caller that forgot to pass one would silently never drop a wave —
      // a hazard with no symptom, which is the kind this file should not have.
      const list = (st.waves || []).filter(wv => waveStage(wv, WATERLINE_S) !== SWASH);
      const specs = new Array(list.length);
      for (let i = 0; i < list.length; i++) {
        const wv = list[i];
        specs[i] = {
          seed: wv.seed,
          height: wv.height,
          big: wv.height >= BIG_HEIGHT,
          sAt: (u) => crestAt(wv, u),
          bAt: (u) => drawPhaseAt(wv, u),
          scalA: wv.drawA,
          scalB: wv.drawB,
          bubbles: wv.drawBubbles,
        };
      }
      r.waves = specs.length;

      drawFrame(ctx, w, h, {
        // A slowly increasing number, and it is the water's own drift so the
        // surface wander and everything else that moves are on one clock.
        phase: st.drift || 0,
        seed: st.frontSeed !== undefined ? st.frontSeed : 6,
        // The shore's angle, expressed the way the drawing wants it.
        shear: shore.slope * w / h,
        waves: specs,
        frontAt: st.swashAt,
        wetAt: st.wetAt,
      });
      ctx.restore();
    },
  };
  return r;
}
