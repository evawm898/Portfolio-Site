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
TRUE_COURSES_PER_INCH_02 = None  # no vertical ruler in this photo

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
TRUE_WALES_PER_INCH_07 = 5.0   # AI-estimated, human-verified (not hand-counted)
TRUE_COURSES_PER_INCH_07 = None  # no vertical ruler in this photo

# knit_sample_08.jpg -- gray/olive tweed-flecked stockinette. One horizontal
# ruler only, unit printed directly on the ruler ("inch").
PX_PER_INCH_08 = 346.0
TRUE_WALES_PER_INCH_08 = 4.5   # AI-estimated, human-verified (not hand-counted)
TRUE_COURSES_PER_INCH_08 = None  # no vertical ruler in this photo

# knit_sample_09.jpg -- light gray stockinette. One vertical tape measure
# only (confirmed inches, "60in" printed on tape) -- measures courses, not
# wales; the mirror-image situation to 02/07/08.
PX_PER_INCH_09 = 187.0
TRUE_WALES_PER_INCH_09 = None    # no horizontal ruler in this photo
TRUE_COURSES_PER_INCH_09 = 7.6   # AI-estimated, human-verified (not hand-counted)
