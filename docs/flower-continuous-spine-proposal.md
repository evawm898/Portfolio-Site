# The petal spine as one continuous member — discovery and proposal

**Discovery and proposal only. No geometry path is touched on this branch.** The only code
change is to the measurement harness (`tools/probe-junction.mjs`): new report sections over
data it already records, two validity fixes it turned out to need, and two sweep rows. What
follows is measured against `main` at `d6f237d` (PR #101 and #102 both merged).

Working model, per the reframe: the petal spine is **one continuous member from petal tip to
stem**. The blade is the widened part of a strand that was continuous the whole way. The two
margin strands converge into the spine over a controllable distance. Below the blade the
spines descend and merge into a shared trunk that thickens as each one joins. Governing rule:
**trunk cross-sectional area at any height ≥ the sum of the areas of the spines joined above
it**. Radius follows from area, not from a slider.

---

## 0. Premises verified before anything was built on them

- **The A/B rig is on `main`.** `?junctionLaw=` and `?junctionProbe=1` are wired at
  `flower.js:312–322` and consumed at `flower.js:2406–2411`; `docs/tools/measure-junction-rim.mjs`
  and `tools/probe-junction.mjs` are both in the tree. `measure-junction-rim.mjs --self-check`
  passes all nine estimator assertions (true cylinder A_k 1.13e-15; three known flutes within
  2%; small-radius coverage 1.000; staircase M separation). No measurement tooling was rebuilt.
- **#101 checked as BOTH an issue and a PR.** It is a merged **pull request** — the junction
  A/B rig and the rejection record for three approach laws. There is no issue #101. PR #102's
  own body carries the refuted premise ("There is no issue #101. The tracker's highest is
  #100") — it had checked issues only; issues and PRs share one number sequence.
- **PR #101 is a rejection record, not a proposal.** Its artifact was read in full. Laws A
  (`arearun`), B (`spacing`), C (`loft`) were measured and **rejected by eye**; law C's
  A_k 0.0056 is evidence of the rejection (the smooth skin), not a recommendation. A_k is a
  description; it is not adopted as an objective anywhere below.
- **`Rtrunk = 0.0387` vs `stemR = 0.0672` on the default** — verified by the probe (§5).
- **`marginFlareFactor(0) = 0`** — verified in source *and* strengthened: `flareStart =
  lerp(0.02, 0.20, bundleTightness)` (`flower-geometry.js:688`) is ≥ 0.02 for every slider
  value, so the collapse of both margin strands onto the midrib foot is **structural at every
  setting of every control**, not a property of the defaults (§3).
- **The equivalent-area ratio 1.25** — verified as the *radius* ratio √(π/2) = 1.2533 at
  `thickScale = 1`, and found to **drift with thickScale** (§1).

### Harness validity — what it took to trust these numbers

Running the same tree twice caught the merged probe measuring the wrong designs: its fixed
220 ms wait raced the async rebuild, and on the second run the `preset: Daisy` and
`preset: Poppy` rows silently measured the **shipped default** (9/3 feet instead of 54/18 and
18/6) while every validity assertion passed — the cap census reconciles fine against the wrong
design, and preset rows had **no read-back at all** (V3 only checked that the gallery cell
exists). Both fixed in this branch's probe: waits are on the app's own `#building` signal, and
preset rows read back every id the preset sets from `__flowerUIState`. The final run has all
validity assertions holding, all presets verified taken, and `--negative-control` failing as
required (`V4 known-bad: detector reported 30 lathe segments after the lathe was removed`).

Report additions (no new instrument — printed from data the probe already recorded): arrival
geometry from **true chain ends** (the bezier's P3, not `runRise`'s lowest-sample point, which
on elevated coiled designs is a mid-flight dip); the area law down the descent read from the
recorded lathe caps; per-row print-floor diameters both sides of the foot; arrival-end
clearance vs the blend radius; and a control classification (skeleton+k signature × live
tris). mm figures below use the **floor-derived export scale** (`activeMMPerUnit =
floorMM / (2 · floorR)` = 32.5 mm/unit on the default), which is the scale the STL is written
at — the probe's older gap table used a rough span-derived scale ~3× larger, and PR #102's
gap quotes are in that older scale.

---

## 1. Cross-section: every producer, and what one owner would require

The spine's cross-section is set in **four places with no shared owner**:

| where | producer | cross-section |
|---|---|---|
| blade, midrib | `buildVenation` w0 = `VEIN_MIDRIB_BASE` = 1.00 → `acc.addRibbon` (`flower.js:1486`) | **flat ribbon**, half-width `tubeRadius·1.00`, half-thickness `tubeRadius·LAMINA_HALF(0.5)·thickMul` |
| blade, margins | `ribRadius(u, P, true)` (`flower-geometry.js:719`) → `acc.addTube` | **round rod**, r = `tubeRadius·lerp(0.62, 0.12, u)·gThick` |
| foot hand-off, midrib | `flower.js:1412` | **round rod**, r = `tubeRadius·1.00·gThick` |
| descent | `buildGatherSkeleton` bezier caps (`flower-sdf.js:190`), radius = foot radius, constant | round rod, unfloored |

Measured/derived numbers, default (`tubeRadius` 0.0168, `thickScale` 1):

- Midrib ribbon area at the foot = (2·0.0168)·(0.0168) = **5.64e-4 u²**. The rod handed to
  the SDF at `flower.js:1412` has area π·(0.0168)² = **8.87e-4 u²** — the rod's radius is
  **√(π/2) = 1.2533×** the ribbon's equivalent-area radius. That is the brief's 1.25.
- The mismatch is not constant: rod area scales with `gThick²`, ribbon area with `gThick`
  (thickness carries `thickMul ∝ gThick`, width does not). Rod/ribbon area = (π/2)·gThick:
  **0.79× at thickScale 0.5, 1.57× at 1, 3.14× at 2.5** — the second producer disagrees with
  the first by an amount a *petal* control silently steers.
- Worse than either: the three coincident chains below each foot **field as one rod of the
  largest radius**. `smin` of coincident capsules is their pointwise min = the fattest
  (the midrib, r 0.0168); the two margin rods (r 0.010416 each) contribute **zero** area.
  Feeds per petal (as rods): π(2·0.010416² + 0.0168²) = 1.569e-3 u². Continuation carried:
  8.87e-4 u² = **57% of what feeds it**. The governing rule is violated at the very first
  merge — the foot — before the descent even starts. (Six of the nine chains are duplicate
  geometry: the two margin chains per petal are byte-coincident; the midrib chain shares
  their path at a larger radius.)

**What one owner and one transition law require.** A single producer — call it
`spineSection(part, u)` beside `ribRadius` in `flower-geometry.js` — that returns the
cross-section spec for every station of the member: ribbon (w, t) inside the blade, round r
below the foot, with the handoff defined by **area equivalence**: r_foot = √(A_foot/π), where
A_foot is the *sum* of the areas of the strands converging there (midrib ribbon + two margin
rods — at defaults r_foot = √(1.569e-3/π) = **0.02234 u = 1.33·tubeRadius**, vs today's
0.0168). All four sites above read it; none re-derives it. The transition (ribbon flattens
into rod) happens over a stated span below the foot, area-preserving at every station. The
export floor applies to the member through **one code path** on both sides of the foot (§2).

## 2. Print floor: the same member is floored on one side of the foot and not the other

At export, `MeshAccumulator._floorRadius` (`flower.js:429–435, 468`) lifts every petal-side
tube to `floorR`. The descending continuation of the *same strand* is never floored:
`opts.floorR` is passed into `buildReceptacleField` (`flower.js:2405`) and **read nowhere** in
`flower-sdf.js` (grep: zero occurrences past the recorder's argument list).

Measured (probe, floor-derived export scale, SLS floor Ø 1.00 mm):

| config | petal side exports Ø | continuation Ø | verdict |
|---|---|---|---|
| default & every preset | 1.00–1.09 mm | **0.68–1.09 mm** | margins BELOW FLOOR (0.68) |
| thickScale 0.50 | 1.00 mm | **0.34–0.55 mm** | far below floor |
| thickScale 2.00 | 1.35–2.18 mm | 1.35–2.18 mm | above floor |
| process sla (floor Ø 0.40) | 0.40–0.44 mm | **0.27–0.44 mm** | margins below floor |

**Telemetry reports a floor that was not applied — the line is `flower.js:2412`:**
`if (exportMode && acc.floorR < acc.minRadius) acc.minRadius = acc.floorR;` with the comment
"keep min-feature telemetry honest". It stamps the floor into the thinnest-feature readout for
a mesh the floor never touched. Three more claims of the same nonexistent flooring:
`flower.js:2403–2404` ("Floor radii even live … export floors anyway"), `flower-sdf.js:13–14`
("Print floor is honored by flooring every capsule radius before the field is built"), and
`flower-sdf.js:290` ("the field already encodes the print floor"). The one true comment is
`flower-sdf.js:82–85`, which says the radii are deliberately unfloored and printability is "a
final-mesh check" — a check that does not exist either. Under the proposal the floor is a
property of the member (one owner, §1), applied at export on both sides by the same path.
One caveat found in passing: `acc.floorR` in a **live** build predates the process-floor
refresh (`setFloorMM` runs on export), so the recorded live `floorR` always reflects the
previous process — visible in the probe's `process sla` row.

## 3. Margin convergence: what controls it, over what range, measured on both sides

Verified: `marginFlareFactor(0) === 0` at **every** slider setting (flareStart ≥ 0.02), so
each petal's three strand roots coincide and the shipped default has **3 distinct feet, not
9** (probe: 9/3 on every default-design row). What controls the convergence *inside* the
blade: `bundleTightness` moves the flare start over u ∈ [0.02, 0.20]; `flareRate` moves the
flare span over [0.55, 0.12] (`flower-geometry.js:685–692`). No control opens the feet.

Which side of the foot each junction-cluster control acts on, **by measured effect** — probe
classification, DEFAULT design, fresh page per row. Instruments: (a) skeleton+k signature
(every recorded cap position/radius plus the blend radius k) — blind to the rendered blade,
the stem lathe's tessellation, the field cell, and all non-SDF geometry; (b) whole-model live
triangle count — sees everything, attributes nothing. A "same/0" row is inert *within what
those two can see*, no further.

| control (id) | skeleton+k | Δtris | acts |
|---|---|---|---|
| `gatherHeight` 0.05/0.60 | MOVED | +20/−228 | below the foot |
| `buttonSize` 0/1 | MOVED | +8/+136 | below the foot |
| `absorption` 0/1 | MOVED (k) | −1856/+1416 | below the foot (field blend) |
| `receptacleDepth` 0/1 | MOVED | −392/+360 | below the foot |
| `receptProfile` gentle/dome | MOVED | −512/+224 | below the foot |
| `thickScale` 0.5/2.0 | MOVED | −2988/+868 | both sides (foot radii scale) |
| `bundleTightness` 0/1 | same | **+12564/−2764** | **inside the petal only** |
| `flareRate` 0/1 | same | **−2200/+6088** | **inside the petal only** |
| `blendSmoothness` 0/1, bare | same | 0 | inert here |
| `blendSmoothness` 0/1, +stem | MOVED (stem) | +4828 both, **0 between** | inert on this design even stemmed |
| `convergenceTightness` 0/1 | same | 0 | inert under cm=ON (matches #101) |
| `process` sla | same | 0 | export-only (floor), no live/skeleton effect |

Notes. `bundleTightness`/`flareRate` carry `role:"junction"` in the registry and move zero
junction geometry — the registry tag is measured false; they are petal controls (the skill's
three-way junction/ornament/**petal** split). `blendSmoothness`'s one live path under cm=ON
is the stem lathe's sector count `M = clamp(round(rimFeet·lerp(11,7,blend)), 40, 120)` with
`rimFeet` counting **petals** (`flower.js:2179–2183`): on the 3-petal default 3·11 = 33
clamps to 40 at both ends, so it is inert *even with a stem* here — the +stem rows exist in
the sweep precisely because the bare rows cannot see that path; #101 measured it live on
Lily (6 petals, 94,884 → 92,532). The skeleton instrument saw none of that; the tris
instrument did. Neither instrument can see an effect that changes only export tessellation
or field smoothing — those are stated blind spots, not cleared suspects.

## 4. Arrival geometry: every spine arrives at one height, by construction — measured

`buildGatherSkeleton` pins every strand's endpoint to `P3 = [.., yArrival, ..]` on one circle
(`flower-sdf.js:104, 178`). The probe now measures it from the true chain ends: **endY spread
is 0.0e+0 on all 31 rows** — the shipped default, every preset, every sweep row. The entire
shipped configuration space is the single-height fat-knot arrival the reframe calls a stress
concentration; nothing staggers, so there is no "running area sum down the descent" — the sum
is a step from 0 to ΣA at `yArrival`.

Per-preset arrival (floor-derived scale; drop = feet→arrival, descent = arrival→stem):

| config | distinct spines | drop mm | descent mm | arrival radius u | worst end-to-end margin k−gap (u) |
|---|---|---|---|---|---|
| DEFAULT bare | 3 | 0.79 | 9.79 | 0.0521 | **−0.0372 (CLEAR — free ends)** |
| DEFAULT + stem | 3 | 1.62 | 19.99 | 0.0521 | **−0.0372** |
| Daisy | 18 | 0.79 | 9.79 | 0.1275 | +0.0155 (touch) |
| Rose | 23 | 0.61 | 7.57 | 0.1442 | +0.0096 (touch; min gap −0.0016, overlapping) |
| Lily | 6 | 0.79 | 9.79 | 0.0736 | **−0.0138** |
| Poppy | 6 | 0.79 | 9.79 | 0.0736 | **−0.0138** |
| Dahlia | 33 | 0.55 | 6.81 | 0.1727 | +0.0225 (touch) |
| Thistle | 39 | 0.00 | **−1.78** | 0.1877 | +0.0193 (touch; min gap −0.0053) |
| Carnation | 8 | 0.67 | 8.26 | 0.0850 | −0.0154 (ends clear; 2 of 8 chains orphan) |

Thistle is degenerate as shipped: mean foot height sits **below the stem top** (yFeet 0.1512,
yStem 0.2060, vspan clamped to its 1e-3 floor), so the arrival plane is 1.78 mm *beneath* the
neck and the descent interval is empty — the AREA LAW table's "min lathe r" has no station to
sample. It ships connected because 39 crowded chains graze each other and the lathe.

## 5. The gap below the last join: two regimes, and today's trunk breaks the rule mid-descent

`stemR = P.tubeRadius · 4.0 · stemThickness` (`flower.js:2809`) — a slider-scaled constant,
never derived from what feeds it. `Rtrunk = √Σr²` over the feet. Measured, with the trunk's
actual radius profile read from the recorded lathe caps over the descent:

| config | Rtrunk (u) | stem/trunk area | min trunk r / Rtrunk over descent | Ø trunk / Ø stem mm |
|---|---|---|---|---|
| DEFAULT | 0.0387 | **3.02** | 1.346 | 2.52 / 4.37 |
| thickScale 0.50 | 0.0193 | **12.06** | 1.350 | 1.26 / 4.37 |
| Lily / Poppy | 0.0547 | 1.51 | 1.228 | 3.56 / 4.37 |
| Carnation | 0.0632 | 1.13 | 1.064 | 4.11 / 4.37 |
| Daisy | 0.0948 | **0.50** | **0.709** | 6.16 / 4.37 |
| Rose | 0.1072 | **0.39** | **0.628** | 6.97 / 4.37 |
| Dahlia | 0.1284 | **0.27** | **0.525** | 8.34 / 4.37 |
| Thistle | 0.1395 | **0.23** | n/a (degenerate descent) | 9.07 / 4.37 |

The brief's default pair (0.0387 vs 0.0672) verifies, and the default's stem is 3.0× the area
of everything feeding it. But the sign flips across the shipped presets: on Daisy, Rose and
Dahlia the trunk **narrows to 0.53–0.71× the area-rule radius mid-descent** — the shipped
neck law `lerp(swell, stemR, t)` tapers *toward* an undersized stem, so the trunk is thinner
than what feeds it for most of the descent, today. What the trunk must do between the last
join and the stem is therefore **a separate law from the merge rule**: above the last join
the area rule is an invariant; below it the trunk root (r = √ΣA/π) must couple to a stem
whose size is a user choice that can be either 3× too big or 4× too small. §"Open questions"
puts the two candidate couplings to Eva.

## 6. Gate coverage: the connectedness gate cannot see this failure class — plainly stated

`tools/verify-connectedness.mjs` voxelises the export and flood-fills: it counts **detached
bodies**. A spine that stops short of the trunk is still attached to its petal above, so it is
one connected body with a dangling end — the gate stays green (the skill records exactly
this: "connectedness counts detached bodies; it does not see free ends"). No row exercises a
state where spines fail to reach the trunk, and no row *can* today: the shipped construction
pins every P3 analytically onto the lathe surface, so the hazard state is unreachable until
the lathe goes. The states that would fail are already named by the probe: the bare default
(3 spines, gaps 4.23–6.85 mm span-scale ≈ 1.4–2.3 mm export-scale beyond k), Lily/Poppy (6),
Carnation (2 of 8) — and they include **the shipped default**, the same blindness-by-
construction the gate's own header records for #84. The implementation phase therefore needs
a **free-end assertion** (the probe's orphan measure promoted to a hard gate, run against the
new construction), plus connectedness rows for the low-count configs, added and seen **RED
against the candidate law before the fix lands** — the A/B seam (`?junctionLaw=`) exists so a
red gate can run against `junctionLaw=spine` while `current` stays green, no red-on-main
window at all.

## 7. Against #101's three rejected laws

- **Law A — area rule at every station (`arearun`)**: re-derived each station's radius from
  what remained after merging spokes on the way in. Rejected: "the wheel thins into a few
  thick arms; a lumpy band survives at the feet" — and it never got close on A_k (0.28
  exported). **The proposal shares half its mechanism — members merge on the way in — and
  that must be said, not renamed.** The differences: (1) law A merged material inside the
  horizontal 38:1 spoke wheel at effectively zero descent, so the merge products were radial
  arms in a disc; the proposal reshapes the path first (a real descent, staggered joins along
  it) and merges *there*; (2) law A kept the lathe underneath — its arms still landed on a
  skin; the proposal's members end on each other topologically; (3) law A's objective was
  A_k; the proposal's is the area invariant plus zero free ends, with A_k reported only as a
  description. Whether staggered Y-joins *look* grown or look like law A's arms is exactly
  the judgement A was rejected on, so the proposal's first deliverable is the same contact
  sheet at the same camera, ruled by eye — not a number.
- **Law B — spacing-scaled union (`spacing`)**: inflated the field blend k with spacing so
  spokes fused. Rejected: fatter spokes, then a blob, at 5.65× triangles. The proposal does
  not share this: k stays `absorption`-driven and constant; joins are skeletal (shared
  endpoints), not field inflation. The clearance table in §4 is the evidence that
  k-vs-spacing is exactly the coincidence to *stop* relying on, not to scale up.
- **Law C — one lofted skirt (`loft`)**: replaced members with a revolved surface; A_k
  0.0056 at every petal count; rejected as the smooth skin that *is* the defect (terraced,
  +87% junction triangles). The proposal is the structural opposite — discrete members at
  petal thickness the whole way, petal-frequency variation intended. It shares nothing with
  C except the ambition to delete the spoke wheel.

---

## The proposal

**The construction.** One member per petal, defined tip → stem:

1. **One cross-section owner.** `spineSection(part, u)` in `flower-geometry.js` (beside
   `ribRadius`/`ribCenterline`, the registration-rule precedent): ribbon spec inside the
   blade, round below, area-equivalent at the handoff, export floor applied by the one owner
   on both sides. The `flower.js:1412` rod hand-off and the SDF's constant-radius bezier both
   become readers.
2. **Margin convergence stays a petal affair.** `marginFlareFactor` already converges the
   margins onto the spine over a controllable distance *inside* the blade —
   `bundleTightness`/`flareRate` keep exactly that meaning (re-tagged `role:"petal"`, which
   is what the measurement says they are). At the foot the three strands become **one**
   member whose area is their sum (r_foot = 1.33·tubeRadius at defaults, vs 0.0168 today) —
   ending the 57%-area collapse and the six duplicate chains.
3. **Staggered pairwise joins.** Below the foot, members descend and merge
   nearest-neighbour-pairwise over the descent span — the merge tree `flower.js:2346–2354`
   and `flower-sdf.js:5–9` have *described* since before the SDF path existed while the code
   builds beziers-to-one-plane instead (both comments are false today, as is
   `flower.js:2386`'s "no lathe and no stitching" over a 30-segment lathe). Each join is a
   Y-node: two children **share an endpoint** with the parent (gap 0 by construction), area
   rule `r_p² = r_a² + r_b²` per join, tangent-continuous. N spines → N−1 joins spread over
   the descent; join heights derived from azimuthal adjacency (deterministic, no RNG). The
   arrival-height spread — 0.0e+0 everywhere today — becomes a *measured nonzero design
   property* instead.
4. **The trunk is the last member.** Its area at any height is the running sum by induction;
   nothing about it is a slider. Below the last join a **stem coupling zone** tapers the
   trunk root into the user-sized stem (see open question 1 — this is the one place the
   governing rule needs a stated boundary).
5. **The lathe is deleted as a structural member.** What makes spine contact a
   CONSTRUCTION rather than a coincidence: connectivity becomes **topological** — every
   member terminates at a node shared with its sibling (clearance is not a margin but an
   identity, gap = 0; overlap at each node ≥ the parent radius before smin smoothing).
   Today's contact is the field bridging chord gaps at a shared circle, and the measured
   worst-end margin k−gap spans **−0.0372 u (default: free ends) to +0.0225 u (Dahlia)**
   across shipped configs, flipping sign inside the preset set and sitting at +0.0009 u —
   0.03 mm — on `thickScale 0.50`. That is the coincidence of spine count, quantified.
   `receptProfile`'s silhouette survives as a modulation on the coupling zone + trunk
   *subject to the area floor* (a profile may add material, never cut below √ΣA).

**Triangle budget estimate (rule 1 of the working agreement).** The junction field today is
31,648 live / 103,964 export tris on Daisy (#101's table). The skeleton this construction
fields is *smaller* than today's (one member per petal instead of three coincident chains —
570 caps → ~200 on Daisy; no 30-segment lathe; N−1 join beads), so the polygonised field
should land at or below today's counts; law A, the nearest relative, measured −1.8% on
Daisy's STL. The commitment stands: per-config live+export triangle counts and STL sizes in
the implementation PR's change report, before/after per preset.

**Controls — survive / rename / retire (real ids).**

| id | disposition |
|---|---|
| `bundleTightness`, `flareRate` | survive unchanged; registry `role` corrected `"junction"` → `"petal"` (measured, §3) |
| `absorption` | survives — the field smoothing at joins; label/hint unchanged |
| `gatherHeight` | survives, remapped: from "depth of the one arrival plane" to "span over which the joins complete"; default maps to current spread; label becomes MERGE SPAN, hint rewritten |
| `receptacleDepth` | survives unchanged (descent depth) |
| `receptProfile` | survives as ornament modulation floored at the area rule (open question 2) |
| `buttonSize` (label "Neck swell") | **retire** — it scales a swell at an arrival circle that no longer exists; its default 0.05 is already ≈ the area rule (swell/trunk area 1.07 measured). RETIRED_IDS entry at the schema bump + migration that deletes the key |
| `blendSmoothness`, `convergenceTightness`, `receptacleType` | untouched — cm=OFF/ornament territory; `blendSmoothness`'s stem-tessellation life and `receptacleType`'s pending migration belong to the base-ornament work (registry row for `receptacleType` already says so) |
| `thickScale`, `stemThickness` | survive; note `thickScale` is clamped [0.4, 2.5] in `flower.js` vs slider [0.5, 2] (#102's finding, still true) |

No new control is required for default behaviour; if a stagger control is wanted later it
arrives defaulting to the derived join schedule. **RETIRED_IDS checked:** it holds only
`reliefAmp`/`reliefFreq`/`reliefMode` (schema 19). #101's dropped law parameters
(`mergeOrder`, `spacingBeta`, `loftWall`) appear nowhere in the merged tree, the registry,
DEFAULTS, markup, or any persistence surface — verified against PR #101's full merged diff;
they were `opts` names on intermediate commits of a squashed branch and were never
persistable, so no reservation is needed.

**Migration & presets.** This change cannot be byte-identical (the lathe goes), so per the
working agreement: schema bump 19 → 20, a migration that deletes `buttonSize`, and a
**per-design change report** (every preset + the default, live/export tris, STL bytes,
contact sheet before/after). No preset *key* changes meaning, so preset deltas in
`flower-presets.js` do not move; thumbnails regenerate via `gen-preset-thumbs` with the drift
manifest, and all three geometry gates cover every preset by name automatically. A saved
design that today exports with free-ended continuations is broken, not an aesthetic choice —
fixed by the new construction, said in the migration note, never pinned (the skill's
migration-pin rule).

**Verification plan for the implementation phase** (stated now so the proposal is testable):
build behind `?junctionLaw=spine` beside `current`; free-end gate + low-count connectedness
rows RED against `spine` before the fix, green after; `verify-flower-export` (zero boundary
edges) and `verify-geometry-quality` across the matrix; arrival-spread and area-law numbers
from this probe re-run against `spine`; the same two contact sheets #101 used, ruled by eye.

---

## Open questions for Eva (batched, each with a recommendation)

1. **Stem coupling when the spines out-feed the stem** (Daisy 0.50×, Rose 0.39×, Dahlia
   0.27×, Thistle 0.23× stem/trunk area): may the trunk narrow into the stem below the last
   join? **Recommend:** yes — scope the area rule to the merge region and let a stated
   coupling law taper trunk root → stem (real peduncles narrow; the stem stays yours to
   size). *Runner-up:* floor the stem radius at the trunk root (stem becomes partly derived —
   Daisy's stem grows from Ø 4.37 to Ø 6.16 mm; visible silhouette change, change report
   required). Note either way: nothing here has ever been printed, so "the narrow stem snaps"
   is an assumption with no coupon behind it.
2. **`receptProfile`**: keep as ornament modulation floored at the area rule (**recommend** —
   DOME/URN/FLARE keep meaning, can only add material), or retire it with the lathe
   (*runner-up* — purist, but deletes a shipping look and costs a retirement+migration).
3. **Join look**: staggered pairwise Y-joins (**recommend** — the "grown" reading the area
   rule exists for, and the reframe's stated intent), or all joins at one derived trunk-top
   (*runner-up* — closest to today's silhouette, but is precisely the single fat knot the
   brief flags, and §4 shows every shipped config is already that today). Law A's rejection
   says the eye rules here; the contact sheet decides, not this document.
4. **Floor the descending member at export** (it is the same strand — **recommend**, with the
   area handoff so the floored member stays ≥ what a floored blade feeds it), or keep the
   descent unfloored and only report it (*runner-up* — preserves today's look below the foot
   but ships 0.68 mm wire on every SLS preset, §2). Flooring changes export bytes on every
   cm=ON design; that lands inside the same schema-bump change report.

---

*Branch `claude/flower-project-discovery-91zmld` off `main` (`d6f237d`), PR base `main`,
draft. Nothing merged; nothing pushed to `main`; no production publish. No geometry file
changed: `flower.js`, `flower-sdf.js`, `flower-geometry.js`, `flower-registry.js`,
`flower.html` are byte-identical to `main` on this branch — the diff is
`tools/probe-junction.mjs` and this document.*
