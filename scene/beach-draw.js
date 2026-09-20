// scene/beach-draw.js — every mark scene 3 makes. Nothing here decides
// anything: it is handed the shore, the two boundaries and the fields, and it
// draws them. All the laws live beside it in beach-swash.js, beach-sets.js and
// beach-water.js, DOM-free, so the gate can run them without a browser.
//
// ONE INK AND ONE GROUND, AND THE INVERSION IS WHICH END IS OPEN. The section
// declares one ink and one ground (scene.css) and this scene keeps that count
// — but the ground is the SAND and the ink accumulates seaward, so the water is
// the darkest region and the dry sand is the LIGHTEST one. That is what the
// brief means by "the value structure inverts relative to scene 1", and
// "lightest" is an ordering rather than an emptiness: the dry sand carries the
// trampled texture all the way to the bottom edge (see DRY_MARK_ALPHA).
//
// TONE IS CARRIED BY WEIGHT AND DUTY ON A CONSTANT PITCH, NOT BY SPACING, and
// that is the whole difference between water and plaid. The first cut packed
// the rows tighter where the tone was darker; two things went wrong and both
// are visible from across the room. Varying pitch MOIRES against itself — the
// eye reads the spacing gradient as banding rather than as tone — and rows a
// few pixels apart drew their breaks from nearly the same seed, so every break
// landed at the same along-shore position and the water came out as a plaid of
// vertical columns. Constant pitch with a per-row PHASE fixes both: the lattice
// is even, the breaks are scattered, and tone is the ink's weight and how much
// of each row carries it.
export const ROW_PITCH_PX = 3.6;   // one lattice over the whole frame
// AT TONE 1 THE WEIGHT MUST CLOSE THE PITCH, or the darkest water is a mid
// grey however dark the ink is. 2.6 on a 3.6 pitch is 72% coverage before the
// duty takes its cut, which measured out at about 60% — a solid-looking sea is
// not reachable from there. Slightly OVER the pitch, so the darkest rows
// genuinely meet and the deep water is a mass rather than a stripe pattern.
export const WEIGHT_MAX = 4.6;
export const WEIGHT_MIN = 0.32;
export const WEIGHT_BUCKETS = 10;  // segments batched by weight: ten strokes, not one per row

