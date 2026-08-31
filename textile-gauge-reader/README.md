# Automatic Textile Gauge Reader — V0

An experimental computer-vision tool for measuring knitted-textile gauge
(wales per inch / courses per inch) from a single photograph.

**V0 uses classical computer vision only** — grayscale conversion, local
contrast normalization (CLAHE), Sobel edge/texture enhancement, 1D signal
projection, autocorrelation, loop-center blob detection, and harmonic
disambiguation. There is no AI/ML model in this version.

## What "gauge" means here (and a real bug this fixed)

A **wale** is a vertical column of complete, intermeshed knit loops;
wales-per-inch is the horizontal center-to-center spacing between
adjacent columns. A **course** is a horizontal row of complete loops;
courses-per-inch is the vertical center-to-center spacing between
adjacent rows. Critically, that spacing has to be measured between
*complete loop repeats* — not between a loop's two legs, one yarn edge
and its own opposite edge, or any other sub-feature of a single loop.

Pure 1D edge/autocorrelation analysis has no notion of "loop" at all —
just "some periodic edge pattern" — so it's structurally vulnerable to
locking onto a harmonic of the true repeat: typically half of it (e.g.
one leg of a face-knit loop's V-shape, which produces its own regular
edge every half-loop) or, less commonly, double it (skipping every
other loop). Relabeling the output ("wales" ↔ "courses") or hard-coding
a multiplier doesn't fix this — it's a difference in what the algorithm
is actually locking onto, and would produce a different, uncorrectable
error on a different photo.

