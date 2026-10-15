# The spine curve — F3-global: the curve editor wired to the petals' spine

*Session of Oct 15. Feature map §4 and §11 (Q4.1 / Q4.2 / Q4.4). Petals only, one global curve;
per-scope curves, sepals (Q4.3) and leaves (Q4.5) are later sessions. Read `docs/bloom-curve-editor.md`
for the widget and the value, and CLAUDE.md's petal curl family for `spineLaw`, C1 and the curvature
floor.*

## 1. The rulings it carries (not re-litigated)

| Ruling | Where it lives |
|---|---|
| A curl MODE choice: SLIDER (today, default, byte-identical by branch) / CURVE | `petalCurlMode` (registry, a CHOICE — out of the blanket sweep by construction, so `ALL MAX` is untouched); `curlIsCurve(state)` in the geometry |
| In CURVE mode the points draw the spine's SHAPE in the curl plane; curvature is DERIVED (Q4.1) | `petalSpineCurve` (registry, kind `curve`, spec `SPINE_CURVE_SPEC`); `spineCurveLaw()` in the geometry |
| In CURVE mode `petalSpineCurl`, `curlBias`, `curlStart`, the curl deltas and the variance curl term are HIDDEN and inert (Q4.2) | `PREDICATES.curlFromSlider` on every one of those rows; inert by ONE read in `petalForm` (`curlRad = 0` in CURVE mode) |
| A drag past printable curvature is REFUSED through the editor's validator — the point does not move. No clamp (Q4.4) | `spineCurveRefusal()`, the row's `validate`; the floor is `spineLaw`'s own |
| Points are fractions of the petal length, so the curve always fits the length slider | the editor's own rule; the law scales the drawn arc to the ASKED length |

## 2. The law — a curve arm BESIDE spineLaw's laws, never a second owner

`spineLaw({ ..., curve })` takes an optional `spineCurveLaw()` record. Its substep curvature is
`(Phi(u1) − Phi(u0)) / ds + curve.kappaAtMm(s_mid)` — the slider law's mean curvature over the substep
PLUS the drawn curve's own, piecewise constant along its arc. In CURVE mode the builder hands it curl 0,
bias 0, start 0 (so `Phi ≡ 0` and the spine IS the curve) together with the curve; in SLIDER mode it hands
`null` and every expression is the one it was. `spineLaw` stays the one owner of the spine: `at(s)`, the
frame, J8 and C1 read it unchanged.

**What the points mean.** Every coordinate is a fraction of the petal's ASKED length (`bladeAskedLengthMm`,
mode-free). The curve is sampled by `bloom-curve.js`'s own sampler (centripetal Catmull-Rom, the 2D-shape
arm — a hook is not a function of x; `single` mode, signed y, the first point pinned at the origin, the
last free). **The spine is the drawn curve scaled so its ARC LENGTH is the petal's**: `arcFrac` (the drawn
arc in fraction units) is the scale, and a curvature in fraction units becomes `κ · arcFrac / L_asked` in
1/mm. A longer petal draws the same shape larger and moves no stored number; a hook with a long drawn arc
is drawn smaller than the box suggests, the length slider still being the length.

**The start direction is the blade's.** J8 asserts the root chord at the tilt and "curl moves the TIP,
never the attachment" is the family's own contract, so the drawn curve is placed with its FIRST CHORD along
the blade direction — rotated by minus its own start angle, which the law reports (`startDeg`) and the
read-out tells. The editor's x axis therefore reads as "along the blade as tilted". *A decision made
without a ruling*: honouring the drawn start direction as a change of tilt would have put two controls on
one quantity (petalTilt stays live in CURVE mode) and failed J8 on every curve row.

**Curvature is per node, piecewise constant, and it is the ONE set of numbers the validator and the build
both read.** At each interior sample the turning angle between the two adjacent chords over their mean
length is that node's curvature; it holds between the two chord midpoints; the end half-chords take their
neighbour's; past the drawn arc (the drawn blade may run a nib's width past the asked length) the last
node's. `kappaAtMm(s)` returns exactly one of those doubles at any arc position and `peakKmm` is their
maximum. `spineLaw`'s clamp is `|kRaw| > kMax` on those same doubles, and `spineCurveRefusal` is
`peakKmm > 1 / floorRadius` — **one decision on one set of values**, so a curve the validator accepts cannot
build a clamped spine at the length and floor it was asked about. That is asserted (C1 (d)), not argued.
A sampled polyline's curvature is a property of the sampling; the density is `bloom-curve.js`'s own
(`CURVE_SAMPLES_PER_SPAN` 24) and both sides use it.

