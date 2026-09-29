# Gate coverage: C19, D14, C20 — outcome

Branch `claude/gate-coverage-c19-d14-c20`, off `main` after #304 (the NU-coupling fix).
**No matrix row is added.** The live matrix is 971 rows on the merged base; every figure
below that says 970 was measured on `a4dc836`, before #304 merged.

Three coverage holes, closed in one PR:

* **C19** — six tools the export gate EXECUTES through imports were not in its path filter,
  so an edit to any one of them alone ran the gate on nothing.
* **D14** — eight bloom gates that carry must-fail controls ran in no workflow. Three of them
  were RED on `main` when first run, and nothing had said so.
* **C20** — `bloom-connectedness` was one job with no timeout, 134-204 min on its recent
  successes; it is four shards and a reconciled verdict now, the export gate's own shape.

Part 1 of the session (the frozen-tag experiment and its rule) is recorded in `CLAUDE.md`
under *WHEN A FROZEN TAG PUBLISHES IS AN OPERATIONAL RULE OF THUMB, NOT A MECHANISM*. The
scratch branch it used, `claude/zz-disposable-tag-experiment` (two workflow-only commits,
never to be merged), still exists on the remote and waits on approval to delete. **The rule's first prediction held:** `frozen/phase46` (base `a4dc836`, whose workflow files were identical to `main` HEAD at dispatch) PUBLISHED on `bloom-frozen-tags` run 31, dispatched from `main` at `eab84b2` right after #304 merged, and read back by `git ls-remote --tags origin` before this PR (which edits three workflow files) was pushed.

## C19 — the six tools, their chains, and one must-fail per tool

Reachability was computed from the import graph (`import ... from './x.mjs'` lines, walked
from every `run:` line of the workflow) rather than read off the filter. Every chain below
is an import that is LIVE in the job — the module is loaded and its functions are called on
every row or on every run of the step named.

