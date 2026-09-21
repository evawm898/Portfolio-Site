# The centre panel reorganisation, session 23 — CENTER as a container, the kept clause, the cap on the control, the filament-against-style flag; 0 moved

Session 23 is a panel session on the centre, building on a8a22f2 (the gynoecium) and
fd291b4 (its rulings). Four things, none of them geometry: a **CENTER section directly
below HEAD holding ANDROECIUM and GYNOECIUM as nested drop-downs** (a container, not a
control — no value, no NONE); the two parts' read-outs **saying plainly that turning a part
off keeps its settings**, with the kept values printed; the stamen spread's **dead travel
shown on the control itself** — the owner's saturation drawn as a mark on the slider's
track and named in its read-out, the range untouched; and the **FILAMENT-AGAINST-STYLE
flag on the STAMENS line**, B2b's family, the instrument Eva's Sep 6 ruling on the ±180
curl range named as what closes that question. **0 moved, by construction and measured**:
the two guarantees are stated apart below, the way the Head section move (session 18) did.
**No new frozen phase is owed** — the row set is unchanged and no byte moved, which is a
different case from the last three sessions (each of which added rows).

Everything below is the LIVE reading unless it says export.

## The rulings this implements (Eva, the session-23 brief, carried — not re-derived)

1. **A CENTER section directly below HEAD**, ANDROECIUM and GYNOECIUM nested inside it.
   They sat at top level beside PETAL SHAPE as though peers of the petals; they are parts of
   one thing.
2. **CENTER IS A CONTAINER, NOT A CONTROL.** No value, no NONE. "No centre" is both parts
   off, already reachable; a NONE on the container would be a second definition of one state
   — the registration failure this project has cleaned up twice. The nested-section logic
   CAN hide an empty parent (re-established from source, below), so nothing had to be
   proposed or invented.
3. **The read-out says that turning a part off preserves its settings.** Count 0 / NONE
   hides the sub-controls and makes them inert; their values are kept and return. Not a
   mute — a visible control that does not build is the mirror of the defect the panel gate
   catches, so the sub-controls stay hidden AND inert.
4. **The radius slider's dead travel is shown on the control, its meaning unchanged.** The
   range is NOT narrowed (the saturation is 13.7x at one stamen and 123x on the largest hub —
   no static range is dead-free) and the maximum is NOT adaptive (a stored value that meant a
   different radius on a different hub would break saved designs).
5. **The filament-against-style flag**, on the STAMENS line, never a gate.
6. **0 moved, provable by construction**, asserted across the full matrix, the two
   guarantees stated separately; the untouched list predeclared and verified by diff on the
   FINAL tree; iterate on the smoke subset export-only; one push, docs folded in; stop at the
   sheet.

## Re-established from source before anything was edited

- **The registry's section list and order** (`SECTIONS` in `bloom-registry.js`, at
  fd291b4): arrangement, head, shape, form, curl, thickness, roles, labellumGroup ‹roles›,
  hoodGroup ‹roles›, petal1–petal9 ‹roles›, androecium, gynoecium — the last two at TOP
  LEVEL and LAST, "on purpose: the generator renders a parent's nested drop-downs directly
  after it, and the panel gate's census compares the DOM order against this array".
- **The two sections and their predicates.** ANDROECIUM: `stamenCount` (0–120, default 0)
  visible on `androeciumEligible` (= not `sphereMode`), four sub-controls on
  `androeciumPresent` (eligible ∧ count ≥ 1). GYNOECIUM: `gynoecium` (NONE / STYLE, default
  NONE) on `gynoeciumEligible`, two sub-controls on `gynoeciumPresent`. Two eligibility
  predicates, not one shared, because each part is independently present or absent (Sep 5).
- **The app's read-out builder** (`summarise()` in `bloom.js`): `stamenLine()` — the count,
  layout, radius against the reference with the `(CLAMPED at the hub radius … ; N.NNx is as
  far as this hub goes, the slider above it is dead here)` clause, the filament and the pill,
  the petal-root annulus flag, ROOTS FUSE / ANTHERS TOUCH from `stamenNearest`, the spine
  floor — then `styleLine()`, then `slendernessLine()`. Every number the owner's or the
  builder's, never re-derived. The per-control read-out spans are `refreshLabels()`, from
  each row's `fmt(v, ui)`, called from `regenerate()` BEFORE the build.
