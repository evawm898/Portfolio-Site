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
