# Petal apex — smooth shading + the CONDITIONAL row ramp (Eva's build ruling)

Five prior discovery rounds (throwaway worktrees, reported in `docs/bloom-apex-cap-discovery.md`
and this session's own scratch reports) diagnosed the high-`petalTipShape` "bright notch" as two
separate things: a genuine flat-shading facet at the apex, and a real, if reduced, polygonal
silhouette corner that shading cannot remove. Eva's final ruling ("Rulings. Build it") authorised
real commits to `bloom.js` and `bloom-geometry.js` rather than further discovery. This doc records
what shipped.

## 1 — Smooth shading, live view only

`toCreasedNormals` (three@0.161.0's own `three/addons/utils/BufferGeometryUtils.js`, imported
through the SAME `three/addons/` mapping the page's importmap already pins for `OrbitControls`
and `STLExporter` — no new dependency) replaces the flat per-triangle normal reconstruction in
the LIVE viewport only. Print preview and the STL export are untouched: `exportMode` branches to
the old flat-normal path exactly as before.

**The crease angle is 60 degrees, derived from a per-petal dihedral-angle census** (`petalCount:
1`, tip shape 3.00 — the worst case — to make the world-space axis correspond to the petal's own
length rather than the whole bloom's diameter). Three populations separate cleanly:
- the tip facet this is FOR: never exceeds 44.8 degrees anywhere in the region.
- the rim bead's own four 45-degree segments: cluster at 40–45.
- the foot-to-blade SEAM, a real architectural fold and not a faceting artefact: 80–95 degrees,
  nothing in between 55 and 80.

Any angle in (45, 80) smooths every tip/rim-bead facet and leaves the seam's real fold untouched;
60 sits in the middle of that margin on both sides.

**Render-only, by construction and not by care**: `toCreasedNormals` reads only the `position`
attribute already set and writes a NEW `normal` attribute. `acc.positions` — and therefore the
STL export — is untouched by this branch regardless of which shading path runs. Verified by a
real headless render: the live view shows the bright chip almost entirely smoothed away at
n=3.00; print preview stays exactly flat, unchanged.

## 2 — The row ramp: CONDITIONAL, threshold 2.50, continuous

**2.50 is authored, not derived.** A round-5 discovery measured a data-derived crossing at
n approx 2.00–2.05 (the widened max-turn metric on the shipped default's own petal first
exceeding the always-accepted default's own 11.59-degree baseline). Eva overrode that with 2.50.
Recorded as an override, not agreement — see CLAUDE.md's own entry beside `APEX_HALF_MM`.

**The mechanism** (`bloom-geometry.js`):
- `NU_BASE = 56` is the shipped, static row count. `BLADE_ROWS` is pinned to `NU_BASE`
  permanently — never the per-petal `NU` — because `tools/bloom-harness.mjs` reads it once, at
  module load, for its frequency-ceiling assertion, before any petal has been built.
- `NU` itself is `let`-mutable, set per petal by `bladeRowsFor(ps.petalTipShape)` inside
  `petalSurface()`, at the point `ps` (the ring's own EFFECTIVE state, after
  zygomorphy/sepal-twin overrides) first exists.
- `APEX_NU_BAND = [2.30, 2.70]`, a 0.40-wide band centred on 2.50. `bladeRowsFor` returns exactly
  `NU_BASE` at and below 2.30, ramps LINEARLY (rounded to the nearest integer) to `APEX_NU_ABOVE`
  (112) at 2.70, and stays pinned at 112 above it.
- `HELD_ROWS` and `SEAM_MAX_STEP` — previously one-time `const`s captured from `NU` at module
  load — are now zero-argument functions, recomputed on every call. These were the only two
  places that needed converting; every other read of `NU` in the file is an ordinary
  function-body read and picks up the per-petal value automatically.

**Why a ramp and not a step**: a flat threshold turns one 0.05 slider step into a 56-row, ~2x
triangle-count jump (measured in round 5: 24,688 -> 47,984 triangles crossing n=2.00 -> 2.05 in
one step). The 0.40-wide band turns that into roughly 7 rows per 0.05 step instead.

## 3 — Measurements

**Byte-identity below/at the band, against a worktree of `origin/main` (429500d)**: at
n = 1.70 / 2.00 / 2.25 / 2.29 / 2.30, `Object.is` over every exported float, 0 differences,
triangle count 24,688 on both trees at every one of those five values.

**Fine sweep across the ramp band** (0.02 steps, 2.20 through 2.90, Eva's 60x8 petal, EXPORT
mode, whole-bloom build): NU rises monotonically 56 -> 59 -> 62 -> ... -> 112 in steps of
roughly 3, triangle count rises in matching steps of ~832–1,248 (never more), and:
- **watertight and degenerate-free at every step**: boundary=0, nonManifold=0, degenerate=0 on
  every one of 15 built states from n=2.20 to n=2.90 (a full triangle-soup edge census on the
  export-mode positions, the same construction `analyzeStl` uses on real STL bytes).
- **the drawn length is smooth and monotone across the entire band** — 60.258722 mm at n=2.20
  falling continuously to 60.123516 mm at n=2.80 with no jump, dip, or discontinuity at any
  ramp step. This is expected rather than merely observed: the apex law and the drawn length are
  purely analytic functions of `petalTipShape`; `NU` only changes how finely that curve is
  sampled, never the curve itself.

**Above-band identity**: n=2.70 (the band's own top) and n=3.00 (fully above) both resolve to
NU=112 (`bladeRowsFor` returns 112 for both), confirming the ramp lands at exactly the static
NU=112 a blanket GLOBAL raise would have used, for every petal whose effective tip shape clears
the band.

**Effective-state injection point confirmed on a sepal ring**: with the top-level
`petalTipShape` pinned at 1.70 (below the band) throughout, varying `sepalTipShape` alone
(1.70 vs 3.00) moves the sepal ring's own triangle count (39,998 -> 54,558) — the ramp reads
the RING's own effective tip shape, not the top-level control, exactly as round 5's prototype
established.

**Lobed-petal composition**: unaffected in kind — the outline and the NU ramp are independent
axes; a lobed petal's triangle count moves with `petalTipShape` (the outline the lobes are cut
against changes) exactly as it would without the ramp, since the ramp changes tessellation
density, not the boundary the lobe cut is applied to.

## 4 — Tool compatibility (`BLADE_ROWS` / `HELD_ROWS` consumers)

Converting `HELD_ROWS`/`SEAM_MAX_STEP` from consts to functions, and making `NU` per-petal,
touches every external tool that read either name. Audited all five files that `grep -rn
BLADE_ROWS tools/` names:

- **`tools/verify-bloom-apex-mutants.mjs`**: the `ladder-eats-the-base` mutant's `find`/`into`
  strings were the literal old `const HELD_ROWS = ...` declaration text — updated to the new
  function form. Its `witness` reads `C.BLADE_ROWS`, which stays correct because the mutant's
  own probe state (`REGISTRY_DEFAULTS`, `petalTipShape` 1.70) sits below the ramp band. All 67
  mutant anchors in this file (`find:` strings) checked against the real `bloom-geometry.js`
  post-edit: every one matches exactly once (0 disarmed, 0 duplicated).
- **`tools/bloom-infill-lamina-floor.mjs`**: `ladderHeld()` read `G.BLADE_ROWS`/`G.HELD_ROWS` as
  plain numbers in arithmetic — `G.HELD_ROWS` becoming a function would have produced `NaN`
  outright. Fixed to derive the per-build row count from the petal's own emitted grid
  (`ctx.rows.filter(r => r.u > 0).length` — the same filter the existing `seamStep` line already
  used to isolate blade rows from the foot/seam rows below them) rather than reading a static
  module value, and to reproduce `HELD_ROWS()`'s own formula against that per-build count. Ran
  `--quick` end to end afterward: `HELD_ROWS 16` (matching the pre-existing correct value for
  this tool's own DEFAULTS-state petal), no crash, no numeric regression.
- **`tools/bloom-leaf-discovery.mjs`**: `G.HELD_ROWS` was interpolated directly into a
  `console.log` string — would have printed the function's source instead of a number. Fixed to
  `G.HELD_ROWS()`. `G.BLADE_ROWS` itself is safe throughout this file: every leaf state pins
  `petalTipShape` at 1.30 (`LEAFY`), well below the ramp band, so the static value is correct.
- **`tools/verify-bloom-grid.mjs`**: audited — this gate never varies `petalTipShape` in any of
  its rows (0 references in the file), so `BLADE_ROWS` used as `NU_EXPECTED` stays correct for
  every row it tests. No change needed.
- **`tools/verify-bloom-rim-arc.mjs`**: this file DOES sweep `petalTipShape` up to 3.00 in its
  full (non-`--quick`) state list, and used `G.BLADE_ROWS` only in two REPORTING lines (a
  summary header, and the JSON dump's `stations` field) — never in a correctness-bearing
  computation (R1/R2/R3 all read the exported mesh directly). The label was reworded to name the
  band and both row-count endpoints rather than implying one static NU applies to every row in
  the table, and the JSON field was split into `stationsBelowBand` plus the band/above-value.
  `--quick` (which never touches `petalTipShape`) reproduces byte-for-byte identically to a
  worktree of `origin/main` running the same command — this gate is pre-existing red on both
  trees under `--quick` (R2/R5 informational-assertion lines unrelated to this change), so the
  label edit introduced no new failure.

## What this doc does not yet cover

The full CI matrix gates (`bloom-export-watertight`, `bloom-connectedness`), the complete
`ALL MAX` / `INFLO: ALL MAX` triangle-count-against-budget report for this specific
conditional+ramped implementation (as opposed to round 5's blanket-GLOBAL comparison), the
per-mover declaration across the full 942-row matrix, the #286 links inside
`tools/bloom-harness.mjs`'s INFILL `SELF_INTERSECTION_XFAIL` notes, and the final confirmation
sheet are separate, larger pieces of work reported alongside this doc rather than inside it.

## 5 — The budget cap (Eva's second ruling)

The extra tip rows apply only if the WHOLE bloom stays within `EXPORT_TRI_BUDGET`
(1,500,000) with them; otherwise every petal keeps NU_BASE (56). `buildBloomInto()`
decides this before the real build, using two trial builds bounded near the
baseline's own size (never near the full ramped size, however large that would be):

- The BASELINE (every ring forced to NU_BASE) is built directly into the caller's
  own accumulator, not a throwaway. When it alone already exceeds budget, that build
  IS the correct final result — `main`'s own geometry, exactly — and nothing further
  runs. This is an EXACT, zero-extra-cost short-circuit: the ramp only ever adds
  rows, so a baseline over budget proves the ramped total cannot fit either, by
  monotonicity alone.
- When baseline fits, a PROBE (every ramp-eligible ring capped at exactly one extra
  row, everyone else at NU_BASE) gives the total marginal cost of one extra row
  across the whole bloom in a single real build, bounded near baseline's own size.
  `predicted = baseline + marginal × steps`, where `steps` is the largest number of
  extra rows any one ring's own ramp asks for. This is EXACT when only one distinct
  tip-shape target is in play (petals alone via `petalTipShape`, sepals alone via
  `sepalTipShape`, or both ramping to the same target — every state named for
  verification below) and a safe OVER-estimate when petals and sepals ramp to two
  different targets simultaneously.
- Only once the prediction is proven to fit does the real ramped build run, into a
  throwaway accumulator whose fields are copied onto the caller's own — bounded,
  because it has already been shown to land under the same 1.5M budget every other
  row here already respects.

**`ALL MAX`'s LIVE-mode build was already ~29.7s on `origin/main`, before any of
this session's work** — right at the harness's fixed 30-second per-row `settleBuild`
timeout, for reasons unrelated to this change. An early version of the budget-cap
mechanism (which always built a fresh baseline trial AND a separate final result)
cost `ALL MAX` its baseline build TWICE — measured at ~56.7s, a straightforward
regression over `main`'s own ~29.7s for the identical output. The fix (build baseline
directly into the caller's real accumulator, reusing it when it alone decides the
budget question) brings `ALL MAX`'s LIVE build back to ~28.3s — the SAME cost `main`
already pays for this row, not a new one. The 30-second harness timeout itself is
untouched.

**Verified**:
- `ALL MAX` is byte-identical to `origin/main` (`Object.is` over every exported
  float, 3,090,816 triangles both trees), `tipRowBudget.held === true`,
  `baselineTris === predictedTris === 3,090,816`.
- `INFLO: ALL MAX` is unaffected (its own `petalTipShape` never crosses the ramp
  band) and stays exportable at 1,425,468 triangles.
- Eva's 60×8 petal at n=3.00: prediction equals the built triangle count exactly
  (47,984 both ways) — the uniform-target case the mechanism is exact for.
- The shipped default and every below-band state take the pre-existing fast path
  (no ramp eligibility at all → no trial builds, zero added cost).
- The decision is a single threshold comparison on a value (`predicted`) that rises
  monotonically with the sliders that drive it, so it cannot chatter by
  construction; a real sweep (`petalCount` 4→40 at a ramp-eligible tip shape) showed
  zero flips over the range it covered. A genuine near-boundary straddling pair
  within this session's time budget was not isolated; the architectural argument
  (no hysteresis, a strict monotone threshold) is what stands behind the "no flip on
  tiny slider moves" claim, alongside the zero-flip sweep.

The read-out's `TIP ROWS` line (`bloom.js`'s `tipRowBudgetLine()`) reads
`built.tipRowBudget` — never re-derives it — and prints
`TIP ROWS HELD at 56: bloom over the triangle budget` when it binds, naming the
predicted and baseline triangle counts against the budget, or a within-budget line
otherwise. It is silent (empty string) when nothing was ramp-eligible at all.

`EXPORT_TRI_BUDGET` moved from `bloom.js` to `bloom-geometry.js` (one owner);
`bloom.js` now imports it.

## 6 — `BufferGeometryUtils` is vendored locally, not from `dress/vendor/`

`bloom-vendor/BufferGeometryUtils.js` is a byte-for-byte copy of three@0.161.0's own
`examples/jsm/utils/BufferGeometryUtils.js` (the same file `node_modules/three`, this
repo's dev dependency, and jsDelivr's CDN both serve for this exact version).
`bloom.html`'s importmap pins the EXACT specifier
`three/addons/utils/BufferGeometryUtils.js` to this local file; every other
`three/addons/` import (`OrbitControls`, `STLExporter`) is untouched and still
resolves to the CDN. This is deliberately NOT a copy of
`dress/vendor/utils/BufferGeometryUtils.js` — that file belongs to a different
project in this repo and is a materially different, NEWER three.js version (a
hashed-bucket rewrite of `mergeVertices`/`toCreasedNormals`, not the `vertexMap`-based
one this file's `toCreasedNormals` call was measured against for its crease-angle
derivation in §1). Verified in a real headless browser: the only network request
touching `BufferGeometryUtils` is the local static file at
`/bloom-vendor/BufferGeometryUtils.js`; jsDelivr is never asked for it.