- **The panel gate's routes** (`tools/verify-bloom-panel.mjs`): (a) the render census, (c)
  the accordion, (d) visibility transitions, (f) combined eligibility, (e) the spiral flag,
  (b) the path route through a collapsed section with a per-section WITNESS table, then
  (g)–(p): the derived label, the caption, the print preview, the inner-ring line, the dome,
  the curl family, the sphere, the retirement, the androecium, the gynoecium — fourteen
  routes, every one required to fire under `--negative-control`. **Nested-section handling:**
  the census compares `querySelectorAll('details')` document order against `SECTIONS`; a
  section's hidden state is predicted as "every control in it hidden AND every child section
  hidden AND every caption it holds hidden" (`wantSectionHidden`), children first; the
  accordion route walks ancestors; the path route requires the witness control to declare
  the section it witnesses (`c.section !== s.id` → fail) — which a parent with NO controls of
  its own cannot satisfy; and route (n)(i) asserted "there is no `#sec-center`".
- **Whether hiding all of a parent's children hides the parent: YES.** `applyVisibility()`
  in `bloom.js` walks `SECTIONS` backwards (children settle first) and sets
  `sectionEls[s.id].hidden = noControls && noKids && noWhy`; a parent holding only child
  sections has `noControls` vacuously true, so it is hidden exactly when every child is
  (and no caption is showing). "Petal roles" is that shape already. The registry's own
  header states the rule: "a section is hidden when, and only when, every control in it is
  hidden — derived … it adds no declaration and cannot disagree with one". Measured this
  session under SPHERE: `#sec-center` hidden with both parts hidden; shown at every cap
  state. So item 2's "if the nested-section logic cannot hide an empty parent, say so" is
  answered: it can, and does, by the rule that already existed.

## What was built

- **Registry (`bloom-registry.js`).** `{ id: 'center', label: 'Center', open: false }`
  directly after `head`, with `androecium` and `gynoecium` declared immediately after it,
  each with `parent: 'center'`; the two old top-level rows removed; the session-20 "no
  center section" note superseded in place. The session-21 census rule (children directly
  after their parent) carried into the container's note. `stamenCount`'s `fmt` at 0 and
  `gynoecium`'s at NONE print the KEPT clause with the state's own values (`none — its
  settings are kept (ring, spread 2.00x, 20 mm, curl 0°) and return with the count`; `none —
  its settings are kept (25 mm, curl 0°) and return with the style`); the layout word is the
  stored value's own, lowercased — no second owner of a name. `stamenSpread`'s `fmt` takes a
  THIRD argument, the SHOWN build's record, and prints the owner's cap (`… this hub saturates
  at 5.61x (live), the mark on the slider` / `… CLAMPED at 1.25x (live), as far as this hub
  goes; the travel above the mark is dead` / `ON THE AXIS` / `no dead travel on this hub`);
  the row declares `cap: (shown) => shown.androecium?.saturation ?? null` — WHERE the number
  lives, so the app can draw it. `STAMEN_SPREAD_MAX` (6) is one owner for the range top and
  the read-out's "within reach" test. The `fmt(v, ui, shown)` contract is stated in the file
  header.
