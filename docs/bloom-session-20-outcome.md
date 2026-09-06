# The centre retirement, session 20 (phase 2, B1) — DISC, DOME, RING and the CENTER section retired; the default is a bare apex; the comparison shape written before it ran

Session 20 is B1 of phase 2 and nothing else: the four `centerStyle` values and the
CENTER section retired, the shipping default moved from DISC to the bare hub apex, the
five control ids reserved in `RETIRED_IDS`, the load-time collision check grown to the
flower's full set, the three centre builders deleted, the harness, gates, tools and
sheets brought along, and `phase15Matrix()` — the 527 rows as they stood at `8524318`,
the head of `main` when the session opened — frozen as the newest baseline. No
androecium: that is B2, and its anthers and stigmas are ruled from Phase A's sheet
before it opens.

Everything below is the EXPORT reading unless it says live.

## What was on `main` when the session opened — confirmed from source, not the brief

`8524318` (#159). Registry default `centerStyle: 'DISC'` (`bloom-registry.js:1889`), so
the read-out's summary line printed `center disc` on the shipping default
(`bloom.js:873`); four sub-controls (`centerSize` for all three styles, `centerRise` /
`centerDish` / `centerBore` per style); `buildCenterInto()` with `domeInto` / `discInto` /
`torusInto` (1,728 / 1,056 / 2,304 triangles); `RETIRED_IDS` empty with one load-time
check (a retired id may not be a live control). The retirement's own scope, counted by
enumerating every matrix function through the harness rather than from the labels: 527
live rows, of which 509 resolve to DISC, DOME or RING and 18 to NONE.

## Rulings this session implements (Eva, Sep 5, from Phase A)

- **Retire all three, and the section with them.** RING goes with DISC and DOME: a ring
  at the centre is a corona, and what shipped was `torusInto` with a bore slider — a
  placeholder. A corona is a flared collar between the petals and the stamens, its own
  group with its own controls; it does not grow out of a torus. The NAME is reserved and
  the intent recorded in the charter so the idea survives without the object.
- **`centerStyle` becomes single-valued**, so CENTER does not exist until the androecium
  lands: the section is retired, not only its values.
- **The default becomes a bare apex.** Eva looked at the bare hub apex and ruled it needs
  no lid (Phase A ruling 2).
- **B1 alone.** The androecium (Q1's range control, Q3's curved rods, Q7's slenderness
  line, Q8's crowding flags) is B2 and starts after the anther and stigma are ruled.

## THE PREDECLARED PARTITION — written before any export ran

The retirement is a ruled aesthetic change and it moves the default, so the honest close
is an exact partition, predeclared, not a 0-moved claim. Counted from the matrix
functions themselves (rows that PIN a centre value and rows that INHERIT the default,
separately):

| matrix | rows | resolve DISC | DOME | RING | NONE | predicted MOVE | predicted HOLD |
|---|---|---|---|---|---|---|---|
| `phase15Matrix()` — the 527 live rows at 8524318, now frozen | 527 | 487 (15 pin, 472 inherit) | 11 | 11 | 18 | **509** | **18** |
| `phase14Matrix()` (499 at 5312845) | 499 | 462 | 10 | 10 | 17 | 482 | 17 |

The stronger claim, and the one the close asserts row by row: **every moved row's export
on the new tree is BIT-IDENTICAL to the same row's export on the OLD tree with
`centerStyle` forced to NONE** — because the centre was one closed solid appended after
the hub, touching neither `footRing()` nor a petal nor the hub, and removing it can only
remove its own triangles. The 18 NONE rows are bit-identical across the trees outright.

## THE COMPARISON SHAPE — stated before running it, with what would make it vacuous

A moved row cannot be re-exported on the new tree as written: its `set` names
`centerStyle` (and possibly `centerSize` / `centerRise` / `centerDish` / `centerBore`),
which the new registry does not declare, so `applyConfig`'s read-back refuses it by
design. The close therefore runs THREE exports of the same 527 rows and compares them
by label:

1. **OLD tree, plain** (`--phase15 --root <worktree of 8524318>`): sha_old(R) for every
   row, with each row's resolved `centerStyle` recorded from the app's own state.
2. **OLD tree, TWINNED** (`--phase15 --root <the same worktree> --override centerStyle=NONE`):
   every row exported with `centerStyle` forced to NONE on top of its own set — the
   centre-off twin, built by the OLD code. sha_twin(R).
3. **NEW tree, STRIPPED** (`--phase15 --root <this tree> --strip centerStyle,centerSize,centerRise,centerDish,centerBore`):
   every row exported with the retired ids removed from its set. sha_new(R).

The claim is `sha_twin(R) === sha_new(R)` for all 527 rows. `--compare <twin> <new>
--retirement <plain>` asserts it, and asserts the five things that would otherwise let
it pass by comparing nothing:

- **V1 — the twin actually removed a centre.** For every row the plain run resolves to
  DISC / DOME / RING, `sha_old(R) !== sha_twin(R)` and `tris_old(R) > tris_twin(R)`. A
  twin equal to its original on a mover means the override never reached the geometry,
  and the whole comparison would then be old-versus-old.
- **V2 — the twin changed nothing where there was nothing to change.** For every NONE
  row, `sha_old(R) === sha_twin(R)`.
- **V3 — the strip removed exactly the retired ids and nothing live.** The strip list must
  equal `RETIRED_IDS` of the tool's own registry, and no stripped id may be a live
  control there; a row whose set became empty by stripping is reported by name (it
  builds the new default, which IS the claim, but it must be visible that it does).
- **V4 — the partition is the predeclared one.** Movers (from the plain run's resolved
  values) must number 509 and holders 18, and the compare refuses any other count unless
  told otherwise on the command line.
- **V5 — the three runs are three different things.** Same 527 labels in the same order
  in all three; runs 1 and 2 record the same head with different override records; run
  3 records a different head; every row present in all three (a missing row fails the
  run, never a skip).

What this still cannot say: that the bare apex is the RIGHT default. That is the sheet's
job, and Eva's.

## What this session predeclared it would not touch

A sha1 manifest of 68 files taken from the working tree at `8524318` before any edit:
every `flower*` file and flower gate, `tools/chromium-harness.mjs`, cards, the tracker,
print, every workflow, `bloom.html`, `bloom.css`, `bloom-view-presets.js`,
`tools/bloom-crowding.mjs`, `tools/verify-bloom-export.mjs`,
`tools/verify-bloom-connectedness.mjs`, `tools/publish-frozen-tags.sh`, and the eleven
shot tools that never read the centre. Verified by `sha1sum -c` at close, and again
against `main` after the merge. The fourteen older frozen matrix functions
(legacy, phase2–phase14) and `FROZEN_BASE_COMMITS`'s thirteen older entries are proved
deep-equal to the base tree's by a JSON comparison of their output (sha1 `7fc68fffcb` on
both trees).

## What was built

- **Registry.** The CENTER section and the five controls are gone; `RETIRED_IDS` carries its
  first five entries (`centerStyle`, `centerSize`, `centerRise`, `centerDish`, `centerBore`),
  each with `retiredAt: 20` (the session — the bloom has no schema version to key to, and
  `schema: null` says so rather than borrowing the flower's field for a number that would
  mean something else) and a `why`. `verifySections()` grew the flower's load-time set: an
  entry needs an id, an integer session, a stated `schema` and a why of some length; a
  retired id may not be a live control id, an option value of any live choice, a DEFAULTS
  key or a section id. Measured on three throwaway registries in Node: a `centerSize` slider,
  a `centerDish` option on `placement` and a `centerRise` section are each caught at module
  load by name. The option values DOME / DISC / RING are not reserved, on the flower's own
  `reliefMode` precedent.
- **Geometry.** `buildCenterInto()`, `domeInto`, `discInto`, `torusInto` and their four
  constants deleted (lines 3697–3900 of the base), a retirement note in their place;
  `buildBloomInto()` returns no `center`. `footRing()`, `buildPetalInto()` and
  `buildHubInto()` are untouched by construction — the default builds 10,080 export
  triangles (192 hub) where the base built 11,136 (1,056 of them the DISC).
- **App.** `seatLine()`, `lastCenter` and the metrics keys `centerStyle` / `centerTris` /
  `centerSeat` are gone; the read-out's summary line no longer prints `center <style>`.
- **Harness.** Blocks 2 and 3 and block 4's `× STYLE` corners retired; `ALL MIN (centre off)`
  / `ALL MAX (centre off)` are `ALL MIN` / `ALL MAX`; every other "(centre off)" row was
  relabelled where it was the only row carrying its state and dropped where the retirement
  made it a duplicate of a plain row (the CONT and DEPTH bare rows duplicated `CONTINUOUS x 3
  turns` and `layerCount max (6)` by set). The live matrix is 481 rows (527 before).
  `phase15Matrix()` — the 527 rows at 8524318, generated from that commit's own
  `buildMatrix()` — is the fifteenth frozen baseline, `FROZEN_BASE_COMMITS.phase15 =
  '8524318'`, `--verify-frozen --phase15` PASS against a worktree of 8524318 and
  `--phase14` still PASS against 5312845.
- **Gates.** The panel gate's CENTER witness (`centerStyle` → RING, read as
  `centerStyle/centerTris`) is REPLACED by route (n), the retirement route: no retired id
  renders, no `#sec-center`, the summary line names no centre, `__bloomMetrics()` carries no
  centre key, and no executable bloom source references a retired id as an identifier
  (31 files scanned; comments and string literals stripped, so the frozen matrices' row data
  is exempt). Its negative control resurrects a `#sec-center` with a `centerStyle` input and
  writes `center disc` onto the read-out; twelve routes must fire. Route (k) lost its seat
  clauses and its RING row. The smoke subset lost blocks 2 and 3 and its block-4 anchor
  became `ALL MIN`; `--check` reports 31 rows over 18 blocks of 481.
