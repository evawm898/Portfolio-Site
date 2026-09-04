# Dome lean, session 15 — which candidate, what the metric measured, and what still doesn't move

Session 15 answered the crown-coverage brief left open by session 14 (#146, `headRise`):
at `centerStyle NONE` under `CONTINUOUS` placement, the domed apex reads bare. PR #147,
merged on Eva's ruling (Sep 4) as `c6218e60359866671d822d7d273778268b6bcff7`. This
document carries the numbers a later session will want rather than prose: the coverage
table before and after, the Q1/Q3 conclusions, and — found only by re-measuring after
merge rather than assumed — which recipes this fix actually touches at all.

## Which candidate, and what shipped

**Candidate (a), "lean the crown," was ruled; (b) "extend the sequence inward" and (c) "a
distinct core whorl" were both declined**, on Q2's own costing below — neither was built.

What shipped is **not** the narrowest form of (a) that Q2 first costed (a one-off
`layerTilt` retune on the incurve target's own named test recipe, 5°→10-12°). That
recipe's `layerTilt` is still `5` today, unchanged, in both `bloom-crowding.mjs` and
`bloom-plan-coverage.mjs`. Instead: **`domeLean`**, a per-ring correction derived from
`headRise` and computed once in `footRing()`, added as a third addend where
`buildPetalInto` forms the blade tilt (`petalTilt + tiltExtra + domeLean`). It applies
automatically to any domed recipe, not only the one Q2 measured, and needed no schema
bump or recipe edit — see "New control" below for why, and the charter / PR #147 for the
full migration-pin-doctrine reasoning that picked the derived form over the flat bump.

## Q1 — placement gap or coverage gap? Neither, cleanly — a dome-vs-tilt aiming interaction

Eva's own framing offered two outcomes (bald-cap ≈ innermost-foot-radius → PLACEMENT;
bald-cap ≫ innermost-foot-radius → COVERAGE). **Neither happened on any CONTINUOUS row.**
Bald-cap radius was *substantially smaller* than the innermost foot radius every time —
material was always rooted further out than it reached, so placement was ruled out
outright. The real mechanism: **curl + tilt already do essentially all the work of
closing the crown at flat** (5.41 of the incurve target's 5.49mm foot-stub gap is closed
by blade aim, not by plumbing); doming re-opens 2.08mm of that by changing the **aim** of
the same, unchanged, curling material — each ring's tilt is measured from its own
tangent-plane's outward direction, and that direction itself rotates with the cap's slope.

**Session-14 sheet agreement:** `tools/shot-bloom-dome.mjs`'s renders were regenerated and
read before the numbers were trusted. Flat incurve target closes to a hairline point
(matches the 0.08mm reading); the domed one shows a ragged hole from above and a clean
gap straight through the crown from a low rim profile (matches 2.16mm). The picture and
the number agreed in both directions.

### The coverage table — before (Phase A, pre-`domeLean`) and after (this measurement, post-merge)

Both rows use the exact named configs committed in `tools/bloom-plan-coverage.mjs`'s own
`CONFIGS`, so anyone can reproduce either column by running `node
tools/bloom-plan-coverage.mjs` against the matching commit. R0 (the raster disc radius)
is unaffected by `headRise` by construction, so it never differs between BEFORE/AFTER.

| config | R0 | uncovered (before → after) | bald-cap radius (before → after) | innermost foot r |
|---|---|---|---|---|
| SHIPPING DEFAULT (flat, `headRise`=0) | 8.84mm | 38.3% → 38.3% | 5.34mm → 5.34mm | 8.84mm |
| MUM, flat (`headRise`=0) | 4.69mm | 4.5% → 4.5% | 0.92mm → 0.92mm | 2.42mm |
| **MUM × rise 0.50** | 4.69mm | 4.3% → 4.3% | 0.91mm → 0.91mm | 2.42mm |
| INCURVE target, flat (`headRise`=0) | 12.51mm | 0.0% → 0.0% | 0.08mm → 0.08mm | 9.14mm |
| **INCURVE target × rise 0.50** | 12.51mm | **3.6% → 0.0%** | **2.16mm → 0.08mm** | 9.14mm |
| INCURVE × rise 0.50 × centerStyle NONE | 12.51mm | 3.6% → 0.0% | 2.16mm → 0.08mm | 9.14mm |

Every flat row (`headRise`=0) is unchanged **by construction**, not by coincidence —
`domeLean` is exactly 0 there, the same guarantee `ring.slope` itself already carries.
The two domed rows split cleanly: **incurve target's gap fully closes** (2.16mm → 0.08mm,
matching its own flat reading exactly); **the mum's does not move at all** (0.91mm both
times). That split is not noise — see the next-session note below for why, since it
directly bears on Eva's own screenshot config too.