- **App (`bloom.js`).** `refreshLabels(ui, shown)` hands the third argument through and is
  now called AFTER `buildGeometry()` in `regenerate()` (it used to run before; the same
  thing while no span read a built number). `applyCaps(shown)` — the ONE writer of the cap
  mark: for a row declaring `cap`, the class `bl-ctrl--capped`, `data-cap` (the number) and
  `--bl-cap` (the number as a fraction of the row's own range) on the wrapper, or all three
  removed when the owner has no number or the cap is at or past the range top. The STAMENS
  line's new clause: `· nearest filament to the style 0.05 mm at 8.7 mm up (FILAMENT AGAINST
  STYLE: under 1.20 mm, the two tubes cross — a flag, never a refusal)` / `(clear of it by
  more than 1.20 mm)`, present iff both parts are built. `__bloomMetrics().filamentStyle`.
- **Geometry (`bloom-geometry.js`) — telemetry only, the emission untouched.**
  `buildStamenInto` and `buildStyleInto` return `stations` (the rod's ring centres as
  emitted, inner root to tip); `buildBloomInto` computes `filamentStyle` AFTER every solid
  is emitted: the nearest approach of any filament's FREE station (the outer root surface
  and the 16 stations above it; the root inside the slab excluded, since on the on-axis
  corner every root shares the slab and that is told already) to the style's centreline
  BELOW THE STIGMA (its stations outer root to tip, as segments), against one filament
  radius plus one style radius; null unless both parts are built. Point-to-segment over
  6 × 17 × 17 pairs at six stamens, 120 × 17 × 17 at the disc — trivial. Nothing geometric
  reads it, and the byte diffs below are what say so.
- **CSS (`bloom.css`).** `.bl-ctrl--capped::after` — a tick and a hatched band from
  `calc(8px + var(--bl-cap) * (100% − 16px))` to the track's right edge (Chromium's 16 px
  thumb travels from 8 px to width − 8 px), pointer-events off, light enough that a thumb in
  the dead zone shows through.
- **The panel gate.** Route (q) in the header, folded into routes (o) and (p): the container
  hidden iff both parts are (both directions: SPHERE and back); the kept clause on each
  part's span with the state's values exactly when the part is off and never when on; the
  cap mark at the owner's saturation exactly when it is inside the range (six on a ring:
  5.61x, marked; 120 on the disc: 1.25x, marked, CLAMPED; one stamen: 13.74x, past the
  range, no mark; the part off: no mark) and the span naming the same number; the
  filament-against-style clause present iff both parts are built, its distance and height
  equal to the builder's record, the flag iff the record says crossing (six straight beside
  the style: 2.94 mm, clear; six at curl 90: 0.05 mm at 8.7 mm up, the flag; the style off:
  no clause). The path route now admits a CHILD'S control as the witness for a section that
  holds no controls of its own, and only then — `center` is witnessed by `stamenCount`
  driven through the shut container and the shut drop-down. Route (n)(i) now reads "the
  `#sec-center` container holds NO control of its own" (what it guards is a resurrected
  RIG, and a rig is a control inside the section); its negative control injects a
  `centerStyle` input INTO the real container. The negative control also freezes the
  container's `hidden`, both spans and the spread wrapper's mark, and the tally requires
  all five clauses to have fired beside the fourteen routes.
- **The sheet (`tools/shot-bloom-panel.mjs <dir> [base-tree]`).** A fifth sheet,
  `panel-centre.png`: BEFORE / AFTER pairs rendered from a git worktree of fd291b4 against
  this tree, the same driven state on both — first load; the androecium opened; the
  gynoecium opened; a part turned OFF with its settings moved off their defaults (the kept
  clause); the 120-disc spread (the cap mark, CLAMPED); six on a ring at 5.80x (the thumb in
  the dead zone); the STAMENS line at curl 90 beside the style (the flag) and straight
  (clear). The read-out lines ride in every caption. Without a base tree the sheet is not
  produced and the run says so.

## The two guarantees, stated apart (the Head move's form, session 18)

1. **The geometry guarantee.** No emitted triangle changed: the only edits to
   `bloom-geometry.js` are two record fields (`stations`, read back from the rings the rod
   was already revolved through) and a distance computed after the last solid is emitted.
   Measured on the retention ruling's terms (the newest frozen baseline plus the live
   partition), a worktree of fd291b4 against the branch head, the same box, the same run:
   **phase17 (507 rows frozen at 6335ac4): **507/507 bit-identical, 0 moved, defaults bit-identical** (`--compare`; the base reads `fd291b4+dirty` from the gitignored node_modules symlink, the head `dcd552d+dirty` from the then-uncommitted docs, nothing else); the live matrix (528 rows):
   **528/528 bit-identical, 0 moved, defaults bit-identical** — the same 528 rows on both trees, no row added, no row absent**.
2. **The UI move.** `section` and `parent` are presentation fields the registry never
   persists and no geometry reads; every control id, law, predicate, default and option is
   unchanged, so no row's set and no predicate's value moved — session 16's PETAL FORM /
   PETAL CURL split and session 18's Head move, the same argument. The panel gate's census
   proves every control renders once in its declared section in registry order, and the
   path route proves the parts still react from inside the shut container.