- **Tools and sheets.** `tools/diff-bloom-bytes.mjs` gained `--phase15`, `--only`,
  `--override`, `--strip` (refusing a live id) and the `--retirement` compare mode with
  V1–V5. The dome sheet lost its centre-seat views and cells (section 5 says so), the sphere
  and curl sheets their seat fields, the panel sheet its gated-centre row, the dome-lean
  sheet's `EVA_CONFIG` its `centerStyle` key; `shot-bloom.mjs` (the A/B rig's own sheet) is
  now spread × count on the bare apex. The plan and solid-angle coverage tools no longer build
  a centre into their hub-only accumulator; the solid-angle instrument's DISC plate line is
  absent rather than a number under a label naming nothing.
- **New:** `tools/shot-bloom-centre-retirement.mjs <dir> [base-tree]` — the sheet the merge
  waits on.

## TWO BUGS THE CLOSE FOUND, AND WHAT EACH WOULD HAVE LET THROUGH

Both were found by the instruments' own validity checks firing on the first run, and both
are load-bearing — a session that inherited either would have shipped a pass that measured
nothing.

1. **`applyConfig` validated a base-tree row against the HEAD registry.** The harness
   compared every set value in the control's declared KIND, and the declaration it read was
   this tree's `CONTROLS` — right whenever the page under test is this tree, and wrong the
   day a base tree declares a control this tree has RETIRED. Every phase15 row naming
   `centerStyle` came back `not a registry control` against the old tree, so the plain and
   twin captures could not be made at all. **What it would have let through:** the tool
   `continue`s past a row whose config did not take and records it as a validity failure —
   so the capture would have ended HARNESS INVALID, which is loud. But the sheet's BEFORE
   cell hit the same wall, and a sheet or a capture written to skip rather than refuse would
   have compared the old tree's NONE rows against the new tree's — 18 of 527 — and called it
   the retention close. The fix is `kindsOf(root)`: a served tree's own registry is the
   declaration for that tree, imported and handed in, never sniffed from the DOM. Every
   existing caller keeps the head's kinds by default.
