# Bloom session 31 — the pinch: the sharpness singularity retired (Sep 8)

Base: `8b4c671` (session 30's docs-only close, #186). Branch
`claude/sharpness-singularity-retire-taousk`. One stop, before the build, for Eva's ruling on the
reparameterisation; everything after it is measurement.

## The problem, in one line

The tip outline law's exponent `s = 2` makes `h = (cos² + sin²)^(−1/2)` exactly 1 at every
azimuth, so at that one slider value roundedness and the point count were inert — and the value
had been patched around at separate sites (the anther's default moved off it in session 29; JS6/JG5
exempted it in session 30 and block 26 pinned a row to hold the exemption). It was also a second
way to say "circle" when roundedness 1 already means that and owns it.

## The ruling (Eva, Sep 8, in full)

1. **The pinch mapping: approved.** `s = 2 / (1 + k)`; the slider carries `k`, range 0.05 to
   7.00, step 0.05, default 1.00. **Unreachable rather than at an end** — at an end the exemption
   and its pinned row survive and the class is not solved. The linear alternative (carry the
   waist fraction) is rejected because a default at 0.7071 sits on no grid the slider can
   return to.
2. **The roundedness-1 lattice branch stays, and her three-site count was wrong.** `tipSides()`'s
   `STAMEN_SIDES` arm is keyed on roundedness 1, not on `s = 2`; it is the circle's own lattice
   law and only looked broken in the singular state. With the singular exponent off the travel,
   leaving roundedness 1 always changes the form, so the sides are always earned. Deleting it
   would move 79 live rows and 59 of phase19's for 60% more triangles per tip — not a price for a
   tidier story. **The singularity had TWO sites, not three**; the charter's session-30 entry is
   corrected below.
3. **Giving up `s > 2` is approved, with the cost named.** The far half of the old exponent is not
   only a second path to the rounded polygon: it pinches at the OTHER azimuth, so at three or four
   points it is a half-step rotation and a visibly different shape. It goes because a rotation
   living inside a sharpness dial is two things in one control. If it is wanted later it returns
   as its own PHASE control, never as the far half of this one.
4. **The rename earns its line.** `sharpness` ran backwards from its label — 8 was the bulge,
   0.25 the star. `pinch` reads the way it behaves. Same defect class as a comment naming a check
   nobody performs.
5. **The two patches come out and their removal is the proof**; anything still needing a special
   case afterwards is to be said, not papered over.
6. Partition as predicted, measured with the three-capture construction; phase20 owed at
   `8b4c671`; phase19 joins phase17 on the list of tags whose bytes no longer fully reproduce.

## What the slider carries

```
s     = 2 / (1 + k)                  tipExponent(), the one place the exponent is formed
waist = 2^(−k/2) × the point radius  at roundedness 0; every 2.00 of pinch halves it
floor = k ≤ −2 · log2((need − ρ) / (1 − ρ)),  need = 0.50 mm / a     a CAP on the pinch
```

| shape | pinch k | old s | waist |
|---|---|---|---|
| circle | 0 — **unreachable** (roundedness 1 owns it) | 2.00 | 100% |
| rounded polygon | 0.05 … 0.95 | 1.90 … 1.03 | 98% … 72% |
| polygon (the default) | 1.00 | 1.00 | 71% |
| star | above 1.00 | below 1.00 | below 71% |
| the old floor | 7.00 | 0.25 | 9% |

Exactness, measured before the build: `2/(1+1)`, `2/(1+3)` and `2/(1+7)` are 1, 0.5 and 0.25
as doubles; the floor's new closed form `k ≤ −2 log2 m` maps through `2/(1+k)` to the old
`s ≥ 1/(½ − log2 m)` bit-identically on a 1,528-point sweep of radius and roundedness (scaling by
2 commutes with rounding). At the minimum the outline differs from a circle by `max|f−1| = 0.0172`,
five orders above every gate's 1e-12. The default 1.00 is the SAME exponent as the old 1.00, so
every row that inherits the default — and every row that set the old value 1 — holds by
construction; no live row sets a roundedness below 1 without also naming the control (census: 0).

**The waist floor's headroom is unchanged**, because it was always a statement about the waist:
36% at pinch 1 on the default 0.96 mm tip, 13% on the thinnest printable sheet; the cap binds
above 1.88 at roundedness 0 on the default sheet and above 1.36 on the thin one (the old 0.694
and 0.849, through the map).

The ruling cells — star (pinch 3.00), polygon (1.00), rounded polygon (0.60), the nearest
reachable to the circle (0.05) and the singular point itself — were shot on the base tree at size
3.00 from `tools/shot-bloom-stigma.mjs --ruling` (a two-row mode, its own control per cell) before
a line was built; that mode now drives the pinch ids, and the singular cell is recorded as
unshootable on this tree.

## The two patches, out — and what still branches

- **`tipClauses`' `sharpness !== 2` exemption: deleted.** The every-factor-1-below-roundedness-1
  clause is what it was written to be. JS6 and JG5 run without it on every row of the smoke gate,
  the panel gate and (in CI) both STL gates, including the two new NEAREST REACHABLE rows at pinch
  0.05 whose factors are 0.983 at the diagonals — the corner the exemption used to cover.
- **The registry's `2.00 — the circle's own exponent` read-out branch: deleted.** The pinch's
  read-out is three-valued — a rounded polygon / the polygon / a star — and no value names the
  circle.
- **The pinned row `STIGMA: the CIRCLE'S OWN EXPONENT — sharpness exactly 2.00`: removed.** In
  its place, on BOTH tips, `the NEAREST REACHABLE TO THE CIRCLE (pinch min 0.05 at roundedness 0 —
  every factor 0.983, none exactly 1, on the 16-side lattice)`; the stigma's is a smoke row and
  claims JG5's clause with no exemption.
- **What still branches, said plainly:** `tipSides()`'s roundedness-1 arm. It is NOT a
  singularity patch (ruling 2 above); it is keyed on a different quantity, it is what JS7/JG6's
  inertness clause measures, and every existing tip row's bytes rest on it. Nothing else in the
  tip's path special-cases a value.

## The rename and the ids

`antherSharpness` and `stigmaSharpness` are in `RETIRED_IDS` (retiredAt 31, `schema: null` — the
bloom persists nothing yet). The new ids are `antherPinch` / `stigmaPinch`, generated from the same
one-table descriptor (`suffix: 'Pinch'`, label "Pinch"), so both tips moved in one row of
`TIP_DESCRIPTORS`. `verifySections()` accepts the reservation (no collision with a live id, an
option value, a DEFAULTS key or a section id) and the panel gate's route (n) reads the two names
absent as identifiers in all 41 scanned bloom source files — the only survivors are comments,
the reservation's own `why`, and the frozen matrices' row data, which are string literals and must
stay. Descriptor fields follow the vocabulary: `pinchAsked` / `pinchFloored` on the record,
`shape.pinch` in the shape; `tipPinchFloor()`, `tipWaistFactor(k)`, `tipExponent(k)` in the
geometry; the read-out says `pinch 1.00` and `PINCH CLAMPED to 1.88 from 7.00`.

## The partition — predicted, then measured

Frozen `phase20Matrix()` is `8b4c671`'s own `buildMatrix()`, 571 rows, proved deep-equal by
`--verify-frozen --phase20` against a worktree of the base (PASS, 571 = 571). Twenty-five of its
rows name a retired id; twelve of phase19's do (block 26 did not exist at `eb3543f`).

**Predeclared before the build** (from the row census, not from a run):

| matrix | rows | MOVE | INERT (name the control, cannot reach the geometry) | HOLD |
|---|---|---|---|---|
| phase20 (571 at 8b4c671) | 571 | 16 | 6 (INERT ×2, GATED ×4) | 549 (546 never name it, 3 set the old 1) |
| phase19 (549 at eb3543f) | 549 | 8 | 3 (INERT, GATED ×2) | 538 (537 never name it, the rounded star at 1) |

The movers are exactly the shaped rows at exponents 8 (the triangles, the mum, the fat tip, the
tip beside a style), 0.6 (the lattice rows, the cost corner, the cushion), 0.25-clamped (the waist
floor rows) and 2.00 (the singular row) with roundedness below 1 — the values with no exact
image on the pinch grid, or none at all.

**The instrument** is session 20's three-capture construction, generalised for a rename-with-map
(`tools/diff-bloom-bytes.mjs`): old tree plain; old tree TWIN with the retired ids pinned to the
new default's IMAGE (`--override antherSharpness=1,stigmaSharpness=1` — exponent 1.00 IS pinch
1.00); new tree with the retired ids STRIPPED; `--compare twin new --retirement plain --expect
16/6/549`. The claim is `twin === new` on every row; V1 asks the twin DIFFERS from plain on every
mover (the "fewer triangles" half is kept for the ids that removed a solid); the INERT class is
predeclared and counted; V3 asks the strip is exactly the retired ids the matrix NAMES and that
every twin override is one of them; V5 asks all three captures name one FROZEN matrix (never
`--full`, whose rows change between trees). The plain phase20 capture on the base was taken twice
— once as `--full` before the harness changed (571 rows, the same list) and once as `--phase20` —
which is a same-tree-twice control for free.

