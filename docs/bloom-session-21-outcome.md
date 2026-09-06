# The androecium, session 21 (phase 2, B2) — filaments through the slab, the PILL anther, a Vogel disc beside the ring, shipped ABSENT

Session 21 is B2 of phase 2: the androecium. Filaments one sheet thick, rooted THROUGH
the hub slab on the owner's own surface normal, curved by `spineLaw()` at a curl of 0 as
the identity, each tipped with the one anther shape Eva ruled from Phase A's sheet — the
PILL. A second descriptor kind from `footRing()` (`fr.androecium`), sharing the dome
object and the surface law with the petal rings; two layouts (the shipped RADIAL ring, and
the Vogel disc the charter parked for petals); a radius that is a RANGE — the filaments'
own area rule times an exposed multiplier, out to the hub radius, clamped and told; the
petal-root overlap FLAGGED, never refused; JS1–JS4 in both gates and fired on mutants; the
two-statement SPHERE guard with GATED rows; the slenderness line carrying `UNMEASURED — no
coupon has been printed` verbatim; the sheet with the pill at BOTH count extremes and the
six-filament curl range. **Ships ABSENT: `stamenCount` defaults to 0, and 0 moved on the
newest frozen baseline is by construction and measured.**

Everything below is the EXPORT reading unless it says live.

## The rulings this implements (Eva, Phase A, carried — not re-derived)

- **A1 PILL, FIXED.** One anther shape, not an enum, not a control. **A2 BILOBED is retired
  from the candidate set permanently** — recorded here so nobody re-proposes it. A3 T-BAR is
  a later value addition once six curved filaments have been seen in the real generator
  (this sheet shows them). A4 CLUB is a tapered pill and is dropped.
- **The radius is a range, not a ruling.** Its own placement law, its own count, no pairing
  with petals; a derived default from its own reference area rule with an exposed control on
  top (the petal `spread` precedent); the range runs out to the hub radius; rows where stamen
  footprints overlap petal roots inside the slab get a FLAG, not a refusal. Multiplier or
  millimetres: the recommendation is below, the ruling hers.
- **Placement:** the Vogel disc arm beside the existing laws (stamens are constant-size, so
  the objection that parked it for petals does not apply); the six end stays on the shipped
  RADIAL law.
- **Filament path:** curved via the repo's own `spineLaw()`, shipped at curl 0 as the identity.
- **Structure:** `fr.androecium` from the same owner, sharing the dome object and the surface
  law extracted into one helper both maps call, proved byte-identical for the petal rings.
- **Assertions:** JS1 root axis on the owner's normal through the full slab, JS2 containment,
  JS3 the overlap a solid read from emitted vertices, JS4 the free-end census equals the
  declared count; plus the two-statement SPHERE guard with GATED rows.
- **Telemetry, not gates:** slenderness on every row; the crowding extensions and the
  tip-to-tip instrument as FLAGS. None becomes a pin without a separate ruling.
- **Default: ABSENT.** 0 moved across the matrix, by construction.
- **The stopping rule:** roughly 600 lines before JS1–JS4 are green means STOP and split.
  Where this session stood against it, and what went to B2b, is its own section below.

## What was built