2. **Route (n)'s read-out clause read line 0, and line 0 is the MODE line.** Since session
   13 the read-out's first line is `on screen: LIVE geometry …` / `on screen: PRINT PREVIEW …`;
   the summary line that carried `center disc` is the SECOND. The retirement sheet's own
   validity check caught it first ("the base tree's read-out does not name its centre — the
   BEFORE cell is not the state it claims") and the same defect was in the gate. **What it
   would have let through:** a `center <style>` word left on the summary line would have
   passed route (n) forever, because the clause was testing a line that never carries it;
   and its negative control, which wrote `center disc` onto line 0, would have kept
   reporting the clause as a witness. Both now find the line that begins `petals`, and the
   route fails if no such line exists — a check that finds nothing to check must say so.

A third, smaller: the checkpointed capture's resume block read `--only` / `--override` /
`--strip` before they were declared — the `const`-hoisting trap the charter records firing
twice on this very tool. Caught on its first run, moved below its readers.

## The evidence

- **The retention close — the three captures and the compare, EXACT.**
  `phase15Matrix()` (527 rows) captured three ways with row-level checkpointing (`--resume`,
  added this session because container restarts killed three background captures; a
  capture now costs one row on interruption, not a run):

  | capture | tree | rows | head / fingerprint |
  |---|---|---|---|
  | plain | worktree of 8524318 | 527 | `8524318+dirty` / `4cfa27b15e1e` |
  | twin, `--override centerStyle=NONE` | the same worktree | 527 | `8524318+dirty` / `4cfa27b15e1e` |
  | stripped, `--strip` of the five retired ids | this tree | 527 | `8524318+dirty` / `bc0c46288cf1` |

  `--compare twin new --retirement plain --expect 509/18`: **PASS — 509 MOVERS, 18 HOLDERS,
  twin === new on 527 of 527 rows, V1 fired 0, V2 fired 0, V3 the strip equal to
  `RETIRED_IDS` with 12 rows whose set became empty (the DOME / DISC / RING sub-control rows
  — they build the new default, named), V4 the predeclared counts, V5 three captures over
  one label list on two fingerprinted trees.** The `head` string could not tell the trees
  apart (both dirty checkouts of 8524318), which is why the compare fingerprints the three
  bloom sources instead; the fingerprint was computed from each capture's recorded root at
  compare time and the output says so, and the tool records it at capture time from now on.
- **The positive control on the comparison, RED THEN GREEN.** Mutant M-LID, a throwaway copy
  of this tree with a closed 12-triangle box on the apex after the hub (geometry at the
  centre no row asked for): the same three captures on six rows (two DISC-inheriting, one
  NONE, one RING, one DISC sub-control, one dome) — **the claim fails on 6 of 6 rows**
  (twin 10,080 triangles against new 10,092 on the default), V1/V2 silent, exit 1. The real
  tree on the same six rows passes. The STL gates would see nothing of M-LID (a closed box
  is watertight and one piece with the hub); the byte comparison is its only witness, which
  is why the close is the comparison and not a gate run.
- **The positive control on route (n), RED THEN GREEN.** Mutant M-REF, `const mutantRef =
  (ui) => ui.centerSize` in the app's `bloom.js`: the panel gate on that tree **fails on
  exactly one assertion** — `[retired]: retired id(s) still referenced as identifiers in
  executable bloom source: bloom.js:103 centerSize` — and passes on this tree (`5 retired ids
  … absent from the DOM, the read-out's summary line, the metrics, and as identifiers in 31
  bloom source files`). The registry's load-time check was probed in Node with three
  throwaway registries (a `centerSize` slider, a `centerDish` option value on `placement`, a
  `centerRise` section id) — each caught at module load by name.
- **Panel gate** PASS on this tree; **`--negative-control` PASS, 1,110 breaks caught, ALL
  TWELVE ROUTES fired**, route (n) on its three DOM / read-out clauses at once.
- **Smoke subset** (`node tools/bloom-smoke.mjs`, export-only — no new geometry mode):
  31 rows over 18 blocks of 481, export gate PASS, 31/31 watertight, 4 CROWDED (a flag),
  25 plan-coverage measured / 6 labelled skips / 1 asserted, 4 SPHERE rows read by the
  solid-angle instrument with 2 asserted, R5 mismatches 0. The `--check` guard: coverage OK
  with blocks 2 and 3 gone.
- **`--verify-frozen --phase15`** PASS against a worktree of 8524318 (527 rows deep-equal to
  that commit's own `buildMatrix()`); **`--phase14`** still PASS against 5312845. The
  fourteen older frozen functions and the thirteen older `FROZEN_BASE_COMMITS` entries
  deep-equal to the base tree's (sha1 `7fc68fffcb` on both).
- **The untouched manifest**: 68 files byte-identical to 8524318 by `sha1sum -c` at close.
- **Numbers.** The default bloom is **10,080 triangles live and export alike** (192 hub);
  it was 11,136 with the DISC. The incurve target at rise 0.50 is 151,776 (was 152,832).
  The live matrix is 481 rows (was 527); phase15 carries the 527.
- **The full matrix on both STL gates runs in CI on the merge commit** — the merge
  criterion, not run locally (session 17's ruling).

## The sheet — HELD FOR EVA'S RULING

`node tools/shot-bloom-centre-retirement.mjs <dir> <worktree of 8524318>`: three
BEFORE/AFTER pairs, print preview ON, chrome hidden, asserted — the shipping default flat
(11,136 → 10,080 triangles, hub 8.84 mm both sides), the shipping default at head rise 0.50
(the sparse dome row the seat HOVER was photographed on), and the incurve target at rise
0.50, where the DISC is buried under the crown from every camera (152,832 → 151,776 and
nothing the eye can reach — which is itself the finding: on the head the rig was meant for,
the designed centre was never visible). The sheet asserts on its own captions that BEFORE −
AFTER is exactly the DISC's 1,056 triangles and that the hub radius did not move, on every
pair. Merge is released by Eva's ruling on it; the ruling itself goes in the docs-only PR
after the merge, per the approved amendment.