**The floor the validator asks about is the EXPORT mode's** — `ROLL_MIN_RADIUS_FACTOR × max(sheet,
MIN_FEATURE_MM)`, the stricter of the two. Live's floor radius is never larger, so a curve clear of it is
clear in both modes at the lengths given. The validator asks about **every asked length the build on screen
drew** (`ctx.askedLengthsMm`, handed in by bloom.js from the last build's `petalsAll` records): an inner
whorl is shorter and the same shape at a shorter length is tighter. A curve accepted on one whorl and then
made too tight by a later slider (more whorls, a smaller layer size) is **CLAMPED AND TOLD** exactly as the
modifiers are — the SPINE CURVE read-out line says `CLAMPED … a loaded curve asks under the floor; the
editor refuses such a drag`. The matrix carries that state deliberately (`SPINE CURVE: a LOADED curve UNDER
the floor`, and the limit curve on three whorls, whose inner whorls clamp at 1.200 mm).

**The hidden family is inert by one read.** `petalForm` reads `curlRad = 0` in CURVE mode, so every curl
delta the resolver composed into `ps.petalSpineCurl` (ALL, INNER, labellum, per-petal) and the form field's
curl term land on nothing; the record reports what the law was handed (`bias 0 / start 0 / curl 0`), and the
FORM VARIANCE read-out prints `curl INERT (the spine is the drawn curve)`. `petalFormIsFlat` has a
`!curlIsCurve` arm and the harness's `FORM_IDS` twin carries the same arm. **ONE read, and the mutant
table is what made it one**: the builder's `spineLaw` call first ALSO zeroed the curl in CURVE mode, so
`the-hidden-curl-controls-still-applied` (which restores the slider read in `petalForm`) applied its edit and
moved nothing — its witness reported the mutant's built turn equal to the clean tree's to every digit. Two
owners of an inertness is the fourth durable rule inside a guard: the second owner excused the first. The
builder now hands `form.curlRad` through verbatim (bias and start are zeroed at the builder because
`petalForm` never reads them), and the mutant fires.

**Sepals and leaves pin SLIDER** (`sepalBladeState`, `leafBladeState`): a sepal keeps its own slider twins
whatever the petals' mode; a leaf arch is a slider curl. Q4.3 / Q4.5 are their own sessions.

## 3. The page

- `petalCurlMode` ("Curl from") and `petalSpineCurve` ("Spine curve") sit in Petal curl, after Petal tilt.
  The editor is the curve-editor session's `makeCurveInput`, unchanged; its setter now takes a JSON string
  as well as the object (a matrix row, a gate or a file hands text; the page hands the object).
- The validator is the registry row's `validate(cand, ui, ctx)`; bloom.js passes `ctx.askedLengthsMm`
  from the last build's own records (the builder's `spine.askedLengthMm` on every petal built).
- The SPINE CURVE read-out line: points, drawn arc, start rotation, turn built, the inert family named, the
  tightest radius against the floor (CLAMPED told), nearest self-approach, SELF-CONTACT.
- **The drag rides F7's path.** A pointerdown on a live curve editor's svg arms `dragActive`; the editor's
  `input` events rebuild the drag-light geometry (infill cells dropped); its release ends the drag and
  pays the full build. The three slider lines the drag gate's mutants anchor on are untouched; the curve's
  listeners are their own. Measured (§7).

## 4. The gates

- **C1 gains a curve arm** (`curveSpineClauses` in the harness): (a) two statements of the mode — the
  record's `curveMode` against the CONTROL's `petalCurlMode`, both directions; (b) the hidden family inert
  in the record; (c) curve → curvature RESTATED from the control's points through `bloom-curve.js`'s
  sampler (`restatedSpineCurve` — the geometry's `spineCurveLaw` is not called), the law's record (peak,
  arc, start) agreeing, and `spineLaw` fed the restatement landing on the EMITTED rows to 1e-9 mm; (d)
  the record's `curveRefusal` — the PAGE module's own validator answer at this petal's asked length —
  accepted ⇒ not clamped in both modes, the bar restated at the export floor as a biconditional, and in
  EXPORT clamped ⇔ refused. **The refusal is recorded by the module that built the spine** so a gate holds
  "accepted ⇒ not clamped" against the one owner rather than a Node import the page never ran.
- **J8** reads the restated curve law for a curve ring's first-row direction (the slider arm is unchanged).
- **Z1** excludes a group's curl delta from the reachable set in CURVE mode and asserts it hidden.
- **FORM_IDS**' `wantsForm` carries the curve-mode arm.
- **applyConfig / fullStateDrift** compare a curve control as canonical JSON / `curveEquals`.
- **F8** (design-file gate): the live control round-trips a hooked spine in CURVE mode verbatim; an
  out-of-box spine is refused whole and told; the control is a curve field of the file. F1/F2 compare a
  curve through the registry's own `valuesEqual`.
- **Block 62** (twelve rows) and **smoke block 62** (four rows, the hook as anchor).
- **Five mutants** in the apex table, each witnessed on the MUTATED module's own spine record:
  `the-curve-is-ignored`, `a-refused-drag-clamps`, `curvature-taken-from-the-slider-in-curve-mode`,
  `the-hidden-curl-controls-still-applied`, `the-validator-and-the-build-disagree-on-the-floor`. The table
  now runs `curlAssertions` (it never did; C1-C3 were invisible to it by construction).
- **`verify-bloom-surface-bytes --movers-predicate curve`**: a row moves iff THIS tree builds it in CURVE
  mode.

## 5. Measured

[[MEASURED]]

## 6. Decisions made without a ruling (each named, each one place to undo)

1. **The start direction is laid along the blade** (§2) — `spineCurveLaw`'s `startDeg` and the law's own
   relative turn; undo is a rotation term in `spineLaw`'s curve arm and a J8 clause.
2. **The spine is the curve scaled to the petal's arc length**, not its chord — one line (`scale`) in
   `spineCurveLaw`.
3. **A curve made unprintable by a LATER slider is clamped and told**, never refused retroactively and never
   silently rebuilt — the modifiers' own treatment.
4. **The default curve** (`SPINE_CURVE_DEFAULT`: a gentle 14.6° bend) is a default, not a ruling.
5. **`petalCurlMode` and `petalSpineCurve` sit in Petal curl after Petal tilt** — a placement.

## 7. Drag cost

[[DRAG]]

## 8. Recorded, not fixed

- The validator's lengths are the LAST BUILD's; between a slider change and its build the list is a build
  behind. The gate's clause reads the builder's own answer at build time, so the matrix is not exposed to
  it; the page's drag is, for one frame.
- The drawn blade is a nib's width past the asked length on most rows; the curve law extends with its last
  node's curvature there, by construction.
- The combination gate's curl pairs are not re-run in CURVE mode (the pairs read `petalSpineCurl`, which is
  inert there); a curve pair is its own entry if wanted.
