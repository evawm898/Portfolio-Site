// scene/beach-wave.js — A WAVE IS AN OBJECT, AND ITS SIX STAGES ARE NAMED
// REGIONS OF ONE CONTINUOUS LAW RATHER THAN SIX CODE PATHS.
//
// The merged scene drew the water as a tone field with a swash edge: the break
// at the back of frame was ONE CLAUSE inside `waterTone` — a fixed dip whose
// depth and width scaled with set energy — while the swash got a full life
// cycle. So the sea had no waves in it, and no gate could say so, because
// nothing here had ever measured a wave. This file is the object that was
// missing. `beach-swash.js` keeps the two-line model unchanged and is STAGE
// SIX of what is described here.
//
// AND IT IS THE MODEL, NOT THE PICTURE. It shipped with a second half that
// turned a wave into TONE for a halftone lattice — `waveToneAt`, `waveField`,
// `swellDepthAt`, `faceCentreOf` and the five constants they pulled toward —
// and the drawing layer that consumed them has been replaced wholesale by
// beach-brush.js, which draws with fills and brush strokes and has no notion
// of a tone at all. That half is RETIRED rather than left standing: the
// measurements it was set from are in docs/beach-wave-object.md and in this
// file's own reference block below, which is the record of what the footage
// says; what is gone is the machinery for painting it as ink density. What
// stays is what a wave IS — where it is, when each column of it breaks, how
// wide its band runs, how long its face lasts and which of five stages it is
// in — and `drawPhaseAt` is the one place that becomes a number the drawing
// reads.
//
// IT HOLDS NO STATE. Every export is a function over a record and a position,
// the way `swashEnv` is a function over a record and a clock — so the gate
// drives every law in Node with no browser and no canvas, and a stage cannot
// disagree with the geometry that gets drawn because it is READ OFF it.
//
// ---------------------------------------------------------------------------
// THE FIVE STAGES, MEASURED. Sequence A of the reference (IMG_3911 ∪ IMG_3912 —
// which are ONE RECORDING, see docs/beach-wave-object.md §0), caught from the
// swell on. `node tools/beach-reference.mjs <frames>` reproduces all of it.
//
//   1 SWELL      a dark tonal ridge, NO FOAM ANYWHERE. The water darkened 36
//                levels over 2.4 s ahead of the lip, leaving a local minimum
//                6-8 levels under the water either side of it. The lip opens
//                over the last `steepS` of it — a bright line 0.010 of frame
//                height, crest 183 against a face of 56.
//   2 PEEL       the break runs ALONG the crest: 64 of 64 column blocks over
//                1.87 s, onset slope -1.34 s across the frame.
//   3 COLLAPSE   band 0.025 -> 0.040, and the crest-to-face contrast PEAKS —
//                153 in sequence A, 157 in sequence C.
//   4 FOAM BAND  band 0.060 -> 0.135 while the face fades (-46 -> -11 levels
//                against the ambient water over 0.8 s); travels shoreward at
//                0.09 frame heights a second.
//   5 SWASH      beach-swash.js, unchanged.
//
// IT WAS SIX AND STEEPEN WAS THE ONE THAT WENT (Eva's ruling). It sat between
// SWELL and PEEL and named the window in which the lip is open and no column
// has broken — and `waveStage` COULD NEVER REPORT IT. The moment a wave's
// columns disagree across the break it is PEEL by definition, and for every
// column to be steepening at once the whole peel would have to fit inside one
// `steepS`: measured, steepS is 0.28-0.455 s against a peel of 0.8-1.9 s, so
// the window is empty at every reachable setting. A stage nobody can be in is
// a stage that reads as covered while nothing covers it.
//
// THE LIP DID NOT GO WITH IT. `bandWidthAt` and `foamAlphaAt` still open it
// over `steepS` and `faceAmountOf` still rises through it; what was deleted is
// the LABEL, and a column in that window now reports SWELL, which is what it
// is — a wave that has not broken.
//
// THE DARK FACE IS THE FINDING AND IT IS NOT "THE WATER UNDER THE FOAM". (The
// tone figures below are the FOOTAGE's, and they are kept because they are
// measurements; the drawing that turned them into ink density is gone.)
// Measured against the ambient water IMMEDIATELY SHOREWARD of it, it sits 11
// to 46 levels BELOW it — darker than the sea around it — which in the
// drawing's own tone units is +0.07 to +0.31 of tone. At its deepest it reads
// tone 0.93, DARKER THAN `TONE.deep` (0.78), which is the darkest thing this
// drawing otherwise has, and it sits where the shipped ramp puts the water at
// 0.73-0.77. It is also the strongest edge anywhere in the frame by 3.2x-4.8x
// (the largest luminance step over 0.02 of frame height, against the strongest
// step below s = 0.30). LOSING IT LEAVES A WHITE STRIPE, which is what the
// scene had.
// ---------------------------------------------------------------------------
//
// THE RECORD IS THE CLAIM, AND IT IS `SWASH_FIELDS`' CLAIM WIDENED. There is
// no `energy`, no `set`, no `target` and no `stage` here. A wave is COMMITTED
// AT BIRTH — which until now covered only the runup — and that now covers how
// far out it breaks, how deep its face runs, how wide its band gets and how
// long it peels for. `spawn()` in beach-swash.js is the one place the energy
// is read; nothing in this file can reach it, so deforming a running wave is
// UNREACHABLE rather than avoided.
//
// AND THERE IS NO `stage` FIELD FOR THE SAME REASON ONE LEVEL UP: a stored
// stage is a second owner of something the geometry already says. `stageAt()`
// reads the same `broken` `drawPhaseAt` does, so a wave whose picture says
// COLLAPSE cannot report FOAM BAND.
import { FOAM_ONSET_B, rng, lobeParams, bubbleParams } from './beach-brush.js';

