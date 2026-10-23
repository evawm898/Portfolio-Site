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

*(One instance of the broader period-selection ambiguity quantified in
"How ROI-dependent is this, really?" below — see its "central finding"
subsection for how this connects to ply-twist, color pooling, and the
position-dependent coin-flips found by the mechanical ROI sweep.)*

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

#### The central finding: two layered problems, not one

The sweep above shows a large spread but doesn't say what's driving it.
A follow-up pass tagged all 210 axis-observations from the same 15-crop
mechanical grid with three more facts per crop — does it overlap a ruler,
pin, or foreign object (a fixed bounding box per fixture, defined once,
not re-picked); how many true stitch/row repeats fit in it (crop size ÷
ground-truth period); and the pipeline's own status/confidence — and
separated their effects instead of reporting one blended spread.

**Contamination is the dominant real-photo error source, by a wide
margin:**

| | median \|err\| | harmonic-lock rate |
|---|---|---|
| crop overlaps a ruler/pin/marker | 65.8% | 40% |
| clean fabric only | 7.2% | 23% |

**Crop size is a second-order effect, and naive analysis makes it look
backwards.** Raw (uncontrolled) data shows error getting *worse* at
larger crop sizes — but that's confounded: bigger crops mechanically
overlap more of a fixture's (fixed-size) contamination zone, so larger
crops are also *more likely to be contaminated* (51%→60%→73% of crops as
size grows 30%→50%→70%). Controlling for that, within clean crops only,
size shows the trend you'd actually expect, just a mild one: median
\|err\| 8.2% → 7.2% → 5.6% as crops grow from ~6 to ~15 stitch repeats.
No sharp "minimum viable ROI" threshold — just a gentle improvement with
more fabric in frame.

**Removing both confounds — clean fabric AND ≥6 repeats (n=69, 11
fixture/axis pairs) — does not reveal a small, uniform residual. It
reveals a bimodal split:**
- **4 of 11 pairs are reliably accurate** regardless of exact position
  (jersey course, knit_06 course, knit_08 course, knit_09 wale — every
  clean/large crop on these reads within single-digit % error).
- **1 of 11 is reliably, systematically wrong** (knit_06 wale: all 9
  clean/large crops read -67% to -85% — not a coin flip, this scale is
  simply wrong on this fixture no matter where the crop sits).
- **6 of 11 are a genuine coin flip**, correct on some clean/adequately-
  sized crops and badly wrong (a harmonic multiple) on others, with
  nothing about cleanliness or size predicting which: jersey wale, teal
  wale, knit_05 wale, knit_05 course, knit_08 wale, knit_09 course. The
  starkest example — knit_05's course axis across its six clean, ≥6-
  repeat crops reads **+1%, +87%, +1%, -52%, -1%, -75%** — alternating
  between correct and badly wrong purely from where an otherwise-clean,
  adequately-sized crop happens to land. "Use a bigger, cleaner crop"
  has no answer for this class: bigger, cleaner crops disagree with each
  other.

**Confidence tracks part of this, imperfectly.** The coarse `status`
flag (confident/uncertain) carries real signal — confident observations
have median \|err\| 5.8% vs. uncertain's 67.0% — worth keeping. But it's
a partial gate, not a solution: 29% of "confident" results are still
wrong by >15% (one reads +100.6% error at confidence 0.83), and 39% of
"uncertain" results are actually fine (≤15% error) — false confidence
and over-caution both happen often enough to matter. The **numeric**
confidence score, separately, carries essentially no information at all:
Pearson correlation between confidence and absolute error across all 210
observations is **-0.028** — indistinguishable from zero. Only the
binary status split is informative; the number attached to it isn't.

