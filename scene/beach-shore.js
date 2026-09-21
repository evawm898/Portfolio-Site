// scene/beach-shore.js — the beach's geometry: where the bands are, which way
// the shoreline runs, and the one mapping between an along-shore sample and a
// screen pixel. Pure arithmetic, no DOM, so the gate drives it in Node.
//
// THIS SCENE WORKS IN SCREEN COORDINATES AND DELIBERATELY DOES NOT USE
// surface.js, which advertises itself as shell-level. That module exists so a
// scene with WATER AS A PLANE — a pond seen obliquely, where a ripple must be
// a circle and a fish must swim at one speed in every direction — cannot
// accidentally simulate in screen space. Nothing here has that hazard: the
// swash moves along ONE axis, nothing steers, and every quantity the brief
// states is a fraction of FRAME HEIGHT ("water ~40%, wet ~20%, dry ~40%").
// The published interface is screen x -> screen y as well. Importing the
// oblique plane and then not simulating on it would be a second viewpoint that
// nothing reads, which is worse than not importing it.
//
// THE TWO COORDINATES:
//   s  — UP-BEACH distance, in units of frame height, measured perpendicular
//        to the shoreline. s = 0 is the top of frame (deep water) and s = 1 is
//        the bottom (dry sand, nearest the viewer). A swash RUNNING UP THE
//        BEACH is s increasing, which is DOWN the screen. Every simulation
//        quantity — the waterline, a runup, the saturated level — is an s.
//   u  — ALONG-SHORE position, 0 at the left edge and 1 at the right. Every
//        field is sampled on a fixed grid in u.
//
// THE OBLIQUE SHORELINE IS A SHEAR, AND THAT IS EXACT RATHER THAN AN
// APPROXIMATION. The bands are straight and parallel to one another, so every
// boundary is a line y = m*x + c and the whole band structure is a horizontal
// one sheared by m. (A ROTATION would be the wrong model and also harder: it
// would foreshorten the bands by cos(tilt) and make "given an x, the y" an
// inversion instead of a lookup.) What the shear costs is that a band's stated
// fraction is exact AT FRAME CENTRE and runs high on one side and low on the
// other — which is what "oblique to the frame" means and is the point.
//
// MEASURED FROM THE REFERENCE, and the sign is the part worth keeping: the
// waterline is LOWER ON THE LEFT and HIGHER ON THE RIGHT in all three clips.
// Three instruments agree on that sign and disagree on the magnitude — a
// temporal-variance fit on the one clip with a steady camera reads 5.1 deg, a
// per-column luminance edge reads 5-10 deg, a foam-band tracker reads 2-3 deg
// — so the sign is measured and the number is CHOSEN from the middle of that
// spread and exposed.
export const SHORE_TILT_DEG = 3.0;

// The bands, as fractions of frame height at FRAME CENTRE. From the brief
// ("water ~40% of frame height, wet band ~20%, dry sand ~40%"), which it calls
// a starting point rather than a constraint.
//
// THE WET BAND IS NOT A THIRD INDEPENDENT NUMBER — IT IS THE SWASH'S OWN
// TRAVEL. The waterline is where a fully drained swash sits, and the standing
// high-water mark is where a normal wave reaches; the sand between them is wet
// exactly because it is the ground the swash covers and uncovers. So the brief's
// three bands are two numbers here, and the 20% falls out of the runup rather
// than being declared beside it and able to disagree with it.
export const WATERLINE_S = 0.40;      // a fully drained swash edge
export const RUNUP_NOMINAL = 0.20;    // a normal wave's reach PAST the waterline

// A wave can reach the bottom of frame at full set energy: "At high set energy
// a wave can OVERRUN the whole beach — past the normal high-water mark, to the
// bottom of frame." That is the ceiling, so the deepest reachable s is 1.
export const RUNUP_MAX = 1 - WATERLINE_S;

// How many along-shore samples every field carries. Fixed rather than derived
// from the viewport, so a resize re-frames the same beach instead of discarding
// the simulation — and the fields are indexed in NORMALISED u, so the scallops
// keep their proportion at any width. 160 samples is ~9 px apart on a 1440 px
// frame, which is several times finer than the ~150 px scallops it has to draw.
export const SAMPLES = 160;

export function createShore(opts = {}) {
  const tiltDeg = opts.tiltDeg !== undefined ? opts.tiltDeg : SHORE_TILT_DEG;
  // Screen y FALLS as x rises, so the slope is negative for a positive tilt.
  const slope = -Math.tan(tiltDeg * Math.PI / 180);
  let width = 1, height = 1;

  const sh = {
    tiltDeg,
    slope,
    samples: SAMPLES,
    get width() { return width; },
    get height() { return height; },

    resize(w, h) { width = Math.max(1, w); height = Math.max(1, h); },

    // --- the along-shore grid -------------------------------------------
    // Sample i sits at u = i/(SAMPLES-1). Sampling in SCREEN X rather than
    // along the shoreline itself is a 1 - cos(5.5 deg) = 0.46% difference in
    // arc length, and it is what makes the published lookup an interpolation
    // rather than a solve.
    uOf: (i) => i / (SAMPLES - 1),
    xOf: (i) => (i / (SAMPLES - 1)) * width,
    uAtX: (x) => Math.max(0, Math.min(1, x / width)),

    // --- s <-> screen ----------------------------------------------------
    // The one owner. At frame centre this is exactly s * height, which is what
    // makes the band fractions mean what the brief says they mean.
    yAt(x, s) { return s * height + (x - width / 2) * slope; },
    sAt(x, y) { return (y - (x - width / 2) * slope) / height; },
    // The same question asked by along-shore sample rather than by pixel.
    yAtU(u, s) { return sh.yAt(u * width, s); },

    // Read a per-sample field at an arbitrary u, linearly. Fields are small
    // and smooth, so nothing better than linear is earned here.
    sampleField(field, u) {
      const t = Math.max(0, Math.min(1, u)) * (SAMPLES - 1);
      const i = Math.floor(t);
      if (i >= SAMPLES - 1) return field[SAMPLES - 1];
      const f = t - i;
      return field[i] * (1 - f) + field[i + 1] * f;
    },

    // How much of the frame the shear costs at the edges, in px. Reported so a
    // caller that has to draw PAST the frame (the water bleeds off three
    // edges) knows how far past.
    get shearPx() { return Math.abs(slope) * width / 2; },
  };
  return sh;
}