export const WAVE_FIELDS = [
  // the clock and the travel
  'age', 'crest0', 'breakS', 'speedS', 'crestWob',
  // the break
  'breakAge', 'peelS', 'peelFrom', 'steepS',
  // what the energy sized, frozen at birth
  'bandMax', 'bandFadeS', 'swellLeadS', 'height',
  // the wave's own stream, so every mark it makes is a property of WHICH wave
  // this is and of nothing that was drawn before it, and the marks that stream
  // was spent on — DRAWN ONCE, HERE, because a foam scallop re-drawn per frame
  // boils and because the brush and the bubbles take a variable number off any
  // stream they share
  'seed', 'drawA', 'drawB', 'drawBubbles',
  // and the hand-over to the swash
  'preS',
];

// --- STAGES ----------------------------------------------------------------
// Names for regions of one law. `stageAt` NEVER decides geometry — the phase
// the drawing reads is a continuous function of the same `broken` these
// boundaries are read off —
// so the labels are for the gate, the read-out and a reader, and moving one
// cannot move a pixel. That is deliberate: the previous session's break was a
// branch, and a branch is exactly what makes a wave pop into existence.
export const SWELL = 1, PEEL = 2, COLLAPSE = 3, FOAM_BAND = 4, SWASH = 5;
export const STAGE_NAMES = { 1: 'swell', 2: 'peel', 3: 'collapse', 4: 'foam band', 5: 'swash' };

// --- TIMING, and which figures are measured ---------------------------------
// MEASURED: the band grows to its widest in about 1.4 s (sequence A reached
// 0.095 and was still growing at 1.0 s; sequence C reached 0.130 at 1.3 s).
export const BAND_GROW_S = 1.4;

// How long a band takes to fade once it has grown, drawn per wave. NAMED
// because BREAK_S's shoreward limit is derived from its upper end: a wave that
// breaks too near the shore is handed to the swash with its band still
// growing. Two copies of 2.4 would let that derivation drift from the law.
export const BAND_FADE_RANGE = [1.2, 2.4];

