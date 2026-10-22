/* tools/lantern-fixtures.mjs — the states the lantern gates run on: the
   defaults, every shape preset, hand-written corners, and the KNOWN-BAD
   states that must clamp. One owner for the Node gate, the page gate and the
   contact sheet. */
import * as G from '../lantern-geometry.js';

export const CORNERS = [
  { name: 'defaults', state: { ...G.DEFAULTS } },
  { name: 'three points, sharp', state: { ...G.DEFAULTS, points: 3, slender: 0.3, depthFrac: 0.45, tip: 'sharp' } },
  { name: 'sixteen points, puffy', state: { ...G.DEFAULTS, points: 16, slender: 0.88, depthFrac: 0.3 } },
  { name: 'alternating 6', state: { ...G.DEFAULTS, points: 6, alternate: true, altRatio: 0.75, slender: 0.5, depthFrac: 0.4 } },
  { name: 'scalloped 4', state: { ...G.DEFAULTS, edgeMode: 'scalloped', edge: G.edgeCurveFor('scalloped', { scallops: 4, scallopDepth: 0.015 }), scallops: 4, scallopDepth: 0.015 } },
  { name: 'concave 4, hang hole', state: { ...G.DEFAULTS, points: 4, slender: 0.5, depthFrac: 0.45, edgeMode: 'concave', edge: G.edgeCurveFor('concave', { amount: 0.04 }), hangHole: true } },
  { name: 'small and wide opening', state: { ...G.DEFAULTS, width: 200, opening: 80, ringWidth: 10 } },
  { name: 'largest', state: { ...G.DEFAULTS, width: 900, depthFrac: 0.42 } },
];
/* states whose target depth no planar rim reaches: the solver must clamp and tell */
export const MUST_CLAMP = [
  { name: 'slender and shallow pentagram', state: { ...G.DEFAULTS, slender: 0.38, depthFrac: 0.2 } },
  { name: 'eight slender points', state: { ...G.DEFAULTS, points: 8, slender: 0.6, depthFrac: 0.3 } },
];
/* a state no depth closes at all: the solver must say so, not draw a fake */
export const MUST_REFUSE = [
  { name: 'eight very slender points', state: { ...G.DEFAULTS, points: 8, slender: 0.45, depthFrac: 0.3 } },
];
export const PRESETS = G.SHAPE_PRESETS.map((p) => ({ name: `preset ${p.id}`, state: G.presetState(p) }));
