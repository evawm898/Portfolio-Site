# The gynoecium, session 22 (phase 2, B3) — the style through the slab on the axis, the TRIFID stigma, the four-state centre, shipped ABSENT

Session 22 is B3 of phase 2: the gynoecium, and the last piece of the centre. One style,
one sheet thick, rooted THROUGH the hub slab ON THE AXIS (count 1, radius 0 — the apex,
where every cap's normal is exactly +z), curved by `spineLaw()` at a curl of 0 as the
identity through the SAME rod helper the filament uses, tipped with the one stigma shape
Eva ruled — the TRIFID. A third descriptor kind from `footRing()` (`fr.gynoecium`),
sharing the dome object and `surfaceAt()` with the rings and the androecium; JG0–JG4 in
both STL gates and fired on mutants; the two-statement SPHERE guard with GATED rows; the
style on the SLENDERNESS line beside the filament, `UNMEASURED — no coupon has been
printed` verbatim; matrix block 24 with the four-state matrix as its first rows; the sheet
with all four centre states on one row, the pill and the trifid TOGETHER at six and at a
hundred and twenty, and the filament curl at ±180 again. **Ships ABSENT: `gynoecium`
defaults to NONE, and 0 moved on the newest frozen baseline is by construction and
measured.** Moving the shipping default to a present centre is proposed with numbers at
the end, as its own partition event, and is NOT done here.

Everything below is the EXPORT reading unless it says live.

## The rulings this implements (Eva, the B3 brief, carried — not re-derived)

- **S2 TRIFID, FIXED.** One shape, not an enum, no sub-controls — the pill's own argument:
  shipping it fixed removes a control, its sub-controls, its matrix rows and a panel route.
  **S4 BILOBED is retired from the candidate set permanently**; S3 PAD is a later value
  addition if a second is ever wanted; S1 KNOB is dropped (Phase A: easy to lose against 120
  pills).
- **Structure:** `fr.gynoecium` as a third descriptor kind from the same owner, count 1,
  radius 0, on the axis, reading the same shared surface law. The androecium's pattern; no
  second one invented.
- **Curl:** the style curves via `spineLaw()` at curl 0 as the identity, exactly as the
  filament does — reused, not re-derived: `rodInto()` is now the ONE rod both builders call.
- **SPHERE:** hidden and inert, two statements, GATED rows proving byte-identity to the bare
  sphere. The androecium's shape, verbatim.
- **Telemetry:** the style joins the slenderness line with the verbatim tag; what it actually
  reads now is below.
- **Default:** ABSENT. 0 moved across the matrix by construction. The present-centre default
  is proposed below with numbers and stops for her ruling.
- **The four-state matrix**, all four exercised as matrix rows and on one row of the sheet.
- **Scope:** the gynoecium and nothing else. B2b (the crowding-raster extensions, the
  independent splay) stays parked and is untouched.

## What was built

- **Geometry (`bloom-geometry.js`).** `STIGMA_LOBES` 3 and `STIGMA_LOBE_SPREAD_DEG` 40 — the
  trifid's two constants, beside the anther's two, never controls; `STYLE_TRIS` 960 derived
  (the rod's 360 plus three pills at 200); `gynoeciumEligible(state)` — the geometry's
  statement of "not under SPHERE". **The gynoecium descriptor** after the androecium's: null
  when NONE or under SPHERE; diameter = the floored sheet thickness (Part thickness owns the
  material dimension, the filament's own rule); `surfaceAt(0, null)` for the apex record
  (slope 0, z = the face pole's height on a cap, 0 flat); `widerThanHub` (rSty > the hub
  radius — the apex corner, told, never refused: the root still crosses the whole slab);
  `inPetalRootAnnulus` and `clearRadius` as the stamens carry them; `lobe` — count, the
  anther's diameter and length factors on the style's diameter, the spread in radians;
  `slenderness` = length / floored diameter. **`rodInto()` and `pillInto()`** — the root axis
  inner→outer on the owner's normal through the full slab, the free length along
  `spineLaw()` at tilt 0 in the (Up, −Rs) plane, the (T, D × T) ring frame; and the pill as
  a surface of revolution with explicit apex fans, its lower hemisphere centred ON the rod's
  tip — EXTRACTED VERBATIM from `buildStamenInto`, the same expressions on the same doubles
  in the same order, so every stamen takes the bytes it took in session 21. **The block-23
  live partition on both trees is what measures that** (below), not the sentence.
  **`buildStyleInto()`**: the rod at azimuth 0 (R = [1,0,0], T = [0,1,0], exact) from the
  owner's apex record, then THE TRIFID: three pills sharing the tip, each aimed `spread` off
  the tip direction D toward P in the (T, D × T) plane at azimuths a third of a turn apart —
  P unit and perpendicular to D by construction, so the lobe axis D cos σ + P sin σ is unit
  and D × P is its own ring vector. Every lobe's lower hemisphere contains the rod's last
  ring exactly as an anther's does. `buildBloomInto()` builds the style after the stamens and
  returns `gynoecium` and `styles`.
- **Registry (`bloom-registry.js`).** `PREDICATES.gynoeciumEligible` (`not sphereMode`) and
  `gynoeciumPresent` (eligible and STYLE) — two predicates and not one shared with the
  androecium, because each part is INDEPENDENTLY present or absent (Eva, Sep 5); the
  `gynoecium` section (label "Gynoecium", last, on the androecium's DOM-order reason); three
  controls, `role: 'center'`: `gynoecium` — a CHOICE, NONE / STYLE, default NONE (one style or
  none, never a count: a 0..1 slider would read as a count that could grow), `styleLength`
  5–40 mm (default 25), `styleCurl` −180..180° (default 0). The two sub-controls hide AND are
  inert at NONE. "Pistil" is the whole female unit and names nothing here.
- **App (`bloom.js`).** The STYLE line (the rod, the trifid's fixed proportions, where the
  stigma's top stands and — with an androecium — how far ABOVE or BELOW the highest anther,
  in millimetres; WIDER THAN THE HUB and the petal-root annulus as flags; the spine floor
  told) and the SLENDERNESS line rebuilt as ONE line for every rod the centre carries
  (`filament 16.7 · style 20.8 (live) — UNMEASURED — no coupon has been printed`);
  `gynoecium` and `styles` on `__bloomMetrics()`.
- **Harness (`tools/bloom-harness.mjs`).** The two-statement guard at module load (the
  control a choice of exactly NONE / STYLE, NONE the default; 16 placement × hub-shape ×
  value states; every sub-control hidden iff absent); `gynoeciumAssertions()` (JG0–JG4,
  below) wired into BOTH STL gates after the androecium family; `GYNO_SUBS` named so block
  1's skip says why; matrix block 24 (21 rows, below); `phase17Matrix()`.
- **Smoke (`tools/bloom-smoke.mjs`).** Block 24, four rows: 39 of 528 over 20 blocks.
- **Panel gate (`tools/verify-bloom-panel.mjs`).** Route (p): the section hides whole under
  SPHERE, the sub-controls hide at NONE, the STYLE line and its ABOVE / BELOW clause against
  the builder's own apexes, WIDER THAN THE HUB against the owner's flag, the SLENDERNESS
  line's `style` part with its verbatim tag, and THREE behavioural inertness clauses (a style
  asked for under SPHERE; the WHOLE centre at maximum under SPHERE; every sub-control at
  maximum with NONE — the build must not move). Route (o)'s slenderness clause reads the
  line's `filament` part. Fourteen routes in the negative control.
- **Coverage instruments.** `bloom-plan-coverage.mjs` and `bloom-solid-angle-coverage.mjs`
  build the style into the SAME accumulator as the stamens — the centre's — counted in R1
  and never rasterised. **Doctrine 2, applied:** R1's blindness is now declared in BOTH
  instruments' own headers (the connectedness gate's free-end convention): R1 sees the
  ORCHESTRATION of parts, never a defect inside a builder, because the check shares the
  builder. It was missing from both headers (it lived only in session 21's outcome doc) and
  was added.
- **New:** `tools/shot-bloom-gynoecium.mjs <dir>` — the sheet the merge waits on.

## The four-state matrix

Androecium present / absent by gynoecium present / absent, all four as matrix rows and on one
row of the sheet: NONE × NONE is the DEFAULT row (10,080 triangles); stamens alone is block
23's six-stamen candidate (13,440); the style alone and BOTH present are block 24's first two
rows (11,040 and 14,400). Block 24's 21 rows: the four-state pair; the trifid against the
120-stamen cushion; length min beside six stamens (the stigma BELOW the anthers) and max; curl
at both ends; the filaments at +180 crossing the axis the style stands on; Head rise 1 (the
root at the pole); 120 on the disc at rise 0.5; the mum; the fat (2.40) and the thinnest
slab; the APEX CORNER (WIDER THAN THE HUB, told); three whorls, the continuous spiral, the
fan; and four GATED rows — the style at maximum under SPHERE and under the incurve sphere,
the WHOLE centre at maximum under SPHERE, and the sub-controls at maximum with NONE.

## THE ASSERTIONS — JG0–JG4, and the table

`gynoeciumAssertions()` reads `footRing()`'s own descriptor and the builder's EMITTED record
(root axis, the two root rings as emitted, the tip and its direction, every lobe's axis and
apex, the per-style triangle delta from the accumulator's own counter), never the STL, on
EVERY row in both directions.

| | claim | the mutant that fired it FIRST (`--only` on one row, real export gate, in a copy of the tree) |
|---|---|---|
| JG0 | the two statements agree per row; present iff eligible and STYLE; nothing emitted when absent | — (covered by every absent row) |
| JG1 | inner→outer is exactly t along the cap's normal at the apex; the root EXACTLY on the axis; the normal EXACTLY [0,0,1] flat and cap alike; on a cap ON the owner's sphere at the owner's z; flat: z = 0 exactly | **M-JG1** the root axis laid along Rs: "the style's root axis is not along its normal [0,0,1]". **M-JG1b** the builder stands the style one radius off the axis, the owner unchanged: "the style stands at plan (0.6, 0), not exactly on the axis" |
| JG2 | one style; the footprint inside the hub disc, or the owner says WIDER THAN THE HUB | **M-JG2** the flag never raised, on the apex corner: "widerThanHub reads false while the style radius 1.2 against the hub 1.149 says true" |
| JG3 | one sheet thick; both root rings STAMEN_SIDES points each exactly rSty from the centre in the face plane | **M-JG3** root rings at a tenth of the radius: "a point 0.06 from its centre, the style radius is 0.6" |
| JG4 | emitted = declared = 1; the fixed 960 (the accumulator's delta); the TRIFID as a PROPERTY — three unit axes each exactly 40° off the tip direction, 120° apart around it, every apex one lobe length along its axis, apexes distinct; the lobe the anther's proportion | **M-JG4a** a lobe dropped: "760 triangles, the fixed count is 960; 2 lobes emitted, the trifid is 3". **M-JG4b** the lobes at twice the spread — the SAME triangle count: "lobe 0 leaves the tip 80 degrees off the style, the trifid's spread is 40" |
| the two-statement guard | `gynoeciumEligible()` (geometry) === the registry predicate over 16 states | **M-SPH** the geometry ignores the sphere: dies at HARNESS LOAD, before any row |
| R1 (doctrine 2, measured again) | the centre's accumulator emits the style through the same builder; R1 fails on the ORCHESTRATION | **M-R1** the style emitted TWICE, recorded once, on the both-present row: JG1–JG4 silent, boundary 0, **`coverage R1: petals-only (9888) + hub-only (192) + centre-only (stamens and style: 4320) tris = 14400, but a normal whole-bloom build has 15360` — RED** |

Both STL gates are blind to every one of these by construction — the rod and each lobe are
their own closed solids, so a style off the axis, a hairline root, a missing lobe and a lobe
off the law all export watertight and read as one piece — which is why the family exists and
why the smoke subset ran with `--conn` until it had fired. Every mutant ran in a COPY of the
tree (never the working tree), and every one is "first-fired", per the skill's rule on
attributions.

## THE SLENDERNESS LINE — what it actually reads now

Phase A's numbers were plan-radius estimates (L/d 14.4 "above the six", 6.7 "above the
cushion"). The built owner's line is the whole free length over the FLOORED diameter, the
filament's own definition, so it reads the same quantity for both rods:

| state | filament L/d | style L/d | the line |
|---|---|---|---|
| style alone, 25 mm on a 1.20 sheet | — | 20.8 | `SLENDERNESS L/d style 20.8 (live) — UNMEASURED — no coupon has been printed` |
| style × six on a ring | 16.7 | 20.8 | `filament 16.7 · style 20.8` |
| style × the cushion (120 DISC) | 16.7 | 20.8 | the same numbers; the cushion is a packing, not a length |
| style length 40 | 16.7 | 33.3 | the slider's top |
| the mum (sheet 0.60, floored to 1.00 at export) | — | 25.0 (export) | the floor makes the style FATTER than live, so export L/d is lower than live's 41.7 |

What Phase A's "above" numbers were measuring is the height of the stigma over the anthers,
which is NOT a slenderness and is now printed as what it is: the STYLE line's `stigma top
N mm, M mm ABOVE / BELOW the highest anther` clause (the sheet's numbers below). Telemetry,
verbatim tagged; nothing here has been printed.

## The stopping rule

Eva's rule: roughly 600 lines before JG1–JG4 are green means STOP. This session stood at
**649 insertions on the eleven code files** (408 on ten of them plus 241 in the harness with
the 507 generated phase17 rows excluded; ~40% comment, this codebase's convention) when the
assertions first ran — and they were green on the first row through the real export gate
(the both-present row, 14,400 triangles), then on all 39 smoke rows on both gates. Nothing
was added past that point that a green run did not need: the sheet tool (209 lines, a new
file) and the docs are outside the count. No split is owed; B2b stays parked as instructed.

## phase17 — owed, frozen, why

The row set changed (507 → 528: block 24's 21 rows; no blanket rows, because the new control
is a choice), which is the case that made phase16 owed and is different from a session where
nothing is added. `phase17Matrix()` is the 507 rows at `6335ac4` — the head of `main` when
this session opened, a commit ON `main` — generated from that commit's own `buildMatrix()`
in a worktree, proved deep-equal by `--verify-frozen --phase17 --base <worktree of 6335ac4>`
(PASS, 507 rows), `FROZEN_BASE_COMMITS.phase17 = '6335ac4'`, the diff tool wired
(`--phase17`). It is the FIRST baseline carrying the androecium's own block-23 rows, so it
is the first that can witness the rod helper's extraction on every future tree. The tag
`frozen/phase17` is published from `main` after the merge by dispatching the
bloom-frozen-tags workflow (red by design on the phase5 refusal), verified with
`git ls-remote`.

## The retention close — the newest baseline plus the live partition

TBD_RETENTION

## The evidence

- **Smoke subset with the flood fill** (`node tools/bloom-smoke.mjs --conn`, required while a
  new geometry mode's assertions were being established): **39 of 528 rows over 20 blocks —
  export gate PASS, 39/39 watertight, 39/39 identical live and export triangle counts, 39/39
  no degenerate triangles, 4 CROWDED (a flag), 391 s; connectedness PASS, 39/39 one connected
  body, 418 s.** The four gynoecium rows: the style alone 11,040 triangles (539 KiB), the
  style among six 14,400 (703 KiB), six at curl 180 beside the style 14,400, the WHOLE
  centre at maximum under SPHERE 16,608 — the bare sphere's own count. The first smoke run
  was the quoted one; no defect was found by it.
- **JG1–JG4 on the real rows: green; on the mutants: each fired first** — the table above,
  eight mutants, every run through the real export gate with `--only` on one row.
- **Panel gate:** TBD_PANEL
- **Numbers.** The default bloom is unchanged at **10,080 triangles** live and export alike.
  A style is **960 triangles**, fixed: the rod's 360 plus three lobes at 200. The style alone
  is 11,040; the style among six stamens 14,400; the style through the 120-stamen cushion
  78,240 flat. Style 1.20 mm across, the lobes 1.92 × 4.80 mm at the shipping sheet; 1.00 mm
  and 1.60 × 4.00 at the export floor.
- **The live matrix is 528 rows** (507 + block 24's 21); the smoke subset 39 over 20 blocks,
  its drift guard green.
- **The untouched manifest:** TBD_MANIFEST
- **The full matrix on both STL gates runs in CI on the PR head** — the merge criterion, not
  run locally (session 17's ruling).
- **The sheet:** TBD_SHEET

## THE PROPOSAL — moving the shipping default to a present centre (NOT done; her ruling)

The brief: propose it with numbers as its own partition event and stop. The candidate default
is the six-stamen ring with the style (the "both" cell of the sheet's first row); any other
present state partitions identically, because the count below is about which rows PIN a
centre control, not what value they pin.

- **The live matrix (528 rows):** 42 HOLD (the 21 block-24 rows that pin `gynoecium`, and the
  24 SPHERE rows where a present centre is hidden and inert — 3 overlap), **486 MOVE**. With a
  stamen default too, the 36 rows pinning `stamenCount` hold as well: 486 → 464 movers.
- **The frozen suite (4,984 rows over 16 baselines):** 63 HOLD (the SPHERE rows), **4,921
  MOVE** — no frozen row pins `gynoecium`, because the control did not exist. That is the
  session-20 shape (509 of 527 moved) across the whole suite at once.
- **The construction that would make it exact rather than a 0-moved claim:** every moved
  row's export on the new tree is bit-identical to the same row on the OLD tree with
  `gynoecium=STYLE` (and the stamen values) `--override`d — the retirement mode's three-
  capture shape in `tools/diff-bloom-bytes.mjs`, predeclared with its vacuity guards, on the
  newest baseline; the byte argument is that the centre is closed solids appended after the
  hub, touching neither `footRing()`'s rings nor a petal nor the hub.
- **What it costs and what it changes:** +960 triangles on every default export (+3,360 more
  with six stamens); the bare-apex state loses its "default is coverage" status and needs
  explicit rows by name (the harness's own note at block 23's head says exactly this); and
  every preset-to-be inherits a centre. **Her ruling; nothing moved here.**

## What this session predeclared it would not touch

TBD_MANIFEST_PARA

## The sheet — `node tools/shot-bloom-gynoecium.mjs <dir>`

TBD_SHEET_PARA