// MEASURED, AND THE FIRST READING OF IT WAS OF THE WRONG QUANTITY. The face
// AGAINST THE AMBIENT WATER runs -46, -42, -38, -30, -13, -11 over 0.83 s in
// sequence A, which looks like a face gone in under a second — and sequence C
// reads the opposite way over its own stretch (-14 -> -46). Both are true and
// neither is about the face: the "ambient" window is being overtaken by the
// growing band, so that figure is a statement about the BAND.
//
// The face's own ABSOLUTE luminance is the robust reading, and it is the one
// the model needs anyway since FACE_TONE is an absolute target:
//
//   sequence A   57 · 59 · 64 · 73 · 88 · 84   over 0.83 s
//   sequence C   91 · 87 · 86 · 78 · 78 · 78 · 73 · 77 · 79 · 87 · 90 · 91  over 1.8 s
//
// So the face holds between 57 and 91 for at least 1.8 s and NEITHER RECORDING
// SHOWS IT END — 2.2 is a lower bound dressed as a constant, and it is exposed
// rather than buried. At 0.9 the face was gone before the peel finished, so a
// wave never had one across its whole width at any moment of its life.
export const FACE_DECAY_S = 2.2;

// MEASURED: the lip in sequence A is 0.010 of frame height when it first
// reads, before it thickens.
export const LIP_W = 0.010;

// MEASURED, AND THE FIRST READING OF IT CONFLATED TWO THINGS. "The foam band
// travels shoreward at 0.09 frame heights a second" is true of the band's
// SHOREWARD EDGE and false of the wave — and the edge advances mostly by the
// band GROWING, not by the wave moving. Read separately:
//
//   the CREST            sequence A 0.040 -> 0.060 over 0.83 s   0.024 fh/s
//   an OLD shore band    sequence A 0.335 -> 0.360 over 1.6 s    0.025 fh/s
//   the band's edge      sequence A 0.065 -> 0.135 over 0.83 s   0.084 fh/s
//
// Two independent features — a fresh crest at the back of frame and a bore
// already at the shore — travel at the SAME 0.024-0.025, and the 0.084 is the
// band opening out behind a crest that is barely moving. So the wave travels
// at 0.025 and `bandWidthAt` supplies the rest, which is what the model
// already does; the first cut simply gave the wave the band's number.
//
// IT MATTERS AND A SINGLE SPEED CANNOT BE FUDGED. At 0.09 the crest moves
// 0.135 of frame height during a collapse the reference measures at 0.02, so
// the break happened a fifth of the way down the beach instead of at the back
// of frame. That is visible from across the room and it is what the first
// mockup drew.
export const TRAVEL_S = 0.025;

// HOW LONG A WAVE'S SEAWARD LIFE LASTS, AND IT IS THE SAME FOR EVERY WAVE ON
// PURPOSE. It is derived — the travel from just off the top of frame to the
// waterline, at the nominal speed — but the reason it is a CONSTANT rather
// than per-wave is a defect this session shipped for one gate run.
//
// The first cut derived each wave's birth position from its own swell lead and
// let `preS` fall out of that, so it ranged over about nine seconds while
// waves were spawned 3.2-6.4 s apart. ARRIVALS THEN SCRAMBLED: a wave spawned
// later with a shorter approach reached the shore before an earlier one, so
// two swashes could land together and then nothing for ten seconds. Measured,
// that took the high-water mark from the brief's 6 px per 3.5 s to 59.7, and
// fired four overruns in fifteen quiet minutes where the margin is calibrated
// to fire none.
//
// The spawner's interval is a claim about ARRIVALS, and it was silently
// turned into a claim about BIRTHS. With `preS` fixed the two are the same
// statement again, and a wave's own speed changes where it is BORN instead:
// `crest0 = WATERLINE_S - speedS * PRE_S`, which is a length from a length.
export const PRE_S = 17.6;

// PICKED, and it is the least-measured number here. The swell is legible for
// about 2.4 s before the lip in sequence A, but the recording starts with the
// previous wave's foam still clearing out of the top of frame, so part of that
// darkening is the foam leaving rather than the swell arriving. 2.4 is the
// upper bound of what was seen and it is exposed rather than buried.
export const SWELL_LEAD_S = 2.4;

// MEASURED, and it is a RANGE rather than a value because the two recordings
// disagree for a reason: sequence A catches a break from its start and peels
// for 1.87 s; sequence C starts mid-peel and takes 0.73 s to finish. So 1.87
// is the figure and 0.73 is a floor — the brief's own reading — and a wave
// draws from a band that straddles them.
export const PEEL_RANGE = [0.8, 1.9];