- **Geometry (`bloom-geometry.js`).** `MAX_STAMENS` 120; `ANTHER_DIAMETER_FACTOR` 1.6 and
  `ANTHER_LENGTH_FACTOR` 2.5 (the pill's proportions: 1.6 filaments across, 2.5 of its own
  diameters long — 1.92 × 4.80 mm on the shipping sheet, 1.60 × 4.00 mm at the 1.00 mm
  export floor; two constants for Eva's eye, never controls); `STAMEN_SIDES` 10,
  `STAMEN_ROWS` 16, `ANTHER_CAP_RINGS` 5 — fixed, so topology depends on no slider and the
  export gate's live-equals-export count holds; `STAMEN_TRIS` 560 derived from them;
  `androeciumEligible(state)` — the geometry's statement of "not under SPHERE".
  **`surfaceAt(radius, polar)`** inside `footRing()`: the ring map's own slope / z / arc /
  relief expressions moved verbatim into one closure both maps call. **The androecium
  descriptor** after the hub: null when absent or under SPHERE; the filament diameter IS the
  floored sheet thickness (Part thickness owns the material dimension); `derivedRadius` =
  (d/2)·√count — the androecium's OWN area rule, the disc the filament cross-sections would
  tile; `asked` = that × `stamenSpread`; the range's `limit` = the hub radius LESS ONE
  FILAMENT RADIUS (so the outermost footprint reaches the rim and stands whole on the slab),
  clamped and told; RING puts every stamen at the disc radius, DISC at r_i = R·√((i+½)/N);
  `inPetalRootAnnulus` counts roots standing inside any ring's [radius − overhang, radius];
  `slenderness` = length / floored diameter; `onAxis` names the one reachable corner where
  the hub is narrower than a filament radius and the androecium collapses onto the axis.
  **`buildStamenInto()`**: the root axis from the shell's INNER face to its OUTER face along
  the cap's normal — a straight cylinder of diameter d and height t, the solid overlap —
  then `spineLaw({ tilt: 0 })` in the (Up, −Rs) plane, so at curl 0 every substep is
  `cos(0)·ds` along the normal and `sin(0)·ds = 0` across (the straight rod is the law's
  zero-curvature branch, not a second code path; tilt 0 with the axes mapped rather than
  π/2 on the petal's axes, because cos(π/2) is 6e-17 and not 0). The tube's ring frame is
  (T, D × T) — constant along a planar curve, never twisting or degenerate. The pill is a
  surface of revolution about the tip direction with EXPLICIT apex fans at both poles, its
  lower hemisphere centred ON the tip so the tube's last ring is inside it. One emitter,
  `revolveInto()`, for both. `buildBloomInto()` places through `buildWhorlInto`'s EXISTING
  azimuth arms (RING → RADIAL, DISC → SPIRAL's golden angle over the owner's radii), tallies
  `freeEnds` at the call site, and computes the two distance flags (nearest roots, nearest
  anther apexes, all pairs — the golden angle's tightest approaches sit at Fibonacci gaps).
- **Registry (`bloom-registry.js`).** `PREDICATES.androeciumEligible` (`not sphereMode`) and
  `androeciumPresent` (eligible and count ≥ 1); the `androecium` section (label
  "Androecium"); five controls, `role: 'center'`: `stamenCount` 0–120 (default 0),
  `stamenLayout` RING / DISC (default RING), `stamenSpread` 0.60–6.00 (default 2.00),
  `stamenLength` 5–40 mm (default 20), `stamenCurl` −180..180° (default 0). The four
  sub-controls hide AND are inert at count 0.
- **App (`bloom.js`).** The STAMENS line (layout, disc radius beside the reference it
  multiplies, "(CLAMPED at the hub radius less a filament radius — N mm asked)" or "(ON THE
  AXIS: …)", the filament and the pill, the petal-root annulus flag beside the clear disc,
  nearest roots / nearest anthers with ROOTS FUSE / ANTHERS TOUCH, the spine floor told) and
  the SLENDERNESS line, verbatim tagged; `androecium`, `stamens`, `freeEnds`, `stamenNearest`
  on `__bloomMetrics()`.
- **Harness (`tools/bloom-harness.mjs`).** The two-statement guard at module load (16
  placement × hub-shape × count states; `stamenCount.max === MAX_STAMENS`; min and default
  0; every sub-control hidden iff absent); `stamenAssertions()` (JS0–JS4, below) wired into
  BOTH STL gates after the junction family; `STAMEN_SUBS` named so block 1's skip says why;
  matrix block 23 (24 rows — the count extremes on both layouts, spread / length / curl at
  both ends, the disc at 120 × rise 0.5 and 1, the mum's 4.69 mm hub with 120 stamens, the
  thinnest slab, three whorls / the continuous spiral / the fan, the fat filament, the
  on-axis apex corner, and three GATED rows); the live matrix is 507 rows (481 + 24 + the
  two `stamenCount` sweep rows).
- **Smoke (`tools/bloom-smoke.mjs`).** Block 23, four rows: 35 of 507 over 19 blocks.
- **Panel gate (`tools/verify-bloom-panel.mjs`).** Route (o): the section hides whole under
  SPHERE, the sub-controls hide at count 0, the STAMENS / SLENDERNESS lines and their
  CLAMPED / ANNULUS / ROOTS FUSE clauses against the owner's flags, and two BEHAVIOURAL
  inertness clauses (six stamens asked for under SPHERE: the build must not move from the
  bare sphere's; every sub-control at maximum at count 0: the default's own count). Thirteen
  routes in the negative control.
- **Coverage instruments.** `bloom-plan-coverage.mjs` and `bloom-solid-angle-coverage.mjs`
  build the stamens into a THIRD accumulator counted in R1 and never rasterised — the
  anthers are not the petal canopy, and a stamen over the disc must not read as crown
  closure. (This is why those two files left the predeclared untouched list; see below.)
- **New:** `tools/shot-bloom-androecium.mjs <dir>` — the sheet the merge waits on.

## THE ASSERTIONS — JS1–JS4, and the table

`stamenAssertions()` reads `footRing()`'s own descriptor and the builder's EMITTED records
(root axis, surface point, the two root rings as emitted, the apex, the per-stamen triangle
delta from the accumulator's own counter), never the STL, on EVERY row in both directions.

| | claim | the mutant that fired it FIRST (`--only` on one row, real export gate) |
|---|---|---|
| JS0 | the two statements agree per row; present iff eligible and count ≥ 1; nothing emitted when absent | — (covered by every absent row) |
| JS1 | inner→outer is exactly t along the cap's normal at the owner's surface point; on the cap the root is ON the sphere with its normal; flat: N = [0,0,1] and z = 0 exactly | **M-JS1** the root axis laid along Rs (in the tangent plane): fires on all six stamens |
| JS2 | the limit is hub − rFil; clamped iff asked > limit; every footprint inside the hub disc (on-axis corner excepted, told); the layout law as a PROPERTY — one radius and even azimuths (RING), equal-area steps at the golden angle (DISC) | **M-JS2** the clamp removed: fires on `6 x spread max` (6 roots at 8.82 + 0.6 outside 8.84); the real tree passes that row |
| JS3 | the filament is one sheet thick; both root rings have STAMEN_SIDES points each exactly rFil from the centre in the face plane — a cylinder of diameter d through the full t, never a hairline | **M-JS3** root rings at a tenth of the radius: fires on every point |
| JS4 | stamens emitted = free ends tallied = declared; every stamen at the FIXED 560 triangles (the accumulator's delta); apexes distinct; the pill the fixed proportion | **M-JS4a** the pill never emitted: 360 ≠ 560 on every stamen. **M-JS4b** one stamen fewer: 5 emitted for 6 declared, 5 free ends |
| the two-statement guard | `androeciumEligible()` (geometry) === the registry predicate over 16 states | **M-SPH** the geometry ignores the sphere: dies at HARNESS LOAD on four CONTINUOUS × SPHERE states, before any row |

Both STL gates are blind to every one of these by construction — each tube and pill is its
own closed solid, and a filament rooted off the normal, standing off the hub, touching the
slab in a hairline, or missing altogether exports watertight and reads as one piece — which
is why the family exists and why the smoke subset ran with `--conn` until it had fired.

**What the first smoke run found, and fixed (three things, two of them real).** (1) With the
disc radius clamped AT the hub radius, 16 of 120 roots stood half over the slab's rim on the
defaults and JS2's containment clause fired on the rise-0.5 row — "out to the hub radius"
has to mean the outermost FOOTPRINT reaches the rim, so the limit is the hub radius less a
filament radius. (2) JS4 carried an "apex beyond the outer face" clause; a filament at curl
180 brings its anther back below the hub plane on purpose, and the clause fired on a shipped
row. "Free" is the census's word for the un-rooted end, not a position claim; the clause is
gone and where an anther lands is the sheet's question. (3) The plan-coverage R1 identity
(petals + hub = the whole build) stopped holding the moment stamens existed — a third
accumulator, counted and never rasterised.

## THE MEASUREMENT EVA ASKED FOR — does Head rise relieve the packing?

Never measured in Phase A (every number there was plan-radius). From the built owner, 120
stamens on the Vogel disc at the shipping spread (2.00x asks 13.15 mm and is CLAMPED at
8.24 mm), 20 mm filaments, the defaults' hub, export mode:

| head rise | Rd (mm) | root NN, plan (mm) | root NN, surface chord (mm) | anther apex NN (mm) | apex / root |
|---|---|---|---|---|---|
| 0.00 | flat | 1.164 | 1.164 | 1.164 | 1.00x |
| 0.25 | 18.79 | 1.164 | 1.164 | 2.679 | 2.30x |
| 0.50 | 11.06 | 1.164 | 1.166 | 3.744 | 3.21x |
| 0.75 | 9.21 | 1.164 | 1.167 | 4.264 | 3.65x |
| 1.00 | 8.84 | 1.164 | 1.168 | 4.394 | 3.76x |

**Rise does NOT relieve the root packing** — the surface chord between the nearest pair moves
0.3% from flat to hemisphere, exactly the dome finding for the petal feet (the extra surface
sits at the rim; a tight packing is at the inner rings). **Rise UNFUSES THE ANTHERS, and it
does it by splaying the filaments, not by adding surface:** on a flat hub the filaments are
parallel and the anthers (1.92 mm across) overlap at 1.16 mm; on a cap the roots' normals fan
out, so the tips at 20 mm sit 3.7 mm apart at rise 0.50 and 4.4 mm at a hemisphere. **Said
plainly: on a bloom with an androecium, Head rise is the stamen splay.** The head's cap
angle IS the filament's aim, because the filament leaves along the surface normal. That is
what the control means now, and the sheet's third row shows it.

## THE RECOMMENDATION — multiplier or millimetres

**A MULTIPLIER on the filaments' own area rule, clamped at the hub radius less a filament
radius and told.** Three grounds:

1. **It is scale-free.** One slider value means one packing density at every count and every
   filament diameter — the count is the control a visitor actually turns, and a radius in
   millimetres that held while the count went 6 → 120 would fuse the roots silently.
2. **The range's far end is not a number.** It is the hub radius, which is itself derived (the
   petals' area rule × spread, floored at export) and moves under nine controls. A slider in
   millimetres cannot carry a static max at a moving end, so it would clamp anyway — and a
   clamp on the thing the slider NAMES ("radius 12 mm" building 8.2) is worse than a clamp on
   a ratio, which the read-out already tells in millimetres.
3. **The panel already teaches this reading** (`spread`), and both numbers are on screen: the
   STAMENS line prints the built radius in millimetres beside the multiplier.

Its cost, stated: on the shipping hub the multiplier saturates at 1.37 with 120 stamens
(13.15 mm asked against an 8.24 mm limit), so 4.6 of the slider's 6.0 is above the clamp on
that bloom — told, exactly as the foot ceiling is. A millimetre slider would have the same
dead zone from the other side. Default 2.00 on the spread precedent: at 1.00 the reference
rule tiles the disc with filament cross-sections (a fused cushion by construction); the
Vogel disc's nearest pair at multiplier m is 1.547·m·(d/2), so the filaments clear at 1.29
and the ANTHERS (1.6 d) at 2.07. Her ruling.

## The stopping rule, and what went to B2b

Eva's rule: roughly 600 lines before JS1–JS4 are all green means STOP. This session stood at
666 insertions on the eight code files when the assertions were written and not yet run
(710 after the R1 fix and the panel route; ~40% of it comment, in this codebase's own
convention). From that point nothing was added that a green run did not need. **Deferred
to B2b, deliberately:** the crowding RASTER extensions (stamen feet in `D_max`, the exact
stamen-on-foot rectangle test — the read-out's annulus flag is the radial stand-in), and
the anther-against-BLADE instrument (it needs the blade geometry; the anther-against-anther
half ships as the nearest-apex flag). The curved filaments were built BEFORE the budget
check fired and are kept: `spineLaw()` at tilt 0 is one code path, removing the curl control
would leave the law in place, and the sheet Eva asked for shows the six-filament curl range.

## What this session predeclared it would not touch

A sha1 manifest of 74 files taken from the working tree at `a65d16d` before any edit (every
`flower*` file and gate, cards, the tracker, print, every workflow, `bloom.html`,
`bloom.css`, `bloom-view-presets.js`, `tools/bloom-crowding.mjs`, the shot tools, the
frozen-tag script). **71 held by `sha1sum -c` at close. Three moved, each named with why:**
`tools/bloom-plan-coverage.mjs` and `tools/bloom-solid-angle-coverage.mjs` (their R1 part
census had to count a third part, or every stamen row failed the instrument's own validity
check — the predeclaration did not foresee that R1 sums parts), and
`tools/verify-bloom-connectedness.mjs` (the assertion family is wired into BOTH STL gates,
which the predeclaration should have foreseen). Predeclared, verified by diff, the misses
said: that is the rule doing its job.

## The evidence

- **Smoke subset with the flood fill** (`node tools/bloom-smoke.mjs --conn`, required while a
  new geometry mode's junction assertions were being established): **35 of 507 rows over 19
  blocks — export gate PASS, 35/35 watertight, 35/35 identical live and export triangle
  counts, 35/35 no degenerate triangles, 4 CROWDED (a flag); connectedness PASS, 35/35 one
  connected body.** The four stamen rows: six on a ring 13,440 triangles (656 KiB), curl 180
  the same count, the 120-disc at rise 0.5 80,544 (3,933 KiB), the GATED maximum under SPHERE
  16,608 — the bare sphere's own count. The first run of this subset is what found the clamp
  defect and the JS4 clause (above); the second is the one quoted.
- **JS1–JS4 on the real rows: green; on the mutants: each fired first** — the table above,
  every run through the real export gate with `--only` on one row. The sphere mutant dies at
  harness load on four CONTINUOUS × SPHERE states.
- **Panel gate PASS** on this tree, route (o)'s eight steps green (the section shown with
  its count and the sub-controls hidden at the default; six stamens; 120 on the disc CLAMPED
  with 81 in the petal-root annulus and ROOTS FUSE; six at spread 0.60 ROOTS FUSE; the
  section hidden whole under SPHERE; six asked for under SPHERE with the build unmoved from
  the bare sphere's count; back to CAP; every sub-control at maximum at count 0 with the
  default's own count). **`--negative-control` PASS — ALL THIRTEEN ROUTES fired**, the
  androecium route on its frozen-read-out clause. The first panel run failed 13 assertions,
  all in the gate's expectations: a top-level section declared between "roles" and its nested
  drop-downs reads as out of order and as their sibling (the entry moved to the end of
  SECTIONS, with why), and a collapsed section needs a witness in WITNESS (added — the
  builder's free-end tally and the owner's disc radius).
- **Numbers.** The default bloom is unchanged at **10,080 triangles** live and export alike.
  A stamen is **560 triangles**, fixed: six add 3,360; 120 add 67,200 (77,280 on the flat
  hub, 80,544 on a cap — the hub's own 3,456-triangle shell). The mum's sliders with 120
  stamens on the disc: 215,712 export. Filament 1.20 mm, pill 1.92 × 4.80 mm at the shipping
  sheet; 1.00 mm and 1.60 × 4.00 mm at the export floor.
- **The live matrix is 507 rows** (481 + block 23's 24 + `stamenCount`'s two sweep rows);
  the smoke subset 35 over 19 blocks, its drift guard green. ALL MAX now carries 120 stamens
  on a ring with the sub-controls at their defaults — predeclared in `STAMEN_SUBS`'s note.
- **The untouched manifest:** 71 of 74 predeclared files byte-identical by `sha1sum -c`; the
  three that moved are named above with why.
- **The byte diff on the newest frozen baseline — EXACT.** `phase15Matrix()` (527 rows at
  8524318) captured on a worktree of `a65d16d` (the head of `main`) and on this tree, and
  compared row by row by label on the real Get STL bytes: **527 compared, 527 HELD, 0
  MOVED**, the two trees fingerprinted differently (`bc0c46288cf1` against `047dc69717a1`).
  The shape had to be split, and `tools/compare-bloom-captures.mjs` says why in its header:
  phase15 was frozen before the centre retirement, so 55 of its rows name retired ids that
  NO post-retirement tree can apply as written — the tool's own capture records 472 rows and
  exits 1 on both trees, and its `--compare` refuses an incomplete capture. So the 472 were
  captured as written and the 55 with `--strip` (exactly `RETIRED_IDS`) on both trees, and
  compared with the tool's guards restated (every label once per side, different trees,
  the strip list checked, the partition predeclared). **The live partition:** every live row
  the base tree also has is a phase15 row up to session 20's relabelling, so it is covered
  above; the one PREDICTED mover, ALL MAX (it now sweeps `stamenCount` to 120), was captured
  by each tree's own copy of the tool and MOVED by exactly 120 × 560 triangles, 300,096 →
  367,296. A first attempt drove this tree's ALL MAX at the base tree and was refused
  (`stamenCount: not in the DOM`) — the diff tool's matrix is the running tool's, not the
  served tree's, which is worth knowing the next time two trees differ in their controls.
- **The full matrix on both STL gates runs in CI on the PR head** — the merge criterion, not
  run locally (session 17's ruling).
- **The sheet:** `node tools/shot-bloom-androecium.mjs <dir>` — 16 cells, 34 frames, every
  frame decoded and required to carry content, every cell JS1–JS4 and the junction
  assertions before the shutter, every export watertight with 0 degenerate triangles. The
  three byte claims on the sheet held: every androecium control at maximum under SPHERE
  exported the bare sphere's own sha (`db348671ad99`, 16,608 triangles), under the incurve
  sphere the incurve sphere's (`7e5b7522e248`, 155,040), and every sub-control at maximum
  with count 0 the default's (10,080). The first render's side camera sat 8° up and the
  tilted petals hid the curl loops; it now sits 20° up (measured against the near tip:
  −0.3 mm at 8°, +6.8 mm at 20°).

## Eva's two questions before the merge (Sep 6), answered by measurement

**1. Is R1 still capable of failing on stamens?** Yes, and here is it firing. The third
accumulator is handed no count: it calls the same `buildStamenInto` through the same
orchestration `buildBloomInto` uses, and the accumulator counts what was EMITTED. So R1
compares the copy's orchestration against the owner's. Mutant **M-R1** — every stamen
emitted a SECOND time into the real build, recorded nowhere (duplicate closed solids: the
defect class this codebase has a rule about) — through the real export gate on `STAMENS: 6
on a RING`: JS1–JS4 silent (six records at 560 each, the tally 6), boundary 0, and then
**`coverage R1: petals-only (9888) + hub-only (192) + stamens-only (3360) tris = 13440,
but a normal whole-bloom build has 16800` — RED.** Driven directly on a cap (six stamens,
rise 0.50): plan R1 red at 16,704 against 20,064 and **solid R1 red at the same numbers**.
The real tree on the same row and the same drive: export gate PASS, plan clean, solid
clean. **What R1 cannot see, said plainly:** a defect INSIDE `buildStamenInto` (a dropped
pill, a hairline root) moves both sides equally, because the copy calls the same builder —
those are JS3's and JS4's, which fired on exactly those mutants. R1's claim is the
orchestration: the count, the layout, the SPHERE gate, and duplication.

**2. Does the multiplier's declared range match where it saturates?** It cannot, on any
static range, and the table is why. The saturation multiplier is `(hub − r) / (r √N)` —
`saturation` on the descriptor now — a function of the COUNT and the HUB:

| hub | N=1 | 6 | 12 | 20 | 40 | 120 |
|---|---|---|---|---|---|---|
| shipping (8.84 mm, d 1.20) | 13.7 | 5.61 | 3.97 | 3.07 | 2.17 | 1.25 |
| the mum (4.69 mm printed, d 1.00) | 8.38 | 3.42 | 2.42 | 1.87 | 1.33 | 0.77 |
| the largest (74.2 mm) | 123 | 50.0 | 35.4 | 27.4 | 19.4 | 11.2 |
| the smallest (0.81 mm) | 0.35 | 0.14 | 0.10 | 0.08 | 0.06 | 0.03 |

Against the declared 0.60–6.00: on the shipping hub the top is dead from six stamens up
(7% of the travel at 6, 38% at 12, 88% at 120) and fully live below six; on the largest hub
nothing is dead at any count; on the smallest hub everything is (the on-axis corner, told).
**Narrowing was not done, and the reason is the table, not reluctance:** a max that removed
the dead travel on the shipping hub at 120 (1.25) would delete the six-stamen candidate's
whole useful range (its anthers clear at 2.07); a max that kept the common count band live
(4.00) would still leave 69% dead at 120 and would delete reachable states on every large
hub (six stamens on the 74 mm hub saturate at 50). The ruled answer to dead travel in this
codebase — the spine curl, the foot ceiling — is full ranges, clamped, TOLD, and that is
what ships: the CLAMPED clause now prints where the multiplier runs out on this bloom
("1.25x is as far as this hub goes, the slider above it is dead here") and **route (o)
asserts that number against the owner's `saturation`** in both directions, so the panel
gate sees the extent, not only the state. If Eva still wants a narrowing, it is one number
in the registry plus three row labels and one sheet cell; 4.00 is the value that keeps
1–12 stamens live on the shipping hub.

## The rulings (Eva, Sep 6)

- **The pill at six and at 120 — approved, as chosen.**
- **The radius control as a MULTIPLIER, not millimetres — approved**, for the reasons above.
- **Curl range —** the ruling's placeholder was left unfilled (`<<±180 or ±120>>`). ±180 ships
  as built and photographed; a narrowing to ±120 is one number in the registry plus the two
  curl-extreme row labels and two sheet cells, and it moves no byte (the default is 0).
- **Noted for B2b, not built:** Head rise is currently the only way to change stamen splay,
  so HEAD does two unrelated jobs. The proposal, costed below.

## B2b: an independent splay on the androecium's own whorl — proposed and costed, not built

`stamenSplay` (ANDROECIUM section, degrees from the surface normal, outward positive,
−45..+90, default 0). The mechanism already exists: `buildStamenInto` passes `spineLaw()`
a `tilt` of 0, and that argument IS the aim at the root — the splay is `tilt: −splay` in
the (Up, −Rs) frame, applied from the OUTER face exactly as the curl is, so the root axis
stays on the owner's normal and JS1 is unchanged. On a flat hub it is the only splay; on a
cap it ADDS to the normal fan, so HEAD keeps one job (the surface) and the androecium
owns its aim. It is a different word from curl (the five-things-that-sound-like-curve
table: a rigid aim at the root against a progressive bend along the length). **Cost:** one
registry row; one descriptor field (`splayRad`); one line in the builder, guarded
(`tilt: splay === 0 ? 0 : −splayRad`, so the shipping default takes the identical
doubles); three matrix rows (min, max, 120-disc × max); one route (o) step whose witness
is the nearest-apex distance growing (the splay costs zero triangles, so the count cannot
witness it); one sheet cell beside the rise cell. About 40 lines, 0 triangles, 0 moved by
construction. The splay interacts with the tip-to-tip flag and with the anther-against-blade
instrument B2b already owns, which is the reason to build them in the same session.

## phase16 — owed, frozen, why

The row set changed (481 → 507: block 23's 24 rows and `stamenCount`'s two sweep rows),
which is a different case from session 19, where nothing moved and nothing was added. So a
new frozen phase is owed on the standing convention — the matrix as it stood at the head of
`main` when the session opened, at a commit ON `main`, tagged at freeze time.
`phase16Matrix()` is the 481 rows at `a65d16d`, generated from that commit's own
`buildMatrix()` (10 capability rows, 2 coverage pins, 4 solid pins carried), proved
deep-equal by `--verify-frozen --phase16 --base <worktree of a65d16d>` (PASS, 481 rows),
`FROZEN_BASE_COMMITS.phase16 = 'a65d16d'`, the diff tool wired. It is the first
post-retirement baseline: every row applies as written on any tree from `a65d16d` on, so
the next session's retention close is one plain capture per tree and the tool's own
`--compare`, not phase15's split shape. Expected to say 481 HOLD across the androecium, by
construction — the claim phase15's 527 made for this session and measured. The tag
`frozen/phase16` is published from `main` after the merge by dispatching the
bloom-frozen-tags workflow (red by design on the phase5 refusal), verified with
`git ls-remote`.

## The sheet — `node tools/shot-bloom-androecium.mjs <dir>`

Every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS1–JS4 and the junction
assertions before every shutter, the STL sha of that cell: (1) the pill at BOTH count
extremes — six on a ring, a hundred and twenty on the disc — from 40° off the axis, from the
side, and the six at the whole bloom; (2) the six-filament curl range, −180 / +90 / +180,
from the side and from above; (3) the 120-disc flat, at rise 0.50 and at a hemisphere on one
camera — the rise question; (4) the multiplier at its ends, one stamen, six on the disc, the
absent default; (5) THE BYTE CLAIM ON THE SHEET — every androecium control at maximum under
SPHERE exports the bare sphere's own sha, under the incurve sphere the incurve sphere's, and
every sub-control at maximum with count 0 the default's — REQUIRED equal, or no sheet.

**What the curl cells show, for the ruling on the range:** at +180 with 20 mm filaments the
six arch over the centre, cross at the axis, and their anthers come out BELOW the hub plane
on the far side; at −180 they reflex outward and hang below the disc between the petals. A
half-turn of a 20 mm filament is a 6.4 mm bend radius, so the anther lands one bend
diameter across from its root at the hub's own height. Watertight, one piece, every
assertion clean — and whether ±180 is a range worth keeping, or the top end is ±120, is
hers from these cells. The side camera sits 20° up so the tilted petals do not hide it.

Merge is released by Eva's ruling on it; the ruling itself goes in the docs-only PR after the
merge, per the approved amendment.
