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

**The trigger confirmation** (the job does NOT start on the old filter and DOES on the new)
is per tool and needs two pull requests per tool against the remote: it is recorded in the
PR thread as each pair is run, with the run ids, not here.

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
| `verify-bloom-apex-mutants` | `--neuter=<id>` | ~3 min a mutant, 79 mutants | its own workflow, `bloom-apex-mutants.yml` |

The `gates` job is about 21 minutes and runs in PARALLEL with `preflight`, so the export
gate's critical path does not move. The mutant table is four hours in one job: it is sharded
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
declared timeout. **Per-shard runtime in CI is measured off this PR's own run and quoted in
the PR thread, never projected here.**

## What this PR does not do

* No matrix row, no geometry, no registry change. `bloom-geometry.js`, `bloom-registry.js`,
  `bloom.js` and `bloom.html` are untouched.
* #303's prose corrections in `CLAUDE.md` — not this PR.
* The fold-clamp kink is declared, not fixed (above).