// THE TONE LADDER IS MEASURED OFF THE REFERENCE CLIPS, normalised as
// (194 - L) / (194 - 47) from row-median luminances: deep water 47, water at
// the shore 118, glossy wet sand 125, wet sand 152-161, dry sand 186-194.
//
// THE FOAM READS BRIGHTER THAN THE DRY SAND BY LOCAL CONTRAST, NOT BY BEING
// LIGHTER IN ABSOLUTE TERMS. The reference's foam (197) really is brighter than
// its dry sand (186-194), and the first cut took that literally — it gave the
// dry sand a LATTICE tone so the foam had somewhere brighter to go, and inked
// forty percent of the frame to buy three luminance levels. A drawing does not
// work that way: the foam is a white gap inside the dark water, so it reads as
// the brightest thing in the frame without the sand being pushed down to make
// room for it.
//
// SO `dry` IS THE LATTICE'S TONE THERE AND IT IS ZERO — THE DRY SAND IS NOT
// BLANK. The water's lattice stops at the high-water mark and the trampled
// surface is drawn by drawDrySand() instead, in its own register and off this
// ladder entirely (see DRY_MARK_ALPHA below). Reading `dry: 0` as "the bottom
// third is paper" is exactly the mistake that shipped once.
// THE CONSTANTS ARE SET FROM DELIVERED COVERAGE, NOT BY EYE, because tone is
// not ink: the weight buckets, the duty law and the pitch compose, and what a
// tone of 0.5 actually puts on the paper cannot be read off the code. Forced
// through the shipped draw path at a constant tone (the `__flatTone` hook
// below) this lattice delivers
//
//   tone      1.00  0.90  0.80  0.70  0.60  0.50  0.40  0.30  0.20  0.10
//   coverage  1.00  1.00  0.99  0.90  0.76  0.62  0.48  0.36  0.25  0.15
//
// — and it is worth knowing that this table MOVED once, hard, when the row
// walk's wrap was fixed. Before that the lattice saturated at 0.78 and these
// constants were set against THAT, so they were silently compensating for a
// defect. Re-derive them from a fresh run of the hook if the lattice ever
// changes; do not carry these numbers across a change to the walk.
//
// Each entry is the reference's own measured ink coverage — taken against ITS
// dry sand, so the two media's contrast does not enter — inverted through the
// table above.
// AND `deep` MOVED, FROM 0.78 TO 0.60, BECAUSE THE OLD FIGURE WAS MEASURED ON
// WATER WITH A WAVE IN IT AND THEN USED AS THE WATER'S OWN TONE.
//
// The reference's deep water is L 62 with no wave approaching and L 41 with a
// swell fully in it — a 21-level swing over about two seconds, which is the
// SWELL, and the frames the shipped 47 came off are in the second half of
// that. So the constant was the darkest the sea gets rather than its resting
// value, and a scene that starts there has nothing left for a wave to spend.
//
// MEASURED, THROUGH THIS FILE'S OWN `__flatTone` HOOK, which is what makes
// this a finding rather than a preference — the delivered ink coverage of the
// shipped lattice:
//
//   tone      0.40  0.50  0.55  0.60  0.65  0.70  0.75  0.80  0.90  1.00
//   coverage  0.47  0.59  0.72  0.86  0.87  0.97  0.98  0.99  1.00  1.00
//
// The ladder SATURATES at about 0.70. From there to 1.00 — thirty percent of
// the control's travel — the ink moves 2.9 percentage points. So at the old
// 0.78 the deep water was already 98% inked, and a swell pulling it to 0.93
// would have changed the drawing by about one percentage point of coverage:
// INVISIBLE, and invisible for the same reason `stamenSpread`'s dead travel is,
// one repository over. The first mockup's swell cell was pixel-for-pixel its
// no-wave control and that is why.
//
// 0.70 IS THE VALUE, AND IT WAS SWEPT RATHER THAN PICKED, because the two
// things that matter pull opposite ways: the deep water has to read as a MASS
// (the reference's is a smooth dark field) and a swell has to have somewhere
// to go. Rendered at each resting tone, with the same swell over it:
//
//   TONE.deep            0.78   0.74   0.70   0.66   0.62   0.58
//   resting coverage     0.972  0.968  0.930  0.864  0.808  0.763
//   largest white gap     24px   21px   25px   44px   39px   46px
//   what a swell buys    +0.005 +0.004 +0.016 +0.029 +0.035 +0.018
//
// At the shipped 0.78 A SWELL BUYS HALF A PERCENT OF INK. 0.70 buys three
// times as much AT AN UNCHANGED GAP — 25 px against the shipped 24 — so it
// costs the deep water's solidity nothing, which is why it is the value here
// rather than the 0.62 that buys most. Below 0.66 the lattice's own gaps open
// to 39-46 px and the sea stops reading as a mass at all; that is a real
// trade and §7 of docs/beach-wave-object.md puts it to Eva rather than
// settling it here.
//
// THE OLD VALUE IS ROUGHLY WHERE A FULL SWELL NOW ARRIVES, which is the honest
// re-reading of the original calibration rather than a repudiation of it.
export const TONE = {
  foam: 0.00,      // L 191-197 -> coverage 0.04; bare paper, and BRIGHTER THAN THE WET SAND
  dry: 0.00,       // L 185-194 -> coverage 0.03; the LATTICE's tone — the texture is drawDrySand's
  wet: 0.235,      // L 152-161 -> coverage 0.23
  gloss: 0.355,    // L 125     -> coverage 0.43
  shallow: 0.45,   // L 118-121 -> coverage 0.47
  deep: 0.70,      // L 62 with no wave in it; a swell takes it to ~0.84 — see above
};

// THE PALETTE IS ONE DECLARATION AND THE POLARITY IS ONE CONSTANT. The brief
// says the dry sand is "the open white", which is only literally true on a
// light ground, and the reference is a high-key subject — so this ships dark
// ink on warm paper. `invert` draws the identical marks and inverts the frame
// at the end: a PHOTOGRAPHIC NEGATIVE of the same drawing rather than a second
// mark plan, so the choice can be made in front of both.
export const PALETTE = { ground: '#f1ede6', ink: '#16181c' };