| tool | chain into `bloom-export-watertight` | listed before |
|---|---|---|
| `bloom-crowding.mjs` | `verify-bloom-export` → crowding (the flag's R1 validity assertion, every row) | no |
| `bloom-first-slot.mjs` | `verify-bloom-export` → `bloom-harness` → first-slot (the L family's Node rebuild); also `verify-bloom-infill`, `bloom-combination-gate` → `bloom-infill-wall` → first-slot | no |
| `bloom-infill-wall.mjs` | `verify-bloom-infill` (I11) and `bloom-combination-gate` (the two `INFILL` pairs) | no |
| `bloom-plan-coverage.mjs` | `verify-bloom-export` → plan-coverage (coverage R1 every row, asserted on the incurve rows) | no |
| `bloom-rim-roundness-lib.mjs` | `verify-bloom-infill` (I12's swept-law reference) | no |
| `bloom-solid-angle-coverage.mjs` | `verify-bloom-export` → solid-angle (solid R1/R5 every row) | no |

The same walk over `bloom-connectedness` found `bloom-crowding`, `bloom-first-slot` and
(through the new `bloom-connectedness-shards` → `bloom-export-shards`) `bloom-sagitta`
reachable and unlisted; all three are in that filter now.

**The must-fails.** Each plant is a one-line edit to the tool alone — a change the OLD filter
would not have triggered on, so none is vacuous — run through the shipped step that reaches
it, then restored (`git diff` empty after each). The red is pasted verbatim.

* **crowding** — `registered = E.tris === stl.tris` → `+ 1`; `verify-bloom-export --only DEFAULT`:
  `crowding R1: the in-page export build has 24688 triangles but the exported STL header says 24688 — the feet this metric read are not the geometry that was exported`
* **solid-angle** — the plan raster's cell centre `(i + 0.5) * cell` → `(i + 0.4) * cell`; same row:
  `solid R5(b): vertical rays read uncoveredFraction 0.3829238781629754 on the plan grid (n 220); the shipped plan raster returned 0.3828108563012834`
* **plan-coverage** — `petalTris` summed `+ 1`; same row:
  `coverage R1: petals-only (24497) + hub-only (192) + centre-only (…: 0) tris = 24689, but a normal whole-bloom build has 24688 — the petal capture is not exactly buildBloomInto's own petals`
* **first-slot** — the RINGED arm reads the NEXT whorl (`layer = Math.min(layer + 1, …)`);
  `verify-bloom-export --only 'LOBES: x 3 whorls'`:
  `L4: the margin re-measured as 19.2894 mm of outline against the record's 26.7851` (plus L2, L3, L5).
  A first plant that swapped only `got.ring` and kept the slot was SILENT: `petalSurface` reads the
  petal's length from `slot.scale`, not from the ring, so that plant moved nothing the L family
  measures. Recorded because a silent plant is a finding about the plant, not the gate.
* **infill-wall** — `infillWallSurfaceMm` returns `mm: best * 0.5`; `verify-bloom-infill`:
  `FAIL I11: default: the narrowest in-sheet wall between holes reads 0.500000 mm against INFILL_WALL_MM 1 less two grid quanta (0.999998)` (and the other three states).
* **rim-roundness-lib** — `inradiusOf` returns `lo * 0.9`; `verify-bloom-infill`:
  `FAIL I12: the default at 0.60 draws 20 holes / 170.67 mm2 / median roundness 0.8467 against the swept law's 20 / 173.85 / 0.8238 and today's 179.08 / 0.8177 — it must sit ten times closer to the ruled shape than today's does`

**The trigger confirmation** (the job does NOT start on the old filter and DOES on the new),
measured 2026-09-29 21:02-21:03Z off `actions_list` by head sha. Per tool, two disposable draft
PRs each carrying ONE one-line edit to that tool and nothing else: PR-A is based on `main`, so
GitHub evaluates `main`'s OLD `bloom-export-watertight` path filter; PR-B is based on this
branch, so it evaluates the NEW one. The filter under test is the PR's own workflow version,
which is why a `main`-based PR is the control. Every run was cancelled and the twelve PRs
(#308-#319) closed; the `claude/zz-plant-*` branches wait on Eva's delete.

| tool (the one file edited) | PR-A, base `main`, OLD filter | PR-B, base this branch, NEW filter |
|---|---|---|
| `bloom-crowding.mjs` | #308 `0bd02b4`: flower-export-watertight + flower-geometry-quality only. NO bloom-export-watertight | #309 `bacfc31`: bloom-export-watertight run 36630573941 (also bloom-connectedness 36630573886, C20's own filter gain) |
| `bloom-first-slot.mjs` | #310 `7f34862`: the two flower gates only. NO bloom-export-watertight | #311 `373c14c`: bloom-export-watertight run 36630587860 (also bloom-connectedness 36630587736) |
| `bloom-infill-wall.mjs` | #312 `e28e833`: the two flower gates only. NO bloom-export-watertight | #313 `2b907a6`: bloom-export-watertight run 36630599190 |
| `bloom-plan-coverage.mjs` | #314 `cee390c`: the two flower gates only. NO bloom-export-watertight | #315 `e4fcc1c`: bloom-export-watertight run 36630612905 |
| `bloom-rim-roundness-lib.mjs` | #316 `069b26d`: the two flower gates only. NO bloom-export-watertight | #317 `b08318c`: bloom-export-watertight run 36630625359 |
| `bloom-solid-angle-coverage.mjs` | #318 `3fca7b0`: the two flower gates only. NO bloom-export-watertight | #319 `bd1f192`: bloom-export-watertight run 36630637707 |

Six of six: silent on the old filter, triggered on the new. The two flower runs on every PR-A
are `flower-*.yml`'s `tools/**` filter (this repo's recorded corollary) and say nothing about
the bloom gate.

## D14 — the eight gates, in CI

| gate | control | gate + control on the session's box | where it rides |
|---|---|---|---|
| `verify-bloom-leaf-decoupled` | `--control` | 9 s + 9 s | export gate, `gates` job |
| `verify-bloom-sepal-decoupled` | `--control` | 19 + 19 | same |
| `verify-bloom-surface-offstation` | `--control` | 1 + 1 | same |
| `verify-bloom-rim-arc` | `--control` | 22 + 23 | same |
| `verify-bloom-infill-conform` | `--negative-control` | 76 + 247 | same |
| `verify-bloom-infill-metric` | `--negative-control` | 80 + 377 | same |
| `verify-bloom-edge-profile` | `--control` | 311 + 46 | same (needs Chromium) |
| `verify-bloom-apex-mutants` | `--only=<id> --neuter=<id>` | ~3 min a mutant on the box; **17 / 27 / 25 / 26 min a shard of 19-20 on the runner** | its own workflow, `bloom-apex-mutants.yml` |

The `gates` job is about 21 minutes on the box and **20.0 min on the runner** (run
36630920752 on `24b2877`, 21:25:52 → 21:45:52), in PARALLEL with `preflight` (46.0 min there,
the infill negative control alone 18 of them), so the export gate's critical path does not
move: that run's eight shards took 22-46 min of matrix each and the whole workflow, preflight
to verdict, **72.5 min** against the 342 of the last single-job run. The mutant table is four hours in one job: it is sharded
four ways by table index (`--shard=k/4`) in its own workflow, on a pull request that touches
the table, weekly on `main`, and on dispatch; its `--anchors` pre-check (seconds) rides in
`gates` on every push so a refactor that moves a find-string is caught the day it lands.
Each gate is followed by its own control in the same job, so a control that has stopped being
able to fail is red beside the gate.

**Three of the eight were red on `main` at `a4dc836`, all since #283 (the apex nib, eleven
merges earlier).** Fixed here, each seen red first:

1. **offstation** — `FAIL — clause C: VACUOUS — every candidate classified as smooth, so the
   C0 claim rests on nothing measured`. The detector ran on the PROFILE's law-`u` while the
   surface it certifies is drawn in reparameterised `u` (#283's `toLaw`), so every declared
   seam was probed at the wrong station. It runs on the surface now (`at(u, 0.6)`), the
   declared breaks come from `tangentBreaks()`, and the named seams are 0.058 and 0.800. A
   clause I first added ("every declared TERM_CHANGE must break") was wrong — the nib's
   joins are C1 by construction — and was removed.
2. **rim-arc** — `FAIL — 246 finding(s)`, R2 on every state (`a station pair's reported arc
   is SHORTER than its emitted chord by 3.286e-7 mm`) and R3 on the cup-gradient rows. R2:
   two stations inside one ladder cell were differenced against the cell's own node, so the
   arc under-read the chord; `arcBetween` now takes the true node-to-node path. R3: the
   graded ladder is not nested across doublings, so the convergence "order" was a property
   of the ladder; `nestedLength` doubles the SAME ladder. What is left is real: the fold
   clamp's onset (#283 §9g) is an undeclared C0 kink at the margins wherever
   `|cRaw| > hb / (FOLD_CLAMP_MARGIN·t)`. Declared by value in both directions:
   `R3_XFAIL` (cup gradient −0.8 at u 0.9818 / 19.6°, +1.2 at u 0.9678 / 20.0°, tip shape
   0.60 × cup 1.2 at u 0.7279 / 13.8°) and `R5_XFAIL` (FORMED at u 0.98724 / 8.07°); the
   named seam moved from law-u 0.0579388 to drawn-u 0.057734 on both modes. **This kink is
   Eva's to rule on** — declaring it is not fixing it, and the fix (a smooth clamp onset) is
   a byte partition on every cupped row.
3. **edge-profile** — `FAILED — 9 findings`: three mutant anchors stale since S5 moved
   `rimProfile` out of `emitPanel` (re-indented), and E2's declared surface-turn table stale
   since #283: ORCHID 46.15°, FAN × PER-PETAL 48.20°, GRADIENT 85.92°, LADDER × BUCKLE, and
   two APEX NIB rows now over the 45° allowance and undeclared; BUCKLE re-recorded 6.236 →
   5.441; `TIP SHAPE 0.60 × thickest` came off (43.59°, under). The mutant
   `the-tip-drop-is-a-threshold-on-the-emitted-width` also reddens E2 on ORCHID (43.69° of
   excess) and names it as collateral. Attribution: every mover is a row whose apex the nib
   re-drew; none is this PR's.

### What the mutant table's first CI run found (D14's own finding)

The table had never run whole since the apex nib merged (#283) — every session since ran it
in `--only` subsets — and the first sharded sweep in CI, on `24b2877`, was **red on all four
shards, and red on `main` for the same six mutants** (each confirmed on a worktree of
`a4dc836` with `--only`). The witness clause is what reported five of them, as it exists to:
"the edit applied but the BEHAVIOUR did not move".

| mutant | what the witness said | why | repair |
|---|---|---|---|
| `floored-tip`, `true-apex`, `wrong-terminal`, `law-past-the-floor` | the terminal is 0.05 mm whatever the floor is set to | they mutate the MODE FLOOR and read the shipping default's last row, which the nib pins to `APEX_END_HALF_MM` on every petal whose blade clears the print floor — ring 0 at every reachable width | the witnesses read **ring 5 of six layers at `layerSize` 0.35**, the one inert case where the floor still ends a blade (measured: peak half-widths 0.343 / 0.15 / 0.15 mm live on rings 3-5 against a 0.15 mm floor, 0.80 export), after asking the CLEAN tree whether that ring is in the floor's subject; they name **AN0** now, since A2-A4 read the representative petal only |
| `plateau-returns` | the witness THREW: `Cannot access 'uPk' before initialization` | the inserted term read `uPk`, which the nib session moved below the terms (it is the DRAWN widest point now); `uPkRaw` is the law's own and is what the CORE term beside it reads | `uPkRaw` |
| `stations-not-increasing` | the unrepaired ladder is still strictly increasing | swept the unrepaired module: 672 buckle states x 2 modes, 1,764 at session 35's finer grid, 144 lobed / ramped / spatulate compositions x 2 modes — **0 of ~2,600 builds** non-increasing, smallest positive gap 3.2e-6 | **RETIRED AS UNREACHABLE** with the measurement in its place (session 32's precedent for the lerp mutations); A7's clause stands |

The repair to the four terminal mutants needed a clause nobody had: **AN0's inert arm now
restates A4's law per ring** — `lastRowHalf === max(petalTipEnd x peakHalf, the mode floor)`
wherever the nib declines — because A4 states it on the representative petal only and the nib
owns that petal's terminal everywhere reachable, so after the nib the mode floor decided a
terminal on exactly one kind of ring and no clause read it. Restated in Node over the whole
971-row matrix in both modes before it went near CI: **17,896 rings, 644 with the nib inert,
0 findings**; the four repaired mutants each fire it on the page, the clean tree is silent on
the new probe row, and the `--control` legs already in the file are untouched. The table's
`ROWS` gained that probe state (six layers at 0.35); it is a probe row of the mutant table and
NOT a matrix row.

**And the neuter control had two defects of its own, both caught by the same run.** The
`witness` job was CANCELLED at its 30-minute timeout: `--neuter=<id>` ignored `--only` and
swept all 79 mutants for one neutered edit (four hours). And its verdict read the run's
whole `fail` flag, so with six stale mutants in the table it would have reported the control
green whether or not the neutered witness had fired — a subject that includes the thing it
doubts. It combines with `--only` now, runs the neutered mutant alone, and passes only when
THAT mutant's witness reported (measured on the box: `the-leaf-reads-the-petals-nu` reported,
exit 0, under two minutes).

## C20 — the connectedness gate, sharded

`tools/bloom-connectedness-shards.mjs` reuses the export gate's own `shardOf`, census writer
and reconciliation; `summarizeConn` is the ONE verdict for a sharded and an unsharded run.
The partition, from the harness's live matrix by index:

```
970 rows over 4 shards: 243 / 243 / 242 / 242 — every row in exactly one shard, none in two, the union the matrix
```

(971 rows on the merged base: 243 / 243 / 243 / 242.) The negative control fails the
reconciliation on nine planted cases, a two-piece row hidden in a middle shard among them;
a two-shard three-row end-to-end run passes. Four shards and not eight: the recent whole-matrix
runs took 134-204 min, so a shard is 34-51 min of matrix plus ~5 of install under a 150-minute
declared timeout. **Per-shard runtime in CI, measured on this PR's own run** (36630920832 on `24b2877`, 971
rows, 243 / 243 / 243 / 242): matrix steps **59.1 / 39.2 / 51.2 / 48.9 min** for shards 0-3,
the verdict green at 22:08:02, and the whole workflow **60.5 min** wall (21:07:37 → 22:08:04)
against the 104-124 min this repo records for the single job. The worst shard sits at 39% of
its 150-minute timeout.

## What this PR does not do

* No matrix row, no geometry, no registry change. `bloom-geometry.js`, `bloom-registry.js`,
  `bloom.js` and `bloom.html` are untouched.
* #303's prose corrections in `CLAUDE.md` — not this PR.
* The fold-clamp kink is declared, not fixed (above).
