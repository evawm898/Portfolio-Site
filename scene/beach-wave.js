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
// IT HOLDS NO STATE. Every export is a function over a record and a position,
// the way `swashEnv` is a function over a record and a clock — so the gate
// drives every law in Node with no browser and no canvas, and a stage cannot
// disagree with the geometry that gets drawn because it is READ OFF it.
//
// ---------------------------------------------------------------------------
// THE SIX STAGES, MEASURED. Sequence A of the reference (IMG_3911 ∪ IMG_3912 —
// which are ONE RECORDING, see docs/beach-wave-object.md §0), caught from the
// swell on. `node tools/beach-reference.mjs <frames>` reproduces all of it.
//
//   1 SWELL      a dark tonal ridge, NO FOAM ANYWHERE. The water darkened 36
//                levels over 2.4 s ahead of the lip, leaving a local minimum
//                6-8 levels under the water either side of it.
//   2 STEEPEN    a bright lip 0.010 of frame height. Crest 183, face 56.
//   3 PEEL       the break runs ALONG the crest: 64 of 64 column blocks over
//                1.87 s, onset slope -1.34 s across the frame.
//   4 COLLAPSE   band 0.025 -> 0.040, and the crest-to-face contrast PEAKS —
//                153 in sequence A, 157 in sequence C.
//   5 FOAM BAND  band 0.060 -> 0.135 while the face fades (-46 -> -11 levels
//                against the ambient water over 0.8 s); travels shoreward at
//                0.09 frame heights a second.
//   6 SWASH      beach-swash.js, unchanged.
//
// THE DARK FACE IS THE FINDING AND IT IS NOT "THE WATER UNDER THE FOAM".
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
// reads the same `broken` the tone does, so a wave whose picture says COLLAPSE
// cannot report FOAM BAND.
export const WAVE_FIELDS = [
  // the clock and the travel
  'age', 'crest0', 'breakS', 'speedS', 'crestWob',
  // the break
  'breakAge', 'peelS', 'peelFrom', 'steepS',
  // what the energy sized, frozen at birth
  'bandMax', 'bandFadeS', 'faceDepth', 'swellDepth', 'swellLeadS',
  // and the hand-over to stage six
  'preS',
];

// --- STAGES ----------------------------------------------------------------
// Names for regions of one law. `stageAt` NEVER decides geometry — the tone is
// a continuous function of the same `broken` these boundaries are read off —
// so the labels are for the gate, the read-out and a reader, and moving one
// cannot move a pixel. That is deliberate: the previous session's break was a
// branch, and a branch is exactly what makes a wave pop into existence.
export const SWELL = 1, STEEPEN = 2, PEEL = 3, COLLAPSE = 4, FOAM_BAND = 5, SWASH = 6;
export const STAGE_NAMES = { 1: 'swell', 2: 'steepen', 3: 'peel', 4: 'collapse', 5: 'foam band', 6: 'swash' };

// --- TIMING, and which figures are measured ---------------------------------
// MEASURED: the band grows to its widest in about 1.4 s (sequence A reached
// 0.095 and was still growing at 1.0 s; sequence C reached 0.130 at 1.3 s).
export const BAND_GROW_S = 1.4;

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