// THE DRAWN HEIGHT OF A WAVE, IN FRAME HEIGHTS, AND THE RANGE'S ENDS ARE THE
// DRAWING'S OWN TWO NUMBERS. beach-brush.js was written with two waves in it,
// at 0.048 and 0.082, and generalising it to a list needs a law for a height
// the module had no reason to have. These are those two numbers, become the
// ends of the range the set energy picks from — the least invention available,
// and it is the shape every other energy-sized field in this file already has.
// PICKED, not measured: nothing in the reference measures a wave's height
// against the size of the set that made it.
export const HEIGHT = [0.048, 0.082];

// Above this the drawing uses its heavier brush widths and its fuller bubble
// count — the module's own `big` flag, which was a per-call boolean and is a
// threshold on the range now.
export const BIG_HEIGHT = (HEIGHT[0] + HEIGHT[1]) / 2;

// --- THE BREAK PHASE THE DRAWING READS --------------------------------------
// beach-brush.js parameterises a wave by ONE number per column: `b`, running 0
// at the unbroken end to 1 at the spent end, off which its height envelope, its
// curl, its foam width and its fade all hang. This is the map from this file's
// clock to that number, and it lives HERE because `brokenAt` is this file's and
// because a second owner of "has this column broken" is exactly what lets a
// stage label and a picture disagree.
//
// The anchor is the drawing's OWN foam onset, imported rather than restated:
// the moment this file says a column has broken is the moment that drawing
// first puts foam on it. Either side of it the scale is the record's own — the
// swell's lead in, the band's growth plus its fade out — so nothing here is a
// duration somebody chose.
export function drawPhaseAt(w, u) {
  const b = brokenAt(w, u);
  // BOTH SCALES ARE THE RECORD'S OWN DERIVED LENGTHS — a time from a distance
  // and a speed, never a duration anyone picked. `breakAge` is birth to break;
  // `preS - breakAge` is break to the waterline, where the wave stops being a
  // wave and becomes the swash.
  //
  // SO `b` SPANS THE WHOLE SEAWARD LIFE, and that is what makes the drawing's
  // spent end line up with this file's SWASH stage instead of arriving eight
  // seconds early. The drawing has no fade: its foam band GROWS with `b` and
  // never thins, so a wave that reached `b = 1` while still half a frame from
  // the shore would sit there drawing a full white band until it died. With
  // the span set here a wave is fully spent exactly as its crest crosses the
  // waterline and the swash front takes over the same stretch of beach.
  //
  // AND A WAVE CAN BE BORN PAST ITS OWN BREAK POINT, which is reachable and is
  // not an error: at full set energy `breakS` runs out to 0.020 while the
  // slowest wave is born at 0.026, so `breakAge` comes out NEGATIVE. Measured,
  // 142 of 4,000 waves at energy 1.00 and 0 of 4,000 at energy 0.80, worst
  // -0.282 s. Such a wave is already breaking when it arrives, so its rising
  // stretch has no span at all and its phase starts AT the foam onset. Written
  // as a branch rather than left to `clamp01` rescuing a division by a
  // negative number, which is the same answer reached by accident.
  if (b < 0) return w.breakAge > 0 ? FOAM_ONSET_B * clamp01(1 + b / w.breakAge) : FOAM_ONSET_B;
  return FOAM_ONSET_B + (1 - FOAM_ONSET_B) * clamp01(b / (w.preS - w.breakAge));
}

// MEASURED: the band reaches 0.095 in sequence A and 0.135 in sequence C.
export const BAND_MAX = [0.055, 0.135];

// A BIGGER SET BREAKS FURTHER OUT, so energy runs the range DOWNWARD — which
// is the one part of the energy coupling that is a physical claim rather than
// a dial, and it is the reason the range is written with its larger number
// first. The SPREAD (0.095) is that claim and is unchanged.
//
// WHERE THE RANGE SITS IS EVA'S RULING AND THE QUIET END IS DERIVED FROM IT.
// It read [0.115, 0.020] — measured off sequences A and C, where the crest
// sits at s 0.04-0.09 — and the composition that produced is the one she
// objected to: `b` is linear in s between the break and the waterline, so the
// curl (b = 0.50) peaked at s 0.202 and the whole lower half of the wave zone
// carried nothing but spent bands.
//
// THE SHOREWARD LIMIT IS NOT TASTE. A wave's own foam band takes
// BAND_GROW_S + bandFadeS to grow and fade — at most 1.4 + 2.4 = 3.8 s — and
// it has only `(WATERLINE_S - breakS) / TRAVEL_S` seconds before the swash
// takes it over. Breaking any nearer than s 0.305 hands a wave to the shore
// with its band still growing, so it never shows the band it committed to at
// birth. 0.300 is that bound at this constant's own precision, with 0.2 s of
// headroom: the curl peaks at s 0.331 and the foam band reaches 0.386-0.466,
// which is the middle of the frame and roughly where the drawing's own
// default hero wave sits (0.375).
export const BREAK_S = [0.300, 0.205];

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (v) => v * v * (3 - 2 * v);