**Measured** — see "The close" below.

**phase19's bytes**, per the session-24 ruling: `frozen/phase19` (eb3543f) now joins
`frozen/phase17` as a tag whose ROW DEFINITIONS reproduce (`--verify-frozen` still proves them)
while **8 of its 549 rows no longer reproduce their bytes** on any tree from this one on. phase17's
entry (8 of 507, session 24) is the first; this is the second.

## What is blind, or not done — stated

- **Both STL gates are blind to the reparameterisation itself**: a pinch mapped through the wrong
  exponent still exports watertight, one piece. JS7/JG6's restated floor and JS6/JG5's outline
  clause (which rebuilds `tipOutline` on the declared shape) are the witnesses, and the two
  nearest-reachable rows are the only rows whose factors sit within 2% of 1.
- **The `s > 2` family is gone and nothing measures its absence** beyond the range constant; a
  phase control is the recorded route back.
- **The lattice jump at the roundedness-1 corner remains** (10 → 16 sides the moment roundedness
  leaves 1), now always beside a form change; at pinch 0.05 that change is 1.7% of radius against
  a 60% lattice change. Ruled kept.
- **No coupon has been printed**; the 0.50 mm floor is still an assumption and every read-out says
  so verbatim.
- **`tools/verify-bloom-presentation-only.mjs` is not run** — its registry-deep-equal clause is
  false by design on a tree that renames two controls. **`tools/verify-bloom-tip-bytes.mjs` is not
  run** — its rows predeclare that the trifid moves, which is session 26's claim.