## The flag, in numbers — the emitted stations against session 22's law table

Session 22 measured the crossing from `spineLaw()` directly (20 mm filaments, tilt 0, the
style 25 mm on the axis, six on the shipping 2.94 mm ring). This instrument reads the
BUILDER'S stations (16 rows per filament), so it samples the same curve more coarsely:

| six on the shipping ring, with the style | curl 0 | 20 | 90 |
|---|---|---|---|
| session 22, from the law: nearest approach to the axis, mm | — | 0.00 | 0.05 |
| … at height, mm | — | 18.7 | 8.7 |
| this instrument, from the stations: nearest filament to the style, mm | 2.94 | 0.10 | 0.05 |
| … at height, mm | 0.6 | 19.0 | 8.7 |
| flag (under 1.20 mm) | clear | FILAMENT AGAINST STYLE | FILAMENT AGAINST STYLE |

The straight case is the ring radius, as it must be. **One thing the instrument sees that
the law table did not ask about:** on the VOGEL DISC the innermost stamen stands at
R √(0.5 / N) — 0.53 mm from the axis at 120 on the clamped 8.24 mm disc, 0.85 mm at one
stamen — so with a style present the flag fires at the ROOT (0.6 mm up), straight, at any
count where that radius is under 1.20 mm. A true intersection of two closed tubes, told;
the ring layout never does it. Recorded here, not tuned around: it is what a disc with a
style is.

## The cap, in numbers — and a premise not reproduced

`saturation = (hub − r) / (r √N)`, footRing()'s own, on the shipping hub (8.84 mm live,
r = 0.60): six on a ring **5.61x** (inside the 6.00 range — marked, the top 0.39 of the
travel dead); 120 on the disc **1.25x** (marked low on the track; 2.00x asked is CLAMPED);
one stamen **13.74x** (past the range — no mark, "no dead travel on this hub"). **The brief's
"saturates at 1.77x on the shipping hub" was not reproduced** at any shipping-default state
tried, and the figure appears nowhere in the record; it is a premise, not a specification,
and the instrument prints whatever the owner says on whatever hub is in front of it, which
is what the brief asked for.

**THE CORRECTION, RECORDED (Eva, Sep 6, at the close).** The 1.77x figure in the brief came
from a read-out in a screenshot of ONE configuration and was wrongly described as the
shipping hub's. It is in no record and is not the shipping hub's number. The real readings
are this session's, on the shipping 8.84 mm hub, live: **5.61x at six on a ring, 1.25x at 120
on the disc, 13.74x at one stamen.** Written down so nobody inherits the wrong number: a
saturation quoted without its count, its layout and its hub is not a number.

## Verification

