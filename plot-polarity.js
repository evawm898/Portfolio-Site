// plot-polarity.js — white ink on black, or black ink on white, and the one
// transfer that makes those two the same picture.
//
// WHY THIS IS NOT A COLOUR SWAP. The screen draws white ink on black under
// ADDITIVE blending: crossings brighten toward white because the fragments
// genuinely add, and that glow is most of what makes the drawing read. Invert
// the colours alone and you get a white rectangle — additive ink on a white
// ground saturates on the first line. The symmetric operation is MULTIPLY, so
// crossings darken toward black the way they currently brighten toward white.
// Polarity therefore touches the render path, and this file is the law.
//
// MULTIPLY AND NOT SUBTRACTIVE, and the two are the same operation
// reparameterised — `dst * src` against `dst * (1 - src)` — so nothing is given
// up either way and the question is only which quantity the material colour
// carries. Under MULTIPLY it carries the ink's TRANSMITTANCE, which is exactly
// what a single line looks like on white paper. Two things follow:
//   * it mirrors the additive calibration term for term. "The brightest pixel a
//     single fully-covered line can produce is exactly sRGB(brightness)"
//     becomes "the darkest pixel it can produce is exactly sRGB(transmittance)".
//   * the accent's own hex still draws TEAL. Under subtractive, teal INK on
//     white paper prints as teal's complement (a dull red), so the colour in
//     the panel would not match the colour on the canvas — and "the highlight
//     is a hue, never a brightness" is the one signal plot.js cannot spend.
// Either choice needs exactly one inversion; multiply puts it on a SCALAR (the
// ink level) where subtractive would put it on every HUE on the page.
//
// THE TWO DEFAULTS DIFFER ON PURPOSE, AND THE REASON IS THE BLEND, NOT TASTE.
// `levelDefault` is 30% on screen and 16% in print. That is a RULING (Eva,
// Sep 10) and the asymmetry is structural: ADDITIVE SATURATES AT WHITE, so past
// a couple of crossings every deeper crossing lands on the same pixel and the
// tonal range is spent — which is exactly the glow the screen default was
// approved for. MULTIPLY APPROACHES BLACK ASYMPTOTICALLY and never saturates,
// so crossings keep separating and a level tuned for the screen throws that
// away. Measured on the shipped grid, at the framing the sheets use:
//
//   polarity       ink crushed to the far end     greys carrying the ink
//   screen 30%     36.3%  (the approved glow)     7      <- the look, ruled
//   print  30%     24.8%                          16     <- inherited, wrong
//   print  16%     17.3%                          20     <- tuned, shipped
//   print   8%      8.4%                          23     <- line too pale, 175/255
//
// The pick is print-native: 16% is the DARKEST level still on the ladder
// plateau (occupancy holds to 16% and falls from 18%), so it is the most
// legible single line — 144 of 255 — that has not begun trading away crossing
// separation. Below 14% the line goes pale (158 at 12%, 175 at 8%) and buys no
// more ladder.
//   AND A FULLY UNCRUSHED PRINT IS NOT REACHABLE ON THIS DRAWING, which is why
// the tuning is HOW MUCH rather than WHETHER: the ink reaches black after 10
// crossings at 16% and after 13 even at 8%, and a 28-petal bloom stacks far
// more than that at its centre. Do not read the residual black core as a defect
// to tune out.
//   DO NOT "FIX" THE TWO NUMBERS INTO ONE. Matching them is the thing that was
// ruled against, in both directions: the screen number in print flattens a
// quarter of the ink, and the print number on screen would put the glow out.
//
// EVERYTHING HERE HAPPENS IN sRGB-ENCODED VALUES, AND THAT IS MEASURED, NOT
// ASSUMED. LineMaterial's own fragment shader orders its chunks
// tonemapping -> colorspace -> fog -> premultiplied_alpha, so the colour is
// converted to the output space BEFORE the blender and before the fog sees it.
// Blending and fogging are therefore display-space operations here, which is
// the whole reason the two regimes are not symmetric on their own:
//
//     level 0.30   n=1   n=2   n=3   n=4   n=6  n=10   saturates
//     screen ink   149   255   255   255   255   255   at n=2
//     print  ink    37    69    96   119   156   202   never
//
// A shared raw slider value is a QUARTER of the ink for a single line, and the
// screen clips after two crossings where the print has range to spare.
//
// SO THE SLIDER KEEPS ONE MEANING AND THE POLARITY APPLIES A TRANSFER, rather
// than the page carrying two sets of defaults. `inkLevel` is "a single line's
// ink" in both regimes, and `inkRGB` is what makes that true:
//
//   * ONE LINE LANDS AT THE SAME INK EITHER WAY. `screen px + print px === 255`
//     at every position of the control — 63/192, 108/147, 149/106, 196/59,
//     231/24, 255/0. That is an identity on the values this file computes, not
//     a tolerance. (The GPU's own sRGB encode uses pow(x, 0.41666) where this
//     file uses 1/2.4, so the two agree to about the fifth decimal and the
//     PIXEL figure is reported rather than asserted to the byte.)
//   * THE DEPTH DIM IS THE SAME LAW IN BOTH, algebraically rather than by
//     arrangement: three's fog is mix(colour, fogColour, f), and fading a
//     transmittance t toward 1 gives ink 255(1-f)(1-t) exactly as fading a
//     level s toward 0 gives 255 s (1-f). A far line draws at (1-f) times a
//     near line's ink in both regimes, so only the fog's COLOUR flips.
//     A BLACK FOG UNDER MULTIPLY WOULD DRIVE FAR LINES TOWARD dst*0 = BLACK,
//     i.e. the depth dim would make the most distant lines the heaviest thing
//     on the page. Nothing in a blend-mode check can see that; it has its own.
//   * WHAT IS LEFT ASYMMETRIC IS THE CROSSINGS, and it is irreducible: additive
//     clips and multiply does not. Print holds six distinguishable levels
//     (149 211 237 248 252 254) where the screen holds two (149, then white).
//     That is in the GOOD direction, so it is reported on the panel and not
//     tuned away.
//
// THE GROUND IS ALSO THE FOG, one field, because "what a line fades into" and
// "what is behind the drawing" are the same colour in both regimes by
// construction. There is no second place to get one of them wrong.