// --- THE PEEL ---------------------------------------------------------------
// THE ONE PLACE THE PEEL EXISTS, and the reason every law below takes a `u`.
// A column's own break time is the wave's break time plus however far along
// the peel that column sits, so ONE WAVE IS STEEPENING AT ONE END OF THE FRAME
// AND COLLAPSING AT THE OTHER — which is what a peel IS, and what the scene
// could not express at all.
//
// Returns SECONDS SINCE THIS COLUMN BROKE. Negative: it has not yet.
export function brokenAt(w, u) {
  const along = w.peelFrom > 0.5 ? 1 - clamp01(u) : clamp01(u);
  return w.age - (w.breakAge + w.peelS * along);
}

// Where this wave's crest is, at this column. It travels shoreward at a fixed
// speed from birth — a LENGTH over a TIME, never a row count — and the
// along-shore wobble is the wave's own, so no front is a ruled line.
export function crestAt(w, u) {
  const wob = w.crestWob ? sampleWob(w.crestWob, u) : 0;
  return w.crest0 + w.speedS * w.age + wob;
}

function sampleWob(f, u) {
  const t = clamp01(u) * (f.length - 1);
  const i = Math.floor(t);
  if (i >= f.length - 1) return f[f.length - 1];
  const d = t - i;
  return f[i] * (1 - d) + f[i + 1] * d;
}

// --- THE FOUR CONTINUOUS LAWS ----------------------------------------------
// Each is a function of ONE number — how long ago this column broke — so the
// five stages are regions of them rather than branches inside them.

// The foam band's width. Zero until the lip, then the lip, then growth to the
// wave's own committed maximum over BAND_GROW_S.
export function bandWidthAt(w, b) {
  if (b < -w.steepS) return 0;
  if (b < 0) return LIP_W * smooth(1 + b / w.steepS);       // the lip opening
  const g = clamp01(b / BAND_GROW_S);
  return LIP_W + (w.bandMax - LIP_W) * smooth(g);
}

// How fully the band reads as paper. Fresh foam is the brightest thing in the
// frame; a dying band is a broad grey wash, which is the reference's own
// 230 -> 168 over 0.7 s.
export function foamAlphaAt(w, b) {
  if (b < -w.steepS) return 0;
  if (b < 0) return smooth(1 + b / w.steepS);
  const life = BAND_GROW_S + w.bandFadeS;
  if (b >= life) return 0;
  return b < BAND_GROW_S ? 1 : 1 - smooth((b - BAND_GROW_S) / w.bandFadeS);
}