// THE DRY SAND IS THE LIGHTEST TONED REGION, NOT AN EMPTY ONE, AND THE FIRST
// CUT HAD IT BLANK. "Dry sand is the open white" is a statement about the VALUE
// ORDERING — lightest — and it was read as "bare paper": the bottom third of
// the frame came out a uniform 237/255 at 0.000 ink coverage. The reference
// never gets lighter than a mean of ~179-182 and carries the trampled surface
// all the way to the bottom edge.
//
// AND THE BAND COMPARISON COULD NOT SEE IT, which is the more useful half. That
// instrument measures each band's interior against the reference's, and a
// uniformly empty band still comes out "lightest" — it satisfies the ordering
// while carrying no information at all. A mean alone cannot distinguish an
// empty region from a textured one of the same average, so the dry band is held
// to the reference's LOCAL CONTRAST as well as to its coverage.
//
// MEASURED ON THE REFERENCE, dry sand against the two regions either side:
//
//   region      mean   p05   p50   p95   local contrast
//   dry sand     181   121   191   206   14.5
//   wet sand     153    --    --    --    3.9
//   water        110    --    --    --   13.1
//
// So the dry sand is as textured as the WATER and four times as textured as the
// wet sand, and its distribution is left-tailed: a bright ground with sparse
// dark pocks about 70 levels under it, which is what a footprint is.
//
// THE REGISTER IS DECLARED HERE FOR THE SAND-MARKING SESSION, NOT LEFT FOR IT
// TO DISCOVER. That session draws user marks into exactly this region, and a
// drawn line has to read ON TOP of the base texture rather than compete with
// it. So the base texture is deliberately SHALLOWER than the reference's own —
// its marks sit at DRY_MARK_ALPHA of full ink, against the reference's ~0.32 —
// and everything a later session draws starts at MARK_ALPHA_FLOOR or darker.
// The gap between them is the headroom.
//
// IT IS ASSERTED IN THE GATE, NOT AT MODULE LOAD, AND THAT IS A CORRECTION TO
// HOW IT SHIPPED. The first cut threw here, on the grounds that a refusal is
// stronger than a red check — and it is, at exactly the wrong moment. A
// drifted constant is a mistake made while editing this file, which is a
// thing CI is for; a module that refuses to load takes the whole scene down
// for a VISITOR, who cannot act on it and did not make it. The two failure
// modes are not interchangeable because they are not read by the same person.
// `beach-tone/the-dry-sand-leaves-a-register-for-the-marks-session` in
// tools/verify-scene.mjs carries the claim, with the bar taken from other
// owners than this module's own MARK_HEADROOM, and the mutant that gives the
// headroom away names that check.
export const DRY_MARK_ALPHA = 0.26;     // the ink a base sand mark carries, 0..1 of full
export const MARK_ALPHA_FLOOR = 0.60;   // a later session's DRAWN marks start here
export const MARK_HEADROOM = 0.30;      // and this much has to separate the two registers

// THE MARKS CLUMP, AND A UNIFORM FIELD OF THEM IS THE WRONG PICTURE. Scattered
// at an even density they read as felt — a homogeneous texture swatch — where
// the reference is patchy: a footprint is a cluster of disturbance with smooth
// sand either side of it, so the dry band has trampled passages and clear ones.
// A low-frequency field over (u, s) modulates how many cells carry a mark,
// which also softens the texture's own start at the high-water mark: the edge
// of the trampled zone is ragged rather than a line where marks begin.
export const DRY_CELLS_U = 132;         // the grid the marks are scattered over
export const DRY_CELLS_S = 86;
export const DRY_MARK_CHANCE = 0.62;    // how many cells carry one, before the patching
export const DRY_PATCH = 0.72;          // how strongly the clumping modulates that
export const DRY_MARK_WEIGHT = 1.5;
export const DRY_FADE_S = 0.035;        // marks fade in above the high-water mark as the sand dries

import { WATERLINE_S } from './beach-shore.js';
import { waveField, sortWaves, brokenAt, bandWidthAt, foamAlphaAt, crestAt } from './beach-wave.js';

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;

// A cheap deterministic hash in [0,1). MARK PLACEMENT ONLY — every simulation
// quantity draws from the seeded stream in rng.js.
function hash2(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h ^= h >>> 9;
  return (h >>> 0) / 4294967296;
}

// THE FOAM BAND IS STRUCTURAL: THE WATER'S OWN TONE FALLS TO BARE PAPER AT THE
// EDGE. The first cut painted the foam over the finished water in the ground
// colour, and it disappeared — a 7 px band of ground-coloured strokes laid over
// a 3.6 px lattice half-erases it and reads as a smudge. It is also the wrong
// way round: in the reference the foam band is the widest single feature at the
// shore, about a TENTH of frame height, and it is bare paper with dark speckle
// in it rather than white paint over grey. So the ramp ends at zero and the
// foam is what is left when the ink stops; the speckle is added in INK on top.
//
// The break at the back of frame is the same construction at the other end — a
// second place the ink opens out — so the two bright bands cannot disagree
// about what foam looks like.
// THE WIDTH IS THE REFERENCE'S OWN BARE RUN, AND READING IT TOOK AN INSTRUMENT
// THAT THE SHEAR CANNOT REACH. A FULL-WIDTH ROW MEAN CANNOT MEASURE A SHEARED
// BAND AT ALL: at 3 degrees one screen row spans 0.079 of frame height in band
// coordinates — wider than this band — so every "foam" row is part water and
// part wet sand, and the figure it reports is a property of the TILT rather
// than of the foam. Measured, the full-width coverage falls monotonically as
// the band is widened (0.23 / 0.20 / 0.17 / 0.14 at 0.100 / 0.115 / 0.130 /
// 0.145) and NEVER reaches the reference's 0.04 at any width, because what it
// is reading is the smear. Widening the band to chase it is fitting a constant
// to an artefact, and an earlier cut of this file did exactly that.
//
// A COLUMN IS IMMUNE, because shear moves a band up or down per column and
// cannot smear anything within one. So the width is set by the per-column
// longest BARE run, which needs no slope to be known, estimated or agreed on:
//
//   c1_001  3.56%   c1_050  1.39%   c2_001  3.06%   c3_001  0.43%
//
// and every one of those clips reaches EXACTLY 0.000 minimum coverage in 97-100%
// of its columns (c3_001, whose foam is thin, in 51%). This drawing reads
// 0.000 minimum in 100% of columns at every width tried; what the width buys is
// the RUN, and 0.130 puts it at 3.57% against c1_001's 3.56% — the same frame
// every other band figure here is measured against.
// How far down the frame the foam streaks fade in. MEASURED: the reference's
// row median carries no streak at all above s 0.05 and is fully populated by
// about s 0.12.
export const STREAK_FADE_S = 0.12;
export const FOAM_BAND_S = 0.130;   // the band at the shore, in frame heights
export const FOAM_RAMP = 0.32;      // the seaward fraction of the foam band that is a ramp; the rest is paper
// (BREAK_BAND_S is RETIRED — the broken water at the back is a wave now, and
//  beach-wave.js's BAND_MAX is its width. Its measured range 0.055..0.135 is
//  where this constant's 0.055 ended up: the OLD value was the new range's
//  floor, i.e. the shipped break was as narrow as the smallest wave there is.)

