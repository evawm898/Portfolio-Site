"""
Ground truth for the knit_sample_01/02/05/06/07/08/09 fixtures (tests/fixtures/),
in the same PX_PER_INCH / TRUE_..._PER_INCH constant style as the real_jersey_sample.jpg
and sarahmaker-knitting-gauge.jpg fixtures (see test_phase_consistency.py and
test_wale_scoring_weights.py).

IMPORTANT PROVENANCE DIFFERENCE from those two: the jersey and teal fixtures'
ground truth was independently hand-counted by a person, with the detector's own
output never consulted. The values below were NOT independently hand-counted.
They were produced by Claude visually estimating stitch/row spacing against
each photo's own ruler (calibration read directly from ruler tick pixel
positions, never from a detector run against these images), then corrected
over several rounds by a human (the project owner) looking at the same
annotated images and telling Claude which count was right. The detector in
analysis/gauge_analysis.py was never run against these fixtures at any point
during this estimation -- the numbers are ruler-and-eye-derived, not
detector-derived -- but "AI-estimated, human-verified" is a meaningfully
weaker provenance than "independently hand-counted from the physical object,"
and these should not be upgraded to that status without a real hand count.

Do not treat these as validated ground truth for accuracy claims the way
real_jersey_sample.jpg/sarahmaker-knitting-gauge.jpg are used -- see
README.md's "Investigated and rejected: user-anchored template matching"
section for why an independent, non-circular ground truth matters here.
Suitable for structural/regression use (e.g. sanity-checking that a change
doesn't wildly reorder these fixtures' relative gauges); not yet suitable
as an accuracy benchmark on its own.

knit_sample_03.jpg and knit_sample_04.jpg are deliberately excluded:
03's only recorded figure (README, ~5.7 WPI) is itself circular -- back-derived
from the detector's own autocorrelation output plus a plausibility argument,
not an independent count of any kind. 04 is pooled variegated yarn where
individual stitches are not reliably countable by eye at color transitions.

No calibration constant is given for an axis with no ruler in that photo --
`None` means "not measurable from this photo," not "not yet measured."

SECOND PASS -- transposed calibration. For 02, 07, 08, and 09 (each of which
only had a ruler along one axis), the same px/inch was reused for the other
axis: image scale is a property of the photo, not of the ruler's orientation,
so a ruler along one axis calibrates both -- PROVIDED the shot is square to
the fabric (checked: each ruler's own tick spacing was consistent to within
~2% across its full length, no sign of perspective tilt) and the fabric is
flat (checked per-fixture below). A value derived this way is marked
"transposed calibration" in its comment, on top of the existing "AI-estimated,
human-verified" provenance note -- two independent reasons to keep these a
step below the jersey/teal ground truth, not one.

Two of the four candidates failed a check and were left blank rather than
recorded:
  - knit_sample_02's missing axis (courses) passed both checks (square ruler,
    flat fabric) but turned out to be unmeasurable anyway: the fabric is
    soft-focus at the pixel level (see the wale comment below), and that
    blur turned out to affect row texture at least as badly as column
    texture -- checked directly at native zoom in two different regions,
    both showed smooth color gradient with no resolvable row structure at
    all. Left blank for a different reason than "no ruler," so it's
    recorded as its own comment rather than a bare None.
  - knit_sample_07's missing axis (courses) failed the flatness check
    outright: this fabric is still on the needles, pinned mid-row under
    working tension, not blocked or relaxed -- row spacing there reflects
    on-needle tension, not resting gauge. Left blank rather than transposed.

THIRD PASS -- knit_sample_07's WALE axis excluded too. Diagnosing a large
(+39.7%) detector error, six independent crops (varying distance from the
needle, from the pin row, from the ruler) agreed with EACH OTHER to within
~9% while disagreeing with the recorded 5.0 WPI estimate by +31% to +40% --
not a harmonic split, not ROI noise, but the fabric and the eyeballed
estimate disagreeing while the detector is internally consistent. This
swatch is pinned flat into a blocking-style setup while still attached to
the working needles (visible in the photo) -- genuinely under tension, not
resting -- and the 5.0 WPI figure was itself eyeballed off that same
tensioned photo, with no independent number to check it against. Excluded
entirely rather than corrected: this photo has no stable resting gauge to
serve as ground truth for either axis. See README.md's investigation
writeup for the full crop-by-crop data.
"""

# knit_sample_01.jpg -- light blue stockinette in a 4in gauge-tool window.
# Calibration: the tool's own printed ruler, both axes, 333 px/inch (the
# window measured out to a very close 1332x1333px square, confirming the
# tool is genuinely a 4in x 4in square and one calibration serves both axes).
PX_PER_INCH_01 = 333.0
TRUE_WALES_PER_INCH_01 = 3.8   # AI-estimated, human-verified (not hand-counted)
TRUE_COURSES_PER_INCH_01 = 5.7  # AI-estimated, human-verified (not hand-counted)