// MEASURED as tone, which is the unit the drawing works in — AND AS AN
// ABSOLUTE TARGET RATHER THAN AN OFFSET, which is a correction the first
// mockup forced.
//
// The face was first written as an EXCESS over whatever the field already
// said, because +0.07..+0.31 over the ambient water is how the reference
// measurement reports it. Rendered, that is wrong wherever this drawing's
// ambient differs from the footage's — and it does, by the §4 finding: the
// water at the shore reads 5-9 levels darker in the reference than the shipped
// ramp draws it. So a face built as an offset came out at tone 0.72 where the
// reference's reads 0.81, and the strongest edge in the frame was not the
// strongest edge in the drawing.
//
// The reference's face is an ABSOLUTE darkness: L 58-91 across both
// recordings, wherever it happens to sit, which is tone 0.70-0.93 — AT ITS
// DEEPEST IT IS THE DARKEST THING IN THE FRAME, below `TONE.deep`. The
// +0.07..+0.31 contrast is then a CONSEQUENCE of the water it sits over, not
// the law. The swell reads the same way: L 41-43 at its deepest, tone
// 1.02-1.04, against the 0.90 of the same water before it arrives.
//
// So both are targets the field is pulled TOWARD, which is also why a swell in
// water that is already at its darkest costs almost nothing and a face over
// the pale water near the shore costs a great deal — exactly the asymmetry the
// footage shows.
//
// ENERGY PICKS A POINT IN EACH BAND AT BIRTH AND NOTHING MOVES IT AFTER.
// AND BOTH TARGETS SIT IN THE PART OF THE LADDER THAT STILL MOVES. The
// shipped lattice's delivered coverage saturates at about tone 0.70 (the table
// is in beach-draw.js beside TONE), so a target above 0.90 buys nothing a
// target of 0.80 does not. `TONE.deep` came down to 0.60 in the same change;
// these two are what spend the stretch that opened up.
// AND THEY ARE SET THROUGH THE WHOLE CHAIN — REFERENCE LUMINANCE, TO THE INK
// COVERAGE THAT DELIVERS IT, TO THE TONE THAT DELIVERS THAT — rather than by
// reading a normalised darkness as if it were a tone. Those are two different
// scales and mistaking one for the other is what put the first mockup's face
// at L 24 where the reference's is 64. The drawing's ground is #f1ede6 (L 241)
// and its ink #16181c (L 23), so
//
//     coverage = (241 - L) / 218,   and TONE -> coverage is the table
//     in beach-draw.js measured through `__flatTone`.
//
// Run over the reference's own bands it re-derives the shipped ladder rather
// than contradicting it, which is the check that the chain is right:
//
//   reference band            L        coverage    tone     shipped
//   deep water, no wave       62         0.82      0.58      —
//   deep water, swell in it   41         0.92      0.68      0.78 (deep)
//   water beside a wave      100         0.65      0.52      —
//   water at the shore       109-118     0.57      0.48      0.45 (shallow)
//   THE DARK FACE             58-91      0.69-0.84 0.53-0.66 — nothing
//   foam                     213-230     0.05-0.13 0.05      0.00 (foam)
//
// TWO THINGS FALL OUT AND BOTH ARE WORTH STATING. `TONE.deep` 0.70 is what
// the chain asks for; and THE FACE IS NOT DRAMATICALLY DARK IN TONE — it sits
// only 0.03 to 0.09 above the water beside it, and the 153-level crest-to-face
// gap the reference measures is mostly the CREST being bare paper. A face
// pushed to 0.90 is not more faithful, it is black.
//
// So the targets are a little above the reference's own, which is deliberate:
// the drawing's water beside a wave sits at 0.575 where the footage's sits at
// 0.52, so the same absolute tone would read as less of a step here.
export const FACE_TONE = [0.62, 0.74];
// The swell: the reference takes its deep water 0.58 -> 0.68 of tone. The
// resting value this drawing can afford is 0.70 (see beach-draw.js), so the
// swell's own travel is the stretch above that — AND IT IS THE WEAKEST OF THE
// SIX STAGES IN THIS MEDIUM, said rather than hidden. The lattice saturates,
// the alternative costs the sea's solidity, and the trade is Eva's.
export const SWELL_TONE = [0.78, 0.86];

// MEASURED: the band reaches 0.095 in sequence A and 0.135 in sequence C.
export const BAND_MAX = [0.055, 0.135];

// MEASURED: the crest sits at s 0.04-0.06 in sequence A and 0.00-0.09 in
// sequence C. A BIGGER SET BREAKS FURTHER OUT, so energy runs the range
// DOWNWARD — which is the one part of the energy coupling that is a physical
// claim rather than a dial, and it is the reason the range is written with its
// larger number first.
export const BREAK_S = [0.115, 0.020];

// The face's centre sits about 0.020 of frame height past the band's shoreward
// edge (sequence A: band ends 0.065, face at 0.085; band ends 0.105, face at
// 0.120), and reads about 0.05 wide.
export const FACE_GAP = 0.020;
export const FACE_W = 0.050;

// How far the swell's dark ridge reaches either side of the crest. Sequence A:
// the darkening is at its strongest at s 0.03-0.08 and is gone by s 0.20, so
// about 0.07 of frame height on the shoreward side of a crest at 0.05.
export const SWELL_W = 0.075;