// Deepest at the top of frame, lightening toward the shore. Squared, because
// 47 at the top against 118 at the shore is not a linear fall — the darkness
// concentrates at the back the way the reference's does.
// THE RUN-UP SHEET IS NOT DEEP WATER, AND ANCHORING THE RAMP ON THE MOVING
// EDGE MADE IT ONE. With the ramp normalised on `edge`, a swash running up the
// beach STRETCHED the whole ocean gradient over the sand it had just covered —
// so an overrun came out as four-fifths of the frame in near-solid ink, when
// what is actually there is a thin sheet you can see the sand through. The
// ramp is anchored at the WATERLINE instead, which does not move; above it the
// tone falls away toward the sheet's own value, so a run-up reads as water
// arriving over sand rather than as the sea rising.
export const SHEET_TONE = 0.42;     // a thin sheet over wet sand, between shallow water and gloss

export function waterTone(s, edge, foamW) {
  const u = clamp01(s / WATERLINE_S);
  // THE RAMP IS A SMOOTHSTEP, AND NO SINGLE POWER FITS. Converted to tone, the
  // reference's water reads 1.00 · 1.00 · 0.96 · 0.91 · 0.85 · 0.74 · 0.69 ·
  // 0.62 · 0.59 across its depth: it holds near-solid for the first quarter,
  // then falls steeply, then flattens again at the shore. Fitting a power to
  // that gives p = 0.64 at one end of the water and 1.66 at the other — it is
  // an S, not a power, and both of the first two cuts (u-squared, then a cube)
  // were wrong in opposite directions for that reason. The smoothstep is
  // within 0.05 of the measured tone at every sample but one.
  const ss = u * u * (3 - 2 * u);
  let t = TONE.shallow + (TONE.deep - TONE.shallow) * (1 - ss);
  // Past the waterline there is sand under the water, and the sheet thins the
  // further it has run.
  if (s > WATERLINE_S) {
    const over = clamp01((s - WATERLINE_S) / Math.max(1e-4, edge - WATERLINE_S));
    t = TONE.shallow + (SHEET_TONE - TONE.shallow) * (over * over * (3 - 2 * over));
  }
  // THE FOAM BAND IS A PLATEAU OF BARE PAPER, NOT A RAMP TO ONE. A smooth fall
  // across the whole band averages about half the water's tone over it, which
  // measured out at 0.44 ink coverage where the reference's foam is 0.04 — and
  // it put the foam DARKER THAN THE WET SAND, inverting the one ordering that
  // has to hold. The reference's own profile is a plateau: L 175 · 191 · 168
  // across the band, brighter in the middle than at either edge and brighter
  // than the dry sand. So the ink ramps out over the band's seaward part and
  // the rest is paper.
  const fw = Math.max(1e-4, foamW === undefined ? FOAM_BAND_S : foamW);
  const into = clamp01((s - (edge - fw)) / fw) / FOAM_RAMP;
  const ir = clamp01(into);
  t *= (1 - ir * ir * (3 - 2 * ir));
  // THE BREAK USED TO BE A CLAUSE HERE AND IT IS GONE. It was a fixed dip at a
  // fixed station whose depth and width scaled with set energy — which is a
  // TONE FIELD wearing a wave's name: it could not travel, could not peel,
  // could not carry a dark face, and there was only ever one of it. A wave is
  // an object now and beach-wave.js owns it; this function is the FIELD the
  // objects are drawn into, which is exactly the division the brief asks for.
  // `BREAK_BAND_S` went with it.
  return clamp01(t);
}