- **Panel gate:** PASS, 159 assertions (21 sections, 87 controls, 5 retired ids). The path route drives `stamenCount` 0 → 6 through the SHUT container and the shut Androecium drop-down (free ends 0 → 6, the owner's disc radius none → 2.939388 mm, both sections still closed). Route (o) in both directions: the container shown at every cap state and hidden under SPHERE (and back); the kept clause on the count at 0 and absent at 1 / 6 / 120; the cap marked at 5.61x (six on a ring), 1.25x (120 on the disc, CLAMPED), 5.20x (six on a ring under CONTINUOUS), absent at one stamen (13.74x, past the range) and absent with the part off; the flag clause absent without a style, clear at 2.94 mm beside six straight, FILAMENT AGAINST STYLE at 0.05 mm at 8.7 mm up at curl 90, gone with the style. Route (p): the container both ways, the kept clause on the style at NONE (25 mm, 0° at the default; 40 mm, 180° with the sub-controls at maximum) and absent with a style. Route (r): the builder reports 0.049 mm against 1.20, the clause is on the line and the flag is on it. Route (n): five retired ids absent everywhere, the container holds no control of its own.
- **Negative control:** PASS — 1,500 deliberate breaks caught, **all fifteen routes and session 23's four clauses observed the failure they exist to catch**. The first negative run came back INCOMPLETE on exactly one witness — the flag — because route (o)'s frozen read-out makes the clause absent before the flag test is reached; route (r) (a fresh page whose setter rewrites only the flag away) is the fix, and it fires: `[flag]: the FILAMENT AGAINST STYLE flag is absent while the owner reports a crossing (0.049 mm against 1.20)`. The container witness: `[stamens] CONTINUOUS x SPHERE x count 0: the Center container is shown while both parts are hidden (SPHERE)`. The kept clauses: `the kept clause is shown at 6 stamens` and `names (ring, 2.00x, 20 mm, 0°) while the state holds (disc, 6.00x, 40 mm, 180°)`; `names (25 mm, 0°) while the state holds (40 mm, 180°)`. The cap: `the cap mark is absent (class false, data-cap null, --bl-cap null) while the owner saturates at 1.25x against a range top of 6`. The rig: `retired id(s) still render in the panel: centerStyle; the Center container holds control(s) of its own: centerStyle`.
- **Smoke subset, export-only** (`node tools/bloom-smoke.mjs` — no new geometry mode, so
  `--conn` is not owed): clean — 39/39 rows watertight (boundary 0), 39/39 identical live and export triangle counts, 39/39 no degenerate triangles, every assertion family green (J1–J9, Z1–Z9, C1–C3, JS0–JS4, JG0–JG4, R1–R5), 4 rows CROWDED (a flag), 6 SPHERE rows a labelled coverage skip; 341 s on this box under a byte capture's load, timing anecdotal. NOT a matrix pass — the full 528 rows on both gates in CI is the merge criterion.
- **Byte diffs** (`tools/diff-bloom-bytes.mjs`, a plain capture per tree, `--compare`):
  phase17 **507/507 bit-identical, 0 moved, defaults bit-identical** (`--compare`; the base reads `fd291b4+dirty` from the gitignored node_modules symlink, the head `dcd552d+dirty` from the then-uncommitted docs, nothing else); the live matrix **528/528 bit-identical, 0 moved, defaults bit-identical** — the same 528 rows on both trees, no row added, no row absent.
- **The predeclared untouched manifest**, taken at fd291b4 before any edit and re-verified
  on the FINAL tree: **375 of 375 held** (`sha1sum -c`, after the last edit).

## Is a new frozen phase owed? NO

The rule as the last three sessions applied it: a frozen phase is owed when the ROW SET
changes (session 20: 527 → 509 + retirement; session 21: 481 → 507; session 22: 507 → 528),
and is NOT owed when no row's set and no byte moved (sessions 18/19: "phase14 stays the
newest baseline"). This session adds no matrix row — the flag is asserted in the panel gate
on one page, in both directions, on the ROOTS FUSE pattern rather than as a matrix row —
so the live matrix is the same 528 rows and every byte is unchanged. **phase17 stays the
newest baseline; nothing is frozen and no tag is owed.**

## What this session predeclared it would not touch

A sha1 manifest of 375 files taken from the working tree at fd291b4 before any
edit — every tracked file except the nine predeclared MOVERS: `bloom-registry.js`,
`bloom.js`, `bloom-geometry.js`, `bloom.css`, `tools/verify-bloom-panel.mjs`,
`tools/shot-bloom-panel.mjs`, `CLAUDE.md`, `docs/bloom-charter.md`, and this document. In
the untouched set, by name: every `flower*` file and gate, cards, the tracker, print, every
workflow, `bloom.html`, `bloom-view-presets.js`, `tools/bloom-harness.mjs` (no matrix row,
no assertion family — the flag is a read-out, never a gate), BOTH STL gates, both coverage
instruments, `tools/bloom-crowding.mjs`, the smoke tool, `tools/diff-bloom-bytes.mjs` (no
new phase to wire), every other shot tool, `tools/chromium-harness.mjs`, the frozen-tag
script. Verified on the FINAL tree, after the last edit: **375 of 375 held** (`sha1sum -c`, after the last edit).

## Loose threads, stated

- **B2b's other instruments stay parked**: the crowding-raster extensions, the
  anther-against-blade instrument and the independent splay. This session built exactly the
  one flag the Sep 6 ruling named.
- **AN OPEN PLACEMENT QUESTION, NOT A DEFECT (Eva's ruling, Sep 6):** the Vogel disc's
  innermost stamen stands at R √(0.5 / N) from the axis — 0.53 mm at 120 on the clamped
  8.24 mm disc — and is therefore INSIDE the style's tube whenever a style is present (the
  crossing threshold is one filament plus one style radius, 1.20 mm at the shipping sheet).
  The disc law has no inner limit. The candidates are starting the spiral's index past zero,
  or flooring the radius; **that is the next session's question, not this one's**, and nothing
  here was tuned around it. The flag is what makes it visible, on every disc with a style.
  Overlapping closed solids are legal, so no gate sees it and none should.
- **`fmt`'s third argument exists for one row.** If a second read-out ever needs an owner's
  number the contract is already there; if none ever does, it is one argument, not a
  mechanism.

## The ruling (Eva, Sep 6, from the sheet)

- **The sheet approved; #169 merged as built.**
- The two records above (the 1.77x correction; the disc's innermost stamen as an open
  placement question) are hers, written down at the close.

## The close (Sep 6)

- The four bloom gates confirmed green on the PR head `73b4fea` by the session before the
  merge: bloom-export-watertight and bloom-connectedness on the full 528-row matrix,
  bloom-panel, bloom-frozen-matrices. The two flower gates (flower-export-watertight,
  flower-geometry-quality) ran on the `tools/**` filter and passed, and are not bloom
  evidence.
- #169 undrafted first (GitHub refuses to merge a draft), then merged by the session (squash)
  with the head sha read from the remote (`git ls-remote`, `73b4fea`), as
  **`00dc4b2`**, the merge sha read back from `main` on the remote.
- **No frozen tag is owed and none was published**: no row added, no byte moved; phase17
  stays the newest baseline. Stated, not left silent.
- The predeclared 375-file manifest re-verified against merged `main`: **375 of 375 held** (`sha1sum -c` on a worktree of `00dc4b2`); the nine files `main` moved since fd291b4 are exactly this session's nine predeclared movers, and no print file landed from another PR — `main` had not moved between fd291b4 and this merge.
- The ruling and this close recorded in the docs-only PR, opened from a fresh branch off
  `main` and merged by the session before reporting DONE.

## The sheet — `node tools/shot-bloom-panel.mjs <dir> <base-tree>`

Five sheets from one run against a worktree of fd291b4 (`panel-grouping`, `panel-numbering`,
`panel-accordion`, `panel-reactivity` — the existing four, now with a "Center" cell and the
two parts photographed inside it — and the new `panel-centre.png`, eight BEFORE / AFTER
pairs, 662 × 12,609 px). First load: 679 px; worst-case panel (Petal 3 inside Petal roles)
1,184 px — the container adds no height a visitor meets. What the pairs show, read from the
run: at first load the BEFORE panel lists Androecium and Gynoecium at top level after Petal
roles, the AFTER panel one Center below Head; opening a part opens Center then the part by
two real clicks, and opening Gynoecium shuts Androecium inside Center; with six on the disc
at 3.00x / 30 mm / curl 45 and the count set back to 0, BEFORE reads `none — the apex is bare`
and AFTER `none — its settings are kept (disc, spread 3.00x, 30 mm, curl 45°) and return with
the count` (the style: `(35 mm, curl 60°) … return with the style`); on the 120-disc the
AFTER slider carries the tick at 1.25x with the travel to its right hatched and the thumb at
2.00 inside it, the read-out `2.00x asked — CLAMPED at 1.25x (live), as far as this hub goes;
the travel above the mark is dead` — BEFORE says `2.00x the reference — out to the hub
radius` and only the STAMENS line below the buttons confessed the clamp; six on a ring at
5.80x reads CLAMPED at 5.61x with the thumb over the mark; and the STAMENS line at curl 90
beside the style ends `nearest filament to the style 0.05 mm at 8.7 mm up (FILAMENT AGAINST
STYLE: under 1.20 mm, the two tubes cross — a flag, never a refusal)` on AFTER and nothing on
BEFORE, six straight ending `2.94 mm at 0.6 mm up (clear of it by more than 1.20 mm)`. The
sheet's drive step now waits on the app's own build signal (`settleBuild`) rather than a
fixed delay, so a cell cannot be captioned with the previous build's read-out on a loaded box.