## Q2 — the three mechanisms, costed (unchanged from Phase A, recorded for completeness)

- **(a) Lean the crown** — tested, not argued: `tiltExtra`'s existing ramp is already 0 at
  the outermost ring and maximal at the innermost, so steepening it is a value change on
  an existing control, not new range. Swept on the domed incurve target: closes fully at
  `layerTilt` 10–12° (shipped value was 5°), saturates beyond that, zero new crowding or
  triangle-count change at any swept value (foot rows are emitted from ring geometry
  *before* tilt is even computed — tilt only rotates the blade frame).
- **(b) Extend the sequence inward** — measured, not assumed ineffective: swept
  `layerCount` 3→6 on the domed incurve target at the shipped `layerTilt` 5°. Bald-cap
  plateaus at ~2mm across the whole reachable range while triangle count nearly doubles
  (152,832 → 301,152) — `R0` itself grows with depth via the area rule, roughly
  cancelling `layerSize^λ`'s decay, so deeper turns don't reliably land closer to the
  axis in this config family. Reaching further needs raising `MAX_LAYERS` itself — a
  separate range change with its own gate rows and crowding-threshold re-derivation, for
  no measured reason to expect it would help.
- **(c) A distinct core whorl** — costed analytically, not built: the one mechanism that
  adds genuinely new feet; triangle cost is bounded and small (14k–52k against a 1.5M
  ceiling); the dominant cost is verification, not geometry — a structurally independent
  second whorl needs its own connectedness argument from scratch (none of J1/J3/J8
  automatically cover a second, independently-parameterised whorl). Recommended against
  for the stated crown-coverage problem; the costing is preserved here in case it's
  wanted later for its own botanical-realism reason.

## Q3 — the foot-width floor (1.60mm) and the parked coupon print

- **For (a) — the shipped mechanism: irrelevant.** `layerTilt`/`domeLean` never reach
  `FOOT_MIN_WIDTH_MM` or any foot dimension at all; only the blade frame rotates.
- **For (b): not the binding constraint.** Every reachable depth (3–6) already floors its
  deepest feet at 1.60mm width without that floor preventing the radius plateau — the
  blocker is the R0-growth-vs-decay geometry described above, not print delicacy. A
  smaller floor gives no reason to expect (b) would start working.
- **For (c): probably doesn't need a smaller floor to reach the apex at all** — heavy
  over-connection at a crown is this project's own flag, never a gate, so a fused cluster
  of 1.60mm-floored stub feet would still export fine. The floor only decides whether
  that cluster *reads* as small florets versus a fused blob — an aesthetic question, not
  a structural one.
- **The cantilever coupon print: still fully parked, still recommended against running on
  this account.** `coupon` appears only in the original Aug 31 standing-gaps section of
  the charter; no session between then and now has run it, and this session's own
  conclusions don't depend on it either. Recorded again rather than let expire silently,
  per the charter's "a defect report has an expiry date" doctrine — it remains the
  standing highest-value gap from Aug 31, unrelated to whether it blocks anything here.

## New control: none — `domeLean` is derived, not a control