// The seaward fraction of the foam band that ramps in. FOAM_RAMP's own
// reasoning in beach-draw.js, restated for the band this file owns: the
// reference's band is a PLATEAU of paper with a soft outer edge, not a ramp to
// one. The shoreward edge is the sharper of the two, because that is where the
// foam piles up against the face.
export const BAND_RAMP_IN = 0.28;
export const BAND_RAMP_OUT = 0.12;

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (v) => v * v * (3 - 2 * v);
// One bump shape, reused — `waterTone`'s own dip profile, so the swell, the
// face and the old break cannot disagree about what a soft lobe looks like.
const lobe = (x) => { const a = Math.abs(x); if (a >= 1) return 0; const k = 1 - a * a; return k * k; };

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
// six stages are regions of them rather than branches inside them.

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

// Where it sits: below the WIDEST band the wave has anywhere, so it is clear
// of the foam at every column rather than being erased by it at the ones that
// broke first. `bandWidthAt` is monotone in `b`, so the first column to break
// is the widest.
//
// A DECLARED SIMPLIFICATION, AND IT IS NOT WHAT THE REFERENCE DOES. There, the
// face DIPS progressively under the peel — at the unbroken end it is the
// wave's own front, right at the crest, and it slides under the foam as each
// column breaks. Held at one depth the way it is here, the not-yet-broken end
// of the wave carries a face further below its crest than it should. It is
// held anyway because the alternative was measured and is worse in this
// medium: per column the depth runs over 0.09 of frame height, and a row of a
// bilevel lattice averaged across that reads L 117 where the reference's face
// is 60. One depth reads as a band; the true law reads as nothing. Recorded
// so a later session can reach for a ramped depth rather than rediscovering
// the choice.
export function faceCentreOf(w) {
  return bandWidthAt(w, w.age - w.breakAge) + FACE_GAP;
}

// The swell. It rises over the wave's whole approach and is spent by the time
// the band has grown, because by then the ridge IS the band.
// Likewise an amount in 0..1.
//
// AND IT IS SPENT SHORTLY AFTER THE COLUMN BREAKS, NOT OVER THE BAND'S WHOLE
// GROWTH. The ridge does not persist behind the break as a separate dark body;
// it BECOMES the foam and the face, which is what the reference shows — once a
// column has broken, the dark thing under its crest is the face.
//
// The first cut spent it over BAND_GROW_S (1.4 s), and because the swell's
// target is darker than the face's — correctly, since the reference's swelling
// water reaches L 41 against the face's 58-91 — a freshly broken column had
// its swell OUT-DARKENING its own face. Measured on the clean tree: at 0.2 s
// past the break the darkest emitted tone sat at d = 0.014 reading 0.806,
// where the face is 0.697 at d = 0.076. The face stopped being the darkest
// thing under the foam, which is the one property it has.
// It is spent AT the break, not over some window after it: a column that has
// broken has no swell left, it has foam and a face. Written as an early return
// rather than a fast decay because a decay is a number somebody would tune,
// and there is nothing to tune — the ridge is either still standing or it is
// not. The discontinuity is invisible: at b = 0 the lobe's centre is under the
// opening lip, which the foam term multiplies away.
export function swellDepthAt(w, b) {
  if (b >= 0 || b < -w.swellLeadS) return 0;
  return smooth(1 + b / w.swellLeadS);
}

