# Reference-flower feature map (bloom) — discovery

Oct 12, 2026. Discovery only: **no code was changed.** Base is `main` at `2f21043` (#397, leaf S5b).
This doc maps each feature Eva logged from reference flowers onto the bloom code as it stands. For
each one it says what exists, what is missing, what it depends on, what it would collide with, and
what still needs a ruling. The rulings Eva already made are taken as given. Nothing here designs a
solution beyond what those questions need, and **no open question is answered here** — they are
collected in §10.

Two render sheets sit beside this doc. Both were built in Node through the shipped
`buildBloomInto` in EXPORT mode and drawn by `tools/bloom-soft-render.mjs` (deterministic, so no
pixel deltas are quoted):

- `docs/img/reference-flower-A-sepal-wing.png` — to-check item A (§8)
- `docs/img/reference-flower-B-curl-cap.png` — to-check item B (§8)

The script that drew them is a session scratch file and was **not** committed, so this PR stays
docs-only. Every cell's control set is printed on its caption and listed in §8, so the sheet can be
reproduced from the doc.

Paths are repo-relative. In citations, `G` = `bloom-geometry.js`, `R` = `bloom-registry.js`,
`B` = `bloom.js` and `H` = `tools/bloom-harness.mjs`.

**About the leaf overhaul.** No open PR carries it right now; the open PRs are #111 and #230, both
stale. The leaf work lands as a series (S1–S5b, #375–#397) that edits **inside `G`**:
`widthProfile`'s `cap.chevron` / `cap.petiole` arms, `leafSurface`, `lobed*`, `leafNibPlan`,
`emitPanel` callers, and `spineLaw` callers. Wherever this doc says "collides with the leaf
branch", it means the next leaf session will be editing the same function.

---

## 0. Premises checked before mapping

| Premise in the brief | What the code says |
|---|---|
| "does the hub have a real length parameter today, or is it effectively an apex?" (F1.1) | **There is a real one.** `hubLength` (R:3883, `HUB_LENGTH_RANGE` [0, 40] mm, G:12874; 0 = auto) sets the hub-to-stem join's axial reach in `stemPlan` (G:13274–13370: `refReach = hubLength > 0 ? max(hubT, hubLength) : joinT`, `rootZ = topZ − axisDepth`). Its siblings are `hubStyle` GOBLET/ANGLED/CURVED (R:3865) and `hubShapeAmount` 0–2 (R:3874). **All three exist only when a stem exists** (`stemPresent`). With `stemLength` 0 there is no hub below the head. The sepals then sit at the rim, and `sepalHeight` is inert (G:20006). |
| "existing per-petal editing (shipped in Standard per issue #71)" | **#71 is not a bloom issue.** It is a docs-only flower proposal (`docs/project-state.md:163`). The bloom has no tier split: every row is `tier:'standard'` and `B` never reads `tier` (`docs/bloom-inflorescence-discovery.md:56`). Per-petal editing in the bloom is the FAN per-petal groups and the RADIAL slot roles; §3.1 lists exactly what they reach. |
| "Tails stop at the 1.0 mm floor (Sep 23 tip ruling)" (F6) | **No "Sep 23 tip ruling" exists in the repo.** The Sep 23 docs are the infill S1/S2 docs. The tip floors that do exist: `MIN_FEATURE_MM` = 1.0 (G:30) is a minimum *gap or feature*. `TIP_HALF_MM` = 0.8 (G:3806) is the print floor on the *half*-width, i.e. 1.6 mm across. Under the apex nib ruling the petal now closes *below* that floor, down to a 0.10 mm mini-face (`APEX_HALF_MM` 0.2 / `APEX_END_HALF_MM` 0.05, G:3935). Which of these the F6 ruling means is open (Q6.4). |
| "negative arch on petals/sepals" (to-check B) | **The petal and the sepal have no "arch" control.** `leafArch` is the leaf's alone. The petal/sepal equivalent is spine curl, and the signs are **opposite**: `leafBladeState` sets `petalSpineCurl = −leafArch` (G:15166). So a leaf's negative arch is a petal's *positive* spine curl. §8 answers B for both signs. |
| "light preview while dragging" (F7) | **No build is cheaper than another.** At the shipping default the live and export builds are the same mesh: the same 24,688 triangles, float-identical (`docs/bloom-tube-ring-prototype.md:332`). Live is not a lighter geometry; the work is the same. See §7. |

---

## 1. F1.1 — Stacked sepal whorls

**What exists**
- There is one sepal whorl, end to end. `footRing` builds a single `fr.sepals` descriptor
  (G:2922–2983): count ceiling = petal count or fan count, phase, foot width, `ring` with
  `role:'SEPAL'`, `index:-1`.
- `sepalAttachment(state, hub, acc)` (G:19994–20118) places that ring. It reads **one**
  `state.sepalHeight` as a fraction of the join's axial extent, from the stem end to where the join
  meets the head (G:20032–20035). It falls back to the rim when there is no stem, when the join is
  inert, or when the extent inverts on a dome.
- `buildSepalsInto` (G:20229) is a single `buildWhorlInto` call. Each blade is
  `buildPetalInto(acc, sepalBladeState(…), sepals.ring, slot)`. It is emitted LAST, so a build
  without sepals is a byte-prefix of the build with them.
- The controls are 6 own rows (R:3651–3720): `sepalCount` 0–40, `sepalScale` 0.2–1,
  `sepalHeight` 0–1 (default 0.75), `sepalPhase`, `sepalFootBreadth`, `sepalAngle` −90..90. On top
  of those are **15 twins** generated from `SEPAL_TWINS` (G:18305) by `sepalTwinControls`
  (R:4615). Only `sepalRoll` is narrowed (`SEPAL_TWIN_BOUNDS`, G:18337). The sections are `sepals`
  with children `sepalShape`, `sepalForm` and `sepalCurl` (R:1177–1180).
- `sepalAngleLimit` (G:20148–20222) draws the clamp in both modes, but **only against the petals**.

**What is missing**
- The tier as a concept. `fr.sepals`, `built.sepals`, the `shown.sepals` read-outs in every `fmt`
  and `cap` closure, `lastSepals` (B:767, 2012, 2283, 2401), the feet push (G:3459),
  `neighbourFlag` (G:21338), and the tip-row budget (G:20302, 20875) are all **singular**.
- A per-tier control namespace. That means 21 rows per tier (6 own plus 15 twins) and a generator
  over a tier table, which is the `TIP_DESCRIPTORS × TIP_INSTANCES` / `sepalTwinControls` shape.
- **Tier-against-tier contact.** No sepal-to-sepal contact test exists anywhere. The limit scan
  tests a sepal against the petals only. A lower tier would also have to clear the tier above it.

**Dependencies**
- On a stem. Partway-down tiers only exist where a join hangs below the head. With `stemLength` 0
  every tier would collapse onto the rim, so Q1.2 is needed.
- On `hubLength` / `hubStyle`, which exist (§0). The available extent is small at the default:
  1.32 mm built at the default 6 mm stem, 19.4 mm on GOBLET 2×40, 77.6 mm on the MAX×MAX hubs
  (`docs/bloom-sepals-outcome.md` ~400–506). **At default settings N tiers have about a millimetre
  to share.**
- Not on F2/F4. It is a separate instancing axis (sepal tier, not petal).

**Collisions**
- With the leaf branch: none direct. Sepals share `buildPetalInto`, `spineLaw` and `emitPanel` with
  leaves only through the shared petal builder. Leaves ride `stemPlan`, so if a tier law moved
  `rootZ` the leaves would move; but tiers *read* the extent and do not change it.
- The sepal byte partition (`tools/verify-bloom-sepal-bytes.mjs` "prefix" clause) assumes one block
  at the end.
- `verify-bloom-sepal-decoupled.mjs`, `bloom-sepal-contact.mjs` and `bloom-sepal-ranges.mjs` all
  read `fr.sepals`.

**Gate families**
- SP0–SP9 (H:~9891 onward), written for one ring: SP2 ceiling, SP3 attachment interval, SP4 phase,
  SP8 contact against petals.
- New rows: one per-tier attachment SP3, tier-vs-tier contact (new), the panel gate's instanced
  family for tier controls, and a matrix block plus a smoke block.
- The R1 coverage instruments will fire on a new emitted part; that is its own comment's
  prediction.

**Size:** 2 sessions.
1. The tier descriptor plus N-tier `sepalAttachment` and build, with tier 1 byte-identical to
   today. This goes first.
2. Tier-vs-tier contact in the angle limit, the panel generator, and the sheet.

---

## 2. F1.2 / F1.3 — Stamen length variance, higher ceiling, helical filaments

**What exists**
- `stamenCount` 0–120, `stamenLayout` RING/DISC, `stamenSpread` 0.6–max, **`stamenLength` 5–40 mm
  (default 20)** and `stamenCurl` −180..180 (R:3517–3571), all in the `androecium` section under
  `center`.
- `footRing`'s androecium descriptor (G:2642–2736) gives every stamen **one shared** `length`,
  `curlRad`, `rFil = t/2` and anther. The per-stamen records carry placement only.
- `buildStamenInto` (G:18103) calls `rodInto` (G:18017), which calls `spineLaw({…, tilt:0})`.
  `spineLaw` is a **planar** 2D integrator returning (dR, dZ, φ). The rod frame is a fixed azimuthal
  tangent `T` with `e2 = D × T`, valid only because the curve stays in one plane.
  `revolveInto` (G:17991) already takes arbitrary `{C, e1, e2, r}` stations, so its *ring* emission
  does not care whether the curve is planar.
- **Organic variance does not reach stamens.** `sizeVarianceField`, `formVarianceField` and
  `spacingVarianceField` (G:3160, 3266, 3363) are waves over the petal slot sequence. The androecium
  uses `sizeRamp: () => 1` (G:21235–21244).

**What is missing**
- **F1.2:**
  - A per-stamen length. This is a fourth variance field keyed on the stamen's own index or
    azimuth. Whether it shares the petal's frequency and phase is a question.
  - A higher `stamenLength` ceiling. 40 mm is a registry bound only.
  - The read-outs that assume one length: SLENDERNESS (B:2211), the STYLE "stigma above/below the
    highest anther" line, and FILAMENT AGAINST STYLE.
- **F1.3:**
  - A 3D centreline law in place of planar `spineLaw`: a helix about the filament's own path.
  - A rotation-minimising frame in place of fixed `T`.
  - A rebuilt `tipInto` frame. Its Rodrigues identity assumes `{D, T}` (G:18080–18100).
  - A per-stamen phase.
  - **Braided mode** is a different topology. Today every stamen is its own closed rod with its own
    root through the slab. A braid is several strands crossing one another. Either they stay
    separate closed rods that interpenetrate, which is legal ("overlapping closed shells are fine"),
    or they become one bundle. Which one is a ruling (Q2.4).
- **A coil-radius floor.** The coil's own curvature against the 1 mm wire, which is the spine
  curvature floor's question in 3D.

**Dependencies**
- None on other features.
- F1.2's variance should reuse `varianceWave` (G:3124) and must not make a second wave law.

**Collisions**
- `rodInto` and `revolveInto` are shared with the **style** (G:18155). `spineLaw` is shared with
  petals, sepals and leaves.
- A helix must therefore be a *new* law beside `spineLaw`, not an edit to it, or it moves leaf and
  petal bytes. That keeps it off the leaf branch.

**Gate families**
- JS1 (root along normal), JS2, JS3 (root ring in the face plane), JS4 (tri count
  `tippedRodTris`, apex = tip + axis·reach), JS5, JS6/JS7 (tip frame = rod `dir`), all in
  `stamenAssertions` (H:5683 onward).
- JS4 and JS6 assume a straight or planar rod's frame.
- New: a per-stamen length restated from the controls (a VS-like family), a helix law restated
  from other owners (the C1 discipline), and a coil-curvature clamp clause.
- A slenderness line per stamen. It stays UNMEASURED until a coupon is printed.

**Size:** 2–3 sessions.
1. F1.2 (variance plus ceiling): 1 session, independent. **This goes first.**
2. F1.3 independent coil: 1 session.
3. Braided: 1 more, after Q2.4.

---

## 3. F2 / F4 — Parameter scoping (global → layer → petal)

### 3.1 What per-petal editing exists today

`ROLE_OVERRIDES` (G:1311–1400), composed by `resolveRoleOverrides` (G:1791) and clamped once into
the base control's range:

| Group | Placement | What it can change |
|---|---|---|
| ALL (`allCurl`, `allCup`) | one whorl only | curl, cup (deltas) |
| INNER (`innerCurl`, `innerCup`) | layers ≥ 1 together | curl, cup (deltas) — **outer vs all-the-rest, no per-layer index** |
| Labellum / Hood slot roles | RADIAL, ≥ 2 whorls in step | size (×length and ×width together), tilt, cup, curl (labellum); size, tilt, cup (hood) |
| Petal 1..9 (`petal{k}Size/Tilt/Cup/Curl`) | FAN only | size, tilt, cup, curl |
| Organic form field (not a per-petal control) | all | curl, cup, twist per slot |

- Every override is a **delta or multiplier on the global**, never an absolute value
  (`LAW_IDENTITY`, G:1406).
- **A mirror pair is one role by construction.** `petalRoleForSlot = PETAL_ROLE_ORDER[min(i,
  partner)]` (G:1635), so there is no unlink today.

**Distance to F2's "every control":** per petal today means 4 quantities, size counting as one.
These **cannot** vary per petal today:
- base taper, tip shape, tip taper, tip end
- all 5 lobe controls and both fringe controls
- all 7 infill controls
- buckle (3), cup gradient, apex sweep, roll, roll taper
- curl bias and curl start, twist (as a control)
- thickness and tip thinning
- width and length *independently* (size is one multiplier)

About **36 petal-local controls** exist in total (shape 6, lobes 5, fringe 2, infill 7, form 8,
curl 5, thickness 3). F2 is roughly 9× the reach of today's per-petal block.

### 3.2 What exists that F2/F4 extend
- **The substate.** `petalStateFor` / `petalStateForSlot` (G:1892, 1907) hand each petal a `ps`, and
  `petalSurface` (G:8018) states that every law reads `ps`. That is the hook. Per-petal or per-layer
  values become entries in `ps` with no law changing.
- **Per-layer descriptors already exist.** `footRing`'s raw layers carry `{lambda, scale, role, …}`
  (G:2218–2245), so per-layer parameters have somewhere to hang.
- **Precedents.** `tubeLayer1..6` (R:~2176) is the one existing per-layer control family. The
  closest precedent for *absolute* per-instance values is the sepal-twin `sepalView` (R:4594–4609),
  which re-maps petal ids to twin values.
- **A selection-view precedent outside the bloom.** `/plot`'s pattern: the panel is a view of the
  selected petal's entry, and selecting LOADS but never applies (`plot.js:257–272`, CLAUDE.md "A
  WARP BELONGS TO ITS PETAL"). **The bloom has no such mechanism.** Every control is one id with one
  value.

### 3.3 What assumes one shared parameter set (breaks under F2/F4)
1. **The ring.** Size never reaches the foot: foot width reads global `state.petalWidth`
   (G:2205, 2220), and Z6 asserts it. Per-petal width would ask whether the foot follows.
2. **The area rule** is grouped by role (G:2232, 2241), and Z3 asserts exact equality with the
   pre-role sum.
3. **Infill.** The plan is per petal from `ps` (G:8731), but the `densityCap` dead-travel sweep runs
   on the representative petal only (G:8742–8751).
4. **The tip-row budget** reads global `state.petalTipShape` / `sepalTipShape` (G:20873). Per-petal
   tip shapes break the budget prediction. `NU` is already per petal through the module-global
   (`bladeRowsFor`, G:4251).
5. **Telemetry.** `shapeN: state.petalTipShape` (G:8980). `built.petals` holds one per descriptor,
   and its metric arrays are index-matched to `fr.rings` (J1/Z2/Z6).
6. **Per-whorl values** (radius, scale, tiltExtra, phase) are read off `slotsFor[0]` (G:21140–21155).
7. **The sepal angle scan's congruence key** (G:20187): every distinct petal adds trial builds.
8. **TUBE eligibility** reads global buckle, fringe, infill and variance (G:20404–20434), plus
   `slotRolesOverridden`.
9. **The panel**: one control per id, no per-petal storage. **No persistence**: no
   `CURRENT_SCHEMA`; `RETIRED_IDS` notes it becomes material "the day something does".
10. **The blanket sweep** and `ALL MAX` assume one value per id.
11. **A standing ruling conflicts with F4.** No per-layer size or tilt override, because
    `layerSize` / `layerTilt` own them (R:3254–3258, G:1303–1306). F4 "full parameter set" includes
    size and tilt (Q3.5).
12. **Z9** asserts per-petal is FAN-only and slot roles RADIAL-only. **Z4/Z4b** assert mirror
    symmetry, and would change under unlink.

**Cost if instanced as registry rows:** 36 × 9 ≈ 324 rows per FAN petal and 36 × 6 ≈ 216 per
layer, against 207 rows today. That is why the brief's "one scoping system" matters. Instancing by
duplicated registry rows does not scale. A selection-view (one panel, values stored per scope) is
the shape the size argues for, and it is a ruling (Q3.1).

**Collisions**
- With the leaf branch: low. Leaves build from `leafBladeState`, not `petalStateFor`.
- The panel (a new "selected scope" chrome), `B`'s rebuild path (values no longer one per id),
  `readUI` and every gate read-back (`applyConfig` reads ids), the matrix format (a row is a flat
  id → value map today), and the byte tools' predeclaration.

**Gate families:** Z1–Z9, FV0–FV4, VS0–VS5, TU0/TU1, SP8 / sepal scan, J1/J2/J4/J7, A7/A8, the
infill I family, the panel gate's `INSTANCED_FAMILIES`, the ROLE_OVERRIDES load checks
(H:607–677), and the frozen-matrix row format if scopes are stored in matrix rows.

**Size:** 4–5 sessions.
1. The scope model: the state shape `global → layer[k] → petal[k]`, generalising `ps` resolution,
   with zero controls and byte-identical. **This goes first.**
2. Panel selection-view chrome with a "this petal / this layer" scope indicator.
3. F4 on RADIAL.
4. F2 on FAN with mirror links and unlink.
5. The gates' re-derivation, spread across all of these.

---

## 4. F3 — Spine curve (control points, curl plane)

**What exists**
- **`spineLaw` is already curvature over arc length** (G:7406). The cumulative turn is
  `Phi(u) = curlRad·remap(u)^(4·bias+1)`. Curvature per substep is `(Phi(u1) − Phi(u0))/ds`. It is
  clamped at `kMax = 1/floorRadius` (`ROLL_MIN_RADIUS_FACTOR·t`, G:8233), and it reports
  `peakRadius`, `clamped`, `turnBuilt` and `turnAsked`.
- **The clamp and read-out the brief asks for already exist** (`spineLine()`, B:1110). A
  control-point curve replaces `Phi(u)`, and everything downstream (`at(s)`, the frame, J8) is
  unchanged. The spine is purely 2D (dR along Rs, dZ along Up), which is exactly "curl plane only".
- One catch: the uniform-arc byte-identity branch keys on `curlIsUniform` (G:7404, 8248). A curve
  mode needs its own arm there.

**What is missing**
- A curve representation, its storage, and `Phi(u)` from it.
- The **panel widget**. The bloom registry has only `slider` and `choice` kinds, and the only canvas
  is the WebGL viewport (B:43–49, 387).
- The best base to reuse is `frame-profile-editor.js` (128 lines: drag, double-click add,
  right-click remove, ends locked, x monotone; samples through PCHIP). It needs a bloom-owned
  sampler in place of its `frame-geometry` import. `bug.js`'s on-wing Catmull-Rom editor is a model
  for refusal rules, not a panel widget. `plot-warp.js` is a displacement field, not a curve the
  result must pass through, so it is a poor fit.
- What the points *are*, which Q4.1 must settle. They could be the drawn spine shape (a 2D
  polyline), from which curvature is derived and clamped, or a curvature profile k(s).

**Dependencies**
- F2/F4 for "each petal or layer owns its own curve". Without scoping it is one global curve.
- The widget is shared with F6 (below).

**Collisions**
- Direct consumers of curl, each needing a decision in curve mode:
  - the sepal twins (`sepalSpineCurl`, `sepalCurlBias`, `sepalCurlStart`)
  - the role and variance curl deltas (`allCurl`, `innerCurl`, `labellumCurl`, `petal{k}Curl`, the
    form field's curl term)
  - the combination gate's `cup-x-curl` / `curl-x-buckle` pairs (tools/bloom-combination-gate.mjs
    :219, 243)
  - curl bias and curl start, which a curve supersedes
- **The leaf branch:** `spineLaw` is called by leaves (G:15285, 17235, 17753; compound rachis), and
  `leafArch` feeds `petalSpineCurl` (G:15166). A new curve arm inside `spineLaw` touches a function
  the leaf branch calls but does not edit. A curve law *beside* `spineLaw`, feeding its `Phi`,
  avoids the collision.

**Gate families**
- C1 (law rebuilt from other owners, drawn length), C2, C3 (start floor vs J8), J8 (root chord).
- The self-contact flag.
- A smoke row for curve mode, the combination gate's curl pairs re-run with curve mode, and the
  panel gate's new widget kind (a new route; three edits per this repo's rule).

**Size:** 2 sessions.
1. The curve editor widget as a registry `kind`, plus the panel gate route. Built once.
2. F3 curve mode in `spineLaw`'s Phi, global scope first.

The per-scope ownership follows F2/F4.

---

## 5. F6 — Outline curve (replaces the whole boundary)

**What exists**
- **`widthProfile`** (G:5062) is the one owner of the half-width h(u):
  - core beta law plus superellipse tip
  - the TERMINAL term, root blend and tip floor (`TIP_HALF_MM` export / `TIP_CAP_HALF_MM` live)
  - the apex nib (`apexNibPlan`, G:4004) and `toLaw` (drawn vs asked length)
  - lobes (MODEL B) and fringe
  - leaf arms (`cap.chevron`, `cap.petiole`)
- `shapeBaseRaw` and `laminaHalfAt` (G:6047, mode-free).
- `slopeBreaks` / `laminaSlopeBreaks`, which declare where the outline has a tangent break.

**Symmetric mode: what is missing.** A curve-defined core in place of the beta/superellipse law,
fed into `shapeBaseRaw`, so these keep working:
- the nib (which finds its own crossing of the floor)
- `toLaw`
- the ladder
- the infill outline

The curve's own tangent breaks must be declared in `slopeBreaks`, or the ladder and the rim arc
table will cut corners. This bug class has been met four times here.

**Asymmetric mode: assumptions it breaks.** The outline is symmetric by construction ("one
half-width h(u) applied at v = ±1, so the two margins are one function", G:5391). Every system
below reads one h:

| System | Where | What assumes symmetry |
|---|---|---|
| Cross-section `sectAt` | G:7742, 7802, 8125 | point = `C + T·h·v`, v ∈ [−1, 1] |
| Cup | G:7802 | `c·h·v²` / `c(hv)²/hb`, and the fold clamp reads `hb` (G:7768) |
| Buckle | G:7251, 7258 | `A·h·\|v\|^p` |
| `apexScale`, `tipInscribedRadius` | G:7559, 7600 | a disc centred on the midrib |
| Edge bead (`emitPanel`, `rimInsetV`) | G:9852, 9656, 9961–9963 | both margins from one h, `vMid` the midpoint |
| Ladder (`bladeStations`) | G:4517 | one turning measure on one outline |
| Lobes (MODEL B) | G:5379–5420 | a symmetric arc about the apex, measured along one margin; L8 parity |
| Fringe | G:6048 | panels split the v-span symmetrically |
| Voronoi infill | G:10930–10977, `infillMetricField` G:10613 | outline polygon from one `hAt`; metric `c = v·h′/h` |
| `petalRim` | G:8483–8504 | two arc tables but `U` taken from side +1 only |
| Apex nib | G:4004 | one crossing, one flank slope, arc centred on the axis |
| Leaves (`lobedSurface`) | G:17262 | symmetric chevron `\|v\|` / sign |

These are **safe** under asymmetry: the TUBE (`tubeSideArc(own, ±1)` measures each side
separately, G:20455), the grid glTF export (rows × columns), and the lattice (NV = 10, no midrib
column).

**LACE:** there is no lace in the bloom. The only hits are comments. Lace is the *flower's*
(`flower-registry.js:192, 258`). F6 does not touch it unless the brief meant the flower (Q6.6).

**What an asymmetric outline needs:** a cross-section parameterised by two half-widths
(hL(u), hR(u)) with an offset midline, i.e. `C + T·(m(u) + w(u)·v)`. Every row of the table above
changes. **This is the single largest item in the whole map.**

**Dependencies**
- The F3 widget.
- F2/F4 for per-petal outlines and mirror-linked pairs.
- "Teeth/lobes disabled while on" is a guard like the fringe's `lobesEligible` (G:6933).

**Collisions**
- **The leaf branch, directly.** `widthProfile` is called by leaf code at G:15213, 17079, 17095,
  17132 and 17189, and the chevron and lobed arms live *inside* it. Any edit to `widthProfile`
  touches S4/S5/S5b's code. The symmetric curve mode can be added as a new CORE arm without editing
  the leaf arms, but it is still the same function the next leaf session will be in.
- The asymmetric mode changes `sectAt`, `emitPanel` and `petalForm`, which leaves share
  (G:15202, 15245, 15369, 17050). **It must wait for the leaf overhaul.**

**Gate families**
- A2–A8 (ladder on a free h), AN0–AN3 (nib on a curve outline), L0–L8 and FR0–FR5 (declared inert
  while on, both directions).
- E1–E6 (edge profile, both margins separately), I1–I12 (infill on the curve outline), C1 (drawn
  length).
- The combination gate (curve × cup / buckle), and LF if leaves inherit it.
- Asymmetric mode adds a new family for the two-margin cross-section and the mirror-left-on-switch
  rule.

**Size**
- Symmetric mode: 2 sessions. The curve law and its tangent-break declaration first, then the nib
  and floor meeting.
- Asymmetric mode: 3–4 sessions. The cross-section refactor is the big one; then the bead, the
  ladder and infill on two margins.
- Per-scope ownership follows F2/F4.

---

## 6. F2 + F3 + F6 — one curve editor

Confirmed. Both curves are a function over normalised length (k or a shape over s for F3, h over u
for F6), so one monotone-in-x point editor serves both. `frame-profile-editor.js`'s contract (drag,
add, remove, ends locked, x monotone) fits.

What the widget needs that `/frame`'s does not:
- registry integration as a new `kind`, with `readUI`, reset and the panel gate route
- a dead or clamped overlay (the curvature clamp for F3, the print floor for F6)
- a mirrored or two-sided display for F6's asymmetric mode
- one owner of the sampler shared with the geometry, so the drawn curve and the built curve cannot
  disagree (the registration rule)

---

## 7. F7 — Print preview always on (parked until the leaf overhaul merges)

**What exists**
- `#printPreview` is view chrome in the VIEW aside (`bloom.html:57–70`), not a registry row.
- `shownMode()` (B:538) returns `'export'` when the box is checked.
- The live build is `buildGeometry({exportMode: mode==='export'})` (B:2335). The STL always builds
  export from `readUI()` and never reads `shownMode` (B:2569).
- Rebuilding is an rAF coalescer, one full synchronous build per frame (B:2441). There is no
  debounce, worker or drag/release distinction.

**What print geometry adds over the non-print (live) view** — the list for ruling what drops during
a drag:

| Item | Live | Export / print | Cost |
|---|---|---|---|
| Sheet thickness floor (`floorThickness`, `MIN_FEATURE_MM` 1.0) on petal, hub, leaf, petiole | sheet as set | floored at 1.0 | trivial; **binds only below a 1.0 mm sheet** (default 1.2) |
| Tip floor (`tipFloor`) | `TIP_CAP_HALF_MM` 0.15 | `TIP_HALF_MM` 0.8 | trivial; the one real outline difference (nib, flank, last rows) |
| Edge bead (`RIM_*`, 4 segments) | **built in live too** | built | not a print-only item; only its drawn radius follows the tip floor |
| Voronoi infill | **built in live too** (wall is `MIN_FEATURE_MM` in both) | built | not a print-only item |
| Seam clearance, ladder, fringe count, lobe pitch, rim segments, leaf node pitch | mode-free by design | same | — |
| Normals | crease normals at 60° (`toCreasedNormals`, B:822), the smooth look Eva ruled | builder's closed-form bead normals, the rest flat (B:795–815) | the live path costs *more* (a per-mesh crease pass) |
| Tube | builds a whole body in the other mode too (G:20845) | same | ~3 bodies a build either way |
| Sepal angle limit | scans both modes | same | — |

**Consequence:** dropping print geometry during a drag buys almost nothing, because the two builds
cost the same and at the default they *are* the same mesh. A real "light" drag needs a cheaper
build, and there are several candidates (Q7.1):
- skip infill
- skip the bead
- fewer rows (the `NU` ladder)
- skip the sepal limit scan and the tube's other-mode build
- skip the neighbour flag and the census-style telemetry

The precedent is `/plot`'s `REBUILD_DRAG` / `REBUILD_EXACT` with one exact rebuild on release
(`plot.js:1060–1100, 1742`). In the bloom the split is natural: `input` fires during a drag and
`change` on release.

**What hiding and pinning touches**
- **There is no registry precedent for chrome.** `infillBase`'s "hidden, id kept" is a registry row
  with a never-true predicate. `#printPreview` is raw DOM, so pinning is a `hidden` attribute plus
  `checked`, or `shownMode()` returning `'export'` unconditionally.
- **Panel route (i)** (tools/verify-bloom-panel.mjs:1913–1965) asserts the box is *unchecked at
  load* and proves the STL byte-identical across a flip. It must be re-derived.
- **Both STL gates** call `shownModeAssertion(page,'live')` (verify-bloom-export.mjs:138,
  verify-bloom-connectedness.mjs:305). `liveTris` would be null, which the "(live)" columns and the
  LF31 corner check need (H:8963).
- **~30 shot tools** set the box, some to `false`. **The leaf sheets** (`shot-bloom-lobed-follow-up`,
  `-leaf-tip-neck`, `-leaf-tip-broad-sinus`) click it and read it back. **This is the collision with
  the leaf branch, and the reason F7 is rightly parked.**
- Smooth shading in the normal view (Eva's ruling, B:681–690) is lost if the view is always print
  normals (Q7.2).

**Size:** 1 session for pin and hide, plus 1 for a real light drag path, after the leaf overhaul.

---

## 8. To-check items (render sheets)

### A. Can a sepal reach long, narrow wing proportions?

`docs/img/reference-flower-A-sepal-wing.png`. Sepals are green, 5 sepals, EXPORT mode. Each cell
has a side view (left) and a view from below (right). The cells:
- A1 shipped
- A2 `sepalScale` 1
- A3 narrow tapers (`sepalBaseTaper` 3, `sepalTipTaper` 4, `sepalTipShape` 0.6)
- A4 `petalLength` 60 × `petalWidth` 8, scale 1
- A5 = A4 + the tapers
- A6 = A5 + angle −10, curl +90
- A7 = A5 + angle −10, curl −90
- A8 = A5 + angle −10, curl +120, bias 0.9, start 0.6
- A9 = A8 with the petals hidden

**Answer: only by changing the petals too.**
- A sepal has no length or width of its own. `sepalScale` (0.2–1) scales the petal's length *and*
  width together, so **a sepal's aspect ratio is the petal's**: 35 × 16 mm = 2.2 at the default,
  and at most 7.5 at petal 60 × 8.
- The tapers narrow the shape but not the proportion (A3).
- The sepal can never be longer than a petal (scale ≤ 1).
- A9 shows the wing look *is* reachable: near-horizontal, narrow, with the tip recurving up through
  positive curl biased to the tip. But only on a bloom whose petals are also 60 × 8.

Two further readings:
- **The Oct 9 narrowing is not what limits it.** It narrowed only `sepalRoll`.
- **The angle limit bites on the wing pose.** A6's asked −10° was built at −19° because the curl
  carries the sepal into the petals.

### B. Does negative arch fold an inward cap over the hub?

`docs/img/reference-flower-B-curl-cap.png`. Each cell has a side view and a view from above. The
caption measures the share of the hub's plan disc covered, from above, by geometry standing above
z = 2 mm. The cells:
- B1 shipped
- B2 `petalSpineCurl` −180
- B3 −180 at tilt 75
- B4 +180
- B5 +270 at tilt 60
- B6 / B7 sepals only, scale 1, angle 30, curl −180 / +180
- B8 a leaf at `leafArch` −90, for the sign

**Answer:**
- **Negative petal curl does not make a cap.** It reflexes the petals outward and down, umbrella
  fashion, and leaves the hub open (B2: 0 %, B3: 3 %).
- **Positive curl** folds them inward over the hub into a closed globe (B4 and B5: 100 %).
- Because a leaf's negative arch *is* a petal's positive curl (§0), "negative arch" in the leaf's
  sense **does** produce the cap on petals, under the name positive spine curl.
- **Sepals cannot form the cap.** Positive sepal curl is clamped by the angle limit (B7: asked 30°,
  built −66°), because the curl carries the sepal through the petals. Negative sepal curl reflexes
  outward (B6).

The coverage figure is a plan-raster on a 0.1-radius grid, an instrument of this sheet only; it is
not the shipped plan-coverage tool.

---

## 9. Proposed session order

The spine of the order:
- parameter scoping before both curves
- the curve editor built once
- stamens and sepal whorls independent

**One challenge from the code:**
- **F3's global mode does not need scoping first.** `spineLaw` already takes a curvature law, and a
  global curve is a self-contained arm. So the curve editor can be built and proven on F3-global
  *in parallel with* the scoping work. Scoping is then what makes curves per-petal, which is the
  brief's actual dependency.
- **F6 asymmetric is gated by the leaf overhaul, not by scoping.** It edits `sectAt`, `emitPanel`
  and `widthProfile`, which the leaf series is editing.

| # | Session | Leaf-overhaul-safe? | Depends on |
|---|---|---|---|
| 1 | F1.2 stamen length variance + ceiling | **parallel** (stamen code only) | — |
| 2 | F1.1-a sepal tier descriptor + N-tier attachment (tier 1 byte-identical) | **parallel** (sepal code; reads `stemPlan` only) | — |
| 2b | QA.1 sepal own length and width (may exceed the petal's) — new, independent, early (§11) | **parallel** (sepal twins only) | — |
| 3a | Q3.9 bloom design file — ships BEFORE scoping (§11, DEFAULT) | **parallel** (persistence only) | — |
| 3 | Scoping-a: state model global → layer → petal, `ps` resolution, zero controls, byte-identical | **parallel** (petal resolution; leaves use `leafBladeState`) | 3a |
| 4 | Curve editor widget (new registry kind + panel route) | **parallel** (UI only) | — |
| 5 | F3-global: spine curve feeding `spineLaw`'s Phi via a law *beside* it | **parallel** if it does not edit `spineLaw` itself | 4 |
| 6 | F1.3 independent helical filament (new 3D rod law beside `spineLaw`) | **parallel** | 1 |
| 7 | F1.1-b tier-vs-tier contact + panel + sheet | parallel | 2 |
| 8 | Scoping-b: panel selection-view chrome | parallel | 3 |
| 9 | F4 per-layer (RADIAL) | parallel | 3, 8 |
| 10 | F2 per-petal (FAN) + mirror links (pairs stay linked — §11 Q3.7; no unlink) | parallel | 3, 8 |
| 11 | F3 per-scope curves | parallel | 5, 9/10 |
| 12 | F6 symmetric outline curve (new CORE arm in `widthProfile`) | **wait**: same function as the leaf series | 4, leaf merged |
| 13 | F1.3 braided mode | parallel | 6, Q2.4 |
| 14 | F6 asymmetric (two-margin cross-section, bead, ladder, infill) | **wait** | 12, leaf merged |
| 15 | F6 per-scope + mirror-linked outlines | wait | 10, 14 |
| ~~16~~ | ~~F7 pin + hide, then light drag path~~ — **DONE, merged as `b4ad9ba` (#400); §11** | — | — |

Roughly **16–19 sessions** in all (one fewer since F7 shipped). The rows marked "parallel" at the top
(1, 2, 2b, 3a, 4) have no dependency between them; 3 now waits on 3a.

*Order amended Oct 12 only where a §11 ruling changes it: F7 done; the design file before scoping;
sepal own length/width as a new, independent, early item.*

---

## 10. Open questions for Eva (listed, not answered)

**F1.1 — sepal tiers**
- Q1.1 Tier controls: does each tier own the full 21-row sepal set (own + 15 twins), or a subset
  (height, count, size, angle, phase) with shape and form shared?
- Q1.2 With no stem (no hub below the head), all tiers fall back to the rim. Refuse more than one
  tier, stack them at the rim, or require a stem?
- Q1.3 Ordering: are tiers kept in height order (tier k above tier k+1), or free to cross?
- Q1.4 Contact between tiers: a clamp drawn like the petal limit, or told only?
- Q1.5 Is the count ceiling still the petal count per tier?

**F1.2 / F1.3 — stamens**
- Q2.1 Length variance: does it share the petal variance's frequency and phase (one wave) or have
  its own? Is it keyed on the stamen's index, its azimuth, or random?
- Q2.2 New `stamenLength` ceiling: what value, or derived from what (petal length × k)?
- Q2.3 Coil radius floor: is the coil's curvature floored at the wire radius like the spine, and is
  the coil inert at radius 0?
- Q2.4 Braided: separate rods that interpenetrate (legal), or one fused bundle? How many per braid,
  and which stamens join one?
- Q2.5 Does the anther follow the coil's end tangent, or stay upright?

**F2 / F4 — scoping**
- Q3.1 UI model: one panel that edits the *selected* petal or layer (the `/plot` pattern), or
  instanced control rows (≈ 324 per FAN petal)?
- Q3.2 Per-scope values: deltas on the global (today's `ROLE_OVERRIDES`) or absolute values?
- Q3.3 Does per-petal width reach the foot (the ring), which is ruled out today (Z6)?
- Q3.4 Do the existing slot roles, per-petal groups and ALL / INNER deltas become views of the new
  scopes, or retire?
- Q3.5 F4 "full set" includes size and tilt per layer, against the standing ruling that
  `layerSize` / `layerTilt` own them. Override that?
- Q3.6 Which controls are *never* per scope (thickness? placement?)?
- Q3.7 Mirror unlink: per pair, or one toggle for all pairs? Which partner is the source on re-link?
- Q3.8 Do sepals and tiers join the scoping (per-sepal or per-tier independence)?
- Q3.9 Persistence: the bloom saves nothing today. Do scoped designs need saving (a file or URL
  format)?

**F3 — spine curve**
- Q4.1 What do the points draw: the spine *shape* (curvature derived and clamped), or a curvature
  profile directly?
- Q4.2 In curve mode, do `curlBias` / `curlStart`, the curl deltas and the variance curl term hide,
  or apply on top?
- Q4.3 Does `sepalSpineCurl` get its own curve, or follow the petal's?
- Q4.4 Clamp behaviour: clamp and tell (as today), or refuse the drag?
- Q4.5 Do leaves (`leafArch`) get curve mode?

**F6 — outline curve**
- Q6.1 Does length stay the asked length when the nib closes the curve (the drawn-vs-asked rule)?
- Q6.2 Does the curve include the root blend and foot width, or start above the root blend?
- Q6.3 The tip: does the curve end on the existing apex nib, or replace it?
- Q6.4 "Tails stop at the 1.0 mm floor": a full width of 1.0 mm, or the existing 0.8 mm half-width
  (1.6 across)? No "Sep 23 tip ruling" is in the repo.
- Q6.5 Infill and the edge bead on an asymmetric outline: required in the first asymmetric session,
  or refused (told) there at first?
- Q6.6 "LACE" in the brief: the flower's lace, or something on the bloom? The bloom has none.
- Q6.7 Does the outline curve apply to sepals (and leaves)?

**F7 — print preview**
- Q7.1 What drops during a drag? The candidates that actually save time are infill, the bead, rows,
  the sepal limit scan and the tube's other-mode build. The print floors themselves cost nothing.
- Q7.2 Normals: keep the live view's crease-smooth shading in the always-on view, or show the print
  normals?
- Q7.3 Should the STL gates move to measuring the export view, now that live becomes unreachable on
  the page?

**To-check follow-ups**
- QA.1 Should a sepal get its own length and width (or an aspect) so its proportion can differ from
  the petal's? Should it be allowed longer than the petal?
- QB.1 Rename spine-curl signs, or document "arch"? Leaf arch and petal curl run in opposite senses.

---

## 11. Rulings (Eva, Oct 12)

Recorded as given. Nothing below is re-litigated, interpreted further or resolved: an item marked
**DEFAULT** is a default the build session proposes from measurement and Eva confirms, not a ruling.

**F1.1 — sepal tiers**
- Q1.1: each tier owns the FULL sepal control set.
- Q1.2: tiers past the first need a stem; without one they are hidden and inert, told.
- Q1.3 / Q1.4: tiers stay in height order; tier-on-tier contact is clamped and told (like the petal
  angle limit).
- Q1.5: **DEFAULT** — count ceiling per tier proposed by the build session from measurement.
- Sepals join independence PER TIER only; sepals within a tier match.

**F1.2 / F1.3 — stamens**
- Q2.1: length variance is RANDOM per stamen (seeded), not the shared variance wave.
- Q2.2: the `stamenLength` ceiling is a fixed 120 mm.
- Q2.3: **DEFAULT** — coil curvature floored like the spine's, inert at radius 0; the build session
  confirms.
- Q2.4: braided = ONE bundle — every stamen winds around a shared axis.
- Q2.5: the anther follows the coil's end tangent.

**F2 / F4 — scoping**
- Q3.1: select-and-edit — pick a petal / layer / tier, the normal panel edits just it. No instanced
  rows.
- Q3.2: **DEFAULT** — per-scope values are OFFSETS on the global value.
- Q3.3: **DEFAULT** — per-petal width does not reach the foot (Z6 stands).
- Q3.4: the existing slot roles, per-petal groups and ALL / INNER deltas RETIRE (ids kept per
  `RETIRED_IDS`).
- Q3.5: per-layer size and tilt WIN under F4; `layerSize` / `layerTilt` hide when per-layer is on.
- Q3.6: sheet thickness is never scoped. Everything else may be.
- Q3.7: orchid mirror pairs STAY LINKED — no unlink. (Supersedes the Oct 11 "mirror-linked,
  unlinkable".)
- Q3.9: **DEFAULT** — a bloom design file ships BEFORE scoping.

**F3 — spine curve**
- Q4.1: points draw the spine's SHAPE; curvature is derived.
- Q4.2: in curve mode `curlBias`, `curlStart`, the curl deltas and the variance curl term HIDE.
- Q4.4: a drag past printable curvature is REFUSED (the point does not move there), not clamped.
- Q4.3 / Q4.5: sepals AND leaves get curve mode.

**F6 — outline curve**
- Q6.1: drawn length always equals the length slider; the curve's points are fractions of it.
- Q6.2: the curve starts above the root blend; the foot stays the hub's.
- Q6.3 / Q6.4: the curve shapes the outline down to the existing 1.6 mm tip width, then the existing
  round nib closes it.
- Q6.5: the first asymmetric session REQUIRES both the edge bead and infill on asymmetric outlines.
- Q6.6: "LACE" was a brief error (it is /flower's); drop it.
- Q6.7: petals, sepals AND leaves get outline curves.

**F7 — print preview — SHIPPED as `b4ad9ba` (#400).** Recorded as built:
- a drag drops infill cells only (candidate A); full print geometry on release.
- the always-on view shows print normals.
- "Get grid" follows the view (print-mode grids).
- the gates keep measuring LIVE: the harness unchecks the hidden box at load.

**Sheets**
- QA.1: sepals get their OWN length and width, and may be longer than the petals.
- QB.1: document the opposite arch / curl signs; no renaming, no sign flip.

§9's order is amended only where a ruling changes it: F7 done; the design file before scoping; sepal
own length / width as a new, independent, early item.