// The dark face. It does not exist before the lip, is deepest AT the break,
// and is gone within a second — the sequence-A measurement, which is the
// single strongest thing in the reference and the single thing the merged
// scene had no object for.
// RETURNS AN AMOUNT IN 0..1, NOT A TONE — how much of the way toward the
// wave's committed `faceDepth` the field is pulled. The TARGET lives in the
// record and the SCHEDULE lives here, one owner each.
//
// AND IT IS A FUNCTION OF THE WAVE, NOT OF THE COLUMN, which is the one place
// this file deliberately breaks its own per-column rule. The band is per
// column BY DEFINITION — that is what a peel is. The face is the unbroken
// wall of water under the crest, and while the wave is peeling it is still
// unbroken SOMEWHERE, so it is one surface running the width of the frame.
// The reference shows exactly that: at f101 the foam is plainly wider at one
// end than the other and the dark band under it is a continuous line roughly
// parallel to the shore.
//
// Tied to the column it does not merely look wrong, it CANCELS: over a 1.4 s
// peel each column's band width differs, so the face's depth runs over 0.09
// of frame height and averages to nothing — measured, it read L 117 against
// the reference's 60, present at every column and a band at none.
//
// So: it rises as the wave begins to break, HOLDS FOR THE WHOLE PEEL (the
// wave is actively breaking throughout), and decays once the last column has
// gone.
export function faceAmountOf(w) {
  const a = w.age - w.breakAge;
  if (a < -w.steepS * 0.5) return 0;
  if (a < 0) return smooth(1 + a / (w.steepS * 0.5));
  if (a <= w.peelS) return 1;
  const d = (a - w.peelS) / FACE_DECAY_S;
  return d >= 1 ? 0 : 1 - smooth(d);
}
// --- THE STAGE, WHICH IS A LABEL ON THE ABOVE -------------------------------
// A COLUMN'S OWN STAGE. It never returns PEEL, and that is not an omission:
// a single column does not peel, it simply breaks. See `waveStage` below.
export function stageAt(w, u, waterline) {
  const b = brokenAt(w, u);
  if (waterline !== undefined && crestAt(w, u) >= waterline) return SWASH;
  // A COLUMN THAT HAS NOT BROKEN IS SWELL, lip or no lip. STEEPEN used to
  // split this in two at `-steepS`; the lip is still opened there by
  // `bandWidthAt` and `foamAlphaAt`, and the label is gone.
  if (b < 0) return SWELL;
  // COLLAPSE is "this column has broken AND the wave still has a face";
  // FOAM_BAND is what is left when the face has gone. Read off the same
  // `faceAmountOf` the record reports, so the label cannot drift from it.
  return faceAmountOf(w) > 0 ? COLLAPSE : FOAM_BAND;
}

// THE WAVE'S OWN STAGE, AND `PEEL` IS DEFINED AS ITS COLUMNS DISAGREEING.
// That is the honest definition rather than a time window beside the peel
// duration: a peel IS the state of having broken at some columns and not at
// others, so reading it off the columns means the label cannot drift from the
// picture. It also makes the brief's "several stages coexist" a measurable
// property of one wave rather than only of several.
//
// Where the columns agree the wave is simply in that stage. Where they do not
// and the disagreement straddles the break, it is peeling; where they do not
// for any other reason (a crest that has crossed the waterline at one end of a
// sheared frame and not the other) the SEAWARD-most stage is reported, because
// that is the part of the wave still to arrive.
export function waveStage(w, waterline, samples = 24) {
  let lo = SWASH, hi = SWELL, anyBroken = false, anyUnbroken = false;
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    const st = stageAt(w, u, waterline);
    if (st < lo) lo = st;
    if (st > hi) hi = st;
    if (brokenAt(w, u) >= 0) anyBroken = true; else anyUnbroken = true;
  }
  if (anyBroken && anyUnbroken) return PEEL;
  return lo;
}

// --- SEVERAL WAVES AT ONCE --------------------------------------------------
// THE ORDER WAVES ARE DRAWN IN. Walked SEAWARD FIRST, each wave laid over what
// is already there, so the most shoreward wave wins where two overlap — a
// painter's order, which is what "a nearer band of foam hides the water behind
// it" means in a plan view. Several waves alive at once is the NORMAL
// state and not an edge case: measured per column, the reference carries a
// mean of 1.3 to 3.4 separate bright bands with 33-96% of columns carrying two
// or more.
//
// SORTING IS THE CALLER'S, ONCE PER FRAME. `sortWaves` is the one owner of what
// seaward-first means and the scene calls it once before handing the list over.
export function sortWaves(waves) {
  return waves.slice().sort((a, b) => (a.crest0 + a.speedS * a.age) - (b.crest0 + b.speedS * b.age));
}