The pipeline (originally shipped as `ALGORITHM_VERSION`
`cv-clahe-sobel-autocorr-loopcenter-density-foldpair-v0.4`; see
[cv-v0.3](#cv-v0.3-a-structural-redesign-of-the-scoring-not-another-bolt-on-check)
below for the current version string and the redesign that replaced this
naming scheme) addresses this with a second, independent signal: an approximate 2D
loop-center detector (a Difference-of-Gaussians blob response tuned to
loop scale, since a genuine loop center is a compact, roughly isotropic
highlight, unlike a loop's more elongated, edge-like legs). For each
axis, the coarse autocorrelation period is checked against its 0.5x/1x/2x
harmonics, and whichever one the loop-center evidence actually supports
is used — never an arbitrary multiplier, and only when the loop-center
evidence itself is internally consistent enough to trust (a noisy/
over-detected point cloud is recognized as such and ignored, falling
back to the autocorrelation estimate rather than "correcting" a
plausibly-already-right answer with garbage).

**v0.3 adds a third check**, after a real photo showed the first two
signals could still both be fooled together: the loop-center detector's
*scale* is itself seeded from the coarse autocorrelation period, so on
some real fabric that "independent" evidence isn't fully independent — it
can inherit the exact same too-fine harmonic lock the check was supposed
to catch, and confidently confirm a wrong answer (e.g. reporting twice
the true wale count, each half of a real wale counted as its own). v0.3
cross-checks whole-ROI loop **density**: N detected loop centers spread
across an ROI of area A should occupy roughly `N × (wale_pitch ×
course_pitch)` of that area, one repeat cell per loop — a constraint that
doesn't share the scale-seeding dependency. When the reconciled cell area
doesn't match that, it looks at whether either axis's own already-computed
0.5x/1x/2x candidates contains a value that resolves the mismatch (never a
value that axis's own harmonic analysis hadn't already flagged as
plausible, and never the other axis's candidate set). Every candidate
considered and why the final one was picked — including a density
correction, when one happens — is exposed via the **Detection Details**
panel on the Results screen (see below), along with an optional **Show
loop centers** overlay toggle so you can visually check the detector
against the actual knit structure — success means the overlay lines line
up with real complete loops, not just that the final numbers look
plausible.

**v0.4 adds a fourth check, scoped to the wale axis only**, after a real
jersey photo showed wale count still roughly doubled (~9.55 predicted vs.
~5 actual wales/in) even with v0.3's density check in place. On that
photo the loop-center *detector itself* was apparently finding one blob
per V-shaped loop's **leg**, not one per complete loop — so its scale,
its pitch, and the density it implies were all biased the same
(too-fine) direction together, and cross-checking three mutually-
correlated signals against each other doesn't catch a bias they all
share. v0.4's **fold-consistency** check is decoupled from that whole
loop-center pipeline: it stacks the wale-direction 1D signal into
consecutive chunks at each candidate period and measures how similar
those chunks are to each other. A genuine complete-loop repeat
reproduces nearly the same waveform shape every period (chunks
correlate strongly); a period that instead isolates one leg of a V
alternates between the two, structurally different, legs — so its
chunks correlate poorly, even though plain autocorrelation can show
just as strong a peak there (autocorrelation only measures energy at a
lag, not whether the repeated unit is the same shape each time). A
candidate fold-consistency flags as self-inconsistent is excluded from
ever being selected — including by the v0.3 density check, which could
otherwise "confirm" it right back using loop-center counts that
inherited the same bias. This is deliberately scoped to wale only
(course periodicity doesn't have a V-leg-symmetry failure mode, and this
keeps course detection completely unchanged) and is grounded directly in
loop anatomy — a face-knit V's two legs are the specific structural
feature it's checking for, not a generic signal-processing trick.
Fold-consistency scores per candidate are also exposed in **Detection
Details**, alongside the harmonic relationship and normalized
wales(courses)/in at the current calibration.

This is a heuristic V0.4 improvement, not full loop segmentation, and
it isn't assumed to be "solved" — see
[Ground Truth / Correction System](#ground-truth--correction-system)
for how to build an evaluation set against real photos and decide
whether/how to tune it further.

## cv-v0.3: a structural redesign of the scoring, not another bolt-on check

The v0.2–v0.4 checks above (density cross-check, fold-consistency) were
each a targeted patch for one specific way the *previous* version got
fooled — and on the next real photo, the wale count was still roughly
double the true value (~9.55 vs. ~5 wales/in), because the underlying
architecture was still fundamentally "trust one autocorrelation estimate
per axis, then try to catch it after the fact." `cv-v0.3` (the algorithm
version string resets to `cv-v0.3` here — it's a new architecture, not a
"v0.5") rebuilds candidate selection around one unified, weighted scoring
system instead of a chain of independent patches:

- **2D periodicity as additional evidence.** Alongside the existing 1D
  autocorrelation (per axis), a single whole-ROI 2D autocorrelation
  (FFT-based Wiener–Khinchin) is computed once and sampled per candidate
  by bilinear interpolation — a genuine full-loop repeat should show up
  as periodicity in *both* the 1D projection and the full 2D structure;
  a sub-loop feature (a yarn leg/edge) is far more likely to show up
  strongly in one but not the other.
- **Multi-patch regional consensus.** Each axis's signal is sliced into
  several overlapping bands, each independently autocorrelated, and the
  per-candidate score rewards agreement with the robust (median-based)
  consensus across those bands — a real repeat should hold up across
  sub-regions of the same fabric; a fluke shouldn't. Wide disagreement
  between bands also feeds an axis-level *instability* penalty (distinct
  from any single candidate's score) that lowers confidence, since it's
  the same signature as spacing drifting across the ROI (mild perspective
  distortion, an uneven surface).
- **Rotation normalization.** Before periodicity analysis, the ROI is
  internally rotated (small bounded-angle search, maximizing combined
  periodicity strength) so wales/courses are closer to vertical/
  horizontal — a few degrees of photo tilt no longer measurably degrades
  the period estimate. This is deliberately used *only* to seed a
  cleaner scalar period — all position/coordinate data (peaks, loop
  centers, the 2D autocorrelation itself) stays in the original,
  unrotated image coordinates, so the overlay never needs (and doesn't
  get) any inverse-rotation mapping.
- **One centralized, weighted scoring config** (`ScoringWeights` in
  `analysis/gauge_analysis.py`) combines all of the above — 1D
  autocorrelation, 2D support, structural (fold-consistency + loop-center
  pitch agreement) evidence, patch consensus, spacing regularity, and
  visible-repeat count — into one `evidence_score` per 0.5x/1x/2x
  candidate, weighted differently depending on the optional **Structure**
  selector (Jersey gives structural/V-shape evidence more weight; the
  default Unknown leans more on periodicity/consensus). No magic numbers
  scattered through the code — every weight and threshold lives in that
  one block.
- **Harmonic-ambiguity penalty, and why it must not decide the winner.**
  A separate penalty term flags when a candidate's raw autocorrelation is
  suspiciously close to a 0.5x/2x relative's — exactly the "P and 2P look
  alike" signature of a half-repeat lock-on — and is subtracted to
  produce a `final_score` used for **confidence**, not for picking the
  winner. This distinction matters: the penalty is symmetric (it reduces
  *both* members of a genuinely ambiguous pair by the same amount, so it
  can never change their relative order), but for a genuinely periodic
  signal, a true period P and its trivial double 2P are *always* going to
  autocorrelate similarly — that's guaranteed by periodicity, not
  ambiguity — so a candidate can rack up a large penalty purely from its
  double, while a completely unrelated, evidence-weak third candidate
  (not part of any ambiguous pair) pays no penalty at all. Selecting by
  post-penalty score let that unrelated weak candidate win by default;
  `cv-v0.3` selects by pre-penalty `evidence_score` instead (the penalty
  still lowers the winner's absolute, confidence-facing `final_score`).
  Both scores are exposed per candidate in **Detection Details**.
- **Explicit "uncertain" results.** When the top two scored candidates
  are within a small margin of each other, the result is flagged
  `status: "uncertain"` with a human-readable reason (e.g. "Competing 0.5x
  harmonic candidate scored nearly as well") — the UI still shows the
  best estimate (visually distinguished, not hidden), rather than always
  presenting a single confident number regardless of how close the call
  actually was.
- **Optional Structure control** (Jersey / Single Knit vs. Unknown,
  default Unknown) reweights structural (loop-center/V-shape) evidence
  higher for Jersey without building a full automatic knit-structure
  classifier — Rib/Interlock/Mesh are deliberately left for a future
  version.

None of this removes the v0.2–v0.4 checks described above — fold-
consistency and the density cross-check are still computed and still
feed into the unified score (as `structural_score`) — it replaces the
"chain of independent patches" architecture around them with one scoring
system that's easier to reason about and extend.

### A real-photo regression, and phase consistency as its fix

The first real photo run through `cv-v0.3` (a hand-knit jersey swatch,
ruler-calibrated, ~5 true wales/in and ~7.2 true courses/in — kept as
`tests/fixtures/real_jersey_sample.jpg`) surfaced two more problems:

1. **Course regressed.** The pre-`cv-v0.3` pipeline got course right on
   this photo (~6.87 c/in); the new evidence scorer picked a doubled
   period (~3.5 c/in) instead, and `_cross_check_density` (which could
   substitute *either* axis's own candidate to resolve a whole-ROI
   density mismatch) made it worse by "fixing" the correct course value
   to compensate for wale's separate, still-unresolved error. Fixed by
   restoring the older, proven per-axis pipeline
   (`_analyze_direction`) as course's actual SELECTION mechanism — the
   v0.3 scorer still runs alongside it purely to supply the rich
   per-candidate diagnostics shown in Detection Details — and by making
   `_cross_check_density` wale-only, so it can never again overwrite a
   correct course pick.
2. **Wale's half-period ambiguity was a scoring problem, not a
   candidate-generation problem.** Diagnostics confirmed the correct
   ~4.75–5 WPI candidate was already being generated every time — it
   just didn't reliably *win* against the ~9.5 WPI half-period harmonic,
   and which one won flipped depending on exact ROI placement/size.
   Every periodicity-strength evidence term (autocorrelation, 2D
   support, patch consensus) is mathematically incapable of telling them
   apart: a periodic half-feature (e.g. one leg of a V-shaped loop) is
   *just as periodic* as the true full-loop repeat.

**Phase consistency** (`_phase_consistency_evidence`) closes that gap:
for a candidate's own generated marker positions, it extracts a narrow
local image patch at each one, standardizes it (so overall
brightness/contrast differences between markers don't matter — only the
texture PATTERN does), and compares them pairwise. A genuine full
repeat's markers should look like each other every time
(`phase_consistency`, the mean adjacent-marker similarity); a
half-period harmonic instead alternates between two visually distinct
phases (e.g. a V's left leg vs. right leg) — caught by comparing
same-parity markers (1↔3, 2↔4, …) against adjacent ones (1↔2, 2↔3, …):
if same-parity markers agree much more than adjacent ones do, that's the
"A B A B" signature of a half-period harmonic
(`alternating_phase_score`).

Unlike the harmonic-ambiguity penalty (which is deliberately excluded
from deciding a winner — see `_harmonic_penalty`'s docstring for why a
symmetric pairwise comparison can't be trusted to), phase consistency
and its alternating-phase penalty ARE part of `evidence_score` and do
get to decide which candidate is selected: each is a genuine,
self-contained, per-candidate structural measurement, not a comparison
between two candidates that's mathematically a wash. `ScoringWeights`
gives phase consistency the largest single weight of any positive
evidence term for this reason (and correspondingly reduced
`patch_consensus`'s weight — real-photo diagnostics showed sub-region
patch agreement isn't as independent as it looks, since each patch runs
its own autocorrelation on the same texture and can inherit the same
half-period bias in every patch at once).

Result on the real photo, tested across 6 differently-placed/sized ~1in²
ROIs: the correct wale candidate now wins in all 6 (up from 3/6 before
phase consistency), and course remains correct in 5/6 (the one failure
is an excessively large whole-fabric-strip ROI — a known, deliberately
out-of-scope-for-now limitation; see Known V0 limitations). Confidence
is not artificially inflated: these results are still often reported as
`uncertain` when the harmonic-ambiguity penalty (a genuine, expected
mathematical property of periodic signals, not a bug) keeps the
absolute margin modest — the UI surfaces that honestly (see the LOW
CONFIDENCE treatment below) rather than presenting a resolved-looking
number.

### Simplified Results UI + a hidden Developer diagnostics mode

The Results panel accumulated a lot of algorithm-internal detail across
the rounds above (candidate periods, evidence/phase scores,
autocorrelation values, uncertain-reason text) — useful while developing
the detector, not for reading a gauge measurement. The normal-user-facing
Results panel now shows only: **Wales/inch**, **Courses/inch**, one
**Confidence** word (High/Medium/Low — the weaker of the two axes, forced
to Low whenever either is flagged `uncertain`), optional secondary wale/
course spacing in mm, the visual overlay, and — when confidence is Low —
a single short message ("Low confidence — verify the detected loops.").
No harmonic/scoring terminology in that view.

Everything that used to live there (per-axis confidence percentages,
detected-position counts, uncertain reasons, Detection Details' full
candidate breakdown, "Show loop centers") moved into a collapsed
**Developer diagnostics** section, off by default — same information as
before, just not front-and-center.

### Experimental: an explicit V-shape loop-center detector

Real-photo diagnostics established that the periodicity-based detector's
remaining wale ambiguity is fundamentally a *geometry* problem: nothing
in autocorrelation, 2D support, patch consensus, or even phase
consistency looks at SHAPE — they measure repetition and texture
consistency, not "does this look like a complete knit loop."
`analyze_loop_lattice_experiment` (in `analysis/gauge_analysis.py`'s
"Experimental" section) takes a different, explicit approach: look for
the geometric signature of a face-knit V-shape directly — two diagonal
yarn legs of opposite orientation converging toward a shared point
(`_v_shape_response_map`, signed diagonal gradient channels + a `min()`
of both sides' evidence, so a single strong edge on only one side — the
"just one yarn leg" false positive — doesn't register as a complete
loop).

**Second pass: row-banded search + column consensus.** A first version
searched the whole ROI indiscriminately and visibly over-detected (more
points than visible loops). It's now constrained by the EXISTING,
unmodified course detector's own row positions, passed in as
`course_rows_px` and used purely as a structural prior — V-shape search
only happens in a narrow band around each known course row, never the
whole ROI. Wale columns are then built from X-position CONSENSUS across
those rows (`_build_row_banded_lattice`): candidate x-positions across
all rows are clustered, and a column is only ACCEPTED if it has direct
evidence from at least `MIN_ROW_SUPPORT_FOR_COLUMN` (2) distinct rows —
a single stray detection anywhere can never invent a wale. Missing
detections are fine (a column can still be accepted from partial
row coverage); the lattice fills in "inferred" markers at the rows
where an accepted column had no direct hit, kept visually distinct
(hollow) from real detections (solid). Wale spacing comes from the
median center-to-center interval between accepted columns (N columns →
N−1 intervals, not N — worth stating explicitly since it's an easy
off-by-one to get wrong).

This is deliberately a **parallel, comparison-only path**: it does not
replace, feed into, or influence `analyze_gauge`'s own prediction, nor
does it modify course detection in any way — it only ever *reads* the
course detector's already-computed row positions (see
`test_experiment_does_not_affect_analyze_gauge_result` and
`test_analyze_loop_lattice_experiment_uses_real_course_detector_as_prior`).
Exposed as `loop_lattice_debug` in the `/analyze` response; the frontend
only shows it (a "Show detected loops" overlay — green solid = direct
detection, hollow orange = inferred, gold line = accepted column — plus
a comparison table) inside Developer diagnostics.

*(This "comparison-only, never touches the real result" description is
still exactly true for `analyze_gauge` and the single-ROI `/analyze`
endpoint. It stopped being the whole story once the multi-region
consensus arrived — see [Wale gauge from counted loop columns](
#wale-gauge-from-counted-loop-columns-not-a-raw-period) below for the
one place this detector's output now DOES feed into a real,
reported measurement.)*

**Honest result on the real jersey photo, tested across 5 nearby ~1in²
ROIs**: direct detections dropped from over-detecting everywhere to
being confined to course-row bands, and columns now require multi-row
support (typically 4–7 of 7 rows) rather than one-off detections. The
derived wale spacing is mixed, not yet reliable: loop-derived WPI came
out as 6.21, 4.68, 19.56 (a clear failure — one ROI produced far too
many spurious columns), 5.54, and 5.28 across the five ROIs — some
notably close to the true ~5 WPI (occasionally closer than the
periodicity detector's own ~4.6–4.9), one badly wrong. This is reported
as-is, not tuned to look better. Remaining known issues: (1) at least
one ROI over-detects severely, suggesting the response-map threshold or
NMS still isn't robust to some lighting/contrast regions; (2) the
"centered" ROI's column gaps are visibly uneven (one gap roughly double
the others), consistent with a real, plausible wale column being missed
between two accepted ones rather than a scale/harmonic error. Neither
has been patched by adjusting parameters against the known answer —
both are left as open, visible findings for the next pass.

### Multi-region measurement: propose, review, measure independently, cross-check

The single-crop workflow above has an inherent blind spot: one ROI can
fail for reasons that have nothing to do with the detector's logic —
uneven lighting, a fold, a stray shadow, an unlucky patch of fuzz — and
there was no way to tell "the detector is wrong" apart from "this one
crop happened to be bad." The multi-region workflow addresses that by
never trusting a single crop at all: propose several candidate areas,
let the user review and approve them, measure each one **completely
independently**, and only then combine the independent results into one
robust answer.

**Stage 1 — automatic proposal + human review** (`propose_measurement_
rois` in `analysis/gauge_analysis.py`, `POST /propose-rois`). Candidate
square windows are scored by a **generic** image-quality heuristic —
sharpness (Laplacian variance), local contrast (std-dev), texture
consistency (contrast uniformity across a coarse grid), periodicity
strength (the same 1D-autocorrelation primitive the real detector uses),
periodicity *consistency* (does the measured period agree across the
window's four quadrants, or does it drift the way a curl/wrinkle/stretch
would drift it?), and a brightness-extremity penalty. Deliberately
generic: nothing in the scorer knows what a ruler or a label looks like.
Those regions score low on their own merits — usually low periodicity,
often low texture-consistency or blown-out brightness — so a ruler gets
avoided without ever being named. Candidates are also hard-gated by a
local-variance-based fabric mask before they're even scored — a window
that dips into flat background, even briefly at one edge, is rejected
outright regardless of how good its aggregate stats look. A greedy
selection then picks well-separated, high-scoring candidates (bounded
overlap + a minimum center-to-center spacing) so the proposal spreads
across the fabric instead of clustering neighboring boxes together. **See
the "Stage 4" section below** for how the window sizing itself (originally
a single fixed ~0.75–1.0in target) and the region count (originally up to
6) both changed, and why.

Critically, the system **stops here** and does not analyze anything yet.
The frontend's step 3, "Review Measurement Areas," shows every proposed
box labeled (A/B/C…) over the photo and requires an explicit "Approve
Measurement Areas" click before analysis runs. Every box can be moved,
resized (Shift to keep it square, the same interaction as the original
single-ROI step), deleted, or reset to the original proposal; an "Add
Measurement Area" control lets a user draw their own region entirely
manually if they'd rather choose one themselves — manually-added areas
(course-colored, vs. teal for auto-proposed) are treated identically to
proposed ones from Stage 2 onward. The point, explicitly: *the computer
proposes, the human reviews, the computer measures* — never the computer
silently removing the human from the loop.

**Stage 2 — independent analysis + robust consensus** (`analyze_multi_
roi` + `_consensus_for_axis` in `analysis/gauge_analysis.py`, `POST
/analyze-multi`). Once approved, every region is analyzed by calling the
existing, unmodified `analyze_gauge()` **once per region, on that
region's own pixels only** — no region's pixels are combined with
another's, and no region's result is allowed to influence another
region's own detection. Only after every region already has its own
independent measurement does the consensus step run, separately for the
wale axis and the course axis (a region can be an inlier for one axis
and an outlier for the other):

1. A coarse **median** (never a mean) of all regions' values for that
   axis separates likely inliers (within ~1.25x of the median, in
   log-space) from outliers.
2. An excluded region's raw measurement is **never rewritten** to match
   the consensus — `per_roi` in the API response always carries that
   region's own untouched `analyze_gauge()` result, and the region is
   simply flagged `excluded` for that axis.
3. If an outlier's value is close to 2x or 0.5x the accepted median, its
   diagnostic `reason` says so ("consistent with a half-loop/sub-feature
   harmonic") — this is corroborating evidence shown to a human, **not**
   the rule that excluded it (the log-ratio tolerance check already did
   that); a non-harmonic deviation gets a plain "deviates from the
   regional consensus" reason instead.
4. The **final** value is a confidence- and quality-weighted median of
   the inliers only (`_weighted_median`) — still never an average, so a
   strong, confident region can't be outvoted by sheer count, but also
   never gets its exact value blended with anyone else's.
5. Confidence starts from the inliers' own weighted-average confidence
   and is scaled by how well they agree (tight agreement across 3+
   regions can pull it up toward what they already claim for themselves
   — never above it; loose agreement, or only one usable region, pulls
   it down). This makes confidence a genuine signal of *regional
   agreement*, not just one crop's self-reported certainty.

The final `wale`/`course` fields in the API response are ordinary
`AxisResult`s — same shape as the original single-ROI `/analyze` — so
the normal Results view (WALES/IN, COURSES/IN, one Confidence word,
spacing) needed no changes at all. A `multi_roi` field carries the full
diagnostics: every region's own independent measurement, and each axis's
consensus (which regions agreed, which were excluded and why, the
regional median and spread). The frontend surfaces a **small, collapsed-
by-default** "Measurement consistency" panel in normal Results (e.g. "6
regions analyzed — Wale: 4 of 6 agreed, 2 excluded as outliers") without
cluttering the primary numbers, plus a "Show measurement areas" toggle
that draws every approved box subtly over the final image. The full
per-region breakdown — including that region's own detected loop
centers, inferred wale columns/course rows from its own loop-lattice
experiment, WPI/CPI, confidence, and included/excluded status — lives in
Developer diagnostics' region selector, never the normal view.

**Original honest result on the real jersey photo** (6 auto-proposed
regions, 0.87in² each), from the first version of this consensus —
period-estimate-per-region, statistically combined, no counting yet:
course consensus landed close to the known ~7.2 CPI (7.28/in, from 4 of
6 regions; A and E were correctly excluded, one as a ~2x harmonic, one
as a ~0.5x harmonic). Wale consensus did **not** land close to the known
~5 WPI — it converged on ~9.5 WPI instead, because 4 of the 6 regions'
own independent `analyze_gauge()` calls happened to lock onto the same
half-loop harmonic (only regions A and B were close to the true value,
and got outvoted). This is a real, unflattering result, reported as-is
rather than tuned away: **robust cross-region statistics cannot
distinguish "the true value" from "a majority of independent detectors
sharing the same systematic error"** — no purely statistical consensus
method can, without an additional prior. What the system got right is
that it never claimed false certainty about it: wale confidence came out
at 23% (Low), correctly flagging the number as unreliable and worth
manual verification, rather than reporting ~9.5 WPI with unearned
confidence. This is the intended failure mode — cross-region agreement
(or the lack of it) driving confidence is "much more useful than
confidence based on one crop" specifically because it can catch this
even when the point estimate itself is fooled. **This specific failure
is exactly what the next section fixes** — not by tuning the statistics,
but by changing what each region votes WITH.

Ground truth (the "Verify Measurement" correction system) is never used
anywhere in this pipeline — not for proposing regions, not for scoring
their quality, not for selecting inliers, not for consensus. It remains
strictly an evaluation-only comparison, entered by the user after the
fact.

### Wale gauge from counted loop columns, not a raw period

The failure above has a specific shape: autocorrelation on a short
(~0.87in) window has no notion of "loop," just "some periodic edge
pattern" — so a region can find a very clean, very confident repeat and
still have that repeat be the wrong one (the leg-to-leg half-repeat,
not the loop-to-loop full repeat). Feeding that period straight into
cross-region consensus means a majority of regions can confidently agree
with each other while being wrong TOGETHER, and no amount of robust
statistics on the *periods themselves* can catch that.

The fix (`analyze_multi_roi` + `_wale_count_candidate` in `analysis/
gauge_analysis.py`) doesn't touch the statistics at all — it changes
what each region contributes to them. For the WALE axis specifically,
every region's consensus candidate now prefers its **counted** spacing —
the median interval between the experimental loop-lattice detector's own
ACCEPTED columns (real, individually-verified V-shape detections,
requiring support from multiple course rows before a column counts at
all — see [the loop-lattice section above](#experimental-an-explicit-v-
shape-loop-center-detector)) — over its raw autocorrelation period,
whenever that count is trustworthy enough
(`_wale_count_confidence` ≥ `WALE_COUNT_MIN_CONFIDENCE`, from ≥2
accepted columns, weighted half by spacing regularity and half by how
many course rows actually confirmed each column). A region whose
loop-lattice result isn't trustworthy for this — too few accepted
columns, weak support, irregular spacing — still falls back to its own
periodicity estimate, exactly as before; no region is ever dropped just
because the experimental detector came up empty on it. Course is
deliberately left alone: it hasn't shown this project's history of
harmonic-doubling, and the loop-lattice detector treats course rows as a
given prior rather than something it independently counts (see
`LoopLatticeResult`'s docstring), so there's no analogous "count" to
prefer there.

Counting sidesteps the specific failure mode above almost by
construction: an accepted column is a claim about a SPECIFIC, located
stitch, verified against multiple course rows before it counts at all —
there's no "is this the fundamental repeat or its harmonic" question to
get wrong the way a period estimate has. This is also the ONE place in
the whole codebase the loop-lattice detector is allowed to influence a
real, reported measurement (see the module comment above
`_wale_count_candidate`); every other use of it — the single-ROI
`/analyze` endpoint's `loop_lattice_debug`, Developer diagnostics —
remains exactly what it always was: comparison-only, never touching the
actual result.

Each region's own `wale_source` ("loop_count" or "periodicity") and
`wale_count_confidence` are exposed per-region in `/analyze-multi`'s
`multi_roi.per_roi`, and surfaced in Developer diagnostics' per-region
inspector, so it's always visible which kind of evidence actually fed
the consensus for any given region.

**Result on the same real jersey photo, same 6 regions**: wale moved
from ~9.5 WPI (wrong, a clean 2x of the true value) to **~5.9 WPI**
(much closer to the known ~5) — a real, substantial improvement, not a
marginal one. It's not a perfect result: only 2 of the 6 regions (A and
B) ended up in wale's accepted cluster, so confidence lands around
70-75% and the axis can still report `status: "uncertain"` depending on
exactly how tight those two regions' counted values agree (this
particular photo sits close enough to the classification boundary that
it was observed to flip between "confident" and "uncertain" across
otherwise-identical runs, purely from sub-pixel JPEG re-encoding noise
in one test harness — a reminder that "uncertain" here is an honest
signal of real closeness to the threshold, not a glitch). Course is
unaffected by this change and remains ~7.28 CPI, same as before. Reported
as-is: an honest, verified improvement on the specific failure this
project already knew about, not a claim that wale detection is solved.

### Stage 4: a few large regular regions, not many small ones

The original proposal design (Stage 1 above, before this section) picked
up to 6 small windows (~0.75–1.0in per side) purely by image-quality
score. Real photos exposed two problems with that, both found by testing
against actual photos rather than assumed:

**Small windows can land on distortion that a generic quality score
doesn't catch.** A user-submitted photo of a pinned swatch with curled,
rolled edges got an auto-proposed box sitting directly on the curl — the
existing scorer (sharpness/contrast/texture-consistency/periodicity) rated
it highly because the curled fabric is still sharp, high-contrast, and
periodic; it just isn't *flat*. The direct fix was a new scoring
component, `_periodicity_consistency_score`: split the candidate crop into
four quadrants, measure each quadrant's own dominant period independently,
and score how well they agree in log-space. A curl, wrinkle, or stretch
compresses or expands the period locally, so the quadrants disagree even
though each one individually still looks sharp and periodic.

The first version of this idea used gradient-orientation statistics
(circular/doubled-angle averaging of edge directions) instead of measured
period, on the theory that distortion should show up as inconsistent edge
orientation. Tested directly against the real jersey fixture — known
flat, known clean — it scored 0.28 (should be near 1.0). The cause: knit
fabric's edge structure is naturally bimodal even when perfectly flat (the
V-shape loop legs run diagonally, the stitch grid runs vertically/
horizontally), so there's no single dominant orientation to be consistent
about in the first place — the metric wasn't measuring what it was meant
to. It was replaced outright with the period-agreement version above
before ever being shown as a result; caught by testing against the known-
clean fixture before trusting it, not by inspection.

**Given that better single-region vetting exists, is one big, well-vetted
region actually reliable enough on its own?** The user's next request was
direct: auto-select the single largest regular area, drop multi-region
cross-checking entirely, and derive confidence from that one region's own
internal agreement (measured period vs. counted loop columns) instead of
cross-region agreement. That version was built in full — largest-first
multi-scale window search, the fabric-mask gate, periodicity-consistency
scoring, single-region confidence from internal agreement — and then
tested rigorously *before* being shown to the user: a sweep of window size
(0.75in–2.5in) at a fixed position on the real jersey photo. The result
had no monotonic size-to-accuracy trend, and included at least one
confidently-wrong case (a 0.75in window reporting 11.08 WPI, more than 2x
the true ~5, at 77% self-reported confidence). This wasn't a coding bug —
the code did exactly what it was designed to do — it was evidence that the
underlying premise ("a single large, well-vetted region is reliable
because it's large and well-vetted") doesn't hold for this detector
architecture. Reported as a negative finding, not shipped quietly.

The resolution — and the current design — keeps everything from both
attempts above (the largest-first search, the fabric-mask gate, periodicity
consistency scoring) but restores multi-region cross-checking as the
safety net: `propose_measurement_rois` now tries candidate window sizes
largest-first (from `CANDIDATE_SIZE_INCHES`, 3.0in down to 0.75in), and at
each size greedily selects up to `ROI_PROPOSAL_MAX_REGIONS` (4) spatially-
separated, high-scoring candidates. It stops at the **largest** size that
can still support at least `ROI_PROPOSAL_MIN_REGIONS` (2) such candidates,
so the proposal is a few large regions rather than either one region or a
swarm of small ones. If no size can support even 2, it falls back to
whatever the largest size actually produced (down to a single region on a
small or difficult image) rather than failing outright — Stage 2/3's
existing consensus machinery already handles anywhere from 1 region up.

**Result on the real jersey photo**: 2 regions at ~1.5in² each (the
largest size the photo's usable fabric area could support 2 of).
Consensus wale came out to 4.49 WPI at Low confidence (correctly flagged
as uncertain — the two regions' own counted-column values didn't tightly
agree), course came out to 7.04 CPI at higher confidence — both consistent
with the known ~5 WPI / ~7.2 CPI ground truth for this photo, verified via
a full Playwright run through calibration → review → approve → analyze →
results, not just the backend in isolation.

One thing this stage does **not** claim to have fixed: a separate photo
(a teal/blue swatch, examined via Developer Diagnostics screenshots rather
than the raw file, which this environment can't access from a pasted
image) showed both the periodicity detector and the loop-lattice counter
independently landing on the same wrong ~2x harmonic for the same region —
a case where Stage 3's core assumption (that the two methods are
sufficiently independent to cross-validate each other) didn't hold. Fewer,
larger, better-vetted regions may help this incidentally, since a larger
window gives both detectors more of the true repeat to lock onto, but it
hasn't been verified against that specific photo and isn't claimed as
fixed here — an open, disclosed limitation, not a solved one.

### A real second photo, a real bug found and fixed, and a narrower open problem

The teal photo above eventually became available as an actual file
(`tests/fixtures/sarahmaker-knitting-gauge.jpg`, added directly to the
repo — chat-pasted images aren't reachable from this environment's
filesystem, only a real committed file or fetchable URL is), which made
it possible to reproduce and test against real pixels instead of
reasoning from screenshots. Two independent things came out of that:

**A real, fixed bug, unrelated to harmonic selection.** `_finalize_axis`/
`_finalize_axis_v3` take the period that evidence-scoring already chose
and try to sub-pixel-refine it using the actual detected peak positions —
reasonable when peak detection is clean, but on a real (non-synthetic)
photo `_detect_peaks` (tuned for overlay drawing, not measurement) can
miss a peak here and there, and each miss inflates the gaps on either
side of it toward a harmonic of the true period. The old code
unconditionally overwrote the spacing with the mean of ALL detected
gaps, good and bad alike. Caught directly: a large, clean crop of the
real jersey photo had evidence-scoring correctly select 35px as the
winning wale candidate, and this refinement step then silently
overwrote it with 43px — a ~23% inflation — from a handful of bad gaps
mixed in with mostly-good ones. Fixed (`_refine_spacing_from_positions`)
by only accepting the refinement when it's still close to the period it
was meant to refine (within `SPACING_REFINEMENT_MAX_LOG_DEVIATION`,
~1.20x); a bigger drift means the detected positions aren't trustworthy
and the original, evidence-selected period is kept as-is. Covered by
`tests/test_spacing_refinement.py` (unit tests against synthetic
position lists, plus a real-photo regression test against this exact
jersey crop) — 148/148 tests passing after the fix, no regressions.

**The teal photo's own doubling — first mis-measured, then actually
fixed for one of its two causes.** An initial direct measurement against
the real file (ruler-calibrated at 272.8px/inch from the numeral labels)
used a clean autocorrelation + peak count across the full accessible
fabric area — 26 peaks, only 1.86px standard deviation on a 38.76px mean
spacing — and concluded the true wale spacing was ~7.04 wales/inch.
**That number was itself wrong**, in exactly the way this whole section
is about: this specific yarn has a real, genuinely periodic sub-column
texture (most likely ply twist) at close to double the true stitch
frequency, clean and low-noise enough to fool a careful direct pixel
measurement, not just the detector. The person who took the photo
hand-counted it directly: **4 wales/inch, 5 courses/inch** — the actual
ground truth used below, not the earlier self-measured one.

Checked against that real number, two distinct, separately-diagnosed
bugs were driving the doubling, not one:

1. **Fixed and verified.** Raw periodicity candidate scoring for wale
   was a genuine, position-dependent coin-flip at the ~1.25in window
   size this photo's usable fabric area forces the multi-region proposal
   down to: four independent windows across the same clean fabric gave
   WPI ratios-to-truth of 0.59, 1.11, 0.56, 1.17 — alternating between
   the true period and its half-period harmonic purely by where the
   window landed. The mechanism, found directly in the real candidate
   scoring breakdown: `patch_consensus` favored the WRONG (half-period)
   candidate in every case checked, often by a wide margin (e.g.
   0.94–0.96 vs. 0.43–0.44) — the exact "sub-region patches aren't
   independent, they can all inherit the same wrong lock-on together"
   failure its weight was already reduced once before to guard against
   (see the multi-region section above), just not far enough.
   `phase_consistency` favored the CORRECT candidate in every case
   checked, including on the jersey photo it already worked for. Fixed
   by reducing `patch_consensus` again (0.10 → 0.03) and moving the
   freed weight into `phase_consistency` (0.35 → 0.42, keeping the
   positive terms summing to 1.0) — verified this fixes all 4 small-
   window positions plus the full large-crop case on the teal photo,
   *without* changing the already-correct jersey result. Covered by
   `tests/test_wale_scoring_weights.py`, including a test that pins down
   the exact mechanism (`patch_consensus` favoring the wrong candidate,
   `phase_consistency` favoring the right one), not just the end-to-end
   number.
2. **Found, attempted, and honestly still open.** Through the live
   multi-region flow, wale for this photo doesn't actually use the path
   above at all — it comes from Stage 3's loop-lattice counted-column
   path, which both proposed regions were confident enough to trigger.
   That path picks its own wale scale independently (direct V-shape
   detection at each of the same 0.5x/1x/2x candidate scales, chosen by
   `lattice_consistency` — spacing regularity between accepted columns),
   and has the *same* underlying vulnerability as finding 1, just via a
   different mechanism: on this yarn, `lattice_consistency` can be
   genuinely higher at the wrong scale (0.909 at the wrong 37px vs. 0.898
   at the correct 74px, on the exact region the live proposal picked) for
   the identical reason — the wrong-frequency texture really is that
   regular, `lattice_consistency` has no way to know it isn't the stitch
   structure. Blending `phase_consistency` into this selection too (the
   obvious next move, given finding 1) was implemented and DID improve
   the teal photo — 2 of 6 tested positions correct beforehand, 4 of 6
   after — but verified directly against the real jersey fixture, it
   regressed two previously-correct positions to a badly wrong
   quarter-period lock-on (ratio ~0.26 instead of ~1.0): `phase_
   consistency` isn't reliable at the very fine scales jersey's own
   candidate search can explore (tiny ~9px patches, too small for
   `_phase_consistency_evidence`'s extracted patches to carry real
   signal) the way it is in the range periodicity scoring works with.
   **Reverted rather than shipped with a known regression** — the module
   comment above the scale-selection loop in
   `analyze_loop_lattice_experiment` documents this attempt and why it
   was undone, so it isn't silently retried later without the same
   real-jersey check catching it again. The live teal-photo wale result
   is consequently still wrong today (8.27 WPI vs. the true 4) — this
   is a real, disclosed, unsolved limitation, not something this section
   is claiming to have fixed.

Fixing the loop-lattice path safely needs its own targeted evidence — not
a copy of finding 1's fix, which was checked here and shown not to
generalize — and is real work still ahead.

### The density cross-check's blind spot: a real secondary peak, not just a bad override

`_cross_check_density` (the wale-only loop-density override described
above) was found overriding a wale pick the v0.3 evidence scorer had
already gotten right, and decisively — on a real photo
(`tests/fixtures/knit_sample_01.jpg`, see `tests/knit_sample_ground_
truth.py`), evidence scored the correct 85.0px candidate at 0.650
against the wrong 0.5x-harmonic candidate's 0.553, a 0.097 margin, and
the density check still substituted the wrong one. Fixed by
`DENSITY_OVERRIDE_MAX_EVIDENCE_MARGIN`: the override may now only fire
when wale's own top-2 evidence scores are within `UNCERTAIN_SCORE_MARGIN`
(0.08) of each other — a genuine near-tie — never when the scorer has
already separated them decisively. Chosen from the margin distribution
across all 9 fixtures with recorded ground truth, not the one failing
case: 8 of 9 margins (0.097–0.324) sit comfortably above the threshold;
only one (0.063, a case whose pick was already correct and never reached
the density check regardless) sits below it.

That fix closes the override, but doesn't explain why the density check
had anything to disagree with in the first place — on this photo, `_
detect_loop_centers` (the DoG blob detector feeding both `_cross_check_
density` and `_analyze_direction`'s center-pitch correction) really is
finding roughly twice as many loop centers as there are loops. Measured
directly: the median nearest-neighbor spacing among detected centers
(34.5px) is almost exactly half the true loop pitch (70.2px, the
geometric mean of the true 85×58px wale/course spacing) — not a
harmonic-selection error downstream, a genuine secondary local maximum
in the detector's own response map, most likely from adjacent stitches'
diagonal legs crossing near the midpoint between true loop centers and
producing a compact-enough blob to pass the DoG blob test.

This is the same *shape* of problem `fold_consistency` already solves
for the periodicity path — a real, periodic sub-feature (there, one leg
of a V; here, a leg-crossing between two loops) that's genuinely regular
enough to be mistaken for the thing actually being measured — but the
spatial loop-center detector has no equivalent structural defense: DoG
blob detection has no notion of "is this compact bright spot actually a
complete loop head, or the crossing point between two legs of adjacent
loops." `min_separation_px`'s non-max-suppression radius (`0.3 *
min(p0_wale, p0_course)`) is the only thing currently keeping detections
apart, and it isn't derived from anything that distinguishes a leg
crossing from a loop head — simply raising that fraction would risk
being a fix fitted to this one photo's geometry rather than a
structurally-grounded one. Root-caused, not fixed here: a real defense
would need something like a shape check on the blob's local gradient
structure (does it look like two converging legs, not just "compact and
bright") the way `_fold_consistency` checks structural resemblance
between repeats, rather than a threshold tweak on the existing response
map.

### Course selection: why v0.3-authoritative was tested and rejected

Jersey's course reading (`real_jersey_sample.jpg`, at the crop that
reproduces its failure) can be off by as much as -53% — a doubled period,
the largest error found in a 9-fixture accuracy pass. Since course
selection deliberately uses the older `_analyze_direction` pipeline
rather than the v0.3 evidence scorer (see "A real-photo regression, and
phase consistency as its fix" above), the obvious question was whether
that decision has simply gone stale: would making v0.3 authoritative for
course fix this?

**Tested directly against all 9 fixtures with recorded ground truth, and
rejected — the answer is genuinely mixed, not a clean win:**

- On the synthetic fabric grid (12 clean/degraded cases, exact known
  ground truth), switching to v0.3's own top-evidence pick would **fix 3
  cases that are currently strict-xfailed as broken** (jersey 5×7
  degraded, jersey 8×10 degraded, rib1×1 8×10 clean — all currently flip
  to a half-period harmonic under the old pipeline, and v0.3 gets all
  three right) **and break 1 currently-good case** (rib1×1 8×10
  degraded: old pipeline correct at 18.0px, v0.3 flips it to 36.0px).
- On the real jersey photo itself, at a crop that reproduces the -53%
  failure, v0.3's own top pick is the *same* wrong 49.0px candidate as
  the old pipeline's, by a hair (evidence 0.424 vs. 0.418, margin
  0.006). This is not an authority problem on this photo — both
  mechanisms are wrong, in a near-tie.
- On `knit_sample_08.jpg` (a real photo with recorded course ground
  truth), the old pipeline is currently decent (-7.1%); v0.3's own pick
  would badly regress it (-53.6%) — the identical doubled-period
  failure, freshly introduced on a fixture that isn't currently broken.

Net: switching course to v0.3-authoritative would trade one class of bug
for another, and wouldn't even fix the case that prompted the question.
**Rejected, not attempted.**

**What actually distinguishes the two near-tied course candidates?**
Dumped the full per-term evidence breakdown for jersey's 24.5px (correct)
vs. 49.0px (wrong, selected) candidates: `patch_consensus` is the
dominant term and it's badly wrong-direction (0.435 vs. 0.953 — 2.2x in
favor of the wrong candidate) — the same failure mode already diagnosed
and partially fixed for **wale** (see "A real second photo..." above:
"patch_consensus favored the WRONG half-period candidate... phase_
consistency favored the CORRECT candidate"). `phase_consistency` does
lean correctly here (0.661 vs. 0.630), but far too weakly to overcome
patch_consensus.

That wale-side fix does **not** transfer to course. Checked on
`knit_sample_08.jpg` (the same doubled-period failure shape):
`phase_consistency` there favors the *wrong* candidate (0.588 vs.
0.318) — backwards relative to jersey. `patch_consensus`, by contrast,
favors the wrong (coarser) candidate on every real-photo case checked
(jersey, knit_05, knit_08) — the one signal that's consistent, but it
points the wrong way everywhere, so it's not a fix source either.
`structural` (fold + loop-center-pitch agreement) is uninformative for
course in these cases (~0): `fold_consistency` is deliberately never
computed for course (rows don't have the V-leg bilateral-symmetry
failure mode it targets), and loop-center pitch agreement isn't reliably
trusted at these crop sizes.

**No existing per-candidate signal in this codebase reliably separates
the true course period from its harmonic.** This is parked, not
in-progress: it needs its own investigation (a course-specific structural
signal, most likely — not a reweighting of terms built for wale), rather
than reuse of a fix that was checked here and does not generalize.

### How ROI-dependent is this, really?

Two accuracy passes over the same 8 fixtures (real_jersey_sample.jpg,
sarahmaker-knitting-gauge.jpg, and the knit_sample fixtures — see
`tests/knit_sample_ground_truth.py`), run in the same session against
**unchanged detector code**, disagreed by tens of percentage points per
fixture — including one fixture (jersey course) that looked "fixed"
between the two passes purely because the second pass's hand-picked crop
happened to exclude a few rows of ruler ticks the first pass's crop had
included. That contradicted a finding from the same session (jersey's
course near-tie has no available fix — see "Course selection" above),
which is what caught the problem: the two "accuracy" numbers weren't
measuring the same thing at all.

**Confirmed directly, not assumed.** Re-deriving ROIs that approximate
the first pass's crops (a natural, non-adversarial choice per fixture —
e.g. knit_sample_01's whole gauge-tool window, real_jersey_sample's full
frame minus its ruler strip) reproduced that pass's numbers almost
exactly on every fixture checked (knit_01 wale +4.6% vs. reported +4.3%;
knit_01 course +0.72% vs. reported +0.7%; jersey course -52.1% vs.
reported -53.1%; knit_02 wale +0.6% vs. reported +1.1%; knit_06 wale
-1.3% vs. reported -0.8%). The code did not move between passes; only
the crop did. ROI choice is the entire explanation.

**Quantified with a systematic grid, not more hand-picked crops.** For
each of the 8 fixtures, 15 crops were generated mechanically — 3 sizes
(30%/50%/70% of the image's shorter dimension, as a centered square) ×
5 positions (the 4 corners + center) — with no visual inspection of any
kind, and `analyze_gauge` run on each:

| fixture | wale median err | wale err range | wale harmonic-lock rate | course median err | course err range | course harmonic-lock rate |
|---|---|---|---|---|---|---|
| real_jersey_sample | -7.2% | -54% to +90% | 6/15 | -6.9% | -70% to +65% | 7/15 |
| sarahmaker (teal) | **+68.7%** | -14% to +89% | 5/15 | n/a | n/a | n/a |
| knit_01 | +6.3% | +2.7% to +109% | 3/15 | **+367%** | -66% to +554% | 3/15 |
| knit_02 | **+121%** | -5% to +7356% | 7/15 | n/a | n/a | n/a |
| knit_05 | +5.2% | -33% to +109% | 6/15 | +0.7% | -88% to +402% | 4/15 |
| knit_06 | **-69.1%** | -85% to -67% | 10/15 | -3.4% | -26% to +6% | 1/15 |
| knit_08 | +5.5% | -52% to +105% | 6/15 | +1.0% | -69% to +414% | 3/15 |
| knit_09 | -1.6% | -44% to +8% | 0/15 | **-67.2%** | -86% to +9% | 9/15 |

("harmonic-lock rate" = crops landing within 12% of a 0.5×/1.5×/2×/3×
multiple of the true value, out of 15.)

**This is a large, plain finding, not a footnote: an error range spanning
several hundred percentage points from crop choice alone, on more than
half the fixtures checked, on either axis.** The median across most
individual fixtures looks reasonable (many sit within ~10% of true) —
but that's the sweep's *center*, not its *worst case*, and a mechanically
generated grid hits genuinely bad crops (a harmonic lock, or a scale so
small the ROI is mostly background/table) often enough that "roughly
right on a typical crop" is not the same claim as "accurate." Two
findings stand out:

- **The teal fixture's wale median across the grid (+68.7%) is far worse
  than the ~correct numbers reported elsewhere in this README** for the
  same fixture (`test_wale_scoring_weights.py`'s 5 specifically-chosen
  ~1in² windows). Those windows were chosen *because* earlier debugging
  found they avoid this fixture's known half-period ambiguity — they are
  not representative of what an unbiased crop gives on this photo, they
  were selected against exactly the failure this table now shows is
  common. Every accuracy figure anywhere in this README computed from a
  hand-picked "clean" ROI should be read with that in mind.
- **Harmonic lock is not rare** — it's the modal failure, not a tail
  event, on several fixtures (knit_06 wale 10/15, knit_09 course 9/15,
  knit_02 wale 7/15).

**The fix for the harness, not (yet) the detector: pin one ROI per
fixture, chosen by a stated rule, applied uniformly, with no visual
judgment and no re-picking.** `tests/knit_sample_ground_truth.py`'s
`pinned_roi()` and its `ROI_01`/`ROI_02`/`ROI_05`/`ROI_06`/`ROI_08`/
`ROI_09` constants (see its "FOURTH PASS" docstring section) implement:
the central square crop at 50% of the image's shorter dimension, computed
mechanically from image dimensions — no attempt to dodge a ruler, pin, or
marker that happens to land inside it. Any future accuracy claim against
these fixtures must use these exact ROIs (verbatim, not "close to") to
be comparable to any other. This does not make the detector more
accurate — it makes the next accuracy number about the detector, not
about who picked the crop.

### Verify by counting a repeat: user-anchored template matching

Every detection path above — raw autocorrelation, the v0.3 candidate
scorer, the loop-lattice V-shape counter — works by discovering
periodicity purely from the image's own frequency content, with no
ground truth for what one real repeat looks like. That's the root cause
behind every failure mode documented in this file so far: a texture
that's genuinely periodic at the *wrong* frequency (most often yarn ply
twist) is mathematically indistinguishable from the true repeat to a
method that only asks "how periodic is this."

The idea this section implements: if the user marks two points spanning
ONE confirmed repeat — the same visual feature on two adjacent wale
columns, or two adjacent course rows — there's no more ambiguity to be
fooled by. That patch becomes a template, and `count_repeats_by_
template_match` (classical CV, `cv2.matchTemplate` — no ML) counts real
occurrences of it across the photo directly, the way a person would:
find the next one, then the next, then the next.

**Why it walks outward instead of matching the whole region against one
fixed template.** The first version did exactly that — one template,
searched everywhere at once — and it failed hard on the real jersey
photo: only 4 of the region's ~14 true repeats matched above a
reasonable correlation threshold, because real (non-synthetic) fabric's
natural stitch-to-stitch variation — lighting, fiber irregularity, slight
curvature — makes a patch drift in appearance faster than distance alone
would suggest. The fix walks outward from the anchor one step at a time,
in both directions, refreshing the reference template to the newest
match after every step, so no single comparison ever has to span more
than one repeat's worth of real-world drift.

**Two real bugs found and fixed while getting this to work, both caught
by testing against the real jersey fixture before trusting the result:**

1. A window-bound arithmetic error let the *backward* half of the walk's
   search window overshoot past the anchor position itself, corrupting
   which physical location each candidate match index actually
   corresponded to. Manifested as the walk taking confident, consistent
   ~2px "steps" in the wrong direction instead of ~35px ones toward the
   next real repeat — a completely different bug from harmonic ambiguity,
   caught by tracing the actual index-to-position math against real
   image content rather than trusting the first plausible-looking result.
2. The initial correlation threshold (0.45) was calibrated on intuition,
   not evidence, and turned out to be too strict for real fabric: it cut
   the walk off after 2 steps in each direction, with scores hovering
   right at the cutoff. Lowered to 0.35 after directly verifying this is
   safe — the geometric search window (a narrow band around the expected
   next-repeat position) is what actually guards against matching the
   wrong harmonic, not the correlation threshold, so a lower floor mainly
   costs a few genuinely-empty steps rather than harmonic confusion. This
   raised the same jersey walk from 2 real matches to 9, spanning the
   whole region.

**Real-photo results, reported honestly rather than only showing the
good one:**

- **Jersey wale: 5.04 predicted vs. ~5.0 true** — 9 real, consistently-
  spaced matches across the region, the closest any single automatic-or-
  assisted wale measurement has come to ground truth in this entire
  investigation.
- **Teal wale: consistently ~14% too coarse** across four independent
  anchor placements on the real photo — a real, modest, *non-harmonic*
  overcount, not the ~2x doubling every other method has shown on this
  same photo. This yarn's fuzzier, more heavily-plied texture correlates
  less cleanly even between genuinely adjacent repeats than jersey's
  smooth cotton does — an honest limitation, not tuned away by loosening
  tolerances further.

**Never feeds back into automatic detection.** This is a separate,
human-in-the-loop measurement surfaced alongside the automatic wale/
course numbers in a "Verify by counting a repeat" panel on the Results
step (`POST /count-repeats`) — the same spirit as the loop-lattice debug
view being comparison-only. The user marks two points on the image; the
panel reports the counted per-inch value, match count, and confidence,
letting a low-confidence automatic result be checked against a second,
independently-derived number rather than just a warning label.

**Hidden unless the automatic result is already Low confidence.** The
panel used to be visible on every result, collapsed by default but
always present. A real user report surfaced the problem with that: when
this OPTIONAL secondary check itself failed (a deployment mismatch left
`/count-repeats` unreachable on one preview), the failure read as "the
tool doesn't work" rather than "this one extra check didn't run" — a
confident automatic result has no need for it in the first place. The
panel (and its own `hidden` state) is now driven by the exact same
`overallConfidence()` threshold that already decides the "Low confidence
— verify the detected loops" warning message, so it only appears at all
when there's an actual reason to reach for it.

### Automatic candidate cross-checking: the same walking match, self-anchored

The section above sidesteps harmonic ambiguity by construction — a
human-confirmed patch has no periodicity-frequency ambiguity to be
fooled by. That raises an obvious question: can the *automatic* v0.3
candidate scorer get some of that same protection, without a human in
the loop?

`_template_match_consistency_score` (`analysis/gauge_analysis.py`) is
that attempt. For each 0.5x/1x/2x period candidate the scorer already
considers, it self-anchors at a real detected peak (the middle one, for
maximum room to walk both directions), extracts a template, and reuses
the exact walking-match core the user-anchored path above already proved
out (`_walk_template_matches`, extracted into a shared function so both
paths stay byte-for-byte identical rather than maintaining two copies of
the same carefully-debugged logic). The result — how many real matches,
how consistently spaced, how strong the correlation — becomes one more
evidence term in `ScoringWeights`, alongside autocorrelation strength, 2D
support, structural (fold/loop-center) evidence, regional consensus, and
phase consistency.

**Funding the new weight without repeating an old mistake.** The first
attempt gave `template_match` a weight of 0.10, funded by cutting
`autocorr` and `support_2d` specifically (the two "purest" periodicity-
strength proxies it seemed to most directly supersede). That broke an
existing regression test
(`test_harmonic_penalty_on_the_true_period_cannot_hand_the_win_to_an_
unrelated_weak_candidate`) — a real prior bug where a true period had to
beat an unrelated weak candidate on autocorrelation/2D-support strength
alone, and `template_match` is neutral (contributes nothing to the
*difference* between candidates) whenever there's no real image data to
test against, exactly the case in that synthetic test. Taking its
funding from those two specifically diluted the one signal actually
deciding that case, without adding anything back. Fixed by funding it
instead with a **flat 10% proportional scale-down of every existing
positive weight** — this provably cannot flip the sign of any margin
that used to hold (it's a uniform linear scale plus a same-both-sides
neutral addition when `template_match` has no real evidence to
contribute), and only changes an outcome when the new term has something
genuine to say. All 178 tests pass with this weighting.

**Empirical validation against both real fixtures (jersey + all 5 teal
ROIs from `test_wale_scoring_weights.py`), checked honestly rather than
assumed:**

- The winning wale candidate **never changed** in any of the 6 real ROIs
  tested, vs. `template_match` disabled entirely — no regression.
- In 4 of 6, `template_match_score` was strongly positive (~0.7) for
  *exactly* the winning candidate and a clean 0.0 for every harmonic
  alternative — real, correct discriminating evidence, not noise. On
  jersey's course axis specifically, it confirmed both the true period
  *and* its trivial double (a real period always reconfirms at 2x — see
  `_harmonic_penalty`'s docstring, that's guaranteed, not ambiguity)
  while flatly rejecting the dangerous half-period harmonic (0.0).
- In the other 2 (both small, ~1in teal windows), it returned 0.0 for
  *every* candidate — non-discriminating, not mis-discriminating: it
  never favored a wrong candidate over the right one in any of the 6
  cases checked, it just didn't have enough to say in these two. Teal's
  fuzzier, more heavily-plied texture is the same honest limitation
  already documented for the user-anchored path above.

Given "never caused a wrong flip, sometimes strongly confirms the right
answer, otherwise stays quiet" across every real case checked, the
weight is being kept — but, consistent with the framing above, this
should be read as "safe and genuinely useful in the cases checked so
far," not "proven to fix the open teal wale-selection coin-flip
documented earlier in this file." That would need more real photos than
the two fixtures this project currently has, the same honesty standard
already applied to every other real-photo claim in this document.

### Stage 5: measurement-area proposal — overlap allowed, large intrusions gated out

A real user photo of a pinned swatch (metal T-pins/stitch markers crossing
the fabric, a tape measure along one edge) surfaced two problems with the
automatic "Review Measurement Areas" proposal (see Stage 4 above): a
proposed region had a pin running straight through the middle of it, and
a second region got pushed out toward the tape measure at the edge, just
to satisfy the old "well-separated from the first region" spacing rule.

**Regions can now overlap.** The old rule (`ROI_PROPOSAL_MAX_OVERLAP_IOU
= 0.02`, `ROI_PROPOSAL_MIN_CENTER_SPACING = 1.15`) forced proposed
regions apart to maximize how independent they'd be for cross-region
checking (`analyze_multi_roi`'s consensus). But a real photo often has
only ONE genuinely clean patch of fabric — forcing regions apart was
pushing the second and third proposals into worse areas instead of using
more of the one good patch. `_too_close_to_selected` now only rejects a
near-exact duplicate of an already-selected region (`ROI_PROPOSAL_MAX_
OVERLAP_IOU = 0.9`); real overlap is fine. This trades away some
statistical independence between regions for the sake of actually using
good fabric — deliberately, since a region built on bad texture is worse
for cross-checking than one that partially overlaps a good one.

**A new hard gate catches large, obvious non-fabric intrusions** —
`_local_anomaly_fraction`, alongside the existing background gate
(`_fabric_mask`). Each candidate window's local block statistics (a
robust median/MAD of local contrast, plus a near-blown-out brightness
check) are compared against a baseline computed **once from the whole
photo**, not from the window itself. That distinction turned out to
matter a lot: a first version compared each window only against its OWN
blocks, and a window sitting entirely inside a real ruler strip scored
0.0 "anomaly" — 100% ruler, so nothing inside that same window looked
different from anything else in it. A whole-photo baseline doesn't have
that blind spot: the identical window scores 1.0 against it.

**What this reliably catches, and what it honestly doesn't.** Validated
against both real fixtures (`real_jersey_sample.jpg`, `sarahmaker-
knitting-gauge.jpg`) at every candidate window size this function tries:
a window that's MOSTLY OR ENTIRELY a large non-fabric surface (the real
teal photo's actual ruler strip measured 0.60–0.74 on this metric) is
reliably separable from genuinely clean fabric's own natural local-
contrast variation (worst case found anywhere in either photo: ~0.38) —
a real, if not huge, margin, which is why `ROI_PROPOSAL_MAX_ANOMALY_
FRACTION` sits at 0.5. A window that's only a MINORITY non-fabric — a
thin pin/needle/stitch-marker crossing the fabric, or a ruler grazing
just one edge of an otherwise-good window — is a genuinely harder case
that this specific signal does **not** reliably solve: a window measured
23% ruler / 77% clean fabric during development scored only 0.24 on this
metric, squarely inside the real clean-fabric noise range, not separable
from it.

This isn't for lack of trying. Several other classical-CV formulations
were built and tested against the real fixtures before settling on the
one shipped:
- **Per-row/per-column max-anomalous-fraction** (does any single strip
  of blocks read as almost entirely anomalous, regardless of the whole
  window's average) reliably caught a synthetic pin at every window
  size tried, but false-positived heavily on real fabric — a knit's own
  wale columns are naturally correlated enough in local contrast that
  an entire column of blocks legitimately looks unlike the window's
  overall median sometimes, with nothing wrong with the fabric at all.
- **Absolute anomalous area** (pixel count instead of a fraction, on
  the theory that a fixed-size real intrusion should occupy roughly the
  same AREA regardless of window size) went the wrong direction
  entirely: real fuzzy/plied yarn's own natural local-contrast variation
  produced MORE absolute anomalous area than a synthetic pin did.
- **Brightness-only** (just look for near-white blocks, on the theory
  that metal specifically produces specular highlights) missed a thin
  synthetic pin altogether — box-averaging over even a modest block size
  dilutes a narrow highlight below any reasonable threshold, while raw
  per-pixel brightness checks picked up more scattered bright fiber
  glints in real (especially fuzzier/plied) yarn than in the synthetic
  pin.

None of these are used. Rather than ship whichever one merely looked
plausible, or quietly widen the threshold until the synthetic test
passed, this is disclosed as open, unsolved work — consistent with this
project's standing rule of reporting real, verified findings rather than
overstating results. A window that's mostly good fabric with only a
small intrusion is still somewhat guarded by *ranking*, not gating: it
scores lower on the existing weighted quality score than a fully-clean
alternative, so the greedy highest-quality-first selection still prefers
genuinely clean fabric when enough of it is available — the hard gate
specifically matters when a mostly-bad window would otherwise be picked
because too few better alternatives exist.

**Tests:** `tests/test_roi_proposal.py` — `_local_anomaly_fraction` and
`_global_local_std_baseline` unit tests (clean texture, a ruler-like
block, no-baseline-available, too-small-crop); `propose_measurement_
rois` integration tests (regions may now overlap on a uniform image, a
near-duplicate is still rejected, a window mostly inside a ruler-like
block is gated out even when nothing better is available, and — given
enough clean alternatives — the greedy selection naturally avoids a
ruler entirely). A third pre-existing hard gate was added alongside
these during the same investigation: `periodicity_consistency` (already
part of `_roi_quality_score`'s weighted average) is now ALSO a hard
floor (`ROI_PROPOSAL_MIN_PERIODICITY_CONSISTENCY = 0.6`) — a real
regression surfaced while testing the overlap change: a window 26%
covered by a synthetic curled/distorted band still scored 0.88 overall
(comfortably above the quality floor) even though its own periodicity_
consistency was only 0.50, because that term is only 20% of the weighted
average and got diluted by everything else in the window scoring fine.

### Automatic ruler calibration detection

Most photos taken for this tool already have a ruler or tape measure in
frame — the upload hint suggests including one, and manual two-point-plus-
known-distance calibration is the one step in the whole workflow that
can't be sanity-checked after the fact: get it wrong and every downstream
wale/course number is silently wrong by the same factor, with nothing in
the UI that would look "off." `detect_ruler_calibration` (analysis/
gauge_analysis.py) tries to find the ruler automatically and propose a
calibration for the user to review/confirm/override — `POST /detect-
ruler` needs nothing but the uploaded file (it runs before any
calibration exists, since its whole point is to suggest one) — same auto-
propose-then-human-confirm pattern `propose_measurement_rois` already
uses for measurement areas, never a silent skip of the confirm step.

Deliberately classical CV, no OCR / no reading of printed numerals: a
ruler's tick pattern is a strong, generic signal — a dense, very regular,
high-contrast sequence of marks — reusing the same autocorrelation/peak-
detection primitives already used for wale/course spacing
(`_autocorrelation_spacing`, `_detect_peaks`). Metric vs. imperial is
inferred structurally (how many minor ticks fall between two major/
numbered ticks — ~5 or 10 → "cm", ~4/8/16 → "in") rather than by reading a
digit, which keeps the detector generic across ruler brands/fonts but
means the unit is always a hint, not a certainty.

**A real design flaw, found and fixed during development.** The first
version located tick X-positions correctly (`_scan_for_ruler_band` finds
the band with the strongest tick periodicity) but couldn't tell a major
(numbered) tick from a minor one: it measured each tick's dark-pixel
"reach" inside that *same* tight band and normalized to the longest reach
found. On both real fixtures every tick's reach came out ≈1.0 — the tight
band is deliberately as short as possible (that's what makes its
periodicity score highest), so on a real ruler it lands right against the
ruler's own working edge, where *every* tick, major or minor, is already
present and already touching the band's far edge. There was no headroom
left for a longer tick to visibly stand out.

The fix, `_build_reach_strip`: grow a taller strip specifically for
measuring reach, separate from the tight band used to find tick
X-positions. A ruler's printed body (ticks plus numerals) is close to a
single flat brightness, almost always much brighter than both its own
shadowed edge and whatever sits past that edge — so growing outward from
the tight band's own brightest row, independently in each direction,
until brightness drops below the midpoint of a wide neighborhood's
brightest/darkest rows finds that plateau without needing to guess which
side is "the ruler" up front. The direction that grew *less* is the
working edge ticks are anchored to (already blocked, hard against it);
the other is the headroom major ticks need. Reach itself changed from
"any dark pixel's distance from some reference row" to a **contiguous**
dark run starting at that working edge — the earlier form could be thrown
off by unrelated dark content elsewhere in the strip (a numeral's stroke
sitting in the same column as a short tick) that isn't actually connected
to the tick mark.

One more real failure mode, caught by inspecting the fixed output: a
single length-ratio threshold above the median (`RULER_MAJOR_TICK_
LENGTH_RATIO`) correctly separated whole-unit ticks from the rest on the
jersey fixture, but also swept up half-unit ticks (longer than the finest
ticks, shorter than whole-unit ones) as "major" — spacing between
consecutive detected majors alternated between a full unit and a half
unit, which would silently miscalibrate by 2x if the auto-suggested "1
unit" span landed on a half-unit pair. `_classify_major_ticks` now also
requires majors to stay a sparse minority of all ticks found (`RULER_MAX_
MAJOR_FRACTION = 0.35`) — a real ruler never numbers anywhere close to
half its ticks, so if "long" ticks are a big chunk of everything, that's
a sign the split isn't a real major/minor hierarchy at all, and it's
safer to report no confident split than a wrong one.

**What this reliably does, and what it honestly doesn't.** On the
`real_jersey_sample.jpg` fixture — a single ruler laid directly against
the fabric, the ordinary case this feature targets — the suggested points
land visually right on the real "1 inch" and "2 inch" tick marks, with
the correct unit inferred. On `sarahmaker-knitting-gauge.jpg` — a much
busier reference-card-style photo with rulers on multiple edges plus an
unrelated row of yarn-wrap swatches — the periodicity-only band scorer
sometimes locks onto that other regular content instead of either ruler;
the majority-fraction gate above stops it from confidently mislabeling
that as a clean major/minor split, and confidence scores measurably lower
for this photo (~0.6 vs. ~0.85 for the clean case), but the suggested
points themselves can still land somewhere that isn't a ruler at all.
Disclosed as open work, not hidden — this is exactly why the frontend
always requires the user's own confirm/override before anything gets
used, the same safety net `propose_measurement_rois` relies on.

**Tests:** `tests/test_ruler_calibration.py` — synthetic-ruler tests
(major-tick spacing recovered, imperial/metric unit inference, confidence,
point placement), negative/edge cases (no ruler present, `None`/empty/
tiny images never crash), direct coverage of the reach-measurement fix
(`_build_reach_strip` grows taller than the tight band; major and minor
reach are actually separable; `_classify_major_ticks` rejects a non-
sparse "majority" and accepts a sparse one), and a real-fixture regression
locking in the jersey result. `tests/test_detect_ruler_api.py` covers the
`POST /detect-ruler` request/response wiring.

### Image viewer pan/zoom

The viewer supports panning (drag, or scroll) and zooming (Ctrl+scroll/
pinch, or the +/− buttons, centered on the cursor/viewport). Pan/zoom is
a pure view-layer CSS transform on the image+canvas wrapper — it never
touches the stored ROI, calibration points, or detected positions, which
stay in original-image pixel coordinates throughout, so overlays remain
exactly registered at any pan/zoom level. The pan range is recomputed on
every zoom change, image load, and viewer resize, and is deliberately
generous: exactly enough that any pixel in the image can be panned to
the viewer's center at the current zoom (half the image's current
on-screen size in each direction from its default centered position) —
not just the older, much tighter "nudge the edge past the boundary by a
fixed slack" bound.

### On-image ruler overlay

Once calibration is confirmed, a "Ruler" toggle appears in the viewer
(bottom-left, next to the zoom controls). Turning it on drops a movable
ruler graphic onto the photo, drawn at the CALIBRATED scale, so the user
can drag it anywhere over the fabric to sanity-check the calibration
against a feature they can see directly (a seam, a known-size object,
their own tape measure still in frame), independent of trusting the
numbers alone.

It's drawn as a single rigid corner bracket — one arm running along
image x, one along image y, sharing a draggable origin corner — rather
than a lone horizontal bar, so both the wale (x) and course (y)
directions can be checked against the same reference point at once. Each
arm is 60mm long (enough room for a full 5cm scale AND a full 2in scale
with some headroom) and shows BOTH a cm row and an in row simultaneously
— like a real dual-marked ruler prints both scales on opposite edges —
with major/minor ticks matching each system's real structure (10 minor
per cm, 8 per inch, the same split `detect_ruler_calibration` infers
automatically on the backend). Both scales come straight from
`currentPixelsPerMm()`, with no dependence on which unit the user
happened to calibrate in — the calibration is exact in either system
regardless.

Only each arm's LENGTH is drawn to scale (in natural image pixels, so it
stays accurate at any zoom level); bar thickness and tick lengths are
fixed display pixels, like the calibration point markers and ROI resize
handles already are, so ticks stay legible rather than shrinking away
when zoomed out. Dragging anywhere on either arm (or the corner handle)
moves the whole bracket as one unit.

Deliberately gated to appear only AFTER Confirm Calibration — before
that there's no scale to draw it at — and stays available (and
draggable) across every later step (Review Measurement Areas,
Select Orientation, Analyze, Results) via `currentPixelsPerMm()`, the
same live calibration helper `/analyze-multi` and `/count-repeats`
already use, rather than a separately-stored value that could drift out
of sync with it. A plain click-drag already pans the image on some of
those steps (see above); `isPanTrigger` reserves the gesture for the
ruler the same way it already reserves it for ROI/calibration
interactions, but only when the drag actually starts on the ruler
itself, so panning elsewhere on those steps is unaffected.

## Two deployments of the same idea

This directory (`textile-gauge-reader/`) contains the **backend only**:
the FastAPI/OpenCV/NumPy/SciPy analysis API. It's meant to be deployed
standalone (see [Deploying to Render](#deploying-the-backend-to-render)
below) and has its own bundled frontend under `frontend/` purely for
local full-stack development (`uvicorn backend.main:app`), since
GitHub Pages / Netlify (static hosts) can't run Python.

The **production frontend** lives at the repo root, alongside the rest
of the portfolio site, as a standalone unlisted page:

- `../textile-gauge-reader.html`
- `../textile-gauge-reader.css`
- `../textile-gauge-reader.js`

It's plain HTML/CSS/JS with no build step, deploys with the rest of the
static site, and calls this backend cross-origin once it's deployed
somewhere (Render, etc). The backend URL is the single `CONFIG.API_BASE_URL`
constant at the top of `textile-gauge-reader.js` — see that file's header
comment. Until that's set, the page still loads and works through ROI/
orientation selection; only "Analyze" shows a clear "service not
configured" message instead of crashing or silently failing.

**Keeping the two copies in sync is a manual step, not automatic** — a
real gap that caused real confusion once already: `frontend/` sat
unsynced from the very first version of the app until this sentence was
written, so the backend's own root URL (which `StaticFiles` mounts as a
catch-all) served a stale, pre-multi-region UI indefinitely while
looking enough like the real thing that a live test against it produced
a plausible-looking but meaningless number to compare against the
current app. There's no build step tying these together, so after any
change to the root-level `textile-gauge-reader.{html,js,css}`, copy the
same files into `frontend/` (only `frontend/textile-gauge-reader.js`'s
`CONFIG.API_BASE_URL` should differ — empty string there, since it's
served same-origin) rather than hand-editing `frontend/` independently.

## Workflow

1. **Upload** a JPG/PNG/WEBP photo of a knit textile.
2. **Calibrate scale** — click two points a known distance apart (e.g. a
   ruler in the shot), enter that distance and its unit.
3. **Review measurement areas** — the backend proposes several candidate
   square areas from the calibrated scale, spread across the fabric (see
   [Multi-region measurement](#multi-region-measurement-propose-review-measure-independently-cross-check)
   below); move, resize, delete, or add your own before approving. Nothing
   is analyzed until you click "Approve Measurement Areas."
4. **Select orientation** — tell it whether wales run vertically or
   horizontally in the photo (V0 does not auto-detect this).
5. **Analyze** — the image, every approved area, calibration, and
   orientation are sent to the backend, which analyzes each area
   independently and returns a cross-region-consensus gauge estimate
   with confidence scores.
6. **Results** — wales/inch and courses/inch are shown prominently, along
   with spacing in mm, analyzed area size, and detected wale/course
   positions drawn back over the image. A collapsible **Measurement
   consistency** panel summarizes regional agreement (e.g. "4 of 6
   agreed, 2 excluded as outliers"); a **Detection Details** panel shows
   every harmonic period candidate considered per axis and why the final
   one was picked; **Show loop centers** and **Show measurement areas**
   checkboxes overlay the detector's approximate 2D loop-center points and
   every approved area's outline, respectively.
7. **Verify Measurement** (optional) — enter the true gauge for this
   sample (directly, or via a stitch count over the ROI) to save a
   labeled ground-truth record for later evaluation. See
   [Ground Truth / Correction System](#ground-truth--correction-system).
8. **Reset** — clear everything and analyze another image.

## Architecture

```
textile-gauge-reader/                 (this directory — backend only)
├── analysis/                # Pure computer-vision code — no web/HTTP deps
│   ├── __init__.py
│   └── gauge_analysis.py    # CLAHE → Sobel → projection → autocorrelation → peaks
├── backend/                 # FastAPI app — HTTP/validation only, no CV logic
│   ├── __init__.py
│   ├── main.py              # POST /analyze, GET /health, CORS, upload-size guard
│   ├── corrections_api.py   # POST/GET /corrections, export.csv, export.json
│   ├── image_io.py          # Upload validation & in-memory decoding
│   └── schemas.py           # Pydantic request/response models
├── storage/                 # Ground-truth persistence — no web/HTTP deps
│   ├── __init__.py
│   └── corrections_store.py # SQLite: save/list/export correction records
├── frontend/                # Local-dev-only copy of the UI (same-origin, no CORS needed)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   ├── test_gauge_analysis.py
│   └── test_corrections_api.py
├── data/                    # Gitignored: corrections.db + opted-in images, created at runtime
└── requirements.txt

../textile-gauge-reader.html   (production frontend — portfolio repo root)
../textile-gauge-reader.css
../textile-gauge-reader.js     (has the CONFIG.API_BASE_URL constant)
```

Key architectural rules this project follows:

- **Analysis is decoupled from the web layer.** `analysis/gauge_analysis.py`
  only imports `cv2`/`numpy`/`scipy` and operates on plain arrays — it has
  no knowledge of FastAPI, uploads, or HTTP.
- **No images are persisted to disk by default.** Uploads are decoded
  directly from the in-memory request bytes (`cv2.imdecode`) and never
  written to the filesystem during analysis. The one exception is opt-in:
  the "Save image for algorithm development" checkbox in Verify
  Measurement, off by default — see
  [Ground Truth / Correction System](#ground-truth--correction-system).
- **Coordinates are tracked in original-image pixel space.** The frontend
  stores calibration points, the ROI, and (after analysis) detected wale
  and course positions all in *natural image* pixel coordinates, and
  converts to on-screen coordinates only at render time. This keeps the
  canvas overlay correctly registered to the image even when the browser
  has scaled it down, and a `ResizeObserver` re-syncs the canvas and
  re-renders on any resize.
- **No fabricated results.** If the analysis pipeline can't find a
  reliable periodic pattern along an axis (too little texture, ROI too
  small, image decode failure, etc.), that axis is returned with
  `spacing_px: null` and `confidence: 0`, plus a human-readable message —
  never a guessed number. If the backend itself is unreachable, the
  frontend shows a clear "analysis service unavailable" message instead
  of failing silently or pretending it worked.

## Running the backend locally

Requires Python 3.10+.

```bash
cd textile-gauge-reader
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn backend.main:app --reload --port 8000
```

This serves the local-dev frontend at **http://localhost:8000** (same
origin as the API, so no CORS/config needed) *and* the API itself. To
instead exercise the production frontend against a local backend, open
`../textile-gauge-reader.html` directly in a browser and temporarily set
`CONFIG.API_BASE_URL = "http://localhost:8000"` in `textile-gauge-reader.js`.

### API

`POST /analyze` — multipart form:

| field | type | description |
|---|---|---|
| `file` | file | JPG/PNG/WEBP image, ≤15 MB |
| `roi_x`, `roi_y`, `roi_width`, `roi_height` | float | ROI in original-image pixel coordinates |
| `cal_x1`, `cal_y1`, `cal_x2`, `cal_y2` | float | Two calibration points, original-image pixel coordinates |
| `known_distance` | float | Known physical distance between the two calibration points |
| `unit` | `mm` \| `cm` \| `in` | Unit of `known_distance` |
| `orientation` | `vertical` \| `horizontal` | Direction wales run in the photo |

Returns JSON with `pixels_per_mm`, `wale`/`course` objects (each with
`spacing_px`, `spacing_mm`, `per_inch`, `positions_px`, `confidence`,
`message`, plus the harmonic-disambiguation diagnostics `candidates_px`
and `selected_reason`), `analyzed_area_px`, `analyzed_area_mm`, `roi`,
`algorithm_version`, and `loop_centers_px` (approximate 2D loop-center
points for the debug overlay). Validation failures (bad file type,
oversized upload, degenerate calibration, out-of-bounds ROI) come back
as `success: false` with a clear `message` and an appropriate 4xx
status — never a fabricated result.

`POST /propose-rois` — multipart form: `file` + the same calibration
fields as `/analyze` (no ROI/orientation yet — this runs before either is
known). Returns `rois` (list of `{x, y, width, height, label,
quality_score, sharpness, contrast, periodicity, texture_consistency,
brightness_score}`) and `window_size_px`. See [Multi-region measurement](
#multi-region-measurement-propose-review-measure-independently-cross-check).

`POST /analyze-multi` — multipart form: `file`, `rois_json` (a JSON array
of `{label, x, y, width, height, source}`, in place of `/analyze`'s single
`roi_x`/`roi_y`/`roi_width`/`roi_height`), plus the same calibration/
`orientation`/`structure` fields as `/analyze`. Returns the **same shape**
as `/analyze` (`wale`/`course` are the cross-region consensus, `roi` is
the primary/overlay region) plus `multi_roi`: every region's own
independent measurement (`per_roi`, including `wale_source` — `"loop_
count"` or `"periodicity"`, see [Wale gauge from counted loop columns](
#wale-gauge-from-counted-loop-columns-not-a-raw-period) — and `wale_
count_confidence`) and each axis's consensus detail (`wale_consensus`/
`course_consensus`: `included_labels`, `excluded_labels`, `outliers`,
`regional_median_px`/`_per_inch`, `regional_spread_px`).

`POST /count-repeats` — multipart form: `file`, `roi_x`/`roi_y`/`roi_width`/
`roi_height` (the area to search), `anchor_start_x`/`anchor_start_y`/
`anchor_end_x`/`anchor_end_y` (two user-marked points spanning one
confirmed repeat), `orientation`, `axis` (`wale` \| `course`), and
`pixels_per_mm`. Returns `spacing_px`/`spacing_mm`/`per_inch`,
`match_count`, `match_positions_px`, `match_scores`, and `confidence` — an
independent, user-anchored evidence source that never feeds into
automatic detection, see [Verify by counting a repeat](
#verify-by-counting-a-repeat-user-anchored-template-matching).

`POST /detect-ruler` — multipart form: `file` only (no calibration fields
— this runs BEFORE any calibration exists). Returns `success`,
`point1_px`/`point2_px` (suggested calibration points), `suggested_
distance`/`suggested_unit`, `minor_tick_spacing_px`, `major_tick_count`,
and `confidence` — a suggestion to pre-fill the Calibrate Scale step,
never applied without the user's own confirm/override. See [Automatic
ruler calibration detection](#automatic-ruler-calibration-detection).

`GET /health` — liveness check (used as Render's health check path).
`GET /api/health` — same thing, kept for the local-dev frontend.

`POST /corrections`, `GET /corrections`, `GET /corrections/export.csv`,
`GET /corrections/export.json` — the ground-truth correction system, see
[below](#ground-truth--correction-system).

### Tests

```bash
pip install pytest
pytest tests/
```

### Test harness: synthetic ground truth + metamorphic invariants

Two complementary additions that test the detector in ways hand-labeled
photos can't:

**Synthetic stitch-primitive fabrics** (`tests/synthetic_fabric.py` +
`tests/test_synthetic_fabric_gauge.py`). Renders jersey / 1×1 rib /
garter from actual stitch primitives — a jersey stitch is a real
two-legged V, so the leg-to-leg half-period harmonic (this project's
single most damaging failure mode) genuinely exists in the image, unlike
the older sinusoid fixtures which structurally cannot contain it — at
EXACT known gauge, with composable degradations (perspective warp,
lighting gradient, blur, JPEG round-trip, an optional yarn-ply harmonic
trap). Ground truth lives only in `tests/`; nothing in `analysis/` can
see it. Structures with a legitimate reading ambiguity (rib's hidden
purl wales, garter's ridge pairs) carry BOTH truth values, and the
scorer records which one matched rather than pretending the ambiguity
away.

Every expectation in the grid was calibrated against the real detector
before being committed, and the calibration itself produced findings —
encoded as **strict xfails** (they fail CI the moment a future change
fixes them, forcing the documentation to update):

- Mildly degraded jersey at 5×7 gauge flips BOTH axes to the confident
  (~0.67) leg half-harmonic — isolated to a blur+perspective interaction
  with one specific warp geometry (seed 7); identical degradation levels
  at seeds 8–10 stay correct, no single degradation alone flips it, and
  the `structure="jersey"` hint does not rescue it. The classic
  real-photo failure, now reproducible on demand (and regression-pinned
  from both sides: a companion test asserts seeds 8–10 stay correct).
- Fine-gauge course axes flip to half period under mild degradation
  (jersey) or even clean (rib); rib's course axis also reads ~18% high
  at coarse gauge — genuinely unreliable on rib, cause not yet
  diagnosed.
- Fine-gauge garter wale reads the 2× bump-lattice period.
- The ply-twist trap on clean jersey is correctly resisted (locked in
  as a passing test — the anti-harmonic machinery earning its keep
  against ground truth for the first time).

A full degradation sweep (blur × warp × seed, diagnostic table output)
is gated behind `TGR_FULL_SWEEP=1`.

**Metamorphic invariants** (`tests/metamorphic.py` +
`tests/test_metamorphic_fixtures.py`). For photos with NO known gauge —
i.e. any real photo — the detector is checked against how its output
must co-vary with known transforms: 1.5× resize scales pixel spacing by
exactly 1.5× (tol 4%: sub-pixel refinement jitters 1–2% on these
periods, resampling ~1%); 90° rotation with the orientation parameter
held fixed swaps wale↔course (tol 2% — lossless, so more means
axis-asymmetric processing); horizontal mirror is identical (tol 1%);
halving the ROI holds density (tol 10%, and SKIPPED per axis when the
half window would span <5 periods — below that the estimate is
legitimately unstable, and either pass or fail would be a lie); a
quality-60 JPEG round-trip moves the result <5%. Outcomes are
classified, not just pass/failed: `harmonic_flip` (ratio near 0.5×/2×)
is its own status regardless of tolerance, and `lost` another, because
a 6% drift and a 2× flip are different bugs. Runnable on any photo
without writing a test:

```bash
python tests/metamorphic.py path/to/photo.jpg [--roi X,Y,W,H] [--orientation vertical]
```

First run against the real jersey fixture: 7/10 outcomes passed; all
three violations were diagnosed to a mechanism before being encoded as
strict xfails. The biggest was a previously-unknown root cause: **the
post-selection spacing refinement was boundary-phase sensitive** — on
mirror, both directions selected the same 35.0px candidate with
near-identical evidence, but the old mean-of-all-gaps refinement pulled
it to 37.2 on the original and 34.4 on the mirror (±2.3px in opposite
directions, straddling the candidate).

**That finding has since been fixed** (see `_refine_spacing_from_
positions`' docstring for the full account): the refinement now uses
per-step-normalized gaps — each gap counts `round(gap/period)` whole
periods, and only contributes if its per-step value is inside the same
log tolerance the old design applied once at the end. A missed peak's
~2× gap now contributes correctly instead of poisoning the mean;
spurious ~0.5× and ambiguous ~1.5× gaps are excluded under either
rounding; and since the gap multiset is reversal-invariant, identical
detections mirror to identical spacing exactly. Verified before/after
on real data: the mirror disagreement fell from 7.6% to 0.6% (inside
the 1% bound — the strict xfail XPASSed and was removed, exactly the
designed mechanism); across five ROI phases on the real jersey photo,
mean wale error vs the hand-counted truth HALVED (+12.4% → +6.6%) and
course swing collapsed (8.2% → 4.7%) with mean error unchanged — no
phase-swing was traded for a systematic offset. As a bonus the same fix
XPASSed two synthetic rib-course xfails: their "reads ~18% high, cause
unknown" was the old estimator's inflation all along. (The recorded-
corrections SQLite export could not be checked directly — the local DB
is empty and the production copy lives on Render's ephemeral disk,
unreachable from the development sandbox — so the before/after used
the hand-established fixture ground truths instead: jersey ~5.0 WPI /
~7.35 CPI, teal 3.8 WPI, against which the fix moved every prediction
closer or left it unchanged.)

**The rotate90 violation has since been fixed too — after its diagnosis
was revised twice, each time by measurement.** First guessed as
refinement boundary phase (the estimator fix left it at 4.5%), then as
a wale-vs-course position-source asymmetry (also wrong: both axes were
refining from 1D peaks on this fixture, and the two sources refine
identically). The real cause: the projected 1D signals are **signed**
Sobel derivatives — deliberately signed, since rectifying would
frequency-double the periodicity analysis — and a mirror or 90°
rotation NEGATES the mapped axis's signal (measured correlation
−0.9999 between the reversed course signal and the rotated wale
signal). Peak detection on a negated signal locks onto the opposite
edge of each ridge — the valley lattice — which on an asymmetric stitch
profile refines a measurable 4.5% differently from the peak lattice.
`_canonical_sign_signal` now flips each projected signal so its
skewness is non-negative before positions are extracted (a global sign
flip, never `abs()`, so no frequency doubling; autocorrelation-based
selection is inherently sign-invariant and untouched). Rotate90 wale
agreement went 4.5% → 0.7% and mirror became exact. The honest cost,
measured rather than hidden: the canonical landmark on the real
fixture's course axis is the valley lattice (24.9px, +11% vs the ~22.4
hand count) where the lucky pre-fix sign draw read 24.0 (+7%) — but
that luck was orientation-dependent (a mirrored upload always read
24.9), which is exactly what the invariant forbids; on synthetics with
exact truth, all landmark choices agree within 0.1px.

**The resize seed-doubling has since been fixed as well — and the first
attempt was withdrawn by the harness itself.** The failure: a truly
periodic signal's autocorrelation peaks at T and 2T are near-equal
(measured strength ratios 0.977–0.996 across upscales — a coin flip
decided by interpolation crumbs), and the course path deliberately
takes its seed as-is, so at 1.5× the course reading doubled. A
strength-threshold-only preference for the half-lag was tried first
and immediately broken by the rotate90 invariant: the wale
leg-harmonic's half-peak measures 0.969 of its fundamental —
inseparable from the genuine ties in 1D autocorrelation, which is this
project's oldest lesson re-learned at the seed level. The landed fix
(`_prefer_fundamental_seed`, course seed only) resolves a detected
near-tie with 2D template-walk evidence instead: a genuine repeat
walks consistently (0.66–0.70 measured), while leg half-periods
alternate between mirror-image patches and fail outright (0.0
measured), and the 0.55 acceptance sits above the score's own 0.5
"couldn't measure" neutral so the seed only ever moves on positive
evidence. Verified a byte-identical no-op on every 1× fixture reading;
metamorphic is now 9/10 with rotate90 fully passing. Still open (and
strictly xfailed with its own pin against seed-flip regression): a
residual ~5% refinement drift at 1.5×, from fixed-pixel smoothing and
peak-prominence parameters making the upscaled gap set relatively
noisier — a scale-parameterization question for a future pass.

**The nine real `knit_sample` fixtures then generalized the rotate90
finding — and split it into three distinct mechanisms**, each measured
before anything was fixed. Running the invariants over all nine photos
showed half-period flips under rotation on five (ratios pinned at
0.49–0.51):

1. **Seed lands directly on the leg lattice** (samples 05/06/08, course
   axis after rotation): at coarse gauges the legs' autocorrelation
   peak outright BEATS the fundamental (0.755 vs 0.735 measured at
   34–73px leg spacing) — the jersey fixture only escapes because its
   fine 17.5px legs are partially attenuated by the fixed-pixel
   smoothing, an accidental and unreliable suppressor. Unrotated, the
   wale axis's candidate family climbs back up; the course path
   (seed-as-is) cannot. **Fixed for crisp-leg fabrics** by extending
   `_prefer_fundamental_seed` with a template-gated ASCENT symmetric to
   its descent: the seed only ascends when its own template walk fails
   outright (crisp mirror-image legs measured 0.000, far below the 0.5
   neutral) and the double-lag near-ties its strength and walks well
   (0.704). Sample 05's flip is gone and regression-pinned;
   byte-identical no-op on every 1× reading of all eleven photos.
   **Honest limitation:** samples 06/08 are chunky plied stockinette
   whose fat legs correlate with their own mirror twins at template
   scale (0.70 measured) — the discriminator saturates and they still
   flip; documented open.
2. **v3 halves rotated course structure** (samples 01/03/04, wale axis
   after rotation): course rows genuinely carry two edge lines per
   repeat (loop-head arc + inter-row shadow), the half-lag's
   autocorrelation legitimately dominates (0.132 vs 0.009 measured on
   sample 04), and the structural evidence stream (loop centers, fold
   pairing) is all-zero for row structure, so nothing overrules it. A
   design gap, not a scoring bug — open, needs its own pass.
3. **knit_sample_03's baseline wale (287px) is wrong independent of any
   transform**: clean-fabric autocorrelation shows a textbook harmonic
   comb with the fundamental at 142px (strength 0.800) and multiples at
   287/429/571/712, while the raw peak lattice sits at the ~67px legs;
   by the tape measure in the photo itself (317px/cm), truth is
   ~5.7 WPI and the 287px reading is an implausible ~2.8 WPI. The
   selection confidently took the 2× family at this large pitch —
   reserved for its own PR.

## Deploying the backend to Render

The backend is a standard ASGI app with no persistent storage, so it fits
Render's free "Web Service" tier. Images are only ever held in memory for
the duration of a single request.

**Option A — Blueprint (recommended, one click):**

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard: **New +** → **Blueprint**.
3. Connect the `evawm898/Portfolio-Site` GitHub repo. Render will detect
   `render.yaml` at the repo root and propose a service named
   `textile-gauge-reader-api`, rooted at `textile-gauge-reader/`.
4. Review and click **Apply**. Render will build and deploy automatically.
5. Once live, copy the service's URL (e.g. `https://textile-gauge-reader-api.onrender.com`).

**Option B — Manual Web Service** (if you'd rather not use the blueprint):

1. Render dashboard → **New +** → **Web Service** → connect the
   `evawm898/Portfolio-Site` GitHub repo.
2. **Root Directory**: `textile-gauge-reader`
3. **Runtime**: Python 3
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. **Environment variables**:
   - `PYTHON_VERSION` = `3.11.9`
   - `ALLOWED_ORIGINS` = the portfolio site's real origin(s), comma-separated,
     no spaces, no trailing slash — e.g.
     `https://evamaskalenko.com,https://eva-maskalenko.netlify.app`.
     (Leaving this unset defaults to `*`, which works but is wide open —
     fine for an experimental/unlisted page, tighten it once you know the
     final domain.)
7. **Health Check Path**: `/health`
8. **Instance Type**: Free is fine to start.
9. Create the service and wait for the first deploy to finish.

**After it's deployed:**

- Test it directly: `https://<your-service>.onrender.com/health` should
  return `{"status": "ok"}`.
- Open `../textile-gauge-reader.js`, find the `CONFIG` object near the
  top, and set:
  ```js
  const CONFIG = {
    API_BASE_URL: "https://<your-service>.onrender.com",
  };
  ```
  (No trailing slash.) Commit and push that one-line change.
- Reload `textile-gauge-reader.html` on the live portfolio site — the
  service-status indicator near the top should switch to "online", and
  the full Analyze step will work end to end.

**Notes:**

- Render's free tier spins the service down after inactivity; the first
  request after a period of idleness can take 30-60 seconds ("cold
  start"). The frontend's health check and Analyze error handling both
  account for this with a generous timeout and a clear retry message
  rather than treating a slow cold start as a crash.
- Nothing from `/analyze` is written to disk on the server — uploaded
  images exist only as in-memory arrays for the duration of the request.
  The one place anything touches disk is the opt-in ground-truth
  correction system — see
  [Ground Truth / Correction System](#ground-truth--correction-system),
  including the important caveat about Render's ephemeral disk.

## Ground Truth / Correction System

After a prediction, the Results screen has a **Verify Measurement**
section where you can record the true gauge for that sample. This
builds a labeled dataset for evaluating (and later, deliberately —
never automatically) tuning the detection algorithm. It never changes
analysis behavior on its own.

**What you can enter:**
- Actual wales/inch and courses/inch, directly, **or**
- Actual wale/course counts within the ROI — the app converts these to
  per-inch values using the ROI's calibrated physical dimensions
  (auto-filling the fields above; you can still edit them by hand
  afterward).
- Two checkboxes: whether the scale calibration and the wale/course
  orientation were correct for this sample.
- An opt-in "Save image for algorithm development" checkbox, **off by
  default**.

Saving shows an immediate **Predicted → Actual** comparison with signed
percent error for both axes (`(predicted - actual) / actual × 100`).

**What gets stored** (one row per saved correction): a unique sample ID,
an image identifier (filename + size + a SHA-256 hash computed in the
browser — the image itself isn't uploaded unless you opt in), ROI
coordinates and physical dimensions, pixels-per-mm, orientation, every
predicted value (spacing, per-inch, confidence, detected positions for
both axes), your entered/derived actual values, both percent errors,
the calibration/orientation-correct flags, and the algorithm version
(`analysis.gauge_analysis.ALGORITHM_VERSION`) that produced the
prediction — so later analysis can tell which pipeline revision a given
row came from.

### Where it's stored

A SQLite database at `textile-gauge-reader/data/corrections.db`
(created automatically on first use). If you opted into saving an
image, it's written alongside at `textile-gauge-reader/data/images/`.
Both are gitignored — never committed.

**Important if the backend is deployed on Render's free tier: this disk
is ephemeral.** Render wipes local disk on every redeploy (and possibly
on other lifecycle events depending on plan). Anything in `data/` will
be lost the next time you push a change that redeploys the service.
Locally (`uvicorn backend.main:app`), the SQLite file persists normally
on your machine like any other local file.

**Practical mitigation for now:** export the dataset (see below)
periodically, and definitely right before pushing any change that will
trigger a Render redeploy. The real long-term fix, if this needs to
survive redeploys unattended, is a Render persistent disk (paid) or an
external database — out of scope for this pass, which is focused on
collecting the first batch of ground truth.

### Exporting

Two ways to get the data out:

1. **From the page itself** — scroll to the footer of
   `textile-gauge-reader.html`. Once a backend URL is configured, it
   shows "Export CSV" / "Export JSON" links that download everything
   saved so far.
2. **Directly from the API** (useful for scripting/automation):
   ```bash
   curl -O -J https://<your-backend>.onrender.com/corrections/export.csv
   curl -O -J https://<your-backend>.onrender.com/corrections/export.json
   ```
   `GET /corrections` (no `export.` prefix) returns the same data as
   plain JSON without download headers, if you just want to inspect it.

Locally, you can also just open the SQLite file directly:
```bash
sqlite3 textile-gauge-reader/data/corrections.db "select * from corrections;"
```

## Investigated and rejected: user-anchored template matching

Standalone scratch experiment, never wired into `analysis/gauge_analysis.py`
or the app — recorded here so the negative result isn't relearned later.
Motivation: this project's single best real-photo result ever
(`count_repeats_by_template_match`, 5.04 WPI against a true 5.0) came from
template matching, not the periodicity pipeline. The question was whether
that generalizes into something worth shipping. Tested against the two real
fixtures (`real_jersey_sample.jpg`, true 5.0 WPI/7.2 CPI; `sarahmaker-
knitting-gauge.jpg`, true 4.0 WPI/5.0 CPI). It didn't clear the bar, on
either axis, for reasons worth keeping on record.

**Wale: the headline number was one lucky anchor, not a real effect.**
Four hand-picked anchors on jersey looked good (0.8%–14.7% error). A dense
grid of 72 anchors across the same photo told a different story: the
**median** anchor gave 14.7% error — *worse* than the current pipeline's
‑5.6%. The 5.04/0.8% result that motivated this whole investigation was the
best of a small, eye-picked sample, not representative of a typical click.
Refining the template by averaging the top-K matches (as originally
specified) made things worse in most cases, not better — it blurs in
false-positive phase/texture and broadens the match. On teal, anchor
placement alone swung wale from ‑13% to +55–66% error (an ~80%-of-true
spread across 4 anchors) purely by which stitch got clicked.

**A real correlate of the wale drift exists, but it's weak and doesn't
transfer.** An anchor's half-pitch self-similarity (normalized
cross-correlation between its template and a copy of itself shifted by half
a wale-pitch) predicts drift direction: an anchor that resembles its own
half-pitch neighbor over-counts. At 4 anchors this looked like a clean
monotonic ranking; at 72 anchors the real relationship is r=0.338 (p=0.004),
r²≈0.11 — real and worth knowing, but explaining ~10% of the variance is not
"reliable enough to threshold on." It filters out the *worst* overcounts
(almost nothing scores >20% error at strongly negative NCC) without
separating good from bad in the middle of the distribution. Tested against
teal's failure specifically (the hypothesis being that a 2x sub-lattice
lock-on looks like high self-similarity in general): r=0.065 (p=0.65),
indistinguishable from no relationship. The two fabrics' overcounting
mechanisms are not the same thing, and one diagnostic doesn't catch both.

**Course looked robust to anchor placement — until the test stopped
cheating.** A dense-grid course readout on jersey (72 anchors) gave a
median 7.5% error against the current pipeline's ‑53.1% harmonic lock-on,
with 99% of anchors under 20% error — a dramatic, reproducible-looking win.
It did not survive an honest re-test. The good numbers depended on sizing
the match template from the *true, known* gauge (`px_per_inch / true_wpi`)
to decide how fine a feature to search for — information a deployed
feature does not have; all it has is the *existing* (possibly already
wrong) automatic estimate. Re-run using only that: reusing the shipped
walking-match core (`_walk_template_matches`), seeded and step-sized from
the existing course reading, just reproduces the same wrong answer, because
the walk's own search window is derived from the number it's supposed to
correct. Switching to a free, unseeded whole-ROI scan doesn't fix this
either — the result becomes acutely sensitive to template size, and there
is no single default size that works on both fixtures without peeking at
ground truth: a small template (~13px) recovers jersey's true course
period, but on teal it locks onto the same yarn ply-twist sub-texture
described below (65–127% error on 3 of 4 anchors); a larger template
(~27px) is fine on teal but reproduces jersey's original failure. A
multi-scale, self-consistency-based scale picker was considered and
explicitly not built, because validating a scale-selection heuristic
against the same two photos used to discover the problem is the identical
trap one level down.

**Two independent, real mechanisms came out of this that are worth keeping
regardless of the template-matching verdict:**
- **Yarn ply-twist on the teal fixture.** A direct intensity-profile
  measurement across the fabric shows a genuine, clean periodic feature at
  roughly double the true stitch frequency (~7.2 peaks/inch vs. the
  hand-counted 4 wales/inch) — this is *not* rib structure (there's no
  visible knit/purl alternation in a gridded zoom of the photo; it's
  continuous rope/braid-like texture), and it's the same trap that once
  fooled a careful direct pixel measurement on this exact photo (see
  "A real second photo..." above). It's what both the wale-axis anchor
  sensitivity and the course-axis template-size sensitivity above are
  actually running into on this fixture.
- **Color pooling on variegated yarn** (see "the column count is
  region-dependent by 5x" investigation elsewhere in this history):
  variegated-yarn color transitions that are coherent across multiple
  rows defeat multi-row consensus defenses, because the noise isn't
  independent row-to-row the way the consensus math assumes.

**Bar for revisiting.** Not "a better anchor" and not "a smarter refinement
step" — both were tried and both are secondary to the real blocker, which
is template *scale* selection. Worth reopening only with: (1) a
ground-truth-free way to pick or validate template scale at runtime — some
measurable self-consistency property of the matches themselves (never
accuracy, which isn't available outside a test), and (2) validation against
more than two photos, so a scale heuristic can't just be a threshold fitted
to jersey and teal the way the wale/course numbers above almost were.
Nothing from this investigation is in the codebase; it lives only in this
writeup.

## Known V0 limitations

- Orientation is user-specified, not auto-detected.
- The CV pipeline assumes reasonably flat, evenly lit, in-focus fabric —
  heavy wrinkling, motion blur, or extreme glare will lower confidence or
  fail to detect a pattern (by design, it reports that rather than
  guessing).
- No AI/ML model is used in V0; this is a placeholder for a future,
  more robust detector.
- The loop-center detector is a heuristic blob response (compact,
  loop-scale brightness maxima), not trained loop segmentation. It can
  still miss loops in poor lighting/focus or on fabrics whose loop heads
  aren't the most locally prominent feature; when its evidence is too
  thin or internally inconsistent to trust, the axis falls back to the
  autocorrelation-only estimate with a message saying so — check
  Detection Details and Show Loop Centers on any result you're not sure
  about, rather than assuming a number without a "corrected" reason is
  automatically right.
- No automatic perspective correction: `cv-v0.3` detects spacing that
  varies significantly across the ROI (via multi-patch consensus) and
  lowers confidence accordingly, but it does not attempt to actually
  correct for perspective/lens distortion — a future version could warp
  the ROI to a fronto-parallel view before periodicity analysis.
- Course selection (restored to the pre-`cv-v0.3` per-axis pipeline —
  see "A real-photo regression, and phase consistency as its fix" above)
  is tuned for reasonably-sized measurement ROIs, not arbitrarily large
  ones: on the real jersey photo used for regression testing, an
  excessively large whole-fabric-strip ROI still picked a doubled course
  period. Prefer a smaller, representative crop (roughly what the
  ~1in²-ish examples throughout this doc use) over analyzing the entire
  visible fabric at once.
- Wale detection remains genuinely uncertain on some ROI placements even
  with phase-consistency evidence (see above): it's expected, and by
  design, for a result to come back flagged `uncertain`/LOW CONFIDENCE
  rather than a falsely-confident number when the true full repeat and
  its half-period harmonic are still close to a coin flip on a
  particular crop.
- Ground-truth corrections are collected but never applied automatically
  — tuning the algorithm from that data is a deliberate, separate step.
- Correction storage is a single SQLite file with no auth in front of
  the save/export endpoints — fine for a personal experiment on an
  unlisted page, not intended as a public-facing data collection system.