## Predeclared untouched, verified on the final tree

Named before the first edit: the session touches exactly **nine code files** — `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `tools/bloom-harness.mjs`, `tools/bloom-smoke.mjs`,
`tools/verify-bloom-panel.mjs`, `tools/diff-bloom-bytes.mjs`, `tools/shot-bloom-anther.mjs`,
`tools/shot-bloom-stigma.mjs` — plus this doc, `CLAUDE.md` and `docs/bloom-charter.md`.
Everything else is untouched: `bloom.html`, `bloom.css`, `bloom-view-presets.js`,
`bloom-grid-gltf.js`, both STL gates (`tools/verify-bloom-export.mjs`,
`tools/verify-bloom-connectedness.mjs`), the grid gate, the tip-bytes and presentation-only
instruments, every other `tools/shot-bloom-*.mjs`, all six `.github/workflows/bloom-*.yml`, and
the flower, print, plot, cards and tracker trees. Verified at the close by `git diff --stat` against
`8b4c671` — see below.

## The close — every number from its own run, on this machine, this tree

**The partition, MEASURED** (`tools/diff-bloom-bytes.mjs`, the three-capture construction; the
base is a git worktree of `8b4c671`, the new tree is `c0d1ca0` — the code, before the docs):

| matrix | captures | result |
|---|---|---|
| phase20 (571 rows at 8b4c671) | plain (base) · twin (base, `antherSharpness=1,stigmaSharpness=1`) · new (`--strip antherSharpness,stigmaSharpness`) · `--expect 16/6/549` | **PASS — 16 movers / 6 inert / 549 holders, exactly as predeclared; twin === new on 571 of 571; V1 0, V2 0, V3–V5 held** |
| phase19 (549 rows at eb3543f) | plain (base) · twin (base, `antherSharpness=1`) · new (`--strip antherSharpness`) · `--expect 8/3/538` | **PASS — 8 / 3 / 538, exactly as predeclared; twin === new on 549 of 549; V1 0, V2 0** |
| same tree twice (control) | base `--full` (before the harness changed) against base `--phase20` | **571/571 byte-identical, 0 moved** |

The sixteen movers are exactly the sixteen named above — the two triangles, the two waist-floor
rows, the four lattice rows, the cost corner and the cushion, the two mums, the two fat tips,
the tip beside a style, and the singular row — and **every one moved at an identical triangle
count and STL byte length**: vertices moved, no lattice did. The six inert rows are the two
INERT rows and the four GATED rows. No row's set became empty under the strip.

So the two claims the brief asked for hold on the bytes: **the default is byte-identical by
construction** (every row that did not name the retired control, and every row that set the old
value 1, is bit-identical outright — 549 + 538 rows), and **the new default maps to the same
output as exponent 1 on every shaped row** (the twin at exponent 1 on the old tree IS the new
tree's stripped export, on all 16 + 8 movers).

**`frozen/phase20`**: `phase20Matrix()` deep-equal to `8b4c671`'s own `buildMatrix()`, 571 = 571
(`--verify-frozen --phase20`, PASS). To be published from `main` by `bloom-frozen-tags` after the
merge — the prediction, stated before the dispatch: the workflow goes red with `phase5` the only
refusal (its script's known `GITHUB_TOKEN` limit), and `git ls-remote --tags` reads twenty
declared baselines with nineteen published, `frozen/phase20` at `8b4c671` among them.
**CONFIRMED AFTER THE MERGE, with one count corrected:** run 34189380854 red as designed, the
refusal the script's `GITHUB_TOKEN`-cannot-push-a-differing-workflow-tree case; differencing
`FROZEN_BASE_COMMITS` against `git ls-remote --tags origin` reads **nineteen** declared (phase2
through phase20 — the prediction said twenty, a miscount), **eighteen** published at their
declared shas, `phase5` the only one absent, and **`frozen/phase20` at `8b4c671`**.

**The gates, each from its own run on this tree:**

| gate | result |
|---|---|
| `bloom-smoke.mjs --check` | coverage OK — 51 rows over 22 blocks of 572; **41 families asserted, 41 claimed, both directions** |
| `bloom-smoke.mjs --check --negative-control` | PASS (JS5 → JS99 fires both ways) |
| `bloom-smoke.mjs --conn` | **clean** — 51 rows through the export gate and the flood fill, JS6/JG5 with no exemption, the two NEAREST REACHABLE rows included; 4 rows CROWDED (a flag) |
| `verify-bloom-panel.mjs` | **PASS** — 23 sections, 101 controls, **7 retired ids absent from the DOM, the summary line, the metrics and as identifiers in 41 bloom source files**; the anther route's new step at pinch 0.05 (16 sides, no CIRCLE clause) green |
| `verify-bloom-panel.mjs --negative-control` | **all fifteen routes and session 23's four clauses observed their failure** |
| `diff-bloom-bytes --verify-frozen --phase20` | PASS, 571 = 571 |
| both STL gates on the full 572-row matrix, `bloom-grid`, `bloom-frozen-matrices` | CI, on the PR head — recorded in the PR and the charter's close entry |

**The sheets** (both proved on two rows with `--quick` before the grid; both then run with the
base worktree for their before/after pair):

- `tools/shot-bloom-stigma.mjs`: 17 rows, all holding — the migration pair **HELD** (14,400
  triangles on both trees, macro 0 px against a 0 px control); pinch 3.00 and the thin-sheet
  1.65 say **PINCH CLAMPED**; 1.65 / 1.00 / 0.60 / 0.35 clear; every shaped cell past ten times
  its control on `macro` (319,490–738,199 px against controls of 0–29 px); the INERT row 15 px on
  macro against a 15 px control, count and STIGMA line character for character. The NEAREST
  REACHABLE cell (pinch 0.05) differs from the trifid at rest by 319,490 px on macro — the
  lattice (16 sides) and the 1.7% form together.
- `tools/shot-bloom-anther.mjs`: 16 cells at six on the ring and 120 on the disc, all holding;
  the migration pair **HELD** (13,440 triangles on both trees, macro 0 px against 20 px); the
  INERT row 12 px / 0 px on macro against its own 12 px / 0 px controls.
- The ruling cells (`--ruling`, shot on the base tree before the build) are what Eva ruled from.

**Cost, from the descriptor:** no lattice moved at any reachable value, so `tippedRodTris` is
unchanged — 560 triangles per stamen on the shipping pill, the same 3,240 ceiling at six lobes on
24 sides. The 572-row matrix is one row longer than the 571 at the base.

**Predeclared untouched, verified**: `git diff --stat 8b4c671` on the final tree lists exactly the
twelve files named above — the nine code files, this doc, `CLAUDE.md`, the charter — and **216 of
the 228 tracked files under the bloom, flower, print, plot, cards, tracker, `tools/` and workflow
trees are untouched**, among them both STL gates, the grid gate, the tip-bytes and
presentation-only instruments, all other `shot-bloom-*.mjs`, and all six bloom workflows.

**Frozen phase owed: YES** — phase20 at `8b4c671` (the row set changes: 571 → 572). **Tags whose
bytes no longer fully reproduce**: `frozen/phase17` (8 of 507, session 24) and now
`frozen/phase19` (8 of 549, this session); both sets of definitions still reproduce.
