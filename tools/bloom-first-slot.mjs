/* ===================================================================
   bloom-first-slot.mjs — ONE OWNER OF THE SLOT PAYLOAD for Node-side
   instruments that build a single petal.

   `buildWhorlInto`'s own callback is the only producer of a slot record
   ({ index, azimuth, scale, tiltExtra, z, ... }); a tool that synthesised
   one would be a second producer of exactly the payload it is checking a
   consumer against. This helper drives the real whorl primitive on the real
   footRing() descriptors and hands back the FIRST slot it emits, with that
   slot's own ring — on the layer asked for (RADIAL / FAN: `slotRings[layer]`;
   CONTINUOUS: the sequence's first ring, the one whorl there is).

   Extracted from tools/verify-bloom-surface-offstation.mjs (session 37) so
   that tools/verify-bloom-rim-arc.mjs (session 38) reads the same twenty
   lines instead of carrying a copy that would drift.
   =================================================================== */
import * as G from '../bloom-geometry.js';

export function firstSlot(state, acc, layer = 0) {
  const fr = G.footRing(state, acc);
  let got = null;
  if (fr.continuousMode) {
    G.buildWhorlInto({
      count: fr.rings.length, radius: (i) => fr.rings[i].radius, height: 0,
      sizeRamp: (i) => fr.rings[i].scale, angleRamp: (i) => fr.rings[i].tiltExtra,
      phase: fr.rings[0].phase, placement: state.placement,
      blade: (slot) => { if (!got) got = { ring: fr.rings[slot.index], slot }; },
    });
  } else {
    if (!(layer >= 0 && layer < fr.slotRings.length)) throw new Error(`firstSlot: layer ${layer} is not one of this state's ${fr.slotRings.length}`);
    const ring = fr.slotRings[layer][0];
    G.buildWhorlInto({
      count: fr.slotCount, radius: ring.radius, height: 0,
      sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra,
      phase: ring.phase, placement: state.placement, fan: fr.fan,
      blade: (slot) => { if (!got) got = { ring: fr.slotRings[layer][slot.index], slot }; },
    });
  }
  if (!got) throw new Error('firstSlot: the whorl primitive emitted no slot');
  return got;
}