export const POLARITIES = ['screen', 'print'];
export const DEFAULT_POLARITY = 'screen';

/* The sRGB transfer, both ways. Written out rather than taken from three so
   this module is importable in Node — the gate drives the transfer over values
   whose answer can be written down, because on the real grid a wrong transfer
   still draws an entirely plausible picture. */
export const srgbEncode = v =>
  (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
export const srgbDecode = v =>
  (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

const clamp01 = v => Math.min(1, Math.max(0, v));

/* WHAT EACH POLARITY IS. `blend` is a NAME and not a three constant, for the
   same reason the transfer is written out here: this file has to import in
   Node. plot.js owns the one map from these names to THREE's own constants.

   `ink` is the colour a full-strength line READS AS on this polarity's ground,
   in sRGB display space — white on black, black on white. It is what makes
   `hueRGB` below need no special case for the drawing's own material: the
   drawing is simply ink at the accent-free hue. */
export const POLARITY = Object.freeze({
  screen: Object.freeze({
    id: 'screen', blend: 'additive', ground: 0x000000, groundIsWhite: false,
    ink: Object.freeze([1, 1, 1]), label: 'white on black',
    levelWord: 'brightness', groundWord: 'black',
    // 30% — Eva, Sep 7 on deploy-preview-182, and REAFFIRMED Sep 10 against the
    // print artefact: "the blowout at the center is the glow, and it was in what
    // I approved. That's the look." See THE TWO DEFAULTS DIFFER above.
    levelDefault: 0.30,
  }),
  print: Object.freeze({
    id: 'print', blend: 'multiply', ground: 0xffffff, groundIsWhite: true,
    ink: Object.freeze([0, 0, 0]), label: 'black on white',
    levelWord: 'darkness', groundWord: 'white',
    // 16% — tuned on the PRINT artefact (Sep 10), never matched to the screen
    // number. See THE TWO DEFAULTS DIFFER above for the measurement.
    levelDefault: 0.16,
  }),
});

/* THE DEFAULT LEVEL FOR A POLARITY, and the one place either number lives. */
export const levelDefaultFor = polarity => polarityOf(polarity).levelDefault;

export const isPolarity = p => Object.prototype.hasOwnProperty.call(POLARITY, p);
export const polarityOf = p => (isPolarity(p) ? POLARITY[p] : POLARITY[DEFAULT_POLARITY]);

/* THE DRAWING'S OWN MATERIAL COLOUR, LINEAR, at a given single-line ink level.
   SCREEN IS THE SHIPPED EXPRESSION UNCHANGED — `setScalar(level)` — and that is
   deliberate: this file must not move the picture /plot already ships. PRINT is
   the transmittance whose sRGB encoding is 1 - sRGB(level), which is the whole
   transfer in one line. */
export function inkRGB(polarity, level) {
  const L = clamp01(level);
  if (polarityOf(polarity).blend === 'multiply') {
    const t = srgbDecode(1 - srgbEncode(L));
    return [t, t, t];
  }
  return [L, L, L];
}

/* WHAT A SINGLE FULLY-COVERED LINE PUTS IN THE FRAMEBUFFER, 0..1 in display
   space, and how far that is from the ground. The calibration the additive
   check rests on, stated once for both regimes so neither side of it can drift:
   on screen anything ABOVE `pixel` is accumulation, in print anything BELOW it
   is. */
export function singleLinePixel(polarity, level) {
  const rgb = inkRGB(polarity, level);
  return srgbEncode(rgb[0]);
}
export const singleLineInk = (polarity, level) =>
  Math.abs(singleLinePixel(polarity, level) - (polarityOf(polarity).groundIsWhite ? 1 : 0));

/* A HUE AT THE DRAWING'S OWN INK LEVEL — the selected petal's material, and the
   one place the highlight's "same exposure, different hue" rule is written.
   `hue` arrives LINEAR (it comes from a hex through three's own conversion).

   EACH ARM NORMALISES IN THE SPACE ITS OWN INVARIANT IS STATED IN, which is why
   this is not one expression with a flag. On SCREEN the invariant is "its
   brightest channel sits at exactly the level a white line does", and that is
   the shipped linear-space normalisation, kept verbatim. In PRINT the invariant
   is "its strongest ABSORPTION is exactly a black line's", which is a statement
   about ink on paper and so is normalised on absorbances in display space.
   Both say the same thing — the highlight is a hue and never a level. */
export function hueRGB(polarity, hue, level) {
  const L = clamp01(level);
  if (polarityOf(polarity).blend !== 'multiply') {
    const peak = Math.max(hue[0], hue[1], hue[2]) || 1;
    return [hue[0] * L / peak, hue[1] * L / peak, hue[2] * L / peak];
  }
  const disp = hue.map(c => srgbEncode(clamp01(c)));
  const absorb = disp.map(c => 1 - c);
  const peak = Math.max(absorb[0], absorb[1], absorb[2]);
  const want = srgbEncode(L);
  // A hue with nothing to absorb (white) cannot be ink on white paper, so it
  // falls back to the drawing's own ink rather than drawing nothing at all.
  if (!(peak > 0)) return inkRGB(polarity, L);
  return absorb.map(a => srgbDecode(clamp01(1 - a / peak * want)));
}

/* HOW MANY DISTINGUISHABLE LEVELS THE CROSSINGS ACTUALLY REACH, from the same
   arithmetic — so the panel can print the asymmetry rather than describe it,
   and the number moves when the control does. `n` crossings of a full line. */
export function crossingInk(polarity, level, n) {
  const s = Math.round(singleLinePixel(polarity, level) * 255);
  if (polarityOf(polarity).blend === 'multiply') {
    let dst = 255;
    for (let i = 0; i < n; i++) dst = Math.round(dst * s / 255);
    return 255 - dst;
  }
  return Math.min(255, n * s);
}