# knit_sample_02.jpg -- blue variegated/ombre stockinette, one horizontal tape
# measure only. Fabric is soft-focus at the pixel level (confirmed at native
# resolution, not a display artifact) -- lower confidence than the others.
PX_PER_INCH_02 = 1187.0
TRUE_WALES_PER_INCH_02 = 4.0   # AI-estimated, human-verified (not hand-counted)
# Second pass: square/flatness checks both passed, so PX_PER_INCH_02 is valid
# for courses too -- but the row direction turned out just as unresolvably
# blurry as wale was (checked directly at native zoom, two regions, no row
# texture visible at all). Left None because it's genuinely uncountable in
# this photo, not because no ruler exists for it.
TRUE_COURSES_PER_INCH_02 = None

# knit_sample_05.jpg -- mint green stockinette, dual ruler (horizontal +
# vertical, same Westcott ruler product, ~320 px/inch both axes).
PX_PER_INCH_05 = 320.0
TRUE_WALES_PER_INCH_05 = 4.7    # AI-estimated, human-verified (not hand-counted)
TRUE_COURSES_PER_INCH_05 = 6.7  # AI-estimated, human-verified (not hand-counted)

# knit_sample_06.jpg -- teal/blue textured knit. TWO rulers, different units
# and different physical scales: the wale (horizontal) ruler is in cm, the
# course (vertical, left-edge) ruler is in inches -- easy to miss, and was
# missed on the first pass. Do not assume one calibration serves both axes
# on this fixture.
PX_PER_CM_06_WALE = 184.4       # horizontal ruler, cm
PX_PER_INCH_06_COURSE = 433.5   # vertical ruler, inches
TRUE_WALES_PER_INCH_06 = 3.8    # AI-estimated, human-verified (not hand-counted)
TRUE_COURSES_PER_INCH_06 = 5.2  # AI-estimated, human-verified (not hand-counted)

# knit_sample_07.jpg -- purple/lavender stockinette, still on the needles.
# One horizontal tape measure only (confirmed inches, "60in" printed on tape).
PX_PER_INCH_07 = 423.0
# THIRD PASS -- wale excluded too, not just course. Six independent,
# non-overlapping crops (different distances from the needle, from the pin
# row, from the ruler) agreed with EACH OTHER to within ~9% (60-64px) while
# disagreeing with this eyeballed 5.0 WPI estimate by +31% to +40% -- not a
# harmonic split (84.6px expected vs ~60-64px measured is ~28-33%, not a
# clean 2x/0.5x), and not ROI noise either, since independent crops across
# the width and at multiple distances from the needle land on the same
# number. That combination reads as the fabric agreeing with itself, not
# the detector disagreeing with itself: this swatch was photographed
# pinned flat with multiple T-pins into a blocking-style setup while still
# attached to the working needles, under real tension, not resting or
# blocked. This 5.0 figure was itself eyeballed off that same tensioned
# photo, so there's no independent number to trust it against. Excluded
# rather than recorded: this photo does not have a stable resting gauge to
# measure, the same disposition its course axis already got below.
TRUE_WALES_PER_INCH_07 = None
# Still on the needles, pinned mid-row under working tension, not blocked
# or relaxed -- row spacing here would reflect on-needle tension, not
# resting gauge.
TRUE_COURSES_PER_INCH_07 = None

# knit_sample_08.jpg -- gray/olive tweed-flecked stockinette. One horizontal
# ruler only, unit printed directly on the ruler ("inch").
PX_PER_INCH_08 = 346.0
TRUE_WALES_PER_INCH_08 = 4.5   # AI-estimated, human-verified (not hand-counted)
# Second pass: square/flatness checks passed; transposed PX_PER_INCH_08 to
# the course direction (fabric is sharp here, unlike 02 -- confirmed at
# native zoom). AI-estimated, human-verified, AND transposed calibration.
TRUE_COURSES_PER_INCH_08 = 6.9

# knit_sample_09.jpg -- light gray stockinette. One vertical tape measure
# only (confirmed inches, "60in" printed on tape) -- measures courses, not
# wales; the mirror-image situation to 02/07/08.
PX_PER_INCH_09 = 187.0
# Second pass: square/flatness checks passed; transposed PX_PER_INCH_09 to
# the wale direction (fabric is sharp here, confirmed at native zoom).
# AI-estimated, human-verified, AND transposed calibration.
TRUE_WALES_PER_INCH_09 = 5.1
TRUE_COURSES_PER_INCH_09 = 7.6   # AI-estimated, human-verified (not hand-counted)