No new registry entry, no new UI element, nothing for `readUI()` or `applyVisibility()`
to see. `domeLean` lives only in `footRing()`'s per-ring descriptor
(`bloom-geometry.js`) and in `__bloomMetrics()`'s read-only telemetry (`bloom.js`); it has
no default to set because there is nothing to set — it is fully determined by `headRise`
(itself unchanged, still `role: 'arrangement'`, 0.00–1.00, default 0) and each ring's own
`slope`. It is always on, automatically, the moment the hub is domed.

## Gate rows and verification

`buildMatrix()` grew from **466 to 469 rows** (the new "20. DOME LEAN" section: Eva's own
screenshot config flat, at `headRise` 1 — GATED, bald-cap must be unmoved — and at
`headRise` 1 with `layerTilt` 18, which closes that config's own gap via the *existing*
ramp rather than via `domeLean`, proving the lever is available to her if she ever wants
it). New junction assertion **J9** (shared by both gates): every ring's `domeLean` equals
exactly its own slope in degrees (0 flat), and the built tilt equals
`petalTiltApplied + tiltExtra + domeLean` — reconstructed from the *other* owners, never
from the built angle itself, so a lean computed but never summed in cannot pass by
agreeing with its own bug. Positive-controlled in throwaway worktrees against both a
"computed but never applied" and a "wrong constant" mutant.

Both gates: **469/469 watertight, 469/469 one connected piece**, locally and
independently in CI on the merge commit itself. Byte-diff at `headRise` 0: **434/434**
frozen phase-12 rows and **433/433** pre-existing flat rows in the full live matrix, all
byte-identical, 0 moved; all **33/33** pre-existing domed rows moved — engaged everywhere
it should be, silent everywhere it must be, no partial coverage.

## What the next session touching petal geometry needs to know

- **`domeLean` only helps a recipe whose curl was already sweeping material inward at
  flat.** It corrects blade AIM, nothing else. The mum's bald-cap radius is **identical**
  before and after (0.91mm, measured above) because the mum has zero `petalSpineCurl` —
  its blades point outward regardless of tilt, so its crown coverage is foot-limited, not
  blade-limited, and no aim correction can move it (its own `coverageLine()` tag reads
  "blades point outward" in both cases). Eva's own screenshot config reads the same way
  for the same underlying reason — that's why its own bald-cap sat unmoved through this
  entire session's headRise sweep, independent of this fix. **Do not assume `domeLean`
  is a general crown-coverage fix** — it is a general fix for one specific, common cause.
  A future bare-crown report on a low-curl recipe needs a different lever (retuned
  `layerTilt` or `petalSpineCurl` on that recipe specifically, per Q2's own costing above)
  or a repeat of this session's plan-coverage instrument to diagnose which case it is.
- **`domeLean` must stay a separate field, never folded into `tiltExtra`.** The first
  implementation this session folded it in and broke J5/J6: under `CONTINUOUS` a ring's
  plan radius shrinks with depth, so a ring's own slope runs the *opposite* direction
  from depth — exactly backwards from `tiltExtra`'s monotone-in-depth law. This is an easy
  "simplification" to reach for later; it silently reintroduces that exact bug.
- **`tools/bloom-plan-coverage.mjs` is still just a measurement tool, not wired into
  either gate.** Open question put to Eva in the PR, not yet ruled on.
- **`petalTiltApplied`** was added to `petalRingRootRows` telemetry this session — the
  *effective*, override-resolved `petalTilt` (`p.applied.petalTilt`), not the raw UI
  control. Any future assertion needing "the tilt this petal actually built with" should
  read that field; the raw control differs on any `labellumTilt`/`hoodTilt`/per-petal-tilt
  override row.
- The AFTER column above was produced by re-running the *exact same* committed
  measurement tool against the merged tree, and reproduced Phase A's own BEFORE numbers
  exactly on every row `domeLean` shouldn't touch — a cross-check on the tool itself, not
  only on the mechanism.

WAITING ON MEASUREMENT/CI: nothing needed from Eva