// --- THE RECORD -------------------------------------------------------------
// Built ONCE, from the energy, and never touched again. `steepS`, `bandFadeS`,
// `swellLeadS` and `life` are DERIVED from the numbers above rather than drawn
// separately, so a wave cannot be handed a lip that outlasts its own band.
export function makeWave({ rand, energy = 0, waterline = 0.40, samples = 160 }) {
  const e = clamp01(energy);
  const breakS = BREAK_S[0] + (BREAK_S[1] - BREAK_S[0]) * e;
  // THE PEEL RATE IS SIZED BY THE ENERGY AT BIRTH, AND THE DIRECTION IS PICKED.
  // Nothing in the reference measures a peel's duration against the size of the
  // set that made it; a bigger, longer wave taking longer to run its break
  // across the frame is the assumption, stated. The energy shifts WHERE in the
  // range the draw lands and the jitter keeps the wave-to-wave variation the
  // whole range was there for — a plain `LO + (HI-LO) * e` would make every
  // wave on a quiet beach peel for the same 0.8 s.
  const peelS = PEEL_RANGE[0] + (PEEL_RANGE[1] - PEEL_RANGE[0])
    * clamp01(0.35 + 0.65 * e + rand.range(-0.35, 0.35));
  const speedS = TRAVEL_S * rand.range(0.85, 1.20);
  const swellLeadS = SWELL_LEAD_S * rand.range(0.8, 1.15);

  // THE WAVE'S OWN STREAM. Every mark this wave will ever make comes off it,
  // so nothing a wave draws depends on what was drawn before it.
  const seed = rand.int(1, 0x7ffffffe);
  const mark = rng(seed);

  // A PER-WAVE ALONG-SHORE SHAPE FOR THE CREST, so no two fronts are the same
  // and none of them is a straight line — makeWob()'s own reasoning in
  // beach-swash.js, at the scale a crest wobbles rather than a swash edge.
  const crestWob = new Float64Array(samples);
  const k1 = 2 + rand.range(0, 3), k2 = 7 + rand.range(0, 8);
  const p1 = rand.range(0, 6.283), p2 = rand.range(0, 6.283);
  const a1 = rand.range(0.006, 0.016), a2 = rand.range(0.002, 0.006);
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    crestWob[i] = a1 * Math.sin(u * k1 + p1) + a2 * Math.sin(u * k2 + p2);
  }

  // WHERE IT IS BORN IS DERIVED FROM ITS OWN SPEED AND THE FIXED SEAWARD LIFE,
  // so every wave takes the same time to reach the shore and the spawner's
  // interval keeps meaning what it says. See PRE_S.
  const crest0 = waterline - speedS * PRE_S;
  const w = {
    age: 0,
    crest0, breakS, speedS, crestWob,
    // WHEN IT BREAKS IS A DISTANCE, NOT A DURATION: it breaks when its crest
    // reaches `breakS`, so the break age is DERIVED from the two lengths and
    // the speed. A duration drawn beside the position could disagree with it.
    breakAge: (breakS - crest0) / speedS,
    peelS,
    peelFrom: rand.unit(),
    // The steepening lead: the lip opens over the last stretch of the approach.
    steepS: 0.35 * rand.range(0.8, 1.3),
    bandMax: BAND_MAX[0] + (BAND_MAX[1] - BAND_MAX[0]) * e * rand.range(0.85, 1.15),
    bandFadeS: rand.range(BAND_FADE_RANGE[0], BAND_FADE_RANGE[1]),
    swellLeadS,
    // HOW BIG IT DRAWS, and its own stream. Both frozen here for the reason
    // everything else in this record is: `spawn()` is the one place the energy
    // is read, and a seed drawn per frame is a wave whose foam boils.
    height: HEIGHT[0] + (HEIGHT[1] - HEIGHT[0]) * e * rand.range(0.85, 1.15),
    seed,
    // THE WAVE'S OWN FOAM, DRAWN ONCE. The counts, the radii and the bubble
    // count are beach-brush.js's own, unchanged; what moved is WHEN they are
    // drawn. Off the wave's own stream rather than the spawner's, so two waves
    // born in either order carry the same foam.
    drawA: lobeParams(mark, 9, 0.035, 0.096),
    drawB: lobeParams(mark, 22, 0.010, 0.031),
    drawBubbles: bubbleParams(mark, 16),
    // AND THE SWASH HAND-OVER: the wave reaches the waterline at this age, and
    // because `crest0` was derived from it, it is PRE_S for every wave — which
    // is what keeps the arrivals as regular as the spawns. Written as the
    // quotient rather than as the constant so it stays a statement about the
    // geometry: if the birth position ever stops being derived this way, this
    // number moves with it instead of lying.
    preS: (waterline - crest0) / speedS,
  };
  return w;
}
