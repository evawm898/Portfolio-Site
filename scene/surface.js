// scene/surface.js — the water-surface viewpoint, shared by any scene that has
// water in it. Shell-level rather than scene 1's, because the brief states it
// as a property of the section: one fixed steep-oblique angle, one squash.
//
// THERE IS NO PERSPECTIVE HERE AND THAT IS THE POINT. A true camera would give
// every point on an infinite plane its own foreshortening, a horizon, and a
// vanishing point — and then a ripple near the top of the screen would be a
// different shape from the same ripple near the bottom, a fish would change
// size as it swam away, and "infinite, bleeds off all four edges" would stop
// being true at the horizon. What ships instead is an OBLIQUE ORTHOGRAPHIC
// view: one squash factor applied to the plane's y axis, everywhere, forever.
// A circle drawn on the water is an ellipse of the same proportion wherever it
// sits, and the plane genuinely has no edge.
//
// THE TWO SPACES:
//   PLANE  — the water's own coordinates. Isotropic: a ripple expands as a
//            circle, a fish swims at one speed whatever its heading, and a
//            distance means the same thing in every direction. All simulation
//            happens here.
//   SCREEN — CSS pixels. sx = px, sy = py * squash.
// So the plane is the screen stretched vertically by 1/squash, which is why
// toPlane is a division and toScreen a multiplication, and why the visible
// water is taller in plane units than the viewport is in pixels.
//
// EVERY SIMULATION QUANTITY IS IN PLANE UNITS AND EVERY DRAW GOES THROUGH
// toScreen. Mixing them is the one mistake available here: a steering force
// computed on screen coordinates makes a fish swim measurably faster sideways
// than up, which reads as "the fish are odd" long before anyone finds it.

// The brief's range is 55–65% (height:width for what would be a circle from
// directly overhead). 0.60 is the middle of it; a steeper number reads as a
// near-overhead map and a shallower one starts to want a horizon.
export const SURFACE_SQUASH = 0.60;
export const SQUASH_RANGE = [0.55, 0.65];

export function createSurface(squash = SURFACE_SQUASH) {
  if (!(squash >= SQUASH_RANGE[0] && squash <= SQUASH_RANGE[1])) {
    throw new Error(`surface squash ${squash} is outside the ruled ${SQUASH_RANGE[0]}–${SQUASH_RANGE[1]}`);
  }
  const s = {
    squash,

    // HOW HIGH IS UP, IN SCREEN PIXELS. The view is an oblique orthographic
    // whose elevation above the water satisfies sin(elevation) = squash (that
    // IS what squashing the plane's y axis by `squash` means), so one plane
    // unit of HEIGHT above the water draws cos(elevation) screen pixels
    // UPWARD. Derived from the squash rather than typed, so a scene that
    // floats something on the water — a lily pad riding a wave, a flower
    // standing above one — cannot imply a second camera: at height 0 the term
    // is exactly 0 and the projection is the one everything else uses.
    lift: Math.sqrt(1 - squash * squash),

    // plane -> screen
    sx: (px) => px,
    sy: (py) => py * squash,
    // screen -> plane
    px: (sx) => sx,
    py: (sy) => sy / squash,

    // The plane-space region the viewport shows, plus a margin in PLANE units.
    // Scenes use this to decide what is on screen; it is the only place the
    // viewport and the plane meet, so nothing else needs to know the squash.
    visible(width, height, margin = 0) {
      return {
        x0: -margin, y0: -margin,
        x1: width + margin, y1: height / squash + margin,
        w: width + 2 * margin, h: height / squash + 2 * margin,
      };
    },

    // A plane point at height z, projected. Height 0 is exactly py * squash —
    // the same expression `sy` gives — so nothing that floats above the water
    // is drawn by a different camera from the water it floats on.
    syAt(py, z) { return py * squash - z * s.lift; },

    // Is a plane point on screen (optionally with a plane-space margin)?
    onScreen(x, y, width, height, margin = 0) {
      return x >= -margin && x <= width + margin
          && y >= -margin && y <= height / squash + margin;
    },

    // Add a plane-space circle to the current path as the ellipse the viewpoint
    // makes of it. One owner, so a ripple, a fish's turning circle and any
    // future scene's debug overlay cannot disagree about what a circle looks
    // like here.
    //
    // THE moveTo IS LOAD-BEARING AND ITS ABSENCE IS INVISIBLE UNTIL IT IS NOT.
    // ctx.ellipse() does NOT begin a subpath: it CONNECTS from wherever the
    // path currently is. Batching a few hundred ripples into one path — which
    // is what makes a downpour affordable — therefore drew a straight chord
    // between every ripple and the next, and a heavy shower came out as a
    // spiderweb of long diagonals across the whole viewport. Starting the
    // subpath at the ellipse's own 0-angle point (cx + rx, cy) is the fix, and
    // it lives here so no caller can reintroduce it.
    ellipse(ctx, x, y, r) {
      const cy = y * squash;
      ctx.moveTo(x + r, cy);
      ctx.ellipse(x, cy, r, r * squash, 0, 0, Math.PI * 2);
    },
  };
  return s;
}
