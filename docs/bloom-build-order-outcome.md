# Is a bloom build a pure function of its definition? — the build-order session

*Sep 29, 2026, on `0488d2b` (#302). The brief is §11 item 3 and §12 item 7 of
`docs/bloom-state-of-play-oct-2026.md`. The instrument is
`tools/verify-bloom-build-order.mjs`; every number below comes out of it or out of a
command named beside it.*

**Verdict, in two halves that must not be merged into one sentence:**

1. **ACROSS BUILDS, NOTHING LEAKS — MEASURED.** The same definition exports the same
   bytes whatever was built before it: six complete orderings of the 970-row live matrix
   in both modes (forward, reverse, two seeded shuffles, live-only, export-only),
   **0 of 1,940 (row, mode) digests differ**, 1,279,751,076 export floats per full pass;
   672 setter→victim pairs and 66 planted throws, every victim bit-identical to its
   fresh-module build. **No frozen baseline is a snapshot of an ORDER**, and the
   inflorescence's "one build, N rigid appends" argument stands on a measurement now
   rather than on the false premise below.
2. **WITHIN A BUILD, `NU` LEAKS FROM THE PETALS INTO THREE OTHER BUILDERS — A REAL
   DEFECT, NOT FIXED HERE.** `NU` is set per petal and never reset, and the leaf blade,
   the stamen/style rod and the sepal angle scan read whatever the LAST PETAL BUILT left.
   A leaf's triangle count follows the PETAL's tip shape: **2,548 → 5,012 triangles per
   leaf at `petalTipShape` ≥ 2.70**, both modes, while its own `leafTipShape` moves
   nothing. Deterministic in the definition — which is exactly why every order agrees and
   why an order test cannot see it (§4).

So the premise as written ("zero module-level mutable state") is **false**, the property
the premise was standing in for ("a build is a pure function of its definition") is
**true**, and the gap between them is a coupling that the brief's Phase C calls a leak.
**The fork taken is the LEAK fork**: the defect is measured and written up, it is not
fixed in this PR, and Phase D (the 28 prose corrections) was not started. The only prose
touched is §11 item 3 itself — the three sentences carrying the premise this session
refuted (§7).

---

## 1. Phase A — inspection, and the prediction written BEFORE Phase B

**The inventory is a static scan, not a grep.** `eslint-scope` over the module scope of
`bloom-geometry.js`, `bloom-registry.js`, `bloom-grid-gltf.js` and `bloom-view-presets.js`,
reporting every module-level binding that is reassigned, has a property written, or is
passed to a mutating method (`push`, `splice`, `set`, `add`, `Object.assign`, …):

| binding | file:line | writes |
|---|---|---|
| `let NU = NU_BASE` | `bloom-geometry.js:3733` | `:7263` only (`petalSurface`) — **never reset** |
| `let RAMP_FORCE_BASE` | `:3769` | `:15404`, `:15406`, `:15436` (finally) |
| `let RAMP_PROBE_STEP` | `:3770` | `:15415`, `:15418`, `:15437` (finally) |
| `let BUDGET_DECISION_ACTIVE` | `:15358` | `:15402`, `:15438` (finally) |
| `const CONTROLS` | `bloom-registry.js:1371` | `.splice` at `:3816`, **at module load, once** (the sepal twins) |

**The audit's four are all of them in the geometry.** Every `Map` / `Set` / memo in
`bloom-geometry.js` is function-local (one, `field.__march` at `:9862`, hangs off a
per-build field object). No `Math.random`; `performance.now()` appears only for the sepal
scan's reported `costMs`. `bloom.js` holds ~40 `let`s (`lastRing`, `lastStem`, …) — that is
the PAGE's read-out state, written after a build returns, and is not the geometry.

**The three flags** are set and cleared inside ONE `try … finally` in `buildBloomInto`
(`:15402`–`:15439`); a nested floret call passes straight through while
`BUDGET_DECISION_ACTIVE` is set. Predicted: never leak.

**`NU`** has these readers (the scan resolves every reference to its enclosing top-level
function):

| reader | lines | runs inside a petal's own `petalSurface`? |
|---|---|---|
| `bladeStations`, `HELD_ROWS`, `SEAM_MAX_STEP`, `seamLatticeStep(Raw)`, `ladderGapFactor`, `ladderWindowCapacity`, `ladderOutsideMinima` | `:3897`–`:6212` | yes, when called from `petalSurface` / `widthProfile` / `buildPetalInto` |
| `petalForm` (`rowsPerCycle` telemetry) | `:7154` | yes (the leaf's call has no buckle, so the line is not reached) |
| `spineLaw` | `:6670` | **no, when called from `rodInto`** — stamens, style |
| `buildLeafInto` | `:13499`, `:13544`–`:13582` | **no** — `cap.rowCapacity: NU` and the blade's own `for (i <= NU)` |
| `widthProfileBlendIsDown` | `:13683` | no (leaf telemetry) |
| `sepalAngleLimit` → `seamLatticeStep` | `:15230` | **no, on the scan's first iteration** (later ones follow the sepal trial's own build) |

**Written before any Phase B build** (`2026-09-29T03:21Z`, on `0488d2b`), verbatim in
substance: *no cross-build order dependence — every `NU` reader in a build is preceded, in
that build, by a `petalSurface` that sets it (the first consumer is either `stemOmission`'s
throwaway petals or the head petals; `footRing`, `stemPlan`, `inflorescencePlan` read none);
forward, reverse, shuffled and mode-interleaved all bit-identical. BUT within a build the
leaf, the rod and the sepal scan read the NU the last petal left — deterministic in the
definition, so Phase B's order comparison stays green and CANNOT see it; measure it
separately.* Phase B confirmed both halves; the measurement that could have contradicted
the first (§2) did not, and the one that could have contradicted the second (§4) sized it.

## 2. Phase B — the order passes

Each pass is PROCESS-CONTINUOUS (module state carries from build to build exactly as in the
page), chunked in 9-minute foreground runs with `--resume` because background work does not
survive a turn here; every entry records its in-process predecessor, so a resumed chunk's
first build is a fresh-module build and counted as such.

```
$ node tools/verify-bloom-build-order.mjs --compare forward,reverse,shuffle1729,shuffle90210,live-only,export-only
1940 (row, mode) keys compared across 6 passes (7760 pairwise comparisons); 9684 of the builds had a predecessor in the same process; 0 builds threw
  forward: 1940 builds, 142,194,564 triangles (1,279,751,076 floats), 21.6 build-min, 3 process start(s)
  reverse: 1940 builds, 142,194,564 triangles (1,279,751,076 floats), 21.9 build-min, 3 process start(s)
  shuffle seed 1729: 1940 builds, 142,194,564 triangles (1,279,751,076 floats), 22.4 build-min, 3 process start(s)
  shuffle seed 90210: 1940 builds, 142,194,564 triangles (1,279,751,076 floats), 22.5 build-min, 3 process start(s)
  live-only: 970 builds, 71,097,282 triangles (639,875,538 floats), 11.0 build-min, 2 process start(s)
  export-only: 970 builds, 71,097,282 triangles (639,875,538 floats), 10.5 build-min, 2 process start(s)

PASS — every (row, mode) digest identical across every pass, positionally, bit for bit.
```

- **Clause 1 (forward / reverse)** and **clause 2 (shuffles, seeds 1729 and 90210)**: 0 differ.
- **Clause 3 (mode interleaving)**: `forward` builds each row live-then-export, `reverse`
  export-then-live, and each is compared against the single-mode passes — 0 differ. So the
  known mode-divergence class (the audit's C9, `headInsideBore` on 2,400 states) is a
  property of the DEFINITION in each mode, not of what the other mode left behind.
- **Every build received a deep-frozen state**: 0 of 9,700 builds threw, so no builder
  writes its input either — the other route to order dependence, whenever a caller reuses
  the object.
- The comparison is a SHA-256 over each stream's IEEE-754 bit patterns plus the triangle
  count, extent and `minThickness` — positional, `-0` distinct from `+0`, as `Object.is`.
- **`frozen/phase45`'s 957 control sets are all rows of this matrix** (matched by set and
  capability, 0 missing), so the newest baseline's definitions are covered directly.
- **The incomplete-pass refusal was seen firing** on a real run
  (`INCOMPLETE: pass export-only is 915/970`) before the pass finished.

## 3. Phase B — the adversary (clause 4)

**Setters** are every state that ramps `NU`, which is also every state that sets
`RAMP_FORCE_BASE` / `RAMP_PROBE_STEP`: the 19 matrix rows whose own tip shape (petal or
sepal) exceeds 2.30 (`ALL MAX` among them — the budget-held case) plus five synthetic
states covering both HELD paths — held by the PREDICTION (baseline 1,188,512, probe
predicting 2,120,352) and held by the BASELINE (1,562,412 at `NU_BASE`, the early return
that skips the probe). **Victims** are 14 states whose builders read `NU` or whose ramp
decision a stuck flag would pin (defaults, one ramp step, serrated leaves, curled stamens
and style, sepals, lobes, an inflorescence, and the first matrix row of each such block
including `SPHERE STEM: THE BARE CORNER`, which builds no head petal at all). Each pair:
build the setter, build the victim, compare against the victim built in a FRESH module
instance with nothing before it.

**Planted throws**: a Proxy state that throws at a point decided by the module's OWN
exports rather than by counting reads — after a ramped petal in the final build
(`bladeRowsFor(3.0) === 112 && HELD_ROWS() === 33`, which leaves `NU` at 112), inside the
baseline trial (`bladeRowsFor(3.0) === 56`, i.e. `RAMP_FORCE_BASE` set) and inside the
probe (`=== 57`, `RAMP_PROBE_STEP` set) — and a throw that lands anywhere else is a VACUOUS
finding. After each, the flags are read back through `bladeRowsFor` and every victim is
rebuilt.

**Result: 672 setter→victim pairs and 66 planted throws (11 runs x 3 kinds x 2 modes), 0
findings; the flags read back `112, 84, 56` after every throw.**

## 4. The finding — `NU` leaks from the petals into three builders

The order passes cannot see this and say so in the tool's header: a reader that takes the
`NU` a previous petal IN THE SAME BUILD left gets the same value in every order. It needs
its own instrument — `--coupling`, which decouples a temp copy of the module (each reader
pinned to its OWN value: `NU_BASE` for the leaf blade and the rod, whose parts have no apex
ramp; `bladeRowsFor(sepalTipShape)` for the sepal scan) and compares the whole matrix, both
modes, positionally. **The decoupled copy is a measurement, never a fix**; it is written to
a temp directory and deleted.

### 4a. The leaf — the row count doubles

`buildLeafInto` builds the blade on `NU` uniform rows (`:13544`) and hands `widthProfile` a
`rowCapacity: NU` (`:13499`). A leaf is built after the head petals, so both are the LAST
HEAD PETAL's. `DEFAULTS + stemLength 60 + leafLength 40 + leafNodes 3`, one build per cell:

| `petalTipShape` | bloom tris (live = export) | per-leaf tris | `HELD_ROWS()` after |
|---|---|---|---|
| 1.70 (shipped) | 34,440 | **2,548** | 16 |
| 2.30 | 34,440 | 2,548 | 16 |
| 2.35 | 38,276 | 2,856 | 18 |
| 2.50 | 49,784 | 3,780 | 25 |
| 2.70 | 65,128 | **5,012** | 33 |
| 3.00 | 65,128 | 5,012 | 33 |

And the leaf's OWN tip shape moves nothing: `leafTipShape` 0.60 and 3.00 both read 2,548 at
petal 1.70. **So a leaf control does not decide the leaf's lattice and a petal control
does** — one control reaching into another part, the registration violation this project
has unpicked many times, arriving through module state rather than through an argument.
Called directly with identical arguments after two different primers
(`buildLeafInto(acc, plan, state, 0, az)` after a 1.70 bloom and after a 3.00 bloom): 22,932
floats against 45,108, both modes, tooth depth 0 and 0.4 alike.

- **CLAUDE.md's "2,548 triangles a leaf, FIXED — the lattice does not vary with size" is
  therefore false above `APEX_NU_BAND[0]`.** The worst reachable is 24 leaves (whorled x 8)
  x +2,464 = **+59,136 triangles**.
- **The budget decision is consistent with it, by accident rather than design**: the probe
  build's leaves also read `NU_BASE + 1`, so the predicted total includes the leaves' extra
  rows. The ramp remains "budget-gated for the whole bloom".
- **The surface is the same curve sampled more finely** (uniform stations in `u`), so the
  picture is a finer leaf, not a wrong one — the defect is the coupling and the cost.
- **No matrix row reaches it.** No row pairs leaves with a ramped tip shape (the matrix
  varies one control at a time, and `ALL MAX` never builds leaves). Whether the LF family or
  either STL gate would react to it is **not measured here**.

### 4b. The stamens and the style — ulp-scale

`rodInto` → `spineLaw` integrates on `N = NU * SPINE_SUBSTEPS` substeps (`:6670`), so the
rod's integrator resolution follows the last petal's `NU`. Same call, same arguments, after
a 1.70 primer and after a 3.00 primer: **1,500 of 5,040 floats differ at stamen curl 0
(worst 9.73e-13 mm), 2,160 at curl 90 (3.02e-14 mm); the style at curl 90, 4,542 of 8,640
(1.60e-14 mm)**, both modes; 1.70 against 1.70 again, 0. Sub-nanometre, and still bytes.

### 4c. The sepal angle scan — latent

The scan's first `seamLatticeStep` reads `SEAM_MAX_STEP() = NU - HELD_ROWS()` from the head
petals (40 at `NU_BASE`, 79 at 112). It only matters where a sepal's seam step exceeds 40
lattice rows; measured, the drawn limit reads **21° under head tip 2.30 and 21° under 3.00**
on `DEFAULTS + 5 sepals`, and no matrix row moves.

### 4d. The matrix partition

```
$ node tools/verify-bloom-build-order.mjs --coupling            (four --range chunks, both modes)
coupling: 970 rows compared, shipped against decoupled; 1 carries the coupling
  638 TIP SHAPE: x the whole centre (stamens and a style under a round tip):
      live   92,760 of 742,896 floats, worst 2.096e-12 mm · export identical figures
```

**1 of 970 rows, 969 identical to the bit** — the one row whose petals ramp and which also
builds a rod. `ALL MAX` holds because its ramp is budget-held: the final build is the
baseline, at `NU_BASE`, for every part.

### 4e. Instrument-side, recorded

`tools/bloom-harness.mjs:1586`, `:1651` and `:1847` call `ladderWindowCapacity` /
`ladderGapFactor` in Node after a Node rebuild, so they read whatever `NU` that rebuild's last
`petalSurface` left (the head's, since `neighbourFlag` runs one last). Consistent on every
row today; latent the day a harness clause asks about a part whose own `NU` differs.

## 5. The controls — the instrument can fail

`--control` plants a leak in a temp copy of the module and runs the SHIPPED
`comparePasses` and `adversary` against it; it refuses an anchor that does not match exactly
once and a plant that does not move a victim. Both were seen refusing before they were seen
passing — the first `flag-sticky` plant broke the victim ITSELF (its own trial left the flag
set) so fresh and after-setter agreed, and the tool said `REFUSED … a vacuous plant proves
nothing`; the second held the ramp only by prediction, and it refused again until the
setter was the baseline-held synthetic.

```
$ node tools/verify-bloom-build-order.mjs --control nu-sticky
plant nu-sticky: witness — victim after setter 4550c442… (47984 tris) against fresh 1c7dfd30… (24688 tris)
order comparison on the planted module: 2 key(s) DIFFER
  3:live "": forward 10e945c4… (47984 tris) after 2:export  vs  reverse 9365675d… (24688 tris) after 3:export
  3:export "": forward 4550c442… (47984 tris) after 3:live  vs  reverse 1c7dfd30… (24688 tris) after (fresh)
adversary on the planted module: 12 finding(s)
  DEFAULTS (live) after synthetic: petalTipShape 3.00: 10e945c4… 47984 against fresh 9365675d… 24688
  …
CONTROL OK — the planted nu-sticky leak turns BOTH the order comparison and the adversary red.

$ node tools/verify-bloom-build-order.mjs --control flag-sticky
plant flag-sticky: witness — victim after setter 1a60bef6… (24688 tris) against fresh 3e3ae532… (36336 tris)
order comparison on the planted module: 6 key(s) DIFFER
adversary on the planted module: 18 finding(s)
  synthetic: petalTipShape 2.35 (one ramp step) (live) after synthetic: ramp HELD by the baseline (early return): … 24688 against fresh … 27600
  VACUOUS: "after a ramped petal, in the final build" did not throw
  …
CONTROL OK — the planted flag-sticky leak turns BOTH the order comparison and the adversary red.
```

(The `VACUOUS … did not throw` lines under `flag-sticky` are the throw clause working: with
`RAMP_FORCE_BASE` stuck no petal ever reaches 112, so the throw's condition never holds and
the tool says so rather than passing.) `--coupling` has its own positive evidence: the
decoupled copy moves row 638 and the direct calls in §4a/§4b move by the amounts shown.

## 6. What fixing it would cost — costed, not done

- **The change** is three reads, each given its own owner: the leaf blade's row count and
  capacity, the rod's integrator resolution, and the sepal scan's seam step. Pinning them as
  the `--coupling` copy does is the obvious shape; whether the leaf SHOULD gain an apex ramp
  of its own (it has its own `leafTipShape`) is a ruling, not a measurement.
- **Byte partition, predeclared from §4d**: 1 of 970 live rows moves (row 638, at most
  2.1e-12 mm, triangle count unchanged), 969 hold. No leafed row moves because no row reaches
  the leaf coupling — so a fix wants a **witness row** (leaves x `petalTipShape` 3.00), which
  adds a row, which **owes a frozen phase**.
- **The instrument would prove it**: `--coupling` against the fixed tree reads 0 rows by
  construction, and the order passes must stay green.

## 7. The prose touched, and what was left

§11 item 3's three sentences — the only ones this session's measurement settles — now say
what is true: `CLAUDE.md` (the inflorescence block's "ZERO module-level mutable state"),
`docs/bloom-inflorescence-discovery.md:95` and `docs/bloom-inflorescence-outcome.md:20`. The
other 27 items of §11, and the `CLAUDE.md` sentence "2,548 triangles a leaf, FIXED", were not
touched: the leak fork stops before Phase D, and the leaf sentence belongs with the fix.

## 8. What this does NOT show

- **Node's V8 only.** That Chromium agrees is X0's claim, not this tool's.
- **The export stream only.** The builder's returned record is not compared (it carries
  wall-clock timings by construction).
- **The matrix and the adversary's 11 synthetic states are the coverage.** A state no row visits is built
  only if it is one of the adversary's.
- **It does not run in CI.** Wiring it in is a workflow edit, which this session was told
  not to make; it is Node-only and a full ordering is ~22 build-minutes on this box.

## Reproducing

```
node tools/verify-bloom-build-order.mjs --pass forward --out f.json [--resume --limit-s 540]   # likewise reverse, live-only, export-only
node tools/verify-bloom-build-order.mjs --pass shuffle --seed 1729 --out s1.json [--resume]
node tools/verify-bloom-build-order.mjs --compare f.json,r.json,s1.json,s2.json,l.json,e.json
node tools/verify-bloom-build-order.mjs --adversary [--only-setters <re>] [--only-victims <re>]
node tools/verify-bloom-build-order.mjs --coupling [--range a:b --out c.json --resume]
node tools/verify-bloom-build-order.mjs --control nu-sticky | flag-sticky
```
