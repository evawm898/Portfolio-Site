# Bloom session 37 — `petalSurface(u, v)`: the surface law leaves the row loop

**Ruling (Eva, Sep 10, from session 37's discovery report):** extract a continuous
mid-surface evaluator from `buildPetalInto`; prove byte identity over the full matrix
with `Object.is` and a positive control; prove it right off-station and report its
continuity across the outline's C0 seams; measure the real Voronoi triangle cost from
the flower's own emitter. Build neither the distance field nor the flow field — both
recorded here as briefs for whenever a consumer appears. Push once, docs folded in,
stop for Eva before merging.

Base: PR #205's head `403baf2` (the winding fix), which is what `main` carries once it
merges; this session held the lock on `bloom-geometry.js` until it did.

---

## 1. What shipped

`petalSurface(state, ring, slot, cap, acc)` in `bloom-geometry.js`, directly above
`buildPetalInto`, returning:

| member | what it is |
|---|---|
| `rowAt(u)` | the ROW PLAN at any `u` — spine centre, frame, half-width, and the row's own `sect(v)`. It IS the object the row loop pushes. |
| `at(u, v)` | the front door: `rowAt(u).sect(v)` → `{ P, n, dv }`, the mid-surface point and its unit normal (`dv` is the analytic dP/dv, and is `null` unless a buckle is engaged — exactly as `sectAt` already emitted it). Not a second law — `rowAt` applied. |
| `footRowsAt()` | the three foot rows, fresh objects per call. |

`acc` is REQUIRED, not defaulted: `widthProfile` reads `acc.exportMode` for the tip's
terminal floor and `tAt` reads `acc.floorThickness`, so a null accumulator would silently
build the LIVE surface whatever mode the caller meant. Pass the one you will emit into.
| the constants | `t, ps, length, tilt, halfW, R, T, Rs, Up, dir, nrm, base, profile, form, dome, footS, domeRows, spineAt, law, floorRadius, uniformThickness, profileT, tAt` — read off the one place that derived them. |

`buildPetalInto` now opens with `const surface = petalSurface(...)`, destructures, and
its row loop is one line: `rows.push(surface.rowAt(stations[i - 1]))`. Everything after
the loop — the ladder, `trueNormalRows`, the panels, every telemetry field — is
untouched.

**One owner, one return.** `rowAt` has a single `return` (a ternary on a frame that is
`null` when there is no form), and `form.frameAt` is still never called on a flat build.
This is the `/plot` `stemPointFromPlan` / `stemPointAt` shape: per-station work is a
property of the station, so a caller walking a row pays it once, and a caller asking for
one point goes through the same owner.

**What it deliberately does not own** (stated in its header so the next session does not
re-derive it):
- **The ladder.** `bladeStations()` decides which `u` the mesh samples; `petalSurface`
  decides what the surface is there. Folding the ladder in would make the evaluator a
  function of the mesh it exists to be independent of.
- **The buckled normal.** On a buckled build the EMITTED normal is `trueNormalRows`' cross
  of `dP/dv` against a difference over the NEIGHBOURING ROWS — a lattice quantity. The
  evaluator returns the cross-section normal. See §3, clause D, for the measured gap.
- **The foot's surface.** Reachable as `footRowsAt()`, not through `at`.

**Two consumers were already waiting, in writing.** `tools/bloom-sagitta.mjs`'s header:
*"reaching [the 3D margin] needs the row construction callable at arbitrary `u` — a
closure inside `buildPetalInto`"*. And the Voronoi port, whose cell vertices land wherever
the diagram puts them. Neither is built here; both are now unblocked.

**A stale comment corrected in passing.** `buildPetalInto`'s header said "28 rows" from
the placeholder onward; `NU` has been 56 since session 32. It now says NU.

## 2. Byte identity — `tools/verify-bloom-surface-bytes.mjs`

The claim is positional, not multiset: every emitted float is the same float in the same
position, `Object.is`, on every row of the full matrix in both modes, this tree against a
worktree of `403baf2`. Session 36's winding tool matches unordered vertex sets because
reversing a winding genuinely reorders the stream; nothing here may reorder anything, so
this tool compares `pa[i]` against `pb[i]`.

Two clauses per row per mode: the **export stream** (`MeshBuilder.positions`) and the
**captured grid** (the same rows built again with `captureGrid` — the mid-surface itself
and the per-column normal, which the STL never sees, so a change that cancelled in the
two skins would still show). CAPABILITY rows (claw, cleft) are passed through, which the
winding tool does not do; they are the only rows with a non-rectangular `trimPanels`
domain and the only ones with more than one panel, which is where a row-loop refactor
would bite.

**The positive control** (`--control`) perturbs BOTH clauses by 1e-9 — one export
coordinate and one grid mid-surface coordinate — and requires exactly two findings.
Measured on the 6-row subset (the perturbation is on row 0, so the subset is what
exercises it):

```
DEFAULT (live): 1 of 171360 floats moved, first at index 0: 5.306790136879714 against 5.306790135879714
DEFAULT (live): grid — 1 of 4429 values moved, first at 1: 1e-9 against 0
exit 1
```

A control that fired only clause 1 would have left clause 2 a log line; both fire. The
run also refuses a vacuous pass (zero rows, zero floats, zero panels).

**What it does not prove:** off-station behaviour (§3); reachability of a row's values
(it is a Node-side comparison over the matrix's declared sets, applied raw — it proves
identical inputs give identical outputs, which is the whole claim a refactor owes).

## 3. Off-station — `tools/verify-bloom-surface-offstation.mjs`

Six configurations, one per builder arm: DEFAULT (flat), FORMED (cup + curl + roll +
twist), DOMED, CURL FAMILY (bias + start, the `spineLaw` table), BUCKLED, THINNED. The
slot payload comes from `buildWhorlInto`'s own callback, never a synthesised object.

**Clause A — at-station fidelity, tied to the export.** At every station the builder
emitted, `at(u, v)` reproduces the captured mid-surface point under `Object.is`, and the
two skin vertices it implies (`P ± n·t/2`) are found EXACTLY in the emitted position
stream. **3,360 station × column comparisons, 5,600 skin vertices matched, 0 misses.**
Normals compared on every arm but BUCKLED (clause D).

**Clause B — continuity.** `max |P(u+h) − P(u)|` over a ladder that deliberately misses
the builder's stations, at h = 1e-3 / 1e-4 / 1e-5:

| arm | \|dP\| (mm) | ratios | \|dn\| |
|---|---|---|---|
| DEFAULT | 5.316e-2 / 5.288e-3 / 5.286e-4 | 10.1× 10.0× | 0 (the flat normal is constant along u) |
| FORMED | 6.320e-2 / 6.286e-3 / 6.283e-4 | 10.1× 10.0× | 7.8e-3 / 7.8e-4 / 7.8e-5 |
| DOMED | 5.316e-2 / 5.288e-3 / 5.286e-4 | 10.1× 10.0× | 0 |
| CURL FAMILY | 5.316e-2 / 5.288e-3 / 5.286e-4 | 10.1× 10.0× | 1.06e-2 / 1.05e-3 / 1.05e-4 |
| BUCKLED | 6.406e-2 / 6.407e-3 / 6.407e-4 | 10.0× 10.0× | 2.03e-2 / 2.03e-3 / 2.03e-4 |
| THINNED | 5.316e-2 / 5.288e-3 / 5.286e-4 | 10.1× 10.0× | 0 |

Ten-fold per decade on every arm: Lipschitz, no jumps. The `spineLaw` table (CURL
FAMILY) interpolates — its normal shrinks 10× per decade too.

**Clause C — the outline's C0 seams.** `halfWidthAt` is a `Math.max` of shape terms
against two floors and the evaluator reads it, so the surface inherits every slope break.
The detector brackets a jump in the central difference and bisects to the crossover; the
bracket test also fires on a steep SMOOTH taper, so every candidate is then classified by
its one-sided tangents and only genuine breaks are reported (26 of 28 candidates on this
outline were the tip's steep smooth taper, 0.002–0.012° apart — not seams).

| u | one-sided \|dP/du\| left / right | tangent angle | verdict |
|---|---|---|---|
| **0.057939** | 35.58 / 42.30 mm per unit u | **44.54°**, ratio 1.189 | **C0 only** — the root-blend/core crossover. The evaluator inherits it. |
| **0.999562** | 125.65 / 35.00 | **73.73°**, ratio 0.279 | **C0 only** — the cap's terminal ramp meeting the last flat segment (the right slope is exactly `length`: `dh/du` = 0 there). **New; nobody had named it.** |
| 0.800000 | 35.87 / 35.87 | 0.000°, ratio 1.0000 | **C1 — NOT a seam on this tree.** |

`|P(u+e) − P(u−e)|` is 7e-5 to 1.4e-4 mm at e = 1e-6 at all three: the POINT is
continuous everywhere; only the tangent breaks.

**The brief's premise, corrected.** The discovery session measured the seams on the
pre-session-32 tree (NU 28, the linear cap ramp) and named u = 0.058 and u = 0.800.
On the real base u = 0.800 is smooth — the cap law changed — and the second genuine seam
is at u = 0.9996, at the tip, and is the sharper of the two (73.7° against 44.5°). Both
are properties of the shipped outline law, present before the evaluator existed; what
would be a defect is nobody knowing. Recorded, not ruled (Eva's Q4).

**Clause D — the buckled normal, reported not asserted.** At `buckleAmp 0.5, buckleFreq 3`,
the cross-section normal `at(u, v).n` against the EMITTED (lattice) normal: **max 54.74°**.
That is the size of the quantity `trueNormalRows` exists to supply, and it is why the
evaluator does not pretend to own it.

**Negative control** (`--control`): clause A evaluated at `u + 1e-9` fires on every arm
(560 of 560 stations on five arms; 550 of 560 on CURL FAMILY, where the `spineLaw` table's
substeps absorb the offset at ten stations); clause C pointed at a seamless `u` trips the
vacuity guard. Exit 0 on the control by design, with the findings printed.

## 4. The Voronoi cost — `tools/bloom-voronoi-cost.mjs`

**Method.** The real flower page, headless, `flower.js` served with a hook appended
(the quality gate's own mechanism) so the measurement calls the real `resolveParams`,
`buildVoronoi`, `mulberry32`, `SEED_BASE` and `SLAB_THICK`. Per-petal cost is the live
triangle delta at `petalCount` P → P+1 → P+2 (two petals per density, so a core that
scaled with the count would show as two different deltas); that petal's ring points come
from `buildVoronoi` with the added petal's OWN seed (`SEED_BASE + seedIdx·131`, the radial
rosette's law at layer 0, variance 0). Every set is read back. Densities 3..12.

**Result — 20 samples, regression of Δtriangles on ring points:**

```
slope     20.0159 triangles per ring point   <- the emitter's real cost
intercept 3190.7 triangles per petal        <- rim + strands + beads: does NOT port
R^2 0.999836   max residual 125.5 tris
```

The slope is the 20 the discovery read off `addSlab`'s loops, now measured; the
125-triangle residual on a 20-sample fit is the evidence that the seeds matched the
render (a mismatched seed would put noise in the ring count against the delta).

**Where the discovery estimate was wrong, and by how much.** It assumed 30 ring points per
cell (six edges × SUB 5). Measured at density 7: **44 cells, 1,890 ring points — 43 per
cell**, because clipped cells against the margin carry more edges than a free hexagon.
So a petal's slabs are **37,830 triangles at the shipped density**, not 28,800 —
the estimate was **low by 31%**.

| | tris |
|---|---|
| bloom petal today (export, shipped default) | 2,356 |
| bloom, whole, 8 petals | 19,040 (192 not petals) |
| ported Voronoi petal at density 7 | **37,830** = 16.1× today's petal |
| `EXPORT_TRI_BUDGET` (read from bloom.js) | 1,500,000 |
| **largest bloom with Voronoi on every petal** | **39 petals** |
| at density 12 (2,690 ring points) | 27 petals |
| at density 3 (1,270) | 59 petals |

Placed against what the bloom can reach: `petalCount` 3–40 per whorl, up to 6 layers
(240), and the matrix's 240-foot continuous rows. **39 sits above the shipped 8 and just
under one full whorl of 40**; every second layer past 20 + 20 is over, and the dense
continuous head is out by ~6×. **This is a fact about the feature for Eva to rule on
before the port is ever scheduled** — not a tuning problem. Levers that exist, none of
them free: density (3 → 59 petals, still no continuous head), fewer samples per cell
edge (`SUB` is 5 and is the flower's aesthetic), or a coarser bloom sheet under the
slabs. The slab count is fixed-topology (live = export), so the number carries across
modes; the flower's rim and strands (the 3,191 intercept) have no bloom counterpart and
are excluded.

## 5. The two fields, NOT built — the briefs (Eva's Q2, Q3)

Recorded so the day a consumer appears the measurements are here rather than redone.

**Distance to the edge (`d`).** Nothing computes it. What exists is `halfWidthAt(u)`, so
the margin is exact and analytic at `v = ±1`. The free proxy `(1 − |v|)·h(u)` against the
true perpendicular distance to the margin curve, shipping default:

| u | true / lateral |
|---|---|
| 0.10 | **0.705** |
| 0.25 | 0.944 |
| 0.40 | 0.993 |
| 0.60 | 0.906 |
| 0.75–0.98 | 0.89–0.96 |

The proxy overstates edge distance by up to 30% near the base, 4–11% elsewhere. Which
distance matters is the real question: flat-parameter, metric-corrected, and geodesic
agree on a flat build (`|dP/dv|/h` exactly 1) and diverge to **2.236 under max cup** (the
charter records 4.12 under cup + gradient). The bloom's version is easier than the
flower's: the domain is a rectangle (the cleft is a `v`-split, still analytic), so no
jump-flood; and there is no free base edge (the petal continues into the foot). Its only
reader in the flower on a plain petal is a 1e-3 cleft-wall epsilon in space colonisation.

**Flow direction (`T`).** `petalFlowDirection` (flower-geometry.js) is CLOSED FORM on a
plain petal — a blend from the midrib direction at `v = 0` to the margin's own direction at
`|v| = 1`, weighted `|v|^1.4`, with the margin direction from `dw/du`. The bloom owns both
inputs (`v`, and `dh/du` of its own `halfWidthAt`). The port is a twenty-line function,
not a Laplace solve; the flower reaches for `solveLaplaceT` only on a LOBED petal. The
snag is §3 clause C: `dh/du` is the input, and it jumps −10.67 → +39.62 at u = 0.058
(and breaks again at u = 0.9996), so a `T` read straight off it carries a direction
break two rows above the foot. Smooth the derivative, clamp it as the flower does (±3), or
accept it — a ruling for the day `T` has a reader. On a plain petal `T` has none;
`buildVoronoi` reads it only when `cleftCfg && aniso > 1`.

## 6. What this session did not do, by ruling or by scope

- Did not build `d` or `T` (Q2, Q3).
- Did not rule on the seams (Q4) — recorded, both of them.
- Did not touch the ladder, `trueNormalRows`, the panels, or any telemetry.
- Did not run the full STL matrix locally — CI does, on head-merged-into-base.
- Did not re-derive the discovery's C0 finding on the old tree; it re-measured on the base
  and the answer moved (§3).

## 7. Gates run on this tree

- `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 403baf2>` — §2.
- `node tools/verify-bloom-surface-bytes.mjs --base … --rows 6 --control` — both clauses fire.
- `node tools/verify-bloom-surface-offstation.mjs` and `--control` — §3.
- `node tools/bloom-voronoi-cost.mjs` — §4.
- `node tools/verify-bloom-grid.mjs --negative-control` — 585 checks green; NEGATIVE CONTROL
  PASSED, every mutation reddened the clause it named and nothing else. This is the gate
  whose clause 2 re-offsets every captured point and requires it EXACTLY among the emitted
  vertices — the path `rowAt` now feeds.

No frozen phase is owed: no row was added and no byte moved. Adding three tools under
`tools/` makes both FLOWER gates run on this PR; they test flower geometry, not this.

WAITING ON EVA: the merge — the bytes prove the extraction inert; a refactor of the
builder every gate is pinned to still gets her word.