// THE WATER UNDULATES; IT DOES NOT FLICKER. The sea has to carry variation
// along the shore or it comes out in flat horizontal stripes — but a
// MULTIPLIER on the tone was the wrong way to get it. Tone is already capped
// at 1 in the deep water, so a symmetric multiplier can only ever lighten
// there: at ±0.46 it took the solid dark at the top of frame down to 0.54 in
// patches and the sea stopped reading as deep at all.
//
// What varies instead is the RAMP'S OWN POSITION. `swell` displaces the s the
// ramp is evaluated at, so the tone bands and the foam band WAVE along the
// shore the way a real surface does, and the deep water stays as deep as it
// was. A small multiplicative term is kept for grain, an order of magnitude
// under the one that failed.
export const SWELL_S = 0.022;      // how far the bands wave, in frame heights

// THE SWELL FADES OUT IN THE DEEP WATER, and it has to. Near the top of frame
// the tone ramp is at its steepest, so a displacement of a couple of percent
// of frame height swings the tone by a fifth — measured, the rendered row
// profile oscillated 0.26 / 0.70 / 0.45 down the deep water where the
// reference's is smooth at 0.74-0.90. It is also the right thing physically:
// a swell is legible where it is shoaling, not out in flat water.
// FADING IT OUT AGAIN AT THE SHORE WAS TRIED AND REVERTED. The foam band never
// read as bare paper on a full-width row mean, and the swell displacing the
// band's own position looked like the cause — it is at full amplitude exactly
// where the band is. Measured, it was not: a hump-shaped fade left the foam
// band where it was (0.11 either way) and lightened the deep water, which is
// the half of this drawing that is calibrated. The real cause was the
// MEASUREMENT — see FOAM_BAND_S below. Recorded so it is not re-proposed.
export function swell(u, s, drift, depth) {
  const d = clamp01(depth === undefined ? 1 : depth);
  const fade = d * d * (3 - 2 * d);
  return SWELL_S * fade * (
    0.62 * Math.sin(u * 6.3 - drift * 5.2) +
    0.26 * Math.sin(u * 14.7 + s * 9 + drift * 8.1 + 2.1) +
    0.12 * Math.sin(u * 31.0 - drift * 13.0 + 1.3));
}

export function grain(u, s, drift) {
  return 1 + 0.10 * Math.sin(u * 23.0 + s * 37 - drift * 11.0);
}

