# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Git + Netlify Workflow

- `main` is the stable production branch.
- Never develop directly on `main`.
- Before beginning new work, fetch the latest `main` and create/use a dedicated feature branch.
- Each project or experiment should remain isolated on its own feature branch.
- Open pull requests targeting `main` so Netlify can generate Deploy Previews.
- Do not merge any PR unless explicitly instructed to merge it.
- Do not push experimental work directly to `main`.
- Do not manually publish or trigger a production deployment unless explicitly requested.
- During iteration, changes are reviewed through the Netlify Deploy Preview associated with the PR.
- When a page has a dedicated route such as `/flower.html` or `/textile-gauge-reader.html`, provide the exact Deploy Preview page URL when possible.
- Production publishing may be locked in Netlify while work is being reviewed.
- If multiple finished feature branches are intended for one portfolio update, do not independently merge them to `main` — check first. A combined release branch / release PR may be wanted so the entire site updates in one production deployment.
- Never delete old branches without explicit approval.
- Before making branch-history changes, rebases, force pushes, or destructive Git operations, stop and ask first.

## Bloom generator — pointer only

**NAME THE MODE AND THE SAMPLING; DERIVE A LENGTH FROM A LENGTH** (Eva, session
32 — the durable rule, and the first thing to read before touching ROW PLACEMENT
or quoting any measured figure). *Every reported measurement names its MODE
(live or export) and its SAMPLING (the row count and the weighting), and any
constant standing for a PHYSICAL LENGTH is derived from that length rather than
from a ROW COUNT.* A row count is only a length under UNIFORM spacing, and this
project's spacing stopped being uniform when the turning ladder shipped. Five
defects in one session came from this single root, and they are not cosmetic —
two reached CI, one reached shipped source, and one changed TOPOLOGY rather than
geometry: the buckle's rows-per-cycle ceiling (a count standing for a spacing),
C1's `(i + 1) / n` station (an index standing for the builder's own `u`), the
self-contact flag's skip (a count standing for three sheet thicknesses), the
mode-dependent ladder (reading the LIVE floor, so the export split panels at a
different row), and `LADDER_ARC_SHARE`'s justification (live figures from a
scratch tree quoted as the shipped tree's). `bladeStations()`'s own header
carries this too, which is where four of the five lived. §18h of
`docs/bloom-session-32-outcome.md` has the table.

**A HARNESS ROW THAT EXERCISES A BRANCH MUST STATE WHICH BRANCH IT EXERCISES AND
ASSERT THAT IT STILL DOES** (Eva, session 35 — the second durable rule, beside the
mode/sampling one above, and it arrives from the same root). *A row chosen against a
row COUNT goes stale when the count changes, silently, because nothing in the harness
can tell that its chosen state has stopped reaching the code it was picked for.*
`verify-bloom-apex-mutants.mjs`'s `stations-not-increasing` row was pinned to
`petalTipShape 1` when it was chosen at **NU 28**; session 34 took NU to 56, and at 56
that is precisely the exponent where the turning ladder stops saturating — so the
de-duplication pass had nothing to do on that row, the mutation moved the ladder by
9.302e-6 mm at a station ABOVE `ROOT_BLEND_END` (outside what A7 asserts), the stations
stayed strictly increasing, and **the mutant was RED ON `main` naming a family that
fired nothing.** Swept at NU 56 over 9,072 buckled states: 2,232 move the ladder at all,
159 give a non-increasing pair, and the row nearest the shipped defaults is the
harness's own with the exponent simply left alone. **THE REMEDY IS THE WITNESS CLAUSE**
— every mutant declares a `witness`, a direct call on the MUTATED MODULE proving the
intended behaviour moved, run BEFORE the assertions are consulted and deliberately not
the assertion the mutant names (asking the gate whether the gate fired is the
circularity the table exists to avoid). Both sweeps carry it now, and both are proven
by controls that must fail: `--disarm=<id>` gives one mutant a stale anchor,
`--neuter=<id>` makes its edit apply while changing nothing. The witness immediately
found a defect in itself — its first version rebuilt the profile from a stub ring and
read stations **7.11e-2 mm** away from the builder's, a second producer of the profile
inside the instrument written to catch second producers — so every witness reads
`buildBloomInto`'s own report.

**EVERY PETAL SHELL IS WOUND OUTWARD NOW, THE ORIENTATION IS A GATE WITH ONE DECLARED
BASELINE, AND THE CENSUS IS A GATE WITH A 318-ROW XFAIL LIST MEASURED ON `main`** (session
36, Eva's ruling on session 35's two findings — read `docs/bloom-session-36-outcome.md`
before touching `emitPanel`, `tools/bloom-self-intersection.mjs` or the O/X families).
`emitPanel` emits each quad as `(a, d, c, b)` where it was `(a, b, c, d)`: the same
triangles as vertex SETS, each winding reversed. **"0 floats moved" is FALSE and must not
be claimed** — the vertex order within every petal facet and its exporter-derived normal
changed on every row with a petal; what is invariant is measured by `node
tools/verify-bloom-winding-bytes.mjs --base <worktree>` (72,666,576 triangles matched as
unordered sets, 653,999,184 coordinates `Object.is`-equal, 29,492 petal shells reversed,
9,234 other shells identical in order, per-triangle divergence terms exactly negated, shell
|volume| to 2.4e-14 relative — SUMMATION ORDER, not the bit). No frozen phase is owed
(frozen matrices pin definitions, never bytes) but EVERY frozen tag's STL bytes now differ
on every petal row. **O1/O2 ride in both STL gates**: every shell outward — the one
exception is the SPHERE head's inner sphere, inward BY DESIGN as the hollow's inner face,
declared and bounded — and volume sign agreeing with ray parity, the latter asserted only
where the row is not a declared self-intersector, because parity is undefined on a shell
that passes through itself (495 disagreeing shells on this tree, all on such rows, none on
a clean one). **X0/X1/X2 ride in the EXPORT gate only, on cost** (41.6 min over the matrix,
808 s on the deepest continuous corner). **The census reads the BUILDER'S DOUBLES and X0
proves they are the file's own** (`fround` of every double equals the STL's float): the
float32 bytes manufacture 196 span-0 touches on the flat default. **Two defects in the
census surfaced the first time it ran over the whole matrix**: its pair `Set` overflowed on
ALL MAX (canonical-cell rule now), and its COUNT DEPENDED ON THE WINDING (corners are read
in coordinate order now; identical on both trees). **THE ROOT BLEND IS NOT FIXED — its
brief with all measurements is §5 of that doc**, and its 138 rows are in the xfail list
by name; the fix is `footRing()`'s, never a blade-side correction. (The list holds three by-design overlaps the vertex-welded shell definition
cannot tell from a fold — every STYLE row at exactly 272, the lobed tips, and every CLEFT row —
named as such in the doc; and a sweep that applies control sets but not a row's `capability`
hook measures the cleft rows without their cleft, which the smoke gate caught.) **RECORDED FOR EVA, as
MEASURED rather than as the ruling phrased it**: one or two layers export free of
self-intersection at any petal count AT THE DEFAULT FORM (the petalCount sweep reads 0 on
every row); cup beyond about −0.2..0.3, buckle from 0.3×, roll from 270° and curl 360° fold
a single petal at ANY depth — the read-out's `ROOT BLEND AT N LAYERS` line says exactly
that, at three layers and up, and the panel gate's route (v) asserts it both ways.

**EVERY PETAL SHELL IS EMITTED INSIDE-OUT, AND SIX GATES PASS ON IT** (session 35,
corroborated independently against an exported STL). Per-shell signed volume: the hub
is POSITIVE and every petal is NEGATIVE — −3,827 mm³ on the shipping default, −20,480
at 40 continuous petals — confirmed by two methods that agree on all 29 shells (the
divergence theorem and a ray-parity test from each shell's largest facet). **The site
is `emitPanel`'s top-face winding** (`bloom-geometry.js:5152–5157`): the top skin is
offset along `+n` and all six triangles touching a top-skin point are wound AGAINST
`+n`, so the comment claiming "outward = +N side" is false and had never been checked.
It matters because the export contract relies on a slicer UNIONING overlapping closed
shells, and a union given a negative-volume shell can SUBTRACT it. Watertight,
connected, manifold, winding-consistent, degenerate-free and Euler characteristic ALL
pass unchanged on an inside-out solid. `node tools/bloom-self-intersection.mjs
--orientation` is the check, calibrated on a unit cube (+1 outward, −1 reversed) with a
positive control that reverses a real export and requires the verdict to move.

**AND THE ROOT BLEND SELF-INTERSECTS AT `layerCount >= 3`, AT THE DEFAULTS** (session
35). No cup, no buckle, no sweep: 0 pairs at 1 or 2 layers even with 40 petals, 72 at 3
layers, 416 at 4. It is a petal crossing ITSELF (within-shell), not foot crowding, and
it is **the short petals** — at 7×4 the innermost layer (reach 11.9 mm) has 43 pairs
per petal and the next (19.3 mm) has 9, while the two outer layers are clean.
`layerSize` shrinks the blade but the foot is set by the hub ring, so a short petal
collapses a full-width foot across `ROOT_BLEND_END` and folds. `layerSize` 0.90 takes
364 → 49; `petalTilt` 0 → 63; `footDelicacy` 0.25 → 595. **This is `footRing()`'s
boundary, deferred three times, now measured as a real self-intersection rather than a
chord statistic — and it means a multi-layer bloom is unprintable before any
deformation control is touched.** Do not judge a deformation feature's printability on
a multi-layer build until this is fixed.

**A READING TAKEN OUTSIDE THE REGION A FEATURE ACTS IN IS NOT EVIDENCE ABOUT THAT
FEATURE, HOWEVER WELL CALIBRATED IT IS ELSEWHERE** (Eva, session 35 — the third durable
rule, beside mode-and-sampling and the stale-harness-row one). Session 35 read the apex
sweep's printable ceiling off two curvature instruments that both exclude `u > 0.92`,
while the sweep acts at `u` 0.84–0.98. It stated that exclusion out loud and then drew
the conclusion anyway — *"the sweep never binds"* — which was wrong in the direction
that matters: `measureWall`, which reads emitted points rather than fitting a stencil,
shows the sweep taking self-approach from a passing 1.031 mm to a failing 0.733 on
`petalCup` 1.2 × `petalTipShape` 1.80. **Calibration is not coverage.** Before quoting
an instrument at a feature, check that its own window contains the region the feature
changes, and say so beside the number.

**A GATE CLAUSE NAMES WHERE ITS REFERENCE VALUE COMES FROM, AND THAT SOURCE IS INDEPENDENT
OF THE QUANTITY UNDER TEST** (Eva, session 39 — the fourth durable rule, beside
mode-and-sampling, the stale-harness-row one and calibration-is-not-coverage). *A clause
that reads its reference from the thing it is checking is entangled with it, and an
entangled clause does not measure the tree: it measures its own consistency.* A defect
inside the quantity moves BOTH sides together, so the clause holds while the geometry is
wrong; and noise inside the quantity moves both sides apart, so the clause fires while the
geometry is right. It breaks in both directions, which is why "the clause looked strict" is
never evidence about it. **THE TEST IS MECHANICAL: name the owner of the expected value and
the owner of the measured one, and if they are the same owner the clause is worth nothing.**
Rebuild the reference from OTHER owners (C1's discipline, JS5's, the seam gate's restated
one-line law), or read it off the EMITTED geometry, which no declaration can lie about.

Three instances, cited so the rule is checkable rather than remembered — and they did NOT
all surface the same way, which is itself the point:
  * **A8's first blend clause** (session 39, this file's `widest()` block below). It asked
    whether `blend < 1` implied the BUILDER's own raw widest gap exceeded the cap — and
    under `widest-counts-the-seam-offset` that raw gap IS `r[0]`, which does exceed the cap,
    so the defect handed over the number that excused it. Caught by re-reading the diff
    against the mutant that had just been written, before the table ran; the shipped clause
    reads the gap off the emitted stations instead.
  * **`seam-floor-removed`** (session 38). Every A7 clause checked the ladder against the
    DECLARED clearance, and a zero clearance is declared zero too, so the mutation that
    returns 0 fired NOTHING. **The mutant table was the only thing that said so** — and the
    remedy was the same one: the gate restates the one-line law and rebuilds the expected
    value from the two other owners, because importing `seamClearanceMm` there would mutate
    with it and check nothing.
  * **A7's `seamFrameResidual === 0`** (session 38, §9b(ii)). A difference of two cosines
    reached by two routes, asserted exactly equal — so the clause carried the two routes'
    disagreement rather than the geometry's. **This one failed the other way and CI is what
    found it**, red on `DOME LEAN: EVA_CONFIG x rise 1 x layerTilt 18` at ~1e-16 a ring,
    where the smoke subset holds no row on which the two routes diverge at all. The
    replacement is the same move a third time: compare two owners through ONE expression
    (`seamHalfThicknessMm()`, which then needs no tolerance) or bound their difference in
    the unit the quantity carries.

So the mutant table is the instrument that finds this class, not a guarantee against it:
it caught one of the three, CI caught one, and an adversarial read of the diff caught one.
**Write the clause so its reference has a different owner in the first place.**

**AND WATERTIGHT PLUS CONNECTED DOES NOT MEAN PRINTABLE — A SOLID CAN PASS THROUGH
ITSELF AND SATISFY BOTH** (session 35). `tools/bloom-self-intersection.mjs` is the
triangle-triangle census that tests it, WITHIN each closed shell (cross-shell overlaps
are the export contract's own "overlapping closed shells are fine" and are counted
separately — 4,720 of them on the flat default). Its adjacency exclusion is per
intersection POINT rather than per pair, so a pair that shares a vertex AND crosses
elsewhere is still reported; `--prove-exclusion` demonstrates that on a written-down
pair. **Calibration: the flat default reads exactly 0, a roll-330 fold reads 18,776.**
Getting there cost two epsilon defects, both the same class — an ABSOLUTE tolerance on
a determinant whose scale is a volume (flat read 27,356), then an ill-conditioned
barycentric solve that no epsilon can rescue and that had to be replaced by VERIFYING
the point (flat read 1,220). **THE FINDING: V4 and V5 pass at every cup value while the
solid self-intersects from cup 0.60 up** — 750 pairs at the shipped `petalTipShape`
1.70 with cup 1.20, at the apex, verified identical on a worktree of `main`. V5 is not
an over-strict proxy; it is blind to this. Sheet thickness and petal scale do not fix
it. Cost is 387 ms at 19,040 triangles, so the exact census needs no bound.

The Parametric Bloom (`bloom.html`, `bloom.js`, `bloom-geometry.js`,
`bloom-registry.js`) is a separate generator from the flower. Its governing
document is **`docs/bloom-charter.md`** — read it before touching any bloom
file; rules are stated there (and in the flower-project skill it references),
deliberately not repeated here. Its invariant is one connected watertight
solid, gated by `node tools/verify-bloom-export.mjs` (boundary edges = 0) and
`node tools/verify-bloom-connectedness.mjs` (voxel flood-fill, one region) —
both run in CI and both must pass before any bloom geometry change is done.
**Iterate on `node tools/bloom-smoke.mjs`** — a subset of the matrix rows through
the real export gate; `--conn` adds the
flood fill and is REQUIRED while a new geometry mode's junction assertions are
still being established.
**A FULL GATE IN CI WAS ~90 MINUTES AT `NU` 28, NOT ~44, AND SESSION 34 ROUGHLY
DOUBLED IT** (measured, session 32, from completed `bloom-export-watertight` runs
rather than from memory: over the nine successful NU-28 runs the spread is
**68.8 to 92.1 min, median 88.5** — session 32 quoted four of them at 91.5 / 90.9
/ 88.5 / 92.1, and the wider set is worth knowing because runner variance alone
is ±20 min). The long-standing "~44" was written when the matrix was roughly half
its size and is withdrawn; it had a session sizing a CI wait at half the real
figure and reporting "nearly done" four times over. **That "~44" was also a
LOCAL figure being compared against a CI one** — the smoke tool's speedup ratio
is measured on the dev machine, the gate runs on a GitHub runner after checkout,
npm install and a browser install, and the two are not the same measurement.
Never quote one at the other. **SESSION 34 TOOK `NU` 28 -> 56 AND THE GATE DID
NOT DOUBLE** — measured on the merged head `2ff8d89`, all seven jobs green:
`bloom-export-watertight` **111.1 min** and `bloom-connectedness` **57.7 min**.
So roughly doubling the petal triangles moved the export gate about 25% above
its NU-28 median and left connectedness BELOW its NU-28 self. The "it will
double" estimate this file carried was the safe read and it was wrong; per-row
browser and harness overhead, not triangle count, is what dominates. That is
still not a constant to plan against. **Size a CI waiter off `actions_list` on the
workflow's own recent completed runs, never off a number in this file** — the
matrix grows every session, so any figure written down here is stale by
construction. The smoke
subset is still the iteration instrument and is still minutes, not hours; what
changed is the thing it is being compared against. It is for iteration, never for merge: the full matrix
on both gates, in CI, is the merge criterion, and what the subset is BLIND to is
in that tool's own header. Do not also run the full matrix locally except at a
milestone (charter, "the iteration loop"). Note two of the six CI jobs on a bloom
PR are FLOWER gates (`'tools/**'` filtered), so "six verify jobs green" overstates
the bloom evidence — it is four.
**Frozen baselines are frozen at commits on `main`, never at a branch head, and
are tagged at freeze time** — `tools/publish-frozen-tags.sh` pins all sixteen
(`frozen/phase2`..`frozen/phase17`) so a branch delete or a force-push cannot
orphan one; phase10 is the case that produced the rule (charter, Sep 5).
**A FROZEN TAG PINS ROW DEFINITIONS, NOT BYTES** (Eva, Sep 6, session 24):
`--verify-frozen` imports the base tree's own `buildMatrix()` and deep-compares
row order, labels and set lists — it has never compared a byte. Byte identity is
proved per session by the RETENTION CLOSE against a worktree of the base commit,
and by nothing else. So **a session that moves frozen bytes must name in its
outcome doc which tag's bytes no longer reproduce**, with the row count, even
though that tag's definitions still do; a new phase is NOT owed for a byte move
alone. The first entry is session 24 — `frozen/phase17`, 8 of 507 rows.
Control-panel changes have their own gate: `node tools/verify-bloom-panel.mjs`
(every registry control renders exactly once in its declared section, a control
inside a collapsed section still reads, writes and rebuilds, every
predicate-gated control is asserted to APPEAR as well as to hide, a DERIVED
section label is read back against the slots the builder emitted, and no two
sections on screen share a name), with `--negative-control` required to fail on
all five routes. Its companion sheet is
`node tools/shot-bloom-panel.mjs <dir>` — the panel, not the canvas.
Arrangement changes have their own sheet too:
`node tools/shot-bloom-arrangement.mjs <dir>` — layers, placement and the
parked extremes. Zygomorphy has one as well:
`node tools/shot-bloom-zygomorphy.mjs <dir>` — the iris, face-on and in
profile, always beside the same bloom undifferentiated as the control — and
SLOT roles have their own: `node tools/shot-bloom-orchid.mjs <dir>` — the
labellum below, the hood above, FACE-ON as the headline (the reverse of the
iris sheet's order, on purpose), with session A's iris on it as a cell that
must be unmoved. The FAN placement has one too:
`node tools/shot-bloom-fan.mjs <dir>` — face-on with the mirror line drawn
(from a per-cell measurement, never a layout guess), the toggle's two
positions as a pair, a spacing sweep, and a radial bloom as the control.
PER-PETAL sliders have their own:
`node tools/shot-bloom-per-petal.mjs <dir> [base-tree]` — petal one called out
on the mirror line, a middle group against its neighbours, the extreme, and a
BEFORE/AFTER pair rendered from a git worktree of the base commit, because the
fan's slot roles were superseded and a removed capability is photographed
rather than only recorded.
DEPTH AND THE PRINT PREVIEW have one too:
`node tools/shot-bloom-depth.mjs <dir>` — the mum live beside print preview
on one camera, the depth cell at 4/5/6, the mum at six turns, the controls.
FOOT CROWDING has its own instrument and sheet, and it is a FLAG, not a gate
(Eva, Sep 3): `tools/bloom-crowding.mjs` measures how many feet stack on the
most crowded point of the base, in EXPORT mode, from `footRing()`'s own rings;
both STL gates print its line on every row and mark `CROWDED` at
`D_max >= 11` without failing. `node tools/shot-bloom-crowding.mjs <dir>` is
its sheet — the base from BELOW, cropped to the hub, the mum run beside the
ruled-clean blooms. **It is BLIND to blade-to-blade crowding above the root**
(the feet sit inside the hub slab; what the eye sees is the roots leaving the
ring, whose exit width IS the foot width) — that second instrument is
recorded, not built, and a clean D_max is a clean BASE, never a clean bloom.
The threshold was re-derived when the cap went to six and HELD at 11 (Eva,
Sep 3, confirmed from the depth sheet Sep 4: the depth cell at 4/5/6 reads
clean, the mum stays bad); D_max is resolved by a local fine pass
(`refineDepth()`) because the hub-pitch raster under-resolves a deep base.

**THE PRINT-PREVIEW TOGGLE IS VIEW CHROME, AND `shownMode()` IN bloom.js IS
THE ONE OWNER OF WHICH GEOMETRY IS ON SCREEN** (Eva, Sep 3, unparked).
`#printPreview` sits beside Auto-rotate: not a registry row, invisible to
`readUI()` and every gate's read-back. Checked, the viewport renders the
export-floored geometry; the STL handler never reads it (it builds from
`readUI()` alone) and the panel gate's route (i) proves the exports on either
side of the box byte-identical. `__bloomMetrics().liveTris` is NULL while the
preview is on — never an export count under a live label — and BOTH STL gates
fail the run if a row is measured with the preview on. Every canvas sheet's
caption carries `modeTag(m)` from the harness, read from the app's own
`shownMode`; a sheet that toggles captions from `shownTris`.

**DEPTH IS SIX, WITHOUT A CLAMP** (Eva, Sep 3). The ring-versus-foot-floor
formula the brief expected to cap depth does not hold (ring₀ grows with depth
through the area rule) and the collision it names is not a buildability limit
(every depth to eight exports watertight, one piece, all assertions clean).
A derived clamp was rejected: eleven reachable depth-2/3 states already sit
under the floor, three of them shipped gate rows — **a pre-existing fact found
by session 13, not damage it caused** — and a clamp would gate the state the
Aug 31 spread ruling made reachable. The read-out's `RINGS NARROWER THAN A
FOOT` line says where instead (footRing()'s `underFootFloor` / `crossesAxis`,
telemetry only; panel gate route (j), both directions). Raising the cap is
`MAX_LAYERS` plus the registry twin plus gate rows, and the crowding
threshold must be re-derived with it. `layerSize` stays capped at 0.90: in
CONTINUOUS mode 1.00 is mesh-clean (measured: 0 non-manifold) but J5 fires on
every continuous row there, so the cap is load-bearing for an instrument.

**THE HUB CAN BE A DOME, AND `headRise` IS THE WHORL PRIMITIVE'S `height`
ARGUMENT COMPLETED** (Eva, Sep 4). `headRise` (ARRANGEMENT, `role:
'arrangement'`, 0.00–1.00 of the hub radius, default 0) bends the junction
slab into a spherical cap through the rim; `footRing()` is the ONE OWNER of
the cap (`dome`: radius, apex, centre, the apex-floor clamp) and of every
ring's `z` / `slope` / `arc` / `relief`; `buildPetalInto` lays each foot ON the
cap (rows along the meridian arc, great-circle arcs across — the roll law at
the cap's radius), rotates the blade frame rigidly with it, and reads nothing
else; `buildHubInto` builds the slab as a SHELL of thickness t on the same
cap (3,456 triangles at any rise above 0 against 192 flat — the first
slider-dependent count here, a branch not a ramp). (`buildCenterInto`, which
seated the designed centre on the apex slab, is RETIRED — see the session-20
pointer below.) NOT derived from
crowding or depth: a metric consumed as a geometric input becomes a target;
the crowding instrument observes the geometry and is never an input to it.
Default 0 is byte-identical by the GUARD `domeIsFlat()` (every consumer's
pre-dome expression verbatim) with `domeGuardResidual` asserted exactly 0 by
both gates; the apex floor is one sheet thickness (asserted equal to the roll
floor's factor at module load) and binds on one reachable corner, where the
rise saturates and the read-out says "(CLAMPED)". The instruments: J1
re-derived to "each foot lies on the cap the owner declares, with its
normal" (the shipped J1 was INDISCRIMINATE, not blind — it asserted the flat
ruling and fired on right and wrong domes alike), J3 generalised to the hub
BUILDER's own sphere against the feet (the only witness for a flat hub under
lifted feet, which the voxel gate reads as one piece on every row), J8 the
root (the spine's first chord at tilt plus half its curl, in the foot's own
meridian plane — the only witness for a blade that did not rotate with its
foot, and silent on the curled incurve target until the chord clause
existed), and `tools/bloom-crowding.mjs` rasterising ON THE CAP's surface
(validated to the bit against the flat raster at rise 0) with the LOCAL
RELIEF at D_max printed beside the rim's. **The dome relieves the mum's
crowding, it does not fix it, and the read-out's HEAD RISE line says why:**
the cap's extra surface sits at the rim where the slope is steep, while a
tight bloom's feet stack at the inner rings where the cap is nearly flat —
the mum's peak sits at r 2.1–2.8 mm on a 4.69 mm hub, where a hemisphere's
local relief is 1.1–1.2x under a whole-annulus 2.0x, and it takes the mum from
D_max 11 to 9. The
panel gate's route (k) asserts the HEAD RISE line and the clamp in both
directions (the seat line went with the centre rig, session 20). The sheet is
`node tools/shot-bloom-dome.mjs <dir>` — the incurve target flat beside
domed, print preview ON, the base from a low profile at the rim and from
below, the mum flat / 0.50 / hemisphere, the two controls (the centre-seat
cells went with the centre rig, session 20).

**THE PETAL CURL FAMILY SHIPS AS SHEET GEOMETRY, AND ITS ONE WITNESS IS C1**
(Eva, Sep 4, session 16). `curlBias` / `curlStart` (PETAL CURL, hidden AND
inert at spine curl 0), `petalRollTaper` (PETAL FORM, hidden and inert at
roll 0) and `petalCupGradient` (PETAL FORM, the flower's "edge curve —
profile" renamed for what it is: a cup that grows toward the tip, 28% RMS off
the best-fitting cup) — see `docs/bloom-session-16-outcome.md`. Edge curve —
top-down was DECLINED as a second producer of the width profile. Bias and
start redistribute spine curl's total along the length through `spineLaw()`
in bloom-geometry.js, the ONE owner read by `buildPetalInto` and by the
gate's C1; a build with the controls wired and the spine still on the arc
is BIT-IDENTICAL to the un-biased bloom and passes both STL gates, J1–J9,
form, thickness and Z1–Z9 (Mutant A, measured), so C1 rebuilds the law in
the gate from OTHER owners and compares against the emitted rows. The spine
curvature is FLOORED at one sheet thickness of radius (the roll floor's
constant), full ranges, clamped, told: the read-out's SPINE CURL line prints
the tightest radius, "(CLAMPED …)" and the turn asked beside the turn built;
the flower's bias power 4 and start 0.95 are lace constants that saturate
over most of their range on a printed sheet. SELF-CONTACT (blade rows three
sheet thicknesses apart along the spine within one thickness, or the blade
against its own foot) is a FLAG, never a gate — it fires on the shipped hoop.
Curl start is floored at one blade row. **Crown closure on the incurve target
is EMERGENT** (curl 150 × tilt × domeLean landing tips within 0.3–1.3 mm of
the axis), never designed, no margin: `tools/bloom-plan-coverage.mjs` now
prints on every export-gate row and is ASSERTED on the two pinned incurve
rows only (0.0% uncovered, bald-cap ≤ 0.09 mm); a split whorl is a labelled,
loud skip. A non-default bias or start opening that crown is documented
behaviour (bias 0.5 re-opens 5.4%, start 0.95 23.1%), not a gate failure.
`phase13Matrix()` (469 rows at 6b8e94b) paid the baseline session 15 left
unfrozen. The sheet is `node tools/shot-bloom-curl.mjs <dir> [base-tree]`.

**THE HEAD IS A CAP OR A FULL SPHERE, AND THE SPHERE IS THE CONTINUOUS SPIRAL
RE-KEYED ON POLAR ANGLE** (Eva, Sep 5, session 18). `hubShape` (HEAD section,
CAP / SPHERE, default CAP) with `headRise` as the cap's own sub-control — two
values, not three, because a FLAT / DOMED / SPHERICAL enum would have moved
the 35 phase13 rows that pin `headRise` with no hub-shape value. SPHERE shows
under CONTINUOUS only and is hidden AND inert elsewhere (`PREDICATES.sphereMode`
and `sphereMode()` are the two statements; the harness checks them). `footRing()`'s
continuous arm keys the sphere's descriptors on polar angle (cos φ linear in
the slot index, 2/K a step — the equal-area lattice), Rd = R0 with the equator
on the flat hub's plane, the sequence from the RESERVED pole to the face pole,
lean 0 — **the SPHERE law, Q1b CLOSED from the sheet** (the faded lean is
costed in `docs/bloom-session-18-outcome.md`, not built, and does not carry forward). The hub is two concentric
spheres with an explicit apex fan at each pole — 6,720 triangles, the third
value of a branch that was two. S1–S4 in both gates: equal-area pole to pole,
the hub CLOSED iff declared (from the builder's own report), the reserved pole
clear of feet AND within one step (both directions), the rise inert under
SPHERE. J5 steps in polar angle there, J6 is nulled with a clause, J9 wants
lean 0. **Plan coverage cannot read a sphere** (the far hemisphere projects
into the disc from below — a false clean): SPHERE rows are a labelled skip and
the export gate FAILS if one emits a number. **The solid-angle instrument is
`tools/bloom-solid-angle-coverage.mjs` (session 19)** — a SIBLING of the plan raster,
rays from `footRing()`'s own sphere centre, WIRED into the export gate on Eva's ruling:
its line on every row, ASSERTED on the four block-22 rows that declare `solidCoverage`
(the incurve sphere's face pole closed and its reserved-pole hole pinned at its measured
0.95 mm with headroom; the reserved pole closed on the defaults, the mum and the 240-foot
row), a sphere row it skips a validity failure. **R5 — the parallel-ray identity against
the plan raster, exact, on every row including flat ones — is its validity standard; R6
calibrates the measure in closed form once per run; the "mapped through the sphere"
comparison is ILL-POSED (two ray families, coinciding only on the axis) and is never a
check** (`docs/bloom-session-19-outcome.md`). The plan raster's own sphere skip stays. The crowding raster evaluates membership in (arc, azimuth) over
the full arc on a sphere and prints the depth within one step of each pole.
Under SPHERE the DISC centre plated the face pole (a 24.5 mm RADIUS, 49 mm
across, on the 240-foot row) — the plate is gone with the centre rig (session 20) and the
face pole's open region (2.58 sr on that row) is B2's number. Sheet: `node tools/shot-bloom-sphere.mjs <dir>`. #106 and #108 are FLOWER
issues, whatever a kickoff prompt says.

**THE CENTRE RIG IS RETIRED AND THE DEFAULT IS A BARE APEX** (Eva, Sep 5, session 20,
phase 2 B1). `centerStyle` (NONE / DOME / DISC / RING, DISC the default since Aug 31), its
four sub-sliders, the CENTER section and `buildCenterInto` with its three builders are gone:
the centre is the reproductive parts and nothing else (androecium and gynoecium, phase 2 B2,
each independently present or absent, hidden AND INERT under SPHERE); DISC and DOME were
placeholders for a surface (HEAD's) and for covering the junction (the junction's, never a
control); RING was a torus standing in for a CORONA, which is a flared collar between petals
and stamens and will be its own group — the name is reserved, the object is not. The five
ids are the first entries in `RETIRED_IDS` (`bloom-registry.js`), each with a `retiredAt`
session and a `why`; `verifySections()` fails module load on a collision with a live id, an
option value, a DEFAULTS key or a section id, and the panel gate's route (n) fails CI if a
retired id renders, is named on the read-out's summary line, is a `__bloomMetrics()` key, or
survives as an IDENTIFIER in executable bloom source (LITERALS exempt — strings, template
TEXT and regex bodies; the frozen matrices name them as row data — while a `${…}`
interpolation IS code and is scanned).
**THAT SCANNER IS A CHARACTER WALK, NOT A REGEX CHAIN** (session 25, `928e13e`): the five
regexes that stood there could not see nesting, matched the GAPS between literals rather
than the literals, hid 45% of the source they scanned and reported real hits thousands of
lines from where they live — and an apostrophe inside a template literal then produced 48
false hits (charter, session 25; sessions 22 and 24 each reworded assertion messages around
it). Apostrophes in assertion messages are ordinary English again. The walk blanks literals
IN PLACE keeping newlines, so `file:line` is exact and a hit quotes its own line; it asserts
per file that it can vouch for what it read (same length, same line count, nothing left
open) and FAILS the gate rather than scanning in an unknown state; and it is checked against
twenty written-down cases which were themselves checked against seven mutations of the walk.
Its coverage is still its printed FILE LIST. A ruled aesthetic retirement that moves the default is an
EXACT PARTITION, predeclared: on `phase15Matrix()` (527 rows at 8524318) 509 move and 18
hold, and the moved rows cannot be re-exported on the new tree, so the close is the
THREE-CAPTURE construction in `tools/diff-bloom-bytes.mjs`'s retirement mode (old plain, old
with `--override centerStyle=NONE`, new with `--strip`, `--compare … --retirement … --expect
509/18`) with five vacuity guards — `docs/bloom-session-20-outcome.md`. The sheet is
`node tools/shot-bloom-centre-retirement.mjs <dir> [base-tree]`: the bare apex beside
today's DISC, rendered from a worktree of the base.

**THE ANDROECIUM IS BUILT AND SHIPS ABSENT** (Eva's Phase A rulings, session 21, phase 2
B2). `stamenCount` (ANDROECIUM section, 0–120, default 0) with `stamenLayout` (RING — the
shipped RADIAL law — or the VOGEL DISC, r ∝ √i at the golden angle), `stamenSpread` (a
MULTIPLIER on the filaments' OWN area rule, clamped at the hub radius less a filament radius
and told), `stamenLength` and `stamenCurl`. The filament is ONE SHEET THICK (floored with the
sheet at export) and rooted THROUGH the slab on the owner's normal; the anther is the PILL,
one shape, two constants (`ANTHER_DIAMETER_FACTOR` 1.6, `ANTHER_LENGTH_FACTOR` 2.5), never a
control — **A2 BILOBED is retired from the candidate set permanently.** `fr.androecium` is
`footRing()`'s SECOND descriptor kind, sharing the dome object and `surfaceAt()` (the ring
map's own surface law, extracted verbatim) — builders read it and compute nothing;
`buildStamenInto` runs `spineLaw()` at TILT 0 so the straight rod is the law's own
zero-curvature branch. **HIDDEN AND INERT UNDER SPHERE** — `androeciumEligible()` and
`PREDICATES.androeciumEligible` are the two statements, checked at harness load, per row
(JS0) and by GATED rows. **JS1–JS4 in both STL gates** (`stamenAssertions()`), each fired on
a mutant: both gates are BLIND to a filament rooted off the normal, a stamen off the hub, a
hairline root or a stamen never built (every tube and pill is its own closed solid). **Head
rise does not relieve the root packing and does unfuse the anthers — by splaying the
filaments (the nearest anthers on the 120-disc go 1.16 → 4.39 mm flat to hemisphere while
the roots move 0.3%): on a bloom with an androecium, Head rise IS the stamen splay.**
SLENDERNESS (L/d, floored diameter) is on every row, verbatim `UNMEASURED — no coupon has
been printed`; ROOTS FUSE / ANTHERS TOUCH / the petal-root ANNULUS count are FLAGS. B2b owns
the crowding-raster extensions and the anther-against-blade instrument (the stopping rule
fired at the line). Read `docs/bloom-session-21-outcome.md` before touching any of it. The
sheet is `node tools/shot-bloom-androecium.mjs <dir>`. **`stamenSpread` is 0.60–6.00 and the
dead travel above where it saturates is TOLD, not trimmed** (Eva, Sep 6): saturation is
`(hub − r) / (r √N)` — 1.25 at 120 stamens on the shipping hub, 13.7 at one, 123 on the
largest hub — so no static range is dead-free; the CLAMPED clause prints the number and the
panel gate asserts it. **R1 in both coverage instruments counts the stamens through a third
accumulator that EMITS** (it calls the same builder), so it sees the orchestration — a
stamen emitted twice, recorded once, is R1's (measured red) and a defect inside the builder
is JS3/JS4's. `phase16Matrix()` is the 481 rows at `a65d16d`, the first post-retirement
baseline (a plain capture per tree closes the next session). An independent stamen SPLAY is
proposed and costed for B2b in the outcome doc; today Head rise is the only splay.

**THE GYNOECIUM IS BUILT AND SHIPS ABSENT; THE CENTRE IS COMPLETE** (Eva's rulings,
session 22, phase 2 B3). `gynoecium` (GYNOECIUM section, a CHOICE: NONE / STYLE, default NONE
— one style or none, never a count) with `styleLength` (5–40 mm, default 25) and `styleCurl`
(−180..180°, default 0), both hidden AND inert at NONE. The style is `footRing()`'s THIRD
descriptor kind (`fr.gynoecium`): count 1, radius 0, ON THE AXIS, reading `surfaceAt(0)` —
the apex, where every cap's normal is exactly +z — and sharing the dome object with the rings
and the androecium. It is ONE SHEET THICK (floored with the sheet at export, the filament's
own rule) and rooted THROUGH the slab; `rodInto()` is the one rod both `buildStamenInto` and
`buildStyleInto` call (spineLaw() at TILT 0, curl 0 the identity), `pillInto()` the one pill —
both EXTRACTED VERBATIM from the stamen builder, and the block-23 rows on both trees are what
measure that the stamens' bytes did not move. **The stigma is S2 TRIFID, FIXED** — three
pills of the anther's own proportion (`ANTHER_DIAMETER_FACTOR` across the style,
`ANTHER_LENGTH_FACTOR` long) sharing the style's tip at `STIGMA_LOBE_SPREAD_DEG` (40°), a
third of a turn apart; S4 BILOBED is retired from the candidate set permanently, S3 PAD is a
later value addition, S1 KNOB is dropped. **HIDDEN AND INERT UNDER SPHERE** —
`gynoeciumEligible()` and `PREDICATES.gynoeciumEligible` are the two statements, checked at
harness load, per row (JG0) and by GATED rows (the style at maximum under SPHERE, the WHOLE
centre at maximum under SPHERE, the sub-controls at maximum with NONE). **JG1–JG4 in both STL
gates** (`gynoeciumAssertions()`), each fired on a mutant: both gates are BLIND to a style off
the axis or off the normal, a hairline root, a dropped lobe and a lobe off the trifid's law
(every rod and lobe is its own closed solid). The STYLE line says where the stigma's top
stands against the highest anther (ABOVE / BELOW, in mm), the WIDER THAN THE HUB corner and
the petal-root annulus are FLAGS, and the style joins the SLENDERNESS line (`filament N ·
style N`), verbatim `UNMEASURED — no coupon has been printed`. **R1 in both coverage
instruments counts the style in the centre's accumulator and its blindness is declared in
their own headers:** R1 sees the ORCHESTRATION of parts, never a defect inside a builder,
because the check shares the builder. `phase17Matrix()` is the 507 rows at `6335ac4`. The
four-state matrix (androecium × gynoecium, present × absent) is block 24's first rows and the
sheet's first row: `node tools/shot-bloom-gynoecium.mjs <dir>`. Read
`docs/bloom-session-22-outcome.md` before touching any of it. **The shipping default is still
the bare apex; moving it to a present centre is proposed with numbers there as its own
partition event and waits on Eva's ruling.** B2b (the crowding-raster extensions, the
independent splay) stays parked.

**THE CENTRE IS ONE SECTION, A CONTAINER, AND THE PANEL SAYS WHAT OFF MEANS** (Eva's rulings,
session 23, from the brief). `center` (label "Center") sits directly below HEAD and holds
ANDROECIUM and GYNOECIUM as nested drop-downs — the "Petal roles" shape: a parent with no
control of its own, hidden when and only when both parts are (under SPHERE), by the derived
rule every section already obeys. **No value, no NONE**: "no centre" is both parts off, already
reachable, and a NONE on the container would be a second definition of one state. The two
parts' read-outs SAY that turning a part off keeps its settings, with the kept values (`none —
its settings are kept (ring, spread 2.00x, 20 mm, curl 0°) and return with the count`); the
sub-controls stay hidden AND inert — not a mute. **The stamen spread's dead travel is shown ON
the control**: the row declares `cap`, the app's `applyCaps()` draws footRing()'s own
`saturation` as a tick on the track with the dead travel hatched and prints it in the
read-out (`fmt`'s third argument is the SHOWN build's record); the range is NOT narrowed and
the max is NOT adaptive. **The FILAMENT-AGAINST-STYLE flag** is on the STAMENS line — the
nearest approach of any filament's free station to the style's centreline below the stigma
(the builder's own `stations`, computed AFTER every solid is emitted), against one filament
plus one style radius; never a gate, and both STL gates stay blind to it by design. It also
sees what session 22's law table did not ask: a Vogel disc's innermost stamen stands inside
the style's tube at the root — ruled an OPEN PLACEMENT QUESTION for the next session (index
past zero, or a radius floor), not a defect (Eva, Sep 6). The panel gate carries all of it (route (q)'s clauses in (o)
and (p), route (r) for the flag's own witness, the path route admitting a child's control as
a control-less container's witness, route (n)(i) now "the container holds no control of its
own"); the sheet is `node tools/shot-bloom-panel.mjs <dir> [base-tree]`, whose fifth sheet is
the BEFORE/AFTER pairs from a worktree of fd291b4. **0 moved, no new frozen phase**: no row
added, no byte moved, phase17 stays the newest baseline — the session 18/19 case, not the
last three sessions'. `docs/bloom-session-23-outcome.md` has the numbers. B2b's other
instruments (the crowding-raster extensions, anther-against-blade, the independent splay)
stay parked.

**THE VOGEL DISC STARTS AT `rFil + rSty`, ALWAYS, AND THAT IS THE FLAG'S OWN THRESHOLD**
(Eva's ruling, Sep 6, session 24 — session 23's open placement question, closed). The disc had
no inner limit, so its innermost stamen stood at `rFil * spread / sqrt(2)` — **0.85 mm on every
UNCLAMPED disc at ANY count** (the N cancels: `R = rFil sqrt(N) spread` and `r_0 = R sqrt(0.5/N)`),
0.53 mm on the clamped 120 — inside a style, so FILAMENT AGAINST STYLE fired at the ROOT on every
disc setting. `partRadius` (`thickness / 2`) in footRing() is now the ONE OWNER of the parts'
radius: the androecium's `rFil`, the gynoecium's `rSty` and the disc's `innerLimit` are all it,
and `buildBloomInto`'s flag READS the limit instead of re-deriving it. The law is the equal-area
law RE-BASED ON THE ANNULUS `[inner, R]` instead of the disc `[0, R]` — "start the index past
zero" with the integer rounded away: every annulus keeps exactly the same area (measured spread
3.6e-14 mm² across 120) and, unlike an integer offset, it is CONTINUOUS in R so the spread slider
never jumps. **Flooring each radius was measured and REJECTED**: it takes the 120-disc's closest
pair of roots from 1.164 mm to 0.991 mm — deeper into the ROOTS FUSE flag it was meant to relieve
— where the annulus law takes it to 1.233 mm and CLEARS it. ALWAYS, not only with a style
present: a limit that existed only with a style would make turning the style on move every
stamen, the coupling session 22 ruled against. NO ROOM (the disc inside the limit) is told, never
refused, and `innerUsed` / `noRoom` are NULL under RING because the limit is the DISC's law —
**JS5 in both STL gates asserts that biconditional in both directions**, rebuilding the limit from
the SLAB rather than from the descriptor (C1's discipline) and asserting equal area as its own
property of the emitted radii. Both STL gates are BLIND to a disc that starts on the axis. The
sheet is `node tools/shot-bloom-inner-limit.mjs <dir> [base-tree]` — the disc from ABOVE, with and
without, at 6 / 30 / 120, the fuse row, the NO-ROOM corner and a RING control that must not move.
**11 live rows and 8 phase17 rows moved; no row added, so no new frozen phase** —
`docs/bloom-session-24-outcome.md` names phase17 as the tag whose bytes no longer reproduce.
**THE PARAMETRIC TIP'S EIGHT RULINGS LIVE IN THAT SAME DOC** (Eva, Sep 6, from the discovery
sheet) and are the brief for sessions 2, 3 and 4 — the one-exponent outline law, the Rodrigues
frame with no guard, the elongation floor, no self-intersection instrument (bound the ranges
instead), two-level panel nesting with the rows generated from one table, and `size` as a real
slider superseding `ANTHER_DIAMETER_FACTOR`. Read them there rather than re-deriving them.

**`tipInto` IS THE ONE OWNER OF A TIP'S GEOMETRY, AND `pillInto` IS RETIRED INTO IT** (session
26 — sessions 3 and 4 of the tip plan are the sliders; this one shipped ZERO CONTROLS). An
anther is ONE tip, the trifid stigma is THREE, and both go through one emitter. **The outline
law is in with its parameters hard-wired at today's equivalents** (`TIP_SHAPE`: roundedness 1,
sharpness 2, lobes 4 — the circle twice over), and roundedness 1 makes the blend `1 + 0 * h`,
which is EXACTLY 1 in IEEE-754, so `r * f === r` and the pill's radius arithmetic is untouched.
**The frame is RODRIGUES with no guard, parameterised by the ANGLES rather than by two
vectors** — that is what makes the identity exact at spread 0 (`cos 0` is exactly 1, `1 − cos 0`
exactly 0) where a `D × L` axis would normalise a zero vector and put `D · L` on the frame.
**The anther is byte-identical: 0 of 3,183,552 floats over seven corners in live and export,
compared with `Object.is` so `-0` is distinguished** — `node tools/verify-bloom-tip-bytes.mjs
--base <worktree>` is the instrument, and it REFUSES a vacuous run (the trifid rows must move).
The trifid moved **17 live rows, 0 frozen** — no frozen matrix names a gynoecium control, so
**no tag's bytes stop reproducing** and session 24's phase17 note is still the only one. The
move is **0.047 mm of SURFACE** (the emitted 10-gon's sagitta, `a(1 − cos 18°)`, scaling with
the sheet) against **1.855 mm of VERTEX displacement** — two different claims, both measured.
`STAMEN_TRIS` and `STYLE_TRIS` are retired into **`tippedRodTris(lumps)`**, called by JS4 with 1
and by JG4 with the count the owner declares. **JS6 and JG5** are the only witnesses for any of
it: a tip rolled on its own axis exports watertight, one piece, at an identical triangle count
and STL byte length. The sheet is `node tools/shot-bloom-tip.mjs <dir> [base-tree]` — every cell
carries its own mm per pixel and every pair a measured pixel difference, because "is 0.047 mm
visible" is Eva's ruling to make and should be made in front of a number.

**THE PANEL MAY NEST TO ANY DEPTH, AND WHAT REPLACED THE BOUND IS AN ORDERING CHECK NOBODY
HAD** (session 27, tip plan 3a — Eva's Q7, first half). `verifySections()`'s "the panel is one
level deep" refusal is gone. Its stated reason was WRONG about the census and right about two
other expressions, re-read from source: `applyVisibility()`'s backwards walk, its `childrenOf`
map, the gate's `ancestorsOf` while loop, the census (`querySelectorAll('details')` is document
order — a pre-order walk at any depth — compared against the SECTIONS array) and
`wantSectionHidden()` (which reads each child's OWN answer rather than re-deriving it) were all
depth-general already; the panel gate's **witness-through-a-child** test and its **on-screen
filter** were not, and both are now, PINNED to the answers they replace on this tree (22 states,
0 disagreements). **The real cost was a check that was owed:** `verifySections()` never checked
that a parent is DECLARED BEFORE its child, which every one of those instruments needs — and
`bloom.js`'s comment claimed it did, so a child declared before its parent passed the registry
and threw at panel build. The precedence check is strictly stronger than the depth refusal: a
parent cycle and a self-parent are unreachable too. **Route (s)** in the panel gate carries it
on WRITTEN-DOWN section arrays — three levels ACCEPTED; child-before-parent, a cycle, a
self-parent and a missing parent each REFUSED — four must-fails that run on EVERY invocation
rather than only under `--negative-control`, because the live tree is two levels and a wrong
answer about depth 3 is unobservable on it. Route (a) also compares the tree AS BUILT (each
section's real ancestor and its count of enclosing `<details>`) against the tree as declared.
**A third level is legal and has NO CSS:** `bl-sec--sub` is "nested at all", not "nested at
depth k" — one rule in `bloom.css`, owed by whoever declares one.
**THE GENERATED DESCRIPTOR TABLE IS DEFERRED TO 3b, AND THE MECHANISM IS NOT NEW:** the
per-petal block in `bloom-registry.js` already is it — 4 descriptors x 9 instances = 36
controls and 9 sections, one distinct spec per suffix (measured). "Instanced TWICE" is not
reachable until **session 4** (3 is the anther's seven controls, 4 the stigma's), and neither
`labellum*`/`hood*` (5 against 3) nor `all*`/`inner*` (label, `fmt` and `visibleWhen` all
per-instance) is an honest pair to migrate. What 3a shipped instead is the guard that ruling
needs and that has an instance today: **instanced descriptor families share one spec** in the
panel gate — fields that ARE shared (kind, bounds, step, default, label, tier, role), never
`fmt` / `section` / `visibleWhen`, which are per-instance by design. 3b adds one row to it.
**THE SMOKE GATE'S FAMILY LIST IS READ OUT OF THE ASSERTIONS, AND IT WAS SHORT BY FIVE**
(session 27). `tools/bloom-smoke.mjs`'s blocks 22-24 used to name "the families that need a
witness" as a hand-written sentence; CLAUSE C now scans the assertion SITES in
`tools/bloom-harness.mjs` (`bad.push(\`J2: …\`)` plus `tipClauses('JG5', …)`, whose tag its
CALLER names — JG5 is pushed nowhere else) and checks a BICONDITIONAL against what the rows'
`path` fields claim. It fired on **JS0, JG0, C3, J2 and Z2**; three had never been reported,
and **Z2 was hidden by a range — `Z1-Z3` names its ends and hides its middle, so never write
one.** 39 families, all 39 claimed; `node tools/bloom-smoke.mjs --check --negative-control`
renames JS5 to JS99 in a COPY of the harness source and requires both directions to fire, and
it runs in CI. **The `R` namespace is OUT by name, for correctness rather than scope:** three
instruments each own an R1 (`crowding R1:` / `coverage R1:` / `solid R1:`) and the paths cite a
bare `R1`, and `R0` in a path is usually the geometry's own ring-zero notation. **Hole 5 is
NARROWED, NOT CLOSED** — a citation is a claim about the PATH a row engages, never evidence the
assertion can FIRE there; re-run the mutant table when a family is added.
**"0 MOVED" IS A CONSTRUCTION AND HAS ITS OWN INSTRUMENT:**
`node tools/verify-bloom-presentation-only.mjs --base <worktree> [--also a,b]` (session 27).
Predeclared files by sha256 with `bloom-geometry.js` at the head, all 528 matrix rows
deep-equal, the registry's data deep-equal with **functions serialised to their SOURCE**
(`JSON.stringify` drops them silently, which would make the strongest-looking clause the
emptiest), and every `fmt` EVALUATED across its whole range — because a function closing over a
moved constant has identical source. Run against `2fee2c2` it FAILS on `bloom-geometry.js` and
the harness while passing clauses 2-4, which is the correct reading of session 26. **It is not
a byte diff and never replaces one** — a session that moves bytes on purpose still owes
`tools/diff-bloom-bytes.mjs` and a predeclared partition. **It does not run in CI**, because it
takes a worktree of the BASE COMMIT and which commit a session claims to have moved nothing
since is the session's to name: run it at the close and quote its output.

**THE ANTHER'S SEVEN SHIP, AND THE TIP'S LATTICE IS DERIVED FROM ITS OUTLINE** (session 29,
tip plan 3b — read `docs/bloom-session-29-outcome.md` before touching any of it). `antherSize`,
`antherElongation`, `antherRoundedness`, `antherPoints`, `antherSharpness`, `antherLumps` and
`antherSpread`, in a **Tip** drop-down inside Androecium — the panel's first THIRD LEVEL, whose
CSS is now paid as a descendant selector in `bloom.css`. **AUTHORED PLAINLY, NO GENERATOR:**
Q7's one-table instancing is session 30, where a second instance makes "they cannot drift"
observable. **0 moved is a CONSTRUCTION:** size and elongation default to
`ANTHER_DIAMETER_FACTOR` / `ANTHER_LENGTH_FACTOR` themselves (imported by the registry, asserted
at harness load) and the two products keep the constants' own ORDER, because `(e * s) * d` is not
`e * (s * d)`; roundedness 1 makes the blend exactly 1; one lobe at spread 0 is the Rodrigues
identity. **`tipSides(shape)` is the tip's one lattice owner and `revolveInto` reads it off the
OUTLINE ARRAY'S LENGTH** — forced, not chosen: the law's extrema sit at 2n azimuths and ten
samples hit all of them at n = 5 and NO other point count, so a fixed 10-gon would make
`antherPoints` a control that tells the truth once in eleven values. The circle arm
(`STAMEN_SIDES` at roundedness exactly 1) is what makes points and sharpness **INERT rather than
merely hidden**, and JS7 measures that at the opposite corner of both. **Cost, from
`tippedRodTris(lumps, sides)`: 560 triangles per stamen today, 3,240 at six lobes on 24 sides;
the worst reachable androecium is 388,800 against 67,200 — reported, not clamped.** **The
sharpness floor bounds the WAIST (`R_min = MIN_FEATURE_MM / 2 = 0.50 mm`, `UNMEASURED — no coupon
has been printed` verbatim), NEVER the point's included angle** — full range, clamped, told,
three corners none refused. **Q6 is discharged by the BOUND, never an instrument:** the registry
IMPORTS `TIP_*_RANGE` and the harness fails at module load if that became a literal. Two corners
are told rather than refused: two lobes at spread 0 are COINCIDENT (duplicate geometry), one lobe
above 0 LEANS (so spread is NOT gated on the count). **JS7 is the new family** — JS4 and JS6 ask
what was emitted, and a tip built perfectly from the WRONG SEVEN passes both. The sheet is
`node tools/shot-bloom-anther.mjs <dir> [base-tree]` — the corners and the middle at six stamens
and at 120, three scales, mm-per-pixel on every cell, **a same-tree renderer control on every
row**, and the INERT row held by two EXACT claims (its triangle count and its whole ANTHER
read-out line, character for character) plus a MACRO-only pixel bound at the two rows' own
measured controls — pixel-identity was tried and is false, see the noise-floor section above. `frozen/phase18` is the 528 rows
at `cb798f6` (a phase IS owed: block 25 takes the matrix to 549).
**THE STIGMA'S SEVEN SHIP FROM ONE TABLE, AND THE TWO TIPS CANNOT DRIFT BECAUSE THEY ARE NOT
WRITTEN TWICE** (session 30, tip plan 4 — read `docs/bloom-session-30-outcome.md` before touching
any of it). `TIP_DESCRIPTORS` (seven specs, authored once) × `TIP_INSTANCES` (what varies: prefix,
section, presence predicate, words, and the two per-instance defaults `Lumps` / `Spread`) →
`tipControls(instance)` → fourteen rows: `anther*` in `antherTip` ("Anther", inside Androecium —
session 29's `tip` renamed) and `stigma*` in `stigmaTip` ("Stigma", inside Gynoecium), each
section declared IN RENDER ORDER after its parent. **`tipDescriptor(state, prefix, diameter)` in
bloom-geometry.js is the ONE owner of the seven becoming a tip**, called twice by `footRing()`;
`TIP_SHAPE` / `TIP_SHARPNESS` are retired and `STIGMA_LOBES` / `STIGMA_LOBE_SPREAD_DEG` are the
stigma's count and spread DEFAULTS. **`tipSevenClauses(tag, …)` is the one witness, called as JS7
on the anther and JG6 on the stigma's lobe** (JG6 is the new family — 41 in the census); JG4 reads
the descriptor rather than constants and its shared-apex clause is a biconditional with
`lumpsCoincident`. **THE ANTI-DRIFT WITNESS IS THE PANEL GATE'S ONE-SPEC CLAUSE ON THE TIP FAMILY,
with `default` per-instance ONLY on Lumps and Spread, stated in the gate rather than read from the
table, and its `--negative-control` drifts `stigmaSize.max` in a copy of the rows and requires it
to fire** (measured: it does). **THE STIGMA'S SHARPNESS DEFAULT IS 1.00 BY RE-DERIVATION, NOT BY
COPY, and the brief's premise that a lobe is a different size was CHECKED AND IS FALSE**: a lobe
is `ANTHER_DIAMETER_FACTOR × one sheet` exactly as the anther is, 0.96 mm of radius on the
default sheet in both modes, so the 0.50 mm waist floor binds below the same 0.694 on both tips at
roundedness 0 (0.75 keeps 8%, 1.00 keeps 36%); on any sheet the export floors to 1.00 mm the bound
is 0.849, where 0.75 CLAMPS and 1.00 keeps 13% — the reason 1.00 over 0.75 that survives the
thinnest printable sheet. It is ONE constant, `TIP_SHARPNESS_DEFAULT` (was
`ANTHER_SHARPNESS_DEFAULT`); a different stigma value is one per-instance default the day it is
ruled. **0 moved on both tips is a construction** (the constants' own expressions term for term,
the blend exactly 1 at roundedness 1) measured on `frozen/phase19` — the 549 rows at `eb3543f`,
the newest baseline — on both trees; a phase IS owed because block 26 takes the matrix to 571.
The ids are `anther*` / `stigma*`, NOT the brief's `antherTip*` / `stigmaTip*`: renaming the
anther's seven would retire seven ids and move phase18's row definitions. The sheet is
`node tools/shot-bloom-stigma.mjs <dir> [base-tree] [--quick]` — the trifid at rest, the new
sharpness opened at both stamen counts against the circle it replaces, the space either side
(0.50 clamped … 1.50, plus the thin-sheet 0.75), the pair, INERT — every row with its own
same-tree control, no pixel claim on `whole` or `lens`. **The lattice jump (10 → 16 sides the
moment roundedness leaves 1) is session 31's and moves bytes.**
**THE PINCH REPLACES THE SHARPNESS, AND THE CIRCLE'S OWN EXPONENT IS OFF THE TRAVEL** (Eva's
ruling, session 31 — read `docs/bloom-session-31-outcome.md` before touching any of it).
`antherSharpness` / `stigmaSharpness` are RETIRED (`RETIRED_IDS`, session 31); `antherPinch` /
`stigmaPinch` (0.05–7.00, step 0.05, default 1.00, one row of `TIP_DESCRIPTORS`) carry `k`, and
`tipExponent()` in bloom-geometry.js is the ONE place `s = 2 / (1 + k)` is formed. **`s = 2` was
a SINGULAR POINT of the outline law** — the circle for every roundedness, so roundedness and the
point count were inert there — and it had been patched at TWO sites (the anther's default moved
off it, session 29; JS6/JG5 exempted it, session 30). It is now UNREACHABLE: k = 0 sits one step
below the minimum, roundedness 1 is the only producer of the circle, and both patches are
DELETED with the gates green without them. **The roundedness-1 arm of `tipSides()` is NOT a third
site** (Eva corrected her own count): it is the circle's own lattice law, keyed on roundedness,
load-bearing for every tip row's bytes and for JS7/JG6's inertness clause, and it stays. The old
control ran BACKWARDS from its label (8 the bulge, 0.25 the star); the pinch reads the way it
behaves: 1.00 the polygon, below 1 a rounded polygon, above 1 a star, the waist `2^(−k/2)` of the
point radius, the 0.50 mm floor a CAP `k ≤ −2 log2 m` (bit-identical to the old closed form,
measured). **The `s > 2` half is GIVEN UP with its shape named**: it pinched at the other azimuth
— at three or four points a half-step ROTATION — and a rotation inside a sharpness dial is two
things in one control; if wanted it returns as its own phase control. Defaults are byte-identical
BY CONSTRUCTION (pinch 1.00 is exponent 1.00, the same double); the partition is the shaped rows
with no exact image on the grid — **16 movers / 6 inert / 549 holders on `frozen/phase20`** (the
571 rows at `8b4c671`, the newest baseline) and 8 / 3 / 538 on phase19, measured with the
session-20 three-capture construction generalised for a rename-with-map (`--override` takes a
list, the INERT class is predeclared, V3 requires exactly the retired ids the matrix names, V5
one frozen matrix for all three captures). **`frozen/phase19` joins `frozen/phase17` as a tag
whose definitions reproduce and whose bytes do not fully (8 of 549).** The sheets are
`tools/shot-bloom-anther.mjs` and `tools/shot-bloom-stigma.mjs` (`--ruling` shoots the four
positions of the travel on two-row scaffolding).

**MARGIN BUCKLING'S THREE CONTROLS, THE CLAMP, AND NU 56** (session 34 — read
`docs/bloom-session-34-outcome.md` before touching any of it). `buckleAmp` (0–0.60 x the
LOCAL half-width, default 0), `buckleFreq` (1–7 cycles, default 3) and `buckleEnv` (p 2–6,
default 3, "how far the ruffle reaches in from the edge") in PETAL FORM — not a section of
their own, because the buckle IS a form deformation and a new top-level section would say
otherwise. The three ranges are `export const` in the geometry and IMPORTED by the registry
(Q6). Frequency and reach are hidden AND INERT at amplitude 0, the curl family's own gating.
**PHASE IS DERIVED, `slotIndex * GOLDEN_ANGLE`, never a control** — so "the four controls"
in part 1's brief is THREE exposed plus a derived phase, flagged rather than shipped as a
fourth thing nobody asked for.
**NU IS 56 NOW, FIXED AND NOT DERIVED**, and it is the only thing that moved bytes.
`CURL_START_MIN = 1/NU` is a registry-imported bound on a CURL slider, so a row count
derived from the buckle frequency would be one control reaching into another's range. The
frequency ceiling is `NU / 8` exactly. **THE BYTE STORY IS A THREE-CAPTURE ATTRIBUTION**
because two changes landed together: main / this head with NU back at 28 / this head as it
ships. **The controls alone: 0 of 101,969,280 floats. The row count alone: 1124 of 1124
row-modes, ALL BY ARRAY LENGTH** — a length change and a value change must not share one
word, and quoting "floats differ" over the second is a number that means nothing.
`frozen/phase22` (562 rows at `2a97e96`) is owed and shipped, verified deep-equal.
Default cost 19,040 tris and 930 KiB; worst reachable 565,632 = 37.7% of budget.
**SELF-APPROACH IS GATED — V5, barred at `MIN_FEATURE_MM` (the minimum printable GAP), with
three PRE-EXISTING failures named INDIVIDUALLY in `SELF_XFAIL`** (Eva's ruling, session 34):
`roll-max`, `form-max` and `buckle-on-form`, **measured on `main` at 2a97e96 rather than on
the branch** so the list is provably pre-existing, and no state that passes on main fails on
the branch. A new self-approach reddens at once; one of the three starting to pass TRIPS the
gate rather than passing silently. Iterative clamping was REJECTED, and so was leaving it a
reported flag — **an unenforced number becomes folklore within two sessions.** The
instrument's own floor is ~1.25 mm on a flat build, so the bar sits 0.25 mm under it and
`cup-max` passes with 3% of headroom. **PART 1'S PREMISE AND THE RULING THAT RESTED ON IT ARE
SUPERSEDED: a sufficient condition CANNOT be a closed form in (A, f, p, L, t)** — do not
re-derive `A*f^2 <= L^2/(4 pi^2 t)` and try to extend it. **THE CLAMP'S OWN MUTANT PROVED
IT**: `no-amplitude-clamp` was written naming V5 and measured to redden the WALL only, so it
names V4 now. **THE CAP STAYS A CONSTANT** — safe at every p, the 2.4x conservatism at p = 2
a capability limit; the rest is being ruled BY EYE from the sheet's iris row against the
reference photograph, and neither outcome is pre-built. **NU 56 IS ONE DECISION WITH THE
FREQUENCY CAP**: 7 cycles at 28 rows is four samples per cycle, which resolves as noise, so
`BUCKLE_FREQ_RANGE[1] * BUCKLE_ROWS_PER_CYCLE_MIN === BLADE_ROWS` is asserted at module load.
It roughly DOUBLES full-matrix gate runtime (78 and 92 min at 28) and takes the default model
to 930 KiB. **AND THE PETAL TIP SHAPE SESSION IS NOTIFIED IN
`docs/bloom-session-34-outcome.md`**: its PR THREE redistributes rows at a count that is no
longer 28, and its sagitta instrument was measured on a grid that no longer exists. Any
instrument holding the row count should IMPORT `BLADE_ROWS`, which is what the grid gate
does now after carrying `NU_EXPECTED = 28` as a literal under a comment claiming otherwise.
**THE CLAMP IS NECESSARY AND NOT SUFFICIENT, AND THE REASON IS NOT CURVATURE.** It bounds
`A*h*(2 pi f/L)^2`. Measured with a validated principal-curvature instrument
(`measureCurvature`, checked against closed-form cup and roll first, and biased to read
curvature HIGH where a stencil spans past ~50 deg of arc — the conservative direction):
**the composition's curvature FALLS while its wall collapses** (1.0625 against the base's
1.1149; wall 0.912 -> 0.310) and `SELF ~ WALL`. **The hazard is SELF-APPROACH, a GLOBAL
property no curvature bound can see**, and neither cup nor curl alone does it. A sufficient
condition is therefore a MEASURED minimum separation, not a closed form — three options
costed in the outcome doc, none taken without a ruling.
**THE CAP IS p-DEPENDENT BUT CONSERVATIVE, NOT UNSAFE**: the clamp radius is 1.437 mm at
every p while the real one moves 3.449 -> 1.456 (the cross curvature is `A*p*(p-1)/h`, so
2/6/30 at p 2/3/6) — yet EVERY clamped build clears the floor at every p, the tightest at
f 3 p 6 reading 1.227 against 1.200. At p 2 the geometry would carry 2.4x the amplitude the
cap allows, so making it p-dependent is a CAPABILITY change, not a safety fix.
**AMPLITUDE'S DEAD TRAVEL IS A FUNCTION OF FREQUENCY** — 0% at f 1–2, 40% at f 3, **88% at
f 7** — told in the read-out and marked on the track, range not narrowed, max not adaptive
(`stamenSpread`'s ruling). Frequency and reach have no dead steps and are measured inert
where hidden.
**THE SHEET'S SETTLE CRITERION WAS WRONG AND IT MATTERED**: "two consecutive identical
frames" fires SPURIOUSLY on the first capture after a page load — measured, the first
settle declared itself done and sat **27,982 px** from the same cell at rest, while every
later capture is 1 px. A warm-up settle plus THREE identical frames takes the same-tree
controls from 28,893/64,621 px to **0**. And **the identity claim moved off pixels onto the
geometry**: an exact-zero PIXEL identity is not available on this renderer, so asserting it
would assert the instrument's own noise — it is `Object.is` over the emitted positions (0
of 171,360) and the pixel number is reported, never a bar.
`node tools/shot-bloom-buckle.mjs <dir> [--quick]` is the sheet;
`node tools/bloom-wall-thickness.mjs --controls` is the dead-control sweep.
**TEN CYCLES IS UNREACHABLE AND THE CLAMP IS NOT WHAT BLOCKS IT** (measured after the
rulings, session 34): the frequency ceiling of 7 is STRUCTURAL —
`BUCKLE_FREQ_RANGE[1] * BUCKLE_ROWS_PER_CYCLE_MIN === BLADE_ROWS` — so no amplitude, petal
or mode reaches the reference photograph's ~10 along one fall. Densest reachable is f 7 on
`petalLength` 60 + `sheetThickness` 0.60: 0.60x asked -> **0.388x built, clamped**, 8.69 mm
wavelength, **3.72 mm peak-to-trough in EXPORT** (6.20 live), and it does read as a lettuce
edge. The same f 7 on the DEFAULT petal is 0.066x / 1.06 mm — **the short thick petal is
what makes f 7 look shallow, not the exponent.** Petal LENGTH is the strongest lever; a
thinner sheet is bounded by `MIN_FEATURE_MM` (0.60 floors to 1.00 in export). Ten cycles
needs `BLADE_ROWS >= 80`. **A session opened to relax the CLAMP would be working the wrong
control** — see the session-34 outcome doc.
**A GUARD PREDICATE WITH TWO OWNERS WILL DRIFT, AND `FORM_IDS` IS THE SECOND OWNER.**
`petalFormIsFlat` in the geometry and `FORM_IDS` in `tools/bloom-harness.mjs` answer the
same question — is this row flat? — and session 34 extended only the first. Every buckle
row then read as a flat row reporting form telemetry: **"HARNESS INVALID — 23 validity
assertion(s) failed. No result above is trustworthy", on a run where all 573 rows
individually passed.** Both STL gates share it. Adding a form-family control means adding
it to BOTH, and only the member that decides flatness (the amplitude, never its frequency
or reach — those are inert at amplitude 0, the curl-family rule).
**AND A BLOCK COMMENT'S FORMATTING HID BLOCK 27 FROM THE SMOKE CENSUS.** CLAUSE A parses
`buildMatrix()` for `/^ {2}\/\* (\d+)\. /`; block 27 shipped with a decorative banner, so
the census could not see it, demanded no smoke row, and **the subset never built a buckled
petal** — which is why a clean local smoke run could not have caught the above. When you
add a matrix block, run `node tools/bloom-smoke.mjs --check` and confirm the BLOCK COUNT
rises: a green census that does not mention your block is not a pass.

**MARGIN BUCKLING SHIPS AS A FIELD WITH NO CONTROLS, AND THE ONE THING THAT IS NOT LIKE CUP
AND ROLL IS THE NORMAL** (session 33, part 1 of two — read `docs/bloom-session-33-outcome.md`
before touching any of it). `w(u,v) = A * h(u) * |v|^p * cos(2 pi f u + phase)` added to `aN`
in `petalForm`'s `sectAt`, on the same `ramp(u)` the other curves use so the FOOT is untouched
by construction. **It is a displacement field, not a boundary change** — `widthProfile` is
untouched and `h(u)` is unchanged, so it never competes with the tip work for the outline.
**`buckleIsFlat` JOINS `petalFormIsFlat`**, because that predicate decides whether
`petalForm()` is constructed at all and at the default it is true: a buckle wired only inside
`sectAt` is a DEAD SLIDER (session 16's `cupGradient` move, re-learned by measurement).
**AMPLITUDE IS A FRACTION OF THE LOCAL HALF-WIDTH, NOT mm** (Eva, ruling 1): absolute mm is
applied unchanged where the blade has tapered to its tip floor, so the tip crumples.
**THE NORMAL IS THE SESSION.** Cup and roll are functions of `v` alone, so the shipped
cross-section normal (`dP/dv` rotated a quarter turn in the row's own plane) is the surface
normal to the accuracy a SLOW along-`u` variation allows — and every deformation before this
one is slow along `u`. A buckle is not: measured 29 degrees off at a moderate setting and 71
at the corner, which offsets the two skins into a WEDGE. The buckled branch takes
`normalise(dP/du x dP/dv)` instead, ORIENTED ONTO the cross-section normal so the winding
cannot flip (`emitPanel`'s quads are wound off `n`; a flip there is a boundary-edge failure).
Blade rows only — the foot is a different surface and differencing across the seam is a
derivative of nothing. **The field's `v`-derivative is `d/da` at `a = h*v`**, the shipped
convention; differentiating in `v` overstates the slope by a factor of `h` (~8 mm) and is now
a mutant. **0 of 207,385,920 floats moved** (572 live rows + phase20's 571, both modes, against a
worktree of `b323268`, `Object.is`, with a 1e-9 positive control); no row added, so
`frozen/phase20` stays the newest baseline and NO phase is owed. Zero triangles added.
**THE INSTRUMENT IS `node tools/bloom-wall-thickness.mjs`** — the first thing here ever to
measure the EMITTED wall, and it is the INPUT to part 2's ranges rather than a completeness
exercise (Eva's own distinction, which is why this session is instrument-first). V1
calibration / V2 reachability / V3 guard / V4 normal all ABORT; `--negative-control` runs five
mutants that all behave. It rides in `bloom-export-watertight.yml` before the browser install,
so the bloom gate count stays at FIVE. **It measures WALL and SELF separately** — the wall under
a point versus the sheet approaching another part of itself; conflating them reports a fold as a
thinning. **A deficit at one grid is not a thinning: refine and see.** Recovery = the mesh,
divergence = geometry. Two things it found on SHIPPED states, neither this feature's and both
scheduled in the outcome doc rather than left as folklore: **`petalRoll` 330 emits a 0.587 mm
wall against a declared 1.200** at 28x10 (recovering to 1.177 at 168x60, so the roll floor works
and the FACETED mesh is what a slicer receives), and **all-form-max DIVERGES** 0.282 -> 0.014,
a real near-self-contact, pre-existing. **THE COMPOSITION ROW IS AN XFAIL WITH A NUMBER**: the
buckle over cup 1.2 + curl 180 diverges (own contribution 0.438 -> 0.635 mm under refinement),
so **discovery's closed-form `A*f^2 <= L^2/(4 pi^2 t)` is NECESSARY AND NOT SUFFICIENT** — the
buckle composes with curvature cup and curl already spent. That is part 2's clamp problem,
and the xfail FAILS HARD when it starts passing. **Part 2** is the four controls (amplitude,
frequency in CYCLES capped at 7, phase from the slot index, and `p` — Eva's amendment, floor 2,
ceiling 6, default 3, "how far the ruffle reaches in from the edge", because an iris ruffles
wide and a rose narrow and one exponent cannot draw both), the clamp, `NU = 56` and the sheet.
**`NU = 56` IS A RULED EXCEPTION TO "DERIVE, DON'T EXPOSE", WITH ITS REASON**: a row count
derived from buckle frequency would move `CURL_START_MIN = 1 / NU`, which the registry IMPORTS
as a CURL control's bound — a control reaching into an unrelated control's range. Raising `NU`
moves bytes and owes a frozen phase; session 33 does not.

**THE APEX IS ONE UNCONDITIONAL CAP WITH NO CONTROL AT ALL, AND THE LAW IS A
SUPERELLIPSE THAT HAS NOT LANDED YET** (Eva, session 32 — read
`docs/bloom-session-32-outcome.md` before touching any of it). Phase A costed seven
mechanisms and stopped at a sheet; the `blunt` ruling that followed was BUILT IN FULL and
then WITHDRAWN, on the grounds that it answered the wrong question. **What Eva ruled
instead: the petal tip law is the SUPERELLIPSE over `[widest point, 1]`, exposed as its
exponent `n` directly (0.60–2.00, default 1.00), and it is a REPARAMETERISATION of the
existing tip taper rather than a control beside it** — the core already IS that family
over that region (RMS 0.005 at the round end) and two controls over one region violates
the registration rule. **A terminal-width control is DROPPED and terminal width is
DEFERRED as a separate shape family**, recorded so it is schedulable. **THE FACETING AT
THE ROUND END IS A MESH PROBLEM, NOT A LAW PROBLEM**, and the law cannot be judged by eye
until it is fixed: rows sit evenly in `u` while the curvature concentrates near the tip.
**DO NOT FIX IT BY RAISING `NU` — `CURL_START_MIN = 1 / NU` is imported by the registry as
a control bound, so changing `NU` silently moves an unrelated curl slider's floor.** The
row COUNT stays fixed; the row POSITIONS move. It lands as THREE PRs in order: the
structural prerequisite (this one), a SAGITTA INSTRUMENT (zero bytes), then the law plus
redistribution.
**WHAT SHIPPED HERE IS THE PREREQUISITE AND IT HAS NO CONTROL.** `TIP_PLATEAU` is gone,
the converging cap is unconditional and runs to the mode floor along a straight lerp, and
four ids are retired (`petalTipBreadth` + `allTipBreadth` / `innerTipBreadth` /
`labellumTipBreadth`) with NOTHING replacing them — `petalTipShape` and `petalTipEnd` were
stripped entirely so the superellipse arrives with no incumbent. Live matrix 572 → 562,
registry 101 → 97. **WHAT THE RETIRED TERM DID, measured**: `max`-ing a RISING ramp
against a FALLING core put a WAIST in the blade — 0 of 3,795 taper pairs show a
rise-after-a-fall above the peak at breadth 0, **3,795 of 3,795** at every breadth above
it, 0 under the new law. **SPATULATE IS NOT LOST**: `uPk = a/(a+b)` reaches 0.833.
**A2–A6 IS THE FAMILY** and there is no A1 — it read "entry >= terminal" off the descriptor
and the mutant table proved it VACUOUS. **`node tools/verify-bloom-apex-mutants.mjs` is the
committed positive control**, six mutations, every family firing on one that names it. It
took three passes and found two real defects: **A5 and A6 both reconstructed a row's
station from its ARRAY INDEX**, which is off by however many FOOT rows precede the blade —
A5 went silent on the mutation it exists for and A6 fired on the clean tree; the builder
now emits `profileU` (its own per-row `u`) and both READ it, refusing to run rather than
guess. And **the plateau mutation had to be raised to the retired control's own maximum
(0.6) to fire at all**, which is a finding: with the cap unconditional and its terminal
pinned to the mode floor a re-introduced plateau is MOSTLY MASKED (no waist anywhere at
0.30 or 0.45; at 0.60 one on the default taper only; none at any amplitude on taper 0.6 or
the narrowest petal), so **A5's coverage against that defect is narrower than it was** and
its stronger witness is `inverted-lerp`.
**THE THREE MEASUREMENTS EVA ASKED FOR, reported not decided.**
**(1) THE CAP MUST BE DEMOTED OR THE LAW CANNOT BE JUDGED**: only TWO places depend on
`TIP_CAP_FRACTION` (its definition and one `min`), and with the cap as a SHAPE the ceiling
is unreachable — asked `n` 2.00 reads as **1.740** (rms 0.432) and 1.725 reads 1.590
(reproducing Eva's own 1.585); demoted to a print-floor clamp it reads the asked `n`
EXACTLY. A clamp binds on 1 of 28 rows live and 2 of 28 export at `n` 1.0.
**(2) THE WIDEST POINT IS FIXED BY CONSTRUCTION** — at `s = 0` the superellipse is exactly
1 for every `n` — and the DRAWN maximum holds on five of six taper pairs; it moves ONE ROW
on `uPk = 0.2000`, which sits exactly between two stations. That is the sampling, not the
law, and the redistribution must be measured against it.
**(3) THE SHOULDER APPEARS AT `n` < 1.4 AND IS A RIGHT ANGLE BY 0.70** (turn angle at the
widest point: 0.0° at `n` 2.00, 0.2–1.2° at 1.40, **19.6–53.9° at the DEFAULT 1.00**,
50–76° at 0.90, 88.8–89.5° at 0.60). **The default is NOT corner-free** — the two limbs meet
with different slopes for `n` <= 1 by construction, so only `n` >= ~1.4 is C1. That is a
property of the approved law, not of an implementation, and Eva may want to revisit it
before PR THREE.
**THE PARTITION CLOSED AT 45 movers / 21 inert / 506 holders on `frozen/phase21`, EXACTLY as
predeclared in all three classes**, with `twin === new on 572 of 572 rows` and V1-V5 held; the
inert class is the GATED rows plus `6 layers x allTipBreadth max`. phase21 joins phase17 and
phase19 as a tag whose definitions reproduce and whose bytes do not (45 of 572). **The byte
tool caught the session's own shell bug rather than answering plausibly** — an unexported
variable left `--strip` empty, and it recorded `strip: []`, refused 71 rows BY NAME and wrote
`complete: false` instead of closing a partition over the 501 rows that happened to apply.
**`frozen/phase21` IS THE 572 ROWS AT `b323268`** — main's head before this retirement, owed
because the matrix shrank, and **the newest baseline that is fully replayable** (see the
charter's scheduled fix: phase19 and phase20 can no longer be byte-re-exported from main at
all, because session 31's retirement postdates both). The sheet is
`node tools/shot-bloom-apex.mjs <dir> [base-tree]`, now a RETIREMENT sheet — the phase-C
scratch rig went with the withdrawn ruling. **The upstream contract for the lobe session is
§5 of that doc** and is unchanged: `widthProfile()` stays the one owner of the apex,
`[uCap, 1]` is read from the profile rather than re-spliced, no second round-to-pointed
axis on the whole-petal apex, and the `u = 1` mini-face is never collapsed. Say PETAL TIP
SHAPE or LOBE TIP SHAPE, never "tip shape".

**THE PETAL TIP LAW IS RULED IN FULL: `n` 0.60–3.00, DEFAULT 2.50, AND THE SIX STATES HAVE
NAMES** (Eva, session 32, from the rendered sheet — the artifact *Petal Apex Law*). Ceiling moved
from 2.00 to 3.00; floor stays 0.60; **default 2.50, chosen BY EYE** because it holds the blade's
width past the widest point and then turns — the hand-drawn reference's shape, which **nothing on
the shipped control could reach**. **THE NAMES ARE THE RULING, and the panel, the sheet and the
docs must all use them**: 0.60 acute · 1.00 straight point · ≈1.20 today's pointed petal · 2.00 the
true ellipse · **2.50 the default** · 3.00 the held-width round tip. The pointed look at ≈1.20 must
stay reachable, ruled explicitly. **THE RESHAPE-FROM-TODAY ARGUMENT IS FORMALLY DEAD** — the
default moves the shape deliberately and substantially, that is the point, and nothing here is
published or printed; do not re-raise it (it cost this session a floor at 1.40 that measured 2.09 mm
of reshape to avoid a 0.91 mm one).
**THE SHEET IS WHY ANY OF THIS IS RULED.** Every prior ruling was made on a shape nobody had
rendered, and the cell shown as `n` 2.00 **was drawn through the cap and was actually 1.740**. The
scratch rig demoted the cap and measured, reading the exponent BACK off the emitted 28-row
polyline: **drawn `n` equals asked `n` to four decimals** at every value on both tapers, and the
widest point holds at `u` 0.538. **CAP DEMOTION IS THEREFORE REQUIRED, not preferred: the chosen
default is not reachable through the cap at all.** It stays conditional on ONE thing — the
connectedness and watertight invariants surviving a REAL EXPORT RUN, which PR THREE must prove
rather than argue.
**TURNING-RATE REDISTRIBUTION IS A DELIVERABLE OF PR THREE, NOT AN OPTIMISATION**: the chosen
default sits where the apex turn is LARGEST (29.6° at 2.50, 34.1° at 3.00, uniform in `u`, 28
rows), and turning-rate weighting collapses that **75–83% at the same row count with the drawn `n`
unchanged**. **KEEP THE CLAUSE THAT COUNTS TURNING ONLY WHERE THE LAW IS THE ACTIVE BRANCH, AND
KEEP THE NOTE SAYING WHY** — a kink's turning is a DELTA FUNCTION, so integrating through the
root-blend and tip-floor joins made the cumulative measure STEP and stacked **5 rows on `u` 0.058
and 8 duplicates on `u` 1.000**, reporting an 84° "apex turn" that was a zero-length segment and
reading as *"redistribution makes it 256% worse"*. **Third instance of this bug class here; the
note is what stops a fourth.** Arc length is the WRONG weighting for that test and is why this
session first concluded the opposite — an ellipse's apex is exactly where the outline turns
fastest, so arc length puts EVENLY SPACED rows through it.
**NEVER REPORT A PER-ROW TURN ANGLE WITHOUT NAMING THE ROW COUNT AND THE WEIGHTING** (Eva, session
32): two of that session's three corrections came from a drawn quantity being reported as an
analytic one. The same session's `"only n >= 1.4 is C1"` was WRONG — `uPk` is the core's MAXIMUM so
its slope is exactly 0, and the superellipse's tends to 0 for EVERY `n` > 1; what had been measured
was the DRAWN turn at 28 uniform rows. C1 was never the property wanted; **bounded curvature** is.
**THE ROOT BLEND IS ITS OWN SCHEDULED SESSION AND MUST NOT BE FOLDED INTO PR THREE** (Eva, session
32). The rig found the largest drawn corner on a REAL petal is the root blend at `u` ≈ 0.07 —
**31.9° on the default taper, 27.2° on Eva's** — exceeding the apex until `n` reaches 2.5, and the
worst chord error too (0.6325 mm at `u` 0.049, 88.2% of 1,124 measured profiles worst at the base,
NONE at the apex). **One owner per boundary, and that boundary belongs to `footRing()`.** The
verification claim SPLITS across two commits with two separate proofs — the law (surface changes;
drawn `n` matches asked across the range) and the redistribution (surface unchanged; dense sampling
agreeing on both trees) — never one proof spanning both.

**THE PETAL TIP LAW SHIPS, THE CAP IS A PRINT-FLOOR CLAMP, AND THE BLADE ROWS ARE PLACED BY
TURNING RATE** (session 32, PR THREE — read §17 and §18 of `docs/bloom-session-32-outcome.md`
before touching any of it). `petalTipShape` (PETAL SHAPE, 0.60–3.00, step 0.05, **default
1.70**) is the superellipse exponent over `[widest point, 1]`, a REPARAMETERISATION of the tip
taper rather than a control beside it. **The six named states are Eva's ruling and the panel's
read-out speaks them**: 0.60 acute · 1.00 a straight point · ≈1.20 today's pointed petal · 2.00
the true ellipse · 2.50 width held then turning · 3.00 the held-width round tip.
**THE DEFAULT IS 1.70 AND 1.70 IS NOT ONE OF THE SIX** (Eva, ruled from the sheet after the
wall instrument went red at 2.50). The RANGE IS UNCHANGED, so **2.50 stays reachable and is
still Eva's preferred LOOK** — only the shipped value moved. The read-out says "between the
pointed petal and the true ellipse" rather than rounding 1.70 to the nearer anchor, because
naming it "the true ellipse" would claim a shape the geometry is not drawing. **The
redistribution's ratios were REPORTED WITHOUT NAMING THE MODE AND WERE LIVE** — this
project's own rule, broken here. Corrected, apex chord error at n 1.70 over 56 rows,
uniform-in-u → turning-rate ladder: **EXPORT (the object) 0.1609 → 0.1118 mm on Eva's taper
(1.44x) and 0.1693 → 0.1054 (1.61x) on the default**; LIVE 0.0732 → 0.0330 (2.22x) and
0.0732 → 0.0352 (2.08x). The withdrawn figures were 5.84x / 5.04x. The contact sheet was NOT re-rendered — the cells are per-exponent
and the law did not move; the cell labelled default is now 1.70.
**AT HIGH `n` COMBINED WITH HIGH CUP A PETAL SELF-APPROACHES BELOW THE 1.00 mm PRINTABLE GAP,
AND THAT COMBINATION IS NOT GATED** (§18a). Measured on `SHIPPED cup 1.2`, monotone in `n`:
1.031 mm at 1.20, **1.031 at the shipped 1.70**, 1.019 at 2.00, **0.977 at 2.50**, 0.832 at
3.00. Same class as session 34's composition finding — self-approach from two shape controls
both pushed, no closed form in the individual parameters, neither control alone doing it.
**The matrix varies ONE CONTROL AT A TIME, so this is invisible to it by construction**, and
the wall instrument's rows have the same shape. **No range limit, clamp or warning was added**
— narrowing the range would remove states Eva ruled reachable, on the strength of a threshold
that is itself a guess. A COMBINATION GATE (a predeclared set of two-control products through
the wall instrument) is the schedulable item; it is recorded, not pre-empted.
**AND THE 1.00 mm PRINTABLE GAP IS ITSELF AN UNVALIDATED CONSTANT** (§18b, recorded once):
NOTHING IN THIS PROJECT HAS EVER BEEN PRINTED, so `MIN_FEATURE_MM`, the printable gap, the
sheet floor, the foot width and every curvature floor are DECLARED GUESSES rather than
measurements. **That is not a reason to weaken any of them** — an unenforced number becomes
folklore within two sessions, and this session's refusal to loosen V5 is why the gate meant
anything when it went red. It IS the reason the parked cantilever coupon matters: every
figure above is a comparison against a line we drew ourselves.
**CAP DEMOTION WAS REQUIRED, NOT PREFERRED**: through the cap the drawn exponent SATURATES at
1.900 / 2.318 on the two reference tapers whatever is asked, rms 0.62 — the ruled default is
unreachable. Demoted, drawn n equals asked n at **8.88e-16** over 32 states, fitted ON THE
ACTIVE BRANCH ONLY. **Fitting through the print floor biases an asked 0.60 to 0.6080** — the
same bug class as integrating turning through a kink, FOURTH instance here.
**THE REDISTRIBUTION EARNED ITS PLACE AT NU 56, AND ON THE OBJECT IT IS DOING ALL OF THE
APEX WORK.** Doubling the rows halves the apex chord error in LIVE (0.1608 → 0.0732 mm at the
default, n 1.70) and buys almost NOTHING in EXPORT (0.1812 → 0.1693, 1.07x) — the print floor
truncates exactly the curved stretch the extra rows would have resolved. The ladder then takes
**1.61x / 1.44x in EXPORT** and 2.08x / 2.22x in LIVE. Worst over 9 tapers × 8 exponents:
**EXPORT 0.3952 → 0.2147 mm (1.84x)**, LIVE 0.3952 → 0.1319 (3.00x).
**IT IS NOT UNIFORMLY BETTER, AND THAT IS §18c**: 21 of 72 states are worse at the apex in
export and 4 states' whole-blade worst chord REGRESSES, by at most 0.0361 mm, all on spatulate
tapers (widest point at u 0.67–0.83) at low exponents that neither the shipped default taper
nor Eva's reference reaches.
**EVA RULED IT SHIPS AS MEASURED, ON THE GROUND THAT IT IS A RENDER-QUALITY CHANGE** (§18g):
every figure in that comparison is BELOW PRINT RESOLUTION — 0.2147 against 0.3952 mm at the
worst, and 0.0361 mm is about a third of a layer height — so none of it is resolvable on a
printed object. What it changes is the FACETED LOOK ON SCREEN, which is the mode the defect
was reported in and where the ladder is worth ~2.2x. **The export figures stay on the record
beside it as the honest statement of what the print gets, never dropped for being the weaker
half.** And **dropping the ladder is NOT the neutral option**: without it this PR moves the
exported apex 3–7% and nothing else — the law shipped with the visual defect that motivated
the work still present, at twice the row count.
**AND `LADDER_ARC_SHARE` = 0.70 IS A TRADE, NOT AN OPTIMUM** (§18d). Its shipped justification
welded two LIVE-mode sweeps into one sentence and did not reproduce once the ladder was made
mode-independent. Re-derived: 0.70 is a local minimum in live and is NOT one in export; the
grid optimum near 0.90–0.95 improves the worst state (1.84x → 2.04x) and the regressions
(4/72 → 1/72) while COSTING the shipping default (1.61x → 1.29x) and Eva's taper (1.44x →
1.22x). **Eva ruled it STAYS at 0.70**: optimising the tail at the cost of the default is the
wrong trade, and the tail regressions bought are precisely the sub-resolution ones — 0.90's
numbers stay beside it so the value reads as a TRADE rather than a tuned constant. Pure arc
length (1.00) collapses to 1.31x with 30 of 72 whole-blade regressions, so the turning term is
load-bearing — measured, not argued. **Do not tune it to three digits: the worst-of-72
objective HOPS** (0.75 spikes to 0.2732 mm in both modes). **And the PER-STATE GATE is
WITHDRAWN, not deferred** — chord error is a property of the DISCRETISATION, so feeding it back
into row placement makes the sagitta instrument measure its own fixed point: the `headRise`
ruling applied correctly.
**THE APEX TURN ANGLE IS NOT THE CRITERION AND CANNOT BE** — it is discontinuous in row
placement (65.7° or 10.6° on one outline), and at n 1.20 it RISES while the sagitta falls,
which is the tip-floor join resolving rather than smearing. The sagitta decides.
**THE LADDER AND MARGIN BUCKLING COMPETE FOR THE SAME 56 ROWS, and the resolution is derived
from the buckle's own constants.** `NU / BUCKLE_ROWS_PER_CYCLE_MIN` is a claim about row
SPACING expressed as row COUNT — true of a uniform ladder, false of any other; measured, an
unbounded ladder DOUBLES the buckle's along-margin chord error at the ceiling (0.2808 →
0.5626 mm). **Uniform uniquely maximises the minimum local rows-per-cycle, so no bound can
restore the bar.** What ships is BOTH halves: the margin wave's own turning is in the measure
(so the buckle buys its own rows) AND `ladderGapFactor(f)` is `NU / (BAR * f)`, **exactly 1 at
f 7**, i.e. uniform. Measured clean at every frequency — the buckle never regresses, improves
at every f ≤ 5, and at the ceiling the apex keeps today's faceting, which is the honest trade
and is a matrix row rather than an argument. **At the shipping default the buckle is flat, so
the bound does not bind.**
**THE ROOT BLEND'S ROWS DO NOT MOVE, BY CONSTRUCTION** — every station below `ROOT_BLEND_END`
keeps its uniform value exactly (A7, a bit identity), so the base chord error is unchanged at
every exponent, and `CURL_START_MIN = 1 / NU` still means what it says because the first blade
row is one of the held ones. **After this, the worst chord on the blade IS the root blend's,
at every exponent** — §13's finding as the new ceiling, and the scheduled session's to fix.
**A6 IS REPLACED, NOT RELAXED** (it asserted the cap was a straight lerp and its own comment
said it would fire when the law changed; it did), **A7 and A8 are new**, and the three
lerp mutations are retired as UNREACHABLE. **`tipCap.peakHalf` is DECLARED because the ladder
does not guarantee a row near `uPk`**: reading the largest emitted row instead gives 7.9936
against a true 8.0000 and reads an asked 1.50 as 1.5014 — the sampling read as the geometry,
which is what made A6 fire on a clean tree. The mutant table
(`node tools/verify-bloom-apex-mutants.mjs`) found FOUR defects on its first run, all the
session's own, including `plateau-returns` reporting MUTATION DID NOT APPLY because the law
moved its find-string, and a mutation invisible because its row saturated only in EXPORT while
`__bloomMetrics()` reports the LIVE build. **`frozen/phase23` is the 596 rows at `7544796`; it
is 23 and not 22 because phase22 is margin buckling's, and the FROZEN_MATRICES census caught
the collision at module load, by name.**

**A FROZEN MATRIX MUST BE REGISTERED IN `FROZEN_BASE_COMMITS`, AND ITS LABELS ARE DATA**
(session 32, both learned the hard way in this session's own PR). **`phase21Matrix()` shipped
registered in NOTHING** — it sat in `diff-bloom-bytes.mjs`'s own table, so `--verify-frozen
--phase21` worked by hand, while BOTH consumers (CI's frozen job and
`publish-frozen-tags.sh`) build their phase list from `FROZEN_BASE_COMMITS`, which had no
entry. The loop just runs one fewer iteration: **the new baseline is verified by nothing and
its base commit pinned by no tag**, and there is no row that can go red. The name → matrix map
is now `FROZEN_MATRICES` **in the harness** (one owner, imported by `diff-bloom-bytes.mjs`
rather than restated) and the harness **throws at MODULE LOAD** if its keys and
`FROZEN_BASE_COMMITS`' keys disagree in either direction — a matrix with no base commit is
unverifiable, a base commit with no matrix is a phase nobody wrote. It lives in the harness so
no gate can be run that skips it; the negative control is in the session-32 doc.
**AND NEVER EDIT A LABEL INSIDE A FROZEN MATRIX.** Retiring `allTipBreadth` correctly turned
the live matrix's "Inner trio" into "Inner pair" — and the same sentence in phases 11–20 is a
VERBATIM SNAPSHOT of that base commit's `buildMatrix()`, where the trio had three members.
`--verify-frozen phase11` went red on row 400 in 24 seconds, which is that check doing its
job. The frozen form is the JSON literal (`{"label":…`); the live matrix uses the array form
(`['ALL PETALS: …', { … }]`), so a targeted revert cannot reach it.
**`frozen/phase21` (572 rows at `b323268`, a commit on `main`) IS NOT PUBLISHED, AND EVA RULED
THAT ACCEPTABLE** (session 32). Three things, because each has been re-derived at least once:
**(1) THE PUSH FAILS FROM A SESSION** whenever the baseline predates a workflow change —
session 17's limit, unchanged: a GitHub App token cannot push a tag whose `.github/workflows`
differs from the default branch's, and #191 changed a workflow after `b323268`. This recurs by
construction, so expect it again.
**(2) THE `git/refs` API ROUTE IS UNTESTED AND UNREACHABLE FROM A SESSION, AND THAT IS "NO TOOL
TO TRY IT", NOT "THE API REFUSED IT."** Creating a ref at a commit that already exists sends no
tree, so it may well sidestep the restriction in (1) — nobody has been able to find out. The MCP
surface exposes only tag READERS (`get_tag`, `list_tags`, `get_release_by_tag`, `list_releases`,
`get_latest_release`); the one ref-creating tool, `create_branch`, takes a branch NAME and
constructs `refs/heads/…`, so it cannot address `refs/tags/…`; and every writing tool
(`create_or_update_file`, `push_files`) creates a TREE, which is the thing the hypothesis avoids.
A session with a different tool surface should still attempt the POST — it is an open question,
not a closed one.
**(3) IT IS BELT-AND-BRACES, NOT LOAD-BEARING, so do not re-litigate it.** `b323268` is in
`main`'s history (a squash-merge, #188 — one parent, NOT a merge commit) and `main` is never
force-pushed here, so the commit cannot be orphaned and the definitions stay replayable without
the tag. 18 `frozen/*` tags are on the remote (phase5 was already absent) and they remain the
pattern: **a future baseline should still be tagged whenever it can be** — via the web UI
(Releases → Tags), or one `git push origin refs/tags/…` from a clone with a user's credentials.
**THE SAGITTA IS MEASURED AND THE APEX READS EXACTLY 0.0000 mm, WHICH IS VACUOUS** (§13 of the
session-32 doc): above `uCap` the profile is a straight lerp, and a straight line has no chord
error against its own chords. The worst chord error is at the BASE — **0.6325 mm at u = 0.049**,
with 88.2% of 1,124 measured profiles worst there and NONE at the apex. So the visible faceting
is not chord error along `u`; it is the apex BEING a straight cone plus the slope break at
`uCap`. **And the cap makes `n` INERT on 26 of 3,795 reachable taper states** (`uPk ≥ 0.80 ⟺
a ≥ 4b`), 163 with two row intervals or fewer — a second, independent argument for demoting it.

**THE PER-PETAL MID-SURFACE IS CAPTURABLE AND EXPORTS AS A .glb, AND THE CAPTURE IS A FLAG
THAT DECIDES NO GEOMETRY** (session 28). `MeshBuilder({ captureGrid })` defaults FALSE, so
every existing caller is unchanged; `emitPanel` — the ONE place `row.sect(v)` is evaluated —
stores the mid-surface `P`/`n` it already offset the two skins from, and `buildPetalInto`
returns `grid` (one entry per PANEL: a cleft is three, not one rectangle) and `attachment`.
`bloom-grid-gltf.js` writes one node per petal, LINE_STRIPs along (u) and across (v), and a
child node whose `translation` IS the attachment point. **The Get grid button FOLLOWS
`shownMode()` and the STL deliberately does not** — the STL is the object, so the preview
toggle must never reach it; the grid DESCRIBES what is on screen and labels which it was.
Two things ride in the file because downstream cannot recover them: the `metric` /
`polyline` telemetry (v is uniform in PARAMETER, not arc length — `metricMax` reaches 4.12
under cup with a gradient, so evenly spaced v is not evenly spaced mm) and the MODE
(`buildGridGltf` THROWS without one). **`metric` is NULL on a flat build, which is the
shipping default**, and a 1.0 there would be a number standing in for a measurement nobody
took. **THE SEAM AT u = 0 IS THE TILT, NOT A CHANGE OF LAW** (the question the foot drop was
ruled on): `ramp(0)` is exactly 0, so `sectAt(u=0)` IS `flatSect` — measured 0.00e+0 with
every form control at maximum — while the sheet NORMAL turns by exactly `petalTilt` (25.0000°
at the default, 75.0000° at the top, 114.98° at a hemisphere), which is the junction's own
geometry and is in the STL too; the drawn kink there is SMALLER than the next row's (29.69°
against 31.89° at the default), because `rootBlend` collapses the width over six rows. The
export keeps the s = 0 row as u = 0 and drops the two overhanging feet (all three carry
`u: 0`; row 0 is the INNERMOST, 5.31 mm from the axis against the ring's 8.84).
**NV = 10 IS EVEN, so no column lies on v = 0 and there is no midrib line in the grid** —
the spine is exported separately for that reason. **The file says how many petals it is
missing, in three places**: `buildBloomInto` keeps one petal per DESCRIPTOR, so RADIAL
exports 1 of 8 and only CONTINUOUS exports all; closing that is its own change and is
NOT done. Gate: `node tools/verify-bloom-grid.mjs` (528 checks, 19 rows) with
`--negative-control` (six mutations) REQUIRED before quoting a pass — both STL gates are
structurally blind here, since the capture emits no triangles, and its clause 2 re-offsets
every captured point and requires it among the emitted vertices EXACTLY. Read
`docs/bloom-session-28-outcome.md` before touching any of it, including the two gate defects
the negative control found. **0 moved**, measured two trees x 528 live rows x both modes with
`Object.is` (328,820,760 floats) plus phase17's 507, with a positive control proving the
comparison detects a 1e-9 perturbation — stronger than the STL hash diff, which quantises to
float32. No new frozen phase.

**THE GRID EXPORT WRITES EVERY PETAL, AND `petalsAll` IS A SECOND ARRAY RATHER
THAN A CHANGED ONE** (session of Sep 10, overnight). `buildBloomInto` used to
retain one petal per DESCRIPTOR, so **RADIAL exported 1 petal of 8** and only
CONTINUOUS exported all of them — a grid exported from any other placement was
nearly empty, and it was the last generator-side blocker on `/plot`'s
composition work. **`built.petals` IS UNTOUCHED AND STILL MEANS ONE ENTRY PER
RING**, because four of the metrics hook's arrays are INDEX-MATCHED to
`fr.rings` through it — `petalRingSpine`, `petalRingRootRows`,
`petalRingFootFrames`, `petalRingApplied`, which are J1's, Z2's and Z6's own
inputs — and re-keying it per slot would move every one of those
correspondences for no gain to the export. `built.petalsAll` is every petal the
builder emitted, in slot order, and `bloom-grid-gltf.js` is its only consumer.
Two questions, two arrays. **IT COSTS NOTHING TO BUILD:** the capture is a
property of the ACCUMULATOR, not of retention, so every petal was already
building its grid and all but one per ring were being thrown away.
**ZERO BYTES MOVED, MEASURED:** `node tools/verify-bloom-petalsall-bytes.mjs
--base <worktree>` compares every float of `acc.positions` against a build of
the base commit's own source, both modes, the full live matrix, with
`Object.is`; `--control` perturbs one coordinate by 1e-9 and requires the
comparison to fail, and the run REFUSES to pass vacuously if no row hands the
exporter more petals than before. **WHAT IT COSTS IN A FILE** (live mode,
measured): RADIAL 8 x 1 goes 1 -> 8 petals and 38 -> **301 KB**; RADIAL 40 x 3
goes 3 -> 120 petals at **4,528 KB**; FAN 1 -> 7 at 264 KB; CONTINUOUS is
unchanged at 302 KB. **The 40 x 3 figure is not clamped** and is the honest
ceiling — about four times the sample grid's segments, which matters now that
`/plot` draws several blooms at once. **CLAUSE 9 IN `verify-bloom-grid` IS THE
WITNESS AND IT IS ANCHORED TO `petalsBuilt`** — the BUILDER's own tally, which
reaches the module by a different route from either petal array — and it counts
`petal_N` nodes in the FILE rather than reading the extras a mutation would be
lying in. Its mutant reverts the exporter to the per-ring array and produces a
perfectly valid .glb of a perfectly valid petal whose census agrees with itself;
nothing else in that gate notices. 585 checks over 19 rows, seven mutations.
**A MUTANT IN THAT GATE MAY NOW CLAIM SEVERAL CLAUSES** — the retention mutant
genuinely reddens 9 and 7 and both are true about it — and what is still refused
is a clause nobody claimed. A widening, not a loosening.

**THE PETAL'S MID-SURFACE IS EVALUABLE AT ANY (u, v), AND THE ROW LOOP READS IT**
(session 37, Eva's ruling on the discovery). `petalSurface(state, ring, slot, cap, acc)`
in `bloom-geometry.js` owns the surface law: `rowAt(u)` is the row plan (spine centre,
frame, half-width, the row's own `sect(v)`) and `at(u, v)` is `rowAt(u).sect(v)` — the
front door, never a second law, the `/plot` `stemPointFromPlan` / `stemPointAt` shape.
`buildPetalInto`'s loop is `rows.push(surface.rowAt(stations[i - 1]))`; the ladder,
`trueNormalRows`, the panels and every telemetry field are untouched. **WHAT IT DOES
NOT OWN, by design:** the ladder (`bladeStations` decides WHICH u the mesh samples), the
BUCKLED normal (`trueNormalRows`' cross against the NEIGHBOURING ROWS is a lattice
quantity — measured **54.74°** off the cross-section normal at amp 0.5 / freq 3, so a
continuous dP/du would NOT reproduce the emitted normal at the stations), and the foot
(`footRowsAt()`, not `at`). **0 FLOATS MOVED, POSITIONALLY:** `node
tools/verify-bloom-surface-bytes.mjs --base <worktree>` — every export float AND every
captured-grid value, `Object.is`, full matrix, both modes, CAPABILITY rows passed (the
winding tool drops them; they are the only multi-panel rows); `--control` perturbs BOTH
clauses by 1e-9 and requires two findings, so neither clause is a log line. It follows
`verify-bloom-petalsall-bytes.mjs`'s shape and is positional where session 36's winding
tool is multiset, because a refactor may not reorder. **OFF-STATION IS THE POINT AND HAS
ITS OWN INSTRUMENT:** `node tools/verify-bloom-surface-offstation.mjs` (`--control`
required) — at every station `at(u, v)` reproduces the captured point exactly AND its two
skin vertices are found exactly in the emitted stream (3,360 stations, 5,600 vertices);
between stations |dP| shrinks 10× per decade on every arm (Lipschitz, no jumps).
**THE OUTLINE IS C0 AND THE EVALUATOR INHERITS IT, AT TWO SEAMS, NEITHER RULED:**
`halfWidthAt` is a `Math.max`, and the surface's tangent breaks by **44.54° at
u = 0.057939** (root blend meets core) and **73.73° at u = 0.999562** (the cap's terminal
ramp meets the last flat segment — new, and the sharper of the two). **u = 0.800 is NOT a
seam on this tree** — the discovery session measured it on the pre-session-32 cap law;
premises from a stale tree are hypotheses, and this one moved. The bracket detector also
fires on the tip's steep SMOOTH taper (26 of 28 candidates, 0.002–0.012° apart); only the
one-sided tangents classify a seam, and the tool reports only genuine ones. **THE FIELDS
ARE NOT BUILT** (Eva's Q2/Q3): on a plain petal `buildVoronoi` reads neither `d` nor `T`
(`flowField` is null unless `cleftCfg && aniso > 1`), strands and bones read only
`petalHalfWidth` / `ribInnerEdge`, and `d`'s one reader is a 1e-3 cleft-wall epsilon in
space colonisation — the briefs, with the proxy's 30% overstatement near the base and the
flat/metric/geodesic divergence to 2.236 under max cup, are §5 of
`docs/bloom-session-37-outcome.md`. **THE VORONOI COST IS MEASURED FROM THE FLOWER'S OWN
EMITTER, AND IT CAPS THE FEATURE:** `node tools/bloom-voronoi-cost.mjs` drives the real
page with `flower.js` served plus a hook (the quality gate's mechanism) and regresses the
per-petal live delta on the added petal's OWN ring points across densities 3..12 —
**20.016 triangles per ring point, R² 0.99984**, intercept 3,191 (rim + strands, which do
not port). The discovery's estimate assumed 30 ring points per cell; real cells carry
**43** (44 cells, 1,890 points at density 7), so a ported petal is **37,830 triangles —
16.1× today's 2,356 — and the 1,500,000 budget holds at most 39 petals with Voronoi on
every one** (27 at density 12, 59 at density 3). Above the shipped 8, under one whorl of
40, 6× short of the 240-foot head. A fact about the feature for Eva to rule on before the
port is scheduled. Two consumers were already waiting in writing: the port, and
`bloom-sagitta.mjs`'s 3D margin. No frozen phase owed; nothing moved.

**THE RIM HAS AN ARC LENGTH, THE SURFACE DECLARES ITS OWN TANGENT BREAKS, AND THE FORM
ONSET IS ONE OF THEM** (session 38, PR 1 — read `docs/bloom-session-38-outcome.md` §A before
touching `petalRim`, `slopeBreaks` or the onset ramp). `petalRim(surface)` in
`bloom-geometry.js` answers, per margin (v = ±1), where the rim is in space and how far along
it a point sits — `sAt(u)`, `uAt(s)`, `pointAt(u)`, `length()`, the terminal face's width —
as the chord length of a dense polyline (`RIM_SAMPLES` 4096 cells) with every tangent break
the surface declares inserted as a node and a self-similar graded patch around each break
and the apex (the n ≠ 1 apex power laws have UNBOUNDED slope at their own points, and a
uniform cell containing one is cut by a chord however fine the grid). `sAt` appends `u` as a
node, so the arc between two `u` is NEVER less than the chord — an identity, not a tolerance.
**THE PROOF IS CORRESPONDENCE, NOT INERTNESS** (nothing calls it yet, so "0 floats moved" is
worth nothing): `node tools/verify-bloom-rim-arc.mjs` (+ `--control`) ties the query to the
EXPORTED mesh's own rim — every rim-strip vertex found exactly in the emitted stream at every
station, both margins, 64 states × 2 modes — and states the residual: the reported length
exceeds the mesh's 56-station polyline by at most **0.90% LIVE / 0.75% EXPORT** (the mesh's
chord deficit), and the query's own error is bounded at **4.0e-4 mm LIVE / 1.5e-4 mm EXPORT**
on the worst state (all form max × buckle f 7 × n 3.00) from three measured doublings plus
the tail the measured order implies. **THE CONVERGENCE ORDER IS NOT A WITNESS FOR THE SEAM
NODES** — a kink cut by chords reads any order at the fine end (2.50 measured with no nodes
at all); R5's independent detector on the rim CURVE is, and the control strips the declared
breaks. **THREE FINDINGS, RECORDED NOT RULED:** the FORM ONSET at `FORM_ONSET_END` = 0.30 is a
tangent break of the shipped sheet on every cupped, rolled or buckled petal — 24°/55° at the
two margins of FORMED, 36° at cup 1.2, 35° at roll 330, in both modes — a third C0 seam
beside session 37's two, and a smoothed ramp would be a partition event; the TIP SEAM MOVES
WITH THE MODE (LIVE 0.999562 at the 0.15 mm mesh floor, EXPORT 0.992424 at the 0.8 mm print
floor — the brief's figure was the live one); and under curl + twist THE TWO MARGINS DIFFER
IN LENGTH by up to 8.09 mm, so a lobe layout must say which margin's `s` it reads. Cost is
3–40 ms a petal at 4096 cells; PR 2 sizes `samples` from the tool's table. The slot payload
for Node-side instruments is `tools/bloom-first-slot.mjs`, one copy, read by the off-station
tool and this one.

**LOBES ARE CUT INTO THE RIM, THE LADDER ACCEPTS A RESOLUTION DEMAND, AND THE RIM HOLDS TWO
LOBES AT NU 56** (session 38, PR 2, under Eva's ruling amendment — read
`docs/bloom-session-38-outcome.md` §B, and §B10 first, before touching `widthProfile`'s lobes
block, `bladeStations`, the L family or block 29). `lobeDepth` (0–1 of the BASE half-width,
default 0 — the guard, hidden and inert at 0), `lobeCount` (2–10), `lobeCoverage` (0.10–1.00 of the
rim between the root blend and the tip cap, as ARC LENGTH on the lamina from the tip end) and
`lobeTipShape` (0.50 pointed – 2.00 flat-topped, its own control, never `petalTipShape`) in a Lobes
drop-down inside Petal shape. **CUT IN, NEVER BUILT OUT**: inside the window the half-width is
`base · (1 − cut)`, outside it the base's own closure (a BRANCH — the GATED rows are bit-identical
to the default); the stations are `rimArcTable()` on the base outline; the pitch is millimetres and
its floor `max(sheet, MIN_FEATURE_MM)`; the depth cap `1 − TIP_HALF_MM / min base half-width over
the sinuses` keeps the outline single-valued. **THE CUT LEAVES THE SURFACE ALONE**: cup, cup
gradient, buckle and the apex sweep read the BASE width `hb` on a lobed row (the first cut let the
buckle read the cut width: 63 pairs, one at every sinus).
**THE FIRST SHEET STOOD ON A SAMPLING FLOOR AND EVA RULED IT A STAIRCASE**: 3.0 rows per lobe at
eight lobes, 4.2 at six, three tip shapes as three identical triangle waves — the buckle's own f 7 at
NU 28. **THE AMENDMENT: the turning-rate ladder remains the ONE place rows are placed, and it now
ACCEPTS A RESOLUTION DEMAND from the rim feature and satisfies it** — no second placer, no station
inserted behind its back. **THE FLOOR IS DERIVED, 11 STATIONS PER LOBE UNDER THE LADDER'S PLACEMENT
(10 uniform)**: `node tools/bloom-lobe-resolution.mjs` — every tip shape's BROAD feature (the round
sinus of 0.50, the flat crest of 2.00, either of 1.00's) must span two station gaps to draw as a bend,
and every pair must separate past both drawings' chord error; the ladder's rows land on the shoulders
and leave the round bands' centres the widest gaps, and the binding shape is the DEFAULT 1.00. A
height comparison alone passed at 4 and the sheet had already refuted it — a polyline through four
points differs in vertex heights without differing in shape. **THE CONSEQUENCE, STATED PLAINLY: TWO
LOBES.** The demand is `count × 11` rows in the window; the ladder's capacity for a window is its 39
free rows less what its own gap bound (1.40 × uniform; uniform at the buckle's f 7) needs outside it
(`ladderWindowCapacity`): 27 at the default coverage, 31 at maximum, 22 under buckle f 7 — 2 lobes
everywhere on the default petal, 1 where the window is short, NO ROOM by the pitch floor on a 20 mm
petal at coverage 0.10. The ruled 2–8 / 10-at-max was issued without the floor under it and does not
survive it; three lobes at maximum coverage are one constant away (the tip's 1.40 bound giving up two
rows), not taken. **HOW THE LADDER SERVES IT**: region counts first (the window raised to the demand
and held at the capacity; the stretch and the tip split by the base measure's masses, each raised to
the bound's minimum), then each region placed at equal increments of the SAME measure; the gap
bound's blend target is uniform within each region with those counts. The first implementation (a
factor on the window's increments, the old global-uniform blend target) was caught by A8 at 1.62 ×
uniform; the region form reads exactly 1.400 on every lobed row and the plain path is today's to
the bit. **THE APEX IS `petalTipShape`'s, UNTOUCHED** (measured, both modes): the window ends at
`uCap` on a crest where the cut is exactly 0; the join is tangent-continuous at tip shape 1.00 and
2.00 and a corner at 0.50 (39.7° at two lobes, 81.4° on the six-lobe triptych) — the pointed law's
own crest derivative, which is what reads as a tooth reaching the apex; options costed in §B10.3,
none taken. **THE CENSUS IS THE VERDICT AND A PAIR COUNT IS A PROPERTY OF THE TESSELLATION**: nine
block-29 rows over folds main declares are in `SELF_INTERSECTION_XFAIL` with BOTH counts (the ninth is
the SHEET's, not the lobe's — a 20 mm petal at a 2.40 mm sheet folds at the root blend with no lobe at
all, 72 pairs / 0.1755 mm on main's own geometry, which no row on main names because the matrix varies
one control at a time; X2 found it on the pitch-floor row), and `node
tools/bloom-lobe-composition.mjs` — the named lobes × cup / lobes × buckle hand check — builds each
twice and reports the nearest-site distance (every lobed site within 0.70 mm of a plain one; 0.000
where the pairs are the root blend's or the stigma's), REPORTED never bounded; cup 0.40's and buckle
0.30 f 3's plain hairline contacts are sampling coincidences of the stations against a crease — the
buckle row reads 0 lobed, the cup row 3 span-0 touches on other petals (declared, X1 says when a ladder
change lands 0 there again).
**THE CONNECTEDNESS GATE RE-READS A MULTI-COMPONENT ROW AT HALF THE CELL** before calling it detached
(the flower gate's rule, arriving on a measured case: one cell, one 0.15 mm² tip triangle with ten
vertex-sharing neighbours, one piece at every cell below 0.6). **`verify-bloom-surface-bytes.mjs`
GAINED `--movers <regex>`**: a feature that adds rows cannot claim 0 moved over the whole matrix, so the
movers are predeclared and must move, the holders must hold, and both counts print. **A ROW THAT SWEEPS
EVERY CONTROL IS A MOVER OF ANY CONTROL A FEATURE ADDS** — `ALL MAX` takes `lobeDepth`'s maximum and is
a lobed row on the branch; session 38's first predeclaration left it off and the tool failed the run on
it rather than closing over 634 "holders" one of which moved 3.5 million floats. `frozen/phase24`
is the 624 rows at `59c0657`. The demonstration is `node tools/shot-bloom-lobe-floor.mjs <dir>` —
fifteen macro images with print preview ON, through the capability hook for the below-floor states
(`lobeSamplesPerLobe`, `lobeExactDemand`; no control reaches under the floor, which is the point) —
not a sheet.
**A PLACEMENT DECIDED BY A STRICT COMPARISON OF TWO VALUES EQUAL BY CONSTRUCTION IS DECIDED BY THE
LAST BIT, AND THE LAST BIT IS NOT THE SAME IN EVERY ENGINE** (session 38, §B10.7 — X0 caught it on
three lobed rows: the page's STL and the Node rebuild of the page's own state differed by 0.002 mm at
2,880 / 28,014 floats). The ladder's cumulative measure is transcendental at every term and reads
8.1e-13 apart between V8 12.4 (Node) and V8 14.1 (the gate's Chromium) on every petal — harmless
until a discrete decision sits on it: the region's last station was asked for at `cA + (cB - cA)`,
which is `cB` give or take an ulp, against `cB` being one of the measure's own samples, so the search
landed on the sample in one engine and one past it in the other (a whole ladder sample, 5.5e-4 in
`u`, measured); and the gap-bound blend is a bisection to 2^-60. Under a demand the last station is
asked for at `cB` itself and the blend is floored to 1/4096 (`LADDER_BLEND_GRID`); the plain path is
untouched to the bit. **The plain blend carries the same exposure and it BINDS on 348 of 1,226
row-modes of the live matrix** (measured), below `fround` so X0 has never seen it; flooring it would
move those bytes and is not this PR's. Fourth instance of a discrete decision on a continuous
quantity here; do not write a fifth.

**`LADDER_MAX_GAP_FACTOR = 1.4` IS TYPED, IT CAPS THE LOBE COUNT AT TWO ALL BY ITSELF,
AND THE SEAM FLOOR SILENTLY DISCARDS THE LADDER ON THE INCURVE ROWS** (session 39,
discovery — read `docs/bloom-session-39-outcome.md` before touching `ladderGapFactor`,
`ladderOutsideMinima` or `bladeStations`' blend; `node tools/bloom-ladder-gap-bound.mjs`
reproduces every figure in ~45 s with no browser). **THE CONSTANT IS NOT DERIVED:** its
definition carries no comment, the commit that added it describes `ladderGapFactor(f)` as
`NU / (BAR * f)` with no `min` and no 1.4, session 32's outcome doc never names it, and
its ONE number in `bladeStations`' header — *"it costs the apex nothing at all (0.1025 mm
with the bound and without)"* — is the WITHDRAWN live scratch-tree figure, quoted 59 lines
below the paragraph in the SAME comment that retracts it by name. That paragraph also
says *"at the frequency cap the minimum falls 8.00 -> 5.71 with this bound"*, which is
false of the shipped code: `ladderGapFactor(7)` is exactly 1 and the minimum reads
**8.00**. **THE STATED REASON IS MEASURABLY NOT WHAT IT DOES** — the buckle's own
requirement is the OTHER arm of the same `min`, so removing the 1.40 arm takes **0 of 68
buckled row-modes** below `BUCKLE_ROWS_PER_CYCLE_MIN` (8.00 either way). It binds only
where nothing asks for it: f ≤ 4 and f = 0. `56/(8*5) === 1.4` to the bit, which no doc
claims and which would be an extension rather than a derivation anyway. **WHAT IT ACTUALLY
DOES, measured over 1,332 row-modes:** it constrains 197, changes a sagitta zone on 199 —
**worse on 103 and better on 87**, noise in both directions — and is worst at
`petalTipShape` 3.00, the ceiling Eva ruled reachable: **0.1341 mm against 0.0090 in
EXPORT (14.9x)** on the longest, widest petal. On the shipping default it is inert (the
plain ladder reads 1.295 x uniform, under the cap). **IT IS TWO JOBS UNDER ONE NAME** —
the blend's bound, and `ladderOutsideMinima`'s RESERVE, which is the only thing capping
the lobe count. Remove the arm and the count goes **2 -> 3 at coverage 0.40, 0.80 and
1.00** (30 of 66 lobed row-modes build more), at **11.33 stations a lobe, still above the
floor**, for **+0.0092 mm of EXPORT apex chord error and +0.0550 mm LIVE**. **THREE IS THE
CEILING AT FLOOR 11 WHATEVER THE BOUND** — `NU - HELD_ROWS = 40`, the two outside regions
cannot take less than one station each, `floor(38/11) = 3`; a fourth is arithmetic, not
the bound. Removing the arm ENTIRELY is not free: at coverage 0.40 the tip cap drops to 3
stations and the LIVE apex goes 0.0712 -> 0.2462 mm, so **the reserve needs its own owner
and a chord-error bar in mm, not a ratio shared with a bound that has nothing to do with
it.** **THE FLOOR OF 11'S STRUCTURE IS DERIVED AND ITS LEVEL IS NOT:** clause (i)'s "two
segments inside a broad feature" is sound and its threshold 2 is not a tolerance, but the
BAND is typed at one tenth, and the floor moves as ~1/sqrt(t) — **15 / 13 / 11 / 9 / 8 / 7
/ 6 at t = 0.05 / 0.075 / 0.10 / 0.15 / 0.20 / 0.25 / 0.30**, which is 2 / 2 / 3 / 4 / 4 /
5 / 6 lobes. The eye stops reporting a difference about where t = 0.15-0.20 puts it.
**AND THE DEMAND IS A WINDOW TOTAL WHERE THE CRITERION IS PER PERIOD** — the first durable
rule inside the lobe feature's own demand: at three lobes the ladder hands 12/11/11 and
the topmost lobe reads clause (i) **1.93 against the bar of 2** on the builder's own
stations at the default tip shape, while the model the floor was derived on predicts 2.20.
**THE SEAM FLOOR DISCARDS THE LADDER, AND A8 ALREADY RULED WHY IT SHOULD NOT:**
`bladeStations`' own `widest()` opens with `r[0]`, the seam-to-first-blade-row offset the
blend CANNOT move (`mix()` keeps every held row), so wherever `seamStep >= 2` the cap is
unsatisfiable for every blend, the bisection lands on 0 and the blade is placed **exactly
uniformly** — **34 of 36 seam-shifted row-modes, layer 0 alone**, among them `DOME: the
INCURVE TARGET` flat and at rise 0.5 and the CURL / SPHERE / STAMENS / GYNOECIUM rows over
it, costing **0.0660 mm of EXPORT apex chord error against 0.0041 with the ladder (16x)**.
The harness's A8 excludes that gap by name ("placed by the clearance law and PINNED by
A7"); the geometry's `widest()` was never given the same clause — two owners of one
predicate, in the same function as §9b(i)'s duplicate-expression finding. **FIXED IN PR
TWO OF THIS SESSION — see the block below.** **AND THE PARKED APEX JOIN GETS
SHARPER WITH THE THIRD LOBE:** the corner at `lobeTipShape` 0.50 is the pointed law's own
crest derivative, `pi * depth * h / pitch`, so a third lobe takes the pitch 7.14 -> 4.76 mm
and the join **39.7 -> 55.9 degrees**; tangent-continuous at 1.00 and 2.00 at both counts.
The image is `docs/img/lobe-count-trade.png` (floors 11 / 8 / 6 at 3 / 4 / 6 lobes, macro,
print preview ON, same-tree control 0 px, rendered on a scratch tree with the arm
removed).

**AND IT IS FIXED — `widest()` NO LONGER COUNTS A7'S GAP, AND A8 NOW ASKS THE EMITTED ROWS
RATHER THAN THE MEASURE** (session 39, PR 2, Eva's ruling 3 — read §11-§14 of
`docs/bloom-session-39-outcome.md` before touching `bladeStations`' blend or A8). The
geometry's gap measure opens at `i = 1`: that is A8's own exclusion-by-name given its
matching clause in the geometry rather than a second rule, so the two owners of that
predicate stop disagreeing. `bladeStations` takes an optional `report` and declares the
BLEND it landed on; `buildPetalInto` puts it on `bladeLadder`.
**THE FIRST VERSION OF A8'S NEW CLAUSE WAS CIRCULAR AND WENT GREEN ON THE MUTATION IT
EXISTS FOR.** It read the BUILDER's own raw widest gap — and under the mutation that IS
`r[0]`, which does exceed the cap, so the defect handed over the number that excused it.
Session 38's `seam-floor-removed` lesson, one function later: **a clause that asks the
defect whether it fired asks nothing.** The shipped clause reads the gap OFF THE EMITTED
STATIONS, which A8 already computes for the buckle bar, and asserts the geometry's own
contract — **a blend below 1 implies the emitted ladder sits AT the bound**, because the
bisection returns the LARGEST admissible blend. ONE DIRECTION (the converse is false at
the knife edge where the base measure lands exactly on the cap and the early return takes
it unblended), and **the slack is DERIVED, not typed**: one step of `LADDER_BLEND_GRID`,
now EXPORTED and imported by the harness rather than restated, because each gap is linear
in the blend with a slope under 1 in `u`. **A BLEND OF 0 IS LEGITIMATE at the buckle's
frequency ceiling**, where the bound IS uniform and the emitted ladder is at it — a clause
written as "the blend must not be 0" fires on every `buckleFreq` 7 row and says nothing
about the defect. Checked over the whole live matrix, both modes, every ring: A8 is silent
on the fixed tree and the emitted widest never passes the bound. The mutant is
`widest-counts-the-seam-offset` (22 in the apex table, all green) and its witness is the
builder's declared blend on the seam row — 0 on the mutant, 1 on the clean tree — never
the assertion it names.
**THE PARTITION: 157 MOVED / 509 HELD over the 666-row live matrix**, predeclared from a
per-(ring, slot) sweep of `petalSurface` + `bladeStations` that builds no mesh, confirmed
by `node tools/verify-bloom-seam-bytes.mjs --base <worktree> --change widest --matrix live
--expect 157/509 --control --control-mode`. **0 rows whose class differs between the
modes**, the FOOT identical on every row, and the shipping default bit-identical by
branch. A THIRD sweep counts the population the mechanism bounds it by: **160 rows carry a
seam step of 2 or more — the seam session's own mover count, reached by an instrument
sharing no code with it — the 157 are all inside it, and the three that are shifted and do
NOT move are named** (`ALL MAX`, `LOBES: x 3 whorls`, `LOBES: x CONTINUOUS x 3 turns`: all
lobed, so the demand floors the blend to `1 / LADDER_BLEND_GRID` and it is 0 on both trees).
**`frozen/phase24` is 156 moved / 468 held of its 624**, predeclared the same way; it
already joins the definitions-reproduce-bytes-do-not class from the seam change, so this is
an overlapping set rather than a new kind of debt.
**X1/X2 CANNOT FIRE, CHECKED BEFORE THE CI CYCLE RATHER THAN AFTER IT:** the census run in
Node on both trees over all 157 moved rows reads **0 pairs on every one of the 85
undeclared movers** and **non-zero on every one of the 72 declared** — 20 declared rows'
counts move, in both directions, which the xfail list does not gate (#213). `node
tools/bloom-smoke.mjs --conn` is clean, export and flood fill both.
**THREE CLEFT ROWS' TRIANGLE COUNTS MOVE** (`x 3 layers` 85024 -> 85344, `x CONTINUOUS x 3
turns` 84944 -> 85424, `x 6 layers` 170816 -> 171456) — `trimPanels()` splits at a ROW
INDEX, so ANY ladder change can move it, which is why the declaration table in
`verify-bloom-seam-bytes.mjs` is now PER CHANGE (`--change seam|widest`) rather than per
tool: that file is named for its first caller and the tool is not. **No frozen phase is
owed** (no row added or removed).
**THE GAP-BOUND TOOL'S §5 IS NOW THE STANDING WITNESS RATHER THAN THE FINDING**, and §2's
census is RE-MEASURED as §9a said it was owed: seam-shifted row-modes placing the blade
exactly uniformly go **34 -> 0**, the ones keeping a real ladder **2 -> 34**, and the
1.40 arm's own cost reading REVERSES — apex worse with the arm on **87** and better on
**101**, where main read 103 / 87. **Nothing in §1 moves**: 1.40 is still typed, its
stated reason is still not what it does, and it still caps the lobe count on its own, so
ruling 2 stands unchanged. **That tool's §5 print was corrected in the same commit**: the
"uniform at the frequency ceiling" and "uniform with the seam floor binding" classes
OVERLAP by 2 row-modes, which did not matter on main and is all that is left on the fixed
tree — the uncorrected line reports a surviving defect on a tree where the defect is gone.
**THE WALL INSTRUMENT CANNOT BE REACHED BY THIS, AND IT IS MEASURED RATHER THAN ARGUED:**
all twelve rows of `tools/bloom-wall-thickness.mjs` read `seamStep` 1 (they vary cup /
roll / twist / curl / buckle, none of which reaches the turn, the sheet or the length), so
V1-V5 and `SELF_XFAIL` are bit-identical. And the buckle's bar cannot be broken by
arithmetic: the emitted widest is bounded by `ladderGapFactor(f) / NU`, so rows-per-cycle
is at least `NU / (f * gapFactor)` — exactly 8 where the bound is the buckle's own arm,
and `40 / f >= 8` where it is the 1.40 arm, which only binds at `f <= 5`.

**THE SHIPPED RIM MODEL IS `A` — THE TREATMENT TERMINATES AT THE APEX — AND MODEL B
DISSOLVES THE JOIN WITHOUT DISSOLVING THE CORNER** (session 40, discovery; read
`docs/bloom-session-40-outcome.md` before proposing any lobe re-architecture, and run
`node tools/bloom-lobe-model-b.mjs` — it reproduces every figure in seconds with no
browser). **MODEL A, established as an IDENTITY rather than read off the code**: the
lobed profile is `Object.is`-equal to the PLAIN petal over `[uCap, 1]` on 4001 of 4001
samples in BOTH modes, `windowU[1] === uCap` exactly, and the cut at `uCap` is exactly
0. **MODEL B** — lobes at even arc intervals along the WHOLE rim (base, up one margin,
across the terminal face, down the other), coverage measured from twelve outward —
removes the apex boundary by construction: the rim's midpoint is the middle of the
terminal mini-face, which is not a point of the margin, so there is no
treated-against-untreated turn to measure. **BUT THE CORNER CLASS SURVIVES AND MOVES TO
THE BASE**, and the shipped window has TWO of them, the unreported one being the
LARGER: at `lobeTipShape` 0.50 the join at `uCap` reads **−39.748°** (reproducing
§B10.3's −39.7° through a different instrument) and the window's LOWER end at `u0`
reads **−44.743°**, because the crest's arm slope is `π·depth·h/pitch` and the base end
is the wider. **A session opened to fix the 39.7° corner would be fixing the smaller of
two, at the end Eva did not complain about.**
**`lobeTipShape` CANNOT POINT THE NOTCH, AT ANY VALUE, AND THAT IS AN IDENTITY OF THE
LAW**: the cut is `sin(πx)^{2q}`, which about the sinus is `1 − qπ²e² + O(e⁴)` for
EVERY exponent — parabolic at its minimum whatever `q` is — so **the notch's included
angle is 180° across the whole range and beyond it**. All `q` buys there is a RADIUS,
`pitch²/(2π² q·depth·h)`, and it tightens from 2.26 mm to 0.57 mm at the same end of
the control that flattens the crest from a 94.2° corner to nothing. The two features
move in OPPOSITION, so one control cannot carry Eva's "acute" (which is acute at BOTH
features — a serrate margin is triangular teeth with sharp sinuses). **Widening the
range does not fix it; the FAMILY is what is wrong.** A triangle wave at the same depth
and pitch gives 114.7° included at crest AND sinus. Two costed options in §1 of that
doc, neither built: one control on a round↔triangle family (a partition event on every
lobed row, retires `lobeTipShape`'s meaning), or two exponents (strictly more
expressive, reaches crenate and dentate, and is a second control over one region —
session 32's registration rule, so Eva's ruling and not a measurement).
**DEPTH STAYS PROPORTIONAL, AND THE FLOOR THAT BINDS IS NOT THE ONE THE BRIEF NAMES.**
A proportional cut essentially never reaches the OUTLINE floor at a notch (0 of every
row at or under the shipped `depthCap`, both modes) because it shrinks with the width
it cuts; ABSOLUTE millimetres SEVER the blade — zero half-width at `u` 0.999 at depth
0.30 on five teeth, 0.665 at depth 0.90 — which is out of scope at any value. What
fades toward the apex is the **RELIEF**, against `max(sheetThickness, MIN_FEATURE_MM)`
(`lobePitchFloor`, one owner): 2.37 / 1.92 / **0.93** mm across three notches at depth
0.30, so the apex-most is under the floor while the base-most is twice over it — and it
fades SMOOTHLY, not at a cliff. **AND COVERAGE CANNOT MITIGATE IT**: Eva's coverage is
measured from TWELVE outward and excludes SIX, so the apex is the one arc coverage
never removes; a coverage stopping short of the fade point would have to be an ANNULUS
excluding twelve. **At an even count the apex notch lands on the terminal face, which
is at the print floor in BOTH modes (0.15 live / 0.80 export), so it is FLATTENED** —
which makes the parity coupling a printability statement and not only a look: odd
counts put a crest at twelve and work, even counts spend their apex notch on a floor.
**THE SAMPLES-PER-LOBE FLOOR IS A FUNCTION OF THE SHAPE AND IT PEAKS IN THE MIDDLE**
(`node tools/bloom-lobe-resolution.mjs --q=<list>`, whose clause (i) is now reported
PER SHAPE): **10 / 11 / 8 stations a period at `q` 0.50 / 1.00 / 2.00** under the
ladder, 7 / 10 / 6 uniform. The brief's hypothesis was right that it varies and wrong
about the direction — **the acute end needs FEWER, not more**, because a corner does
not need resolving and what does is the ROUND band, whose narrowest member sits where
neither feature is pointed. So a demand carrying SHARPNESS is worth 2–3 teeth at the
flat end. **THE COUNT CEILING, with the shipped `bladeStations` actually run on both
models**: Model A 1 / 1 / 2 / 2 at coverage 0.10 / 0.40 / 0.80 / 1.00 — `widest()`'s
correction did NOT move it, structurally, because `ladderWindowCapacity` reads only
`HELD_ROWS` and `ladderGapFactor` and never calls `widest()` — against Model B's
**2 / 3 / 5 / 6**, demand met at 11.4–11.9 rows a period. The RESOLUTION floor binds
from below at every coverage on both; the print pitch floor never binds on the default
petal in either. **SERRATION IS NOT A SLIDER POSITION ON THIS TREE and no petal length
reaches it** — the cap is in ROWS, not millimetres, so a longer petal buys pitch and no
rows; `docs/img/serration-range.png` (`node tools/shot-bloom-serration-range.mjs`)
photographs that as its first row and puts Eva's counts beside it through the
capability hook, labelled non-shipping with the stations per lobe on every caption.
**ZERO BYTES OF GEOMETRY: `bloom-geometry.js`, `bloom-registry.js` and `bloom.js` are
untouched by session 40.**

**THE FOOT-TO-BLADE SEAM HAS A DERIVED CLEARANCE, AND THE "ROOT BLEND" DIAGNOSIS IS
SUPERSEDED** (session 38, Eva's ruling — read `docs/bloom-foot-to-blade-seam-outcome.md` before
touching `bladeStations`, `seamClearanceMm` or A7). The defect session 35 filed under the
root blend is an **offset-surface fold at the foot-to-blade kink**: every site on the top
skin at the ring radius at `dz = t/2`, both triangles of every pair a seam quad, zero pairs
at zero tilt, and a **SINGLE layer at tilt 75 / length 20 / sheet 2.4 folding 376 pairs with
no layers involved at all**. Layer count was a proxy for shorter petals and stacked tilt.
**All three candidates in the brief are disqualified and the doc records why in those
terms** — the foot already scales with the petal (candidates 1 and 3 move the count by at
most 8 pairs either way), and spreading a width change along the blend acts where the fold
is not, measured worse at every value and moving the default's bytes through
`ROOT_BLEND_END`. **The brief was written from an inferred mechanism; do not re-derive the
dead branch.**
**THE LAW IS `s1 > (t/2) * sin(theta)`, DERIVED, NOT DIALLED** — from where the seam panel's
RIM crosses the foot's top plane (the algebra is in the geometry's own header). The naive
offset-corner bound `a*tan(theta/2)` is **necessary and NOT sufficient**: at exactly that
value the tilt-75 state goes **376 -> 632 pairs, every site at z = t/2 EXACTLY**, because
the row lands coplanar with the foot's top skin. **The gap between the two bounds is exactly
`1 + cos(theta)`** — 2 at a shallow kink, 1.906 at the shipping tilt, 1 at a right angle,
which is the chord cost of the mesh drawing the seam as a flat chord where the bound assumes
a mitred corner. Swept against the census, **every state flips to exactly zero between
k = 1.0000 and k = 1.0005** across three turn angles, two sheet thicknesses and two layer
counts; at exactly 1.0000 all four probe states read the SAME 64 pairs, which is the equality
touching rather than geometry.
**REDISTRIBUTE, NEVER PILE, AND STRICTNESS COSTS NO EPSILON.** The held block keeps the
uniform ROW LATTICE and simply STARTS LATER — the held stations are `(m + i) / NU` for the
integer `m` the builder declares, still one row apart, so nothing can stack against a floor.
The first blade row is **the first lattice station strictly beyond the clearance**, so the
margin is one row rather than a constant chosen because the count reached zero. `m` is 1
wherever the floor does not bind and the code then takes the same `uniform.slice(0, held)`,
so **the shipping default is bit-identical by branch**.
**A7 IS RE-DERIVED ONTO THE LATTICE AND RUNS PER RING** (only inner whorls bind — three
layers at the defaults turn 25/37/49 degrees and only the innermost does). Nothing relaxed:
it now also pins the seam step, the STRICT clearance on the emitted station, the clearance
LAW (restated in the gate — see below), the mode-free half-thickness, and the clamp as a
biconditional. **A8 gave up its leading term and it was VACUOUS before**: that gap was always
exactly `1/NU` and could never be the widest. **`CURL_START_MIN`'s CONTROL bound is
untouched** (a bound moving with the tilt is one control reaching into another's range) while
the floor the LAW applies becomes the first blade row — relaxing instead would have made
J8's stronger clause SKIP those rows rather than fail them. Measured: the curl-start floor is
**census-neutral on all 15 regressions**.
**A7 COULD NOT SEE A CLEARANCE THAT WAS WRONG, AND ONLY THE MUTANT TABLE SAID SO**:
`seam-floor-removed` (the law returns 0) fired NOTHING, because every clause checked the
ladder against the DECLARED clearance and a zero clearance is declared zero too. The gate
**restates the one-line law** and rebuilds the expected value from the two other owners;
importing `seamClearanceMm` there would mutate with it and check nothing. Second finding:
**`seam-reads-the-live-sheet` is a no-op on any sheet at or above 1.00 mm** — `MIN_FEATURE_MM`
only raises a sheet UNDER it — so the table needed a 0.60 mm row. And `HELD_ROWS` is now the
one owner of `Math.floor(ROOT_BLEND_END * NU)`, which stood in three places and made an
anchored mutation match twice.
**THE CENSUS, 666 ROWS, BOTH TREES, RE-MEASURED AFTER #211 AND #212 MERGED: 87 rows FIXED
to zero, 58 improved, 506 unchanged, 15 WORSE, and ZERO rows went from clean to
self-intersecting.** Declared rows **328 -> 241**; total pairs 1,644,959 -> 1,385,765.
The lobe work moved the same held rows this change moves, so the first sweep's
84/58/467/15 over 624 rows is SUPERSEDED, not carried forward — **a census partition
cannot be re-used across a base it was not measured against.** **The sweep is
CALIBRATED** — against a worktree of main at 1740a2e it reproduced main's OWN declared
count and worst span on **327 of its 328 declared rows exactly**, zero undeclared rows
non-zero; the one exception is `ALL MAX`, whose entry on main says in so many words that
it was never re-measured after #212 gave that row `lobeDepth 1.00`. **The 15 regressions
are REPORTED, NOT TUNED AROUND** (Eva's stop condition) and they are **the same fifteen
rows at the same counts — the new ladder did not move them**: the mum on a hemisphere is
CLEARED (0 -> 0) but **the incurve target at rise 0.5 still regresses, 7,350 -> 9,944**,
worse than the piling patch's 8,641, while its FLAT sibling goes 7,806 -> 510.
**THE INDEPENDENT CORROBORATION IS THE BEST EVIDENCE IN THE REPORT AND HAS ITS OWN SECTION
(§7b of the outcome doc): THREE OF MAIN'S OWN DECLARED LOBE ROWS ARE CLEARED TO EXACTLY
ZERO, AND THEY ARE THE THREE WHOSE ENTRIES NAMED THE ROOT BLEND AS THE CAUSE** — `LOBES: x
3 whorls` (72 -> 0), `LOBES: x CONTINUOUS x 3 turns` (264 -> 0) and `LOBES: ONE lobe by
both caps` (72 -> 0), each 0 lobed AND plain, confirmed by `node
tools/bloom-lobe-composition.mjs` on the merged tree. **The attribution was WRITTEN DOWN
IN ADVANCE by the lobe session, from its own two-sided builds** (lobed and plain sites
identical, so it concluded the pairs were not the lobe's and said whose they were) — a
different session's instrument, measuring a different feature, on rows this session did
not choose. That is worth more than the 87 rows of the partition, which are a closed loop:
this session's sweep, of this session's defect, with this session's instrument. **And the
third row is a SINGLE whorl**, so session 35's `layerCount >= 3` framing could not have
cleared it while the clearance law predicts it exactly — a short petal under a thick sheet
is a large `t/2 sin(theta)` against a short blade.
**THE XFAIL LIST IS RE-BASELINED ON THE BRANCH, AND THAT IS A CHANGE OF MEANING** — it cannot
be a set of pre-existing failures when the session's purpose is to fix 87 of its rows. The
old `(N layers — the root blend)` tag is GONE from every row (A7 asserts the clearance is met
on every ring of every row, 0 violations over the matrix), replaced by the two real classes:
**EFFECTIVE TILT PAST 90 (48 rows** — the blade's own MID-SURFACE lies back over its foot and
no spacing can fix it; the algebra reverses past a right angle) and **SEAM CLAMPED (5 rows** —
the blade is SHORTER than the fold it must clear, the worst asking 9.0840x its own length,
told in the read-out and asserted as a biconditional). **Whether the tilt control should reach
past 90 at all is a separate ruling for Eva.** **The list still does not gate MAGNITUDE** — a
declared row whose count doubles passes silently, which is how those 15 landed without a red;
recorded as issue #213, not built. Every tag is DERIVED per row from the builder's own ladder
records rather than written by hand, and CLEFT (9 rows) is the third class.
**THE FLAT/DOMED ASYMMETRY IS EXPLAINED, AND THE CROSSOVER IS MEASURED RATHER THAN MODELLED**
(session 38, §6b of the outcome doc — Eva asked for the mechanism or the word "unexplained").
The same configuration goes 7,806 -> 510 FLAT and 7,350 -> 9,944 at `headRise` 0.5, and
`headRise` is the ONLY difference between the two matrix rows. The cause is the EFFECTIVE SEAM
TURN: **125.4-128.1 deg on all 120 rings domed against 75.0-89.9 deg flat** (0 of 120 past a
right angle) — **RE-MEASURED on the merged tree and identical**, with `seamStep` identically
{2} on both, so the displacement the floor applies is HELD and the turn is the only thing that
differs. **EXACT REGION ATTRIBUTION on both trees** — by coordinate-matching every
intersecting triangle against `mid +/- n*t/2` and naming it by the rows it SPANS, with SEAM its
own name, 0 unmatched — shows **every pair involves FOOT or SEAM and there is no
blade-against-blade anywhere**; blade terms keep their counts and shift down one index, because
a collision is a property of the STATION and not of the index. So the floor buys one thing and
pays for another: it DELETES the lowest-station panel (the benefit, which is all of the flat
row's 15x) while LENGTHENING the seam panel, and past 90 deg a longer seam panel is dragged
further back OVER its own foot (the penalty). **A CONTROLLED TILT SWEEP WITH `seamStep` HELD AT
2** — so the displacement is fixed and only the turn varies — gives net **-4763, -5015, -4755,
-3020, -723, -722, +103, +2594** as the turn rises, and every net figure equals the measured
census difference EXACTLY. Backward reach in the FOOT'S OWN FRAME (never the global radius,
which reads the first blade row moving OUTWARD at 128 deg on a dome) roughly doubles on the
branch, 2.1x at every tilt. **The crossover is between 115-118 deg and 120-123 deg, MEASURED;
the functional form is NOT determined and no story is offered for it.** Two earlier versions of
the classifier were wrong and are recorded there: classifying by NEAREST row and naming a
triangle by its LOWER row reported a four-thousand-pair jump in "foot on foot" on a tree whose
foot rows are byte-identical to main's.
**THE STOP-CONDITION ROW IS RENDERED** (`node tools/shot-bloom-seam-ruling.mjs <dir>`): the
regressed row and its flat sibling, main against branch, ONE camera sized from the branch and
written verbatim to BOTH trees, PRINT PREVIEW ON with a `shownMode` read-back, whole plus a rim
close-up, settled to two byte-identical frames, **no pixel delta quoted** (two trees, two
servers, two page sessions). It serves both trees over their OWN HTTP servers rather than
swapping modules, because main's `bloom.js` has no seam telemetry. **Read on the renders: the
branch shows NO new visible break on either row, RE-RENDERED on the merged tree against main
at 1740a2e** — the blade roots meet the hub rim with the
deep notches shallower on both — which is what released the merge.
**MODE INDEPENDENCE IS MEASURED, NOT ARGUED: 0 of 666 rows have a `seamStep` set that differs
live from export.** `seamHalfThicknessMm()` is the ONE owner of `max(sheetThickness,
MIN_FEATURE_MM) / 2` — both the clearance and the reported `seamHalfMm` call it, so the live
gate's A7 clause and the clearance cannot drift apart. Row positions are topology and the
export floor may not move them; this is session 32's mode-dependence defect refusing to ship
a third time.
**THE BYTE CLAIM: 160 rows move and 506 hold on the merged tree, PREDECLARED from the
seam-step data before the comparison ran** (157/467 over 624 rows against the old main, now
superseded) — and TWO instruments that share no code reach 160 independently, the byte
comparison's MOVED class and a separate sweep of the builder's own `seamStep` records; the default holds bit-identically, and **the FOOT is untouched on every
row** — measured on
the builder's captured grid, not argued, because J1-J4 and the crowding raster read those
rows. NOT `diff-bloom-bytes --region foot`: that slab is a documented SUPERSET carrying the
UNDERSIDE of the first blade rows, which this change does move. `node
tools/verify-bloom-seam-bytes.mjs --base <worktree> --matrix live --expect 160/506`
is the instrument, with a SECOND control (`--control-mode`) for the mode clause, because a
control that fires only the first leaves the second a log line.
**"TRIANGLE COUNTS ARE UNCHANGED BECAUSE THE ROW COUNT IS FIXED" IS FALSE ON A CLEFT, AND THE
TOOL FOUND IT RATHER THAN A READING OF THE CODE.** `trimPanels()` splits the blade at a ROW
INDEX — the row nearest the cleft onset in `u` — and the two lobes SHARE that boundary row
with the base panel, so moving the stations moves the split and the base loses a row while
BOTH lobes gain one. Measured on `CAPABILITY: cleft x 6 layers`: the split lands at
32/32/33/32/31/31 against main's 32 on every ring, **168,256 -> 170,816 triangles**. It is
**pre-existing IN KIND** — any ladder change can move it, and session 32's own redistribution
acts above `u0 = 0.2857` where the 0.55 onset sits; what is new is that something measures it.
One declared entry with its numbers, failing hard if another row's count moves OR if this one
stops moving. **Do not write "the row count is fixed so the topology cannot move" about a
cleft.** **No frozen phase is owed**
(no row added or removed). **The newest baseline is `frozen/phase24`** (the 624 rows at
`59c0657`, added by the lobe work), and **its bytes stop reproducing on 157 of its 624 rows**
— PREDECLARED from the seam-step sweep of phase24's own rows and confirmed exactly by
`--matrix phase24 --expect 157/467`, PASS, with the foot identical across 5,555,844 captured
values and the same ONE declared cleft triangle-count exception. `frozen/phase23`'s bytes
stop reproducing on 156 of its 596. Both definitions still deep-compare; they join phase17,
phase19 and phase21 in that class.
**TWO THINGS NEITHER SESSION'S GATES CAUGHT, RECORDED AS THEIR CLASS** (§9b of the outcome
doc). **(i) A FEATURE PR SHIPPED A SECOND COPY OF A VALUE THAT ALREADY HAD AN OWNER, AND
THE MERGE IS WHAT FOUND IT:** #212's `ladderWindowCapacity` and `ladderOutsideMinima` each
re-derived `Math.floor(ROOT_BLEND_END * NU)` inline instead of reading `HELD_ROWS`. Nothing
is wrong with the arithmetic and **both sessions' full suites pass on a tree with three
copies** — what it damages is the MUTANT TABLE, because an anchored mutation on the bare
expression matched THREE times and mutated only the first, so `ladder-eats-the-base` was
testing a third of its consumers while reporting a clean fire. Invisible until two changes
to one expression meet, which is what a merge is. A duplicate-expression gate is reachable
with the retired-id scanner's character walk and is RECORDED, NOT BUILT.
**(ii) AN EXACT-EQUALITY BAR ON A QUANTITY COMPUTED BY TWO ROUTES IS A CLAIM ABOUT FLOATING
POINT, NOT ABOUT GEOMETRY — AND AN ITERATION SUBSET CANNOT REFUTE IT.** A7 shipped asserting
`seamFrameResidual === 0`; it is a difference of two COSINES reached by two routes, and CI
went red on `DOME LEAN: EVA_CONFIG x rise 1 x layerTilt 18`, 120 rings each ~1e-16 out.
**It survived every local run because the smoke subset contains no row where the two routes
diverge** — the subset is one row per block and the divergence needs a dome AND a lean AND a
non-default layer tilt together. Measured over the whole live matrix, both modes, 15,938
rings: 4,419 (27.7%) non-zero, worst **1.5 ULP**. The replacement is DERIVED FROM THE
QUANTITY, not fitted: both cosines are in [-1, 1] so the error is ABSOLUTE and its unit is
the ULP — `SEAM_FRAME_RESIDUAL_ULP = 8`, its own declared owner, the observed worst using
19% of it and the `seam-turn-is-not-the-kink` mutant reading 2.41e15 ULP. Where two owners
must agree, compare them through ONE expression (`seamHalfThicknessMm()`, which needs no
tolerance at all) or bound the difference in the unit the quantity carries.
**THIS BOX RAN ~1.8x THE WRITTEN PACE, AND FOUR CI WAITS SIZED OFF WRITTEN NUMBERS CAME UP
SHORT** — measured: `bloom-connectedness` **103.8 and 110.4 min** against the 57.7 recorded
above, `bloom-export-watertight` **189.7 min** against ~111. Same failure mode as the
withdrawn "~44", arriving from RUNNER VARIANCE rather than matrix growth, which is why the
rule is not "update the number" but **size a CI wait off `actions_list` on the workflow's
own recent completed runs, read at the time — never off any figure in this file or any doc.**

**A green connectedness run does NOT endorse the junction under layers** —
measured, not cautious: building the hub at the wrong layer's radius leaves a
whorl joined to nothing and that gate still reports ONE piece, because
consecutive foot annuli overlap each other. `junctionAssertions()` (J1–J6) in
both gates is what carries that claim; do not weaken it on the strength of a
green flood fill.

**EVERY REPORT ENDS WITH A BALL-HOLDER LINE** (Eva, Sep 2) — one line, last thing in the
message, exactly one of:
`WAITING ON EVA: <the single question>` / `WAITING ON MEASUREMENT/CI: nothing needed from
Eva` / `DONE — merged as <sha>. Safe to archive this session.`
A report without it is incomplete, including when the answer is obviously "nothing".
**Eva never merges a PR herself** — the merge is always the session's own final step,
released by her ruling; her only recurring actions are ruling on sheets and clicking
branch deletes. See the charter's "The working loop — who holds the ball".

**A CLOSE-OUT RUNS THE NEWEST BASELINE PLUS THE LIVE PARTITION, NOT THE WHOLE SUITE**
(Eva, Sep 2). The frozen suite is 1,049 rows and grows by the live matrix every session —
quadratic in project age, and an afternoon by session 10. From session 11 a close runs the
NEWEST frozen baseline on both trees (the load-bearing "nothing that shipped before this
moved") plus the live-matrix partition (the only instrument for the region a change
affects). The FULL historical suite runs at MILESTONES only: before any production
publish, or when a change touches the area rule or the export path directly. Baselines are
RETAINED, never deleted, and CI's `--verify-frozen` still proves every one deep-equal on
every push — only their routine byte re-export is demoted. Full reasoning, and what it
gives up, in the charter's "Verification retention" section.

**PER-PETAL ROLES SUPERSEDE SLOT ROLES ON THE FAN, AND NOTHING IS RETIRED**
(Eva, Sep 3). `labellum*` / `hood*` are hidden AND inert under FAN and stay
fully live under RADIAL, so `RETIRED_IDS` does not apply and no migration is
owed. The two position axes are DISJOINT BY PLACEMENT and `Z9` asserts that in
both directions — along with the two code paths the ruling makes unreachable
and which are KEPT so composition stays one predicate arm away:
`roleForSlot`'s THROUGH_GAP arm and `PREDICATES.hoodEmpty`. Restoring
composition is that one arm in `bloom-geometry.js` plus its twin in
`bloom-registry.js`. The fan loses labellum TIP BREADTH outright, because the
per-petal set ships without a tip-breadth row — one row in `ROLE_OVERRIDES`
and one in the registry the day it is wanted. **The panel names both axes by
petal number** (Eva, Sep 3, ruling A): the per-petal groups are drop-downs
inside "Petal roles", and under RADIAL the labellum's and hood's sliders are
two more of them — "Petal 1" (slot 0, the plane's fixed point, at every count)
and "Petal N" for the LAST orbit, `petalGroupCount(n, THROUGH_SLOT)`, so the
rosette reads "Petal 1, Petal 5" at eight petals with the gap the ruling
accepted (the laterals carry no controls). The hood's label is the panel's one
DERIVED summary — `labelFrom(ui)` in `SECTIONS`, `sectionLabel()` the one owner
for the app, the gate and the sheet, and `verifySections()` refusing a literal
beside a derivation. Control ids are unchanged; nothing is retired.

**PETAL ROLES IS THE "ADJUST PETALS AS A GROUP" SECTION AT EVERY DEPTH, AND THE
ONE-WHORL ORCHID IS GIVEN UP** (Eva, Sep 3, from the deploy preview, overruling
the session's "nothing to build"). At one whorl the group is ALL petals: three
DELTAS (`allCurl` / `allCup` / `allTipBreadth`, role `ALL`, the first three
`ROLE_OVERRIDES` rows) riding on Petal form's Spine curl and Cup and Petal
shape's Tip breadth exactly as the Inner trio rides on them above one whorl —
one composition law, nothing owns a number twice. Slot roles need TWO OR MORE
WHORLS IN STEP now (`slotRolesEligible`'s RADIAL arm and the registry's twin,
both flipped): Petal 1 / Petal N are hidden AND INERT at one whorl, still fully
live on RADIAL at 2+ whorls with Layer offset 0 and on the fan as per-petal
groups. Not `RETIRED_IDS` — ids, laws and gate rows unchanged; recovery is one
arm in two files. Where they hide behind the offset the panel SAYS SO: a
section's `hiddenReason` (`when` predicate + derived `text(ui)`, declared once
and referenced by both groups) renders one caption in the parent, `applyVisibility()`
the only thing that shows it, and the panel gate asserts the depth 1↔2
transitions of all three groups and the caption in both directions.
**A green run does not endorse the inertness**: PP7 (geometry keeps the old arm)
is caught at harness load by the two-statement guard, PP8 (all-petals never
inert above one whorl) by Z1/Z5/Z9 on exactly the GATED rows — measured, not
derived. The retirement is photographed as a BEFORE/AFTER pair on
`node tools/shot-bloom-orchid.mjs <dir> [base-tree]`, whose every orchid cell
is now at two whorls in step.

**A GREEN RUN DOES NOT ENDORSE THE PER-PETAL NUMBERING** — measured on six
worktrees, not derived. An off-by-one orbit index and a supersession that
quietly comes undone BOTH export watertight, as one piece, with zero
degenerate triangles, at identical live and export triangle counts and
identical STL byte lengths, and fired NOTHING anywhere in the shipped
instrument until `Z8` and `Z9` existed. Two more (an unconditional per-petal
split, a reversed group order) are BIT-IDENTICAL on every probe row, so there
is not even a byte to diff. `Z7` (the partition is the coarsest that serves
the engaged axis), `Z8` (the group index is the distance from the plane, read
from the emitted azimuths) and `Z9` carry those claims; `Z1`'s
visible-iff-non-empty biconditional is what polices the numbering across the
mirror-line toggle.

**NOTHING IN THIS PROJECT MEASURES AN AZIMUTH EXCEPT J7, Z4b AND Z8** — established
by grep, not assumed. Both STL gates are azimuth-blind by construction, and so
is everything built on them: J1 reads foot frames, J2/J3 read radii, J4 reads
three lengths, J5/J6 read the depth sequence, Z1–Z7 and Z9 read role membership. A FAN
that silently builds a full ring therefore exports watertight, as one piece, at
an identical triangle count and STL byte length, and passes every other check
here — measured on a worktree. `J7` (the arc, the notch, the minimum angular
separation) and `Z4b` (the pairing is a bijection about ONE plane) are the only
witnesses, and a wrong mirror involution is BIT-IDENTICAL, so only Z4b sees it.
Do not read a green run as endorsing an arrangement's azimuths.

**Neither STL gate can see zygomorphy at all** — measured on SEVEN worktrees
across two sessions, not derived: an override that lands on the wrong whorl, a
record that never reaches the blade, the area rule regrouped per foot, an
off-by-one hood index, a slot record that never reaches the blade, the collapse
guard removed, and a size multiplier plumbed into `footRing()` ALL export
watertight, as one piece, with no degenerate triangles and identical live and
export triangle counts and byte lengths. `zygoAssertions()` (Z1–Z6) in both
gates is what carries those claims. Z3 is an EQUALITY and not a bound on
purpose: the regrouping mutation measures 0.9 ULP, which any real tolerance
would pass. The area rule is grouped by ROLE and must stay that way —
regrouping it per foot moves every 40-petal export by 6 ULP, and splitting a
whorl per slot role moves 46 of 264 measured rows, which is why the descriptor
split is CONDITIONAL and why Z5 asserts that collapse in both directions.
**Two of those mutations fired NOTHING anywhere in the shipped instrument**
until Z4 (the assignment is mirror-symmetric) and Z5 existed, and a third was
silent above one whorl until Z6 (a role differentiates the BLADE, never the
foot). Do not read a green run as endorsing any of it.

## Flower generator — print-safety is a hard invariant

The Flower Bloom generator (`flower.html`, `flower.js`, `flower-geometry.js`) is a
3D-printing tool, not only an on-screen visual. STL export and watertight /
manifold geometry are **permanent, non-negotiable requirements** — never treat
them as optional or experimental.

- Every geometry change — new parameters, new petal/spiral logic, sepals, stem,
  leaves, receptacle, anything that adds or alters mesh — MUST preserve valid,
  printable STL export.
- **Export contract:** every primitive is an individually closed solid, so the
  exported STL has **zero boundary edges**. Open shells are never acceptable.
  Overlapping closed shells are fine — the slicer unions them. Build new geometry
  the way the existing code does: closed tubes with end caps, watertight beads,
  sealed slabs/ribbons, and sealed solid blades (top face + bottom face + rim).
  Never add a bare single-sided surface or zero-thickness membrane to the export
  mesh.
- Respect `exportMode`: at export, tube/bead radii and slab/blade thickness are
  floored to the printable minimum (`MIN_FEATURE_MM = 0.8`). Any new solid
  primitive must honor the same floor.
- **Verify before calling a geometry change done:** run
  `node tools/verify-flower-export.mjs`. It renders the page headless, exports an
  STL across a range of configurations (add yours to it), and fails if any export
  has boundary edges > 0. A change is not finished until this passes.
- **Watertight is necessary, not sufficient — also run the geometry-quality gate:**
  `node tools/verify-geometry-quality.mjs`. The export gate only proves manifoldness; a
  petal can be watertight and the WRONG SHAPE (e.g. the un-clefted continuous-margin rim
  skipping a Lobed sinus). This gate measures correctness — margin fidelity (does the
  rendered rim trace the material boundary?), contour smoothness, and uncapped infill
  ends — across the shape × pattern matrix. Known, tracked defects are marked xfail so
  the gate is hard for everything that ships. Add new shape/pattern configs to it.
- **Watertight is not connected either — also run the connectedness gate:**
  `node tools/verify-connectedness.mjs` (issue #43). Two entirely separate closed solids
  also have zero boundary edges, so the export gate would pass a bloom that prints
  detached from its stem. This one voxelises the export below the minimum feature (0.6 mm)
  and flood-fills; more than one region is a FAIL. Read its header before quoting a pass:
  it is a surface-occupancy test over hand-picked configs, not the export matrix. It covers
  the junction corners, the Voronoi region seams, the BARE BLOOM (no stem, no sepals, no
  receptacle override — the shipped defaults, and what every preset is) and every preset by
  name. A row with a known, tracked defect carries `xfail: <issue>`: the gate stays green
  for it, FAILS on any unmarked row, and FAILS HARD when an xfail row starts passing —
  that is the fix landing and the marker must come off in the same commit. Its three
  validity assertions (fresh page per row + whole-state read-back, the tail probe, the
  pairwise sepal comparison) are never covered by an xfail and abort the run.
  `node tools/verify-connectedness.mjs --negative-control` mislabels one row on purpose and
  requires the run to fail — use it before quoting a pass from a changed harness.
- **Control visibility is declared in the registry, and only there.** Every reason a
  control can be hidden is a `visibleWhen` predicate in `flower-registry.js`;
  `applyVisibility()` in `flower.js` evaluates it and is the only thing that sets a
  control wrapper's `hidden`. There are no gating data-attributes on control wrappers, no
  `permanentHidden`/`imperativeGate` flags, and no hardcoded id lists —
  `verify-registry-sync.mjs` fails the build if any of them come back. To change when a
  control shows, edit its predicate; never add imperative code.
  `node tools/dump-visibility.mjs` records every control x the matrix x both tiers, so
  a change that claims not to move visibility is diffed rather than asserted;
  `node tools/shot-panel-matrix.mjs <dir>` is the contact-sheet companion.
- **A deleted control's id is retired forever, and the reservation is enforced.** When a
  control goes, its value stops mattering and its NAME starts: saved designs and shared
  links carry the old key indefinitely, so reclaiming the name later feeds a stale number
  into a control that means something else — silently. Retiring an id is therefore four
  things, not one: delete the registry row and the markup, add an entry to `RETIRED_IDS`
  in `flower-registry.js` (id + the schema version + why), bump `CURRENT_SCHEMA`, and add
  a migration that **deletes the key**. That last step is not optional —
  `migrateDesign()` sweeps keys with no control into `extras` and preserves them verbatim
  on re-save, so a retired id with no delete is carried forward forever by the mechanism
  meant to protect forward compatibility. `verify-registry-sync.mjs` fails the build if a
  retired id collides with a live control id, a live option value or a DEFAULTS key, or if
  no migration deletes it. Never remove an entry from `RETIRED_IDS`.
- **Presets are permanent, named fixtures in ALL THREE geometry gates.** Every shipped
  preset in `flower-presets.js` is loaded by name in `verify-flower-export.mjs` (must export
  watertight), `verify-geometry-quality.mjs` (its petal must trace, stay smooth, cap
  its ends) and `verify-connectedness.mjs` (must export as one piece) — so a preset
  regression reads "preset: thistle", not "config N". A preset is
  authored data (taste), so it is a readable DELTA over DEFAULTS and loads through the
  normal `applyDesign` path; it can never desync from the control set. When you add or
  change a preset, all three gates cover it automatically — just re-run them.
- **Preset thumbnails are a build-time artifact, never rendered at runtime.** Regenerate
  them (and the drift manifest) with `node tools/gen-preset-thumbs.mjs` and commit
  `assets/presets/`; the `preset-thumbs` CI job runs `--check` (a deterministic tris + bbox
  diff, GPU-independent) and fails if a preset's shape drifted without the thumbnails being
  regenerated. The shipped gallery is read-only for visitors; the `?dev` authoring row
  (save-as / export paste-ready source / import) is the tool for editing the set.
- **A correct-looking screen render is not proof.** Geometry can look right live
  and still export broken. Never rely on the visual alone.
- **If a feature cannot be built in a watertight way, STOP and flag it to the user
  before implementing** — explain the conflict and the options. Never ship a change
  that silently breaks export.

## `/print` — the posing and stylizing stage

`print.html` / `print.js` / `print-stem.js` / `print-lines.js` are a staged
build of the print pipeline: take a flower that already exists, pose it, draw
it as line art, and (later) arrange and sparkle it. It is `noindex`, it does
NOT touch the flower or bloom generators, and it exports nothing — the real
generators own geometry and STL, and this page is downstream of both.

Stages shipped so far: the **scaffold** (#150 — viewport, glTF load, the pivot
node's `extras` round-tripping through GLTFLoader), the **pose** (#151 — a
posable stem and a hinged bloom), the **line art** (#153 — silhouette and
crease edges, three sliders, then chained/curated/smoothed into drawn contours
in two weights), a **runtime bundle loader** (#156 — a `.glb` can be
swapped in at any time, not only baked into the page at build time), the
**authored infill** (#157 — cross-hatch and line-flow inside the silhouette),
the **tonal fill** (the silhouette inked solid or graded, veins reserved out of
the fill, a darkness per part), **shape-derived direction** (#163 — one axis per
part), and the **fan** (rays that converge at a part's base and spread toward
its tip — the first family here whose strokes are not parallel to each other).

**TWO BUNDLES SHIP, and the second one is why `/print` can now be judged on a
LEAF.** `flower-test-bundle.glb` (5.7 MB, 78k triangles) is the default and is
still what every gate loads first. `bloom-stem-leaf-bundle.glb` (1.9 MB) is
loaded on demand by `tools/verify-print-tone.mjs` and `tools/shot-print-tone.mjs`,
and it is the first bundle with a LEAF as its own node and its own mesh. **Its
bloom is a better solid and its leaf is a worse one, both measured:** the bloom
has 0 boundary edges (against 12 for the old one) and 5 non-manifold (15), while
the 84-triangle leaf has 16 of its 114 edges carrying a third face — which is
what made the open-outline problem below unmissable.

**IT SHIPS SHRUNK, AND WHAT WAS DONE TO IT IS A COMMITTED TOOL, NOT A MEMORY**
(Eva, Sep 5): `node tools/shrink-print-bundle.mjs <in> <out> [--ratio]`. It
arrived as a 21.7 MB export — 301,152 triangles, NON-INDEXED, a per-face NORMAL
beside every position — and a bundle committed to `main` is permanent, because
this repo forbids history rewriting. Two steps, and only the second loses
anything. **WELD + INDEX IS EXACTLY LOSSLESS** and does most of the work: the
mesh is an STL split, welding by exact position is the same operation
`print-lines.js`'s Topology does at load, and the topology is IDENTICAL before
and after (301,152 tri / 151,060 verts / 451,728 edges / 0 boundary / 0
non-manifold) — 21.7 MB to 5.4 MB. It only works because NORMAL is dropped
first: with a per-face normal on every vertex nothing merges. **DECIMATION** is
meshoptimizer with LockBorder, at 0.25: 75,288 triangles, relative error 3.96e-4
(~0.04 mm on a 95 mm bloom), border still closed, 5 non-manifold edges. What is
given up is the exported bloom's "0 non-manifold" property, which was a
documented fixture virtue and is asserted by no gate. Normals are regenerated
per vertex (smooth, not the export's flat) so the mesh still renders when the
line-art toggle is off and the glTF's own lit material comes back; nothing in
`/print` reads the bloom's normals — only `print-stem.js` reads a normal
attribute, and only from the stem. **Running the tool on its own output
decimates twice** — point it at the original.

**THE PIPELINE ASSUMES TIGHTLY-PACKED VERTEX BUFFERS, AND THAT IS A LATENT
FRAGILITY, NOT A CHOICE ANYONE MADE.** `print-lines.js`'s Topology,
`print-infill.js`'s `_projectPart` and the tone gate's `projectedTriangles()`
hook all read `geometry.getAttribute('position').array` and index it directly —
which is exactly why the extraction is affordable, and which is WRONG against an
INTERLEAVED buffer, where that array is the whole vertex block. Measured, not
hypothetical: gltf-transform interleaves by default, and the first shrunk bundle
came back with the 84-triangle leaf reading as 168 triangles, 2 silhouette edges
and a fill of nothing. `tools/shrink-print-bundle.mjs` therefore writes
`VertexLayout.SEPARATE`. **Any interleaved `.glb` a visitor drops on the page
today would misbehave the same way** — making the extractor interleave-safe is
its own change to a hot path and has not been done.

**MESH SELECTION IS NO LONGER A HARDCODED PAIR.** `print.js` used to draw
`[stem, bloom]` by name, which was indistinguishable from finding them while
every bundle had exactly two parts. It now traverses the loaded root and takes
every mesh except the exporter's `pivot_marker`. Traversal order is the
bundle's own node order, so the two-part bundle still yields exactly
`[stem, bloom]` and every part index in the gates and sheets keeps its meaning.
Under the old list the leaf was in the scene, posed with the stem, and drawn by
nothing.

**The bundle is the input contract.** `assets/print-test/flower-test-bundle.glb`
carries a `pivot` node whose glTF `extras` declare the junction position, the
junction tangent and `rotation_limits_deg`. The page reads its hinge range from
there and NEVER from a constant in the code: re-tuning the constraint is a
re-export, not a code edit, and the gate asserts the slider bounds EQUAL the
bundle's own numbers rather than merely existing. The bundle also ships a
`pivot_marker` diagnostic sphere, hidden by default and restored by a toggle —
hidden via `visible`, never removed, so the node counts still describe the
bundle as shipped.

**The bundle is swappable AT RUNTIME, not only baked in at build time.** A
`.glb` dropped anywhere on the page, or chosen via the file input in the debug
panel, is parsed straight from its bytes through `GLTFLoader.parse()` — no
fetch, no URL — so a different test export (a bloom+stem+leaf bundle, say) can
be tried without editing source and redeploying. `assets/print-test/flower-test-bundle.glb`
is still loaded first via `.load()` so the page is never blank; it is the
default, not the only source. A new load always REPLACES the scene and RESETS
every piece of pose state (bend points, droop, twist, the hinge sliders'
min/max/value) via one `clearCurrentBundle()` — a different bundle has no
reason to share the old one's pivot position or rotation limits — but
deliberately does NOT reset the STYLIZE sliders or the line-art on/off toggle:
those are a rendering preference, not a property of any one bundle's geometry,
and a "weight 3px, detail 60" look is exactly what someone comparing several
test bundles wants carried from one to the next. The one-time event wiring
(drag handlers, hinge sliders, the marker toggle, and the four STYLIZE
listeners) is registered ONCE at module load against mutable module-level
state, so a swap reassigns that state and the already-registered listeners
just keep working rather than needing to be re-bound per bundle — the same
"layer, never a mode" discipline the line-art stage already follows.
**`GLTFLoader.parse()` called directly (not through `.load(url)`) does NOT
catch its own exceptions** — measured against three@0.161.0: garbage bytes,
non-JSON text and an empty buffer all throw SYNCHRONOUSLY out of `.parse()`
rather than reaching its error callback, which `.load()` swallows internally
but a direct `.parse()` call does not. `parseGltfBytes()` wraps the call in a
try/catch for exactly this reason. A failure — bad bytes, or a well-formed
glTF with no `pivot` node — is reported in the debug panel (appended, never
wiping what's already shown) and otherwise leaves the CURRENTLY DISPLAYED
bundle and its pose untouched; it never blanks the viewport and never throws
past the page's `pageerror` boundary. **Keep the gate's synthetic second
bundle's pivot offset MODEST if you touch this test:** it is generated on the
fly via `GLTFExporter` (same real stem+bloom mesh, pivot moved, different
`rotation_limits_deg`), and a large shift moves the bloom enough to change the
re-framed camera's projection of the bend-point handles — which can push one
of them under the debug panel's on-screen footprint and silently fail a drag
that has nothing to do with what's under test. Measured, not hypothetical:
this is exactly what an early version of this gate did with a 12-unit offset.

**The stem deformation is a ruling, not a proposal** (Eva, Sep 5) — see the
header of `print-stem.js`. Do not "simplify" it back into a swept tube: 83% of
the stem's vertices are three LEAVES, and a re-loft deletes them at zero bend.

**EACH STAGE IS A LAYER, NEVER A MODE YOU ENTER.** The line-art stage does not
disable, pause or reset anything the pose stage does; bend points stay
draggable and the hinge sliders stay live while stylized, and the linework
re-extracts from whatever the geometry currently is. The gate asserts this in
BOTH directions (`independence/*`, `stylized/bend-drag-still-works`,
`pose/lines-follow-bend`) because it is the property that gets quietly lost
when a later stage adds a switch.

**Line extraction is a CPU pass, and that was measured, not assumed.** The work
splits in two, and only one half is per-frame: face normals and per-edge
dihedral angles are functions of GEOMETRY, so the bloom (posed by rotating a
NODE) never re-reads them and the stem re-reads only when a bend point moves;
facing is a function of the camera, and the camera is transformed into each
mesh's LOCAL space rather than the geometry into the world. Measured on the
shipped bundle (78,480 triangles, 117,408 welded edges, headless Chromium):
**~2.2 ms/frame mean at blend 0, ~5.6 ms at blend 100**, against 16.7 ms, with
a one-time ~150 ms adjacency build at load. A GPU edge pass would buy ~2 ms and
cost the thing the stage is for — the segments would live in a texture, so the
gate could not count them and the dot renderer could not consume them.

**THE MESH IS NOT WELDED AND THE ADJACENCY HAS TO BE RECOVERED BY POSITION.**
The bundle comes from an STL split, so its triangles share no vertices: without
the weld every edge is a boundary edge, there are no creases at all, and the
page still draws a plausible silhouette-only picture. `topology/welded` is the
one check that sees it.

**THE EXTRACTION IS NOT THE DRAWING, AND THE POST-PROCESS IS WHERE THE PICTURE
COMES FROM.** Raw extraction hands back triangle edges; drawn as literal
straight polylines they read as a faceted mesh outline, and turning the detail
slider down cannot fix it — at detail 0, the most conservative setting there
is, this bundle still yields ~19,100 silhouette edges. The pipeline downstream
of extraction is chain → curate → simplify → smooth → draw, and each step is
load-bearing:

- **RDP ALONE DOES NOT SMOOTH ANYTHING.** A zigzag is not near-collinear, so
  nothing collapses and the staircase survives into the curve. Measured: with
  simplification but no Laplacian pass the contour still turned a mean of 37°
  per join, 5,946 of 15,669 joins over 30°. The Laplacian pass BEFORE the
  simplification is what removes facet noise; it runs in WORLD units because
  the zigzag's amplitude is a property of the mesh, not of the zoom, while
  every curation threshold is in SCREEN pixels because what should be pruned
  is what would be illegible.
- **Six Laplacian iterations is the knee, measured** (mean turn / % of joins
  over 30° / cost): 0 → 33.3° / 33.7% / 6.8 ms, 2 → 27.3° / 21.9%, 6 → 23.6° /
  13.8% / 9.4 ms, 8 → 21.2° / 12.7% / 9.9 ms, 12 → 18.7° / 10.9% / 11.4 ms.
- **Silhouette and crease chain SEPARATELY and junctions are cut points.** A
  vertex where an outline meets an interior fold is on both sets; chaining
  through it hands the smoother a corner it should keep, and puts a contour
  stroke and an interior stroke in one primitive that the two-tier weight
  cannot then draw differently.
- **Turn angles are measured per chain, on the points about to be drawn** —
  never across the emitted buffer, where the end of one chain and the start of
  the next share a junction position and read as one 180° fake turn. Measured
  that way first; it reported a 180° max on every run.
- **LENGTH CURATION PRUNES NOISE, NOT DENSITY** (measured, Sep 5). Raising the
  contour bar from 5 px to 45 px takes contour chains 1,425 → 610 but stroke
  segments only 14,614 → 10,054: most of the bloom's ink is in a few long
  chains, because a 40-petal bloom's density is ~40 real overlapping petal
  rims, each a genuine silhouette. The lever for that is per-chain visibility,
  not length, and it is not built. **The default stays 5 px / 16 px** (Eva,
  Sep 5, ruling from the sheet's 5 / 26 / 45 px cells): the tighter bars cost
  the sepals' interior lines and barely thin the bloom, so they buy nothing
  the density problem actually needs.

**TWO TIERS, ONE SLIDER, A FIXED RATIO** (`INTERIOR_WEIGHT_RATIO`, 0.45). The
contour/interior ratio is a property of the STYLE rather than of the artwork,
and an independent interior slider makes the one state that stops reading as
line art — interior heavier than contour — reachable by accident. Promoting it
to a second slider is one line plus a registry row.

**THE POST-PROCESS IS SKIPPED WHEN THE VIEW HAS NOT MOVED HALF A PIXEL, and an
exact float comparison does NOT work.** OrbitControls runs with damping, whose
easing has a multi-second half-life, so the camera matrix keeps changing
microscopically long after the hand stops and an exact skip never fires
(measured: still ~17 px per poll six seconds after a drag, headless). The
criterion is the honest one — would the drawing move by less than a twentieth
of a pixel? `skip/idle-is-free` asks it in ONE tick (two identical updates, the
second must skip, a pose change must un-skip) because waiting for stillness is
not something this harness can do.

**ONE EXTRACTION, TWO CONSUMERS.** Pointillism is not a second algorithm over
the model: at blend *b* an edge is drawn as dots when its own hash is below *b*
and as a stroke otherwise, so the segment set is identical at both ends of the
slider (`blend/same-extraction`) and the transition is stable under orbit
because the hash is on the CHAIN's first welded vertex, not on the frame. The
detail slider runs BACKWARDS on purpose — `detailToAngleDeg()` in
`print-lines.js` is its one owner, read by the app, the read-out and the gate,
and `CURATION` is the same for every curation number.

**Each slider is asserted on what it must LEAVE ALONE as well as on what it
changes.** Weight widens strokes without changing which lines exist; detail
changes which creases exist without moving the silhouette (a silhouette is a
function of the camera, full stop); pointillism changes the renderer, not the
extraction. A single slider wired to "make it look different" satisfies the
first half of any of those on its own.

**Verify with `node tools/verify-print-scaffold.mjs [shots-dir]`** — one gate
for every stage, every claim measured against mesh state, the extracted
segment counts, or the SCREENSHOT BYTES, never against the control that was
just written. **`--mutants` is the negative control and is not optional before
quoting a pass from a changed harness**: it re-serves sixteen deliberately broken
copies of `print.js` / `print-lines.js` through the gate's own HTTP server, and
fails if a mutation does not apply, if a check the mutant NAMES stays green, or
if a check it did not name goes red (which is how a mutation that just breaks
the page gets caught pretending to be a negative control). `--mutant=<id>` runs
one, in two minutes rather than thirty-five. The runtime bundle loader has its
own `bundle-swap/*` checks in the same gate — a second bundle generated on the
fly (via `GLTFExporter`, in-page), loaded through a real `page.setInputFiles()`
call and a real `File`/`DataTransfer`/dispatched `DragEvent` drop, never a
synthesized state hook — skipped during `--mutants` since none of the sixteen
mutations touch bundle-loading code and it is the single most expensive
section in the file.

**THE FIRST SWEEP FAILED SIX OF TEN AND WAS MOSTLY RIGHT TO — three of the
findings were in the GATE, not the mutations, and two of those were in checks
that shipped with #150/#151 and had been green all along.** Do not repeat them:

- **A drag whose pointerdown lands on a control panel never reaches the
  canvas.** The "pose survives an orbit" drag started at 0.75 of the canvas
  width, which is inside the right-hand column, on a slider — so the orbit
  under test was never performed, and the check passed on `camera moved 21.2`,
  which was OrbitControls' damping still easing from the PREVIOUS orbit
  against a bar of `> 1`. Start canvas drags in the gap between the panels'
  real bounding boxes, and set movement bars only a real orbit can clear.
- **"The camera did not move" is NOT observable in this harness.** Headless
  runs on software GL at ~2 fps, so damping has a **~4 second half-life**
  (measured: 12.3 units of drift per 300 ms right after a drag, still 4.4 six
  seconds later). A settle loop measures the easing. Where a check needs the
  camera out of the question, extract both states at the SAME camera inside
  one tick — `stemLinesRestVsBent()` is that shape.
- **One axis of a bounding box is a function of camera azimuth.** The same
  bend drag moved the stem's x extent 3.79 from one angle and 0.31 from
  another, straddling the threshold. Sum all three.

**Ink fraction saturates — read the weight check's comment before retuning it.**
Coverage is not width: at detail 100 the bloom is already a solid mass, so a 5x
stroke barely moves the pixel count. The weight check is measured at detail 0
for that reason. Note the corollary that caught a mutant: a mutation that ADDS
to the crease threshold neutralises itself there, because 88 deg + anything
passes 90 and no crease survives at either end of the slider.

**A GATE ASSERTION KEYED TO A SEGMENT COUNT IS A LIABILITY HERE.** Chaining,
curation and resampling all legitimately move every count, and they moved
`blend/strokes-at-0` (`strokes === segments`) the day the post-process landed.
Assert the structural property instead — at blend 0 everything is a stroke and
nothing is a dot — and reserve counts for the RAW edge set, which the
post-process does not touch. Likewise `smooth/contour-is-not-faceted` is a
COMPARISON of the same camera with and without the smoothing pass, never a
threshold: the mean turn angle depends on how large the model is on screen, so
an absolute bar had the shipped value at 31.1° against a bar of 32 with the
unsmoothed baseline at 37 — a flake, not a measurement.

Contact sheets: `node tools/shot-print-pose.mjs <dir>` (the pose stage) and
`node tools/shot-print-lines.mjs <dir> [base-tree]` (the line art — the switch,
detail x weight, the pointillism blend, the curation sweep, and the linework
under a LIVE pose change; with a base-tree it renders the same cells from a git
worktree of that commit so a before/after pair is a real render of the old code
rather than a remembered one).
Every cell on both is produced by a real pointer drag, wheel or slider input;
a picture of a configuration the hand cannot reach is not evidence about the
tool.

**Nothing here runs in CI.** Every GitHub Actions gate in this repo is
path-filtered to `flower*` / `bloom*` files, so `print*` is covered by nothing —
run the gate and the sheets by hand before calling a `/print` change done. Note
the corollary the cards tool already hit: the flower workflows are path-filtered
on `'tools/**'`, so ADDING A PRINT TOOL makes both flower gates run on a print
PR. They still test flower geometry; two green `verify` jobs on a print PR are
not evidence that anything about `/print` was checked.

Dev-only deps, gitignored and not in `package.json` (same convention as the
other gates): `npm i --no-save three@0.161.0 playwright-core`, plus
`@gltf-transform/core @gltf-transform/functions meshoptimizer` for
`tools/shrink-print-bundle.mjs` only. Three is served from `node_modules` at the
exact jsDelivr URLs `print.html` pins, so the gate needs no CDN egress.
**Install them in ONE `npm i --no-save` line** — a second `--no-save` install
prunes the first one's packages, which is how `playwright-core` went missing
mid-session.

**Loose thread:** `assets/print-test/` still names itself a fixture, and it is
now load-bearing for three merged stages. Renaming it is a rename in three
tools plus `print.js`; it has been deferred once per session so far.

**Out of scope so far, on purpose: multi-part bundles.** The runtime loader
(#156) swaps in any single `.glb`, but several petals + leaves + stem as
SEPARATE pieces is not handled — the pivot/pose logic still assumes one
`stem` mesh and one `bloom`/`pivot` pair. Extending that is a real change to
how the bundle is read, not a loader change, and belongs in its own session
once there is an actual multi-part export to test against.

### Authored infill (`print-infill.js`) — 2D, and it never reads the surface

Interior shading generated INSIDE a solid's already-extracted 2D silhouette:
cross-hatch, line-flow, tonal fill and the fan. It is authored illustration,
not a render. The
module reads exactly one thing off the geometry — the projected silhouette the
line-art extractor already computed for the frame — and everything after that
is two-dimensional. No creases, no dihedral angles, no normals, no light, and
no relationship between a hatch line and the surface under it.
`infill/reads-no-surface` asserts that against the SOURCE (word-bounded, so
`faceCanon` — topology, used to orient the silhouette — is allowed while
`faceN` / `faceC` / `edgeDot` / `facing` are not), because no picture can show
it. It knows nothing about petals, which is why it runs unchanged on the fused
bloom, on the stem, and on anything else it is handed.

**WHERE IS DARK IS AN AUTHORED ANCHOR, DEFAULTED TO THE CONVENTION** (session
of Sep 5). There is no light anywhere in this pipeline, so the question cannot
be computed and had to be decided. A fixed base-to-tip botanical rule was
REJECTED: "base" and "tip" are properties of a PETAL, the bloom arrives as one
fused solid with no petal-level granularity until multi-part export exists, so
any such axis would have to be guessed from a bounding box — and a shading rule
the artist cannot argue with is the wrong default for a tattoo-design tool.
So the mechanism is a per-part anchor the artist drags, and the convention is
only its STARTING VALUE: it initialises to the part's own vertex centroid,
which on a radial bloom is where the petals overlap and where botanical
illustration puts its darkest passage. The default picture is the conventional
one; it is a handle, not a law. The anchor is stored in the part's LOCAL space
and projected every frame, so it is camera-stable. Tone is
`(1 - d/reach)^gamma`, and because it is radial EVERY threshold is a circle —
which is what lets a hatch layer be clipped as an interval instead of sampled,
and is why `jitter` exists (it perturbs each line's threshold radius so the
edge of a tonal layer reads as a hand rather than a compass arc; set it to 0
and the circles come back, photographed on the sheet).

**BOTH FAMILIES SHARE ONE MEMBERSHIP RULE — THE SPANS OF A ROW — AND THAT WAS
NOT THE FIRST DESIGN.** Cross-hatch rotates the silhouette into a frame where
its lines are horizontal and runs a scanline, accumulating a WINDING NUMBER;
the drawn spans are the runs where it is non-zero. Nonzero and not even-odd on
purpose: even-odd punches a hole wherever a petal folds over itself and drops a
second silhouette loop inside the outline (`clip/fold-over-is-not-a-hole` and
`clip/opposite-winding-is-a-hole` assert both directions).
Line-flow originally clipped differently — it tested each streamline step for an
intersection against the silhouette SEGMENTS, which is exact and sounds
stronger. **It leaked 43% of the bloom's emitted endpoints outside the outline,
by a median of 12 px and as much as 48 px**, and the cause was not the test: a
brute force over all 18,377 edges agreed there was no crossing. The bloom is a
fused STL split with 24 boundary edges and 324 non-manifold edges whose third
face is dropped, so **its projected silhouette is not a closed curve** — a
streamline does not have to cross an open end, it can go around it, and the
winding changes with no crossing to detect. Cross-hatch never saw this because a
scanline is self-consistent along its own row. Do not "restore" a segment-
intersection clipper for line-flow on the strength of it being exact.
`ScanIndex` buckets edges by row so a scanline visits only the ones that can
reach it — without it the stage costs ~30 ms a frame instead of ~5 — and
`index/agrees-with-the-plain-scan` pins it to the unindexed answer at two
angles.

**SELF-OCCLUSION IS OUT OF SCOPE BY DESIGN**: the infill fills the SOLID'S
OUTLINE, so a bloom whose petals overlap is one silhouette and the hatching
runs across all of it — which is what an illustrator inking a filled outline
does. Per-petal infill waits on multi-part export. BETWEEN parts occlusion is
handled (a nearer part's spans subtract from a farther one's), ordered by
camera distance to each part's origin; that ordering cannot express two parts
that interleave in depth and is the only approximation in the file.

The infill draws as its own 2D overlay pass — an orthographic camera in PIXEL
coordinates, rendered after the scene with `autoClear` off — because a pattern
that lived in the mesh's local space would rotate with the object, and this
pattern belongs to the picture plane.

**Verify with `node tools/verify-print-infill.mjs`** (44 checks;
`--negative-control` required before quoting a pass from a changed harness —
it makes every row report one span covering everything, so the page hatches the
silhouette's BOUNDING BOX while still looking like a plausibly shaded flower,
and 9 checks move). It runs in two halves on purpose: the clipper is driven as
PURE FUNCTIONS in Node over outlines whose spans can be written down (a C, a
star, a four-tooth comb, a serrated leaf, a fold-over), because on the real
bloom's nineteen-thousand-edge silhouette a wrong clipper still draws a
plausible picture and there is nothing to compare against; then the stage is
driven in a real browser, where every claim is measured against the EMITTED
SEGMENT COORDINATES the page hands back in pixels, never against a screenshot.
**The gate's membership test is the clipper's own rule, deliberately** — a
different rule would report failures nobody could act on.

The sheet is `node tools/shot-print-infill.mjs <dir>` (24 cells + an
`index.html`): both families on the bloom and on a leaf at two densities each,
and an ANCHOR ROW that is the argument — the same bloom with the anchor in
three places, the shading following it. Crops are read from each part's own
measured silhouette bbox, never hardcoded, and the sheet renders at 2x because
at 1x a cross-hatch and a scribble are the same grey. **The "where is dark" row
turns the outline down to its thinnest and says so**: the bloom's projected
silhouette is over nineteen thousand edges, so at any normal weight the line
work is a dense scribble and a tonal gradient inside it cannot be read at all.
That is the linework on this bundle, not the infill — it is what the contour
curve-fitting session is queued for — but the row exists to let the shading
decision be judged.

**THE INFILL IS REBUILT PER BUNDLE, AND IT IS TORN DOWN IN TWO PLACES.** It is
built OVER the line art's extraction, its anchors live in the outgoing bundle's
meshes' LOCAL space, its marks live in an overlay scene of its own and its
anchor rings live in the main scene. So `clearCurrentBundle()` disposes the
infill and removes the rings, and `buildInfill()` (called from the STYLIZE
build, because the infill is a second consumer of the very extraction that
build creates) makes new ones and re-applies whatever the panel says. The
controls are wired ONCE at module load, like STYLIZE's, so a swap cannot stack
a second set. `__printInfill` is DETACHED on teardown and re-attached on build,
the same contract as `__printLineArt` — its accessors deref `infill`, so
leaving it attached with nothing loaded would hand the gate an object that
throws instead of an absence it can test. Five `swap/infill-*` checks carry all
of this, including two leak witnesses (overlay children, rings in the scene)
that are the ONLY things that would notice a rebuild which failed to tear the
old one down: it still swaps, still poses and still draws.

**A stale panel rectangle measures chrome as ink.** The scaffold gate excludes
the fixed panel columns before computing an ink fraction, and it excluded
`#print-debug` by name. Wrapping the left-hand panels in `#print-left` left the
LOAD BUNDLE box counted as ink and turned three `*/pixels` checks red at ratios
just under their thresholds. It now excludes the COLUMNS (`#print-left`,
`#print-side`) and FAILS LOUDLY if either selector matches nothing, rather than
silently skipping an exclusion.

**The leaf, honestly — SUPERSEDED, and kept because the sheet still says it.**
`shot-print-infill.mjs`'s leaf cells are the STEM part's infill framed on a
leaf, because `flower-test-bundle.glb`'s leaves are part of the stem solid.
That was the honest best available when #157 shipped. It is no longer the best
available: `bloom-stem-leaf-bundle.glb` has a real separate leaf, and
`shot-print-tone.mjs` uses it. Re-shooting the hatch/flow leaf cells on the
real leaf is a one-line change to that sheet and has not been done — hatch and
flow were explicitly out of scope for the tonal session.

### Tonal fill (`print-infill.js`, mode `tone`) — tone out of MASS, not density

The third family in the same module. Hatch and flow make tone by packing lines;
the reference drawings this was built against make it out of FILLED MASS —
leaves that are solid black shapes with their veins left as white lines through
the ink, and depth that comes from a dark shape sitting beside a light one. That
is a different vocabulary, not a mistuned hatch, so `tone` fills the silhouette.
Three things, and each one reuses something rather than inventing it:

1. **The fill is the existing row-span rule drawn solid** — a scanline at
   `0.80 x the nib`, one emitted segment per span. Not a new notion of "inside".
2. **A vein is WITHHELD, never stroked.** The path is thickened into a capsule,
   `capsuleSpanAtRow()` gives its interval on each row in closed form, and
   `subtractSpans()` — the same operation that already takes a nearer part's
   silhouette out of a farther one's — removes it. The veins go LAST of the
   three subtractions, so a vein cannot appear to reserve through ink that was
   never going to be laid.
3. **Darkness is PER PART**, one number each, beside the anchor and for the same
   reason: contrast between adjacent shapes is not something one slider for the
   whole picture can say. It is what makes the effect legible at all.

**THE PROJECTED SILHOUETTE IS OPEN, AND A FILL IS WHERE THAT STOPS BEING
SURVIVABLE.** #157 found the outline is not a closed curve; tonal fill found what
that costs. On `bloom-stem-leaf-bundle.glb`'s leaf — 84 triangles, 16 of its 114
edges carrying a third face that Topology drops — every row has THREE crossings,
the winding walks up and never returns to zero, no span is ever emitted, and the
leaf **filled to nothing at all**. In a hatch that is one missing line among
hundreds and invisible. So `scanSpans()` and `ScanIndex.spansAt()` now close a
row whose winding never returns to zero AT ITS LAST CROSSING. **The repair is
INERT on a closed outline** — `wind` is exactly 0 there and the line never runs —
which is what lets it live in the rule all three families share instead of in one
of them; `boundary/closure-is-inert-on-a-closed-outline` pins that, and
`boundary/closure-recovers-an-open-outline` models the actual defect (a wall left
facing the wrong way, which is what a dropped third face does) rather than
inventing a gap.

**"INSIDE" IS DIRECTION-DEPENDENT WHEN THE OUTLINE IS OPEN**, measured, and it
had a latent error in the #157 gate waiting behind it. The solid fill judged by a
rule scanned at ITS OWN angle has **0 of 4194** points outside; the identical ink
judged by a rule 35 degrees away has **33 of 5361, up to 20 px DEEP INSIDE the
shape**. Both gates now match the scan direction to the clipper that drew each
segment — a cross-hatch line is emitted along the direction its own scanline ran,
so the segment's direction IS the rule; line-flow clips through the QUANTISED
`contains()` and is judged there. Testing everything at 0 degrees was wrong all
along and only the fill had enough points to trip it. The disagreement gets its
own bounded, named measurement rather than a tolerance.

**The veins are authored 2D and read nothing off the surface** — the module's one
rule still holds. The principal axis of the projected silhouette gives the length;
the midrib is sampled along it and each sample is snapped to the MIDPOINT OF THE
CROSS-SPAN at that station, so the rib follows the shape's own medial line (on a
bent leaf: 0.02 px off it, against 32.9 px for a straight line through the
centroid); laterals branch at a sweep toward the tip and are scaled by the
measured half-width on their own side, so a tapering leaf gets shorter laterals
near the tip with nothing told to taper.

**The gradient is an ordered dither on the ROWS**, which falls out of the gift the
tone field already gives: the field is radial, so every threshold is a circle.
Row levels come from a BIT REVERSAL of 0..7 (`TONE_ORDER`) so a half tone spreads
evenly instead of banding — in source order the largest gap between inked rows
collapses and `dither/rows-spread-rather-than-band` catches it. Coverage is
`darkness * (1 - g + g*tone)` and `levelThreshold()` inverts it exactly, so the
whole ramp is an interval clip and nothing is sampled per pixel. **Gradient 0 is
the default and is a flat solid fill to the outline** — that is the reference
leaf, and the anchor and its falloff are inert there, which the read-out says.

**THE NIB IS THE MARK AND THE COST, ONE CONTROL.** Rows are laid at 0.80 x the
nib, so a fatter nib is the same solid shape in a third of the rows. It is its own
slider rather than the line work's `weight` precisely so the artist has that lever.

**MEASURE THE FRAME COST SETTLED — THIS WAS GOT WRONG ONCE AND THE NUMBERS
SHIPPED.** `stats.frameMs` is one frame's CPU time in the pass; polling it a
fixed 1.2 s after moving the camera reads an EARLIER, cheaper frame when the new
one takes seconds. The first cost table said 30 ms where the settled answer is
1373, and 1300 ms where it is 6721. Poll until consecutive samples agree.
Headless Chromium, 1100x800, software GL, all parts filled, tonal fill:

| | 2-part | 3-part 301k | 3-part 75k (ships) | 3-part 36k |
|---|---|---|---|---|
| default framing | 7 ms | 1373 ms | 791 ms | 388 ms |
| camera close on the leaf | — | 6721 ms | 4277 ms | 1999 ms |
| … bloom at darkness 0 | — | 1161 ms | 729 ms | 336 ms |
| CROSS-HATCH, same close-up | — | 2942 ms | 2402 ms | 2160 ms |

**THE FIXTURE'S TRIANGLE COUNT WAS NOT THE CLIFF.** The fill is roughly linear
in silhouette edges where the per-part segment cap does not bind (31k → 67k
edges is x2.12 edges for x2.14 time) and bends over above it. But CROSS-HATCH
pays 2.2–2.9 s at the same camera *whatever* the bloom's resolution, against
4 ms at default framing on the small bundle — so most of the close-up cost is
not the fill's and not the triangle count's, it is what the whole infill stage
costs a three-part scene at extreme zoom. Decimating 301k → 75k bought 1.6x at
the worst case and 1.7x at default framing: real, and not the cliff. Three
things bound the fill and all three are in the file (rows clamped to the
VIEWPORT, one scan index per part per frame shared with the parts it occludes,
`toneMaxRows`). **The real fix is an active-edge-table sweep and it is
deliberately not done here** — it is a second implementation of the membership
rule, which is the one thing #157 says not to have two of, and it would help
cross-hatch and line-flow too.

**THE BLOOM FILLS AS ONE SHAPE, AND THAT IS THE LIMIT, NOT A TUNING PROBLEM.**
Both bundles' blooms are one fused solid, so the reference's petal-against-petal
contrast is blocked on multi-part export. Per-PART contrast is reachable and is
what `darkness` is for. The sheet photographs the limit rather than tuning around
it.

**Verify with `node tools/verify-print-tone.mjs`** (65 checks; `--negative-control`
runs five mutants and is required before quoting a pass from a changed harness;
`--skip-leaf` drops the 21 MB load). Part one drives the SHIPPED functions —
`toneRowSpans()` was pulled out of the `Infill` class exactly so the gate tests the
shipped arithmetic and not a copy — over shapes whose answer is written down, and
compares filled area against ANALYTIC area. Part two measures emitted pixel
coordinates in a real browser. The leaf's fill is additionally checked against its
own PROJECTED TRIANGLES (`__printInfill.projectedTriangles()`), which owe the
silhouette nothing — the only instrument that can say "the fill covers the shape"
when the outline is the thing under test. `__printScaffold.partBox()` / `setView()`
are test chrome in the same spirit as `handleScreenPos()`: there is no in-page
control that puts the camera anywhere in particular, and a leaf at 20 px tells you
nothing. `partBox()` deliberately does NOT use `Box3.setFromObject` — the line art
parents its `LineSegments2` onto the source mesh with a placeholder bounding
volume, and `setFromObject` reported a leaf stretching to the origin.

**A hatch angle is now a choice of WHERE THE DIRECTION COMES FROM** — see
"Shape-derived direction" below; `angleDeg` is still the default and still the
only thing hatch, flow and tone read in `global`. **A fourth family, the FAN,
reads neither** — see "The fan" below; it always derives its own per-part axis,
and the direction select is hidden rather than left saying something inert.

**The sheet is `node tools/shot-print-tone.mjs <dir>`** — solid fill and
reserved-vein fill on the separate leaf, the vein and gradient and nib sweeps, the
CONTRAST PAIR both ways round (one of them alone is a picture; the pair is the
argument), the fused bloom as the limit, and the panel with its per-part rows.
The reference drawings are not in the repo, so the sheet says so and asks to be
held beside them. **A hatch/flow-versus-tone row is NOT shot, for a measured
reason:** at the zoom the leaf cells need, line-flow seeds its whole bounding box
over the 301k-triangle bloom behind the leaf and ran over ten minutes on one cell.

### Shape-derived direction (`direction: 'axis'`) — one axis per part, and the bloom cannot pass this test

The third thing the infill can be told: where a stroke's direction COMES FROM.
`global` is one angle for the whole model and **stays the default** — it is the
right answer for a shape with no meaningful long axis. `axis` derives a
direction PER PART from that part's own projected filled region.

**THE AXIS IS A STRAIGHT PRINCIPAL AXIS, NOT A MEDIAL AXIS, AND THAT IS SAID
RATHER THAN HIDDEN.** `partAxis()` is `principalAxis()` (the closed-form
eigenvector the veins already used — one owner, not two) plus an ORIENTATION.
On a part whose length curves, a straight axis is a CHORD: measured, on a leaf
bowed 46 px, it misses the shape's own centre line by **28.6 px**. The
mitigation is a SHEAR, not a medial axis — `makeWarp()` / `warpFrame()` push
the silhouette into `(station, offset-from-the-centre-line)` coordinates, the
SAME scanline runs there, and the spans are sheared back on emit, so a stroke
follows the bend while "inside" is still decided by exactly one rule (#157's
whole point). Measured: a sheared row sits **2.8 px** off the centre line where
the straight axis sits 23.2 px off. **It is INERT on a straight part** (`K = 1`
piece, identical to the unwarped stroke). It is WRONG on a forked or strongly
re-entrant part — one centre line, two arms — and it is applied to CROSS-HATCH
and not to the solid fill: a fill has no legible stroke direction to curve, and
paying K times the segments at a 0.80 x nib row pitch would run straight into
the per-part cap.

**WHICH END IS THE BASE CANNOT COME FROM THE OUTLINE.** `attachmentLocal()`
reads vertex POSITIONS — never normals, never facing — ONCE per bundle, to find
the point of each part nearest to any other part. The bundle declares a `pivot`
junction and NOTHING about where the leaf joins the stem, so a declared
attachment would cover one part of three. With no other part at all, the base
is the WIDER end, measured from the shape's own cross-spans. **On the stem this
reads as the BLOOM JUNCTION at the top, not the cut end at the bottom** — a
defensible reading of "where this part meets the rest of the plant", not the
botanical one, photographed on the sheet rather than tuned.

**THE AXIAL RAMP IS THE SECOND COMPONENT OF THE COVERAGE THE ANCHOR ALREADY
SUPPLIES, not a second mechanism.** `coverage = darkness x min(radial tone,
1 - bias x station)`. `min` and not a product, deliberately: a product of two
fields is not a single interval along a row, and every clip in this file is a
closed-form interval. At bias 0 the factor is 1 everywhere, the clip is
vacuous, and the fill is **span for span** what shipped in #160.

**A WRONG OCCLUDER INDEX LEAVES NO MARK, and this is how one shipped for an
afternoon.** `_tonePart`'s scan-index cache was keyed on the part index alone —
correct while every part scanned at one global angle, wrong the moment each
part has its own. A bloom index cached at the LEAF's angle was handed to the
stem, and every span it subtracted was wrong. **Found by the cost table, not by
a check**: a bad occluder subtraction takes ink AWAY, so nothing lands outside
any outline and every membership assertion in both gates stays green. The key
is now `part @ angle`.

**THE COST WAS ALL IN ONE PLACE AND IT WAS NOT THE AXIS.** `medialOffsets()`
built its cross-axis `ScanIndex` at a 1 px bucket with no viewport clamp; at
the leaf's close-up camera the bloom projects across millions of pixels, and
bucketing its 45,000 edges one row at a time to answer twenty-one questions was
**4.5x the whole stage**. Clamped to the stations it actually asks about, with
buckets one sample apart — neither of which moves an answer, and the emitted
segment counts are identical before and after. Measured on the shipped
three-part bundle, headless Chromium, 1100x800, software GL, same run so the
two columns are comparable:

| | global | axis |
|---|---|---|
| default framing, tonal fill | 14 ms | 30 ms |
| default framing, cross-hatch | 7 ms | 10 ms |
| close on the leaf, tonal fill | 195 ms | 84 ms |
| close on the leaf, cross-hatch | 219 ms | 235 ms |

So the worst case is **not** materially past where #160 left it: cross-hatch
close-up pays +7%, and the tonal fill is CHEAPER in axis mode (its rows run
along the leaf rather than across the clamped viewport, so it lays fewer of
them). The +16 ms at default framing is the axis derivation for three parts.
The AET sweep is still the real fix for the stage as a whole and is still
deferred.

**THE BLOOM CANNOT PASS THIS TEST AND MUST NOT BE TUNED AROUND.** It is ONE
FUSED SOLID: no interior petal boundaries exist in the data, so the derived
axis is a single axis for the entire flower and its "centre line" is a fiction
over a radial blob — the strokes come back a long way off the axis they were
nominally run along, and the sheet photographs exactly that. Per-petal
direction is blocked on multi-part export.

**Verify with `node tools/verify-print-axis.mjs`** (44 checks;
`--negative-control` runs six mutants and is required before quoting a pass
from a changed harness; `--skip-leaf` drops the leaf half). Part one drives
the shipped `partAxis` / `medialOffsets` / `makeWarp` / `axialFactor` /
`axialStationAt` / `axialClip` / `toneRowSpans` over outlines whose answer can
be written down — a tapered leaf, a bent leaf, and rotated copies — because on
the real leaf's silhouette a WRONG axis still draws a plausible picture at a
plausible angle. Part two measures emitted pixel coordinates in a browser.
**The direction-dependent membership hazard is load-bearing here, not
background**: three parts now scan at three different angles in one frame, so
the gate takes each part's own `scanAngleDeg` out of the stats and judges that
part's ink there. The unsheared family (tonal fill) must come back EXACTLY 0
outside; the shear gets its own bounded, named measurement
(`shear/excursion-is-bounded-and-named`, 1 point of 10,308 at 2.74 px) because
it is the one approximation in the file.

Four things the negative control taught, each measured rather than predicted:
a no-op shear still ROUND-TRIPS exactly, so `warp/round-trips-on-a-bent-part`
cannot see it and `warp/rows-follow-the-centre-line` plus a chain-sagitta check
on the real leaf are the only witnesses; a ramp run tip-to-base still thins the
ink monotonically, so only the field against its own inverse catches it;
`global/is-unchanged-by-the-new-mode` compares global BEFORE against global
AFTER and is therefore blind to a mutation that breaks both equally (the
witness is the angle slider actually turning the hatch); and a wrong axis makes
the SHEAR fly, 430 px past the margin against the shipped 2.7.

The sheet is `node tools/shot-print-axis.mjs <dir>` — the leaf with derived
strokes at two densities beside the same leaf in global-angle mode, the axis
drawn from the page's own reported base and tip, the shear on and off, the
axial ramp as a sweep, the stem's honest "base", and the fused bloom
unretouched. Cells are cropped from the leaf's own measured silhouette bbox,
looking down its thinnest dimension — from the side it is a sliver and no
direction is legible on it.

### The fan (`mode: 'fan'`) — strokes that converge at the base, and the review gate is the page

The fourth family, and the answer to why #163's three cells were rejected:
hatch, flow and tone are all PARALLEL LINE FAMILIES — rotated to an axis or
sheared along a centre line, but every stroke running the same direction as
every other. The reference does not. Its strokes emanate from where a part
joins the plant and spread toward its point, curving with the shape as they go.

**IT WAS CHECKED AGAINST LINE-FLOW FIRST, AND IT IS NOT A SETTING ON IT.**
Flow at `curvature -100` is already RADIAL from the anchor, and rays from a
point are the orthogonal family of the rings it draws at +100 — so on paper
this is flow's own field with the origin moved. Two things make that the wrong
place to build it, and both are measured rather than argued: a radial field
knows NOTHING about the shape, so its straight rays exit through the side of a
bowed or tapering leaf (the failure #163 built the shear for, and the shear
cannot be bolted onto a per-step integrator); and flow SEEDS ON A BBOX GRID, so
two seeds on one ray draw it twice and the spacing between rays is a property
of the grid — and the spacing law is this family's whole design problem. Flow
at -100 is photographed on the sheet as the nearest thing that already shipped.

**THE FIELD IS ONE LINE: `offset(t) = u × halfWidth(t)`, in the part's WARPED
(station, offset) frame.** A ray is a curve of constant normalised offset; the
half-width is MEASURED off the shape's own cross-spans at that station. Two
things fall out and neither is a special case: the rays converge at the base
and spread toward the tip because THE SHAPE does (a leaf is narrow where it
joins the stem), and a ray cannot exit sideways at any taper or bend, so the
straight-ray failure is unreachable rather than mitigated. #163's shear is what
makes it follow a bowed part, and is the identity on a straight one — the
division of labour is asserted: the shear carries the bend (a 52 px bow leaves
a **0.1 px** interior residual against 32.6 px unsheared) and the profile's
measured centre carries what the shear's 21 samples CLAMP OFF THE TWO ENDS
(32.6 px there). That clamp is not a detail: anchoring the fan at 0 instead of
at the measured span centre put a whole station's rays outside the shape, and
the base band read 5,020 px² of leaf holding 79 px of ink. **The profile is
symmetric about its own centre by construction** — the centre IS the span's
midpoint — so the two-sided API is a convenience and not a lopsided fan.

**THE SPACING LAW IS THE SESSION'S ONE REAL DESIGN QUESTION, AND IT SHIPS AS A
TRADE RATHER THAN AN ANSWER.** A pure pencil touches at the origin and splays
at the tip; the reference does neither. But the two fixes pull opposite ways:
hold the spacing constant along the length and the density is uniform, so
convergence stops being a gradient at all; let a fixed pencil converge and the
base is dark for free but the tip is a handful of strokes far apart. So it is
ONE control, `converge`, interpolating the TARGET:
`S(t) = spacing × ((1-k) + k × halfWidth(t)/halfWidthMax)`. Rays are inserted
DYADICALLY — level 0 the two margins, level 1 the centre, level L the midpoints
of level L-1 — and a level is BORN at the first station where its parent grid
opens past `S(t)`, running from there to its tip cutoff. That is what puts
short strokes tucked between long ones, with no bookkeeping beyond one station
scan per level. Measured on the real leaf: ink density base/tip is **1.95x at
converge 0 and 2.97x at converge 100**.

**SO #163'S AXIAL RAMP IS NOT OFFERED HERE, AND THAT IS A FINDING, NOT AN
OMISSION.** Convergence IS the gradient in this family, so a second base-to-tip
ramp compounds with it. The read-out prints the MEASURED ink profile — length
per station band over the band's own DRAWABLE area — so the claim is a number
on the page rather than a sentence in a header. Drawable, not projected: on
this bundle the bloom sits in front of exactly where the leaf meets the stem,
and dividing ink by an area the part is not allowed to mark reports a light
base that is only an occlusion.

**AN ORIGIN REGION, NOT A POINT** (`origin`, a floor on the half-width, in
pixels because it is a property of the MARK), and **strokes stop short of the
tip** (`tipReach`, ragged per ray by `tipJitter` — the same argument
`jitter` makes for the tonal layers' thresholds). The origin is a FLOOR, so on
a part whose base is blunt it is correctly inert: the read-out says at how many
of the part's drawable stations it is BINDING rather than offering an
apparently dead slider, and the gate asserts that biconditional coordinate by
coordinate (a checksum cannot see it — the floor widens the fan symmetrically,
so a plain coordinate sum cancels exactly and read ±0 while the picture
changed). **`darkness` is the target spacing** in this family: tone here IS
line density, so "how dark is this part" is how far apart its strokes are, and
0 is also the cost lever for a bloom filling the viewport.

**THE DIRECTION-DEPENDENT MEMBERSHIP HAZARD IS ANSWERED BY CLIPPING PER
STATION.** A fan gives every ray its own heading, so there is no "the ray's own
angle" to judge its ink at — which would have made #160's hazard far worse than
#163's three per-part axes. What the implementation does instead is ask
membership on the row of CONSTANT STATION, and those rows all run along the
part's cross axis: the fan therefore has exactly ONE scan direction,
`scanAngleDeg` is the axis + 90, and a ray that leaves is bisected IN STATION
so every probe stays on that one direction. The shear does not disturb it — a
constant-station row maps to a straight pixel line whose offsets all shift by
the same amount, so point and spans move together — and that identity is
asserted (`fan/the-shear-preserves-membership-on-a-row`) because it is what
lets the gate measure in pixels. **Measured: 0 of 16,512 emitted points outside
the leaf's outline at its own framing.** At extreme zoom 65 of 27,854 read
outside, ALL OF IT the leaf — the part with 16 of its 114 edges carrying a
third face the topology drops, so its projected silhouette is the open one.
That is bounded and named (`open-outline/the-disagreement-is-bounded-and-named`,
0.23%), never absorbed into a tolerance.

**AND #163'S CACHE BUG IS CARRIED FORWARD — BUT ITS WITNESS HERE IS A DIFFERENT
ONE, AND THAT CORRECTION CAME FROM THE NEGATIVE CONTROL.** Every part has its
own warp, so an index built for the bloom in the LEAF's warped frame is
meaningless to the stem; the key is `part @ warp owner`. The check written for
it, `fan/no-ink-under-a-nearer-part`, reasoned from #163: a wrong occluder
subtraction takes ink AWAY, so the mark to look for is ink that should have
been removed and was not. **It stayed green under the mutation — 0 of 10,851.**
The damage is not to the occluders, it is to the part's OWN index: whoever asks
for `j` first fixes the frame it is built in, so a part that occluded something
earlier in the frame gets its own index back in someone else's warped
coordinates and is clipped against a garbage outline. The witness is therefore
the part's ink escaping itself (`leaf/strokes-terminate-at-the-silhouette`,
158 of 714 leaf endpoints outside), and `no-ink-under-a-nearer-part` is kept as
a true property this mutation does not happen to violate.

**THE COST IS BELOW BOTH FAMILIES IT SITS BESIDE.** Measured in the same run,
same camera, three-part bundle, headless Chromium 1100x800, software GL:

| | fan | tonal fill | cross-hatch |
|---|---|---|---|
| leaf face-on (the review camera) | 7 ms | 3 ms | 1 ms |
| #163's close-up | **60 ms** | 98 ms | 137 ms |

(#163 recorded 84 ms tonal / 235 ms hatch at that close-up; this run reproduces
the shape of it.) The fan is per-RAY work rather than per-row, and a ray is
~120 membership probes: on the leaf that is a few thousand queries against the
tonal fill's thousands of rows. `medialOffsets()`'s trap — bucketing per pixel
across the whole viewport — is avoided the same way #163 avoided it: the
station range is clamped to the VIEWPORT (the shear leaves the station alone,
so the clamp is exact) and the index is bucketed at the ray step.

**THE BLOOM CANNOT PASS THIS TEST AND MUST NOT BE TUNED AROUND** — the same
sentence as #163 and #160, for the same reason. It is one fused solid, so the
fan gets ONE origin and one centre line for the entire flower and runs its rays
across a radial blob. Per-petal fans are blocked on multi-part export. The
sheet photographs it with the field drawn, which is the clearest statement of
the limit there is.

**THE REVIEW GATE IS NOT A CONTACT SHEET THIS TIME.** Three sessions in a row
built a shading field from a verbal description, produced a sheet, and missed —
a process problem as much as a design one. So the six parameters are LIVE
CONTROLS, the read-out says what the field is doing (the spacing law spelled
out, the measured gaps between neighbouring rays at three stations, the measured
ink density band by band, where each level was inserted, where the origin floor
binds), and **`show the field`** draws the field itself in its own colour — the
axis, the measured centre line, the origin bar, the ragged termination boundary
and a tick at each inserted ray's birth. It is its OWN primitive in the overlay
scene, never mixed into a part's ink buffer, so drawing it cannot change the
picture it describes (asserted bit for bit). Review it on the deploy preview.

**Verify with `node tools/verify-print-fan.mjs`** (46 checks; `--negative-control`
runs seven mutants and is required before quoting a pass from a changed harness;
`--skip-leaf` drops the leaf half). Part one drives the shipped `widthProfile` /
`profileMidAt` / `profileHalfAt` / `fanTargetSpacing` / `fanRays` over outlines
whose answer can be written down, because on the real leaf a WRONG fan still
draws a plausible converging picture. Part two measures emitted pixel
coordinates in a browser.

Five things the checks and the negative control taught, each measured:
**a field with two statements is a field one of whose statements is untested** —
the ray offset lived inside `_fanPart` and the gate restated it, so the
`rays-are-parallel` mutation sailed through every part-one check and only the
browser half caught it; `fanOffsetAt()` is now the one owner and both call it;
**a station is not a sentinel** — `t` is negative over the base half of every
part, so a `-1` "not found" marker read as a real birth AT THE BASE and every
level was born at once (a plausible fan, with the spacing law silently switched
off; it is now a mutant); **comparing two gap lists by index is meaningless**
the moment insertion has changed how many gaps there are, so divergence is
asserted over the rays alive at BOTH stations, pair by pair; **substituting the
axis angle into the scan formulas is not a near miss** — it read 94 of 95 points
outside, and is how the shear-membership check was first written; and **a
segment COUNT cannot see the origin floor at all** (it changes no ray's
existence), nor can a coordinate checksum (it cancels), so that one is compared
coordinate by coordinate.

The sheet is `node tools/shot-print-fan.mjs <dir> [base-tree]` — the fan beside
#163's cross-hatch and #157's radial flow on the same leaf at the same camera,
the field drawn, the converge sweep as the argument with the measured density
in every caption, each lever as a pair, the stem's honest "base", the fused
bloom with and without the field, the panel, and with a base-tree a real render
of the old code from a git worktree.

**THE SHIPPED DEFAULTS, as merged (#166) and NOT tuned by Eva** — the fan was
merged additive-and-off so the branch would not diverge, before anyone had
turned a slider on the preview. Treat every number here as a starting point
somebody still has to rule on, not as a decision:

| control | default | what it is |
|---|---|---|
| shading | `off` | the fan is opt-in; `global` is still the direction default |
| spacing | 9 px | the TARGET gap between neighbouring rays |
| converge | 55% | 0 = constant spacing / uniform density · 100 = a fixed pencil |
| origin | 3 px | half-width of the origin bar — a FLOOR, see below |
| inset | 92% | of the measured half-width a margin ray sits at |
| tip reach | 88% | of the length a ray travels |
| tip ragged | 35% | per-ray jitter on the tip cutoff |
| show the field | off | the debug overlay |
| darkness | 100% | per part; in this family it IS the target spacing |

**WHAT THE NEXT ITERATION SHOULD KNOW, and would otherwise rediscover.** Five
of these are about the spacing law and four about the direction hazard; all are
measured on `bloom-stem-leaf-bundle.glb`'s leaf at its face-on framing.

*The spacing law:*

1. **DYADIC INSERTION IS A FACTOR-OF-TWO GRANULARITY, AND IT IS COARSE against
   how a blade's width actually varies.** On this leaf the width goes 3 -> 30 px
   over the first ~10% of the length and then 26 -> 28 px over all the rest, so
   every insertion happens in the base zone and `converge` has nothing to do
   anywhere else. That is why converge 0 and converge 100 are near-identical
   PICTURES here and differ only as a number (base/tip density 1.95x vs 2.97x).
   A finer ratio — inserting one ray between every OTHER pair, so a level is
   sqrt(2) rather than 2 — is the obvious next move and was not built.
2. **RAYS NEVER DIE AT THE BASE**: levels 0 and 1 run the full length by
   construction. That is what guarantees ink at the base at any setting, and it
   is also the cap on how uniform converge 0 can be — three rays still crowd
   into the origin bar. Deliberate, but it means "constant spacing everywhere"
   is not actually reachable.
3. **THE ORIGIN IS A FLOOR AND IS CORRECTLY INERT ON A BLUNT BASE** — on this
   leaf at its own framing it binds at 0 of the part's drawable stations and
   moves nothing. The read-out says which of the two it is doing. Do not "fix"
   it into something that always acts.
4. **TIP RE-CONVERGENCE IS HIDDEN, NOT SOLVED.** A pointed leaf narrows again,
   so the rays re-converge at the tip; `tipReach` 88% is what keeps that out of
   the picture. At 100% you see it, and the exactness claim goes with it (1
   point of 24,948 outside, at the degenerate tip).
5. **INK LENGTH PER BAND IS THE WRONG INSTRUMENT** — divide by the band's
   DRAWABLE area (this part's spans minus every nearer part's) or an occlusion
   reads as a light base. Measured: 5,020 px² of leaf holding 79 px of ink.

*The per-ray direction hazard:*

6. **THE WHOLE APPROACH RESTS ON ONE PROPERTY: a ray crosses each
   constant-station row AT MOST ONCE**, which holds because its offset is a
   function of the station alone. That is what collapses "every ray its own
   heading" down to ONE scan direction per part. Any future field where a ray
   doubles back in station — a spiral, a hook, a ray that curls over — breaks
   the clipper AND the gate's single `scanAngleDeg` at the same time, and #160's
   direction-dependent membership hazard comes back at full strength with no
   angle left to judge the ink at. Preserve it or rethink the clipper.
7. **THE AET SWEEP IS NOT A DROP-IN HERE** (it is still deferred, and still the
   right fix for the stage as a whole). Sweeping along RAYS would clip each ray
   in its own direction, which is exactly what (6) says not to do.
8. A scan index must be keyed on the WARP OWNER, and the witness is a part's own
   ink escaping its outline — the occluder-facing check stayed green under that
   mutation (see above).
9. The gate must take `scanAngleDeg` out of the stats. Substituting the axis
   angle where the cross-axis basis `(qx, qy)` belongs is not a near miss: it
   read 94 of 95 points outside.

*And one thing nobody has seen:* the fan has never been drawn on a part with a
genuinely BROAD base, because neither shipped bundle has one. Everything above
about `converge` being a base-zone lever is a fact about this leaf's proportions,
not about the law.

## `/plot` — the curve viewer for the bloom grid export

`plot.html` / `plot.css` / `plot.js` / `plot-grid.js` draw the bloom
generator's grid glTF (the `Get grid ↓` export) as white-on-black line art: the
x-ray/architectural look, where the drawing is literally the petal's own
construction curves. It is `noindex`, it exports nothing, and it changes
nothing about the generator or the export format.

**IT IS NOT `/print` AND SHARES NO CODE WITH IT.** `/print` is mesh →
silhouette → fill and INFERS structure from triangles; `/plot` draws curves
that are already in the file. None of the silhouette extraction, crease
detection, infill families, winding rule or scan-direction machinery applies
here and none of it is imported — the whole render is read the LINE_STRIPs,
project them, stroke them. Keep it that way. `/print` was not touched.

**ROUTING IS THE PATTERN `/bloom` AND `/print` ALREADY USE, WHICH IS NO
PATTERN AT ALL:** there is no `_redirects`, no `netlify.toml` redirect and no
route table. The site is published from the repo root and Netlify's pretty
URLs serve `/plot` from `plot.html`. Adding the page IS the routing change.

**WHAT THE EXPORT CONTAINS, verified against a real 606 KB file** and not
taken on trust: one `petal_N` node per petal with a `petal_N_attachment`
child (a POINTS primitive at the attachment); ~39 LINE_STRIP primitives per
petal, `POSITION` only, no materials; `extras.kind` (`u` / `v`) plus `v` /
`column` on a u-line and `u` / `row` on a v-line; `asset.extras` carrying
`mode`, `units` and the petal retention counts. On the sample: **280 u-lines
of 29 points and 812 v-lines of 10 points — 1092 strips, 7,840 + 7,308 =
15,148 segments** across 28 petals. (The kickoff brief's two cost figures split:
its "roughly 7,800 for u-only" is right — 7,840 — but **"11,500 for u+v" is
wrong**; the file holds and the page draws **15,148**. Quote the measured
numbers, not the brief's.) **The census is
recounted from the .glb's own JSON chunk by the gate** and the page has to
agree strip for strip — "extras.kind separates the families" is not checked by
asking the page whether it thinks it did.

**THE FAMILY COMES FROM THE TAG, NEVER FROM THE SHAPE**, and a strip the
format did not tag is not guessed at: it lands in an `other` bucket that is
drawn under every family switch, with the read-out naming it. A tag-blind
reader still draws a plausible picture, which is why the gate's fixture
includes a u-shaped strip tagged `v`.

**THE SHIPPED DEFAULTS WERE REVIEWED ON THE DEPLOY PREVIEW AND APPROVED AS-IS**
(Eva, Sep 7, on `deploy-preview-182`). Unlike `/print`'s fan — which merged
additive-and-off before anyone had turned a slider, so every number in its
table is a starting point — these are a ruling. **Do not re-litigate them
without a reason from the picture:**

| control | default | what it is |
|---|---|---|
| lines | `u + v` | the family switch |
| u density | 12 | every u line (right = densest) |
| v density | 12 | every v line |
| weight | 1.1 px | screen-space stroke width |
| brightness | 30% (screen) · **16% (print)** | the single-line level — see below, this is the glow control, and the two polarities' defaults DIFFER by ruling |
| depth dim | 55% | the farthest line draws at 45% of its brightness |

**ADDITIVE BLENDING DECIDES A DEFAULT, AND IT IS THE ONE CONTROL BEYOND THE
BRIEF'S FOUR.** Overlapping petals brighten where they cross because the
fragments genuinely add. The consequence is that a line already drawn at full
white has no headroom, so the single-line level IS the glow control:
`brightness` ships at 30%. That also gives the additive check its calibration
rather than a threshold picked to pass — tone mapping is off and the colour is
set in linear space, so **the brightest pixel a single fully-covered line can
produce is exactly sRGB(brightness)** (137/255 at 25%, 170 at 40%), coverage
and the depth dim can only lower it, and anything above it is accumulation.
Measured: the frame reaches 255 with tens of thousands of pixels above the
single-line ceiling; under `NormalBlending` that count is the mutation's
witness.
**DO NOT "SIMPLIFY" `brightness` AWAY — it is not a redundant opacity slider.**
The reasoning is easy to lose because the control looks like one: white lines on
black, so surely the colour should just be white? A material colour of pure
white is exactly the state in which the glow STOPS WORKING — every single line
is already at the ceiling, a crossing adds nothing, and the picture flattens to
the same white mass at every density (photographed on the sheet at brightness
70%). The single-line level and the amount a crossing can add are the same
number, and there is nowhere else to put it. It is also what gives the additive
check a calibration instead of a threshold, so deleting the control deletes the
gate's basis for `blend/crossings-exceed-a-single-line` as well.

**THE DEPTH DIM IS EXACT, NOT A FEEL.** Three's linear fog fades by
`smoothstep(near, far, depth)`, so `dimToFog()` pins `near` at the nearest
point of the model on the LIVE camera and SOLVES the far plane from the
closed-form inverse (`t = ½ − sin(asin(1−2y)/3)`) so the farthest point lands
at exactly the amount asked for. The read-out can then say what the number
means — at 60% the farthest line draws at 40% — and the gate checks the
arithmetic (delivered vs asked: 30.000 / 60.000 / 90.000%) instead of
eyeballing a gradient. Black fog under additive blending is a multiply, so a
far line simply adds less; `scene.fog` null/non-null flips `USE_FOG` in the
program, so the material is told when the fog APPEARS or GOES, not when its
numbers move. **The read-out states the SETTING and the gate proves the
delivery** — the DRAW panel's dim line is derived from the control, never from
`scene.fog`, because the fog is re-solved during the render and a read-out that
consulted it printed the previous frame's answer (a dim just switched on still
said "off"); what checks that the two agree is `dim/the-fog-is-solved-on-the-live-camera`,
against `__plot.depthRange()`. The panel is written when a control moves or a
grid loads, not per frame: nothing in it depends on the camera and rebuilding it
costs a `selectStrips` sweep per family (that is what the dead-step marker
asks). The frame time is the one live number and has its own line.

**THE SOURCE IS Z-UP** and the correction is one rotation on the one container
every grid is parented to. The witness is the attachment ring, which is flat
in the export: 28 attachments, world-Y spread 1.7e-15 against 8.1 and 7.7 of x
and z. A y-up misread exports nothing and throws nothing — only that check
sees it.

**BOTH MARGINS OF EVERY PETAL SURVIVE ANY STRIDE.** For the u family those two
lines are the petal's own outline, and dropping one at an even stride makes
every petal on screen read lopsided. `densityToEvery()` in plot-grid.js is the
one owner of the slider→stride map (right = every line, the `/print` `detail`
precedent) and `keepsIndex()` of the rule.

**EACH DENSITY SLIDER HAS DEAD STEPS, AND THEY ARE TOLD RATHER THAN TRIMMED**
— the `stamenSpread` ruling. A stride can only thin a family down to its two
margins, and WHICH steps are wasted is a property of the FILE: on this grid the
u slider has three dead steps (densities 2, 3 and 4 — strides 9 through 12 all
land on {0, 9} of ten columns) and the v slider has NONE, because over 29 rows
every stride to 12 keeps a different set.
No fixed range is dead-free and an adaptive maximum would make one slider
position mean different things on different files, so **the RANGE is named on
the read-out and hatched on the track** — `.plot-track--dead` and `--plot-dead`,
the convention `bloom.css`'s `.bl-ctrl--capped` established for `stamenSpread`,
mirrored for a slider whose dead travel is at the LEFT end. The panel prints
"density 1–4 all draw the same lines" at every position and adds "you are in
it" when the slider is inside; the range itself is untouched and the whole
travel stays reachable. **The mark compares the SELECTION, not its size** — over
ten columns stride 3 keeps {0,3,6,9} and stride 4 keeps {0,4,8,9}, four lines
each and a different picture, and a count comparison marked eight of the u
slider's twelve positions dead where three steps are (measured).
The gate asserts the per-step biconditional at all 12 positions of both
sliders, that the named range is the run those steps imply, and that the hatch
appears exactly when there is dead travel and to exactly its extent. A first
attempt asserted a STRICT decrease in segments and went red, which is how the
dead travel was found at all; a second hard-coded "v has none", which made the
mutation that EMPTIES v look like a dead-travel defect — an empty family really
is dead at every position, and the check is a biconditional now for that
reason.

**THE CAMERA FITS THE PROJECTED EXTENT, NOT A BOUNDING SPHERE**, and centres
on the drawing rather than on its box. A bloom grid is a wide flat disc: a
sphere fit leaves most of the frame empty, and a symmetric `max|offset|` bound
around a lopsided drawing centres the BOX and leaves the picture riding high.

**A FILE THAT IS NOT A GRID FAILS VISIBLY AND CHANGES NOTHING.** A mesh glTF
is named for what it is ("no LINE_STRIP primitives — found 2 triangles in 1
mesh. This looks like a mesh glTF, not a bloom grid export"), and the grid
that was on screen stays on screen — an empty viewport is indistinguishable
from a page that broke. `GLTFLoader.parse()` called directly does NOT catch
its own exceptions (the same measured fact `/print` records), so both the
throw and the error callback are handled.

**COST IS TRIVIAL AND THAT IS THE REPORT, NOT AN OPTIMISATION.** 0.10 ms
median CPU per settled frame at all 15,148 segments, headless software GL,
1100x800 (worst 0.20). The 26 ms first frame is shader compilation. Two
`LineSegments2` objects and one `LineMaterial`; the density sliders REBUILD
the segment buffers rather than mask, because rebuilding 15k segments is
cheaper than the bookkeeping to avoid it.

**SCROLL-ZOOM REPAINTED NOTHING, AND ORBIT DAMPING WAS NEVER THE REASON.**
The kickoff's hypothesis — "damping is on in `/bloom` and off here" — is wrong
in both halves, checked against the source rather than assumed: damping is ON
here (`dampingFactor` 0.09) and on `/bloom` (three's default 0.05), and
three@0.161.0's `OrbitControls.update()` eases only `sphericalDelta` and
`panOffset`. **The dolly `scale` is applied at full magnitude in one call and
reset to 1**, so `enableDamping` does not smooth zoom on EITHER page and turning
it up would not have helped; after this fix `/plot`'s zoom STEP is identical to
`/bloom`'s, and an eased dolly is a separate feel change nobody has asked for.
What was actually broken is the idle skip. `onMouseWheel` calls `scope.update()`
SYNCHRONOUSLY inside the wheel handler; that call moves the camera, updates
`lastPosition`/`lastQuaternion` and returns true to nobody. The animation loop's
own `controls.update()` on the next frame then recomputes the same pose, compares
it against the position the internal call already recorded, and returns FALSE —
so the frame was never redrawn. **Measured headlessly on a settled page before
the fix: five wheel events took the camera 95.68 -> 70.33 units while the
framebuffer hash stayed identical across all five.** The zoom only appeared when
something else dirtied a frame (a residual orbit tick, a slider), which is what
reads as choppy. The fix is one listener — `controls.addEventListener('change',
() => { dirty = true; })` — taking the signal from the source that has it,
before it can be consumed. **The idle skip is KEPT and is asserted in both
directions**: `zoom/a-wheel-event-repaints` (four wheel events, four distinct
screenshots) and `zoom/an-idle-frame-is-still-skipped` (0 frames painted over
1.5 s of nothing), each with its own mutant. Note the corollary for any future
check here: `readPixels()` forces a render, so it CANNOT see this defect — the
zoom cells sample the framebuffer with a screenshot.

**THE STEM IS INFERRED FROM THE PETAL LINES, NOT LOADED** (session of Sep 7;
`plot-stem.js`, `plot-warp.js`). The bloom generator has no stem geometry —
`below` throws, phase-2 work there — but the grid export already contains what
a stem is made of: **every u-line starts at z = 0 on the attachment ring**
(measured on the shipped grid: 280 u-lines, first-point z exactly 0.0000,
first-point radius 2.2766–5.3400 mm around a 4.275 mm hub). They are already
gathered. So the stem is those same lines CONTINUED DOWNWARD and pulled in
toward a bundle — no new object, no second curve stroked beside them, and
because ~280 lines stack in nearly the same place below the join it reads bright
under the existing additive blending with nothing told to brighten it. Read
`plot-stem.js`'s header before touching any of it.

**THE STEM IS THE U-LINES THAT ARE ACTUALLY DRAWN, and that coupling is TOLD
rather than worked around.** It thins with the u density slider and disappears
under "v only", where the panel says `no stem drawn — the stem IS the u lines
continued, and no u line is on screen`. A stem drawn from lines that are not on
screen would be a second, invisible line set with its own density.

**THE KICKOFF'S THREE TRAPS, AND WHAT ANSWERS EACH** (a funnel that steps
instead of tapering is a fourth the gate carries alongside them). They are the
reason this is a module with written-down answers rather than a picture someone
looked at: a stem that tears at the ring, a droop applied as a rigid rotation, a
bend that drags the bloom head with it and a stepped funnel ALL still draw a
plausible flower on a black field.

1. **DROOP IS NOT A RIGID ROTATION.** In `/print` the bloom and the stem are
   separate meshes on a pivot, so droop turns one rigid object. Here the lines
   are CONTINUOUS — the head cannot rotate without the stem following — so droop
   is a rotation whose ANGLE DECAYS along the stem, full at the ring and zero by
   the end of the neck, and that decay IS the curve that reads as a nodding
   flower. `neck` is therefore not derivable from `droop`: measured, the same
   40° head over a 20 mm and a 90 mm neck differ by 16.17 mm at 40 mm down.
2. **THE HEAD TAKES THE FULL ROTATION AND THE STEM THE WEIGHTED ONE, AND THEY
   AGREE AT THE RING EXACTLY.** `droopDecay(0, neck)` returns EXACTLY 1 and
   `convergence(0, join)` EXACTLY 0 — not "to within a tolerance" — so the stem's
   own s = 0 station evaluates to `rotateAboutRing(foot, centre, droop * 1)`, the
   same call on the same input as the head transform. The station is written as
   `foot + delta(s)` and NEVER as `centre + radius * direction`, because the
   second form does not reproduce the foot bit-for-bit at s = 0 even where it is
   analytically equal. **Measured: 216 of 216 corners identical to the bit in the
   gate, and a seam of 0 mm over all 280 drawn lines on the page**, which the
   panel prints. The head transform reaches EVERY family, not just u: a v-line's
   row 0 sits on the same ring, so a transform that reached only the u lines
   would tear the grid at the junction.
3. **THE BEND IS GATED BY THE CONVERGENCE CURVE AND DROOP IS APPLIED AFTER IT.**
   `convergence` is 0 at the ring, so a control point cannot drag the head
   however hard it pulls (measured: a 100 mm pull leaves the ring point identical
   to the bit while moving the stem 87.4 mm); and because the bend is added
   BEFORE the rotation, a handle means "displace the stem" rather than fighting
   the droop it is being rotated by.

**THE BEND MECHANISM IS `plot-warp.js`, IT IS DELIBERATELY RE-POINTABLE, AND THE
NEXT SESSION POINTS IT AT A PETAL'S OWN `u` AXIS — DO NOT REBUILD IT.** What it
is, in one line: control points along an axis, each with a gaussian falloff,
summed into a displacement applied to a BUNDLE OF LINES. The stem is one caller.
A petal warped along its own `u` is the next, and it needs the axis and the line
set — not a rewrite, not a second copy of the falloff law.

**THE BEND MECHANISM IS `plot-warp.js` AND IT IS DELIBERATELY RE-POINTABLE.**
Everything in it is a function of ONE SCALAR — a station along whatever axis the
caller owns — so the next thing that wants it (a petal warped along its own `u`)
needs no rewrite; nothing in it knows what a stem is. A gaussian and not a hat
or a spline: the sum has to be C-infinity so two handles BLEND rather than kink,
and a control point is a PULL, not a point the curve must pass through.
**The width is DERIVED, not a seventh slider** — `sigma = 0.6 x` the mean
distance to a point's neighbours, so adding a point makes the ones near it a
local adjustment, which is what adding a control point should do.
**THE ADD TIE-BREAK IS EXPLICIT, AND THE COMMON CASE IS A TIE.** Three evenly
spaced points on a 170 mm stem give gaps of 56.666666666666664 and
56.66666666666667 — equal by construction, one ulp apart as computed — so a bare
`>` handed the win to the second gap and "add another" subdivided the middle of
the stem instead of the stretch nearest the head. Measured on the page's own
defaults; ties now go to the gap nearest the ring.

**THE ROOT IS A MOVABLE POINT LIKE ANY OTHER** — a locked root only makes sense
for a plant in the ground, and this is a picture. `removeIndex` drops the MIDDLE
of the list so the two extremes survive; a remove that ate the root would make
that untrue after one click.

**A HANDLE LANDS UNDER THE POINTER, WHICH TAKES A SOLVE AND NOT A COPY.** The
drag undoes that station's own share of the droop, subtracts the station's
resting position, divides by the funnel gate, and subtracts what every OTHER
control point already contributes there — without that last term the handle
lands under the pointer plus its neighbours' pull, which reads as a handle
refusing to follow the mouse. **The gate floors the divisor at 0.1 rather than
dividing it back out exactly**: the offset still reaches every other station
through the gaussian tail, where the gate is 1, so an exact inverse would send
the whole stem flying as a handle approached the ring. A handle inside the funnel
therefore LAGS the pointer, and the read-out prints its gate.

**THE STATION LADDER IS UNIFORM WITH THE TOP ZONE PACKED, AND THE FIRST ONE
WAS GRADED AND WRONG.** Two things curve near the ring — the funnel closes over
the join, the droop washes out over the neck — and one thing curves anywhere: a
bend point. A single graded ladder (`s = L (j/N)^1.7`, 64 rows) served only the
first: it put a third of its rows in the top tenth and left the lower stem at
4.5 mm chords, where six bend points measured **1.15 mm** of corner-cutting —
about seven pixels at any framing that fits the drawing, and visible on the
contact sheet's own bend cell. So the BODY is uniform (`BODY_ROWS` 120, the only
spacing that makes a bend's resolution the same wherever the artist puts it) and
the TOP ZONE gets `TOP_ROWS` 24 of its own on top, MERGED rather than
partitioned so neither count depends on the other — which is what keeps a 0.5 mm
funnel a taper instead of a step. `topZoneOf(length, join, neck)` is the one
owner of how far down "the top" reaches, and it is the longer of the two.
144 stations on the shipped defaults, 40,040 stem segments.
`maxChordSagitta()` measures the corner-cutting and the page PRINTS it:
**0.000 mm at the defaults, 0.020 mm at a 40° droop, 0.025 mm at 90° into a
20 mm neck, 0.155 mm at six bend points with three 90 mm pulls**, and 0.576 mm
at an eight-point 120 mm zigzag — the one setting that can still be seen, and it
is on the panel rather than hidden.

**THE SEAM READS 0.0e+0 mm ON EVERY CELL OF THE SHEET, AND THAT IS THE ONE
NUMBER TO LOOK AT FIRST.** It is the largest distance between the head's own
answer for a foot and the stem's, over every drawn line, measured live and
printed on the panel. It matters because the head takes the FULL droop rotation
and the stem takes it DECAYED, from two different expressions: if those two
disagree at the ring by any amount at all, the 280 lines tear apart at the
junction — and a tear of a hundredth of a millimetre is invisible on a black
field while being exactly the defect that makes the drawing not a drawing of one
plant. It reads zero rather than "small" because both boundary values are exact
rather than approached (see note 2 above), and the sheet carries it on all 21
cells so a future change that breaks it cannot be photographed as fine.

**THE CAMERA FIT AND THE DEPTH DIM NOW SHARE ONE WALKER.** `eachDrawnPoint()`
walks every strip in the file at the current droop plus the stem strips that are
drawn, and both `fitCamera` and the fog's own sphere read it — otherwise a stem
hanging 170 mm below the head is either off the bottom of the frame or clamped
past the fog's far plane and drawn black. `viewBounds` is `localBounds` verbatim
when neither the droop nor the stem has moved anything, so the shipped no-stem
drawing fades exactly as it did. **A CONTROL STILL NEVER MOVES THE CAMERA** —
which is why the gate re-frames after turning the stem on, and why its first run
dragged nothing at all and reported it as a bend that does not move the stem
(the handle projected to y = 1327 on an 800 px page).

**THE SIX STEM CONTROLS AND THEIR DEFAULTS ARE APPROVED** (Eva, Sep 8, from the
contact sheet — "the stem and its six defaults stand"). They are a RULING, like
the DRAW defaults above, not a starting point the way `/print`'s fan table is.
Do not re-litigate them without a reason from the picture.

| control | default | range | what it is |
|---|---|---|---|
| stem | `inferred` | on / off | `off` draws the grid as the file wrote it |
| bundle | 0.35 mm | 0–5 mm | how tightly the lines gather |
| join | 12 mm | 0.5–80 mm | how gradually — and therefore the head-to-stem taper |
| length | 170 mm | 10–500 mm | total stem length |
| droop | 0° | −120..120° | tips the head about the grid X axis, toward +Y |
| neck | 45 mm | 1–300 mm | how far down the droop washes out |
| bends | 3, at rest | 0–8 | at a third, two thirds and the ROOT |
| show bend handles | on | — | you cannot drag what you cannot see |

**`bundle` 1.60 mm READS AS A TUBE WITH BRIGHT EDGES AT NORMAL FRAMING, AND THE
ANSWER IS A BIGGER BUNDLE, NOT A DIFFERENT LAW.** 3.2 mm across a 170 mm stem is
about a dozen pixels at any framing that fits the drawing, so 280 strands smear
into a band with a cosine-bright silhouette. The strands ARE there and each keeps
its own azimuth all the way down — cell 06 of the sheet is the same drawing with
the camera pushed in, and they are plainly separate. If separate strands are
wanted at reading distance, that is a larger `bundle`; do not reach for a
different gather law.

One thing that is an open question rather than a decision: the droop direction is
a FIXED axis. There is no droop azimuth control — the six controls the brief
named do not include one — so orbit to see it from another side.

**COST: THE FRAME IS TRIVIAL AND THE REBUILD IS WHAT THE STEM ACTUALLY COSTS.**
0.10 ms median per settled frame with 40,040 stem segments on top of the grid's
15,148 (worst 0.20), headless software GL, 1100x800 — the same order as the grid
alone, as the kickoff predicted. The REBUILD, which a slider drag pays on every
input event, is the number that matters and it was not trivial when first
measured: **13.5 ms median**, attributed by instrumenting the phases rather than
guessed — head transform 0.8, stem build 4.4, packing 2.8, and **`computeViewBounds`
6.6 ms**, more than building the stem. Two fixes, both structural rather than
tuning:
* **The bounds walk collected 135,000 numbers into a JS array** to measure the
  radius in a second pass. Walking twice and allocating nothing costs a third of
  that.
* **A STATION'S PLAN IS THE SAME FOR ALL 280 LINES.** The funnel's progress, the
  droop's decayed angle (with its cosine and sine) and the bend's gated
  displacement are properties of the STATION, not of the line passing through
  it — so `stationPlans()` computes them 144 times instead of 40,000, and
  `stemPointFromPlan` is the one owner of the point arithmetic with
  `stemPointAt` as the single-station front door onto it. Not a second
  expression of the law: the front door IS `stemPointFromPlan` on this station's
  own plan. Stem build 4.4 -> 1.6 ms.
Rebuild is **9.9 ms median** now, at 144 stations — where 80 body rows would be
8.5 ms and 160 would be past 12. If a future change makes the rebuild the
bottleneck again, the next thing to skip is the head transform during a BEND
drag: the head cannot move then, and re-transforming 16,268 points to prove it
is the one piece of work that is knowably wasted.

**Verify with `node tools/verify-plot.mjs`** (165 checks). Part one drives the
shipped `plot-grid.js`, `plot-stem.js`, `plot-warp.js`, `plot-petal.js`,
`plot-frame.js` and `plot-file.js`
functions in Node over fixtures whose answer is written
down (a stride of 3 over columns 0..9 keeps {0,3,6,9}; a stride of 4 keeps
{0,4,8,9} where 9 survives ONLY as the margin; a flat 21-row petal is 40 mm
long, 4 mm wide and holds its base over exactly 6 mm; a 2:3 box on a 1000 x 800
canvas at a 10% margin is 426.667 x 640 at (286.667, 80)), because on the real
grid a wrong stride, a wrong family split, a merely plausible fog range, all
four of the stem's silent failures, every one of the petal warp's and every one
of the composition file's still draw a plausible picture.
**EVERY DRAW CHECK RUNS WITH THE STEM OFF AND NO PETAL PICKED**, which the
gate's own `DEFAULTS` say, so the ink and segment counts there are the ones
/plot shipped and neither the stem nor a highlight can hide inside them; later
sections turn each on and require the draw controls to still work. Part two
drives the page in a real browser and
measures every pixel claim against the ACTUAL RENDERED FRAMEBUFFER —
`__plot.readPixels()` reads it back through `gl.readPixels` straight after a
render, so no DOM panel can be counted as ink and no PNG decode sits in the
way. **`--negative-control` runs FIFTY-ONE mutants and is required before
quoting a pass from a changed harness**; it re-serves broken copies of
`plot.js`, `plot-grid.js`, `plot-stem.js`, `plot-warp.js`, `plot-petal.js`,
`plot-frame.js` and `plot-file.js`
through the gate's own HTTP
server (and imports the broken module for part one — written into the REPO ROOT,
because `plot-stem.js` imports `./plot-warp.js` and a mutant anywhere else
resolves that to nothing), and fails if a mutation does not apply, if a check
the mutant NAMES stays green, or if a check it did not name goes red. The stem's
eleven are the four traps, the two halves of the zoom fix, a stem drawn for
lines that are not, a locked root, a drag that also orbits, a bend width that
stops coming from the neighbours, and a droop that reaches only the u family;
the petal's eleven are a base hold of 0.001 instead of 0, an ungated across
scale, a station guessed from the point's index, a station handed to a strip the
file never placed, a warp that reaches every petal, a warp that reaches only the
u lines, an along scale that also widens, a highlight material that never gets
the viewport's resolution, a pick that takes the nearest line rather than the
front-most, a drag that also selects, and a highlight that is a brightness as
well as a hue; and the OWNERSHIP's four each restore one half of the model Eva
corrected — selection stamping the panel onto the petal it just picked,
deselection dropping that petal's warp, only the SELECTED petal being drawn
warped (every other one's warp held but not applied), and the two scales staying
live with nothing picked, and a fifth for the defect the sheet found while
photographing them: the seam and the count of base points beside it naming
DIFFERENT populations. Note that four of those five are invisible without a
second warped petal on screen at the same time.
**THE FRAME'S FIVE** are a margin that never insets, a ratio that never reaches
the box, an ellipse drawn as a rectangle, a fit that ignores the boundary, and a
frame control that re-frames the drawing; **THE COMPOSITION FILE'S ELEVEN** are a
writer that drops a draw field, **a TABLE ROW that vanishes** (the one way a
field is lost with the writer and the reader still agreeing perfectly — neither
is looking for it, nothing is reported, and only the written-down census sees
it), a reader that skips a stem field, a missing field that stops being
reported, **the global warp model reintroduced in the file**, **a restored warp
that lands on the NEXT petal**, a grid mismatch that is not reported, a newer
version read anyway, a camera that is not restored, a selection that is not
restored, and a dropped warp folded onto petal 0 instead.

**A REFACTOR DISARMS A MUTANT IN TWO WAYS, AND THE GATE NOW CATCHES ONE OF THEM
IN A SECOND** (overnight session, Sep 10, from the multi-bloom refactor). The
known half is a `from` that has MOVED — the sweep reports "mutation did not
apply", which is survivable, but only if somebody runs that mutant, and a sweep
that never completes is the normal case here. **`--negative-control` now checks
every mutant's anchor BEFORE any mutant runs, for EVERY mutant rather than only
the ones an invocation is about to run** — the same reasoning the stale-name
guard carries, applied to the other half of a mutant's claim. It found five
disarmed mutants in under a second where the sweep would have cost half an hour
a piece, and it also catches the quieter case: **a `from` that now matches TWICE
mutates the first occurrence and says nothing**, so the mutation lands somewhere
other than where it is described.
**THE OTHER HALF IS A `to` THAT IS VALID SYNTAX AND INVALID AT RUNTIME, AND NO
STATIC CHECK CAN SEE IT.** `deselecting-drops-the-warp`'s anchor applied
perfectly; its replacement assigned to `petalWarps`, which had stopped being a
module variable and become a field of the selected bloom — an assignment to an
undeclared identifier, which in a module THROWS. The mutant reddened
`page/no-errors` and MISSED two of the three checks it exists for: **it was not
the defect it names, it was a broken page wearing that defect's coat.** Only
running it found this. Its guard on `instances.length` is a property of the page
rather than a softening: `EMPTY_INSTANCE` is FROZEN, so a write into the record
that belongs to no bloom throws rather than being quietly lost.
**AND ONE MUTANT'S BLAST RADIUS IS NOT DETERMINISTIC, so a mutant may carry
`mayAlso` beside `breaks`.** `a-handle-drag-also-orbits` named FOUR DIFFERENT
SETS over four consecutive sweeps: a page where every drag also orbits NEVER
SETTLES — `settle()` stops the moment `update()` reports the movement is below
EPS and the residue accumulates back over it — so the HANDLE checks fire every
run while everything downstream that reads the camera twice fires or does not
depending on where the residue happens to be when it looks. The same check was
UNCLAIMED on one run and MISSED on the next, and no single list can be right.
**`breaks` is the claim and every one must still go red; `mayAlso` is collateral
the mutation is ALLOWED but not required to cause; a check in NEITHER list going
red is still a failure.** The run prints how much of the collateral fired. It is
used by exactly one mutation, and the split says which half of its fallout is a
property of the defect and which is a property of the damping.
**RUN THE MUTANTS COVERING THE CODE A SESSION CHANGED FIRST.** A full sweep is
81 mutants at roughly six minutes each. The overnight session ran 34 of them —
its own 14, plus 20 pre-existing ones over the areas the refactor touched — and
named the other 47 as unrun rather than implying a complete sweep. Of the 20
pre-existing, SIX needed a correction, and none of the corrections was to a
check: five were `breaks` lists that were short in the honest direction, and one
was the broken `to` above.

**THE SEAM'S COUNT HAS TO NAME THE SEAM'S OWN POPULATION.** The seam ranges over
every warped petal (so one base drifting cannot hide behind another's holding)
and the count printed beside it was the SELECTED petal's share — so picking an
unwarped petal next to a warped one printed "every warped petal's base row is
unmoved to 0.0e+0 mm, over 0 points". Found by reading a contact-sheet caption,
not by a check, because the check compared the panel against the same field the
panel prints — which is its job (does the panel say what the page holds?) and is
structurally blind to the page holding the wrong thing. What sees it is a second
warped petal: `warp/two-petals-hold-different-warps-at-once` now asserts the
count is positive with nothing picked and GROWS when a second petal is warped.
**51 of 51 clean at that time; the gate is 194 checks / 65 mutants now and the current
figure is 65 of 65 — see the polarity and export section below.** The sweep costs well over
four hours — about six minutes a mutant, because each is a full browser run of every check.
`--mutant=a,b,c` takes a comma list and is how to re-verify one
without paying for the rest. **THE WHOLE-SWEEP RUN IS NOT SURVIVABLE IN A
CONTAINER THAT RESTARTS**: two attempts at it were killed
mid-flight (one at 26 of 35, one immediately after its base pass), so
mutants are closed out in CHUNKS of four or five — each chunk pays its
own base pass, which is cheap against losing an hour. The
one to run alone is `the-highlight-material-misses-the-resolution`: it
re-creates the pathological rendering it exists to catch and is the
slowest mutant in the file by construction.

**A MUTANT'S CLAIMED LIST IS NOT A GUESS TO BE LOOSENED — but a check that
LEAKS STATE will make it look like one.** Two things this session found by
running the control rather than by reasoning about it: the pick check would have
passed vacuously on any drawing whose petals never overlap (front-most and
nearest-on-screen agree everywhere there), so it now REQUIRES that they disagree
somewhere and says by how much; and `petalOn` had to be made rest the bend
points, because the check that drags a handle to prove both line families move
together left that bend in place and the stretch checks two aisles down then
measured a petal that was bent as well as stretched — 60.31 mm where 2.2x of
27.04 mm is 59.49. A slider cannot clear a bend offset, because a bend offset is
not a control value.

**A CLAIMED CHECK THAT NAMES NOTHING THE GATE RUNS CAN NEVER FIRE, AND THE CONTROL
REPORTS IT AS `MISSED (stayed green)` — which is indistinguishable from a mutation the
gate is genuinely blind to.** This session renamed
`readout/the-petal-panel-reports-the-axis-the-seam-and-the-neighbours` to
`...-and-the-warped-count` and left the old name on
`every-strip-reads-as-a-u-line`'s list. The mutant then failed the control for a reason
that had nothing to do with the mutation, and it cost a twenty-minute chunk to find.
The sweep now REFUSES any `breaks` entry naming a check the gate does not run, asserted
right after the base pass — the first moment every check name is known — and for EVERY
mutant rather than only the ones a `--mutant=` invocation is about to run, because a
stale name inside a skipped mutant is precisely the one nobody sees. Measured: one stale
entry on this tree before, zero after. **Renaming a check is therefore two edits, not
one**, and the guard is what makes forgetting the second one loud.

**AND TWO CLAIMED LISTS WERE WRONG IN THE HONEST DIRECTION, WHICH IS WHAT THE
CONTROL IS FOR.** `the-station-is-guessed-from-the-shape` was claimed to break
the check that a strip the file did not place gets no station — it does not, and
was right not to: the edit lands AFTER the guard that refuses a v-line with no
`u`. The claim came off the list and that guard got a mutant of its own.
`the-warp-reaches-only-the-u-lines` reddened three checks it had not claimed,
and all three are TRUE about it: the bend check asserts that ALL of a petal's
strips moved where ten of thirty-nine do, and both stretch checks measure a
half-width against a centre line the u-lines moved and the v-lines did not. They
were added to its list, not tuned out of the checks.

**THE DROOP REACHING ONLY THE U FAMILY IS ITS OWN CHECK, because every other
instrument here is looking at a u-line foot.** A v-line's row 0 sits on the same
ring as the u-lines' feet, so a head transform that reached only the family the
stem is made of would tear the grid at the junction while the seam, the count,
the drag checks and the panel's own numbers all stayed green. It is measured
with the u family SWITCHED OFF, at one camera — fit at droop 0, then only the
droop changed, because re-framing would move the picture for a reason that has
nothing to do with the head turning.
`__plot.settle()` advances OrbitControls until it reports no motion, which is
what makes a pixel measurement here repeatable at all — a fixed wait samples
an arbitrary point on the damping curve.

**THE IDLE SKIP IS MEASURED ON DRIVEN FRAMES, NOT ON WALL-CLOCK, and the first
version of that check passed the mutation it exists for.** Headless Chromium's
rAF is driven by the compositor, which idles when nothing is dirty — so 1.5 s of
doing nothing produced **2 frames under a page that renders EVERY tick**, the
same number a page that correctly skips them produces, and the always-render
mutant sailed straight through. Scheduling rAF from the page forces the frames
to happen and the two answers separate completely: **0 against ~60**. The check
also used to require the wheel to paint, which is the other check's job — so
removing the wheel fix reddened both and the pair stopped being a biconditional
over two independent properties.

**TWO CHECKS PASSED FOR THE WRONG REASON, and only the negative control could
say so.**
* **`stem/the-droop-reaches-every-family` was reading the FOG.** The fog is
  solved against what the drawing OCCUPIES, and that walker rotates every strip
  by the droop whatever the head transform did with it — so under the
  only-the-u-lines mutation the v-only frame changed because the FADE moved, at
  an identical ink count of 58,295 px, and the check went green. It runs with
  the depth dim OFF now, where nothing but the geometry can move the frame.
* **`bend/dragging-a-handle-leaves-the-head-alone` was measuring something a
  bend cannot reach.** `headTransform` does not take the warp at all, so the
  head's own vertices could not move however broken the gate was — measured, the
  ungated mutation left it green at 0 mm. What the gate protects is the JOIN,
  which is the stem's own s = 0 station, and there the ungated bend arrives
  through the gaussian's tail: tiny, and not zero. Both are compared foot by
  foot now, at exactly zero.

**AND ONE CHECK FLAKED ON THE CAMERA, TWICE, FOR TWO DIFFERENT REASONS — WHICH
IS WHY NO CHECK HERE ASKS FOR A FRAMEBUFFER TO COME BACK TO THE BIT.**
`stemOn()` re-fits, and a fit applies whatever damping residue the previous
section left, so a first frame can be caught mid-drift while a third, taken
later, is at rest: settle at the moment the window opens, not inside each
capture. That was not enough. **Damping never reaches exactly zero:**
`settle()` stops when `update()` reports the movement is below EPS, and every
LATER `settle()` still applies one more sub-EPS step — so three captures at the
"same" camera creep, and the third came back at 58,294 ink px against 58,295
with a different hash. That is /print's own measured lesson ("the camera did not
move" is not observable in this harness) arriving in a different disguise. A
hash INEQUALITY is safe, because a one-pixel drift can only help it; a hash
EQUALITY across two captures separated by anything at all is not. What carries
the claim instead is the SIZE of the change: 14,482 px of ink move when the v
family turns and exactly 0 when it does not.

**SEVEN THINGS THE STEM CHECKS GOT WRONG BEFORE THE NEGATIVE CONTROL WAS CLEAN,
each measured and each worth not re-learning.** Three passes of the control were
needed; besides the idle-skip defect above and the two below, four more mutants
had UNCLAIMED reds that were all true statements about the mutation and are now
named on its list — a Z-up misread puts the stem into the screen, so the root
handle projects off the canvas and a drag on it reaches nothing AND the droop's
own on-screen effect shrinks from 14,482 px of ink to 798, under the bar of the
check that measures it; a decay of 0.999 at the ring is BELOW the smoothstep's
own first step so the decay stops being monotone; a stepped funnel is not flat
where it lands; and how fine the station ladder has to be is a property of the
WIDTH LAW, so changing it moves the bend case from 0.155 mm to 0.442.
**THE COMMON SHAPE OF ALL OF THESE:** a mutation that breaks the page globally
reds checks that are about something else, and the honest remedy is to NAME them
on that mutant's list, not to loosen the check until the red goes away. **A REFACTOR SILENTLY DISARMS A MUTANT:**
`the-bend-is-not-gated-by-the-funnel` edited a line that the station-plan
factoring moved, and the control reported "mutation did not apply" rather than a
false pass — which is the one thing that makes that failure mode survivable.

The next two are the same mistake as each other:
a check anchored to a number that belongs to a DIFFERENT check, so it reported
on the reader instead of on itself.
* **THE RING'S CENSUS BELONGS WITH THE COUNT CHECK, not with the check about
  the continuation's shape.** `ring.count === the file's u count` sitting in
  `the-continuation-runs-from-the-foot-to-the-root` made a broken READER look
  like a broken continuation. It is with the count now — and asserted at THREE
  densities, which is the claim it was actually there to make: the ring is read
  off every u-line foot in the file, so thinning the grid does not move where
  the flower hangs from.
* **A CHECK MEASURED ON THE V FAMILY HAS NOTHING TO MEASURE WHEN A MUTATION
  EMPTIES IT.** `the-droop-reaches-every-family` reads the v-only framebuffer,
  so the reader mutation that calls every strip a u-line legitimately reds it —
  named on that mutant's list, the same way the two other v-family checks
  already were.

**FOUR THINGS THE STEM CHECKS GOT WRONG ON THEIR FIRST SWEEP, each measured and
each worth not re-learning:**
* **A CONTROL NEVER MOVES THE CAMERA, so a check that turns the stem on has to
  re-frame.** The first run left the camera fitted to the head alone, projected
  handle 1 to y = 1327 on an 800 px page, dragged nothing at all, and reported
  it as a bend that does not move the stem.
* **COMPARING INK ACROSS TWO FRAMINGS MEASURES THE ZOOM.** "The stem adds ink"
  read 95,314 px without it against 11,569 px with it, because the frame that
  has to hold a 170 mm stem shrinks the head. The fit happens once, with the
  stem on, and only the stem is switched.
* **THE SEAM HAS TO BE COMPARED THROUGH THE SHIPPED BUFFERS.** Both builders
  write Float32; handing the stem an f64 foot and the head an f32 one compares
  two roundings of two different inputs and failed 54 of 216 corners on a stem
  that is exact.
* **"THE CAMERA DID NOT MOVE" IS STILL NOT OBSERVABLE HERE** — /print's own
  measured lesson. Damping never reaches exactly zero, so the handle-drag check
  is a bar only a real orbit can clear: 5.7e-7 of a 343-unit standoff when the
  drag does not orbit, tens of units when it does.

**The stem has its own sheet: `node tools/shot-plot-stem.mjs <dir>`** — 21
cells: what ships with the handles hidden and as the page opens it, the bundle
tight and loose and then CLOSE (at this framing 1.60 mm reads as a tube with
bright edges, and the strands are only legible zoomed in), droop at 35° and 80°
seen square on, the SAME 60° head into a 15 mm and a 130 mm neck (the argument
that the neck is its own control), the join as a pair, length as a pair, the
panel, four bend cells, and the v-only coupling with the thinned stem. The panel
cell is captured BEFORE the bend cells on purpose: `reset()` rests every bend
point's offset but does not restore the COUNT, because the page's reset button
is specified to rest the points it has — restoring the default three would be
the sheet's convenience deciding what a control does, and taken after the
six-point cell the panel showed six. Every bend cell
is a REAL pointer drag on a handle the page itself projected to the screen, and
every caption carries the measured seam and chord. **The droop is only legible
from along world X** — it tips the head from grid +Z toward grid +Y, and the
Z-up correction sends grid +Y to world −Z, so the whole droop lives in the world
Y–Z plane; the sheet's first run used a mostly-+Z direction and photographed an
80° droop as a face-on rosette. `tools/shot-plot.mjs` sets `stem: 'off'`, because
it is the sheet about the grid.

The grid's own sheet is `node tools/shot-plot.mjs <dir>` — the two families apart and
together at a low camera angle, two density settings, each lever as a pair,
the drag-and-drop swap actually swapping (a real `File` on a real
`DataTransfer` through a real dispatched `DragEvent`), the panels, and the
mesh glTF being refused. **It quotes no pixel delta anywhere**, because the
renderer is not deterministic between page sessions and none of these cells
needs one; every cell settles by screenshotting until two consecutive frames
are byte-identical.

**ONE PETAL CAN BE PICKED AND DEFORMED, AND `plot-warp.js` WAS NOT REBUILT TO DO IT**
(session of Sep 8; `plot-petal.js`). The bend mechanism was written re-pointable on
purpose — a function of ONE SCALAR station along whatever axis the caller owns — and
this is its second caller. What the new file supplies is the AXIS: where a petal's
stations are, how long it is, and what a displacement at a station does to its points.
Read `plot-petal.js`'s header before touching any of it.

**THE STATION IS ARC LENGTH IN MILLIMETRES ALONG THE PETAL'S OWN MEASURED CENTRE LINE,
NOT `u`** — the open question this file's own NEXT list recorded, closed with a reason. The file
parameterises a petal by u in [0,1] and that is what PLACES each point; but u is a
parameter, and the export's own telemetry records `metricMax` reaching 4.12 under cup,
so evenly spaced u is not evenly spaced millimetres. `sigmasFor` derives a bend's width
from the gaps between stations, so the units it is handed decide what a handle MEANS: a
gaussian of constant width in u is a bend whose physical size changes along the petal.
So u orders the rows and the centre line measured through them supplies the millimetres,
and a sigma reads in mm exactly as the stem's does. **On the shipped grid the two agree
to 2e-5 mm** — which is what a flat build looks like and is not a reason to assume it.
That also answers the third parked question: a bend point's sigma is never "on an axis of
length 1", because the axis is the petal's own length (18.6 to 35.0 mm across this file's
28 petals, so bends are stored as FRACTIONS `t` — the stem's convention, for the stem's
reason).

**THE STATION COMES FROM THE FILE, NEVER FROM THE POINT'S INDEX**, the discipline
`kindOf` already followed. A v-line carries its own `extras.u`; a u-line's point i sits at
row i of its panel's declared `u` ladder (`extras.panels[].u` on the petal node), matched
BY LABEL so a cleft petal's three panels each keep their own. `i / (count - 1)` happens to
equal them on a uniform ladder — which the shipped grid is, so the real file cannot tell
the two apart, which is why `stationsForStrip` is driven in the gate over ladders written
down. **A strip the file did not place gets NO station and the petal holding it is
refused WHOLE** (`petalList().warpable`, with a `why` the panel prints): deforming the
rest of a petal and leaving one strip behind tears the grid internally, and a line drawing
is the worst possible place to notice it.

**THE TWO LINE FAMILIES CANNOT PART COMPANY, STRUCTURALLY.** A petal is 10 u-lines of 29
points and 29 v-lines of 10 points over ONE lattice — the u-line in column c and the
v-line in row r hold the same point, **bit for bit, 0 mismatches over all 28 petals**
(measured). Every term of the law depends on a point and on its station and on nothing
else — never on which strip the point arrived in — so the two copies take the same
displacement and the grid cannot tear internally. Asserted as an IDENTITY on the fixture
and on the page, at five settings including a real handle drag.

**THE BASE IS HELD BY THE DELTA BEING EXACTLY ZERO, NOT BY A COMPARISON.** Every u-line
starts on the attachment ring at z = 0 and the inferred stem continues from precisely
those points, so a petal that moved at its base would tear off the bundle — the failure
the stem's join gate exists to prevent, coming the other way. The law is written
`point + delta`; `rootHold` returns EXACTLY 0 at station 0 and the centre-line term is a
difference of a value with itself there, so all three components are exactly zero and the
point is handed straight back. **`=== 0` and NOT `Object.is`**, because a zero's sign here
follows the sign of `along - 1` and `-0 === 0` is true while `(-0) + 0` is `+0` — a point
whose own coordinate is a negative zero would otherwise stop being the file's point.
The hold is **`ROOT_HOLD_ROWS = 3` of the file's OWN ROWS**, not a fraction and not a
length: a gate shorter than the lattice spacing cannot be drawn — it would step between
row 0 and row 1 rather than taper, the failure the stem's funnel already has a check for.

**ALONG AND ACROSS ARE INDEPENDENT BECAUSE THEY ACT ON DIFFERENT HALVES OF ONE
DECOMPOSITION.** Every point is its row's centroid plus an offset from it: `along` scales
the CENTRE LINE about the base (longer petal, same cross-sections), `across` scales the
OFFSET (wider petal, same length). Both at k is a similarity; either alone is not.
**The across scale is GATED and the along scale is not**, and that asymmetry is
load-bearing: along is anchored by construction (it multiplies `centre − base`, zero at
the base), while widening a petal's own foot would overrun the arc its neighbours occupy
on a ring 28 petals share AND move the feet the stem is built from. So the petal flares
out of a foot whose width the junction owns.

**A MAXIMUM HALF-WIDTH IS BLIND TO A GATED NARROWING, and the first version of the check
failed on it.** Because `across` rides `rootHold`, the rows inside the hold keep the width
the junction gave them; narrow the blade enough and the petal's WIDEST point moves INTO
the hold, where it is by design not narrowing. Measured: on the written-down fixture (every
row 4 mm) the maximum reads **4.00 mm at across 0.5 and at across 0.25 alike**, and on the
shipped grid **across 0.4 lands the scaled blade on exactly the base row's own 3.2 mm** —
a check watching the maximum would have passed that one for no reason at all. So the claim
is asserted ROW BY ROW: the blade past the hold scales exactly, the base row does not move
at all.

**PICKING IS A LIST FIRST AND A CLICK SECOND, AND THAT ORDER IS MEASURED — the sheet sweeps
the canvas at two cameras and prints it, so every number here comes out of a committed
tool.** On this bloom with the shipped 8 px tolerance, at the home framing: **only 15.8%
of pixels have any line within reach of a click at all; of the clicks that DO hit, 62.5%
have two or more petals within tolerance and 39.5% are ones where the nearest line on
screen and the nearest line to the camera belong to DIFFERENT petals.** At a LOW angle,
where the whorls overlap most, it is **10.6% / 75.6% / 49.6%** — quoting only the
flattering camera would be quoting half a measurement. **Widening the tolerance is not the
lever**: the hit rate runs 14.3% at 4 px to 18.0% at 14 px, because what is scarce is INK
and not reach. (The gate reads 19.3 / 59.8 / 36.6 at its own 1100x800 framing against the
sheet's square one, and asserts the RULE on every probe rather than the numbers.) So the
dropdown
(flanked by two steppers) is the control to rely on and the click is a convenience, and the
click takes the **FRONT-MOST** line within tolerance: depth testing is off and every line
is drawn, so the front petal is the one the eye means, and among two crossing lines the
front one does not change as the pointer moves a pixel where the nearest-on-screen one
does. A click that travelled more than `CLICK_SLOP_PX` is an orbit and leaves the
selection alone.

**THE PICK IS A CPU PASS OVER THE DRAWN STRIPS, NOT A RAYCAST, and that is a design choice
rather than a shortcut.** The page draws all 28 petals into four buffers, so a raycast
could say WHERE it hit and never WHICH PETAL; splitting the draw into 56 objects to make
picking work would be paying for picking on every frame instead of on every click.
~16k points, once per click. `scanSegments` is the one projection and `pickPetalAt` and
`petalDistancesAt` are its two consumers — the RULE lives in exactly one of them, which
is what lets the gate re-derive the answer from a different primitive than the shipped
rule uses.

**THE HIGHLIGHT IS A HUE, NEVER A BRIGHTNESS — and getting that right is a colour-space
trap.** Overlapping petals already brighten where they cross, so "this one is brighter" is
the one signal this page cannot spend. The selected petal draws through a CLONE of the one
material (so weight and brightness reach it from their single owner) in the panel's own
teal. But `setScalar(b)` writes b as a LINEAR value while `setHex` converts an sRGB hex
INTO linear, so teal-at-hex times brightness came out at **0.142 linear where white sat at
0.300** — a selected petal a third dimmer than the drawing, which under a depth dim is
exactly the cue for "further away". Dividing by the accent's own largest linear channel
first puts the highlight's ceiling at exactly `brightness`, so the calibration the additive
check rests on holds for both. **The DRAW counts do not move when the selection does**: the
per-family segment and line counts are taken from the whole drawn set, not from the object
each strip landed in.

**A SECOND `LineMaterial` NEEDS THE RESOLUTION AND THE FOG FLAG, AND THE SYMPTOM OF
FORGETTING IS NOT A WRONG PICTURE — IT IS A STALLED RENDERER.** A fat line's width is
computed in the shader by dividing by `resolution`, and `resize()` set it on the one
material there used to be. The cloned highlight kept the clone's default, so every one
of a selected petal's 541 segments rasterised as a screen-filling quad: **one control
write went from 0.2 s to 7.9 s and the headless GPU process sat at 350% CPU**, which read
as the gate hanging rather than as anything to do with a highlight. The fog FLAG is the
same shape of mistake — three compiles `USE_FOG` into the program, so a material has to be
told when the fog APPEARS or GOES and a clone that is never told keeps the program it was
first compiled with while the drawing beside it fades. `materials` is now the list both
`resize()` and `updateFog()` walk, and
`select/the-highlight-material-carries-the-resolution-and-the-fog` is the witness —
neither property is visible in a segment count, in a colour, or in a line set, which is
why nothing else here could see it.

**THE WARP RUNS FIRST, ON EVERY STRIP IN THE FILE, AND EVERYTHING ELSE READS ITS OUTPUT.**
`applyPetalWarp` produces `warpAll`; the density selection, the droop, the stem, the camera
fit and the depth dim's own sphere all walk that — so there is one answer to "where is this
point", and a petal stretched to 2.5x is in frame and inside the fog rather than half out
of it. **The stem does not notice a warp at all**, structurally rather than by ordering:
the law is exactly the identity at the base, so the feet `buildStem` continues from are the
file's own points. Measured with the stem drawn at a 40° droop and the petal at 2.5x in
both directions: every foot and every station of a stem line identical to the bit.

**"ONLY THE SELECTED PETAL MOVED" IS AN ARRAY IDENTITY, NOT A TOLERANCE.**
`applyPetalWarp` hands back the very array the file wrote for every strip it did not move
(and `petalPoints` returns the SAME array at rest, the discipline `headTransform` already
follows at droop 0), so a strip that shifted by a millionth of a millimetre would be a new
array and would be counted. The panel prints the count; the gate asserts it is exactly the
off-petal set.

**A WARP BELONGS TO ITS PETAL, AND SELECTION LOADS RATHER THAN APPLIES** (Eva's correction,
Sep 8, from the deploy preview — this SUPERSEDES the "a switch rests the bends and carries
the scales" model that shipped first). `petalWarps` is a `Map` from petal index to that
petal's own `{ along, across, bends }`; the two sliders and the handle set are a VIEW ONTO
the selected entry, never a page-wide shape that the selection points at. Picking a petal
calls `loadPetalControls()` and writes the panel FROM the store; nothing writes the panel's
values INTO a petal except a hand moving a control (`commitPetalScales()`, on the control's
own `input`). Deselecting writes nothing at all.

**The first model was wrong in BOTH directions and each half looked like its own bug.**
Picking a petal stamped whatever the sliders happened to read onto it, so selecting a petal
DEFORMED it — a destructive act, on a page whose whole point is choosing which petal to look
at; and moving off a petal took its shape away again, so an adjustment could only exist while
its petal was the one selected. One cause: **the warp was global.** The consequence that made
it worth a correction rather than a tweak is that many petals warped differently at once —
the shape every reference composition has — was not merely awkward under the old model, it
was UNREACHABLE.

**AND THE GATE COULD NOT HAVE SEEN IT, WHICH IS THE MORE USEFUL HALF.** Every phase-2 check
picked a petal and then wrote a value, in that order, so "stamped on selection" and "loaded
on selection" produce the SAME drawing on every one of them; and no check ever looked at a
petal after stepping off it, so "the warp is kept" and "the warp is dropped" were equally
consistent with all 116. The four checks that separate them are the ones Eva named —
`select/picking-a-petal-deforms-nothing` (every petal identical to the BIT across a pick,
with a warped petal already on screen), `warp/a-warp-survives-deselection`,
`warp/two-petals-hold-different-warps-at-once`, and
`select/selecting-a-warped-petal-loads-its-own-values` — plus four mutants that each restore
one half of the old model. **A check that writes the state it then measures cannot see who
owns that state**; the witness has to be a read taken across a selection change.

**`petalWarpStore()` IS WHAT A CHECK ASKS, NOT THE PANEL.** "The panel shows 1.90x" and
"petal_0 holds 1.90x" are exactly the two facts the global model conflated, so the page
exposes both — the store (every entry, with `rest` and `warped` per petal) and
`petalControls()` (what the two sliders read and whether they are disabled). A count of moved
strips cannot stand in for either.

**THE BEND OFFSETS STAY ON THEIR PETAL TOO, and the argument that they should rest on a
switch was an argument for the wrong thing.** A bend offset IS a world displacement in
millimetres, so it would point the opposite way relative to a petal on the far side of the
bloom — but that is a reason not to CARRY it to another petal, and under per-petal ownership
nothing carries anywhere. Each petal keeps its own control points and its own offsets, and
picking another one shows that petal's.

**WITH NOTHING PICKED THE TWO SCALES ARE DISABLED AND READ AN EM DASH**, not `1.00x`: a
number beside a control that applies to nothing is the global model's own advertisement. The
read-out then says how many petals carry a warp — first, and whether or not one is picked,
because a warp outlives its selection and "none picked" must not read as "nothing is
deformed".

**THE SEAM RANGES OVER EVERY WARPED PETAL, NOT OVER THE SELECTED ONE.** With several
deformed at once, one base drifting could otherwise hide behind another's holding. Its
companion count of base points is the same population — the count the seam sentence is ABOUT
— while the selected petal's own `movedMm` is kept separately, because "moved up to N mm" has
to say whose.

**A FROZEN REST OBJECT NEEDS EVERY FIELD ITS READERS TOUCH.** `REST_PETAL` — what
`readPetal()` returns with nothing picked — first shipped as `{ along: 1, across: 1 }`, and
`warpFor` maps over `st.bends` unconditionally: **38 `pageerror`s, and `rebuild()` aborted
part-way through, leaving stale panel outputs beside a live drawing.** A rest object is a
value of the same TYPE, not a smaller one.

**PERSISTENCE IS BUILT — see the composition file below.** The shape this section predicted is
what shipped: **the file stores a warp PER PETAL** (index → `{ along, across, bends }`), not
one warp for the drawing, because a file with a single global warp could not express the
state this page can already reach.

**A HANDLE THAT PROJECTS UNDER A CONTROL COLUMN CANNOT BE GRABBED** — /print's measured
lesson, arriving here as a real limit of the tool rather than of the harness: the gate and
the sheet both search for a handle in the clear, and the answer for a hand is to orbit.
Petal handles are AMBER where the stem's are teal, because with a drooped head the two runs
can cross.

**THE SIX PETAL CONTROLS ARE NOT A RULING** — unlike the DRAW and STEM defaults above.
Eva HAS now turned them on the preview, and what came back was the ownership correction
above rather than a ruling on the numbers: "I said the defaults stand, I take that back."
So the defaults are still a starting point:

| control | default | range | what it is |
|---|---|---|---|
| petal | `none` | none + the file's own order | a fresh grid picks nothing |
| along | 1.00x | 0.25–2.50 | the centre line, scaled about the base |
| across | 1.00x | 0.25–2.50 | each point's offset from it, held at the foot |
| bends | 2, at rest | 0–6 | at the middle and the TIP; add subdivides the widest gap |
| show bend handles | on | — | you cannot drag what you cannot see |
| (click tolerance) | 8 px | — | not a control; `PICK_TOLERANCE_PX`, and not the lever |

**The petal has its own sheet: `node tools/shot-plot-petal.mjs <dir>`** — 20
cells: what ships with nothing picked, a petal picked at rest (the highlight
alone), the handles, one petal BENT by a real drag with the other 27 untouched,
that bend cropped to the petal's own measured box with both families on and then
each family alone (the internal-tearing cells), along long and short, across wide
and narrow, the narrow petal close enough to read its held foot, long-and-narrow
together, **the OWNERSHIP TRIO** — another petal picked while the first stays
stretched (the panel loading 1.00x / 1.00x beside a bloom that is still
deformed), FOUR petals at four different shapes at once, and those same four with
NOTHING picked and the two scales switched off — then a stretched petal on a
drooping stem, a tip handle dragged with the head already drooped, and the panel.
**Every caption prints PICKED and WARPED as two separate facts**, read off the
page's own store rather than restated from what the tool wrote, because those are
precisely the two the global model conflated; beside them the SEAM (over every
warped petal), how far the selected petal moved, and how many strips came back as
the arrays the file wrote. The index carries the click-picking
measurement at TWO cameras and the tolerance sweep beside it. No pixel delta is quoted anywhere and every cell settles until two
consecutive frames are byte-identical, the same discipline the stem sheet
follows.

**PICK AND SET ARE TWO SEPARATE WRITES IN THE HARNESS AND THE SHEET, and one blanket
`set()` is what makes several petals at once impossible to photograph.** Both tools drive
the page by writing every control in one sweep, and the picker is one of those controls: a
sweep carrying both `petalPick` and `petalAlong: 1` picks the petal, LOADS its values, and
then puts 1.00x straight back over them. That is legitimate page behaviour — a hand dragging
the slider to 1.00 really does rest that petal — and it silently resets the very state the
check is about. `pick()` writes only the selection; scales are applied after it, never with
it.

**THE FRAME IS A CROP REGION IN THE VIEWPORT'S OWN PIXEL SPACE, AND `frameRect` IS ITS ONE
OWNER** (session of Sep 8; `plot-frame.js` — read its header). An aspect ratio is a property
of an output image, and a boundary defined in grid millimetres would change shape every time
the camera turned, so the boundary is a function of the canvas size in CSS pixels, the ratio
and the margin, and of nothing else. The overlay's own vertices, the camera fit, the
read-out's pixel figures and the saved file all read that one function.

**TWO SHAPES AND A SEPARATE RATIO, NOT FOUR TYPES.** A square is the rectangle at 1:1 and a
circle is the ellipse at 1:1 — reachable exactly rather than as named types that could
disagree with the ratio control — and the ellipse is INSCRIBED IN THE VERY SAME BOX, so
switching the shape moves no edge. The ratio select is written from `FRAME_RATIOS` and the
file reader checks a saved ratio against that same array: two lists of ratios is one of them
being wrong. **THE MARGIN INSETS FROM THE SHORTER SIDE**, so one number is the same visual
gap on a wide window and a tall one, and margin 0 puts the boundary on the viewport edge at
every ratio.

**THE BOUNDARY IS A DRAWN LINE AND THE EXTERIOR IS NOT VEILED, and that is a decision with a
reason rather than the cheap option.** On a black ground under additive white ink, dimming
the exterior dims only the INK (the ground is already black either way) and a letterbox is
indistinguishable from the ground entirely — so wherever the drawing does not reach the edge,
which is most of the boundary's length, neither treatment states where the frame is at all.
A line does, everywhere. It is drawn in the panel's teal so it reads as chrome, as its OWN
primitive in its OWN scene through an orthographic camera in CSS pixels, in a second pass
with `autoClear` off (/print's overlay discipline), and with **NORMAL blending where the
drawing is additive** — a teal line that added to the ink beneath it would brighten exactly
the crossings the additive look is about. The DRAW panel's segment counts are identical with
the boundary on and off.

**RESET FITS THE FRAME; A FRAME CONTROL NEVER MOVES THE CAMERA.** `fitTangents` is the one
expression both arms go through, and **the unframed arm is the expression /plot shipped, term
for term** — hand it the canvas's own box and it returns `tanY` and `tanY * W / H`, and
`camera.aspect` IS W/H. The gate asserts that with `===` on the arithmetic, and separately on
an 800x800 viewport where a 1:1 boundary at margin 0 IS the viewport, so the framed fit has
to land on the same camera as the unframed one. The consequence is deliberate and is the
reason the frame ships ON: changing the ratio leaves the drawing overrunning the new boundary
until you reset, and a frame that shipped off would guarantee that overflow the first time
anyone switched it on.

**INK OUTSIDE THE BOUNDARY IS STILL DRAWN — this marks the crop, it does not apply it**, and
the panel says so in those words. What a non-rectangular frame costs downstream is recorded
in `plot-frame.js`'s header rather than left to be rediscovered: RASTER export needs alpha
outside the ellipse or a fill in the ground colour (cropping to the bounding box keeps the
four corners), SVG needs a real `<clipPath>` applied to every stroked path, and BACKGROUND
SHAPES will have to clip AT this boundary rather than at the viewport — which is the point at
which the boundary stops being an overlay and becomes a clip region other things read.

**THE FOUR FRAME DEFAULTS ARE APPROVED** (Eva, Sep 9, from the deploy preview: *"Frame ships ON
at rectangle / 2:3 / 6%"*). They are a RULING, like the DRAW and STEM tables above, and the two
reasons are hers: **the fit being frame-aware is the deciding argument** for shipping ON — a
boundary that shipped off would guarantee the drawing overflowed it the first time anyone
switched it on — and **2:3 portrait matches the references she is working from**. **The frame
shipping ON is the one change to what the page looks like when it opens**, and it is one word
to turn off. Do not re-litigate them without a reason from the picture.

| control | default | range | what it is |
|---|---|---|---|
| frame | `on` | on / off | whether there is a boundary at all |
| shape | rectangle | rectangle / ellipse | two types; the ratio is the other axis |
| ratio | 2:3 | nine `w:h` values | 1:1 gives the square and the circle |
| margin | 6% | 0–40% | of the SHORTER side, inset on all four |

**A COMPOSITION SAVES AND LOADS BACK, AND THE FILE'S SHAPE IS THE PART THAT WILL NOT BE CHEAP
TO CHANGE** (`plot-file.js` — read its header before changing anything about what is
written). `plot-composition` v1, JSON, and **the root is a LIST OF INSTANCES holding exactly
one**. A composition will eventually carry several blooms at different scales — the reference
this direction is aimed at is five — and that is a change to the root's CARDINALITY, not to
its fields: `{stem, petals, camera}` at the root would have to be migrated in every file
already saved, where `{instances: [...]}` only ever gains entries. Each instance carries its
own grid identity, stem parameters, per-petal warps and a TRANSFORM (identity today, and
REPORTED as not applied if a file carries another); the frame, the camera, the draw settings
and the selection stay at the top level, because they are properties of the composition and
not of any one bloom. **Multi-instance loading, selection and transforms are NOT built, and
nothing about them is foreclosed.** The selection is ONE cursor (`{instance, petal}`) at the
top level rather than a remembered petal on each instance, because you can only be editing
one petal of one bloom at a time.

**THE WARP IS PER PETAL IN THE FILE AS ON THE PAGE** — `instances[i].petals` is a LIST of
`{index, along, across, bends}`, one entry per petal that has ever been selected, and not one
warp the bloom shares. A file with a single global warp could not express the state the page
can already reach (four petals at four shapes), which is why the previous session's ownership
correction is a property of the FORMAT and not only of the page. Entries at REST are saved
too: an entry exists because that petal was selected, which is real state, and saving only the
deformed ones would make the round trip inexact for a reason nobody could see.

**FOUR THINGS CLOSE THE TRAP, AND NONE OF THEM IS A COMMENT.** A restore that silently does
not restore something is invisible — every field can be dropped in the write, dropped in the
read, or read into the wrong place, and the page is plausible either way.
1. **ONE FIELD TABLE PER GROUP, WALKED BY BOTH DIRECTIONS.** `composeDoc` builds each group by
   iterating its table and `readDoc` reads it by iterating the same table, so a field cannot
   be written and not read. What the TABLES say is checked against a written-down census in
   the gate, because a table ROW that vanished would round-trip perfectly while losing its
   field — that is a mutant (`the-frame-field-table-loses-a-row`).
2. **EVERY SCALAR IN THE FILE IS A CONTROL'S OWN VALUE, VERBATIM.** Nothing is converted,
   rescaled or renamed on the way in or out, so "read into the wrong place" needs a wrong
   `control` in the table rather than a wrong conversion nobody can see. The bounds come from
   the control's own `min`/`max`/`step` at read time, so the markup cannot drift from the
   format.
3. **A MISSING FIELD IS REPORTED AND THE PAGE IS LEFT ALONE, NEVER DEFAULTED.** Defaulting a
   field the writer forgot produces a page that LOOKS restored, which is the exact failure.
   Every departure from a clean read — missing, unknown, clamped, snapped, re-ordered,
   dropped, not-applied — comes back as a note, so **"a clean round trip reports nothing" is
   a check rather than a hope**.
4. **A NEWER VERSION IS REFUSED, NOT PARTLY READ.** Ignoring fields a future version added is
   the same silent partial restore in another coat.

**THE GRID IS NOT IN THE FILE, AND A MISMATCH IS SAID FIELD BY FIELD.** It is ~1.9 MB and
already on disk, so what is stored is its name, the export's `mode` and the census the page
recounted from it. A composition restored against a different bundle is **restored, and told**
— not refused, because a re-export of the same bloom is a mismatch too — with the mismatch as
the loudest line in the panel naming what differs (`petals 28 → 40`), because "the hash
changed" is not something an artist can act on and a SILENT wrong petal is the worst thing
this format could do. **A warp for a petal the grid does not have is DROPPED and counted,
never folded onto a neighbour** (`resolvePetals`), and both halves are mutants.

**AND ONE CHECK COVERS THE FORM OF SILENT PARTIAL RESTORE NO ROUND TRIP CAN SEE:** a control
added later that nobody saved round-trips perfectly, because it is not in the file to be
compared. `save/every-control-on-the-page-is-a-field-of-the-file-or-a-named-exception`
enumerates the panels' own inputs and requires each to be a field of a table or one of three
named exceptions (the two file inputs, and `petalPick`, which the file carries as the
selection). Adding a control to `/plot` now fails the gate until it is saved or exempted.

**THE FRAME AND THE FILE HAVE THEIR OWN SHEET: `node tools/shot-plot-frame.mjs <dir>`** —
16 cells in four sections. The boundary at both shapes, at 1:1 / 2:3 / 16:9, at margin 0 and
30%, with the frame-off pair; the "a control never moves the camera / reset fits the
boundary" pair; and **a real save, a real page RELOAD and a real restore**, with the measured
per-field difference printed in the caption, because a picture of a round trip is worth
nothing without the number beside it. The saved file is written out beside the sheet. The
last cell is a restore against a DIFFERENT grid, which is the failure that matters most.

**SIX THINGS THIS SESSION'S CHECKS GOT WRONG BEFORE THE SWEEP WAS CLEAN, each measured:**
* **THE STALE-NAME GUARD CAUGHT A RENAME NOBODY MADE ON PURPOSE.** Two new checks had
  identifiers colliding with names already live in `run()`, so they were renamed with a
  word-boundary regex over the new block — and `\bcircle\b` matched inside the check NAME
  `frame/a-square-is-a-rectangle-at-one-to-one-and-a-circle-an-ellipse`, because `\b` matches
  at a hyphen. The check registered under a name no mutant claimed and two mutants claimed a
  name the gate did not run. The guard the last session added for a DELIBERATE rename is what
  reported it, on the first negative-control invocation, before a single mutant ran.
  **Rename identifiers by hand in a file whose check names are prose.**
* **A FRACTION OF THE VIEWPORT IS NOT A PLACE** — /print's lesson, arriving here for the
  second time and from a new direction. The zoom check wheeled at "30% of the width, half the
  height" and the click check aimed at `petalScreenPoint(7, 0.5)`; both sat on bare canvas for
  two sessions and then sat on the GRID read-out, because the COMPOSITION panel made the left
  column **180 px taller**. Four wheel events moved the camera **0.0 units** and scrolled a
  paragraph instead, and the click check reported on a panel. `barePoint(fx, fy)` now ASKS the
  page (`document.elementFromPoint`) and throws if nothing is in the clear, and the aim is
  SEARCHED for over petals and fractions the way the sheets already search for a handle.
  **Any panel added to this page can do this again.**
* **THE OUTLINE IS A `Float32Array`**, because that is what the geometry buffer takes — so a
  coordinate near 700 px carries ~8e-5 of quantisation and the ellipse's own residual lands
  near 3e-7. The first version of the inscription check asked for 1e-6 and failed on the dust
  rather than on the geometry.
* **A `Map`'S ITERATION ORDER IS NOT STATE.** `petalWarps` inserts an entry the first time a
  petal is picked, so a session that picked 7 then 2 iterates 7, 2 — while a restore inserts
  them in the file's own sorted order. Comparing the store unsorted made "did it come back" a
  claim about which petal was clicked first. (The FILE sorts by index on purpose, so two saves
  of one page produce the same bytes.)
* **AND THAT SORT MEANS A FIXTURE CANNOT EDIT `petals[0]` AND THEN LOOK FOR THE PETAL IT
  NAMED** — `composeInstance` sorts, so `petals[0]` was petal 2 while the check went looking
  at petal 7 for the nine bends it had just written.
* **AN OVERFLOW IS ON WHICHEVER SIDE IT IS ON.** "The drawing overruns the new boundary" was
  measured at the FOOT, and with the stem off — which the gate's DEFAULTS say — the drawing is
  a wide flat disc whose unframed fit is WIDTH-limited, so it reads −107 px: the drawing
  sitting comfortably inside the very edge it was overrunning.

**AND SIX MORE THE SWEEP ITSELF TAUGHT, once the base pass was clean.** Every
correction below names what a mutation really does; none loosens a check.
* **A WRITER AND A READER THAT BOTH WALK THE SAME TABLE AGREE PERFECTLY ABOUT A
  FIELD THAT IS GONE — measured, and the reason the census is WRITTEN DOWN rather
  than derived.** `the-frame-field-table-loses-a-row` MISSES the round-trip check
  entirely: `composeDoc` never writes `margin`, `readDoc` never looks for it, the
  comparison never compares it, and both halves report a clean read. The
  round-trip check is the strongest-looking instrument here and it is structurally
  blind to this one failure, so a census derived FROM the tables would be blind
  with it. Predicted by the format's own design, then confirmed by the control —
  which is the order to keep: any future field group needs its row in the census
  the same day it needs its row in the table.
* **A CHECK WHOSE *DETAIL STRING* ASSUMES ITS OWN PREMISE TAKES THE SWEEP DOWN
  INSTEAD OF GOING RED.** Two did. `restore/a-file-that-is-not-a-composition-…`
  quoted `junkState.error.slice(…)`, and the mutation it exists for is the one
  that ACCEPTS the file — so `error` was null and the run died on its second
  mutant; `restore/a-composition-from-a-different-grid-…` did the same on
  `mismatch.map`. Collect every outcome first, then build the detail.
* **A REFACTOR DISARMS A MUTANT, AND THAT IS THE SURVIVABLE FAILURE.** This
  session's own null-grid guard split the line `the-grid-mismatch-is-not-reported`
  edits, and the sweep said "mutation did not apply" rather than passing falsely.
* **VERIFY AN EDIT LANDED; DO NOT TRUST THE ASSERT.** A python script that
  asserts on several anchors and writes at the END throws before writing, so a
  correction to an EARLIER anchor is lost with it. Two list widenings vanished
  that way and only a re-run found them — chunk 6 reported the identical
  unclaimed reds chunk 5 had.
* **A MUTATION THAT KEEPS THE CAMERA MOVING REDDENS EVERYTHING THAT READS THE
  CAMERA TWICE.** `a-handle-drag-also-orbits` takes SIX composition and frame
  checks with it, because the composition section performs two real handle drags
  and the camera is still easing when the snapshot and the serialisation are
  taken a moment apart; `a-frame-control-moves-the-camera` takes a STEM check,
  because `set()` writes the whole control set on every sweep. "The same camera
  twice" is a premise on this page, and both mutations break it wholesale.
* **AND A CHECK CAN CLAIM VALUES WHILE COMPARING COUNTS.**
  `save/the-document-describes-the-page-as-it-stands` shipped comparing the
  petal COUNT, which is exactly what `the-petal-warps-are-written-globally`
  leaves untouched — every entry still written, each carrying the first entry's
  numbers. Strengthened to compare each entry's scales and bends, not unclaimed:
  a file whose per-petal values do not describe the page is precisely what that
  check is named for.

**POLARITY IS A RENDER-PATH CHANGE, NOT A COLOUR SWAP, AND `plot-polarity.js` IS THE
LAW** (session of Sep 9; read its header before touching any of it). The screen is white
ink on black under ADDITIVE blending, so crossings brighten toward white; inverting the
colours alone gives a WHITE RECTANGLE, because additive ink on a white ground saturates on
the first line. The symmetric operation is MULTIPLY.

**MULTIPLY AND NOT SUBTRACTIVE, and the two are the same operation reparameterised** —
`dst * src` against `dst * (1 - src)` — so nothing is given up either way and the only
question is which quantity the material colour carries. Under multiply it carries the ink's
TRANSMITTANCE, which is what a single line LOOKS LIKE on white paper: the additive
calibration mirrors term for term, and the accent's own hex still draws TEAL, where under
subtractive a teal INK prints as teal's complement (a dull red) and the colour in the panel
would stop matching the colour on the canvas. Either choice needs exactly one inversion;
multiply puts it on a SCALAR where subtractive would put it on every hue on the page.

**EVERYTHING BLENDS IN sRGB-ENCODED VALUES HERE, MEASURED FROM three's OWN SOURCES, and
that is why the two regimes are not symmetric on their own.** `LineMaterial`'s fragment
shader orders its chunks `tonemapping -> colorspace -> fog -> premultiplied_alpha`
(LineMaterial.js:411-414), so the colour is converted to the output space BEFORE the
blender and before the fog; `refreshFogUniforms` hands `fog.color` over in
`renderer.outputColorSpace` (three.module.js:27779); and `premultipliedAlpha` defaults TRUE
on WebGLRenderer, so the premultiplied branch of the blend switch is the one that runs
(RGB behaviour is identical in both branches, and this page's opacity is 1). Measured
consequence:

| level 0.30 | n=1 | n=2 | n=3 | n=4 | n=6 | n=10 | saturates |
|---|---|---|---|---|---|---|---|
| screen ink | 149 | 255 | 255 | 255 | 255 | 255 | at n=2 |
| print ink (raw value) | 37 | 69 | 96 | 119 | 156 | 202 | never |

**SO THE ANSWER IS A TRANSFER, NOT A SECOND SET OF DEFAULTS** — the question the session
was asked, answered with numbers. Print's material colour is the transmittance whose sRGB
encoding is `1 - sRGB(level)`. Then: **one line lands at exactly the same ink either way
(`screen px + print px === 255` at every position of the control — 63/192, 108/147,
149/106, 196/59, 231/24, 255/0)**, an identity rather than a tolerance; **the depth dim is
the same law in both, algebraically** (fading a transmittance toward 1 gives ink
`255(1-f)(1-t)` exactly as fading a level toward 0 gives `255 s (1-f)`, so a far line is
`(1-f)` times a near one's ink in both regimes) and only the fog's COLOUR flips; and **what
is left asymmetric is the CROSSINGS, which is irreducible and in the good direction** —
print holds six distinguishable levels (149 211 237 248 252 254) where the screen holds two
(149, then white). The panel PRINTS that ladder rather than describing it. The slider keeps
one meaning, "a single line's ink", and its LABEL follows the polarity (brightness /
darkness) while its ID does not, because `brightness` is what every saved composition names.
A shared RAW value would have been four times off, which is what makes this worth a transfer.
**A BLACK FOG UNDER MULTIPLY DRIVES FAR LINES TOWARD `dst*0` = BLACK** — the depth dim would
make the most DISTANT lines the heaviest thing on the page — and nothing in a blend-mode
check can see it, so it has its own check and its own mutant. The ground and the fog are ONE
field per polarity for exactly that reason.

**TWO ARTEFACTS COME OUT OF THE TOOL, BOTH CROPPED TO `frameRect()`, AND THEY LIVE IN THE
FRAME PANEL** because the frame defines the output bounds — export is not a global action.
`plot-export.js` owns the parts that are not the page's; read its header.
* **THE RASTER IS THE FRAMEBUFFER ITSELF at 4x**, through the page's own renderer and
  materials, so the additive or multiply result survives BY CONSTRUCTION rather than by an
  argument about colour spaces — a render target would blend in a different space and the
  picture would quietly stop being the one on screen. **The line widths are scaled by the
  same factor and the resolution is told the truth**: leaving `resolution` at the screen's
  would keep the strokes right and would also be a lie to a material about how big its
  viewport is, which is the exact state that once rasterised every segment here as a
  screen-filling quad. The crop goes through `frameRect` AT THE BUFFER'S OWN SIZE — the same
  owner, asked the same question about a bigger canvas — and the achieved scale is reported,
  never the asked-for one (the GL cap here is 8192, so 4x fits at 1100x800; it would not on
  a larger viewport). **Outside an ELLIPSE is TRANSPARENT, not filled**: alpha is strictly
  more information, since a viewer or a layout that wants the ground composites it in one
  step where a ground-filled PNG cannot have its corners taken back off. A rectangle is
  fully opaque, so this only ever touches the ellipse.
* **THE SVG IS AN HONESTLY DIFFERENT ARTEFACT AND THE UI SAYS SO.** SVG has no additive and
  no multiply, so the crossings cannot survive as vector; that is not engineered around with
  per-path opacity, because a plotter draws UNIFORM strokes and takes its depth from line
  DENSITY, which is exactly what this geometry produces. Strokes are flat and full strength,
  and the ink level and depth dim do NOT reach the file. **ONE PATH PER LINE STRIP, NEVER ONE
  PER SEGMENT** — measured on the shipped grid: **1,372 paths and 1,372 pen-downs against
  55,188 draws**, where per-segment emission is fifty-five thousand pen lifts and the
  difference between a plot that finishes and one that does not. A strip is split only where
  the projection has nothing to say (a point outside the depth range), splits are counted,
  and **a run of ONE point is not a path** — `M x y` with nothing after it is a pen-down and
  no stroke, which some plotter software puts down as a dot. **REAL MILLIMETRES**, from the
  grid's own `asset.extras.units` and the camera in closed form
  (`2 tan(fov/2) · distance / viewportHeight`), with the SVG's user unit equal to one
  millimetre so a stroke width is a real width: the shipped grid at the home framing comes
  out **154.24 x 231.36 mm with a 0.361 mm stroke** — a real fineliner width, converted from
  1.1 px rather than relabelled. **THAT STROKE FIGURE IS AT DPR 1, AND THE DIMENSIONS ARE THE
  ONLY HALF THAT IS DPR-INDEPENDENT.** `frameRect()` and the mm/px scale are both in CSS
  pixels, so the width and height are the same on any display; but `resize()` sets each
  material's `resolution` to the DRAWING BUFFER's size — it does so on `main`, where three's
  own Line2 example uses the CSS size — so `linewidth` is a width in DEVICE pixels and a
  retina display draws every line HALF as wide as the slider says. The export divides by the
  pixel ratio so the file matches the screen, which is why the same drawing exports 0.361 mm
  at DPR 1 and **0.129 mm at the contact sheet's DPR 2** (with its closer camera). The
  conversion is faithful; what moves is /plot's own line width, and it is pre-existing rather
  than the export's. **Do not quote one of those numbers as "the" pen width.**
  **That scale is exact AT THE TARGET PLANE and is said so**:
  this is a perspective projection, so nearer parts are magnified and farther reduced. If the
  grid's units are not millimetres, the file says what they actually are. **The boundary is a
  real `clipPath` IN BOTH SHAPES** — the rectangle too, rather than leaning on the SVG
  viewport's own overflow, so "every stroked path is inside a clip that IS the boundary" is
  one statement with no special case — and the boundary itself is NOT drawn, because it is
  chrome.
* **THE SVG'S GROUND RECT MUST BE INSIDE THE CLIP, and it shipped outside it for an hour.**
  Outside, a screen-polarity ellipse comes out as a full black RECTANGLE with an ellipse of
  white lines floating in it — neither the boundary the page drew nor what the raster's own
  elliptical alpha produces. **Found by RENDERING one and reading the corners, not by reading
  the text**, and it is now a mutant.

**AN EXPORT DRAWS THE INK AND NONE OF THE CHROME, AND THE WITNESS IS THAT IT IS GREY.** One
rule with three consequences rather than three decisions: the frame's own boundary is an
indication of the crop (baking a crop indicator into the cropped image would be an odd thing
to plot), the bend handles are an editor, and the SELECTED PETAL'S TEAL exists to answer
"which one am I about to grab" — an exported print with one teal petal in it is a bug report.
All three are suppressed for the render and restored in a `finally`. **Both polarities' ink
and ground are neutral, so every pixel of a correct export has `r === g === b` EXACTLY**,
where the accent (0x6fb7ae) and the petal handles' amber (0xd6a15c) are neutral in no
channel. That is an identity, not a threshold, and one statement catches a leaked boundary,
a leaked handle and a leaked highlight at once — measured 0 non-neutral pixels of 330,176
with all three on screen.

**THE TWO POLARITIES HAVE DIFFERENT LEVEL DEFAULTS, AND THE ASYMMETRY IS THE POINT**
(Eva's ruling, Sep 10, from the print artefact). **Screen keeps `brightness` 30%** — "the
blowout at the center is the glow, and it was in what I approved. That's the look."
**Print's default is 16%, tuned on the PRINT artefact and never matched to the screen
number.** `levelDefault` per polarity in `plot-polarity.js` is the one owner of both, and
`levelDefaultFor()` the one reader. **WHY THEY DIFFER, so a later session does not "fix" it:
ADDITIVE SATURATES AT WHITE** — past a couple of crossings every deeper one lands on the
same pixel and the tonal range is spent, which IS the approved glow — while **MULTIPLY
APPROACHES BLACK ASYMPTOTICALLY** and never saturates, so crossings keep separating and a
screen-tuned level throws that away. Measured on the shipped grid at the sheets' framing:

| | ink crushed to the far end | greys carrying the ink |
|---|---|---|
| screen 30% (approved) | 36.3% | 7 |
| print 30% (inherited — the state ruled against) | 24.8% | 16 |
| **print 16% (tuned, shipped)** | **17.3%** | **20** |
| print 8% | 8.4% | 23 — but the line is 175/255, too pale |

**The pick is print-native: the DARKEST level still on the ladder plateau** (occupancy holds
to 16% and falls from 18%), so it is the most legible single line — 144 of 255 — that has not
begun trading away crossing separation. **A FULLY UNCRUSHED PRINT IS NOT REACHABLE ON THIS
DRAWING** and the tuning is HOW MUCH rather than WHETHER: the ink reaches black after 10
crossings at 16% and after 13 even at 8%, where a 28-petal bloom stacks far more than that at
its centre. Do not read the residual black core as a defect to tune out.
**SWITCHING POLARITY TAKES THE NEW DEFAULT, and that costs a hand-tuned level** — said rather
than hidden. It fires ONLY on a real change (`applyPolarity` is the one owner of
`shownPolarity`, so a re-selection of the polarity already showing leaves the level alone, and
a whole-control-set write lands the same way whatever order it walks). **AND ONLY FROM THE
EVENT: `applyFields` — the composition restore — writes `.value` and dispatches nothing**, so
a restored polarity never moves the restored level. That separation is load-bearing and is
asserted (`restore/a-restored-level-is-not-replaced-by-the-polarity-default`): if the restore
ever started firing the handler, every saved print composition would come back at the default
instead of at the level it was saved with, **and the round-trip check would still pass**,
because it compares the page against the file it just wrote. Remembering one level PER
POLARITY would keep a hand-tuned number across a switch; it is a change to the FORMAT (two
levels where there is one field) and is deliberately not done.
**THE GATE'S OWN "VERBATIM" RULE CAUGHT THE FIRST VERSION OF THAT CHECK**: `brightness` is an
`int` field carrying the control's own 0–100 value, so writing `0.41` into a document meant
0.41%, and the check went red on its own premise rather than on the page. Two mutants carry
the ruling — `the-print-polarity-inherits-the-screen-level` and
`the-two-level-defaults-are-made-the-same`, the second being exactly the "fix" this section
exists to prevent.

**POLARITY IS A `draw` FIELD AND `VERSION` IS 2.** It rides with the draw settings because
it IS one — it decides how the fragments blend and it changes what the two controls beside
it MEAN — and its values are imported from `plot-polarity.js` rather than restated, the way
the ratios come from `plot-frame.js`. **The bump is the point of having a version**: nothing
breaks without it (a v1 file has no polarity key, the reader reports it missing and the page
keeps what it has, which is rule 3 working) but leaving it at 1 would mean "version 1" no
longer names one shape. Old files still load and say what they are missing.
**A RESTORED POLARITY IS A BLEND MODE AND NOT A SELECT VALUE** — restoring the control while
the renderer stayed where it was is a silent partial restore that passes every
field-by-field comparison, so the blend constant and the clear colour are read back from the
renderer itself on both sides of the trip.

**THE GATE IS 197 CHECKS AND 67 MUTANTS; THE SWEEP WAS COMPLETE AT 65 of 65 AND THE TWO ADDED FOR THE LEVEL-DEFAULT RULING ARE VERIFIED**
(Sep 9-10, run in chunks over two sittings). The base pass is 194 checks / 0 failed and every
mutant reddens exactly the checks it claims. **THE SWEEP WAS STOPPED AT 41 PART-WAY THROUGH,
ON EVA'S INSTRUCTION** (a usage-limit call, never a judgement about the code) and then RESUMED
on her word — the record is kept because the stop was real and the honest partial was posted
at the time, but the standing number is 65 of 65.
**THE STOP TAUGHT SOMETHING THAT OUTLIVES IT: DO NOT DESCRIBE AN OUTSTANDING SET AS "CODE
THIS SESSION DID NOT TOUCH" WITHOUT CHECKING.** Of the 24 then outstanding, **19 targeted
`plot.js` or `plot-file.js`, both of which this session changed**; only five were in
`plot-grid.js` / `plot-petal.js`. Three sat ON this session's own edits and were run FIRST
when the sweep resumed, which is the right ordering for a sweep that may be interrupted again:
`the-saved-document-drops-a-draw-field` (`DRAW_FIELDS` is exactly where `polarity` was added),
`a-newer-version-is-read-anyway` (`VERSION` went 1 -> 2), and
`the-highlight-material-misses-the-resolution` (the highlight material now carries the polarity
hue transfer). All three came back clean.
**THE RESUMED 24 NEEDED NO CORRECTIONS AT ALL** — every chunk green on its first run, no
`breaks` list widened, no check changed. That is worth recording beside the two corrections
the first 41 DID force, because it is the distribution: the checks that needed work were the
NEW ones, and the older mutants covering older code were already sound.
**THE FIRST 41 EARNED THE SWEEP'S KEEP TWICE**, which is why finishing it was worth the time:
`the-depth-dim-is-never-applied` found a NEW check whose detail string dereferenced state the
mutation removes (it THREW and failed the chunk instead of reporting — the frame/save session's
lesson, arriving in a new check), and `the-frame-ratio-is-ignored` reddened two new export
checks it did not claim, both true, because the export crops to `frameRect()` and nothing
else. Five things it taught this session:
* **A CHECK THAT READS THE PAGE'S REPORT IS NOT A CHECK ON THE FILE.** The millimetre check
  first asked `exportSvg()` for its own `widthMm`; a document dimensioned in screen pixels
  beside a report that still says millimetres would have sailed through it. It parses the
  emitted `width` / `height` / `viewBox` / `stroke-width` out of the text now, and the
  mutation is anchored on the DOCUMENT rather than on the report so the silent half is the
  one under test.
* **THE TWO REGIMES AGREE EXACTLY ON WHERE THERE IS INK AND CANNOT AGREE ON HOW MUCH**, and
  asserting both is what the complement check did on its first run. "Is there ink here" is
  the same question either way (the two values sum to 255 and no accumulation moves a pixel
  back toward its own ground) — an identity, measured at `screen ink 102,843 === print dark
  102,843`. "Is this pixel saturated" is precisely where they part, because additive clips
  where multiply does not: an 11,136 px gap, REPORTED beside the identity and asserted as an
  asymmetry, never as an equality that happens to be nearly true.
* **A REFACTOR DISARMS A MUTANT, AND THE SWEEP IS WHAT SAYS SO.**
  `the-highlight-is-a-brightness-as-well-as-a-hue` edited the peak normalisation inside
  `applyStyle`; the polarity transfer moved that into `hueRGB`'s SCREEN arm and the anchor
  check reported it MISSING. Re-anchored, with the polarity check it also reddens named on
  its list. Note the trap it would have been the other way round: leaving the constructor's
  `blending:` literal in place while `applyStyle` overwrote it every call would have made
  `blending-is-not-additive` pass SILENTLY, so that mutant is re-anchored onto the one map
  from a polarity's blend name to three's constant, which both the constructor and
  `applyStyle` read.
* **TWO HOLES CAME OUT OF RE-READING THE DIFF ADVERSARIALLY, not out of a failure**, and
  both are the shape that passes everything already written. A raster whose line widths did
  not scale with the buffer is the SAME PICTURE in hairlines — right aspect, right crop,
  non-zero ink, still grey — so `export/the-strokes-scale-with-the-image` measures an ink
  FRACTION across two scales (2.79% at 1x against 2.66% at 2x, a ratio of 0.956 where
  unscaled widths would halve it). And a projection that flipped y or lost the boundary's
  origin emits exactly the right number of paths, at exactly the right physical size, inside
  exactly the right clip, and draws the bloom upside down — so
  `export/the-svg-lands-where-the-drawing-lands-on-screen` maps the emitted coordinates back
  into the page's own pixel space and compares them against `drawnScreenBox()`, which walks
  the SAME population through the same camera: 1.31e-3 px apart.
* **A MUTANT CAN CLAIM A CHECK THAT CANNOT SEE IT, AND MSAA IS WHY.**
  `the-print-transfer-is-a-plain-inversion` was listed as breaking
  `the-two-regimes-agree-exactly-on-where-there-is-ink`; the control reported MISSED, and the
  CLAIM was what was wrong. That check is named for WHERE the ink is and a plain inversion
  puts ink in exactly the same places — because MSAA quantises coverage to a handful of
  steps, so both of its thresholds sit in EMPTY regions of the histogram. Measured: this
  drawing has exactly ONE populated screen bin between 1 and 39 (bin 38, 9,452 px) and
  print's mirror at 218 holds the same 9,452. Any monotone transfer inks the same pixels. The
  claim came off the list and the check now SAYS what it cannot see, so it is not re-added;
  the level is a law, it is asserted in part one, and part one reddens.
Also: `readPixels` gained `min` and `dark` rather than having `ink` made polarity-aware —
`ink` counts pixels above a BLACK ground, which is the right question on screen and a
meaningless one on white paper, and a great many checks are written against that number.
**AND THE SVG EMITS PATHS WHOLE, LEANING ON THE CLIP TO REMOVE THE OVERFLOW** — measured on
an ellipse at a zoomed-in camera, 26,430 of 56,560 emitted points lie outside the viewBox, so
plotter software that ignores `clip-path` draws every one of them. Pre-clipping instead would
mean splitting strips at the boundary, which is the one thing the file is built not to do (a
split is a pen lift), so the clip is the right trade and the caveat is real.

**The sheet is `node tools/shot-plot-export.mjs <dir>`, and it PRODUCES THE ARTEFACTS rather
than pictures of them** — a PNG and an SVG at each polarity and each shape, written to disk,
with the SVG rendered back through the browser's own engine (magenta showing through
wherever the file put nothing, which is how a clip is legible on a white artefact) and
embedded directly, so opening the sheet IS opening the files. The PNGs sit on a checkerboard
so the ellipse's alpha is visible instead of reading as a white fill.

**OUT OF SCOPE HERE ON PURPOSE, and none of it foreclosed:** background shapes, cut-and-pull,
lock view, and MULTIPLE BLOOM INSTANCES. The export path walks `drawnLineSets()` — a LIST of
line sets, today `grid` and `stem` — rather than naming two, so a second instance is another
entry there and not a change to how an export is built.

**Nothing here runs in CI.** Every GitHub Actions gate in this repo is
path-filtered to `flower*` / `bloom*` files, so `plot*` is covered by nothing
— run the gate and the sheet by hand. Note the corollary `/print` and `/cards`
already hit: `flower-export-watertight.yml` and `flower-geometry-quality.yml`
are path-filtered on `'tools/**'`, so ADDING `tools/verify-plot.mjs` makes both
flower gates run on a plot PR. They still test flower geometry; two green
`verify` jobs on a plot PR are not evidence that anything about `/plot` was
checked.

Dev-only deps, gitignored and not in `package.json` (same convention as the
other gates): `npm i --no-save three@0.161.0 playwright-core`, in ONE line.
Three is served from `node_modules` at the exact jsDelivr URLs `plot.html`
pins, so the gate needs no CDN egress.

**A COMPOSITION HOLDS SEVERAL BLOOMS, AND THE FILE NEEDED NO MIGRATION BECAUSE ITS
ROOT WAS ALWAYS A LIST** (session of Sep 10, overnight — read `plot-instance.js`'s
header before touching any of it). Build order step 5, and the last thing standing
between `/plot` and the reference composition of five blooms at different scales.
`instances` in plot.js is one record per bloom and `cur()` is the one window the
panels edit through. **THE VERSION DID NOT MOVE AND MUST NOT BE MOVED FOR THIS:**
nothing about the format changed — only how many entries the page puts in the list
it always had — so a file written before this session is one entry long and reads
back unchanged, and `plot-composition` v2 still names one shape.

**WHAT A BLOOM OWNS AND WHAT THE COMPOSITION OWNS** is exactly the split the file
already carried: a bloom owns its grid and everything measured from it, its inferred
stem and that stem's six values, its own per-petal warps and a TRANSFORM saying where
it stands; the frame, the camera, the draw settings, the polarity and the ONE
selection cursor are the composition's. The cursor is `(instance, petal)` and it is
one cursor, because you can only be editing one petal of one bloom at a time.

**IMPORT ADDS, AND A NEW BLOOM IS PLACED CLEAR OF WHAT IS ALREADY THERE.** A second
grid at the ORIGIN sits exactly on top of the first, which under additive ink on
black is indistinguishable from the import having REPLACED the drawing — the very
thing this change exists to stop doing. `placementFor` offsets it along +x by the
incoming bloom's own width plus `PLACE_GAP_FRACTION` (0.15) of it, DERIVED from the
two boxes rather than a constant, so it is the right size at any export scale. **The
FIRST bloom takes the identity transform**, which is what keeps a one-bloom page
drawn from the very arrays its file wrote.

**THE STEM'S SIX CONTROLS AND THE SEVEN PLACEMENT CONTROLS ARE A VIEW OF THE SELECTED
BLOOM** — `commitStem` / `loadStemControls` and `commitTransform` /
`loadTransformControls`, the same shape `commitPetalScales` / `loadPetalControls`
already had one level down. **SELECTION LOADS; IT NEVER APPLIES.** Picking a bloom to
look at it must not deform it, and deselecting must not take its stem away — the two
halves of the ownership error the petal warps had once, and the reason two blooms at
two different droops is reachable at all. `stemHandles` / `petalHandles` are the
exception and stay COMPOSITION-level: they are VIEW fields in the file and decide
whether an editor is drawn, not what any bloom's geometry is.

**THE ORDER IS WARP, DROOP, STEM, THEN PLACE, and the last step is the only new one.**
Everything before it runs in the bloom's OWN grid space — the space its ring, its
millimetres, its seam and its chord are written in — and `placeStrips` is applied to
the finished lines. Placing first would put every reported length in a space that
moves when a position slider does. **`placeStrips` HANDS BACK THE VERY RECORDS IT WAS
GIVEN AT THE IDENTITY**, so `warpAll[i] === strips[i]` still answers what it answered
before instances existed and every "nothing moved" claim on the page stays an array
identity rather than becoming a tolerance.

**`stemLine` / `stemFeet` REPORT IN THE BLOOM'S OWN SPACE, NOT WHERE IT STANDS** —
`inst.stemLocal` beside `inst.stemStrips`, the same array at the identity. Comparing a
PLACED stem against an unplaced head read a bloom that had merely been MOVED as one
whose stem had come off its ring: measured, a 155 mm seam on a stem that is exact.

**TWO BLOOMS' STEM FEET DO NOT COINCIDE, AND THAT IS THE LAW WORKING** — the stem's
own s = 0 station takes the FULL droop (decay 1 at the ring, which is what makes the
seam zero), so a drooping bloom's stem starts where a straight one's does not. A check
written on the premise that they agree costs a run.

**A FRAMEBUFFER EQUALITY EITHER SIDE OF A SELECTION CHANGE IS NOT AVAILABLE HERE** —
/print's and /plot's own measured lesson, arriving again: damping never reaches exactly
zero, so two `settle()`d captures separated by anything creep. "Selecting a bloom
deforms nothing" is asserted on the GEOMETRY (every record, and which arrays each bloom
is drawn from) and the ink is REPORTED beside it.

**COST: THE FRAME IS STILL TRIVIAL AND THE REBUILD IS WHAT SCALES.** Measured,
headless software GL, 1100x800, stems on, u/v density 12:

| | grid segments | stem segments | rebuild (median of 9 real slider events) | frame |
|---|---|---|---|---|
| 1 bloom | 15,148 | 40,040 | 8.3 ms | 0.40 ms |
| 2 blooms | 30,296 | 80,080 | 23.8 ms | 0.40 ms |
| 3 blooms | 45,444 | 120,120 | 31.4 ms | 0.40 ms |

**At three blooms with stems a slider drag pays ~31 ms per input event, which is past
the 16.7 ms frame budget** — a drag will read as steppy there. Reported rather than
optimised around. **The obvious fix is not built and is the next thing to do here: a
stem or transform slider changes ONE bloom, so `rebuild()` could rebuild that instance
and re-pack the buffers instead of rebuilding all of them.** A density slider genuinely
changes all of them and would still pay the full cost. The BLOOM panel prints the live
figures, because a number nobody prints is a number nobody watches.

**THE PANEL IS 8 CONTROLS HEAVIER AND THE UI OVERHAUL IS NOW OVERDUE.** BLOOM sits
between DRAW and PETAL so the two-level selection reads top-down. That takes `/plot`
to eight panels and thirty-two controls, two of which (the bloom picker and the petal
picker) change what a dozen others MEAN. The overhaul was already the most pressing
backlog item; it is more so.

**DECISIONS MADE WITHOUT A RULING** (overnight session, Sep 10 — Eva was asleep and the
brief authorised reversible implementation choices). Each names what was rejected and
how hard it is to undo:

1. **A new bloom is placed clear of the composition rather than at the origin.**
   *Rejected:* the origin — indistinguishable from a replace under additive ink.
   *Undo:* `PLACE_GAP_FRACTION` and `placementFor` in `plot-instance.js`.
2. **Scale is ONE uniform control; a non-uniform scale in a file is applied exactly as
   written and REPORTED as something the control cannot show.** *Rejected:* three scale
   sliders (this page is already over-full), and quietly making a saved non-uniform
   scale uniform — applying something other than what the file says, however reported,
   is the failure this format is built against. *Undo:* two rows in `TRANSFORM_FIELDS`.
3. **The last bloom cannot be removed.** *Rejected:* removing down to zero — an empty
   viewport is indistinguishable from a page that broke, a reading this project already
   refused once for a failed grid load. *Undo:* one comparison in `removeInstance`.
4. **`MAX_INSTANCES` is 8**, so the placement ladder (~92 mm a bloom on this grid) stays
   inside the position sliders' ±800 mm. The reference is five. *Undo:* one constant.
5. **The petal cursor RESETS when the bloom changes** rather than carrying the number
   across — petal 3 of one bloom is a different blade from petal 3 of another.
   *Undo:* one call in `setSelectedInstance`.
6. **Position sliders are ±800 mm at 1 mm steps** — about 9 mm per pixel of track, which
   is coarse. **Superseded as the placement gesture by the anchor drag (see below);
   the sliders stay as the axis-precise control and the read-out.** A number input would be precise and would break the panel's visual
   language; that is a look question and was left for Eva. *Undo:* the markup.
7. **The GRID, STEM and PETAL panels describe the SELECTED bloom and say so** when there
   is more than one; the DRAW panel's counts are the whole composition, summed, so its
   "drawn N of M" stays a ratio. *Undo:* the read-out functions.

**THE GATE IS 223 CHECKS AND 84 MUTANTS** — the per-instance rebuild session
added seven and three. The paragraph below is the multi-bloom session's, at 216
/ 81, and its check-name corrections still stand.

**AT 216 CHECKS AND 81 MUTANTS,** two check names changed because the
behaviour did: `swap/a-dropped-grid-replaces-the-one-on-screen` is now
`add/a-dropped-grid-is-added-beside-the-one-already-there`, and
`swap/the-file-input-loads-a-grid-too` is `add/the-file-input-adds-a-grid-too`. Two
file checks were claims about a CAPABILITY rather than about the file and the
capability changed (a transform is applied now, and so is a second instance); both are
re-stated as what the reader really does. **The gate's own grid loads now ACCUMULATE**,
so its add/remove section removes back to one bloom before every later section — and it
removes **from the END**, because the survivor has to be the bloom the page booted with,
the one at the identity transform: removing from the front leaves an ADDED bloom
standing 155 mm to one side, which is a perfectly good composition and not the drawing
`/plot` ships.

**A CHANGE THAT AFFECTS ONE BLOOM REBUILDS ONE BLOOM, AND THE CACHE VALIDATES ITSELF
RATHER THAN TRUSTING THE ROUTING** (session of Sep 10). `rebuild(only)` takes an
instance index for a per-instance change, `REBUILD_ALL` for a global one and
`REBUILD_VIEW` for one that moves no line. Each bloom keeps `built` (its finished
head and stem lines, placed and stamped) beside `builtKey` — every input to that
build which does NOT live on the record — and a cached answer is served only when
the key it would be built under IS the key it was built under. **So a misroute
costs a rebuild, never a wrong picture.** The trap this is built against is the
one the brief named: one bloom quietly not updating while the others do reads as
"the slider didn't take", is not a crash, and every check written before this
session passes on it.

**THE PARTITION, VERIFIED AGAINST THE CODE AND NOT RECITED.** PER-INSTANCE: the
six stem values, the stem's bend points, the instance transform (all seven
controls), the per-petal warps, and the petal cursor. GLOBAL: the two densities
and the family switch (they reach `selectStrips`), a bloom selection change, a
grid load, an instance removal, and a composition restore. NEITHER, and both are
cases the brief asked about: **`stemHandles`** is composition-level and moves no
line — it decided nothing about geometry, but it USED to ride inside `stemOf`'s
bag, which is the bag the BUILDER is handed, so a view preference sat unread among
a bloom's geometry inputs; it is now read by `syncHandles` through
`showStemHandles()` and by nothing else, which makes `REBUILD_VIEW` honest rather
than merely safe. **`petalPick`** reads as global (it changes which petal is
highlighted, and the highlight split is in the global tail) but resolves to
PER-INSTANCE: `isMine` is `isSel && …`, so no unselected bloom's build can read the
cursor at all — which is why the key carries `selected` only on the `isSel` arm.
Everything else the DRAW panel holds — weight, polarity, level, depth dim — never
called `rebuild` in the first place.

**`buildInputs()` IS THE ONE OWNER OF WHAT A BUILD DEPENDS ON GLOBALLY, and that is
what stops the key drifting.** `buildInstance` is HANDED it and reads no other
global; `globalBuildKey` serialises the same object. A key assembled beside the
builder rather than from it is a self-validating cache that has quietly stopped
validating anything — and there is no check that can see it, because under correct
routing the key is never load-bearing.

**THE BUILD PHASE IS NOW FLAT IN THE BLOOM COUNT AND THE COMPOSITION IS STILL OVER
BUDGET — say both.** Measured, headless software GL, 1100x800, stems on for EVERY
bloom (the stem is per-instance, so setting the control once reaches only the
selected one and the rows are not comparable), median of a 13-event slider drag,
same run so the columns compare:

| | stem slider | position slider | density slider |
|---|---|---|---|
| 1 bloom, main | 9.2 ms | 14.2 ms | 8.0 ms |
| 1 bloom, after | **7.2** | **10.9** | **5.5** |
| 3 blooms, main | 29.8 | 48.2 | 22.7 |
| 3 blooms, after | **20.1** | **21.2** | 16.1 |
| 8 blooms, main | 80.4 | 87.7 | 44.6 |
| 8 blooms, after | **51.2** | **53.5** | 51.5 |

**EIGHT BLOOMS IS STILL THREE TIMES THE 16.7 ms FRAME BUDGET, AND SO IS THREE.**
The improvement is ~1.5-1.6x on the per-instance controls and the goal is met
exactly — but it is not enough, and the phase split says why. The BLOOM panel's
`drag` line prints all three:

| phase | 1 bloom | 3 blooms | 8 blooms |
|---|---|---|---|
| **blooms** (what this change moves) | 2.2 ms | **1.5** | **1.6** |
| packing | 4.6 | 7.8 | 24.6 |
| extent walk | 4.1 | 8.9 | 22.6 |

**The build phase is FLAT — one bloom is built whatever the composition holds.**
Everything left is the global tail, and it is 47 of the 51 ms at eight blooms. The
density row barely moves for the same reason (it is global by nature and always
was); its 44.6 -> 51.5 is run-to-run variance on a 2 fps box, not a regression.

**THE TWO THINGS THAT WOULD ACTUALLY CLOSE THE GAP, WRITTEN DOWN AND DELIBERATELY
NOT BUILT** (both are the render-path restructure this session was told not to
pull in):
* **ONE SET OF SEGMENT BUFFERS HOLDS EVERY BLOOM**, so `stripsToSegments` re-packs
  the whole composition however little changed. Per-bloom buffers would make the
  packing per-instance too — and would multiply the draw calls and complicate the
  highlight object, which is why it is its own session.
* **`computeViewBounds` WALKS EVERY POINT OF EVERY BLOOM TWICE** — `warpAll`, so
  every strip in every file rather than the drawn subset, plus the stems. The
  first walk (the box) composes EXACTLY from per-instance boxes and could be
  cached the same way `built` is. **The second cannot**: it is the radius about
  the composition's own centre, and a radius about a global centre does not
  compose from per-instance radii about per-instance centres. A conservative
  radius is available and would change the depth dim's fade, which is a visible
  behaviour change and not a free optimisation.

**WHAT THE GATE ASKS, AND THE TWO INSTRUMENTS IT NEEDS.** A build COUNTER
(`instances()[k].builds`), because "bloom B was not rebuilt" is invisible in every
drawing — that is the whole trap — and a DIGEST of every drawn coordinate against
a FORCED FULL REBUILD (`drawnDigest()` / `forceRebuild()`), because a counter
cannot say whether what was skipped should have been. Seven checks: one bloom
built on a per-instance change and three on a global one; the partial drawing
identical to the full one; **a twenty-write sweep over every control that rebuilds,
each compared point for point against a full rebuild**; a view-only change
building nothing while the handles still move; the panel's own drag line; and
`partial/a-change-misrouted-as-per-instance-is-not-served-from-cache`, which
performs the misroute on purpose — it writes a density into the control WITHOUT
dispatching its event, so nothing routes it, then asks for a per-instance rebuild
through `rebuildAs` (test chrome, like `setView`; no control can reach that state).
**That last check is the only witness for the key at all**, because under correct
routing the key never binds — which is why its mutant
(`the-cache-is-served-without-checking-what-it-was-built-under`) breaks exactly one
check and that is not a weakness in it.
**AND IT FAILED ON ITS OWN PREMISE FIRST**: it read the build counters AFTER the
forced full rebuild, so every bloom counted twice (2 / 2 / 2) and the check went red
on a page that was right. Collect the counters before the control you are comparing
against runs — the same shape as this gate's "collect every outcome first, then
build the detail" rule, one step earlier.
**NO DIGEST ASKS A FRAMEBUFFER FOR ANYTHING** — it is arithmetic over floats the
page already holds, which is the only way an EQUALITY is available on this renderer.

**SIXTEEN MUTANTS WERE RUN AND SIXTY-EIGHT WERE NOT — the standing sweep is NOT
complete.** The three new ones plus thirteen pre-existing ones over the code this
session touched (the stem build, `applyPetalWarp`, the instance list, the stem and
bloom panels, the restore). Four lists needed widening and **not one check was
wrong**, which is the same distribution the multi-bloom session found:
* `a-per-instance-change-rebuilds-every-bloom` also reddens the panel's drag line
  (`3 built, 0 reused` where the check asserts `1 built, 2 reused`) — which IS the
  claim, so the list widened.
* **`the-bloom-that-changed-is-served-from-its-own-cache` reddens TWENTY-FOUR**,
  and the breadth is the finding rather than a nuisance: a cache that trusts its
  routing has no small failure mode. Every per-instance control stops taking, on
  one bloom as much as on eight — no stem turns on, no warp lands, no bend can be
  dragged for.
* `the-stem-controls-are-page-wide` gains three, and what it says is the useful
  part: it does not damage the cache, it changes the PARTITION, so the key cannot
  notice and only the digest sweep sees it.
* `the-import-replaces-instead-of-adding` gains five, all because it leaves the
  page with ONE bloom and every counter check is written at three. **The two
  DIGEST checks were NOT among them**, which is the reassuring half.
**AND A CHECK THREW BEFORE ANY OF THEM COULD REPORT.**
`stem/the-continuation-runs-from-the-foot-to-the-root` dereferenced `stemLine(0)`,
which is NULL under any mutation that stops the stem turning on — fourth instance
of that bug class here. It reports now.

**A BLOOM IS DRAGGED BY ITS ANCHOR, IN THE PLANE FACING THE CAMERA, AND THE DRAG
PAYS A NARROWED TAIL RATHER THAN A SKIPPED ONE** (session of Sep 10, the anchor
session — the placement sliders were ±800 mm at 1 mm steps, about 9 mm per pixel
of track, the wrong gesture for arranging a composition). One rose octahedron per
bloom (`bloomHandleObjs`, 0xd66f9a, the selected bloom's at full strength and
the rest muted) stands at the bloom's PLACED ORIGIN — `transform.position` through
the container's one Z-up rotation, which is exactly the point the three position
sliders move, so a drag on it writes those three numbers and nothing else
(`setBloomFromWorld`, a copy: no gate, no neighbours' term, because the anchor IS
the translation). It goes through the same pointerdown / pointermove / `endDrag`
the stem and petal handles use, so the orbit is off while it is held.

**THE TWO DECISIONS, MADE WITHOUT A RULING AND FOR EVA'S EYE** (each names what was
rejected and how hard it is to undo):

1. **THE PLANE IS THE ONE FACING THE CAMERA THROUGH THE ANCHOR** — the plane the
   two bend-handle drags already use. Chosen because `/plot` is a PICTURE: the
   frame, the export, the depth dim and the pick are all in camera terms, and the
   gesture's guarantee is then "the bloom lands under the pointer, at the depth it
   had", which holds from every camera and has no degenerate angle. *Rejected:* the
   grid's own x/y plane — predictable in grid terms, but from the three-quarter home
   view every drag is foreshortened, and near edge-on the ray and the plane are
   nearly parallel and a small pointer move sends the bloom off to infinity; an
   axis constraint on a modifier key — a third gesture vocabulary on a canvas that
   already has orbit and click-to-pick, when the sliders are the axis-precise
   control and stay in sync. *Cost of it:* from an oblique camera a screen drag
   writes to all three grid axes at once, which the sliders show and the read-out
   says. *Undo:* `dragPlane.setFromNormalAndCoplanarPoint` in the pointerdown
   handler is the one line; the bloom arm would take a plane normal of grid +z
   (world +y) instead of the camera's.
2. **THE GRAB IS A DEDICATED ANCHOR PER BLOOM, AND GRABBING SELECTS.** *Rejected:*
   grabbing the bloom body — a click on a line already picks a petal, and a drag
   on a line already orbits, so there is no free gesture on the ink; a handle on
   the selected bloom only — arranging means grabbing a bloom you have not yet
   picked from the list, and a drag that moved an unselected bloom would move the
   drawing while the sliders described another (the "bloom without the sliders"
   trap). So every bloom carries one, the grab goes through `setSelectedInstance`
   (which LOADS that bloom's values and applies nothing — the ownership rule, one
   level up; on the bloom already selected it is a no-op), and the sliders are a
   view of the bloom under the pointer. *Where it sits:* the origin is clear of the
   stem's bends (a third of the length and below) and of the petal's (mid-blade and
   tip). *No checkbox:* a view field is a field of the saved file, and the two
   handle sets that have one are editors for state a bloom HOLDS, where this one is
   the bloom itself; the anchors are hidden from the export by `withInkOnly` like
   the others, and the grey identity in the export check is their witness.
   *Undo:* `syncBloomHandles` decides visibility; the selection call is one line in
   the pointerdown handler.

**THE PERFORMANCE QUESTION, ANSWERED: BOTH GLOBAL PHASES ARE NARROWABLE MID-DRAG,
CHEAPLY, AND NEITHER IS SKIPPED.** `rebuild(only, mode)` takes `REBUILD_DRAG` from
the drag and `REBUILD_EXACT` from everything else, and `endDrag` pays one exact
rebuild so nothing a drag showed outlives the pointer by a frame.
* **THE PACK IS WRITTEN IN PLACE.** One set of buffers holds every bloom and the
  strips are pushed bloom by bloom, so a bloom's segments are one contiguous RUN
  of each buffer. `packLayout` records the last full pack's per-bloom, per-buffer
  segment counts; `patchPack` writes the moved bloom's run into the
  `InstancedInterleavedBuffer` at six times the segments before it and flags
  `needsUpdate`, and does so ONLY when the whole layout — every bloom's count in
  every buffer — equals the recorded one, count for count (an offset is the sum of
  the counts before it). A drag changes no count, so a drag takes this path; any
  change of count falls through to the full pack. The `drawnDigest` is BLIND to a
  run written at the wrong offset (every strip record stays right), so
  `packedDigest()` hashes the GPU-bound arrays themselves and is compared against a
  forced full rebuild mid-drag.
* **THE EXTENT IS COMPOSED FROM PER-BLOOM BOXES.** `extentOf(inst)` measures one
  bloom over exactly the population `eachDrawnPoint` walks for it (every strip of
  its file at its droop, placed, plus its drawn stems), memoised on
  `builds|transform`, so during a drag the moved bloom is re-measured each step and
  the others once. `composeViewBounds` unions the boxes — EXACT, a union of boxes
  over the same points is the box over all of them — and takes the radius as
  `max(|c_i − C| + r_i)`, which is a BOUND, not the measurement (a radius about a
  global centre does not compose). Measured on three blooms: 191.03 against the
  walk's 147.08. The depth dim's sphere is that much larger for as long as the
  pointer is down and not a frame longer. The panel's `drag` line prints which
  tail was paid: `packing (full|patched)` and `extent (walk|file|composed)`.
* **THE NUMBERS**, headless software GL, 1100x800, stems on for every bloom, median
  of a 12-step real pointer drag, and a 9-event position-slider drag in the SAME
  run for the exact tail (this runner is slower than the last session's — its
  8-bloom slider figure reads 82 ms where the last session's read 51 — so compare
  within a row, never across sessions):

  | | anchor drag (drag tail) | position slider (exact tail) |
  |---|---|---|
  | 1 bloom | 12.8 ms (4.7 build · 1.4 pack · 6.3 extent) | 14.4 ms (3.8 pack · 5.2 extent) |
  | 3 blooms | 14.6–20.4 ms (6.1 · 1.7 · 6.0) | 40.1 ms (10.9 · 23.3) |
  | 8 blooms | **14.6 ms** (6.0 · 2.4 · 5.4) | **82.0 ms** (28.5 · 41.8) |

  **THE DRAG IS FLAT IN THE BLOOM COUNT AND INSIDE THE 16.7 ms BUDGET AT EIGHT.**
  What is left in it is the moved bloom's own build (~6 ms) and its own extent walk
  (~6 ms — two passes over ~55k points, the per-bloom cost the memo cannot remove);
  the remainder is the head-list assembly, the counts and the handles. **THE
  SLIDERS STILL PAY THE EXACT TAIL** — `set()` in the gate dispatches `input` and
  never `change`, so routing a slider's `input` through the drag tail with the exact
  rebuild on `change` would leave every gate write in the drag state (a bounded fog
  radius under every depth-dim check); it is the obvious next step, is one branch in
  the transform handler, and was left because it moves the whole gate's premise.

**A TRANSFORM SLIDER COMMITS ONLY ITS OWN FIELD** (`commitTransform(el)`). A range
input holds its value at its own step and a drag leaves a floating millimetre, so
reading all seven back on every input snapped the two axes nobody touched to the
whole millimetre — a move of up to 0.5 mm by a control that was not moved. The
sliders therefore agree with the store to half a step, the read-out prints whole
millimetres, and the gate compares the GEOMETRY (the bloom's first drawn point moved
by exactly the store's delta) rather than the slider against itself. Not new in
kind: `placementFor` has always written a non-integer position.

**THE GATE IS 233 CHECKS AND 93 MUTANTS.** Ten `anchor/*` checks: the anchors at
the placed origin (through the Z-up rotation, against the store), a REAL pointer
drag on the highest unselected anchor in the clear (searched for — a handle under
a control column cannot be grabbed, this page's own lesson; the highest so a run
written at offset 0 lands somewhere visible), the moved bloom named by its own
`bloomDigest` and every other bloom identical to the bit with its transform
unchanged, the grab selecting, the anchor under the pointer within 3 px, the
routing and both tail words read WHILE THE POINTER IS DOWN, the patched buffers
float-for-float against a full pack, the composed box exact and its radius a bound
with the released page identical to a forced rebuild, the sliders / read-out /
geometry agreeing after, no orbit, and the one-field commit. **ONE PRE-EXISTING
CHECK WAS CORRECTED, NOT LOOSENED:**
`partial/the-panel-says-what-a-drag-costs-and-which-part-is-one-blooms` shipped
requiring `buildMs < packMs + boundsMs`, and on this runner it went RED ON `main`'s
code (26.3 ms build against a 16.4 ms tail, one run) — a timing INEQUALITY on a
two-frames-a-second box is a bar set on noise, the class of check this gate refuses
everywhere else. It now asserts every figure the page measured is the figure the
panel prints, with each tail word, and REPORTS the split. Nine mutants over the
anchor code: the three plausible wrong drags the brief named (every bloom moves; the
grab does not select, so the sliders describe another bloom; the sliders load and
the bloom stays), the drag rebuilding everything, the run written at offset 0, the
moved bloom's extent going stale, the drag tail outliving the drag, the anchors in
the export (the grey identity, with nothing added for it), and every field read
back on every slider input. **WHICH MUTANTS WERE RUN IS IN THE SESSION'S REPORT AND
NOT HERE**, because a count implies a sweep.

**A known limitation that is NOT the viewer's to fix:** a splayed bloom (the
shipped sample is spread 0.60, tilt 25°) reads flatter than a cupped reference
form. That is a bloom parameter. The sheet photographs it and the viewer does
not compensate for it.

**Out of scope on purpose:** LEAVES and buds; any change to `/print`, the generator, or
the grid export format. (The STEM is no longer out of scope — see the inferred
stem above — but it is inferred from the u-lines, not loaded, and nothing about
leaves follows from it. RASTER AND SVG EXPORT are no longer out of scope
either — see the polarity and export section above; nor are MULTIPLE BLOOM
INSTANCES, composition and arrangement — see the multi-bloom section above.) Also out of scope and named
so it is not mistaken for an omission: **LOCK VIEW, background SHAPES and
cut-and-pull**. TWIST was named in the petal
session's brief as the thing to drop if the session grew, and it was: bend and
stretch shipped, twist did not. (PETAL SELECTION AND PER-PETAL WARP are no
longer out of scope — see the petal section above; nor are THE FRAME and SAVE —
see the frame section. **LOCK was deliberately dropped from the frame/save
session rather than deferred by accident**: it gates nothing today, because
shapes are not built, so its only effect would be disabling orbit. It ships
alongside the shapes it exists to enable, and the safety pairing still holds in
the other direction — save landed first, so when the one-way lock arrives the
guard is already there.)

**`/plot` EXISTS NOW, SO THE PARKED FLOWER-PETAL-PATH TRIGGER NAMES A REAL
PAGE.** `docs/bloom-session-28-outcome.md` parked the FLOWER's petal-path
investigation behind Eva's trigger, recorded verbatim: *"when /plot needs real
stems or leaves."* That doc could not resolve what `/plot` meant — it noted the
posing/line-art stage is `/print` and that "whether `/plot` names that or
something not yet built is not resolved here". **It was something not yet
built, and this is it.** The ambiguity is closed: the trigger points at this
page. **IT HAS STILL NOT FIRED, AND THE INFERRED STEM DOES NOT FIRE IT** — the
trigger is "when /plot needs REAL stems or leaves", and this stem is not one: no
geometry was loaded, nothing was traced, and the flower's `stemCenterline()` /
`stemRadiusFn()` were not read. It is the grid's own u-lines continued. A
session that makes `/plot` load or trace a real stem or a leaf owes that
investigation first, and what session 28 already established
(the flower's `stemCenterline()` / `stemRadiusFn()`, `buildTrunkInto` returning
`{ depth, cl }`, the horizontal-disk cross-sections, the untraced Voronoi and
strand modes) is in that doc so it is not re-derived.

**NEXT, KNOWN AND NOT STARTED — recorded so they are not rediscovered:**
0. **THE PETAL WARP IS BUILT — see the petal section above.** All three
   questions this list parked are answered there with reasons: the picker is a
   list first and a click second (measured), the stations are ARC LENGTH in mm
   along the petal's own measured centre line rather than `u` (`metricMax` 4.12
   is exactly why), and a bend's sigma is therefore in millimetres on the
   petal's own length rather than on an axis of length 1. **TWIST is what that
   session did not build** — the brief named it as the thing to drop if the
   session grew, and bend and stretch are what shipped. A twist would rotate
   each row about the centre line's own tangent; the frame already has the rows
   and the stations, so what it needs is the tangent and one more term in
   `petalDeltaAt`, gated by the same `rootHold`.
1. **A UI overhaul for `/plot`, and it is now the most pressing thing on this
   list.** The panels are `/print`'s grammar applied as-is, which was right for
   shipping a viewer and is not a considered design for this page. There are
   **twenty-four controls and twelve buttons across seven panels** now, one of
   them — the petal picker — changes what four of the others MEAN and another —
   the POLARITY — changes what two more mean and relabels one of them, and the
   left column has grown tall enough that it covers canvas a hand wants to drag
   on (it ate the gate's two hardcoded pointer coordinates the day COMPOSITION
   landed).
1b. **THE COMPOSITION FILE IS BUILT** — `plot-composition` v2 (v1 plus
   `draw.polarity`), a warp per petal, and a root that is a LIST of instances.
   **The list now holds as many blooms as are loaded** (see the multi-bloom
   section above): that needed no migration and no version bump, which is what
   the shape was for. What is inherited by the NEXT sessions rather than decided
   by them: **lock state, background shapes and cut-and-pull state are added as
   FIELDS** — neither needs a migration. Anything that changes the root's
   cardinality does.
1d. **THE ANCHOR DRAG IS DONE** — see the anchor section above. What it leaves: the
   sliders' `input` stream still pays the exact tail (one branch, gated on the
   gate's `set()` dispatching `change`), and the drag plane and the anchor's
   placement are two feel decisions made for Eva's eye and not yet ruled on.
1c. **REBUILDING ONLY THE BLOOM THAT CHANGED IS DONE** — see the per-instance
   rebuild section above. What is NOT done, and is now the whole of the
   remaining cost, is the GLOBAL TAIL: the packing and the extent walk.
2. **The `perDescriptor` retention is CLOSED** — see the generator section
   below. A grid exported from any placement now holds every petal the builder
   emitted; the shipped CONTINUOUS sample is unchanged, and a RADIAL export goes
   from 1 petal of 8 to all 8. What `/plot` should know is the SIZE: a RADIAL
   40 x 3 grid is 120 petals and **4.5 MB**, about four times the sample's
   segment count, and three of THOSE in one composition is a real number rather
   than a hypothetical one.

## Artist Tracker (`artist-tracker.html`)

Private, single-file, client-side artist/tattoo-artist tracker for
eva-maskalenko.com — who to follow, tattoo artists and where they work,
tour/release dates worth watching. No backend, no build step: a SHA-256
password gate (`crypto.subtle` + a hardcoded hash, unlock flag in
`sessionStorage`) guards a `localStorage`-backed CRUD tracker.

**Status: items 1–12 are MERGED to `main`** (PRs #121 and #125); items
13–18 are in review on branch `claude/tracker-shortlist-filters-h46mti`.
Review through the Netlify Deploy Preview — `localStorage` is per-origin, so
preview data does not carry over to production and vice versa; move it with
the app's own JSON export/import.

**What this tool is for.** It is primarily a TATTOO ARTIST SHORTLIST — the
job is deciding who to get tattooed by and finding where they are. Friends,
influencers and general art accounts are kept but are background. Three
questions drive the design: who does the work I want (style tags), where are
they and who is near who (region filter + map), and why did I save them
(notes). Let that priority pick the defaults.

**Built so far, in order:**
1. Core tracker (pre-existing before this branch): password gate,
   add/edit/delete, search, category filter (following/tattoo/touring —
   the only three real categories), sort, JSON export/import.
2. Fixed two bugs found while testing the original page: a fixed "back to
   top" button that could overlap the add/edit panel on mobile (now
   hidden while the panel is open), and a JSON-import edge case where a
   falsy `id` on an imported record could survive instead of regenerating.
3. Auto-fill entry photos from the Instagram handle via unavatar.io (a
   free public avatar-lookup proxy), falling back to the initials
   placeholder on failure. **Unverified in production — see Open Items.**
4. Merge-aware bulk paste: a pipe-delimited
   (`name | handle | category | location | pronouns | status | link | photo url`)
   or bare-handle line whose handle matches an existing entry
   (case-insensitive, leading `@`/trailing `/` stripped) fills in that
   entry's currently-blank fields and creates no duplicate, instead of
   always adding a new entry. Non-blank fields are never overwritten.
   Reports "X updated, Y added, Z unchanged."
5. The Instagram handle renders as a real link to `instagram.com/<handle>`,
   teal, underline on hover only (was plain dim text).
6. Gender filter, bucketed from the free-text `pronouns` field into
   she/her, he/him, they/them, other, unspecified (tokenized matching,
   not substring — "she" can't false-match inside "he").
7. Location filter: dropdown of distinct location strings already in
   storage.
8. Style tags: new `tags` field (comma-separated on the form, stored
   lowercased), shown as pills per entry, filterable via OR'd
   multi-select chips generated from every distinct tag in use.
9. Map view, toggled alongside List on the same page: Leaflet +
   OpenStreetMap tiles via CDN, pins color-matched to the category colors
   via a `divIcon` (no default marker image assets needed). Locations are
   geocoded lazily via Nominatim (rate-limited to 1/sec, cached on the
   entry, deduped across entries sharing the same location string,
   cleared and re-queried if the location text is edited). A location
   that fails to geocode is skipped silently and logged to console.
10. Bulk-paste category preservation: a category value that isn't
    following/tattoo/touring (e.g. "Influencer", "Art", "Friend" — as used
    in the user's real Instagram-export data) is now kept as a tag instead
    of being silently discarded when it collapses into "following."
11. Slide-in detail drawer. Clicking anywhere on an entry row (the row is
    the button — `role="button"`, tab-focusable, Enter/Space) slides a
    ~400px panel in from the right; full width under 560px. No route
    change, no scroll loss, the list stays where it was. Closes on the ×,
    a backdrop click, or Escape, and focus returns to the row that opened
    it. `prefers-reduced-motion` snaps instead of sliding.
    - The row no longer contains a link. The handle used to be an `<a>`
      straight to Instagram; that link is now the "Open on Instagram →"
      button at the foot of the drawer (teal, `target="_blank"`), so
      there is one predictable click target rather than a link inside a
      button. The handle still renders teal, as text.
    - Edit and Remove live **only** in the drawer — the per-row
      edit/remove/open column is gone. With the whole row clickable,
      keeping them would have meant three competing targets on one row.
    - The drawer has two modes. View mode is a read-only spread of the
      entry; edit mode is the *same* quick-add form, physically relocated
      into the drawer (the fields, ids and save handler are unchanged).
      There is no on-page add/edit panel any more — "+ add an entry"
      opens the drawer in edit mode with a blank form. The on-page panel
      still exists but is bulk-paste only, behind its own "bulk paste"
      button, so the quick/bulk tab strip is gone.
12. Paste-to-add photos. With the drawer in edit mode, Ctrl/⌘+V pastes a
    copied image (screenshot, right-click → copy image) straight into the
    entry's photo. Drag-and-drop onto the photo box works too.
    - The `paste` listener is on the drawer element and is attached only
      while edit mode is active — never on the document, and removed when
      the drawer closes or returns to view mode.
    - `preventDefault()` fires **only** when an image is actually taken.
      A paste into a text field whose clipboard carries text is passed
      through untouched, even if an image rides along with it (that is
      how copying from a web page usually arrives). Copy-image and
      screenshots put no text on the clipboard, so pasting still works
      with a field focused.
    - Stored photos are downscaled before they are saved: longest side
      500px, re-encoded JPEG at 0.8 (`MAX_PHOTO_DIM` /
      `PHOTO_JPEG_QUALITY`). A ~2MB screenshot lands at roughly 30–60KB.
      The canvas is filled with the panel ink colour first, because JPEG
      has no alpha and a transparent PNG would otherwise come out black.
    - The pasted image is held in `pendingPhoto` and committed on save,
      so Cancel discards it like every other field. The "photo url" text
      field stays as the fallback path; the two are mutually exclusive
      (typing a url drops the pasted image, and pasting clears the url).
      A data-URL photo is never dumped into that text box — it shows as
      "stored image · NN KB" with a "remove image" action.
    - `persist()` now returns a boolean and handles a quota failure
      loudly: it rolls `entries` back to `lastPersisted` (the last
      snapshot that actually reached storage, so the screen can never
      show unsaved data) and tells the user storage is full. Pasted
      images make quota exhaustion a reachable failure rather than a
      theoretical one.
    - **Exports get much bigger.** Photos are data URLs inside each
      entry, so they flow through JSON export/import with no special
      handling — and a backup of 200 entries with images is megabytes
      rather than tens of KB. Expected, not a bug.

13. The view defaults to **tattoo artists**, not "all" — the other
    categories are one click away.
14. Location filter is two-level: **region, then city**. `parseLocation()`
    derives both at render time from the free-text `location` (last
    comma-separated segment = region, first = city) and NEVER writes back —
    the user's original string is untouched. A trailing US state or Canadian
    province code folds into `USA` / `Canada`, so "Los Angeles, CA" and
    "Austin, TX, USA" land in one region instead of scattering. A
    single-segment string ("Berlin") becomes its own region rather than
    having a country guessed for it. Anything unparseable goes to
    "Other / unspecified", pinned last; every other region is ordered by
    count, descending.
15. Style tags have a clickable **starter set** (`STARTER_TAGS`) plus every
    tag already in use, shown as toggle chips in the drawer's edit mode.
    Typing still works — Enter or a comma commits a custom tag. Filter chips
    carry counts and sort by count, descending.
16. `status` split into **`notes`** (why I saved them — a real textarea, the
    field that matters most) and **`status`** (guest spots, books, tour
    dates — still one line). The split of EXISTING data is a **button**
    (`split status → notes` in the footer), never automatic on load: it
    shows the counts and a sample before it touches anything, skips entries
    that already have notes, and is safe to press twice. `LOGISTICS_RE`
    decides what stays in `status`; "flash" is deliberately NOT a keyword
    ("love her flash" is a reason to save someone, not a booking window).
17. Gender is an **explicit field** (`woman` / `not-woman` / `unknown`,
    default `unknown`), set by hand in the drawer. It replaced the old
    pronouns-derived bucketing, which was blank for nearly every entry.
    Seeded ONCE on load from an unambiguous she/her in `pronouns`; nothing
    is ever inferred from names, handles or photos, and `pronouns` keeps its
    own separate job of recording how someone refers to themselves. Filter
    is All / Women only / Unknown — "unknown" is browsable on purpose, so
    the backlog can be worked through.
18. Map **clusters** (leaflet.markercluster via CDN, SRI-pinned), respects
    every active filter, and prints how many artists are plotted vs. how
    many have no usable location.
19. **Decorative unicode folds** for matching. Instagram display names and
    locations arrive as 𝕾𝖆𝖗𝖆𝖍 𝕽𝖔𝖘𝖊, Ａｌｙｓｓａ, ʟᴏɴɢ ʙᴇᴀᴄʜ, ᴄᴀ. `foldText()`
    is applied to search (both sides), region aliasing, the US/Canada
    subdivision codes, handle-matching keys and tag keys — for MATCHING
    ONLY. Nothing folded is written back; the entry keeps the user's text.
    Without it, typing "sarah" silently misses the entry and ᴄᴀ becomes its
    own region instead of folding into USA.
    **The implementation is 26 lines, not a 6,000-character table.** NFKD
    already flattens the Mathematical Alphanumeric Symbols, the letterlike
    symbols (ℬ, ℤ) and the fullwidth forms; the ONLY block needing a
    hand-written map is small caps / phonetic capitals, which carry no
    compatibility decomposition. Measured equivalent to a full explicit
    FOLD_MAP across all 2,420 cells of the 242-artist research file — zero
    divergences. Do not re-add a hand-maintained table for the rest.
20. **Style tags group by a normalized key** (`tagKey()` — fold, then strip
    spaces, `_`, `-`, `&`, `/`). "Fine Line", "fineline" and "fine-line" are
    ONE chip with the combined count, not three splitting it. The entry
    stores its own spelling verbatim; only the key is normalized, and the
    chip is labelled with whichever spelling is commonest (ties alphabetical,
    so the label doesn't flicker as counts move). The drawer's picker dedupes
    by key too, and shows the entry's own spelling when it has one.
21. **The tag bar caps itself at 18** with `+ N more` / `show fewer`. The
    242-artist list yields 119 distinct tag groups — 1046px of chips on a
    900px viewport, burying the list under its own filter bar. Measured:
    122px capped. A SELECTED tag is always shown regardless of rank — a
    filter you cannot see is a filter you cannot turn off — and a
    `clear N selected` control appears whenever any are active.
22. **Bulk paste takes 10 fields**: `name | handle | category | location |
    pronouns | status | link | photo url | tags | gender`. 8 and 9 still
    work. Tags are comma-separated inside their field; gender accepts
    `woman` / `nonbinary` / `man` (and blank → `unknown`) and is NEVER
    guessed from a name. `nonbinary` is kept as its own value rather than
    folded into `not-woman`, so the one nonbinary artist in the research
    file is neither mislabelled nor swept into "women only".
    **Any other field count is skipped and reported, never imported** — one
    stray `|` inside a name shifts every field a column left, landing a
    location in `pronouns` and a link in `photo`, silently, visible only
    entry-by-entry much later. Refusing the line is recoverable; importing
    it wrong is not.
23. **What happens to a handle already in the list is the user's choice**
    (`#bulkDedupe`): `merge` (fill blanks only — the default and the old
    behaviour), `overwrite` (take the pasted value where the paste HAS one;
    a blank cell never wipes a field that holds something), `skip`, `add`.
    Tags union in every merging mode — a tag is additive by nature, and
    dropping ones already on the entry would lose work no paste asked to
    remove. NOTE the reference implementation's "update" mode did a
    `{...existing, ...data}` spread, which blanks a filled field from an
    empty cell; that was deliberately not ported.
24. **The import report replaced the one-line `alert()`** (`#bulkReport`,
    inside the panel — which therefore STAYS OPEN after a run, and clears
    on cancel or on reopening). It counts added / updated / already-complete
    / skipped, and names the wrong-field-count lines WITH THEIR LINE NUMBERS
    and a preview. An alert could not say which line of a 242-line paste it
    refused. The textarea is cleared only once the write actually reached
    storage, so a quota failure never eats the paste.
25. **Locations resolve from a STATIC GAZETTEER, not from the network.**
    Live Nominatim was diagnosed and replaced as the primary path. The
    diagnosis, reproduced headlessly: successes were cached, but so were
    FAILURES — `geoStatus:'failed'` was persisted and filtered out forever, so
    a single burst of 429s (Nominatim allows ~1 req/sec and refuses bulk use;
    126 distinct strings needs ~2.5 min of uninterrupted map-tab time)
    permanently retired those locations. The plotted count could only ever go
    down. A stub that succeeds 40 times then 429s reproduced Eva's
    "73 plotted · 169 without" as "65 · 177", and a reload retried NONE of the
    failures while burning 13 more.
    Now `staticGeocode()` reads city / US-state / CA-province / country tables
    (~120 cities) the same way `parseLocation()` reads segments: `/` and `📍`
    pairs take the FIRST place named, trailing note segments are ignored,
    fallback runs MOST SPECIFIC FIRST so "Georgia, USA" is the state and not
    the middle of the country. **Measured: 211 of 211 non-blank locations,
    zero network calls, on the real 242-artist file.** The 31 that don't plot
    are exactly the 31 with a blank location field.
    Nothing static is written to storage — `geoFor(e)` prefers a cached
    Nominatim result and otherwise computes from the table, so improving the
    table takes effect immediately instead of being shadowed by a stale value.
    Nominatim remains the fallback for a table miss, and **a failure is no
    longer permanent**: `geoTries` + `geoFailedAt` back off for six hours and
    retry, capped at three attempts. `clearLegacyGeoFailures()` sweeps the old
    tombstone once on load so existing data recovers.
26. **The fold covers stroked Latin letters, not just accents.** NFKD
    decomposes an accent (é → e + combining acute) but a STROKE is part of the
    letter, so `ł` stayed `ł` and "wroclaw" silently missed Wrocław — in search
    AND in the gazetteer. `CHAR_FOLD` now carries ł đ ø ħ ŧ ı ƙ ß æ œ þ ð and
    their capitals. Measured against the research file: the only Latin-script
    characters that did not fold were `ł`/`Ł` (6) and `Ƙ` (1). Hangul and
    Cyrillic are left alone on purpose — they are scripts, not decoration.
27. **Map results panel** (`#mapPanel`) — the map's index, to the right of it,
    stacked below at ≤900px. Three states in priority order: **hover**
    (previewing a marker or cluster), **pinned** (one was clicked; survives
    panning; close button, Escape, or a click on bare map clears it), and
    **viewport** (the resting state — whatever is currently on screen). An
    empty 320px column beside the map answers nothing, which is why viewport
    rather than hidden is the resting state.
    Rows are the list view's own `renderEntry()` markup — one card style, one
    behaviour (click opens the drawer). Notes and an Instagram link are added
    as SIBLINGS of the row, never nested inside it: the row is a button, and
    item 11 removed links from inside it on purpose.
    Driven from the same filtered array `render()` computes, so it can never
    list an artist the current filters exclude; a pinned selection that a
    filter empties drops itself rather than lingering.
    **Clicking a cluster no longer zooms** (`zoomToBoundsOnClick:false`) — it
    lists that cluster's artists. Zoom answered "how many" and never "who".
    Hover highlights in both directions; a marker inside a collapsed cluster
    highlights the CLUSTER instead (`getVisibleParent`), or hovering a panel
    row at world zoom would do nothing visible.
    Two things the panel forced: the map+panel row **breaks out of the 760px
    reading column** on ≥1024px (at column width the map came out 385px and
    showed a third of the world), and the map **fits to its pins once** per
    load rather than opening on a fixed `[20,0]` zoom-2 rectangle.

28. **The style vocabulary is NINE controlled buckets** (`STARTER_TAGS`),
    replacing the eighteen-tag starter set: `fine line`, `blackwork`,
    `color`, `realism`, `illustrative`, `dark & gothic`,
    `botanical & animal`, `anime & pop culture`, `ornamental & traditional`.
    They are BROAD BUCKETS, not a top-nine cut — Eva consolidated upstream so
    nothing is orphaned (`cute`/`fantasy` → illustrative, `animal` →
    botanical & animal, `oriental/asian traditional` + `neo-traditional` →
    ornamental & traditional). `cover-up` is deliberately absent: it is a
    SERVICE, not a style, and those 5 artists carry "Does cover-ups" in
    notes, still searchable.
    A retired bucket that is still ON an entry keeps appearing in the
    drawer's picker, marked `data-custom`, or there would be no way to
    un-tag that entry. Only the unused ones disappear.
    **A tag outside the nine is IMPORTED, never dropped, and reported** —
    named with the line numbers it appeared on. The file is meant to contain
    only the nine, so one showing up means the upstream consolidation
    drifted; silently discarding it would lose real data and hide the drift.
    A different SPELLING of a vocabulary tag is not drift — membership is
    tested through `tagKey()`, so "Fine-Line" counts as `fine line`.
    `vocabularyKeys` is built LAZILY on first use: `tagKey()` reaches
    `CHAR_FOLD`, declared further down the IIFE, so computing it eagerly at
    declaration hits the temporal dead zone and throws before first paint.

**Facet counts are computed against every filter except themselves** — with
the view defaulting to tattoo artists, a region count taken over the whole
ledger would read "USA (40)" while showing 25. Each filter is its own
predicate (`matchesCategory`, `matchesGender`, …) so the region and tag
counts can exclude their own dimension.

**Testing approach:** no CI workflow covers this file (every GitHub
Actions gate in this repo is path-filtered to `flower*`/`bloom*` files
only — only Netlify's own informational checks run on this PR). The
drawer, paste-to-add, shortlist and import work (items 11–24) ship with a
behaviour gate, `node tools/verify-tracker-drawer.mjs` (289 checks;
`--shots <dir>` also writes a contact sheet). `staticGeocode()` is a pure
function, so its ANSWERS are unit-checked against declarations SLICED OUT of
`artist-tracker.html` itself (the app is inside an IIFE) rather than inferred
from pin positions — a table that answers with the wrong place still plots the
same number of pins. A failed slice throws rather than skipping. Its map checks serve the REAL leaflet and
leaflet.markercluster from `node_modules` when present
(`npm install --no-save leaflet@1.9.4 leaflet.markercluster@1.5.3`) and
report as SKIPPED, never as passed, when they are missing. It serves the repo on a free port, seeds
`sessionStorage` to skip the password gate, stubs unavatar.io and unpkg,
and drives a real Chromium: open/close/Escape/backdrop, focus return,
the edit round trip, the downscale (a 1200×800 paste must come out
500×333 JPEG), every paste-scoping rule above, a stubbed
`QuotaExceededError`, and a regression pass over bulk-paste merge, the
filters and the map toggle. It is not wired into CI (no workflow here
covers this file) — run it before calling a tracker change done.
Verified falsifiable: widening `MAX_PHOTO_DIM`, dropping the text-field
paste guard, restoring the "all" default, removing the US-state fold,
inferring gender from he/him, running the status split on load, swapping
the cluster group for a plain layer group, neutering `foldText()`, making
`tagKey()` the identity, widening `BULK_FIELD_COUNTS` to accept anything,
lifting the tag cap, un-pinning a selected tag when the bar collapses,
emptying `CITY_COORDS`, making a geocoding failure permanent again, removing
the retry backoff, dropping the legacy-tombstone sweep, disabling
off-vocabulary detection, and letting a TENTH tag into the vocabulary — each
turns it red, on the checks that name that behaviour.

**The gate reads no bulk-paste file.** Its only `readFileSync` calls are
`artist-tracker.html` and the leaflet vendor bundles; every fixture is
inline. So importing a new research file cannot turn the gate red — what
turns it red is changing `STARTER_TAGS`, which is what the `verify` starter
assertions are pinned to. `reseed([])` is supported: an empty fixture waits
on `.add-row` rather than a list row that will never render.

**A fixture whose handle contains the name it searches for proves nothing.**
The search haystack includes `e.handle`, so a realistic `@sarahrose_tattoo`
satisfies "plain-ascii search finds a fraktur name" with folding switched
OFF. Two of these checks passed a neutered `foldText()` for exactly that
reason before the fixture was changed to `@goldenharvest.resident`. Keep the
fold fixture's handles free of the text being searched.

**Sections that need their own seed data get their own browser CONTEXT.**
`ctx.addInitScript` re-seeds `SEED` into localStorage on every navigation, so
a write-then-reload is silently clobbered and the checks run against the old
fixture while appearing to pass. `reseed(rows, setup)` builds a fresh context
per fixture (with optional per-section network stubs) and folds its page
errors back into the shared list.
**This bites INSIDE a section too, not just across them.** The geocoding
retry check first aged `geoFailedAt` with `page.evaluate` and then reloaded —
the init script restored the original row, so the check was measuring the
harness. It passed a mutation that made failures permanent again. State that
a check depends on is SEEDED, never written-then-reloaded.
Verification has been manual: serve locally via `python3 -m http.server`
(`crypto.subtle` needs a secure context — never test via `file://`), drive
with Playwright (`NODE_PATH=/opt/node22/lib/node_modules` — Playwright is
a global npm install in this environment, not a project devDependency;
browsers live at `/opt/pw-browsers`). This session's sandbox blocked
arbitrary outbound hosts (`fonts.googleapis.com`, `unavatar.io`,
`unpkg.com`, and even the Netlify deploy-preview domain itself all
403/reset) but *not* the npm registry — `npm install leaflet` got a real
local copy of Leaflet to serve via Playwright route interception for map
testing, rather than testing against a stub.

**Open items:**
- **The unavatar.io photo mystery.** Feature 3 above tested clean in the
  sandbox (mocked responses), but on the real Deploy Preview *every*
  entry showed initials instead of a photo — and the browser console
  showed zero requests or errors mentioning "unavatar" at all, even after
  a hard refresh, which points away from "the service is down" and
  toward "the code path isn't even being reached for these entries" (most
  likely: those entries already have a non-empty `photo` field from
  before, which short-circuits the auto-lookup). Never resolved — the
  user was asked to check one existing entry's "photo url" field in the
  edit form and never followed up before the conversation moved to other
  feature requests. Worth revisiting before trusting this feature.
- **`bulkimport_1.txt`** (770 real entries, the user's actual Instagram
  follow-list, cleaned into this app's pipe-delimited bulk-paste format)
  was validated and dry-run tested against the real merge-import code —
  confirmed to parse cleanly and merge correctly — but has **not**
  actually been pasted into the user's real tracker yet, since that step
  can only happen in their own browser.
- **`bulk-paste-v3.txt`** (240 artists — v2 minus `@kittytattoos` and
  `@tinkercast.official`, which are not artists; tags consolidated to the
  nine upstream). Dry-run end to end in OVERWRITE mode: 240 added / 0
  malformed / 0 off-vocabulary, 97 with tags, 29 blank locations, 5 `woman`
  + 1 `nonbinary`, 69.9 KB, no page errors; a re-paste reports "0 added ·
  240 already complete". On the map: **211 plotted · 29 without, zero
  Nominatim requests — 211 of 211 located entries, a 100% plot rate.** The
  29 are exactly the 29 with a blank location field, so the geocoding gap is
  fully accounted for and there is nothing left to fix there. Tag chips
  collapse from 119 groups to 9 (89px, so the `+ N more` cap never fires on
  this data). NOT yet pasted into the real tracker — that only happens in
  Eva's browser.
- **`bulk-paste-v2.txt`** (242 researched tattoo artists, 10-field format)
  was driven end-to-end through a real Chromium against the current page:
  242 added / 0 malformed, 98 with tags, 31 with no location, 5 `woman` +
  1 `nonbinary`, 33 regions, 119 tag groups, 70.6 KB in localStorage,
  ~2.6s wall time, no page errors — and a re-paste of the identical file
  reports "0 added · 242 already complete" rather than duplicating. On the
  map, the same run reports **211 artists plotted · 31 without a usable
  location with ZERO Nominatim requests**, and the panel lists all 211. It has
  **not** been pasted into the user's real tracker; that only happens in
  their browser, and localStorage is per-origin, so data added on the deploy
  preview does not follow the merge to production. Use the app's own
  export/import JSON to carry it across.
- PR #121 has an hourly self-scheduled check-in (via `send_later`)
  watching for CI/mergeability/review-comment changes, set up mid-session
  — check `list_triggers` for it if picking this back up, rather than
  assuming none exists or creating a duplicate.

## Cards deck builder (`/cards`) — fonts are an ASYNC invariant

The deck builder (`cards.html`, `cards.js`, `cards/*.js`) draws every card on a
`<canvas>`, and a canvas paints text with whatever font is resolvable **at the
instant `fillText()` runs**. A webfont that has not finished loading is not
waited for and does not throw — it is silently swapped for a fallback. So the
failure mode is not a crash and not a blank card: it is 52 PDF pages set in the
wrong face that looked correct in the preview a second earlier. Nothing on
screen ever reports it.

**Every path that draws a card must `await` the selected font first.** Today
that is `drawPreviewNow()` and `renderFullDeck()` in `cards.js` (the latter
serving both the PDF and the PNG/ZIP export), each calling
`ensureStyleFontsLoaded(style)`. `renderCardToCanvas()` stays synchronous on
purpose — the await belongs once, above the 52-card loop, not 52 times inside
it. Any NEW render path inherits the same obligation.

- **`document.fonts.check()` is not the test.** Measured in Chromium:
  `document.fonts.check('400 40px "Zzz Not A Font"')` returns **true**, because
  with no matching `@font-face` there is nothing left to load. Using it as a
  readiness gate passes every broken family. `document.fonts.load()` is the
  instrument — it resolves with the array of MATCHED faces, and that array is
  empty when nothing matched. `awaitFaces()` in `cards/font-manager.js` is the
  only place this is decided.
- **The font catalog is a build-time artifact, never fetched at runtime.**
  `cards/google-fonts-catalog.js` (1,891 latin, upright families, ~40 KB / 13 KB
  gzipped) is generated by `node tools/gen-google-fonts-catalog.mjs` and
  committed, the same way `assets/presets/` thumbnails are. The Google Fonts
  Developer API needs a key, and a key shipped in client JS is a key published.
  `--check` fails if the committed file is stale. Only the ONE family a visitor
  selects is ever fetched, from `fonts.googleapis.com`.
- **Weight is resolved, never assumed.** Each family is drawn at the weight
  nearest 600 that it actually ships. Requesting a weight a family does not have
  gets a browser-synthesised fake bold, which is exactly the kind of thing the
  preview and the export can disagree about. Uploaded fonts are registered with
  a `weight: '1 1000'` descriptor so a static face matches 600 exactly and is
  drawn as its designer set it.
- **A retired concern that is now structural:** the corner rank letter and the
  court-card centre letter share one control. They also share one function —
  `cardFont()` in `cards/card-template.js` is the only place a card's text font
  becomes a `ctx.font` string.
- **The court letter is centred on its INK, never on the em box.**
  `textBaseline: 'middle'` centres a font's design metrics, not its glyph, and
  the offset between the two is a per-face property with no bound once any
  Google family is selectable. Measured on the shipped card: em-box centring
  put "K" **47.8 px** off centre in IBM Plex Mono, **52.5 px** in Bungee and
  **91.5 px** in Great Vibes — the mono figure being the one the old fixed
  −8%-of-plate-height fudge had been tuned against, so it was visibly wrong even
  before the catalog existed. `fillTextInkCentered()` measures
  `actualBoundingBox{Left,Right,Ascent,Descent}` per draw and centres the real
  bounding box; every face then lands within 5 px, most within 1.
- **The three scale sliders are INDEPENDENT, and that has a consequence.**
  `cornerFontScale`, `courtPlateScale` and `courtLetterScale` each multiply a
  base derived from the safe rect (the `BASE` table in `card-template.js`),
  never another control's output — so a big plate around a small letter is
  reachable, and so is a letter LARGER than its plate (Great Vibes "Q" at 150%
  measures 297x424 in a 395x394 plate). That overflow is allowed on purpose:
  clamping the letter to fit would make it depend on the plate, which is the one
  thing these sliders are specified not to do. Two corollaries that are easy to
  get backwards: the corner mini glyph is sized from the UNSCALED corner font so
  `cornerFontScale` is not a second suit-glyph scale, and the court suit glyphs
  are clamped to the safe rect so a 150% plate cannot push them off the card.
- **Measuring the court letter by cropping to the plate is WRONG and passes.**
  A letter bigger than the plate is clipped symmetrically by that crop and reads
  as perfectly centred wherever it actually sits — measured: a plate-scale-50%
  row scored (−0.5, −0.5) while its ink overflowed the crop on all four sides.
  `letterInkBox()` in the gate isolates the letter by COLOUR instead (the plate
  stroke and letter are the "other" palette colour, the court suit glyphs and
  corner indices are the suit's own), then drops the band along the plate
  stroke. That is the only instrument that sees the whole letter.
- **Panel sections are native `<details>`**, six of them: `01 Suit Glyphs`,
  `02 Palette`, `03 Font`, `04 Style`, `05 Export`, `06 Print Spec`, with
  `01`/`02`/`05` open by default. The font picker is its OWN section, not a
  field inside Style — the two long things in the panel are long for different
  reasons, and a searchable list of 1,891 families does not belong buried among
  sliders. `03`'s summary carries the selected family as a value readout so it
  is legible while shut. No JS owns the open/closed state, and a collapsed
  section genuinely hides its rows, so the picker's IntersectionObserver
  fetches nothing for a section nobody opened. The gate drives a slider while
  `04 Style` is COLLAPSED and asserts the preview still rebuilds — the failure
  the bloom panel already shipped once.
- **The preview is sticky, and the zoom slider is presentation-only.** `.cd-preview`
  sticks beside the panel (which is what `align-items: start` on `.cd-body`
  buys — the grid item is content-height, and its grid area is the travel), and
  is capped to `calc(100vh - 4rem)` with its own scroller, because a sticky box
  taller than the viewport pins its TOP and hides the rest. Both are undone at
  the 900px stacking breakpoint: with no side-by-side layout left, a
  viewport-tall sticky box over the controls, and a nested scroll region inside
  the page scroll, are both worse than not sticking. The zoom slider writes ONE
  thing — `--cd-card-min` on the grid — so `auto-fill` re-flows and
  `.cd-card`'s `aspect-ratio` holds the proportions. It must never reach a
  render path: every canvas keeps its 825x1125 backing store, which is what the
  exports read. The gate asserts that by tagging a live canvas and requiring
  the SAME element to survive every zoom step, with a real style slider as the
  control that proves the tag does get replaced by an actual re-render.
- **Verify with `node tools/verify-cards-fonts.mjs`** (135 checks;
  `--negative-control` required before quoting a pass from a changed harness;
  `--shots <dir>` writes a contact sheet). It refuses to accept the preview
  canvas as evidence: every claim is measured against the BYTES OF AN EXPORTED
  FILE — the PDF's embedded page images inflated by `tools/pdfimg.mjs`, and the
  PNGs inside the exported ZIP decoded by `tools/pngdec.mjs`. It also drives the
  race directly: pick a never-loaded family and start the 52-card export in the
  same tick, with nothing awaited between.
- **"The export does not look like a fallback" DOES NOT CATCH THIS BUG** —
  measured, not assumed. With the `await` deleted from `renderFullDeck()`, the
  differs-from-fallback check still measured 1.460 and passed, because a cold
  family falls back to its own stack's generic (`fantasy` for a display face,
  `cursive` for a handwriting one), which is nothing like the browser default.
  Only comparing the export against the SAME card rendered with the font
  CONFIRMED loaded separates them, and exactly two checks moved under that
  mutation. Deleting the `await` in `drawPreviewNow()` moves exactly one, which
  is why that check reads the preview grid's own canvas instead of re-rendering.
- The other cards gate, `node tools/verify-cards-svg-glyphs.mjs`, still covers
  the suit-glyph upload path and must stay green alongside it. **Neither runs in
  CI, and nothing else covers cards either — run both by hand before calling a
  cards change done.** No workflow here names a `cards*` path. Note the corollary
  that is easy to get wrong: `flower-export-watertight.yml` and
  `flower-geometry-quality.yml` are path-filtered on `'tools/**'`, so ADDING A
  CARDS TOOL makes both flower gates run on a cards PR. They still test flower
  geometry, not cards — two green `verify` jobs on a cards PR are not evidence
  that anything about cards was checked.
- Dev-only deps, gitignored and not in `package.json` (same convention as the
  other gates): `npm i --no-save playwright-core jspdf@2.5.1 jszip
  google-font-metadata`. The gate serves jsPDF/JSZip from `node_modules` at the
  exact cdnjs URLs `cards.html` pins, and replays real Google Fonts responses
  fetched by Node, so it needs no browser egress and is offline after one run.

## Contact sheets — A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN CONTROL

**THE RENDERER IS NOT DETERMINISTIC BETWEEN PAGE SESSIONS, and every sheet in this repo was
shot as though it were** (Eva's ruling, Sep 7, from session 26's tip sheet). Measured: the
SAME TREE, the SAME camera, shot twice at the fixed ~260 ms wait every sheet tool here uses —
**4,925 to 7,426 pixels differ**, at worst channel steps of 82-88, spread over the whole
frame. All of it is orbit damping still easing; headless software GL runs at ~2 fps, so the
camera flight and the damping have a half-life measured in seconds and a fixed wait samples an
arbitrary point on the way in.

**So every pixel figure quoted from a sheet before session 26 has that floor underneath it.**
The exposure is small in practice — most sheets here were ruled BY EYE, and a picture judged
by eye is not harmed by sub-perceptual noise — but any sheet that reported a pixel DELTA as
evidence was reporting a number with an unstated floor of several thousand.

**THE RULE:** a pixel number is a measurement only when it comes with its own SAME-TREE
CONTROL — the same tree, the same camera, shot twice, on that same row. Not one global control
for the sheet: session 26 measured 0 px of noise at 13,440 triangles and 13 px at 80,544 on
the same run, so the floor is per-row.

**AND WAITING FIXES HALF OF IT, NOT ALL.** Settling on the real signal (screenshot until two
consecutive frames are BYTE-IDENTICAL, never a fixed sleep) took the anther row from 27,262 px
to 0. It did not take the 80,544-triangle row below 13 px. Where a residue remains, REPORT it
beside the control and let the gate assert the property that can actually fail; do not invent
a tolerance that happens to pass the data in hand.

**AND THE WHOLE-BLOOM CONTROL IS BIMODAL, WHICH MEANS A SINGLE CONTROL SAMPLE IS NOT A FLOOR**
(Eva, session 29). Measured on one sheet, same tree, same camera, sixteen rows: the whole-bloom
control read **0, 51, 50, 10,486, 0, 52, 10,635 px** and reached **15,885 px** across runs, with
the SAME row landing in either mode on different runs. Settling removes the DAMPING; it does not
remove this. Two consequences, both load-bearing: **(a)** a bar set from one control draw fires
on an unchanged picture in the low mode and passes a real 10,000-px change in the high mode —
wrong in both directions, so **make pixel ASSERTIONS only on a framing whose control is low in
every observation** (on the anther sheet that is the macro crop, 0 px on every row of every run)
and REPORT the rest; **(b)** session 26's `4,800 px against a 6,868 px floor` for the trifid is
**RETRACTED** on these grounds — see `docs/bloom-session-26-outcome.md`. Ruling Q2 stands, on
the facet phase and the two-session expiry, which were always its stated grounds. **A pixel
figure from a whole-bloom view is not evidence unless its own control was taken in the same page
session AND came back low.** **BUT THE RETRACTION BREAKS THRESHOLDS, NOT EXACT ZEROS** (Eva,
session 29): a bimodal control destroys `X px is below the floor` and touches nothing of the form
`the difference is exactly 0`, which is an IDENTITY rather than a comparison against a noise
estimate. Session 29's migration pair (0 px on three views), its INERT row (0 px while its own
whole-view control read 10,492 px on the same run) and its eight cross-config pairs over
bit-identical states all stand unhedged. **A threshold needs a floor and therefore a
distribution; an identity needs neither.** **AND THE BIMODALITY IS NOT CONFINED TO THE
WHOLE-BLOOM FRAMING:** the MACRO view threw a 38,057 px one-off between two states proved
bit-identical to the float (0 of 120,960), and it did not reproduce over eight interleaved
pairs — so `the macro control read 0 px on every row` is an OBSERVATION, never a guarantee.
**A SINGLE SAME-TREE CONTROL IS NEVER A FLOOR** (Eva, session 30, after sessions 26, 28 and 30
each found it independently — the last as 15 px against a 0 px control while the same run's other
macro controls read 12 to 30 px): **a pixel BOUND is set from the RUN'S OBSERVED CONTROL
DISTRIBUTION and both sides' controls, never from one sample.** An identity still needs neither,
which is why the exact-zero claims (a triangle count, a read-out line character for character)
stand unhedged and are what carry a row.

**WHILE A RULING IS OUTSTANDING, COMMIT LOCALLY AND DO NOT PUSH** (Eva, session 29). The
push-once amendment covers INSTRUMENT ITERATION; a session waiting on a ruling is the other
state with uncommitted work by construction, and it meets the stop hook every time. Committing
locally gives the hook everything it exists for; pushing is what costs. Session 29 pushed a
docs-only commit while holding for a ruling: all four bloom gates re-triggered (paths filters
are evaluated against the WHOLE PR diff) and `cancel-in-progress` killed the two long runs
mid-flight, losing 23 minutes. Full worked case, including the session's own retraction of a
wrong first reading, in the charter's push-once entry.

**DEBUG THE TOOL ON TWO ROWS, NOT ON THE FULL GRID** — the charter's own section, *Debugging an
instrument*. Session 29 spent five fifty-minute sheet runs finding bugs in a sheet tool while
the geometry passed all sixteen rows every time; none of the five failures was about the bloom.
Cut the row arrays to a reference cell and one other, prove the tool in four minutes, then run
the grid once. The same reflex applies to the matrix gates: `--only` and `--smoke` exist for it.

## Maintainability & performance (working agreement)

As the project grows, keep it maintainable and performant. Flag these proactively —
don't wait to be asked, and don't surface them only after the fact.

1. **Estimate cost before building.** If a requested feature would meaningfully
   increase triangle count, file size, or geometric complexity, say so with an
   estimate BEFORE implementing, so the user can decide with the number in hand.
2. **Report the numbers on every geometry change.** Any change that touches
   geometry must report the actual triangle count (live + export) and export STL
   file size in its summary, so creeping bloat stays visible over time.
   `node tools/verify-flower-export.mjs` prints per-config triangle counts.
3. **Keep features isolated.** Each part lives in its own builder — petals
   (`buildPetalInto`), whorls (`buildLayerInto`), sepals (`buildSepalsInto`),
   receptacle, stem, core, future leaves. Reuse shared primitives (`surfacePoint`,
   the `MeshAccumulator`) instead of duplicating, but never tangle one part's logic
   into another's. New parts get new builders.
4. **Flag print-safety risk up front.** For any geometry-touching feature, state
   the manifold/watertightness impact before shipping; if you are not confident it
   stays manifold, say so and stop (see the print-safety invariant above). Never let
   a watertightness problem be discovered after the fact.
5. **Call out session/scope drift.** If the conversation history or codebase has
   grown enough that a fresh session seeded with a clean state summary would serve
   the project better than continuing, say so rather than pushing forward regardless.

## Before finishing a task

- Confirm the current branch.
- Confirm the PR base is `main`.
- Report whether anything was merged.
- Report whether anything was pushed to `main`.
- Provide the Deploy Preview URL if one exists.
- For geometry changes, report the triangle count (live + export) and export STL
  file size (watch for bloat), and confirm `tools/verify-flower-export.mjs` passes.
- For control-panel changes, confirm `tools/verify-registry-sync.mjs` and
  `tools/verify-tier-visibility.mjs` pass, and diff `tools/dump-visibility.mjs` against
  the pre-change dump when the change is meant to be visibility-neutral.