// --- THE STAGE, WHICH IS A LABEL ON THE ABOVE -------------------------------
// A COLUMN'S OWN STAGE. It never returns PEEL, and that is not an omission:
// a single column does not peel, it simply breaks. See `waveStage` below.
export function stageAt(w, u, waterline) {
  const b = brokenAt(w, u);
  if (waterline !== undefined && crestAt(w, u) >= waterline) return SWASH;
  if (b < -w.steepS) return SWELL;
  if (b < 0) return STEEPEN;
  // COLLAPSE is "this column has broken AND the wave still has a face";
  // FOAM_BAND is what is left when the face has gone. Read off the same
  // `faceAmountOf` the tone uses, so the label cannot drift from the picture.
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

// --- ONE WAVE'S CONTRIBUTION TO THE TONE ------------------------------------
// `base` is whatever the field already says at (u, s) — the shipped ramp, or
// a wave further out that has already been laid down. The THREE terms compose
// in a fixed order and the order is the physics: the swell and the face both
// ADD ink, and the foam then TAKES IT AWAY, because foam floating on water
// hides whatever is under it. A face cannot show through its own band.
export function waveToneAt(w, u, s, base) {
  const c = crestAt(w, u);
  const b = brokenAt(w, u);
  const d = s - c;

  const bw = bandWidthAt(w, b);
  const fd = faceAmountOf(w);          // the WAVE's, not this column's — see above
  const fc = faceCentreOf(w);
  const sd = swellDepthAt(w, b);
  const fa = foamAlphaAt(w, b);

  let t = base;
  // Both are pulled TOWARD a target rather than added to the field — see
  // FACE_TONE above. `lobe` keeps the pull local; the time law keeps it on the
  // wave's own schedule.
  if (sd > 0) { const k = sd * lobe(d / SWELL_W); if (k > 0) t += (w.swellDepth - t) * k; }
  if (fd > 0) { const k = fd * lobe((d - fc) / FACE_W); if (k > 0) t += (w.faceDepth - t) * k; }
  if (bw > 0 && fa > 0) {
    // The band runs from the crest shoreward, with a soft seaward edge and a
    // harder shoreward one — the way round a real foam edge reads, and the
    // same asymmetry beach-draw.js already draws at the shore.
    let k = 0;
    if (d >= -bw * BAND_RAMP_IN && d <= bw * (1 + BAND_RAMP_OUT)) {
      if (d < 0) k = smooth(1 + d / (bw * BAND_RAMP_IN));
      else if (d > bw) k = 1 - smooth((d - bw) / (bw * BAND_RAMP_OUT));
      else k = 1;
    }
    t *= 1 - fa * k;
  }
  return clamp01(t);
}

// --- SEVERAL WAVES AT ONCE --------------------------------------------------
// THE ONE PLACE A WAVE BECOMES TONE. Walked SEAWARD FIRST, each wave laid over
// what is already there, so the most shoreward wave wins where two overlap —
// a painter's order, which is what "a nearer band of foam hides the water
// behind it" means in a plan view. Several waves alive at once is the NORMAL
// state and not an edge case: measured per column, the reference carries a
// mean of 1.3 to 3.4 separate bright bands with 33-96% of columns carrying two
// or more.
//
// SORTING IS THE CALLER'S, ONCE PER FRAME, NOT ONCE PER SAMPLE. `waves` must
// already be in seaward-first order; `sortWaves` is the one owner of what that
// means and the renderer calls it once.
export function sortWaves(waves) {
  return waves.slice().sort((a, b) => (a.crest0 + a.speedS * a.age) - (b.crest0 + b.speedS * b.age));
}

export function waveField(waves, u, s, base) {
  let t = base;
  for (let i = 0; i < waves.length; i++) t = waveToneAt(waves[i], u, s, t);
  return t;
}

// --- THE RECORD -------------------------------------------------------------
// Built ONCE, from the energy, and never touched again. `steepS`, `bandFadeS`,
// `swellLeadS` and `life` are DERIVED from the numbers above rather than drawn
// separately, so a wave cannot be handed a lip that outlasts its own band.
export function makeWave({ rand, energy = 0, waterline = 0.40, samples = 160 }) {
  const e = clamp01(energy);
  const breakS = BREAK_S[0] + (BREAK_S[1] - BREAK_S[0]) * e;
  const peelS = rand.range(PEEL_RANGE[0], PEEL_RANGE[1]);
  const speedS = TRAVEL_S * rand.range(0.85, 1.20);
  const swellLeadS = SWELL_LEAD_S * rand.range(0.8, 1.15);

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
    bandFadeS: rand.range(1.2, 2.4),
    faceDepth: FACE_TONE[0] + (FACE_TONE[1] - FACE_TONE[0]) * e * rand.range(0.8, 1.15),
    swellDepth: SWELL_TONE[0] + (SWELL_TONE[1] - SWELL_TONE[0]) * e,
    swellLeadS,
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
