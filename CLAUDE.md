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

The Parametric Bloom (`bloom.html`, `bloom.js`, `bloom-geometry.js`,
`bloom-registry.js`) is a separate generator from the flower. Its governing
document is **`docs/bloom-charter.md`** — read it before touching any bloom
file; rules are stated there (and in the flower-project skill it references),
deliberately not repeated here. Its invariant is one connected watertight
solid, gated by `node tools/verify-bloom-export.mjs` (boundary edges = 0) and
`node tools/verify-bloom-connectedness.mjs` (voxel flood-fill, one region) —
both run in CI and both must pass before any bloom geometry change is done.
**Iterate on `node tools/bloom-smoke.mjs`** — 28 of the 499 matrix rows through
the real export gate, ~2 min against ~44 for one full gate (about 20x — the
first-reported 31x mixed machine states and is withdrawn; see the charter); `--conn` adds the
flood fill and is REQUIRED while a new geometry mode's junction assertions are
still being established. It is for iteration, never for merge: the full matrix
on both gates, in CI, is the merge criterion, and what the subset is BLIND to is
in that tool's own header. Do not also run the full matrix locally except at a
milestone (charter, "the iteration loop"). Note two of the six CI jobs on a bloom
PR are FLOWER gates (`'tools/**'` filtered), so "six verify jobs green" overstates
the bloom evidence — it is four.
**Frozen baselines are frozen at commits on `main`, never at a branch head, and
are tagged at freeze time** — `tools/publish-frozen-tags.sh` pins all twelve
(`frozen/phase2`..`frozen/phase13`) so a branch delete or a force-push cannot
orphan one; phase10 is the case that produced the rule (charter, Sep 5).
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
slider-dependent count here, a branch not a ramp); `buildCenterInto` seats
the designed centre on the apex slab and REPORTS its overlap patch and rim
hover (photographed on `node tools/shot-bloom-dome.mjs <dir>`, not fixed — a
button that follows the cap is a phase-2 centre question). NOT derived from
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
panel gate's route (k) asserts the HEAD RISE line, the clamp and the seat
line in both directions. The sheet is
`node tools/shot-bloom-dome.mjs <dir>` — the incurve target flat beside
domed, print preview ON, the base from a low profile at the rim and from
below, the mum flat / 0.50 / hemisphere, the two controls, and the centre
seat for Eva's eye.

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

**Facet counts are computed against every filter except themselves** — with
the view defaulting to tattoo artists, a region count taken over the whole
ledger would read "USA (40)" while showing 25. Each filter is its own
predicate (`matchesCategory`, `matchesGender`, …) so the region and tag
counts can exclude their own dimension.

**Testing approach:** no CI workflow covers this file (every GitHub
Actions gate in this repo is path-filtered to `flower*`/`bloom*` files
only — only Netlify's own informational checks run on this PR). The
drawer, paste-to-add, shortlist and import work (items 11–24) ship with a
behaviour gate, `node tools/verify-tracker-drawer.mjs` (269 checks;
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
the retry backoff, and dropping the legacy-tombstone sweep — each turns it
red, on the checks that name that behaviour.

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