**Acted on, not just noted: the numeric score is gone from the API and
UI.** `AxisOut` (backend/schemas.py) no longer has a `confidence` field
at all — `/analyze` and `/analyze-multi`'s primary `wale`/`course`
responses don't send it, and the frontend shows only Confident/Uncertain
(plus `uncertain_reason`) anywhere a user looks. A number that doesn't
track error is worse than no number: it invites more trust in one wrong
result over another equally wrong one just because it carries a higher
digit. The raw score still exists internally (`AxisResult.confidence` in
`analysis/gauge_analysis.py`, used computationally — e.g. the
`UNCERTAIN_CONFIDENCE_THRESHOLD` floor) and is still surfaced in
`AxisDebugOut`, used only by the per-region detail nested under
`/analyze-multi`'s `multi_roi` (Developer diagnostics), explicitly
labeled internal/uncalibrated there. Restoring a real, calibrated
confidence number is future work that depends on first understanding the
position-dependent coin-flip documented above — a score fit to today's
8-9 fixtures without that would very likely just be fit to their
particular coin-flips, the same "threshold fitted to two photos" trap
already rejected once in this project (see "Investigated and rejected:
user-anchored template matching").

**This reframes several mechanism writeups already in this README as the
same underlying problem, not separate bugs.** Yarn ply-twist on the teal
fixture (see "Investigated and rejected" below), color pooling on
variegated yarn (same section), and the density-cross-check override
that fires on a decisive-but-wrong pick (see "The density cross-check's
blind spot" above) are three different *mechanisms* for arriving at the
same *symptom*: a genuinely periodic sub-feature — a half-stitch texture,
a color-transition rhythm, a leg-crossing blob — sits close enough to the
true stitch period that something in the pipeline locks onto it instead,
and which one wins is sensitive to exactly where the analysis window
sits. The coin-flip pairs found here (jersey wale, teal wale, knit_05,
knit_08 wale, knit_09 course) are that same ambiguity showing up as
*position*-dependence rather than a named texture cause — the common
thread is one underlying period-selection ambiguity with several
different triggers, not an unrelated bug per fixture.

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
`confidence`, `assumption` (what the detector assumed, in plain words) and
`declined_reason` — a suggestion to pre-fill the Calibrate Scale step,
never applied without the user's own confirm/override, and **offered only
when the span between the two points can be justified from the ruler's own
tick pattern**; otherwise `success` is false, nothing is pre-filled and the
user calibrates by hand. See [Automatic ruler calibration
detection](#automatic-ruler-calibration-detection) and [Calibration
guardrail](#calibration-guardrail-a-ruler-pre-fill-is-offered-only-when-it-can-be-justified-2026-10-22).

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

CI runs this suite on every pull request and push to `main` that touches
`textile-gauge-reader/` (`.github/workflows/textile-gauge-tests.yml`).
The strict xfails are part of the contract: an unexpected pass fails
the run, so a fix cannot land without its documentation catching up.

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
a 6% drift and a 2× flip are different bugs. `lost` covers two cases:
detection vanished under the transform, or the ratio is beyond 2.5× /
below 0.4× — at that distance the reading is a different structure
(a ruler edge, a stray sub-feature), not a drifted version of the
baseline, and calling an 80× ratio "drift" buried it behind the same
word as a 4% wobble (it did, until the baseline tables below were
recorded). `drift` is the band in between. Runnable on any photo
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

**The two doubled course periods at native scale (05/08) were the
descent's own gate, not a missing evidence stream — measured before
anything changed.** The scorecard below recorded knit_05 course at
98.9px (−51.7%) and knit_08 at 96.0px (−47.8%), both ~2× the true row
pitch, unrotated, unresized. The premise going in was that the course
axis had no structural test to correct a doubled seed. It did:
`_prefer_fundamental_seed`'s descent already resolved T-vs-2T with the
template walk at the half-lag — but only inside a ≥ 0.95 near-tie,
because that is what the resize coin-flip (0.977–0.996) and the jersey
(0.96) looked like. Both course signals carry the true pitch as a real
autocorrelation peak: on 05, 50px at 0.449 beside 100px at 0.486
(ratio 0.92); on 08, 48px at 0.437 beside 105px at 0.532 (0.82; 51px at
0.448 vs 102px at 0.500 unrotated). A doubled seed on real fabric is
therefore *not* a near-tie — alternate rows genuinely differ a little
(rowing-out), so the exact two-row repeat correlates a shade better
than the one-row one, and the gate never opened. A second, independent
failure sat behind it: with the walk's default band (1.6 course
pitches wide, barely one wale) the adjacent-row correlation on 05
measured 0.24–0.31, just under the 0.35 match floor, so the walk at
the TRUE pitch failed outright (0.0) while the doubled pitch walked at
0.71 — exactly backwards. Widening the band to 3–8 pitches lifted the
true-pitch walk to 0.67–0.70 on every fixture with a course truth
(jersey, teal, 05/06/08/09), and the crisp leg lattices a rotated
course axis sees (jersey, 01/05/08/09) still failed at 0.00 at every
width.

The landed change is the **sub-repeat test** (`_subrepeat_walk_score`):
a course candidate is a doubled period whenever its *half-lag* is
itself a genuine repeat by 2D evidence. The true pitch is rewarded
because nothing below it walks — its half is anti-correlated (every 1×
course signal here reads ac ≤ −0.15 at T/2, no peak at all); the
doubled pitch scores zero because its half is T, which walks. The walk
itself cannot see doubling from the candidate (a true T is also a
repeat at 2T; both walk at 0.68–0.71), which is why the wale's leg
test — a half that *fails* — is the mirror image of this one. The
descent's gate became a real-peak floor (`SEED_HALF_MIN_STRENGTH_RATIO`
= 0.75, between the calibrated non-ties at ≤ 0.64 and the doubled seeds
at ≥ 0.82) with the wide-band walk (`SUBREPEAT_TEMPLATE_HEIGHT_FRACTION`
= 4.0) as the decider; the ascent is untouched, and the descent is
still a single step. Result: 05 course 98.9 → 51.2px (−6.7%), 08 course
96.0 → 51.3px (−2.2%), every other scorecard row byte-identical, both
former strict xfails flipped green and re-pinned. Mechanism pinned on
the real signals in `tests/test_course_subrepeat.py`.

**Checked and left alone: knit_05's wale (+103%, 33.5px legs vs ~68px)
is a different mechanism.** The wale never uses the seed rule; its v0.3
scorer sees the same template-walk verdict (legs 0.000, true pitch
0.699) but at weight 0.10, and picks the legs on phase consistency
(0.606 vs 0.175 at weight 0.378), regional consensus (0.96 vs 0.43,
the term already documented as untrustworthy for exactly this) and
fold consistency (0.86 vs 0.84 — fooled too). A scorer-weighting
failure, not the descent gate from the other side; reserved for its
own pass. knit_02's wale is ruler contamination in the pinned ROI,
also untouched.

### Recorded baselines — what to diff the next run against

Both tables below are the detector's actual output on 2026-09-03 against
`main` at `7974ad9` (detector code unchanged since PR #109), recorded so
a future run has a number to diff against instead of prose to reinterpret.
Neither is a target. Regenerate with the commands shown and paste the new
table next to the old one, never over it.

**Ground-truth scorecard** — signed % error at native scale,
`(predicted − true) / true`, positive = reads too fine (half-period
lock-on lands near +100%), negative = reads too coarse (a doubled period
lands near −50%). Pinned as a regression baseline in
`tests/test_ground_truth_scorecard.py`: a row inside 20% fails the suite
if its absolute error worsens by more than 2 points; a row beyond 20% is
a strict xfail asserting the 20% bar, so a fix shows up as a green flip.
ROIs are the `ROI_XX` constants pinned in `knit_sample_ground_truth.py`
(central square, 50% of the shorter side, one mechanical rule, never
nudged); the jersey and teal fixtures have no pinned ROI of their own,
so the same rule is applied to them. Truths: jersey 5.0 WPI / 7.2 CPI and
teal 4.0 WPI / 5.0 CPI are hand counts (the "teal 3.8 WPI" quoted once
in the harness write-up above has no derivation anywhere in the repo;
the direct hand count under "A real second photo" and every existing
test say 4.0, which is what is used); the knit samples are AI-estimated,
human-verified, a step below. 03/04/07 have no usable truth and are absent.

```bash
python tests/test_ground_truth_scorecard.py
```

| fixture | axis | ROI (x,y,w,h) | true /in | predicted /in | spacing px | signed error | baseline | status |
|---|---|---|---|---|---|---|---|---|
| jersey | wale | (241, 121, 242, 242) | 5.0 | 4.72 | 35.2 | -5.5% | -5.5% | ok |
| jersey | course | (241, 121, 242, 242) | 7.2 | 6.86 | 24.222 | -4.7% | -4.7% | ok |
| teal | wale | (300, 450, 600, 600) | 4.0 | 3.50 | 77.833 | -12.4% | -12.4% | ok |
| teal | course | (300, 450, 600, 600) | 5.0 | 5.14 | 53.111 | +2.7% | +2.7% | ok |
| knit_01 | wale | (550, 431, 862, 862) | 3.8 | 3.97 | 83.875 | +4.5% | +4.5% | ok |
| knit_01 | course | (550, 431, 862, 862) | 5.7 | 5.60 | 59.5 | -1.8% | -1.8% | ok |
| knit_02 | wale | (1308, 654, 1308, 1308) | 4.0 | 8.81 | 134.667 | +120.4% | +120.4% | xfail (>20%) |
| knit_05 | wale | (469, 504, 937, 937) | 4.7 | 9.56 | 33.481 | +103.4% | +103.4% | xfail (>20%) |
| knit_05 | course | (469, 504, 937, 937) | 6.7 | 3.24 | 98.857 | -51.7% | -51.7% | xfail (>20%) |
| knit_06 | wale | (609, 328, 656, 656) | 3.8 | 3.67 | 127.5 | -3.3% | -3.3% | ok |
| knit_06 | course | (609, 328, 656, 656) | 5.2 | 5.22 | 83.0 | +0.4% | +0.4% | ok |
| knit_08 | wale | (502, 252, 504, 504) | 4.5 | 4.59 | 75.4 | +2.0% | +2.0% | ok |
| knit_08 | course | (502, 252, 504, 504) | 6.9 | 3.60 | 96.0 | -47.8% | -47.8% | xfail (>20%) |
| knit_09 | wale | (374, 270, 539, 539) | 5.1 | 4.95 | 37.75 | -2.9% | -2.9% | ok |
| knit_09 | course | (374, 270, 539, 539) | 7.6 | 8.18 | 22.867 | +7.6% | +7.6% | ok |

Two things the table says that the prose above did not: the four rows
beyond the bar are two half-period wale lock-ons (02 on its ruler, 05
on its legs) and two doubled course periods (05, 08 — the course path's
seed-as-is family), and knit_08's **wale** reads +2.0% at the pinned
ROI — the confidently-reported ~2× wale harmonic recorded earlier came
from a different, hand-picked crop, which is the ROI-dependence finding
again, not a contradiction.

**Re-run after the sub-repeat test landed** (same day, same ROIs, same
command; the two course rows are the only cells that moved, and the
baseline column now carries their re-pinned values):

| fixture | axis | ROI (x,y,w,h) | true /in | predicted /in | spacing px | signed error | baseline | status |
|---|---|---|---|---|---|---|---|---|
| jersey | wale | (241, 121, 242, 242) | 5.0 | 4.72 | 35.2 | -5.5% | -5.5% | ok |
| jersey | course | (241, 121, 242, 242) | 7.2 | 6.86 | 24.222 | -4.7% | -4.7% | ok |
| teal | wale | (300, 450, 600, 600) | 4.0 | 3.50 | 77.833 | -12.4% | -12.4% | ok |
| teal | course | (300, 450, 600, 600) | 5.0 | 5.14 | 53.111 | +2.7% | +2.7% | ok |
| knit_01 | wale | (550, 431, 862, 862) | 3.8 | 3.97 | 83.875 | +4.5% | +4.5% | ok |
| knit_01 | course | (550, 431, 862, 862) | 5.7 | 5.60 | 59.5 | -1.8% | -1.8% | ok |
| knit_02 | wale | (1308, 654, 1308, 1308) | 4.0 | 8.81 | 134.667 | +120.4% | +120.4% | xfail (>20%) |
| knit_05 | wale | (469, 504, 937, 937) | 4.7 | 9.56 | 33.481 | +103.4% | +103.4% | xfail (>20%) |
| knit_05 | course | (469, 504, 937, 937) | 6.7 | 6.25 | 51.214 | -6.7% | -6.7% | ok |
| knit_06 | wale | (609, 328, 656, 656) | 3.8 | 3.67 | 127.5 | -3.3% | -3.3% | ok |
| knit_06 | course | (609, 328, 656, 656) | 5.2 | 5.22 | 83.0 | +0.4% | +0.4% | ok |
| knit_08 | wale | (502, 252, 504, 504) | 4.5 | 4.59 | 75.4 | +2.0% | +2.0% | ok |
| knit_08 | course | (502, 252, 504, 504) | 6.9 | 6.75 | 51.25 | -2.2% | -2.2% | ok |
| knit_09 | wale | (374, 270, 539, 539) | 5.1 | 4.95 | 37.75 | -2.9% | -2.9% | ok |
| knit_09 | course | (374, 270, 539, 539) | 7.6 | 8.18 | 22.867 | +7.6% | +7.6% | ok |

### App path (what users see)

The two tables above are the **pinned-crop** scorecard: `analyze_gauge`
called once, on one mechanically chosen crop. No user ever gets that. The
app's path is `/detect-ruler` (pre-fills the calibration) → `/propose-rois`
(proposes areas, all pre-approved) → `/analyze-multi` (each area analyzed
independently, then a cross-region consensus). The tables below are that
path, driven through the shipped API with the FastAPI test client
(`tests/app_path_scorecard.py`, pinned in `tests/test_app_path_scorecard.py`
and run by the `textile-gauge-tests` workflow): every proposed area
accepted, orientation `vertical`, structure `unknown` (the frontend's
defaults). Truths are the pinned-crop scorecard's; `synth_*` are clean
5 WPI × 7 CPI synthetic fabrics at 180 px/in, 960×720, drawn with no
ruler (the rib wale and garter course are scored against whichever of the
two legitimate readings is nearer, marked `(alt)`). knit_06 has two
rulers at two scales: the request is calibrated with the cm (wale) ruler,
and on (a) each axis is scored against its own ruler. Per-area status is
`C` confident / `u` uncertain, one letter per proposed area. **Bold** =
confident-and-wrong (status `confident`, |error| > 10%), the headline
number for every PR. Pinned with the pinned-crop scorecard's contract: a
row within 20% may not worsen by more than 2 points; a row beyond 20%, a
fixture with no proposals, a photo with a ruler that is offered no pre-fill
(`WITHHELD_RULER`) and a jitter-unstable result are strict xfails; the
confident-and-wrong lists are pinned exactly. Calibration (b) is "accept the
ruler pre-fill if one is offered, otherwise calibrate by hand, correctly" (see
[Calibration guardrail](#calibration-guardrail-a-ruler-pre-fill-is-offered-only-when-it-can-be-justified-2026-10-22)).
This block is generated — `python tests/app_path_scorecard.py
--write-readme` — and the suite fails if it is stale.

<!-- app-path-scorecard:begin (generated by `python tests/app_path_scorecard.py`; do not edit by hand) -->
**Confident-and-wrong** (status `confident`, |error| > 10%):

- **truth** calibration: **1** confident-and-wrong of 21 scored axes (teal W)
- **ruler** calibration: **1** confident-and-wrong of 21 scored axes (teal W)

**(a) Correct scale from ground truth**

| fixture | areas | WPI true | WPI app | W err | W status | W per-area | CPI true | CPI app | C err | C status | C per-area |
|---|---|---|---|---|---|---|---|---|---|---|---|
| jersey | 2 | 5.00 | 4.72 | -5.5% | confident | u u | 7.20 | 6.74 | -6.4% | confident | C C |
| teal | 4 | 4.00 | 3.48 | **-13.0%** | confident | u u u u | 5.00 | 4.97 | -0.6% | confident | C C C C |
| knit_01 | 3 | 3.80 | 3.73 | -1.9% | confident | u u u | 5.70 | 3.98 | -30.2% | uncertain | C u C |
| knit_02 | 4 | 4.00 | 3.90 | -2.4% | confident | u u u u | — | — | no truth | — | — |
| knit_05 | 4 | 4.70 | 4.81 | +2.4% | confident | u u u u | 6.70 | 6.31 | -5.8% | confident | C C C C |
| knit_06 | 4 | 3.80 | 3.64 | -4.3% | confident | C u u u | 5.20 | 5.30 | +2.0% | confident | C C C C |
| knit_08 | 2 | 4.50 | 4.70 | +4.5% | confident | u u | 6.90 | 6.74 | -2.3% | confident | C C |
| knit_09 | 3 | 5.10 | 4.97 | -2.5% | confident | u C C | 7.60 | 7.53 | -0.9% | confident | C C C |
| synth_jersey | 3 | 5.00 | 5.01 | +0.2% | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |
| synth_garter | 3 | 5.00 | 5.00 | +0.0% | confident | u u u | 7.00 | 7.01 | +0.1% | confident | C C C |
| synth_rib | 3 | 5.00 | 2.50 | +0.0% (alt) | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |

**(b) The ruler pre-fill accepted if one is offered; otherwise the user calibrates by hand, correctly** (the pre-fill is ok within 5%; OFF 5-20%, the points misplaced; WRONG beyond 20%, a wrong distance label or unit; SPURIOUS, offered in a photo drawn without a ruler; withheld, a photo that has a ruler and was offered none; none (correct), no ruler and none offered)

| fixture | pre-fill offered | implied px/in | true px/in | scale error | verdict |
|---|---|---|---|---|---|
| jersey | 1 in | 165.00 | 166.25 | -0.8% | ok |
| teal | none | — | — | — | withheld |
| knit_01 | 1 cm | 337.82 | 333.00 | +1.4% | ok |
| knit_02 | none | — | — | — | withheld |
| knit_05 | none | — | — | — | withheld |
| knit_06 | none | — | — | — | withheld |
| knit_08 | none | — | — | — | withheld |
| knit_09 | none | — | — | — | withheld |
| synth_jersey | none | — | — | — | none (correct) |
| synth_garter | none | — | — | — | none (correct) |
| synth_rib | none | — | — | — | none (correct) |

| fixture | areas | WPI true | WPI app | W err | W status | W per-area | CPI true | CPI app | C err | C status | C per-area |
|---|---|---|---|---|---|---|---|---|---|---|---|
| jersey | 2 | 5.00 | 4.69 | -6.2% | confident | u u | 7.20 | 6.72 | -6.7% | confident | C C |
| teal | 4 (manual) | 4.00 | 3.48 | **-13.0%** | confident | u u u u | 5.00 | 4.97 | -0.6% | confident | C C C C |
| knit_01 | 4 | 3.80 | 3.90 | +2.8% | confident | u u u u | 5.70 | 5.97 | +4.7% | confident | C u C C |
| knit_02 | 4 (manual) | 4.00 | 3.90 | -2.4% | confident | u u u u | — | — | no truth | — | — |
| knit_05 | 4 (manual) | 4.70 | 4.81 | +2.4% | confident | u u u u | 6.70 | 6.31 | -5.8% | confident | C C C C |
| knit_06 | 4 (manual) | 3.80 | 3.64 | -4.3% | confident | C u u u | 5.20 | 5.30 | +2.0% | confident | C C C C |
| knit_08 | 2 (manual) | 4.50 | 4.70 | +4.5% | confident | u u | 6.90 | 6.74 | -2.3% | confident | C C |
| knit_09 | 3 (manual) | 5.10 | 4.97 | -2.5% | confident | u C C | 7.60 | 7.53 | -0.9% | confident | C C C |
| synth_jersey | 3 (manual) | 5.00 | 5.01 | +0.2% | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |
| synth_garter | 3 (manual) | 5.00 | 5.00 | +0.0% | confident | u u u | 7.00 | 7.01 | +0.1% | confident | C C C |
| synth_rib | 3 (manual) | 5.00 | 2.50 | +0.0% (alt) | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |

**Scale jitter around the correct scale** (per-inch result as the user sees it; change vs the unjittered run; flagged beyond ±25% or on a status flip)

| fixture | axis | base /in | base status | -2.0% | -1.0% | -0.5% | +0.5% | +1.0% | +2.0% | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| jersey | wale | 4.72 | confident | 4.66 (-1%) | 4.66 (-1%) | 4.70 (-1%) | 4.82 (+2%) | 4.83 (+2%) | 4.71 (-0%) | stable |
| jersey | course | 6.74 | confident | 6.49 (-4%) | 6.49 (-4%) | 6.74 (-0%) | 6.87 (+2%) | 6.84 (+1%) | 6.88 (+2%) | stable |
| teal | wale | 3.48 | confident | 3.46 (-1%) | 3.46 (-1%) | 3.46 (-1%) | 3.58 (+3%) | 3.50 (+1%) | 3.55 (+2%) | stable |
| teal | course | 4.97 | confident | 5.01 (+1%) | 5.07 (+2%) | 4.97 (-0%) | 5.13 (+3%) | 5.26 (+6%) | 5.19 (+4%) | stable |
| knit_01 | wale | 3.73 | confident | 3.98 (+7%) | 3.97 (+7%) | 3.86 (+4%) | 3.92 (+5%) | 4.12 (+10%) | 4.33 (+16%) | stable |
| knit_01 | course | 3.98 | uncertain | 3.91 (-2%) | 5.60 (**+41%**) **confident** | 2.77 (**-30%**) **confident** | 5.21 (**+31%**) **confident** | 5.63 (**+42%**) **confident** | 4.07 (+2%) | UNSTABLE |
| knit_02 | wale | 3.90 | confident | 3.88 (-1%) | 4.14 (+6%) | 3.74 (-4%) | 3.77 (-3%) | 3.79 (-3%) | 4.13 (+6%) | stable |
| knit_02 | course | 6.05 | confident | 5.92 (-2%) | 5.93 (-2%) | 6.02 (-0%) | 6.20 (+3%) | 6.10 (+1%) | 5.86 (-3%) | stable |
| knit_05 | wale | 4.81 | confident | 4.74 (-1%) | 4.69 (-3%) | 4.79 (-0%) | 4.84 (+1%) | 4.90 (+2%) | 5.04 (+5%) | stable |
| knit_05 | course | 6.31 | confident | 6.15 (-3%) | 6.41 (+2%) | 6.38 (+1%) | 6.39 (+1%) | 6.46 (+2%) | 6.53 (+3%) | stable |
| knit_06 | wale | 3.64 | confident | 3.66 (+1%) | 3.69 (+2%) | 3.62 (-0%) | 3.69 (+1%) | 3.76 (+3%) | 3.80 (+4%) | stable |
| knit_06 | course | 5.73 | confident | 5.60 (-2%) | 5.54 (-3%) | 5.54 (-3%) | 5.52 (-4%) | 5.77 (+1%) | 5.73 (+0%) | stable |
| knit_08 | wale | 4.70 | confident | 4.59 (-2%) | 4.69 (-0%) | 4.69 (-0%) | 4.72 (+1%) | 4.75 (+1%) | 5.02 (+7%) | stable |
| knit_08 | course | 6.74 | confident | 6.56 (-3%) | 6.67 (-1%) | 6.71 (-0%) | 6.77 (+1%) | 6.92 (+3%) | 7.61 (+13%) | stable |
| knit_09 | wale | 4.97 | confident | 4.95 (-0%) | 5.00 (+1%) | 5.03 (+1%) | 5.01 (+1%) | 5.11 (+3%) | 5.16 (+4%) | stable |
| knit_09 | course | 7.53 | confident | 7.43 (-1%) | 7.49 (-1%) | 7.53 (-0%) | 7.64 (+1%) | 7.57 (+1%) | 7.83 (+4%) | stable |
| synth_jersey | wale | 5.01 | confident | 4.90 (-2%) | 4.95 (-1%) | 4.97 (-1%) | 5.03 (+0%) | 5.05 (+1%) | 5.10 (+2%) | stable |
| synth_jersey | course | 7.00 | confident | 6.85 (-2%) | 6.92 (-1%) | 6.97 (-0%) | 7.04 (+0%) | 7.07 (+1%) | 7.14 (+2%) | stable |
| synth_garter | wale | 5.00 | confident | 4.90 (-2%) | 4.95 (-1%) | 4.97 (-1%) | 5.03 (+1%) | 5.05 (+1%) | 5.10 (+2%) | stable |
| synth_garter | course | 7.00 | confident | 6.88 (-2%) | 6.95 (-1%) | 6.97 (-0%) | 7.04 (+0%) | 7.07 (+1%) | 7.17 (+2%) | stable |
| synth_rib | wale | 2.50 | confident | 2.45 (-2%) | 2.48 (-1%) | 2.49 (-1%) | 2.51 (+0%) | 2.52 (+1%) | 2.55 (+2%) | stable |
| synth_rib | course | 7.00 | confident | 6.85 (-2%) | 6.93 (-1%) | 6.97 (-0%) | 7.04 (+0%) | 7.07 (+1%) | 7.14 (+2%) | stable |

**Resolution invariance** (each photo resampled to 0.5×, 1× and 2× of its own resolution -- INTER_AREA down, INTER_CUBIC up -- and calibrated correctly for that resolution; each cell is areas · per-inch · error · status; spread is the largest disagreement between two resolutions' readings, which must be within 10% or carry an `uncertain` status)

| fixture | axis | 0.5× | 1× | 2× | spread | verdict |
|---|---|---|---|---|---|---|
| jersey | wale | 4 · 4.71 -5.9% C | 2 · 4.72 -5.5% C | 2 · 4.72 -5.5% C | 0.4% | agree |
| jersey | course | 4 · 6.80 -5.5% C | 2 · 6.74 -6.4% C | 2 · 6.76 -6.2% C | 0.9% | agree |
| teal | wale | 2 · 3.50 **-12.6%** C | 4 · 3.48 **-13.0%** C | 4 · 3.43 **-14.2%** C | 1.9% | agree |
| teal | course | 2 · 5.18 +3.7% C | 4 · 4.97 -0.6% C | 4 · 5.27 +5.4% C | 6.0% | agree |
| knit_01 | wale | 4 · 3.96 +4.3% C | 3 · 3.73 -1.9% C | 4 · 3.92 +3.1% C | 6.3% | agree |
| knit_01 | course | 4 · 5.70 +0.0% C | 3 · 3.98 -30.2% u | 4 · 5.91 +3.7% C | 48.5% | flagged |
| knit_02 | wale | 4 · 3.80 -4.9% C | 4 · 3.90 -2.4% C | 4 areas, no measurement | — | MISSING |
| knit_02 | course | 4 areas, no truth | 4 areas, no truth | 4 areas, no truth | 4985.3% | **DISAGREE** |
| knit_05 | wale | 4 · 4.78 +1.6% C | 4 · 4.81 +2.4% C | 4 · 4.85 +3.3% C | 1.6% | agree |
| knit_05 | course | 4 · 6.43 -4.1% C | 4 · 6.31 -5.8% C | 4 · 6.36 -5.0% C | 1.9% | agree |
| knit_06 | wale | 4 · 3.66 -3.7% C | 4 · 3.64 -4.3% C | 4 · 3.64 -4.3% C | 0.6% | agree |
| knit_06 | course | 4 · 5.20 -0.1% C | 4 · 5.30 +2.0% C | 4 · 5.26 +1.2% C | 2.1% | agree |
| knit_08 | wale | 4 · 4.87 +8.3% C | 2 · 4.70 +4.5% C | 2 · 4.95 **+10.1%** C | 5.4% | agree |
| knit_08 | course | 4 · 7.33 +6.2% C | 2 · 6.74 -2.3% C | 2 · 6.56 -4.9% C | 11.8% | **DISAGREE** |
| knit_09 | wale | 3 · 4.92 -3.5% C | 3 · 4.97 -2.5% C | 3 · 5.01 -1.7% C | 1.9% | agree |
| knit_09 | course | 3 · 7.46 -1.8% C | 3 · 7.53 -0.9% C | 3 · 7.64 +0.6% C | 2.4% | agree |
| synth_jersey | wale | 3 · 5.00 +0.0% C | 3 · 5.01 +0.2% C | 3 · 5.05 +0.9% C | 0.9% | agree |
| synth_jersey | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |
| synth_garter | wale | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 0.0% | agree |
| synth_garter | course | 3 · 7.00 +0.1% C | 3 · 7.01 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |
| synth_rib | wale | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 0.0% | agree |
| synth_rib | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |
<!-- app-path-scorecard:end -->

**Metamorphic invariants, every real fixture** — the CLI's default ROI
(centred 70% box), orientation `vertical`, 10 outcomes per photo, with
`lost` as redefined above (ratio beyond 2.5× / below 0.4×). Before that
redefinition every `lost` cell here read `drift`.

```bash
for f in tests/fixtures/*.jpg; do python tests/metamorphic.py "$f"; done
```

| fixture | ROI (x,y,w,h) | ok | drift | harmonic_flip | lost | skipped |
|---|---|---|---|---|---|---|
| knit_sample_01 | (294, 259, 1373, 1207) | 7 | 1 | 1 (rotate90 wale) | 1 (half_roi course) | 0 |
| knit_sample_02 | (589, 393, 2747, 1831) | 8 | 0 | 0 | 2 (resize wale, half_roi course) | 0 |
| knit_sample_03 | (570, 462, 2660, 2158) | 4 | 1 | 1 (rotate90 wale) | 3 (resize wale, resize course, half_roi course) | 1 |
| knit_sample_04 | (287, 221, 1338, 1029) | 9 | 0 | 1 (rotate90 wale) | 0 | 0 |
| knit_sample_05 | (281, 292, 1312, 1362) | 8 | 0 | 1 (half_roi wale) | 0 | 1 |
| knit_sample_06 | (281, 197, 1312, 918) | 6 | 3 | 1 (rotate90 course) | 0 | 0 |
| knit_sample_07 | (278, 162, 1297, 755) | 6 | 1 | 0 | 3 (resize course, rotate90 wale, jpeg60 course) | 0 |
| knit_sample_08 | (226, 151, 1055, 705) | 5 | 1 | 2 (resize wale, rotate90 course) | 0 | 2 |
| knit_sample_09 | (193, 162, 901, 755) | 10 | 0 | 0 | 0 | 0 |
| real_jersey_sample | (109, 73, 506, 338) | 9 | 0 | 0 | 0 | 1 |
| sarahmaker-knitting-gauge | (180, 225, 840, 1050) | 9 | 0 | 1 (resize wale) | 0 | 0 |

The rotate90 flips (01/03/04 wale, 06/08 course, 05 fixed) are exactly
the five the mechanism write-up above records, so nothing moved between
that run and this one. The `lost` column is new information: nine
outcomes across 01/02/03/07 that previously hid inside `drift` are
readings of something else entirely — 03's resize pair (ratios 0.014 and
0.134) and 02's half_roi course (80×) among them. Note the jersey
fixture's pytest pin uses a different, ruler-free ROI
(`JERSEY_ROI` in `test_metamorphic_fixtures.py`) and reads 9/10 there
with resize/course as its strict xfail; the 9/10 here is a different
skip (half_roi course, too few periods) with resize/course passing at
the 70% crop.

**Re-run after the sub-repeat test landed** (same command). Nine of the
eleven photos are cell-for-cell identical; two moved, and in both the
cell that turned red is the OTHER axis's known-wrong reading being
compared against a course reading that moved toward the truth — the
invariants measure co-variance, not correctness, and a pair of paths
that agreed on the wrong answer counted as `ok`:

| fixture | ROI (x,y,w,h) | ok | drift | harmonic_flip | lost | skipped |
|---|---|---|---|---|---|---|
| knit_sample_03 | (570, 462, 2660, 2158) | 3 | 1 | 2 (rotate90 wale, rotate90 course) | 3 (resize wale, resize course, half_roi course) | 1 |
| knit_sample_05 | (281, 292, 1312, 1362) | 7 | 0 | 2 (rotate90 wale, half_roi wale) | 1 (half_roi course) | 0 |

* **03, rotate90 course** (was `ok` at 287.3 vs 287.3; now 145.0 vs
  287.3, ratio 0.505): the rotated course path sees the wale structure,
  and the sub-repeat test descends its 2× seed (287px, peak 0.48) to
  the fundamental (145px, peak 0.40, ratio 0.83, walks at 0.69) — the
  ~142px the photo's own tape measure supports, per mechanism 3 above.
  The unrotated wale path still reads 287 (its own open item), so the
  two now disagree. This cell was green only because both were wrong
  together.
* **05, the 70% box** (not the pinned ROI): the course seed there sat at
  4× the true row pitch (193.2px vs ~47.8 true), agreeing with the
  rotated wale path's equally-wrong 193.2, which counted as `ok`. The
  single-step descent takes it to 2× (98.3px: peak ratio above the
  floor, walks) — closer, still doubled. rotate90/wale therefore reads
  1.966× the new baseline (the rotated wale path is unchanged at 4×),
  and half_roi/course is now evaluated (7 periods, no longer skipped
  at 3.5) and reads the 25.5px sub-feature it always did. Measured, not
  shipped: letting the descent CHAIN (re-test the half of the half)
  lands this box on 49.2px, the true pitch — and leaves the invariants
  at the same 7/10, because the comparators are still the rotated wale
  path at 4× and the half-box sub-feature. A correct course reading
  cannot turn those two cells green; only the wale path can.

Every other fixture — 01, 02, 04, 06, 07, 08, 09, jersey, teal — is
unchanged to the pixel, including 06/08's documented rotate90 course
flips and the jersey's pytest pins.

**Re-run after the wale leg-lattice climb landed** (2026-10-01, same ROIs,
same commands). One scorecard cell moved and it is the target; every
other row is unchanged to the digit:

| fixture | axis | ROI (x,y,w,h) | true /in | predicted /in | spacing px | signed error | baseline | status |
|---|---|---|---|---|---|---|---|---|
| knit_05 | wale | (469, 504, 937, 937) | 4.7 | 4.86 | 65.9 | +3.3% | +3.3% (was +103.4%) | ok |

The mechanism, in `_analyze_axis_v3` (wale axis only): the v0.3 evidence
winner on knit_05 was the stitch-leg sub-lattice (33px, evidence 0.49),
which autocorrelation (0.82) and patch consensus (0.96) both reward
because the leg spacing IS the strongest 1D period on a V-loop fabric.
What the composite cannot outvote is the 2D template walk's negative
evidence: adjacent leg patches are mirror images, so the walk at 33px
fails outright (0.00) while its double (66px) walks (0.70). The climb
fires only when both hold, reusing the two thresholds already calibrated
for exactly this on the course seed (`SEED_ASCEND_TEMPLATE_FAIL_MAX`
0.05 on the winner, `SEED_HALF_TEMPLATE_MIN` 0.55 on its double). Single
step, never chains; it overrides the winner, it does not re-weight the
scorer. **Why it cannot move teal, knit_06 or knit_08**, which are correct
at a "2x" candidate whose half was the leg lattice: there the scorer
already climbed, and the winner's OWN walk succeeds (0.69 / 0.69 / 0.73).
Every correct wale row on the scorecard has a winner that walks
(0.65-0.73); knit_05 was the only winner reading 0.0. That distinction is
pinned by `tests/test_wale_leg_lattice_climb.py`. The result is still
flagged uncertain (the climbed candidate scored lower on evidence), with
a reason that says so instead of the generic "scored nearly as well".

Metamorphic sweep, same command: nine photos cell-for-cell identical;
two moved, neither worse:

* **knit_sample_05**: half_roi/wale `harmonic_flip` (33.4 vs 67.1, 0.498)
  -> `ok` (65.6, 0.978). 7/10 -> 8/10. The half box's winner was the leg
  lattice too, and climbs the same way. rotate90/wale (1.966x) is
  unchanged: that is the rotated wale path reading the course structure
  at 4x, not a leg lattice.
* **knit_sample_03**: resize/wale stays `lost`, measured 6.1 -> 12.0
  against 430.9 expected (ratio 0.014 -> 0.028). Same status; the 1.5x
  upscale's wale reading is still a sub-feature, now its double.

Not resolved as a side effect: the rotate90 wale flips on 01/03/04
(0.501 / 0.494 / 0.514). In each the comparator is the baseline COURSE
reading, and the rotated wale winner walks (measured 0.79 / 0.78 / 0.91
at 4.5 / 15.5 / 8.0px -- fine sub-features that genuinely repeat, a
different failure from a leg lattice), so the climb has nothing to act on
there.

### Harness extension: two more invariants, three more degradations, climb coverage (2026-10-01)

Harness only — nothing under `analysis/` changed. The 15-row ground-truth
scorecard is identical to `f677bed` to the digit. pytest: 406 passed,
46 xfailed (7 before + 39 new, every new mark strict and carrying its
measured reading).

**Two new metamorphic invariants** in `tests/metamorphic.py`, appended
after the original five so their order is unchanged:

* `downsample2x` — 0.5x area-averaged downsample; spacing must halve.
  Tol 5%. Skipped per axis when the halved period would be under 8px
  (`MIN_PX_PER_PERIOD_FOR_DOWNSAMPLE`), the same kind of rule as
  half_roi's five-period floor: below it the leg half-harmonic is within
  ~1px of the detector's 3px plausibility floor.
* `crop_shift` — same window size, offset by 1/8 of the window in x and
  y (toward whichever side has room; a dimension with no room is not
  shifted). Density held, tol 5%.

On the pinned jersey ROI both pass on both axes and are pinned in
`test_metamorphic_fixtures.py`. The sweep over all 11 fixtures (same
command as above, the CLI's 70% box) is a **baseline, not a gate**. The
first five columns are cell-for-cell what the previous run recorded:

| fixture | downsample2x wale | downsample2x course | crop_shift wale | crop_shift course |
|---|---|---|---|---|
| knit_sample_01 | ok (0.997) | skipped (4.5px) | ok (1.000) | ok (1.012) |
| knit_sample_02 | harmonic_flip (2.159) | skipped (2.0px) | harmonic_flip (2.035) | ok (1.003) |
| knit_sample_03 | ok (1.000) | lost (6.796) | harmonic_flip (0.506) | lost (3.538) |
| knit_sample_04 | ok (1.001) | skipped (7.8px) | ok (1.020) | ok (1.008) |
| knit_sample_05 | ok (0.995) | ok (1.016) | ok (1.002) | ok (1.040) |
| knit_sample_06 | harmonic_flip (0.494) | drift (1.052) | harmonic_flip (0.499) | drift (1.066) |
| knit_sample_07 | harmonic_flip (1.992) | ok (1.000) | ok (0.995) | drift (1.359) |
| knit_sample_08 | harmonic_flip (0.494) | drift (0.947) | drift (1.092) | ok (0.953) |
| knit_sample_09 | ok (0.980) | ok (1.040) | ok (0.983) | lost (3.365) |
| real_jersey_sample | harmonic_flip (2.057) | ok (1.007) | ok (1.009) | ok (1.021) |
| sarahmaker-knitting-gauge | harmonic_flip (0.499) | ok (0.994) | ok (0.977) | ok (0.951) |

Totals: downsample2x 10 ok / 2 drift / 6 harmonic_flip / 1 lost / 3
skipped; crop_shift 14 ok / 3 drift / 3 harmonic_flip / 2 lost / 0
skipped. These invariants measure co-variance, not correctness, so the
flips mark readings that change family under a transform that should not
change the family. Two findings:

* **downsample2x flips wale on six photos**, three each way. 06, 08 and
  teal land on 0.5x the halved period. 02, 07 and the jersey land on 2x:
  they read the SAME pixel period as at native scale (the jersey's 70%
  box reads 36.0px downsampled against 35.0 native), as if the image had
  not shrunk.
* **crop_shift flips wale on 02, 03 and 06** — moving the window by 1/8
  is enough to change the wale reading's family on three real photos. 03
  and 06 land on the half; 02 on the double.

**Three new synthetic degradations** in `tests/synthetic_fabric.py`. All
default off, and none draws from the fabric's random stream, so every
existing spec renders byte-identical (verified by hashing all 16 specs the
suite renders, before and after):

* `rotation_deg` — in-plane rotation, rendered on an oversized canvas and
  centre-cropped (no padding ever enters the frame). Scored against the
  axis-PROJECTED pitch, pitch / cos(theta): +0.1 / +0.8 / +2.2% at
  3 / 7 / 12 deg.
* `fuzz` — a soft halo per stitch (the stitch layer blurred at 0.18
  pitch, taken as a max with the crisp yarn so only the gaps fill).
* Contamination overlays drawn into the scene, inside the scoring ROI: a
  ruler band with a known tick period (major every 5th), sewing pins,
  and the fabric's edge with tabletop beyond. They have their own random
  stream.

Grid summary (`test_synthetic_fabric_gauge.py`): rotation 44 rows (32
pass / 12 strict xfail), fuzz 20 (16 / 4), contamination 52 (35 / 17).
Of the 33 xfails, 15 inherit a GRID row's existing flip (the same spec
without the new degradation already fails) and say so; 18 are new:

* rotation: 3 and 7 deg flip clean fine-gauge jersey course to the leg
  half period; 12 deg pushes it to -11%; 3 deg plus mild degradation
  flips fine-gauge wale to 2x; 12 deg reads a sub-stitch 7.2px on garter
  course and 143.5px (4x) on rib wale at 7 deg.
* fuzz: full fuzz flips clean fine-gauge course to the half period while
  half-strength fuzz passes. It is not monotone either way: on the
  degraded 5x7 row, fuzz 1.0 *rescues* a course flip that fuzz 0.5 keeps.
* contamination: a fabric edge over 12.5% of the ROI flips both axes of
  clean fine-gauge jersey; edges and 8 pins push degraded fine-gauge wale
  to 2x; a centred mm ruler **captures the rib course axis outright**
  (reads 7.0, the ruler's own tick period).

**Ruler detection on the synthetic ruler** (`detect_ruler_calibration`,
5% of the tick period): on the CONTROL (the same ruler on flat ground, no
fabric) it recovers the tick period in 3 of 4 cases: clean mm 7.0 vs
7.09, clean 1/16-inch 11.0 vs 11.25, degraded 1/16-inch 11.0. Degraded mm
reads 35.0, which is the MAJOR-tick spacing. On fabric it recovers 3 of 7: the
mm ruler near the ROI's top on fine jersey, rib and garter. The other
four read the fabric's own wale lattice (36 / 45px), because the band
scan prefers the stitches. Major/minor classification is not
recovered (0 majors on every clean control). Recorded, not gated.

**Synthetic coverage of the #325 leg-lattice climb**
(`tests/test_synthetic_leg_climb.py`):

* Unrotated jersey, 15 pitches (true wale 72–15px) × 3 seeds × clean /
  degraded = 90 renders: the climb fires **0** times. The leg harmonic is
  present (a 0.5x candidate on 86/90, walk 0.00 on most) but the leg
  lattice never wins the evidence ranking (~0.05–0.48 against ~0.7–0.85),
  so the precondition never holds. The synthetic V does not reproduce
  knit_05's autocorrelation-dominant leg lattice.
* 11 degradation conditions × 10 pitches × 3 seeds = 330 renders: the
  leg lattice wins evidence 0 times; the climb fires 2 times, **both false**.
* In-plane rotation 0–15 deg × 5 pitches × 3 seeds × clean / blur+JPEG =
  300 renders: **6 fires, 0 land on the true pitch, 6 are FALSE CLIMBS**
  (8 wpi, 11–13 deg). In each, the evidence winner was already correct
  (23.0px) and was moved to ~41–46px. Mechanism: rotation of 9 deg or
  more zeroes the correct winner's own template walk (0.00 on 60 of these
  renders; the walk is axis-aligned), and where its double still walks
  (0.69–0.78) the climb takes it. Not fixed here; pinned as a strict
  xfail with its precondition asserted separately. `TGR_CLIMB_SWEEP=1`
  reprints the sweep.

### downsample2x wale flips: a pixel-anchored mechanism was looked for and not found (2026-10-01)

Diagnosis only, against `main` at `52e25c5`. **Nothing under `analysis/`
or `tests/` changed**, because the stop-and-report gate did not pass: no
single pixel-anchored mechanism explains 3 of the 6 fixture flips. This
section is the negative record so the next session does not re-run the
same search.

**The premise was "a real periodic structure cannot read the same pixel
period at half resolution, so something is anchored to pixels."** Measured,
the premise is false in its strong form. On all six flips (the 70% CLI box,
orientation vertical) the wale autocorrelation seed HALVES exactly, so the
0.5x/1x/2x candidate family halves with it and every candidate the native
run scored is present and scored at half scale:

| fixture | seed px N -> D | family N | family D | winner N -> D | ratio | class |
|---|---|---|---|---|---|---|
| real_jersey_sample | 35 -> 18 | 17.5 / **35** / 70 | 9 / 18 / **36** | 1x -> 2x | 2.057 | same-pixel-period |
| knit_sample_02 | 133 -> 66 | 66.5 / **133** / 266 | 33 / 66 / **132** | 1x -> 2x | 2.159 | same-pixel-period |
| knit_sample_07 | 61 -> 30 | 30.5 / **61** / 122 | 15 / 30 / **60** | 1x -> 2x | 1.992 | same-pixel-period |
| sarahmaker (teal) | 38 -> 19 | 19 / 38 / **76** | 9.5 / **19** / 38 | 2x -> 1x | 0.499 | 0.5x flip |
| knit_sample_06 | 62 -> 31 | 31 / 62 / **124** | 15.5 / **31** / 62 | 2x -> 1x | 0.494 | 0.5x flip |
| knit_sample_08 | 73 -> 36 | 37 / 74 / **148** | 18 / **36** / 72 | 2x -> 1x | 0.494 | 0.5x flip |

So the "same pixel period" readings are the winner moving ONE STEP UP a
correctly-halved family (1x -> 2x), and the 0.5x flips are the same step
taken the other way (2x -> 1x). **All six are one decision — seed vs its
double — swapping sides**, three each way. The numerical coincidence with
the native period is what a 1x -> 2x move inside a halved family looks
like; nothing reads the native number back.

**What decides that pair, term by term** (evidence margin 1x minus 2x,
each term already multiplied by its `WEIGHTS_UNKNOWN` weight):

| fixture | margin N | margin D | phase_consistency term N | D | largest other term (either run) |
|---|---|---|---|---|---|
| jersey | +0.139 | −0.011 | +0.091 | −0.090 | autocorr +0.021 |
| 02 | +0.259 | −0.071 | +0.161 | −0.127 | alternating_phase +0.046 |
| 07 | +0.197 | −0.096 | +0.134 | −0.152 | autocorr +0.016 |
| teal | −0.171 | +0.020 | −0.129 | +0.016 | template_match −0.069 (N only) |
| 06 | −0.135 | +0.056 | −0.146 | +0.084 | alternating_phase −0.031 |
| 08 | −0.114 | +0.084 | −0.122 | +0.021 | alternating_phase −0.039 |

`phase_consistency` (weight 0.378) is the only term whose sign reverses on
all six, and it is the largest single term in 11 of the 12 runs (the
exception is teal downsampled, where the whole margin is only +0.020). The raw scores are bimodal — the
same candidate reads ~0.27–0.39 or ~0.60–0.78 depending on where its
markers land (jersey 1x: 0.630 native, 0.368 downsampled; jersey 2x: 0.389
-> 0.606).

**Every pixel-expressed constant in the wale path, and whether it binds on
the deciding pair** (checked on all six, native and downsampled):

| constant | where | binds? |
|---|---|---|
| `MIN_PLAUSIBLE_SPACING_PX` 3 | autocorr lag floor, candidate filter, regularity | no — smallest deciding candidate is 18px |
| `MIN_PHASE_PATCH_PX` 3 | phase patch half-width floor | no — 0.25×c is 4.5–33px on the 1x/2x pair (binds only on some 0.5x candidates, which never win) |
| `TEMPLATE_MATCH_MIN_PERIOD_PX` 4 | template walk floor | no |
| `MIN_PATCH_DIM_PX` 24 | consensus patch floor | no — patches are 67px+ and their periods halve (jersey 18/36/35/35 -> 9/18/18/18) |
| loop-centre `min_separation` floor 3.0, DoG `sigma1` floor 0.8, band floor 3.0 | structural evidence | only on knit_02 native, where the COURSE seed is a 4px sub-feature; the structural term moves the margin by 0.004 there |
| `MIN_ROI_DIM_FOR_ROTATION_PX` 80, rotation grid ±6° / 1.5° | seed only | ROIs are ≥169px; the chosen angle differs N vs D on 02 and 08, but the seed still halves exactly on both |
| `GaussianBlur` 3×3, `Sobel` ksize 3, `SMOOTHING_WINDOW_PX` 3 | the 1D signal every term reads, including phase's marker positions | the only candidates left — tested below |

The three filter widths are pixel-sized and DO change relative bandwidth
under a 2x downsample, so they were tested by counterfactual: give the
downsampled run the halved filters (no blur, no smoothing — the nearest
integer kernels to half), or give the native run the doubled ones (blur
5×5, Sobel 5, smoothing 6). A pixel-anchored filter explains a flip if
scale-matching it restores ratio 1.0.

| fixture | D with halved filters | N with doubled filters |
|---|---|---|
| jersey | **17.3 (ratio 0.99, fixed)** | 35.2 — still flips |
| 02 | 142.2 — still flips | 129.1 — still flips |
| 07 | 60.0 — still flips | 60.4 — still flips |
| teal | 19.4 — still flips | 77.6 — still flips |
| 06 | 31.1 — still flips | 125.9 — still flips |
| 08 | 35.5 — still flips | **73.4 (ratio 0.99, fixed)** |

One per direction, and not the same one. **And the same knobs flip the
decision with no scale change at all**: with every run at smoothing 4
instead of 3, knit_08's NATIVE reading moves 147.5 -> 73.4; at blur 5×5
knit_06's downsampled reading moves 31.1 -> 62.7 and the jersey's 36.0 ->
17.7; at smoothing 2 or 1, knit_02's native wale collapses to 7.9 / 3.9px.
A one-step change to any of them moves some fixture's seed-vs-double
decision, so making them scale-relative would reshuffle which fixtures
flip rather than remove the flips.

**Control: crop_shift flips through the same term with no rescaling at
all.** On knit_02 the window moved by 1/8 takes the 2x candidate's phase
consistency 0.27 -> 0.78 (and the 1x's 0.70 -> 0.28); on knit_06 the 1x
goes 0.26 -> 0.66. That is the same bimodal term deciding the same pair,
under a transform that changes no scale.

**What the evidence points at instead — scale-relative, recorded, not
built.** Phase consistency compares patches at the candidate's OWN marker
positions, and those come from `_detect_peaks(signal, c)` with
`min_distance = 0.6c`. For the 2x candidate that is 1.2× the seed, so
`find_peaks` keeps whichever peaks survive a greedy 1.2-seed exclusion —
measured, the 2x markers' gaps on all six run from **0.6× to 1.6× of the 2x
candidate** (median 0.8× on the jersey native), i.e. some "adjacent
repeats" are 1.2 seeds apart, not 2. Whether adjacent 2x markers
are genuinely one 2x period apart is therefore decided by the boundary
phase of the peak set, which any transform that moves peaks by a pixel or
two — a downsample, a 1/8 crop shift, a smoothing width — can change. That is
consistent with all six downsample flips and the two crop_shift controls
checked (a hypothesis, not yet tested by changing it), and it is expressed
entirely in candidate-relative units: it is not a
pixel anchor, so it was out of this session's remit. The obvious next
experiment is to place a candidate's phase markers by walking its own
period from one detected peak (or to phase-average over marker offsets)
and re-run both invariants plus the scorecard.

**#325 climb sweeps were not re-run** — with no detector change they
cannot have moved.

Reproduce (scripts kept out of the tree; the essentials): build the 70%
box, run `analyze_gauge` on the image and on
`cv2.resize(img, (w//2, h//2), interpolation=cv2.INTER_AREA)` with the box
halved, and read `result.wale.candidate_details` (`harmonic`,
`phase_consistency`, `evidence_score`, `selected`). The filter
counterfactuals monkeypatch `SMOOTHING_WINDOW_PX` and `_enhance_texture`'s
`GaussianBlur` / `Sobel` sizes.

### phase_consistency marker fragility: diagnosis confirmed, period-locked markers tried and NOT shipped (2026-10-01)

Follows the record above. Baseline `main` at `79567fa`. **Nothing under
`analysis/` changed**: the Phase 1 gate passed, but the Phase 2 change failed
acceptance with new synthetic failures, which are blockers. The 0.378
`phase_consistency` weight was not touched.

**Phase 1: the hypothesis holds.** Each of the 1x/2x candidates on the eight
flips (six downsample2x, plus crop_shift on knit_02 and knit_06) was
re-scored with its phase markers forced onto an exact lattice at the
candidate's own spacing. The lattice phase is the circular mean of the
detected peaks modulo the period, so peak detection supplies a phase and
never a spacing. The 0.3/0.7 bimodality disappears: every candidate reads
0.60–0.84 and moves at most 0.04 across the transform. The flips:

| flip | detected-peak markers: winner, ratio | lattice markers: winner, ratio |
|---|---|---|
| jersey downsample2x | 1x -> 2x, 2.057 | 1x -> 1x, 1.011 |
| teal downsample2x | 2x -> 1x, 0.499 | 2x -> 2x, 1.000 |
| knit_02 downsample2x | 1x -> 2x, 2.159 | 1x -> 1x, 0.960 |
| knit_06 downsample2x | 2x -> 1x, 0.494 | 2x -> 2x, 0.998 |
| knit_07 downsample2x | 1x -> 2x, 1.992 | 1x -> 1x, 1.001 |
| knit_08 downsample2x | 2x -> 1x, 0.494 | 1x -> 1x, 0.993 |
| knit_02 crop_shift | 1x -> 2x, 2.035 | 1x -> 2x, 2.035 (phase now stable, 0.77/0.81 -> 0.74/0.78; another term decides) |
| knit_06 crop_shift | 2x -> 1x, 0.499 | 2x -> 2x, 0.996 |

That is 7 of 8 explained, against a gate of 4. The marker placement itself
is in the record above: the 2x candidate's detected markers sit 0.6×–1.6×
of the candidate apart, so some "adjacent repeats" are one seed apart.

**Phase 2, as tried.** In `_score_candidates`, phase markers were an exact
lattice at the candidate spacing with that fitted phase (no constants: the
spacing is the candidate, the extent is the ROI). A second, constant-free
change confined the density cross-check override to candidates inside its
own near-tie (`DENSITY_OVERRIDE_MAX_EVIDENCE_MARGIN` of the top). The reason
it was needed: once a 2T lattice is scored as the genuine repeat it is, the
1x-vs-2x margin on knit_07 jpeg60 and knit_01 downsample2x fell to 0.065.
That opened the override, which then picked the 0.5x leg lattice (evidence
0.07, phase 0.00, alternation 0.72–0.84). Measured, both changes together:

* **Scorecard: all 15 rows identical to the digit**, knit_05 included.
* **Metamorphic sweep** (11 fixtures, 70% box): downsample2x 6 harmonic flips
  -> **0** (10 -> 16 ok); crop_shift 3 flips -> **1** (02 remains; 14 -> 17
  ok). 14 cells improve, including knit_05 rotate90/wale, knit_08
  rotate90/course and resize/wale, and teal resize/wale. **3 cells get
  worse, all knit_04 wale** (resize 1.025 -> 1.999, mirror 1.000 -> 2.008,
  half_roi 0.976 -> 2.048), which breaks "original five no worse on any
  fixture". knit_04's 32-vs-64 is a genuine near-tie on `main` too (1x
  minus 2x evidence +0.014 base, +0.002 mirror). On `main`, resize and
  half_roi read `ok` only because the old landing sank the 2x candidate's
  phase (+0.096 / +0.129). With the lattice all four knit_04 runs sit
  within ±0.023, and three fall to 2x.
* **pytest: 11 genuine new failures and 9 strict xfails passing.**
  Attribution: lattice markers alone give 23 failures, and the density
  confinement alone gives 1 (`test_still_overrides_a_genuinely_ambiguous_
  evidence_scorer_pick`, a hand-built case asserting the override may pick
  past the runner-up). The 10 lattice blockers: clean jersey 8x10 wale reads
  its 2x; the ply-twist trap on clean jersey; rotation rot0 (clean) wale;
  fuzz 0.5 clean wale; contamination pins3 / pins8 on clean jersey wale; the
  #325 climb precondition (the rotated evidence winner is now 46.0 vs 23.0
  true, outright rather than via the climb); knit_05's climb-mechanism pin
  (66px is now selected directly, so its "climbed from" reason is absent);
  and teal `small_window_b` / `_c` (7.18 / 7.11 WPI vs 4.0). The 9 XPASSes:
  garter 8x10 wale clean and degraded (the 2x double), degraded jersey rot3,
  degraded pins8, contamination edge 0.2 / 0.3 (clean and degraded), and the
  12° false-climb row.
* **#325 climb sweep** (`TGR_CLIMB_SWEEP=1`): 300 renders, fired 6 / 0 true
  / **6 false** on `main` -> fired 4 / 0 true / **4 false**.

**What this says.** The old marker landing was a lottery, but it was
loaded: on fine-gauge synthetics the detected 2x markers land irregularly
almost every time, so the old phase term reliably penalised T's double, and
that bias was protecting the fundamental. Period-locked markers make phase
consistency honest. It then separates T from T/2 (the leg lattice reads 0.00
with alternation 0.72–0.84, cleaner than before) and, correctly, cannot
separate T from 2T, because both are genuine repeats. That exposes a T-vs-2T
decision the wale scorer has no term for: the remaining terms (patch
consensus, repeat count, autocorrelation) are too close to decide it on
fine-gauge synthetics and on knit_04. The course seed already has such a
test (`_subrepeat_walk_score`: a candidate whose half walks is doubled), and
the wale side does not. Period-locked markers are worth shipping only
together with a wale-side T-vs-2T discriminator, which is a new mechanism
and was out of this session's scope.

### A wale T-vs-2T discriminator from the course sub-repeat test: measured, gate failed (2026-10-01)

Follows the two records above. Baseline `main` at `008716e`. **Nothing under
`analysis/` changed.** This was diagnosis only, and the gate did not pass.

**The candidate** is the wale counterpart of the course seed's descent, built
entirely from existing parts with no new constants. Between a wale
candidate S and its double 2S, the double is "doubled" (S wins) iff S passes
`_subrepeat_walk_score` (the 4-pitch-wide band) at `>= SEED_HALF_TEMPLATE_MIN`.
Two variants were measured: **W** (the walk alone), and **A** (the walk plus
the course descent's own autocorrelation gate: S must also be a peak at
`>= SEED_HALF_MIN_STRENGTH_RATIO` of 2S's strength). A case passes if the
discriminator keeps the family member nearest the truth both against its
double (when present) and against its half (when present).

| set | W | A |
|---|---|---|
| synthetic wale specs (every GRID / rotation / fuzz / overlay test spec with a single primary truth, rib excluded, plus ply-twist and the climb precondition) | 45 / 63 | **56 / 63 (89%)** |
| the #329 lattice-failure synthetics (jersey 8x10, ply-twist, rot0, fuzz 0.5, pins 3/8, climb 12°) | 6 / 7 | 6 / 7 |
| scorecard wale rows (9) | 7 / 9 | **7 / 9** |

* **A's 7 synthetic misses are all rotation**: every 12° row (jersey 5x7 / 8x10,
  clean and degraded, garter 5x7, the climb precondition) and clean jersey
  8x10 at 7°. The template walk is axis-aligned, so on a tilted lattice the
  TRUE period's walk reads 0.00. This is #325's own false-climb mechanism.
* **W fails every garter row and every centred-ruler row**: there the
  half-period genuinely walks (0.70–0.83). The autocorrelation gate is what
  rescues them in A.
* **The gate's hard half fails.** The scorecard truth rows A gets wrong:
  * **knit_06** (a currently passing row, truth ~123px): the 64px half walks
    at **0.68** against the true 128's 0.69, so the discriminator calls 128
    doubled. These are the chunky plied legs whose mirror twins correlate,
    the limitation `_prefer_fundamental_seed`'s docstring already records,
    and the 4-pitch band does not break it. The same thing happens at the
    70% box (124 vs 62).
  * **knit_02** (already beyond the bar): truth ~297px is not in the family
    at all (nearest 264, 11% off), and the 132px half walks at 0.68.
  * Outside the scorecard: teal `small_window_b` (the true ~76px candidate's
    walk is 0.00 on that 341px window), and knit_04 if its truth were 64
    (the 32 walks at 0.73). knit_04 has no recorded truth, so this is
    reported only. **The discriminator says 32.**
* **What it gets right** that the current scorer does not: knit_03's wale
  (family 142 / 284 / 568, read 287 today) keeps the tape-measure **142**
  (walk 0.77), and knit_08 at the 70% box keeps **74** over its doubled 148.
  jersey, teal (pinned ROI, `small_window_c`, 70% box), knit_01, 05,
  08 and 09 all pass.

**Why it fails, in one line:** "the smaller candidate genuinely walks" is
true of a real fundamental AND of a chunky leg lattice whose mirror-image
legs correlate. On knit_06 the two read 0.68 and 0.69, so no threshold, and
certainly no fixture-specific one, separates them. The same test that
fixes 03 and 08 would break 06. A T-vs-2T term for the wale scorer needs
evidence the template walk does not carry (the walk is also blind under
rotation), so the period-locked markers of #329 still cannot ship.

### A wale T-vs-2T discriminator from leg-slant alternation: gate passed, shipped as configuration A (2026-10-01)

Follows the three records above. Baseline `main` at `2f862fe`. **This is the
first change under `analysis/` in this series**: the leg-slant orientation
discriminator ships in `_analyze_axis_v3` (configuration A of the brief), the
0.378 `phase_consistency` weight is untouched, and #329's period-locked
markers were tried again on top of it (configuration B) and failed acceptance
for the same three reasons #329 recorded.

**The idea, in one textile sentence.** In plain jersey the two legs of every
stitch lean in opposite directions, and every wale column is mirror-symmetric
about its own axis. Intensity is EVEN under that mirror, so an edge signal
repeats at the leg spacing T/2 whenever the two legs look alike -- the
harmonic trap every record above fought with even (intensity-derived)
evidence. Signed orientation is ODD under the mirror: it changes sign across
each wale axis and across each midline between wales, so it repeats only at
the full stitch pitch T and ALTERNATES sign at T/2. Its autocorrelation reads
positive at T, negative at T/2 and positive again at 2T, which separates T
from its half AND from its double -- the decision #331 showed the template
walk cannot make (knit_06's 64 and 128 both walk at 0.68 / 0.69).

**Phase 1 -- the measurement, and what the construction is.** Built from
existing parts: `_enhance_texture`'s signed Sobel pair on the de-tilted crop
`_normalize_rotation` already produces for the period seed; the
structure-tensor products J11 = gx^2, J22 = gy^2, J12 = gx*gy (J12's sign is
the lean and is invariant to the gradient's polarity, so both edges of a leg
agree); the ROI's mean orientation as the direction of the summed
doubled-angle vector; the per-pixel field E sin(2(theta - theta_bar)), which
sums to exactly zero over the ROI by construction and to which anything
aligned with the wale axis -- the columns themselves, ruler ticks -- contributes
nothing; collapsed to 1D exactly as `_project` collapses an edge image, and
read with the signed autocorrelation at a lag (the shipped
`_autocorr_strength_at_lag` clips to [0, 1], which would erase the evidence).
No threshold: every decision is a sign or a comparison.

Five variants were measured over the #331 case set (63 synthetic wale specs =
every GRID / rotation / fuzz / overlay wale row with a single primary truth,
rib excluded, plus ply-twist and the #325 climb precondition; the 7 #329
lattice-failure synthetics; the 8 scorecard wale rows at the pinned ROI and at
the 70% box). "Truth's member" is the family member nearest the truth within
the scorer's own `HARMONIC_MATCH_LOG_TOLERANCE` (#331's 5% tolerance would
have dropped the jersey and teal, whose accepted readings are 8% and 12% off
truth). A case passes when the member named is the truth's; the contrast
S(c) = r(c) - r(c/2) is the statistic (about +2 at T, ~0 at 2T, ~-1 at T/2):

| variant | synthetic | #329 lattice | scorecard pinned (excl. knit_02) |
|---|---|---|---|
| 1D on the de-tilted crop (what ships) | **63 / 63** | 7 / 7 | **7 / 7** (and knit_02's nearest member, 264) |
| 1D on the raw crop (no de-tilt) | 60 / 63 | 7 / 7 | 7 / 7 |
| 1D, coherence-normalised instead of energy-weighted | 60 / 63 | 7 / 7 | 7 / 7 |
| 2D autocorrelation of the field, sampled on the axis | 63 / 63 | 7 / 7 | 7 / 8 |
| 2D with a +/-12 deg orthogonal search | 63 / 63 | 7 / 7 | 7 / 8 |

The 1D de-tilted signal is a clean sinusoid at T on every real wale axis.
At the four stations T/2, T, 3T/2, 2T (70% box): jersey -0.84 / +0.86 / -0.77
/ +0.79; teal -0.91 / +0.87 / -0.78 / +0.73; knit_01 -0.87 / +0.91 / -0.82 /
+0.85; knit_05 -0.69 / +0.83 / -0.64 / +0.74; **knit_06 -0.88 / +0.83 / -0.74
/ +0.70 at T = 124 -- i.e. r(62) = -0.88 against r(124) = +0.83, where #331's
walk read 0.68 against 0.69**; knit_07 -0.82 / +0.85 / -0.78 / +0.80; knit_08
-0.78 / +0.84 / -0.71 / +0.76; knit_09 -0.66 / +0.79 / -0.70 / +0.64; the
weak ones are knit_04 -0.45 / +0.53 / -0.32 / +0.27, knit_02 -0.40 / +0.40 /
-0.22 / +0.11 and knit_03 -0.24 / +0.17 / -0.19 / +0.23. The signal's own
`_autocorrelation_spacing` seed lands on T on 9 of 11 fixtures (knit_02's is
the 4px soft-focus sub-feature, knit_03's is 2T).

**The gate passed** on that measurement (every scorecard row with truth in the
family, 100% of the synthetic specs), so Phase 2 ran. **knit_02 is excluded as
the brief allows**: its truth (~297px) is 11% outside its family (264 nearest),
so no member IS the truth; the discriminator names the nearest member at the
70% box and abstains on the pinned ROI (see below).

**Phase 2 -- what shipped (configuration A), and the measurement that forced
each clause.** `_orientation_field` / `_orientation_signal` /
`_signed_autocorr_at_lag` / `_orientation_evidence` /
`_orientation_fundamental` in `analysis/gauge_analysis.py`; the per-candidate
record carries `orientation_repeat`, `orientation_contrast`,
`orientation_dipole` and `orientation_fundamental` (also on the API's
`CandidateOut`). The decision runs in `_analyze_axis_v3` AFTER the leg-lattice
climb and has the last word; the member named is reselected, the result is
flagged uncertain with a reason naming both candidates' readings, and a climb
the orientation contradicts is undone rather than stacked. The first cut was
the two-sign rule (r(c) > 0, largest contrast). It passed the scorecard and
took the metamorphic flips 18 -> 9, and failed acceptance five ways; each
clause below is what one of those failures cost, measured rather than
designed:

* **The signature is the four stations of the first two periods** -- r(c/2) <
  0 < r(c), r(3c/2) < 0 < r(2c), every one measurable. The wale detector
  pointed at a PHYSICAL COURSE AXIS (the rotate90 invariant) reads noise of
  either sign there and named 148 on the jersey (+0.17) and 304 on knit_08
  (+0.05); both fail at least one station (jersey's 3T/2 reads +0.07, knit_08's
  2T -0.01).
* **The density cross-check defers to a named fundamental.** On knit_04's
  crop-shifted window the orientation named 64 with contrast +0.73 on both
  windows and the density override put the shifted one back to 32; the
  loop-center count inherits the leg-scale bias that docstring already
  describes, so once the harmonic question is answered by evidence that does
  not, density gets no vote.
* **The course path is offered the signal ONLY when the wale axis carries no
  leg signature.** Two rotate90/course cells (knit_02, knit_04) went ok ->
  flip because the wale baseline moved toward truth while the seed-as-is
  course path, looking at the physical wales, stayed on the sub-feature.
  Offering the course axis the signal UNCONDITIONALLY was measured and
  refuted: four scorecard course rows moved by -49.8%, -75.5%, +94.8% and
  -47.8% (jersey, knit_01, knit_06, knit_08), because a genuine course axis
  can carry a sinusoidal orientation signal at some period that is not a leg
  lattice. Under exclusivity the course path is untouched on every unrotated
  real fixture (all eleven wale axes carry the signature) and gets the
  decision exactly where the physical wales are under it.
* **The dipole term.** The 1D projection sums the field across the other axis
  BEFORE correlating, so on a course axis each row's leg dipoles cancel and
  what survives is a per-row bias, which flat-knit fabric alternates row to
  row: the jersey's physical course axis reads a clean sinusoid at 2 rows
  (-0.22 / +0.53 / -0.18 / +0.50 at 49px), passing all four stations, and
  the pinned `test_jersey_invariant[rotate90-wale]` went red. The field's own
  2D autocorrelation multiplies BEFORE summing: at half a stitch along a wale
  axis the dipole itself flips (negative), at one row along a course axis the
  dipoles repeat and only the bias flips (positive). Read at a point it was
  noise-limited (knit_02 +0.065, knit_03 +0.007 on real wale axes; knit_09's
  rotated course axis -0.018), so it is the MEAN over a window of +/-1/8 of
  the period along the axis and +/-1/4 across (`ORIENTATION_DIPOLE_WINDOW_*`,
  the one new constant pair, candidate-relative): -0.006 to -0.121 on all
  eleven real wale axes at native scale AND downsampled 2x, +0.031 to +0.042
  on every rotated course axis whose 1D stations passed. Widening the across
  half-width to 1/2 of a period turns a synthetic garter wale axis positive
  (+0.023 against -0.117), which is the next row's legs -- which repeat --
  diluting the flip.
* **The member named is the LARGEST-CONTRAST member or nobody.** The first
  rule named the best QUALIFYING member, and that let a sub-harmonic in by
  elimination wherever the true period's half-station read a hair positive:
  +0.006 on `test_loop_center_detection`'s blob grid (a round blob's signed
  orientation is a quadrupole, which the 1D projection cancels) and +0.07 on
  knit_09's rotated course axis (one row against +0.54 at two). A repeat-vs-
  double comparison fixed those two and blocked knit_03 at native scale
  (r(142) 0.17 against r(284) 0.23) while passing it downsampled, which turned
  knit_03's downsample2x/wale cell ok -> flip; abstaining when the best member
  fails the signature fixes all three with no comparison at all.

**Configuration B** (A plus `_lattice_markers` -- an exact lattice at the
candidate spacing phased by the circular mean of the detected peaks, fed to
`_phase_consistency_evidence` -- plus the density override confined to
candidates within `DENSITY_OVERRIDE_MAX_EVIDENCE_MARGIN` of the top): scorecard
identical, metamorphic totals identical to A (it fixes knit_05 rotate90/wale
where A fixes knit_02 downsample2x/wale), climb sweep identical, and **three
genuinely new test failures**, the same three #329 named: `test_still_
overrides_a_genuinely_ambiguous_evidence_scorer_pick` (the density
confinement), `test_false_climb_precondition_correct_winner_fails_its_walk_
under_rotation` and `test_knit_05_climbs_off_the_leg_lattice` (66px is selected
directly, so the "climbed from" pin has nothing to read). A newly failing test
is a blocker, so A ships and B is restored from its snapshot byte for byte.

**Phase 1 as the SHIPPED rule reads it** (the record above was the discovery
harness; this is `orientation_fundamental` off the shipped candidate record,
so the abstentions are the real ones):

| set | PASS | ABSTAIN | FAIL |
|---|---|---|---|
| synthetic wale specs (63, every one with truth in family) | **60** | 3 | 0 |
| #329 lattice-failure synthetics (7) | **7** | 0 | 0 |
| scorecard wale rows, pinned ROI, knit_02 excluded (7) | **7** | 0 | 0 |
| scorecard wale rows, pinned ROI, all (8) | 7 | 1 (knit_02) | 0 |
| scorecard wale rows, 70% box, all (8) | **8** | 0 | 0 |

The three synthetic abstentions are `mildly_degraded-jersey-8x10-rot12`
(r(23) = +0.23 but its half +0.15: 7.5 deg of residual tilt past the +/-6 deg
de-tilt search smears the projection), `clean-garter-5x7-rot12` (r(35) =
-0.00) and `clean-garter-5x7-fuzz1` (its 3T/2 station); all three read
correctly on the shipped tree regardless. Every rotation row at 0 / 3 / 7 deg
passes, 12 deg passes on jersey 5x7 clean and degraded, jersey 8x10 clean and
the climb precondition (23.0 named with r +0.41, contrast +0.60, dipole
-0.090). knit_02's pinned ROI abstains at 264 (dipole -0.005 but a station
fails) and its 70% box names 266 (r +0.40, contrast +0.80, dipole -0.008).

**Acceptance, configuration A, all measured on the shipped tree:**

* **Scorecard: all 15 rows identical to `main` to the digit**, knit_05
  included. knit_02 wale stays at +120.4% on its pinned ROI (the strict xfail
  stands; the 70% box reads 284.2px, -4.2%).
* **Metamorphic sweep** (11 fixtures, the CLI's 70% box, bold = changed from
  `main`): harmonic flips **18 -> 4**, lost 13 -> 13, **0 cells ok -> flip /
  lost, 14 cells flip / drift -> ok**. Two further changes are neither: knit_02
  half_roi/wale ok -> skipped (the baseline now reads 284px, under the
  five-period floor) and knit_03 half_roi/wale skipped -> drift (1.407; the
  baseline now reads 142, the tape-measure pitch, so the half window spans
  enough periods to run).

| fixture | resize/wale | resize/course | rotate90/wale | rotate90/course | mirror/wale | mirror/course | half_roi/wale | half_roi/course | jpeg60/wale | jpeg60/course | downsample2x/wale | downsample2x/course | crop_shift/wale | crop_shift/course |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| knit_sample_01 | ok (1.000) | drift (1.040) | harmonic_flip (0.501) | ok (1.000) | ok (1.000) | ok (0.998) | ok (0.982) | lost (6.547) | ok (1.000) | ok (0.994) | ok (0.997) | skipped | ok (1.000) | ok (1.012) |
| knit_sample_02 | lost (0.014) | ok (1.008) | ok (0.998) | ok (1.001) | ok (1.001) | ok (1.000) | **skipped** | lost (80.806) | ok (1.001) | ok (1.002) | **ok (1.018)** | skipped | **ok (0.960)** | ok (1.003) |
| knit_sample_03 | lost (0.055) | lost (0.134) | harmonic_flip (0.494) | **ok (1.000)** | ok (1.001) | drift (1.018) | **drift (1.407)** | lost (15.679) | ok (0.998) | ok (1.000) | ok (0.978) | lost (6.796) | **ok (1.003)** | lost (3.538) |
| knit_sample_04 | ok (0.995) | ok (0.993) | harmonic_flip (0.514) | ok (1.000) | ok (1.000) | ok (1.002) | ok (1.020) | ok (1.036) | ok (0.988) | ok (1.010) | ok (0.990) | skipped | ok (0.995) | ok (1.008) |
| knit_sample_05 | ok (1.000) | ok (0.984) | harmonic_flip (1.966) | ok (1.000) | ok (1.000) | ok (1.000) | ok (0.978) | lost (0.259) | ok (1.001) | ok (0.999) | ok (0.995) | ok (1.016) | ok (1.002) | ok (1.040) |
| knit_sample_06 | ok (0.994) | drift (1.125) | ok (1.000) | **ok (1.000)** | ok (1.000) | ok (1.000) | ok (1.015) | drift (1.148) | ok (1.001) | drift (1.081) | **ok (0.998)** | drift (1.052) | **ok (0.996)** | drift (1.066) |
| knit_sample_07 | ok (0.989) | lost (0.216) | lost (0.108) | ok (1.000) | ok (1.000) | ok (1.008) | ok (1.009) | drift (0.664) | ok (0.999) | lost (0.222) | **ok (1.001)** | ok (1.000) | ok (0.995) | drift (1.359) |
| knit_sample_08 | **ok (0.989)** | drift (0.928) | ok (1.000) | **ok (1.000)** | ok (1.000) | ok (1.000) | **ok (0.966)** | skipped | ok (1.000) | ok (1.000) | **ok (0.993)** | drift (0.947) | **ok (1.003)** | ok (0.953) |
| knit_sample_09 | ok (1.003) | ok (0.998) | ok (1.000) | ok (1.000) | ok (1.000) | ok (0.990) | ok (1.012) | ok (1.019) | ok (1.000) | ok (0.985) | ok (0.980) | ok (1.040) | ok (0.983) | lost (3.365) |
| real_jersey_sample | ok (0.998) | ok (1.021) | ok (1.000) | ok (1.000) | ok (1.000) | ok (1.000) | ok (1.019) | skipped | ok (0.994) | ok (1.000) | **ok (1.011)** | ok (1.007) | ok (1.009) | ok (1.021) |
| sarahmaker-knitting-gauge | **ok (0.997)** | ok (1.020) | ok (1.000) | ok (1.000) | ok (1.000) | ok (1.000) | ok (1.019) | ok (0.936) | ok (1.000) | ok (0.986) | **ok (1.000)** | ok (0.994) | ok (0.977) | ok (0.951) |

  Totals: ok 104 -> 119, drift 12 -> 12, harmonic_flip 18 -> 4, lost 13 ->
  13, skipped 7 -> 6. All six downsample2x wale flips of the harness record
  are gone, both crop_shift wale flips that remained after #329 are gone, and
  the four remaining wale flips are all rotate90/wale (knit_01, 03, 04, 05) --
  the wale detector on a physical course axis, where the discriminator now
  correctly abstains and the pre-existing composite reads what it read.
* **Nine strict xfails XPASSED and their marks came off in this change**,
  readings kept beside them: GRID `clean-garter-8x10-wale` and
  `mildly_degraded-garter-8x10-wale` (a bump's two flanks lean opposite ways
  exactly as a V's legs do); `mildly_degraded-jersey-8x10-rot3-wale`,
  `clean-jersey-8x10-edge0.2-wale`, `clean-jersey-8x10-edge0.3-wale`,
  `mildly_degraded-jersey-8x10-pins8-wale`, `mildly_degraded-jersey-8x10-
  edge0.2-wale`, `mildly_degraded-jersey-8x10-edge0.3-wale` (every one a
  T-vs-2T or T-vs-T/2 decision); and `test_climb_never_fires_on_an_already_
  correct_winner` -- the #325 false climb at 12 deg is undone, with its
  precondition still pinned because it is what makes the undo necessary.
* **No newly failing test.** pytest: 415 passed, 2 skipped, 37 xfailed
  (406 / 2 / 46 on `main`).
* **#325 climb sweep** (`TGR_CLIMB_SWEEP=1`): 300 renders, **fired 0 / 0 true /
  0 false** against `main`'s 6 / 0 / 6.

**What it does not do, said plainly.** The 12 deg rotation rows outside the
de-tilt search's +/-6 deg are where the 1D projection degrades (two
abstentions above); the 2D variants handle them in the discovery table and
were not shipped, because their point-sampled magnitudes on real photos are
0.05-0.3 against the 1D signal's 0.8. knit_02's pinned ROI still reads the
134.7px sub-feature. The course path keeps its seed-as-is selection on every
unrotated photo by construction. The remaining rotate90/wale flips are the
wale detector reading a physical course axis with no leg signature; the
discriminator's job there is to abstain, which it does. `ORIENTATION_DIPOLE_
WINDOW_ALONG` / `_ACROSS` (1/8, 1/4) are the one new constant pair; they are
fractions of the candidate period, not pixels, and the sensitivity table that
chose them is above.

Reproduce: `python tests/test_ground_truth_scorecard.py`; the sweep is
`tests/metamorphic.py` on each fixture at its default box; the Phase 1 table
is `analyze_gauge` over the case set reading `orientation_fundamental` /
`orientation_repeat` / `orientation_contrast` / `orientation_dipole` off
`result.wale.candidate_details` (scripts kept out of the tree, as the records
above do).

### Consensus loop-count override: the count may corroborate, never override by a harmonic (2026-10-22)

**The failure, on calibration (a) at the correct scale:** jersey W +90.0%,
teal W +70.5%, knit_09 W +103.7%, synth_jersey W +100.0%, synth_garter W
+100.0% -- all `confident` -- and knit_06 W +86.8%. **The diagnosis, from
synth_jersey first (perfect fabric, 36.00 px wale period, 18.00 px leg
spacing) and then jersey and knit_09, every proposed area, the exact scale
and ±0.5/1/2%** (`tests/app_path_scorecard.py`'s own fixtures, driven
through `propose_measurement_rois` + `analyze_multi_roi` with the lattice
record printed per area):

* **Each area's own wale periodicity reads the truth, everywhere.**
  synth_jersey: 35.93 / 36.00 / 35.67 px on its three areas (truth 36.00);
  jersey: 34.75 / 35.20 (truth 33.25, +4-6%); knit_09: 38 / 37 / 38 / 37
  (truth 36.67). That holds at all seven scales. Per-area status is a
  separate matter (jersey's are `uncertain` at 24-33% confidence; synth_
  jersey's A is `uncertain` for a 2x candidate scoring 0.74 against 0.81).
* **Every area's loop-lattice COUNT reads the leg spacing**: synth_jersey
  18.0 px from 30 accepted columns on a 540 px window (15 wales), lattice
  consistency 1.000, support 0.95-0.96, count confidence 0.98; jersey 17.5 /
  17.0 (14 columns, consistency 0.88-0.91); knit_09 18.5 / 18.0 / 17.5 / 18.0
  (25-26 columns). **Why it lands on the legs:** `analyze_loop_lattice_
  experiment` tries the periodicity's own 0.5x / 1x / 2x scales and keeps
  whichever lattice is most REGULAR (`lattice_consistency`); the V-shape
  response is the `min` of a left-leaning edge on one side and a right-
  leaning edge on the other, with BOTH pairings tried, so at the half scale
  the gap between one loop's right leg and the next loop's left leg is a
  "centre" too, every leg gap is a column, and on regular fabric that
  lattice is exactly as regular as the loop lattice -- on the synthetic
  fabrics both read 1.000 and the tie goes to the 0.5x candidate, which is
  tried first and only replaced on a strict `>`. A count of leg gaps is
  still "position-verified" and "multi-row-supported"; nothing in its
  confidence (half regularity, half row support) can tell it from a count
  of loops.
* **The exact rule by which it overrode the areas:** `_wale_count_candidate`
  returned the counted spacing whenever `_wale_count_confidence >= 0.30`,
  and `wale_candidates()` then fed THAT value to `_consensus_for_axis`
  INSTEAD OF the area's own `wale.spacing_px`, with the count's confidence
  (0.82-0.99) as its vote weight. The area's own reading never reached the
  vote; the only place the two were ever compared was the single-region
  confidence factor. Three areas at 18 px are three inliers, so the
  consensus is 18 px, tight, `confident`: 10.0 WPI on a 5.0 fabric.
* **Why it fired at the exact scale and not at ±0.5%: the knife edge is
  the lattice's scale pick, and the proposer moves it.** `propose_
  measurement_rois` sizes its windows from the calibration (`window_px =
  round(px_per_mm × 25.4 × size_in)`, stride 0.35 of that), so a 0.5% scale
  change moves every window by a few pixels and some by a whole stride.
  Each area's lattice then re-decides 18 px against 36 px on a consistency
  difference in the third decimal (knit_09 B at the exact scale: 0.944 for
  18.0 px; at -1% the same photo's B reads 36.5 px at 0.932 against 18.0 at
  0.944 on another area). The consensus takes the majority of those coin
  flips: knit_09 at the exact scale is 4 of 4 areas on the legs (10.39 WPI,
  confident); at +0.5% it is 2 of 4 (A and D at 35.0, B and C at 18.0 /
  17.5) -- no dominant cluster, weighted median 35.0 px, 5.37 WPI,
  `uncertain`. jersey at the exact scale is 2 of 2 on the legs; at -0.5%
  area B's lattice reads 39.5 px instead. There is no rounding or binning
  boundary in the proposer or the consensus; the proposer is scale-
  dependent by design, and what it exposes is that the count's choice of
  harmonic is a per-area toss-up the override then trusted outright.
  knit_01 W is the reverse for the same reason: at the exact scale its one
  counted area is excluded and the other has no lattice at all, so the
  periodicity reading stands (+3.4%); at ±1% a leg-lattice count (40 px
  against a true 87.6) gets in.

**Root cause: the consensus override, confirmed.** The per-area
measurement is right and the proposer only moves the pixels; what turned a
right reading into a wrong confident consensus is the rule that let a
trustworthy-LOOKING count replace the area's own reading across a harmonic.

**The census that decided the fix.** Over every fixture at the exact
scale and ±0.5/1/2% (70 app-path runs, ~200 areas, the diagnostic above):
wherever an area's count disagreed with its own periodicity reading, the
COUNT was the wrong one, every time -- the leg half-period on every clean
fabric (synth_jersey, synth_garter, jersey, knit_09, teal, knit_06's two
leg areas) and a 2x-3x of the truth where columns were missed (knit_01 D
137 px, knit_08 B 181 px, jersey B 80 px). Not once was an area's
periodicity a harmonic of the truth while its count was right. The
README's own record of why the override was built -- jersey ~9.5 WPI
corrected to ~5.9 by counting -- describes a periodicity path that has
since gained phase consistency, the sub-repeat test and the leg-lattice
climb; on this tree it is the count that carries the harmonic error, with
less evidence than the scorer that rejected it.

**The fix (one mechanism, `_wale_count_harmonic_note` beside
`_wale_count_candidate` in `analysis/gauge_analysis.py`, and the value
`wale_candidates()` feeds):** a region's counted spacing may CORROBORATE its
own periodicity reading and never REPLACE it. When the two agree within the
consensus's own "agrees" tolerance (`CONSENSUS_INLIER_LOG_TOLERANCE`, 0.22
in log-ratio, ~1.25x -- the same number `_consensus_for_axis` uses for two
regions and `_single_region_agreement_confidence` for one) the count
corroborates the reading: `wale_source` reads `loop_count` and the region
votes with the count's confidence, but **the value that enters the vote is
the region's own periodicity reading** (Eva's ruling, below). When the count
disagrees by more -- the leg half-period, a doubled repeat -- it is not
used at all: `wale_source` reads `periodicity`, `wale_count_confidence`
0.0, and a new per-region `wale_count_note` (API:
`multi_roi.per_roi[].wale_count_note`; Developer diagnostics: "Count not
used") says what the count read, the ratio, and the harmonic it is
consistent with. A region with no periodicity reading has nothing to vote
with. Nothing else moved: the ruler detector, the proposer, the scorer's
weights, the consensus's status logic and the lattice detector are
untouched, and `analyze_gauge` is not on this path at all, so the
pinned-crop scorecard (its pinned test passes unchanged) and the
metamorphic sweep (ok 119 / drift 12 / harmonic_flip 4 / lost 13 / skipped
6, cell for cell) cannot move and did not. The 415 original tests pass
unchanged; `tests/test_wale_count_harmonic_gate.py` (16 tests) pins the
gate, the leg and doubled-repeat notes, the tolerance's one owner, that a
corroborating count never supplies the value (knit_08's and jersey's own
numbers as fixtures), that a rejected count never reaches the density gate,
and the API field.

**Calibration (a), before → after** (every row that moved; the rest are
identical to the digit):

| row | before | after |
|---|---|---|
| jersey W | **+90.0%** confident | -5.5% confident |
| teal W | **+70.5%** confident | **-11.0%** confident (accepted by ruling, below) |
| knit_01 C | -0.1% confident | +4.3% confident |
| knit_06 W | +86.8% uncertain | -4.3% confident |
| knit_08 W | -0.1% confident | -1.4% confident |
| knit_09 W | **+103.7%** confident | -0.9% confident |
| synth_jersey W | **+100.0%** confident | +0.2% confident |
| synth_garter W | **+100.0%** confident | +0.0% confident |

Confident-and-wrong on (a): **5 → 1** (teal W, which was already on the
list). knit_01 W +3.4% and synth_rib W +0.0% (alt) are unchanged to the
digit; knit_01's course moved because its second area, no longer
wale-excluded, now votes on course too; knit_08 W moved 1.3 points because
its four areas now vote with their own readings (82.5 / 72.75 / 78.0 / 85.0
px) rather than their counts (79 / 77.5 / 75 / 77).

**Scale jitter, after** (per-inch at -2 / -1 / -0.5 / +0.5 / +1 / +2%,
truth in brackets): jersey W 4.66 / 4.66 / 4.70 / 4.82 / 4.83 / 4.71 (5.00);
knit_09 W 4.95 / 5.00 / 5.03 / 5.00 / 5.11 / 5.16 (5.10); synth_jersey W
4.90 / 4.95 / 4.97 / 5.03 / 5.05 / 5.10 (5.00); synth_garter W the same;
teal W 3.42 / 3.47 / 3.62 / 3.58 / 3.50 / 3.62 (4.00); knit_06 W 3.56 / 3.60
/ 3.71 / 3.53 / 3.62 / 3.70 (3.80); knit_01 W 3.88 / 4.10 / 3.91 / 3.82 /
3.94 / 4.09 (3.80); knit_08 W 4.82 / 4.54 / 4.62 / 4.24 / 4.85 / 4.80 (4.50).
Unstable axes **8 → 3** (jersey W, knit_01 W, knit_06 W, knit_09 W and
teal W became stable; knit_01 C, knit_08 C and knit_08 W stay flagged, the
latter two on status flips alone). The full tables are the generated block
above.

**Eva's ruling on this PR, and the amendment to the gate.** Two readings of
the same gate were measured over the whole scorecard and neither met every
criterion the PR set itself:

* **The candidate (REJECTED): the corroborating count supplies its
  VALUE as well as its confidence.** It put teal W at -6.6% (area C's count,
  73.0 px, agreeing with its 76.67 reading and carrying the vote) and every
  headline row inside 10% at the exact scale -- and **jersey W outside 10%
  at three of the seven jitter scales** (4.19 / 4.34 / 3.85 against 5.00 at
  -0.5 / +0.5 / +2%): jersey's windows are 250 px (seven wales), its
  accepted counts come from 4-6 columns, a missed column leaves the median
  interval 12-22% high (39.5 px from 6 columns at -0.5%, 38.5 / 38.75 from 5
  at +0.5%, 44.0 from 4 at +2%, truth 33.25), the count still "agrees" within
  1.25x, and its confidence (0.86-0.94, regularity and row support, which a
  missed column barely dents) outweighs the area's own (0.24-0.33) in the
  vote. Calibration (b) gained four confident-and-wrong rows under it
  (jersey W at the ruler's -0.8% scale among them).
* **Variant B (SHIPPED): the corroborating count supplies its confidence
  only; the region's own reading is always the value.** jersey W holds
  4.66-4.83 at every scale, unstable axes fall to 3, knit_08 W reads -1.4%,
  **and teal W reads -11.0%, confident, at the exact scale** -- teal's own
  periodicity reads 75-80 px against a 68.2 px truth on EVERY area at EVERY
  scale (the pinned-crop scorecard reads the same -12.4%), and only a
  count's value ever put it inside 10%.

**Eva ruled for variant B (2026-10-22) and amended the gate for this PR:
teal W is accepted at -11.0%, confident.** Her reasons: real users never
calibrate at the exact scale, so stability across jitter matters more than
hitting the target at one scale; and teal W was already confident-and-wrong
at +70.5%, so B leaves it on the list at -11.0% rather than adding a new
row. Her conditions, each measured on the shipped tree (variant B, as
implemented -- it reproduces the measured variant row for row and jitter
point for jitter point): the four headline wale rows inside 10% at all
seven scales (jersey -5.5 / -6.9 / -6.8 / -6.0 / -3.6 / -3.5 / -5.8;
knit_09 -0.9 / -2.9 / -1.9 / -1.4 / -2.0 / +0.1 / +1.1; both synthetics
within ±2.0) -- **holds**; knit_01 W / knit_08 W / synth_rib W no worse
(+3.4 / -1.4 / +0.0) -- **holds**; unstable axes below 8 with none new
(8 → 3) -- **holds**; the pinned-crop scorecard, the 415 original tests and
the metamorphic sweep unchanged -- **holds**; teal W within 15% at all seven
scales (-11.0 / -14.6 / -13.2 / -9.5 / -10.4 / -12.4 / -9.4) -- **holds**;
**teal W pinned as a strict xfail, labelled a known confident-and-wrong row
and the target of the next PR** (`tests/test_app_path_scorecard.py`,
`KNOWN_BEYOND_BAR` and `CONFIDENT_AND_WRONG["truth"]`) -- **done**.
**One condition fails by the letter: "no new confident-and-wrong row on (a)
or (b)".** (a) gains none (5 → 1, the one being teal W). **(b) gains three:
knit_05 W (-15.5%, was +7.6%), synth_jersey W and synth_garter W (+154.0%,
were "no measurement")** -- all three the RULER detector's own error now
visible on the wale axis, not a wale measurement that moved: the two
synthetic rows are the areas' correct 36 px reading at a SPURIOUS +154%
ruler (their course twins were already +154-155% confident on the same
ruler; before the gate every leg count on them was excluded as implausibly
dense at that scale, which is what returned no number), and knit_05's
ruler is WRONG by -56.6%, so the proposer builds one 122 px window (1.8
true wales) whose 35 px reading is a sub-feature of a 68 px wale -- the
old +7.6% was that scale error cancelling against a 27.5 px count, two
errors and no right answer. The ruler detector is outside this PR by its
brief. **Eva ruled (2026-10-22) that these three rows do NOT count against the
"no new row" condition**: all three are ruler-detector errors made visible
by a now-correct wale reading -- the synthetics previously returned no
number while claiming `confident`, and knit_05's +7.6% was two errors
cancelling -- and the condition was meant to catch the fix CREATING errors,
not upstream errors becoming visible. The three are pinned as strict xfails
labelled "ruler-detector error, target of the calibration PR"
(`KNOWN_CONFIDENT_AND_WRONG` in `tests/test_app_path_scorecard.py`), so
that PR has to clear them explicitly. **A tolerance between the two readings was
NOT written**: ~10% separates jersey's 39.5-against-35.2 count from
knit_08's 77-against-85, a two-percent-wide knife edge typed to three
photos.

**Revisit the candidate's value-supplying reading only if** the count's
precision on small windows is fixed first (a 4-6 column count on a 250 px
window has none of the certainty its confidence claims -- that is the next
mechanism, in its own PR: the one that should take teal W inside 10%), or
if a fixture arrives whose periodicity reads a harmonic of the truth while
its count reads the loop pitch: the census above found none, and that case
is the one the override was written for.

### Calibration guardrail: a ruler pre-fill is offered only when it can be justified (2026-10-22)

**The failure.** A user confirms whatever the Calibrate step pre-fills, so a wrong
pre-fill is a confidently wrong scale. On the app-path scorecard at `main` c887a2d,
accepting `/detect-ruler`'s pre-fill as-is (calibration (b)) left **13**
confident-and-wrong axes against **1** with the correct scale (a). What the
pre-fill actually was, photo by photo (checked by overlaying the detected band,
ticks and points on each image):

| photo | pre-fill | what it was |
|---|---|---|
| jersey, knit_01 | 1 in / 1 cm | **correct** (−0.8%, +1.4%) |
| teal | 1 cm across ~1.95 cm | **no real ruler read**: the needle-size gauge's numerals and circles (+94.6%) |
| knit_02 | 1 in across ~0.12 in | **wrong label**: a real tape, both points one tick apart (−88.3%) |
| knit_05 | 1 in across ~0.43 in | **no real ruler read**: stitch peaks along the fabric's top edge (−56.6%) |
| knit_06 | 1 cm across ~1.75 cm | **no real ruler read**: stitches, not either printed border ruler (+75.2%) |
| knit_08 | 1 cm across ~5.9 cm | **wrong unit**: an inch ruler read at its half-inch ticks and labelled cm (+486.5%) |
| knit_09 | 1 cm across ~1.15 cm | **no real ruler read**: the fabric's lower edge, not the vertical tape (+15.5%) |
| synth_jersey / garter / rib | 1 cm | **no real ruler** (none is drawn): +154%, +154%, +306% |

Over every image elsewhere in the repo (178: screenshots, renders, photos; a root-level
copy of the teal photo is left out) plus five rendered printed-text pages (183 images, a
stand-in: the audit's own non-knit images are not in the repository) the detector,
ungated, reported a ruler on **150**, at confidence up to 0.94.

**The confidence does not separate them, so it was not used.** The two correct
pre-fills read 0.73 (knit_01) and 0.85 (jersey); the wrong ones read 0.61, 0.75, 0.77,
0.78, 0.80, 0.91, 0.95, 0.97 and 0.98. No cut keeps both correct ones and drops the
rest. What does separate them is structure.

**The mechanism: the span must be one period of the ruler's own tick comb**
(`justify_ruler_calibration` in `analysis/gauge_analysis.py`, read by
`/detect-ruler`; the detector itself is unchanged and still decides where the ticks
are). A real ruler repeats a unit mark at one pitch, the same number of smaller ticks
sits between neighbouring unit marks, and a unit mark is longer than anything between
two unit marks. The gate checks the span the detector picked against exactly that,
using only the ticks the detector already found. Five checks, each of which let a
wrong span through on real tick evidence when removed:

1. **A tick hierarchy was found.** The detector's fallback (five minor ticks labelled
   "1 unit") never knows how long its span is; its own docstring says so.
2. **The span holds a whole, standard number of minor ticks** (4/5/8/10/16, the
   detector's own unit vocabulary, now one owner), to within pixel quantisation
   (±1 px plus ½ px per interval): the tick intervals agree with the claimed spacing.
3. **That number names the unit the detector suggested** (10 → cm, 8 or 16 → in).
4. **The two end marks are one tick class and longer than everything between them**,
   by a rule with no number in it (`|reach₁ − reach₂| < min(reach) − max(interior reach)`):
   a half-inch mark and an inch mark, or two neighbouring half-inch marks, are not a unit.
5. **No tick as long as the end marks sits half-way along the span**: if one does, the
   real unit is half the span (two inches read as one).

When all five hold the pre-fill is offered with a plain-words statement of what was
assumed (`assumption`: *"Read as 1 cm between these two marks. The detector counted 10
small ticks between them, which is how 1 cm looks on a metric ruler. It cannot read the
ruler's numbers, so check that both points sit on marks exactly 1 cm apart."*) and the
detector's confidence is no longer shown, since it does not mean what it appeared to.
When any fails, nothing is pre-filled, `declined_reason` records which and why (for
logs and tests, not display), and the Calibrate step says: *"No ruler scale could be
verified in this photo, so nothing was pre-filled. Click two marks on your ruler, then
type the distance between them."* Both copies of the frontend (the production copy at
the repo root and `frontend/`) carry the same change.

**What each check earns, measured.** On every pair of ticks the detector found on the
four photos whose detected ticks lie on a real ruler (jersey, knit_01, knit_02, knit_08;
114 / 495 / 102 / 12 pairs whose span is a standard subdivision), with the label the strongest a wrong pair could
carry (the unit its own subdivision implies):

| gate | jersey right / wrong | knit_01 right / wrong | knit_02 right / wrong |
|---|---|---|---|
| checks 1–3 | 21 / **39** | 97 / **96** | 0 / **8** |
| checks 1–3 and 5 (no 4) | 4 / **8** | 7 / **5** | 0 / **1** |
| checks 1–3 and 4 (no 5) | 4 / **1** | 9 / 0 | 0 / 0 |
| all five | 4 / 0 | 6 / 0 | 0 / 0 |

(knit_08: 12 candidate pairs, none accepted.) The shipped gate is pinned against this
in `test_no_pair_of_real_ticks_is_wrongly_accepted`. A sixth check, "the unit marks
recur at least three times", was tried and dropped: it added nothing on any of these
and refused four correct synthetic pre-fills where only two units fit in the frame.
The two soft constants (the half-way window of 0.25 pitch, the 1 px quantisation) are
insensitive: 0.5–2 px and 0.1–0.4 pitch give identical outcomes everywhere; only
deliberately loose values (≥2 px with 0.5 pitch, or ≥3 px with 0.4 pitch) start to
refuse a correct pre-fill, and never to accept a wrong one.

**Result (scorecard, `tests/app_path_scorecard.py`).**

| | before (c887a2d) | after |
|---|---|---|
| (b) confident-and-wrong axes | 13 | **1** (teal W, the same row as (a)) |
| (a) confident-and-wrong axes | 1 (teal W) | 1 (unchanged) |
| pre-fill offered on a drawn fabric | 3 of 3 | **0 of 3** |
| pre-fill offered on 183 non-ruler images | 150 | **0** |
| jersey, knit_01 | correct pre-fill | **correct pre-fill kept**, same points |
| photos with a ruler and a pre-fill that was wrong | 6 of 8 | **0 of 8** |
| photos with a ruler and no pre-fill (calibrate by hand) | 0 of 8 | 6 of 8 |

Mode (a), the jitter table, the pinned-crop scorecard and the metamorphic sweep (ok
119 / drift 12 / harmonic_flip 4 / lost 13 / skipped 6) are identical to `main` cell
for cell; the three strict xfails #441 pinned as "ruler-detector error" (knit_05 W,
synth_jersey W, synth_garter W on (b)) are regular tests now.

**What it costs, and what it does not cover.**

* **Recall is 2 of 8.** Six photos with a real ruler (teal, knit_02, 05, 06, 08, 09) are
  offered no pre-fill and the user calibrates by hand. That is the safe direction, and
  each is a strict xfail (`WITHHELD_RULER`): the day the detector reads one of those
  rulers correctly, it XPASSes and the entry has to come off. Reading the right ruler
  is the detector's job and is not done here.
* **The evidence for acceptance is thin by construction**: two real photos. The 40
  correct synthetic pre-fills (120 drawn rulers: metric and imperial, 5 scales each,
  horizontal and vertical, plain and fabric ground; the ungated detector was wrong on
  80 of them and the gate refused all 80) were drawn by the author of the gate and
  confirm the accept/refuse logic, not the gate's behaviour on photographs.
* Checks 1, 2 and 4 are exercised by real photos and by real-tick pairs. Check 3 has a
  unit test and one non-ruler image behind it; check 5 has a unit test and the real-pair
  table above. knit_05 is refused by two checks independently (check 2's quantisation,
  7 px off against 3 px allowed, and check 5).
* A span that is one unit of a ruler whose finest ticks were missed *and* whose
  half-way tick was also missed is not detectable from the evidence the detector keeps.
* Dev-copy quirk found and not touched: `frontend/textile-gauge-reader.js` has
  `API_BASE_URL: ""` and every API call is guarded by `if (!CONFIG.API_BASE_URL) return`,
  so the dev copy never auto-detects; the root copy is the one tested end to end here.

**Files.** `analysis/gauge_analysis.py` (the gate; `RulerTickEvidence` recorded on the
detector's result; the unit vocabulary lifted to constants, behaviour unchanged),
`backend/main.py` + `backend/schemas.py` (`/detect-ruler`), both frontends, the
scorecard harness and its pins, and `tests/test_ruler_prefill_gate.py` (each check
fires alone — six mutants of the gate, one per check, each turn exactly the matching
tests red).

### Phone-resolution photos: the ROI proposer at one working resolution, and the course loop-center pitch may corroborate, never override by a harmonic (2026-10-23)

Two mechanisms landed together (Eva's ruling of Oct 22: park the proposer fix, build the
measurement fix on top, land both). Both are measured on `tests/app_path_scorecard.py`'s
app path -- `/propose-rois`, every area accepted, `/analyze-multi` -- at the correct scale,
under ±0.5/1/2% scale jitter, and at 0.5× / 1× / 2× of each photo's own resolution.

#### 1. The proposer: a 16 px fabric filter and its 97% requirement (PARKED, now shipped)

`_fabric_mask` marks a pixel "fabric" when the local std-dev over a **16 px** box
(`ROI_PROPOSAL_BACKGROUND_BLOCK_PX`) is at least 10 grey levels, and a candidate window had to
be **≥ 97%** fabric (`ROI_PROPOSAL_MIN_FABRIC_FRACTION`) before it was even scored -- fixed
PIXEL quantities tuned on ~170-350 px/in photos. On a fine photo a 16 px block sits inside one
smooth yarn strand, its std-dev falls under the floor, real fabric reads as background, and
every window at every size is rejected before scoring: the app proposed NOTHING. Measured at
native resolution, 1-inch windows on the proposer's own grid: knit_02 (1187 px/in) **0 of 28**
windows pass, knit_05 (320 px/in) **0 of 210** (fabric fraction median 0.40 and 0.78); the
same windows at 180 px/in pass 5 of 28 and 95 of 210. The anomaly baseline's 16 px block, the
Laplacian sharpness ceiling, `MIN_PLAUSIBLE_SPACING_PX` and the quadrant split's 20 px minimum
are the same class of constant, which is why the fix normalises the IMAGE rather than retuning
one number.

`propose_measurement_rois` is now a resolution-normalising front door onto
`_propose_measurement_rois_at_scale`: a photo finer than
`ROI_PROPOSAL_WORKING_PX_PER_INCH = 180` is downsampled (INTER_AREA) **for proposal only**, the
windows are chosen there and mapped back to the full-resolution image, which is what analysis
reads, untouched. A coarser photo is never upsampled (there is nothing finer to recover, and an
upscale re-creates the smooth-strand problem). **Why 180:** it is the synthetic fixtures' own
scale (their 1× rows take the untouched path), it is the coarsest value at which every
ground-truth fixture is proposed at 0.5×, 1× and 2×, and at 200 the 2×-upscaled synthetic
garter loses its proposals again (3 → 0 areas). **Why not 160:** at 160 one resolution table
cell reads better -- knit_05 course at 1× becomes −2.0% uncertain instead of +87.3% confident --
and that cell is a trap: the same fixture still read +91.0% confident at 0.5× and at 2×, so the
"improvement" was the proposer landing its windows a few pixels elsewhere on a photo where a
one-pixel move of the area flipped the course reading between the pitch and its half (§2).
Choosing the working scale for a lucky placement on a ground-truth fixture is tuning the
instrument to the test set; 180 is chosen on a property and left the knit_05 defect visible,
which is what §2 fixes. **Do not move `ROI_PROPOSAL_WORKING_PX_PER_INCH` to rescue a reading.**

The proposer is 2-12× faster on large photos (it scans a ≤180 px/in copy). The whole request
is SLOWER wherever areas now exist that did not before, because every area is analysed at full
resolution (§4).

#### 2. The course axis: a loop-center pitch that matches no candidate is not evidence (THE MEASUREMENT FIX)

**The failure, measured through the API on knit_05 once the proposer offered it areas** (320
px/in, true course pitch 320 / 6.7 = 47.8 px): the course consensus read **+87.3% confident**
at 1× (+91.0% at 0.5×, −5.0% uncertain at 2×). Two of its four 2-inch areas read a 25.5 px
sub-feature and two the ~50 px row pitch, and the same 640 px window moved ONE pixel right and
down flipped 25.5 ↔ 50.6, both confident.

**The diagnosis, per window.** The course SEED was right on every window: `_autocorrelation_
spacing` lands on 50-51 px (on window A it lands on 101 and the sub-repeat test descends it to
51, as designed). What halved it is the loop-center reconciliation. `_detect_loop_centers` runs
at a minimum separation of `0.3 × min(p0_wale, p0_course)` -- on knit_05 **9.9 px**, because the
raw wale seed is the 33 px leg lattice -- and finds **~1,250 "centers" in a window that holds
~125 loops**. Their nearest-neighbour pitch along the course axis is **15.0 px** on every window
(≈1.5× the detector's own floor: the detector reading its own minimum separation, not a loop
pitch), and its consistency is **0.496-0.512** against `MIN_CENTER_CONSISTENCY = 0.5` -- so
whether that pitch was TRUSTED at all is decided by the last bit of a one-pixel window move.
Where it was trusted, `_reconcile_period` took "the candidate nearest the loop-center pitch on a
log scale" from {25.5, 51, 102} with no agreement tolerance: 25.5 is 1.70× away from 15.0, 51
is 3.4×, so 25.5 "wins" and the correct seed is "corrected down to match loop-center spacing".
Where the pitch was not trusted, the seed stood and read right.

This is NOT the course-axis twin of the wale leg / half-period ambiguity (#338, #441): there the
SEED lands on a genuine periodic structure at T/2 (the leg lattice) and the fix is a second
discriminator (the leg-slant signal, the sub-repeat walk). Here the seed is right, the sub-repeat
test already did its job, and what overrode it is a structural cross-check reading a quantity
with no loop information in it. It IS the course-axis twin of #441 in shape: an independent
"structural" estimate replaced the periodicity reading across a harmonic. The course path had
no equivalent of #441's corroboration rule -- the v3 scorer the WALE axis uses applies
`HARMONIC_MATCH_LOG_TOLERANCE` (~1.4×) in `_center_pitch_agreement`; the course path's
`_reconcile_period` applied none. The template walk cannot stand in for it: at 25.5 px it reads
0.64 (positive) on knit_05, so a walk-gated descent would still halve it.

**The fix (one mechanism, `_reconcile_period`'s `center_log_tolerance`, passed by
`_analyze_direction` as `HARMONIC_MATCH_LOG_TOLERANCE`, the one owner the wale axis already
uses):** the loop-center pitch may CORROBORATE a member of the 0.5×/1×/2× family -- pick the one
it agrees with within ~1.4× -- and a pitch further than that from EVERY candidate is set aside,
for the period AND for the overlay positions, exactly as if none had been offered; the decision
says so (`center_pitch_used = False`, a reason naming the pitch, the nearest candidate and the
ratio). An agreeing pitch corrects a doubled or halved seed exactly as before. `_reconcile_
period` called with no tolerance keeps its original contract (nearest candidate whatever the
distance), which `tests/test_loop_center_reconciliation.py` pins; every production call goes
through `_analyze_direction` and carries the tolerance. `tests/test_course_center_pitch_gate.py`
(13 tests) pins the gate, the must-fail (tolerance off takes the half), that a rejected pitch is
withheld from the positions too, and knit_05's windows A / B / B+1px / C through `analyze_gauge`
(all within 10%, confident, B and B+1px within 2% of each other).

After the fix every one of knit_05's eight probed windows (the four proposals and their 1 px
shifts) reads **48.75-52.0 px**, confident.

**Rejected on the way:** gating the descent on the sub-repeat walk (the half-lag walks at 0.64
on knit_05 -- backwards); a saturation test on the detector (`median_nn ≈ 1.5 × min_separation`
on both affected photos -- the same root cause, the same outcome on every fixture measured, but
a second number without an owner where the agreement tolerance already has one; revisit if a
real loop pitch ever lands outside the family's 1.4× band); moving the detector's minimum
separation (changes loop-center evidence for the wale scorer and the density gate on every row);
tuning the tolerance between knit_01's 1.61× and knit_05's 1.70× (a test-set tune).

#### 3. knit_02 at 2× (2374 px/in): an image-wide 4 px grid, NOT this mechanism -- pinned, "high px/in, deferred"

At 2× every one of knit_02's areas reads an **8 px** period on BOTH axes at autocorrelation
strength 0.76-0.82 (the wale result is then empty; course has no truth). It is not the re-encode:
the 2× image encoded as PNG, as JPEG q95 and as JPEG q75, and not re-encoded at all, all read 8
px to the third decimal. It is a **4 px periodicity at native scale, present in every window of
the photo -- fabric and non-fabric alike (lag-4 autocorrelation of the raw gradient projection
0.60-0.83 on all six windows probed, both axes)** -- a sensor / ISP grid (the shape of a quad-
Bayer remosaic), not fibre texture or ply twist. At 1× the fixed 3 px `SMOOTHING_WINDOW_PX`
suppresses it (after smoothing the lags 2-4 read 0.86 / 0.83 / 0.84, no local peak), the same
accidental suppressor `_prefer_fundamental_seed`'s docstring records for the jersey's fine legs.
The 2× upscale moves it to 8 px, where it passes the smoother and becomes the crop's strongest
periodicity. The metamorphic sweep already reads it at native scale: knit_02's 70% box baseline
course is **4.0 px**.

Analysing each area at a working resolution (the proposer's own 180 px/in) would remove it (8 px
becomes 0.6 px and INTER_AREA integrates it away) and would also fix the timing (§4). It would
NOT fix §2, which fires at 320 px/in native and at 0.5× (160 px/in, below any working scale) --
so (a) and (b)+timing are two mechanisms, and only (a) is fixed here. knit_02 at 2× is pinned
as a strict xfail labelled "high px/in, deferred" in `tests/test_app_path_scorecard.py`.
Analysis-side resolution normalisation is its own decision with its own resolution-invariance
obligation.

#### 4. Timing

Whole-request time (one `/propose-rois`, every proposal accepted, one `/analyze-multi`, through
the test client) on each photo resampled to a 4000 px long edge (INTER_CUBIC / INTER_AREA, JPEG
q92) and calibrated correctly, local, nothing else running on the box. Compare within a row.

| photo @4000 | propose main → here | areas main → here | analyze main → here | whole request main → here |
|---|---|---|---|---|
| jersey (4000x2674) | 1.61 → 0.34 s | 0 → 2 | 0.00 → 4.76 s | 1.61 → **5.10 s** |
| knit_01 (4000x3517) | 2.16 → 1.11 s | 2 → 4 | 1.46 → 9.13 s | 3.62 → **10.24 s** |
| knit_02 (4000x2667) | 1.34 → 0.11 s | 0 → 4 | 0.00 → 15.31 s | 1.34 → **15.42 s** (over 15 s) |
| teal (3200x4000) | 3.58 → 0.24 s | 2 → 4 | 1.73 → 21.90 s | 5.31 → **22.13 s** (over 15 s) |

The proposer is 2-15× faster (it scans a ≤180 px/in copy). The whole request is slower because
areas now exist, or more and larger ones, and each is analysed at full resolution: ~4-5 s per
2-inch area at 4000 px. teal at ~22 s locally is a risk against the frontend's 75 s timeout on
Render's free tier, which is slower than this box. The reconciliation gate (§2) costs nothing
measurable (knit_02 and teal read within a second of the parked commit's own table). Analysis-
side resolution normalisation -- the same 180 px/in working copy for the per-area analysis --
would address this and §3 together; it is a separate decision with its own resolution-
invariance obligation and is not taken here.

#### 5. What moved, main → this tree

Calibration (a), the correct scale; every row that moved, with the proposer-only tree between
(`f875431`), so each move has an owner. Confident-and-wrong: main **1** (teal W) → proposer
alone **2** (teal W, knit_05 C) → here **1** (teal W), on (a) and on (b) alike. No axis that was
confident and correct on main is confident and wrong here.

| row | main | proposer only | proposer + gate | why |
|---|---|---|---|---|
| knit_02 W | no areas | −2.4% C | −2.4% C | the proposer offers four 1-inch areas (was none) |
| knit_05 W | no areas | +1.4% C | +2.4% C | areas (was none); one area's wale moves 1.0 pt with the gate through the per-region aspect-ratio exclusion |
| knit_05 C | no areas | **+87.3% C** | **−5.8% C** | §2: the 15 px loop-center pitch is set aside and the 51 px seed stands on every area |
| knit_01 C | +4.3% C | −30.2% u | −30.2% u | the proposer's third area (B) reads the two-row seed 235 px; its 39 px pitch is set aside here (it pulled B to 117.5 px on the proposer alone, also doubled); the consensus of 54.5 / 241 / 83.7 px is flagged uncertain. ±0.5-1% of scale moves the windows and reads 5.6-5.9/in confident |
| knit_01 W | +3.4% C | +3.7% C | −1.9% C | area B's course at 241 px fails the wale:course plausibility gate, B leaves both consensuses, the wale consensus re-forms from A and C (84.5 / 89.3 px) |
| knit_06 C | +0.4% C | +2.0% C | +2.0% C | the proposer's fourth area |
| knit_08 W | −1.4% C | +4.5% C | +4.5% C | the proposer's two 2-inch areas (were four 1-inch) |
| knit_08 C | +2.3% u | −2.3% C | −2.3% C | same |
| knit_09 W | −0.9% C | −2.5% C | −2.5% C | the proposer's three areas (were four) |
| knit_09 C | −0.0% C | −0.9% C | −0.9% C | same |
| teal W | **−11.0% C** | **−13.0% C** | **−13.0% C** | the proposer's fourth area; teal's own periodicity reads −12% on every area (#441's accepted row). Jitter −10.4 .. −13.5% at every scale (main −9.4 .. −14.6%) |
| teal C | +0.5% C | −0.6% C | −0.6% C | same |

Under (b) the same rows move by the same amounts (knit_01 C there is +4.7% confident on the
ruler's own −0.8% scale, from +2.0% uncertain). Jitter-unstable axes **3 → 1**: knit_08 W and
knit_08 C are stable under the proposer's placement, knit_05 C was UNSTABLE on the proposer alone
(±1% of scale flipped 12.55 ↔ 6.2-6.4/in) and is stable here; knit_01 C stays flagged (above).

**The gate's own partition, by instrument.** The app-path scorecard: knit_05 C fixed at every
resolution, knit_01 W −1.9%, nothing else. The **pinned-crop scorecard** (`python
tests/test_ground_truth_scorecard.py`): ONE row moves -- **knit_01 course −1.8% → −46.9%,
confident** (110 px against 58.4 on ROI (550, 431, 862, 862)). On that crop the course seed is
119 px, the signal is ANTI-correlated at one row (autocorrelation −0.15 at 59 px, no peak, so the
sub-repeat test cannot descend), the v3 diagnostics score 119 over 59.5 (0.425 vs 0.383) and the
template walk at 59.5 reads 0.0: nothing in the crop supports one row except the loop-center
pitch of 37.0 px -- 1.45× the detector's 25.5 px floor, 1.61× from the nearest candidate -- which
the old rule rounded to 59.5. The pinned −1.8% was the same coin that gives knit_05 +87%, landing
the other way. **The metamorphic sweep** (11 fixtures, the CLI's 70% box): 119 / 12 / 4 / 13 / 6
→ **118 / 12 / 5 / 12 / 7** (ok / drift / flip / lost / skipped); nine cells move. knit_05
half_roi course goes lost (25.5 px) → harmonic_flip (**50.4 px, the true pitch**, counted as a
flip because the full box's baseline is the doubled 98.3); knit_01 half_roi course stays lost
(58.5 → 116 px against an 8.9 px baseline that is a sub-feature either way); knit_07 (no course
truth, its wale truth excluded by the ground-truth file) moves its baseline 64 → 108 px and six
cells with it, one ok → drift. These two instruments are the cost of the fix and are stated here
rather than tuned around; `tests/test_ground_truth_scorecard.py`'s knit_01 course pin is left
where it was and reads red on this tree until it is re-pinned on purpose.

#### 6. Resolution invariance

Each photo resampled to 0.5× / 1× / 2× of its own resolution (INTER_AREA down, INTER_CUBIC up),
calibrated correctly for that resolution, every proposal accepted; a cell is areas · per-inch ·
error · status. The generated block above carries the live table; this is the tree at this note.

| fixture | axis | 0.5× | 1× | 2× | spread | verdict |
|---|---|---|---|---|---|---|
| knit_05 | wale | 4 · 4.78 +1.6% C | 4 · 4.81 +2.4% C | 4 · 4.85 +3.3% C | 1.6% | agree |
| knit_05 | course | 4 · 6.43 −4.1% C | 4 · 6.31 −5.8% C | 4 · 6.36 −5.0% C | 1.9% | agree (was 12.80 / 12.55 / 6.36 u: +91% / +87% / −5%) |
| knit_02 | wale | 4 · 3.80 −4.9% C | 4 · 3.90 −2.4% C | 4 areas, no measurement | — | MISSING (§3, deferred) |
| knit_02 | course | 4 areas, no truth | 4 areas, no truth | 4 areas, no truth | 4985% | DISAGREE (§3, deferred) |
| knit_01 | wale | 4 · 3.96 +4.3% C | 3 · 3.73 −1.9% C | 4 · 3.92 +3.1% C | 6.3% | agree |
| knit_01 | course | 4 · 5.70 +0.0% C | 3 · 3.98 −30.2% u | 4 · 5.91 +3.7% C | 48.5% | flagged |
| knit_08 | wale | 4 · 4.87 +8.3% C | 2 · 4.70 +4.5% C | 2 · 4.95 **+10.1%** C | 5.4% | agree |
| knit_08 | course | 4 · 7.33 +6.2% C | 2 · 6.74 −2.3% C | 2 · 6.56 −4.9% C | 11.8% | DISAGREE (the proposer's placement; identical on the proposer commit alone) |
| teal | wale | 2 · 3.50 −12.6% C | 4 · 3.48 −13.0% C | 4 · 3.43 −14.2% C | 1.9% | agree (the accepted row) |
| every other row | | | | | ≤ 6.0% | agree |

Every fixture gets areas at every resolution (main: 9 MISSING rows). Confident-and-wrong at some
resolution: knit_08 W at 2× (+10.1%, inherited from the proposer's placement -- the proposer
commit alone reads the same cell) and teal W at all three.

#### 7. A proposer regression the parked commit carries, found by the original suite and NOT fixed here

`tests/test_roi_proposal.py::test_proposed_regions_avoid_a_ruler_like_block` passes on main
and fails on the parked proposer commit: on its synthetic (900×1500 at 8.0 px/mm = 203 px/in,
a bright ruler band from y 1250) the proposer now puts region A at y 658..1268, 18 px into the
band. It is not the map-back: at the working scale the chosen window spans 583..1123 against a
band edge at 1107.3, the same one-block dip. The cause is the quality RANKING at the working
scale. `_roi_quality_score`'s sharpness is `Laplacian variance / 500`, a fixed-pixel ceiling:
the INTER_AREA downsample (factor 0.886) softens the synthetic fabric so every clean window's
sharpness falls from 1.0 to **0.53-0.55** (quality 0.981 → 0.907-0.910), while the window that
dips one block into the ruler keeps **sharpness 1.0 from the ruler's own edge** (quality 0.961)
and outranks them. The anomaly gate reads that window at 0.059 against a 0.5 ceiling and is not
meant to catch a one-block dip ("ranking, not gating", by the test's own text); on main the
ranking did the job because all four windows were equally sharp and texture consistency (0.998
vs 0.862) decided. A proposer-side change (a sharpness ceiling that follows the working scale,
or re-ranking at native resolution) is the fix and belongs to the proposer's owner; it is
recorded here rather than widened into this PR.

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
- Also check `https://<your-service>.onrender.com/version` and confirm
  `commit` matches `git log -1 --format=%H origin/main` — see "How to
  tell what's actually deployed" below. `/health` only proves *a*
  process is answering; `/version` proves it's answering with *current*
  code, which is the thing that actually matters after every future
  push.
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
  rather than treating a slow cold start as a crash — see "Why the
  health banner can lie" below for what that actually took.
- Nothing from `/analyze` is written to disk on the server — uploaded
  images exist only as in-memory arrays for the duration of the request.
  The one place anything touches disk is the opt-in ground-truth
  correction system — see
  [Ground Truth / Correction System](#ground-truth--correction-system),
  including the important caveat about Render's ephemeral disk.

### Why the health banner can lie (and the cold-start-aware retry this led to)

Reported symptom: the status banner said "Analysis service is online"
while the Analyze step failed, repeatedly, with a generic "Could not
reach the analysis service. It may be offline, waking up from a cold
start, or blocking requests from this page (CORS)" — three
undifferentiated causes, none actionable.

**No Render dashboard/log access was available to diagnose this from
live data** (this environment's outbound network access to `onrender.com`
is blocked by policy) — the investigation instead profiled the exact
production code locally and read the request/response handling directly.
Three things came out of it:

1. **`/health` proves liveness, not capacity.** It's a bare
   `def health(): return {"status": "ok"}` — no image decode, no CV
   work, no memory pressure, doesn't even touch the `analysis` package
   at request time. "Online" was true and also **misleading**: it
   proved the process could answer a GET, not that it could complete an
   analysis. That gap, not a bug, is what let the banner and the Analyze
   failure coexist.
2. **Analyze had no retry; `/health` already did.** `/health` retries
   with backoff (5 attempts, cumulative worst case ~90+s) specifically
   because Render's free tier can take up to ~60s to wake a sleeping
   instance. `/analyze-multi` was a single `fetch()` with one 75s
   timeout and no retry at all. A user spending real time in
   Upload → Calibrate → ROI → Orientation between the initial health
   check and clicking Analyze can easily cross the free tier's 15-minute
   idle window — the instance spins back down, and the one-shot Analyze
   request had no mechanism to recover the way health did.
3. **Every route ran its CV work directly on the event loop.** All
   `/analyze*` routes are `async def`, but called `analyze_gauge` /
   `analyze_multi_roi` / etc. synchronously, inline — with Render's
   default single uvicorn worker (no `--workers` in render.yaml), that
   blocks the ENTIRE process for the whole request, including its
   ability to serve another `/health` check concurrently. Doesn't
   directly cause a connection failure, but it's a real gap, fixed
   alongside this (`backend/main.py` now runs all of it via
   `run_in_threadpool`).
4. **Memory is a real, checkable risk for large photos, not just a
   theory.** Profiled the real `/analyze-multi` path locally: a
   1508×1008 photo stays comfortably under the free tier's 512 MB
   ceiling (~160-265 MB peak), but a 3925×2617 photo (a real phone-
   camera-scale image already in this repo's fixtures) hit **368 MB from
   region-proposal alone** — 72% of the ceiling, before uvicorn's own
   overhead. There is no image downscaling anywhere in this codebase,
   client or server — a full-resolution upload goes straight to
   `cv2.imdecode`. Not fixed here (a real downscaling pass is its own,
   separate piece of work); flagged as a live risk worth its own pass.
   Side finding from that same profiling run, unrelated to this bug: on
   that 3925×2617 image, `propose_measurement_rois` returned **zero**
   candidate regions — its window-size heuristic is likely tuned for
   smaller images. Also flagged, not fixed here.

CORS was checked and ruled out directly: `CORSMiddleware` applies one
identical wildcard policy (`allow_origins=["*"]`, `allow_methods=["*"]`,
`allow_headers=["*"]`) to every route, and a GET to `/health` and a
`multipart/form-data` POST with no custom headers are both CORS "simple
requests" (the POST never triggers a preflight) — nothing in the code
treats them differently.

**What changed, given all of that:**

- **Backend**: every CV-bound route now runs its work via
  `run_in_threadpool` instead of blocking the event loop directly (see
  the module comment at the top of `backend/main.py`).
- **Frontend Analyze flow**: a transport-level failure (a bare
  `TypeError` from `fetch()` — no HTTP response reached us at all — or
  our own request timeout) is no longer immediately shown as a dead-end
  error. It's treated as a possible cold start: the same retry/backoff
  `/health` already used (now shared as `waitForServiceToWake`) runs
  first, with the status line reading "Waking up the analysis service —
  this can take about a minute…", and once `/health` confirms the
  service is back, the ORIGINAL request is retried automatically, once.
  Only a failure *after* that recovery attempt — or `/health` never
  coming back — is shown as a real failure, with wording that says so
  explicitly, distinct from the cold-start message.
- **The banner no longer says "online".** It says "Analysis service is
  reachable" — accurate to what a GET /health actually proves, no more.
  A real (post-recovery) Analyze failure now also flips the banner to a
  visibly degraded state itself (`markServiceDegradedAfterAnalyzeFailure`),
  rather than leaving stale "reachable" text sitting next to a failure
  the user can see happening.
- An HTTP-level failure (the server DID answer, just with an error) is
  never treated as a cold start — only genuine transport failures are.

**Follow-up bug this same instinct almost missed.** After the fix above
shipped, two live-site reports came in that looked unrelated at first: a
raw JS crash ("Cannot read properties of undefined (reading 'length')")
on Analyze, and "Accepted wale columns: 43 of undefined" in Developer
diagnostics. Reproducing against the real backend locally (`pytest`
`TestClient`, not a hand-built response) showed the CURRENT code returns
every field the frontend reads — so the live Render deployment was
almost certainly running older backend code, missing `no_measurement_
labels` / `columns_considered` (both added together by the same earlier
PR). That explained both symptoms directly: `no_measurement_labels`
being absent throws exactly that "reading 'length' of undefined" error
in `renderMeasurementConsistency`; `columns_considered` being absent
just interpolates as the literal string "undefined".

The real, separate bug this surfaced: **`err instanceof TypeError`, the
check this section's own cold-start recovery is built on, cannot tell
"the network failed" apart from "a JS bug threw a TypeError after a
successful response"** — both are `TypeError`s. Every fetch handler in
this file used to run its whole success path (parsing, rendering, state
updates) inside the SAME try block being classified this way, so a crash
like the one above was reported as "Could not reach the analysis
service" — which is exactly what sent the original cold-start
investigation chasing a connectivity problem that didn't exist. Fixed by
restructuring every fetch call site so `isTransportFailure` (the shared,
renamed version of this check) is applied ONLY to the fetch+parse+HTTP-
status step itself — never to anything that runs after a response was
already successfully received. Also hardened directly: `renderMeasurement
Consistency` and the loop-lattice comparison card now default missing
array fields to `[]` and missing `columns_considered` to a `"?"` display
rather than crashing or showing "undefined", so a genuine schema drift
degrades instead of breaking the page.

`tests/test_frontend_response_contract.py` is the backend-side guard
against this recurring: it drives the real `/propose-rois` → `/analyze-
multi` flow through a real fixture image and asserts that every field
the frontend reads *without* a defensive guard is actually present in
the response, so a schema change that would break the UI fails a test
before it ships, rather than surfacing as a live-site report again.

**A third symptom of the same stale-deployment root cause, confirmed
directly.** "Mark one repeat" failed with "Counting repeats failed (HTTP
405)" on both axes on the deploy preview — apparently never having
worked in production. Root cause: this app's local-dev-only catch-all
(`app.mount("/", StaticFiles(...))`, bottom of `backend/main.py`) only
accepts GET/HEAD, so ANY POST to a path with no matching route gets
exactly 405 from it — confirmed directly (`curl -X POST` to a made-up
path on this exact app returns 405; GET to the same path correctly
404s). That's the precise signature this bug showed. Reproduced the
real `/count-repeats` request against this repo's current backend code
three separate ways — a direct HTTP client, and an actual headless-
browser `fetch()` from the page as served locally — and all three
returned real match counts, not just a bare 200. The route is correct
and functional in the code this repo ships; the 405 on the live site
points at the same stale/older deployed backend as the two symptoms
above, not a bug fixable here. Cross-checked every other frontend→
backend call (`/health`, `/detect-ruler`, `/corrections`,
`/propose-rois`, `/analyze-multi`, `/corrections/export.{csv,json}`) the
same way — all dispatch correctly; nothing else shows this pattern in
the current code. `tests/test_frontend_route_contract.py` makes this an
ongoing, automated check rather than a one-time manual audit: every
frontend API call is asserted to dispatch to a real backend route
(never 404/405), so a route rename, a changed method, or a dropped
endpoint is caught by name before it ships — verified directly that it
fails with the exact "HTTP 405" signature when the route is renamed.

### How to tell what's actually deployed

All three symptoms above were diagnosed as "the live backend is running
older code than `main`" by ruling everything else out — never confirmed
directly, because this environment has no Render dashboard or log access
(outbound network to `onrender.com` is blocked by this session's egress
policy; every attempt to `curl` the live service from here fails at the
network layer, not with an HTTP error). That meant the actual fix —
getting Render to deploy current `main` — was something no session could
verify from in here, only reason about from the outside.

**`GET /version`** closes that gap: it reports exactly what commit the
running process was built from, so this stops being a guess.

```json
{
  "commit": "26f0577eadeccabe16eb5538fba05e3276b689f6",
  "commit_short": "26f0577",
  "branch": "main",
  "source": "render_env",
  "algorithm_version": "cv-v0.3",
  "app_version": "0.1.0"
}
```

- `source: "render_env"` means `commit`/`branch` came from Render's own
  `RENDER_GIT_COMMIT` / `RENDER_GIT_BRANCH` environment variables, which
  Render sets automatically on every service at deploy time — this is
  the authoritative case, and what you'll see on the real deployment.
- `source: "git_fallback"` means those env vars weren't set (a local
  `uvicorn` run, not Render) and `commit`/`branch` came from `git
  rev-parse` against the checkout instead.
- `source: "unavailable"` means neither worked — shouldn't happen on
  Render; would mean something unusual about how the instance was built.

**To check the live site:** open
`https://textile-gauge-reader-api.onrender.com/version` directly in a
browser (or `curl` it — from a machine that isn't this sandboxed
session). Compare `commit` against `git log -1 --format=%H origin/main`
in this repo. If they differ, the live site is stale, full stop — no
more inferring it from symptoms.

**Why it wasn't updating (three possible causes, in the order to check
them) and what fixes each:**

1. **Auto-Deploy is off for this service.** Render dashboard → the
   `textile-gauge-reader-api` service → **Settings** → **Build & Deploy**
   → **Auto-Deploy**. If it's off, pushes to `main` never trigger a
   redeploy at all — the fix is flipping it on (or clicking **Manual
   Deploy** → **Deploy latest commit** once, immediately).
2. **The service is tracking the wrong branch.** Same **Settings** →
   **Build & Deploy** page has a **Branch** field. This is a *dashboard*
   setting — a manually-created "Web Service" (README's Option B) has no
   connection to `render.yaml` at all, so nothing in this repo could ever
   have set it. If it's pointed at anything other than `main` (an old
   feature branch from before this repo settled on trunk-based `main`
   deploys, for instance), that fully explains months of "pushed to
   `main`, live site never changes" with zero errors anywhere — the
   deploy pipeline would be working exactly as configured, just against
   the wrong branch. Fix: change it to `main`.

   This repo's `render.yaml` now pins `branch: main` and
   `autoDeploy: true` explicitly, so a **fresh** Blueprint-created
   service reads the right branch from the repo instead of whatever was
   clicked by hand — but it does **not** retroactively fix an
   already-existing service. Blueprint settings apply on creation and on
   an explicit **Sync** from the Blueprint page in the dashboard (Render
   dashboard → the Blueprint, if this service was created as one → **Manual
   Sync**); a manually-created Web Service (Option B) never reads
   `render.yaml` at all, and its Branch field has to be changed by hand
   regardless. Check `/version`'s `branch` field to know which situation
   you're in.
3. **A build failed silently and Render kept serving the last good
   deploy.** Render dashboard → the service → **Events** (or **Logs**)
   tab shows every deploy attempt and its outcome. A failed build on
   `pip install -r requirements.txt` or the `uvicorn` start command would
   show as a red/failed event there, with the old deploy still live and
   answering `/health` normally the whole time — which is exactly
   consistent with "the banner says online but nothing changed." Fix
   depends on what the log says; if it's a dependency resolution failure
   or similar, that's a `requirements.txt` problem to fix and re-push.

None of this can be done from a repo change alone if the cause is (1) or
(3) — those are dashboard/account actions only reachable by logging into
Render directly. (2) is now partially addressed in-repo (see above) but
still needs the dashboard checked to know whether it actually applied.
**After making any of these changes, hit `/version` again to confirm the
`commit` field moved** — that's the only way to know the fix actually
took effect, rather than assuming it did because a button was clicked.

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

*(Both of these, plus the density-cross-check override, are instances of
the same underlying period-selection ambiguity — see "How ROI-dependent
is this, really?"'s "central finding" subsection, earlier in this
document, for the mechanical-sweep data tying them together.)*

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