export function createRenderer(ctx, shore) {
  // TONE IS EVALUATED PER SEGMENT AT (u, s), NOT PER ROW. A row spans the whole
  // frame and both boundaries are SCALLOPED, so a row near one is water at some
  // along-shore positions and sand at others — evaluating at the row's midpoint
  // drew every boundary straight and made the scallops unreachable, and it also
  // made the water bandable only in horizontal stripes. Segments are bucketed by
  // weight individually, which costs nothing extra: the same segments are drawn,
  // sorted into ten paths instead of one per row.
  const buckets = [];
  for (let i = 0; i < WEIGHT_BUCKETS; i++) buckets.push([]);

  const r = {
    rows: 0,
    segments: 0,
    marks: 0,

    draw(st) {
      const { width: w, height: h } = st;
      const pal = st.palette || PALETTE;
      for (const b of buckets) b.length = 0;
      r.rows = 0; r.segments = 0;

      // THE SHELL ALREADY SET THE TRANSFORM, and a renderer that sets its own
      // OVERWRITES it. scene.js's sizeCanvas() puts a dpr scale on every canvas
      // it hands out so a scene draws in CSS pixels and never has to know what
      // a device pixel is — so setting `dpr` here unconditionally drew the whole
      // beach at half scale into one corner of the buffer on any 2x display.
      // `st.dpr` is passed ONLY by the mockup tool, which makes its own canvas
      // and therefore owns its own transform.
      ctx.save();
      if (st.dpr !== undefined) ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.fillStyle = pal.ground;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'butt';

      const thick = clamp01(st.frontFoam !== undefined ? st.frontFoam : 0.5);
      const foamW = FOAM_BAND_S * (0.45 + 0.75 * thick);
      // SORTED ONCE PER FRAME, NOT ONCE PER SAMPLE. The order IS the model —
      // seaward first, so a nearer band of foam covers the water behind it —
      // and re-deriving it inside `toneAt` would cost a sort per segment on a
      // lattice that emits thousands of them.
      const waves = sortWaves(st.waves || []);
      const gloss = Math.max(1e-4, st.glossDepth || 0.008);
      const drift = st.drift || 0;
      const pitch = ROW_PITCH_PX / h;
      const sTop = -shore.shearPx / h - 0.03;
      const sBot = 1 + shore.shearPx / h + 0.03;

      // The one place a point on the beach becomes a tone.
      // A CALIBRATION HOOK, and it is test chrome in the spirit of /plot's
      // setView: there is no control on this page, and "what coverage does
      // tone T actually deliver" cannot be answered by reading the code — the
      // weight buckets, the duty law and the pitch compose. Nothing in the
      // scene ever sets it.
      const flat = st.__flatTone;
      const toneAt = flat !== undefined ? () => flat : (u, s) => {
        const edge = st.swashAt(u);
        if (s < edge) {
          const sw = s + swell(u, s, drift, s / Math.max(1e-4, edge));
          const base = clamp01(waterTone(sw, edge, foamW) * grain(u, s, drift));
          // THE FIELD FIRST, THE OBJECTS INTO IT. The ramp, the along-shore
          // swell and the grain are the SURFACE; the waves are things on it.
          // Trying to make the ramp produce a wave is the tuning trap the
          // brief names, and it is unreachable from here: `waterTone` cannot
          // see a wave and `waveField` cannot see the ramp except as a number
          // handed to it.
          return waves.length ? waveField(waves, u, s, base) : base;
        }
        const wet = st.wetAt(u);
        if (s < wet) {
          const behind = (s - edge) / gloss;
          const g = behind < 1 ? lerp(TONE.gloss, TONE.wet, behind) : TONE.wet;
          // The wet sand's FAR edge is a gradient, not a line: sand dries from
          // the high-water mark down, so the tone fades over the last stretch.
          const toDry = (wet - s) / Math.max(1e-4, (wet - edge) * 0.42);
          return clamp01(lerp(TONE.dry, g, clamp01(toDry)));
        }
        return TONE.dry;
      };

      let idx = 0;
      for (let s = sTop; s < sBot; s += pitch, idx++) {
        const seed = (idx * 2654435761) % 100003;
        // Only the WATER's texture drifts; sand does not move.
        //
        // THE PHASE IS WRAPPED, AND IT HAS TO BE. `drift` accumulates without
        // bound — it is a distance travelled, not an angle — so after a minute
        // it is past 4, every segment lands outside [0,1] at all three of the
        // wrap repeats below, and the sea is simply NOT DRAWN. The static
        // mockup could not have caught it because a frozen state has drift 0;
        // it took the real thing running for the water to disappear.
        const phase = (drift * (0.4 + 0.6 * hash2(idx, 91))) % 1;
        // THE WALK STARTS BEFORE THE LEFT EDGE AND WRAPS PROPERLY. The first
        // cut folded the start position with `a - Math.floor(a)` and then
        // clipped, which THREW AWAY the wrapped-around piece: a row starting at
        // -0.10 emitted [0.90,1.0] and then [0.17,0.44] onward, leaving a
        // seventeen-percent hole at the left of every row. It capped the
        // lattice's deliverable coverage at about 0.78 and put a pale wedge in
        // the top corner, and only measuring ink coverage against the reference
        // found it. Each segment is now emitted at its own position AND one
        // period either side, each clipped to the frame, so a segment crossing
        // an edge appears on both.
        let u = -0.4 - hash2(seed, 1) * 0.3;
        let k = 0;
        while (u < 1 && k < 26) {
          const t0 = toneAt(clamp01(u + 0.05), s);
          const len = (0.10 + hash2(seed, k * 2 + 3) * 0.34) * (0.28 + 0.72 * t0);
          const gap = (0.010 + hash2(seed, k * 2 + 4) * 0.030) * Math.max(0, 2.20 - 2.24 * t0);
          const a0 = u + phase, b0 = a0 + len;
          u += len + gap; k++;
          for (let rep = -1; rep <= 1; rep++) {
            const a = Math.max(0, a0 + rep), b = Math.min(1, b0 + rep);
            if (b <= a) continue;
            const t = toneAt((a + b) / 2, s);
            if (t <= 0.006) continue;
            const bk = Math.min(WEIGHT_BUCKETS - 1, Math.floor(t * WEIGHT_BUCKETS));
            buckets[bk].push(a, b, s);
            r.segments++;
          }
        }
        r.rows++;
      }

      ctx.strokeStyle = pal.ink;
      for (let b = 0; b < WEIGHT_BUCKETS; b++) {
        const list = buckets[b];
        if (!list.length) continue;
        const t = (b + 0.5) / WEIGHT_BUCKETS;
        ctx.lineWidth = lerp(WEIGHT_MIN, WEIGHT_MAX, Math.pow(t, 1.25));
        ctx.beginPath();
        for (let i = 0; i < list.length; i += 3) {
          const a = list[i], bb = list[i + 1], ss = list[i + 2];
          ctx.moveTo(a * w, shore.yAt(a * w, ss));
          ctx.lineTo(bb * w, shore.yAt(bb * w, ss));
        }
        ctx.stroke();
      }

      // --- the trampled dry sand -------------------------------------------
      // Drawn BEFORE the foam pass, so nothing bright is laid over it, and in
      // its own register (see DRY_MARK_ALPHA above).
      r.drawDrySand(st, w, h);

      // --- the foam, which is the paper ------------------------------------
      ctx.strokeStyle = pal.ground;
      r.drawFoam(st, w, h);

      ctx.restore();

      if (st.invert) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
      }
    },

    // THE TRAMPLED SURFACE. Scattered short marks — footprint edges, divots,
    // drag marks — NOT the horizontal lattice the water is drawn with, because
    // a pock is not a wave and drawing it as one would put the two regions in
    // the same register. They are a pure function of their cell index, so they
    // are stable frame to frame without being stored: sand does not move.
    //
    // WHERE THE SAND IS WET THE MARKS ARE NOT DRAWN, and they fade in over
    // DRY_FADE_S above the high-water mark rather than switching on at it,
    // because a film of water fills the pocks. In the reference that makes the
    // wet/dry boundary a change of TEXTURE as well as of tone: local contrast
    // 3.9 on the wet sand against 14.5 on the dry.
    //
    // THIS DRAWING DOES NOT REPRODUCE THAT CONTRAST INVERSION AND THE CLAIM IS
    // NOT MADE. Measured here: 16.1 on the wet sand against 11.5 on the dry, so
    // the wet band is the MORE textured of the two — the row lattice is visible
    // at its pitch where the reference's wet sand is a smooth film. The tone
    // ordering is right and the boundary is legible by tone, but a smooth wet
    // band would need a finer lattice than the water can afford to share, and
    // that is a change to the half of the picture that is calibrated.
    drawDrySand(st, w, h) {
      const pal = st.palette || PALETTE;
      const ink = pal.ink;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = DRY_MARK_ALPHA;
      ctx.lineWidth = DRY_MARK_WEIGHT;
      ctx.lineCap = 'round';
      ctx.beginPath();
      let marks = 0;
      for (let ci = 0; ci < DRY_CELLS_U; ci++) {
        for (let cj = 0; cj < DRY_CELLS_S; cj++) {
          const u = (ci + hash2(ci, cj * 3 + 1)) / DRY_CELLS_U;
          const sBase = (cj + hash2(cj, ci * 5 + 2)) / DRY_CELLS_S;
          // Two octaves of clumping, so the field has passages and clear sand.
          const patch = 0.5 + 0.5 * (0.62 * Math.sin(u * 9.3 + sBase * 14.1)
                                   + 0.38 * Math.sin(u * 23.7 - sBase * 31.0 + 2.2));
          const chance = DRY_MARK_CHANCE * (1 - DRY_PATCH + 2 * DRY_PATCH * patch);
          if (hash2(ci * 131 + cj, 7) > chance) continue;
          // The dry band is whatever is below the high-water mark's own line at
          // this u, so the texture follows the scalloped boundary rather than a
          // straight one.
          const wet = st.wetAt(u);
          const above = sBase - wet;
          if (above <= 0) continue;
          const fade = above < DRY_FADE_S ? above / DRY_FADE_S : 1;
          if (hash2(ci * 17 + cj, 11) > fade) continue;
          // Marks grow toward the bottom of frame, which is what the reference
          // shows: the same footprints, nearer the camera.
          const grow = 0.55 + 0.85 * sBase;
          const q = hash2(ci + cj * 7, 13);
          const len = (0.0025 + q * q * 0.034) * grow;   // skewed small, with a few long drag marks
          const ang = hash2(ci * 3 + cj * 29, 17) * Math.PI * 2;
          const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len * 0.45;
          const x0 = (u - dx / 2) * w, x1 = (u + dx / 2) * w;
          const s0 = sBase - dy / 2, s1 = sBase + dy / 2;
          ctx.moveTo(x0, shore.yAt(x0, s0));
          ctx.lineTo(x1, shore.yAt(x1, s1));
          marks++;
          // A divot reads as a pair: the rim beside the shadow. One extra
          // stroke on some cells is what stops the field reading as hatching.
          if (hash2(ci * 41 + cj, 23) < 0.34) {
            const o = (0.0035 + hash2(ci, cj + 31) * 0.006) * grow;
            const px0 = x0 + o * w * 0.4, px1 = x1 + o * w * 0.4;
            ctx.moveTo(px0, shore.yAt(px0, s0 + o));
            ctx.lineTo(px1, shore.yAt(px1, s1 + o));
            marks++;
          }
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      r.marks = marks;
    },

    // THE BRIGHT BANDS ARE ALREADY THERE — the water's own tone fell to bare
    // paper at the shore and dipped at the break. What this pass adds is what
    // lives INSIDE them: the streaks lying on the water, and the dark speckle
    // that makes a band of paper read as foam rather than as a gap.
    drawFoam(st, w, h) {
      const pal = st.palette || PALETTE;
      const edgeAt = (u) => st.swashAt(u);
      const thick = clamp01(st.frontFoam !== undefined ? st.frontFoam : 0.5);
      const foamW = FOAM_BAND_S * (0.45 + 0.75 * thick);
      const waves = sortWaves(st.waves || []);

      // THE STREAKS, in PAPER, over the water. Persistent records drifting
      // shoreward — the broken foam lines the reference is full of, and the
      // main texture on the open water. They are handed in already advanced;
      // nothing is placed here.
      ctx.strokeStyle = pal.ground;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (const f of (st.streaks || [])) {
        if (f.s >= edgeAt(f.u) - foamW) continue;   // inside the foam band it has nothing to mark
        // AND THEY FADE OUT IN THE DEEP WATER, which is `swell()`'s own rule
        // arriving for a second quantity and for the same measured reason.
        // The reference's deep water is SMOOTH: the row median at s < 0.05
        // reads L 41-62 with no bright streak in it at all, because broken
        // foam is a thing that happens where water has broken. Drawn across
        // the whole sea they shred the one region this drawing renders as a
        // solid mass — and with waves in the water now, that mass is what a
        // swell has to darken and a crest has to stand against.
        if (f.s < STREAK_FADE_S && hash2((f.u * 977) | 0, (f.len * 5171) | 0)
            > clamp01(f.s / STREAK_FADE_S)) continue;
        const half = f.len / 2;
        const a = clamp01(f.u - half), b = clamp01(f.u + half);
        if (b <= a) continue;
        ctx.moveTo(a * w, shore.yAt(a * w, f.s));
        ctx.lineTo(b * w, shore.yAt(b * w, f.s));
      }
      ctx.stroke();

      // THE SPECKLE, in INK, inside the two bright bands. Short broken marks
      // scattered through the paper: densest at the band's shoreward edge where
      // the foam piles up, thinning seaward, so the band has a hard inner
      // boundary and a soft outer one — which is the way round a real foam edge
      // reads.
      //
      // IT IS A TRACE, NOT A TEXTURE, AND THE REFERENCE IS WHY. Measured, the
      // foam band there is bare paper — coverage 0.00 across its whole width —
      // so speckle heavy enough to read as foam in its own right is speckle
      // that has stopped matching the thing it is drawn from. What is left is
      // enough to stop the band being a geometric gap and no more.
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      const N = 190;
      for (let k = 0; k < N; k++) {
        const u0 = k / N, u1 = (k + 0.80) / N;
        const um = (u0 + u1) / 2;
        // the shore band
        const e = edgeAt(um);
        for (let b = 0; b < 9; b++) {
          const f = b / 9;
          if (hash2(k * 7 + b, (st.frontSeed | 0) + 3) > 0.975 + f * 0.023) {
            const s2 = e - foamW * f + (hash2(k, b + 31) - 0.5) * foamW * 0.22;
            ctx.moveTo(u0 * w, shore.yAt(u0 * w, s2));
            ctx.lineTo(u1 * w, shore.yAt(u1 * w, s2));
          }
        }
        // EVERY LIVE WAVE'S OWN BAND, not one fixed station at the back. The
        // speckle is read off the wave's own geometry at THIS column, so it
        // peels with the band rather than appearing across the whole width at
        // once — and a wave whose band has not opened at this column yet gets
        // no speckle there, which is the thing a fixed station cannot do.
        for (let wi = 0; wi < waves.length; wi++) {
          const wv = waves[wi];
          const b = brokenAt(wv, um);
          const bw = bandWidthAt(wv, b);
          if (bw <= 0) continue;
          const alpha = foamAlphaAt(wv, b);
          if (alpha <= 0.02) continue;
          const c = crestAt(wv, um);
          for (let q = 0; q < 8; q++) {
            const f = q / 8;
            if (hash2(k * 11 + q + wi * 613, 29) > 0.80 + f * 0.18 * (1.25 - alpha)) {
              const s2 = c + bw * f + (hash2(k, q + 71 + wi * 29) - 0.5) * bw * 0.20;
              ctx.moveTo(u0 * w, shore.yAt(u0 * w, s2));
              ctx.lineTo(u1 * w, shore.yAt(u1 * w, s2));
            }
          }
        }
      }
      ctx.stroke();

      // THE FRONT ITSELF. One ragged broken line at the swash edge, in ink:
      // the only place in the drawing where the two boundaries are stated
      // rather than implied, and the thing a viewer's eye actually follows.
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      const F = 220;
      for (let k = 0; k < F; k++) {
        const u0 = k / F, u1 = (k + 0.86) / F;
        if (hash2(k, (st.frontSeed | 0) + 17) < 0.22) continue;   // broken, never ruled
        const e0 = edgeAt(u0), e1 = edgeAt(u1);
        ctx.moveTo(u0 * w, shore.yAt(u0 * w, e0));
        ctx.lineTo(u1 * w, shore.yAt(u1 * w, e1));
      }
      ctx.stroke();
    },
  };
  return r;
}
