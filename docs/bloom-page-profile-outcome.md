# Where the page's time goes on a big model — the profile, and what it supported

Eva's ruling of Oct 26: profile first, and fix only where the profile says so. This is the profile.
It was taken on the shipping page in headless Chromium, at four sizes, in both modes. Then come the
two fixes it supported and the re-measurement. **The mophead's held step is still over ~1 s, so the
drag-light question goes back to Eva (§5).**

The instrument is `node tools/bloom-page-profile.mjs`:
- It serves an **instrumented copy of `bloom.js`**: timestamps sit at every phase boundary of
  `regenerate()`, `buildGeometry()` and the render loop, placed by anchored edits. Each edit must
  match exactly once, or the run refuses. Its first after-fix run did refuse, on an anchor this
  session's own edit had moved.
- Beside the timestamps, a **CDP sampling CPU profile** (1 ms) of the same rebuild names the
  functions inside each phase.
- A rebuild is triggered by a real `input` + `change` on a slider and timed **to the end of the
  first frame that draws it**.
- A held step is a real pointerdown on the slider's thumb, followed by `input` events, each timed to
  its drawn frame.

**Mode and sampling, for every number below.**
- **Mode.** EXPORT is the page as shipped: print preview is checked and hidden since F7, so a
  visitor always sees export geometry. LIVE is the mode every gate measures (`openBloom` unchecks
  the box).
- **Sampling.** 3 rebuilds at rest and 4 held steps per size, given as median (min–max). The
  viewport is 1100 × 800.
- **The box.** Software GL (SwiftShader). Its ms do not travel; only ratios do. Run-to-run variance
  on this box is up to ~20% (the 240-petal head's export geometry read 4.47 s and 3.70 s across two
  runs with no relevant code change), so a claim about a fix rests on the phase the fix acts on.
- Re-run with `node tools/bloom-page-profile.mjs [--only key] [--live] [--cpu] [--finish]`.
  `--finish` adds a `gl.finish()` after each render.

## 1. The table — before any change (`7861569`, main after #466/#467)

### EXPORT (as shipped)

| phase (ms) | default 24,688 tris | 240-petal head 735,072 | spider lily 134,010 | mophead 1,241,994 |
|---|---|---|---|---|
| **input → drawn, at rest** | 180 (175–208) | 5,338 (5,118–5,466) | 1,184 (1,106–1,242) | 2,468 (2,156–3,670) |
| **input → drawn, held step** | 172 (168–186) | 5,431 (5,168–5,606) | 1,079 (1,026–1,110) | 3,083 (2,305–3,527) |
| input → `regenerate()` starts | 2 | 3 | 2 | 2 |
| `buildBloomInto` (geometry + every instrument it runs) | 131 | 4,467 | 1,035 | 1,360 (1,095–2,249) |
| record block (telemetry cache) | 0 | 0 | 0 | 0 |
| BufferGeometry + normals (copy into Float32 attributes) | 2 | 206 | 8 | 99 |
| syncScopeBar / applyVisibility | 0 | 0 | 0 | 0 |
| `refreshLabels` (every control read-out) | 3 | 4 | 4 | 7 |
| `applyCaps` (the track marks) | 0 | 0 | 0 | 0 |
| `refreshScopeNotes` | 0 | 0 | 0 | 0 |
| mesh swap (dispose the old geometry) | 0 | 0 | 0 | 0 |
| `computeBoundingSphere` | 2 | 27 | 6 | 76 |
| camera fit | 0 | 0 | 0 | 0 |
| `summarise` + `materialLines` (read-out text) | 0 | 1 | 0 | 0 |
| build end → first frame that draws it | 36 | 572 | 123 | 883 |
| idle frame interval (nothing changing) | 33 | 550 | 108 | 814 |

### LIVE (the gates' mode)

| phase (ms) | default | 240-petal head | spider lily | mophead |
|---|---|---|---|---|
| **input → drawn, at rest** | 206 | 7,060 (6,344–7,102) | 1,211 | 4,199 (3,876–5,054) |
| **input → drawn, held step** | 218 | 6,092 | 1,146 | 5,049 (4,384–5,263) |
| `buildBloomInto` | 130 | 4,548 | 854 | 1,101 |
| BufferGeometry + normals (**`toCreasedNormals`**) | 30 | 1,345 | 229 | **2,024** (1,878–2,459) |
| `refreshLabels` | 4 | 4 | 4 | 5 |
| `computeBoundingSphere` | 1 | 32 | 7 | 62 |
| everything else in `regenerate()` | ≤ 1 | ≤ 1 | ≤ 1 | ≤ 1 |
| build end → first frame | 39 | 531 | 132 | 844 |

### What each phase is for, whether it scales with triangles, and whether a held slider needs it

| phase | what it is for | scales with tris | a held slider needs it? |
|---|---|---|---|
| `buildBloomInto` — the geometry | the mesh on screen | yes | yes (what the drag changes) |
| — the **umbel's pitch floor** (`floretPitchFloorMm`, inside the plan) | a raceme's internode law. On an umbel's ONE node it places nothing; it is a REPORT (the read-out's floor, `sameNodeMayTouch`, ID10). **64% of the spider lily's build** (Node: 1,404 → 493 ms without it) | with the floret | **no** — DEFERRED (§2) |
| — the **placement pass's flags** (`buildInflorescenceInto`: `placementResidual`, `wallReachR`, `rachisApproachMm`, `floretsMaxZ`) | reports: they walk every appended float a second time (a re-transform, a hypot, a rod test, a stem distance). **~29% of the mophead's build** (Node: 1,087 → 776 ms) | yes | **no** — DEFERRED (§2) |
| — `neighbourFlag` (the told flag) | a report on the head's petals | yes | no, but **not deferred**: 250 ms of 4.8 s on the 240-petal head (5%), and nothing in the umbels |
| — `tipInscribedRadius` (`petalForm`'s `apexScale`) | GEOMETRY: the form law's apex scale | per petal | yes. **2.3 s of the 240-petal head's 4.6 s.** Not a page phase and not deferrable; recorded for a geometry session (§6) |
| — the umbel's floret units in both modes (`reachOf`) | GEOMETRY: the reach inset (mode-free by construction) | with the floret | yes |
| — `appendTransformed` | GEOMETRY: the placed florets | yes | yes |
| record block, shown record, scope bar, caps, scope notes, camera fit, read-out text | the read-outs and the telemetry cache | no (≤ 7 ms at every size) | they are not where the time goes |
| BufferGeometry + normals, EXPORT | copies the builder's positions and its closed-form normals into Float32 attributes | yes (~0.1 s at 1.24 M) | yes. Reusing the buffers would save only the allocation; not built (§6) |
| BufferGeometry + normals, LIVE | `toCreasedNormals` (string-hashed vertex map) | yes (**2.0 s at 1.24 M**) | shading only. LIVE is not what a visitor sees (§3) |
| the builder's own normals in LIVE | `captureNormals`, then **thrown away** by `toCreasedNormals` | yes | **no** — FIXED (normals once, §2) |
| `computeBoundingSphere` | the camera fit and three's frustum cull | yes (~60 ms at 1.24 M) | three recomputes it at render if absent, so deferring it saves nothing |
| build end → first frame | the upload (`bufferData`, ~70 ms at 1.24 M) plus the draw | yes | yes. On this box it is **SwiftShader rasterising 1.24 M triangles at ~0.8 s a frame**; the idle frame interval is the same number. `gl.finish()` returns in ~0 ms, so the cost is in the GPU process's swap and not in a call the page makes (`--finish`). On real hardware this is milliseconds |

**What the profile says, plainly.**
- **The page-side JavaScript #466 named — the read-outs, the instruments `bloom.js` runs, the
  caps — is ≤ 10 ms at every size.** `refreshLabels` is 3–7 ms. Everything else in `regenerate()`
  outside the geometry and the buffers reads 0–1 ms.
- **On the page a visitor sees (EXPORT), the held step is geometry plus this box's software-GL
  frame.** The mophead is ~1.4–2.0 s of `buildBloomInto`, ~0.2 s of buffers and bounding sphere,
  and ~0.8 s of SwiftShader frame.
- **#466's "8.6–13.4 s at rest, 11–17 s held" does not reproduce in either mode on this box**
  (EXPORT 2.2–3.7 s, LIVE 3.9–5.3 s). Its tool was not committed and its doc names no mode.
  - The LIVE/EXPORT split here is the shape its numbers need: LIVE adds `toCreasedNormals` (2.0 s)
    and the builder's discarded normals.
  - So #466 most likely measured LIVE, the gates' mode, on a slower box. That is an inference, not
    a reproduction.

## 2. The two fixes

### A held slider defers the inflorescence's report-only instruments

`buildBloomInto(acc, state, { deferReports: true })`:
- **What it skips.** The two report-only passes above.
  - `inflorescencePlan` skips the umbel's pitch floor (`pitchDeferred`). A raceme's floor places its
    nodes and is never deferred.
  - `buildInflorescenceInto` skips the placement pass's flags.
- **What reads null.** `pitchFloorMm`, `pitchFloretMm`, `pitchFloorAt`, `pitchFloorIsFlorets`,
  `sameNodeMayTouch`, `placementResidual`, `rachisApproachMm`, `floretsMaxZ(ByNode)`, and each
  placement's `wallReachR`.
- **What says so.** The plan and the built record carry `reportsDeferred`.
- **How it reaches the nested builds.** The plan carries the flag. The floret / sub-umbel memo passes
  it to every nested unit build, and the mophead's budget clamp re-plans with it. No module-level
  state.
- **The page.** `dragLight()` is true while a slider is held on a design with an inflorescence. It
  was already true for the infill and the texture. `regenerate()` passes `deferReports: light`.
  - A light build is never left on screen: release rebuilds, F7's rule.
  - The read-out's first line says the reports are deferred and measured on release. The umbel's
    floor reads "(deferred while the slider is held)".
  - At rest, and on every export, nothing is deferred: both export handlers build from `readUI()`
    with no options.
- **A deferred build emits the full build's bytes.** Nothing built reads either report. That is
  measured in two places:
  - in Node, `verify-bloom-surface-bytes --defer` over the whole matrix in both modes (§4);
  - in the browser, by D10.

### Normals once (LIVE)

`regenerate()` asked the builder for its normals in both modes. LIVE then replaced them with
`toCreasedNormals`' own, so every live build computed a normal per triangle (and a rotated one per
appended floret vertex) and threw them away. It asks only in EXPORT now (`captureNormals: mode ===
'export'`).
- Measured in Node, LIVE, median of 5 interleaved builds: 240-petal head 2,789 → 2,262 ms, mophead
  1,285 → 979, default and spider lily within noise.
- The channel moves no position (MeshBuilder's `captureNormals` contract). Nothing in the page or
  the gates reads a live build's builder normals; only the export branch sets them on the geometry.

## 3. After — same tool, same box, `a6ad723`

| | default | 240-petal head | spider lily | mophead |
|---|---|---|---|---|
| EXPORT at rest | 183 (176–208) | 4,391 (4,364–4,448) | 1,000 (977–1,038) | 2,226 (2,140–2,253) |
| **EXPORT held step** | 176 (169–177) | 4,443 (4,136–5,471) | **439 (415–441)** (was 1,079) | **1,874 (1,739–2,172)** (was 3,083) |
| — of it `buildBloomInto` | 131 | 3,614 | **291** (was 946) | **760** (676–1,141) (was 1,960) |
| — of it build end → first frame | 39 | 535 | 118 | 870 |
| EXPORT release → drawn | 245 | 5,922 | 1,197 | 2,898 |
| LIVE at rest | 221 | 5,349 | 1,283 | 4,028 |
| LIVE held step | 197 | 5,111 | 606 (was 1,146) | 3,863 (was 5,049) |
| — of it `toCreasedNormals` phase | 34 | 1,045 | 193 | 2,426 |

- **The spider lily's held step is 2.5× faster** on the page as shipped. **The mophead's is 1.6×**
  (3.1 → 1.9 s). In Node the mophead's deferred build is 856 → 484 ms (export), and the spider
  lily's 1,401 → 456.
- The 240-petal head and the default have no inflorescence and nothing deferred, so their EXPORT
  path is unchanged. The head's movement across the two runs (4.47 → 3.70 s of geometry) is this
  box's run-to-run variance, not a fix.
- **What is left on the mophead's held step, on this box:**
  - ~0.76 s of geometry. That is the floret and sub-umbel builds in both modes (the reach inset is
    mode-free by construction), 144 appends, and the floret petals' `tipInscribedRadius`.
  - ~0.15 s of buffers and bounding sphere.
  - **~0.87 s of software-GL frame**, which a real GPU does not pay.
- **Still over ~1 s here, so §5 applies.**

## 4. The gates

- **Drag preview** (`node tools/verify-bloom-drag-preview.mjs`): **PASS, 11 clauses**. D0–D9 are
  unchanged, and **D10 is new**. On the shipped umbel (120 mm stem), D10 checks four things:
  - at rest every deferred report is a number;
  - mid-drag (a real mouse held on a slider) the build is light and every deferred report reads null;
  - the on-screen bytes equal the geometry module's own full build in the page (a different owner
    from `bloom.js`'s routing);
  - after pointerup the screen is the exported STL and every report is back.
- **Its negative control is 10 mutants.** Every anchor is checked before any of them runs, and each
  must redden exactly the clauses it names. Four are new: two in `bloom.js` and two in the geometry
  (`file: 'bloom-geometry.js'`, served through the same route).
  - `the-held-build-defers-nothing` (the witness that the deferral happens) — D10.
  - `the-reports-never-run-at-rest` (every build defers) — D10.
  - `the-umbel-pitch-floor-never-runs-at-rest` — D10. **Witnessed** in Node on the mutated module:
    the umbel at rest reads `pitchFloorMm` 3 on the clean module and null on the mutant.
  - `the-placement-flags-never-run-at-rest` — D10. **Witnessed**: `rachisApproachMm` 22.26 mm clean,
    null mutated.
  - `input-events-are-the-drag` (pre-existing) now also reddens D10, and truly: the config's own
    input events enter the drag, so the umbel sits AT REST on a light build with its reports
    deferred. Claimed rather than tuned out.
  - `every-input-builds-light`: its anchor moved with `dragLight()` and it now reddens D10 too.
- **0 bytes moved on the export, whole matrix (1,588 rows), both modes**:
  - `verify-bloom-surface-bytes --base <worktree of 7861569>`: RESULT_PLAIN
  - `--defer` (this tree's deferred build against the base tree's full build): RESULT_DEFER
- **Panel gate** (`node tools/verify-bloom-panel.mjs`): RESULT_PANEL.
- **Design-file gate** (`node tools/verify-bloom-design-file.mjs`): RESULT_DF.
- No matrix row was added or removed, so no frozen phase is owed. `bloom-geometry.js`'s REST build
  is unchanged (the plain run above).

## 5. Re-costed for Eva — the 2-florets-a-ray drag build (#466's proposal)

Measured with the same tool on the same box, against the page as it now stands (`--only
mophead-2`: 12 rays × 2 florets, depth 2's defaults otherwise, EXPORT):

RESULT_M2

**Proposed, not built.** Eva's ruling of Oct 26 holds it until this profile was in. The numbers
above are what she rules on.

## 6. Recorded, not done

- **`tipInscribedRadius`** (`petalForm`'s `apexScale`) is half the 240-petal head's geometry (2.3 of
  4.6 s). It is a geometry law, so a speed-up must be byte-identical on the whole matrix. It is a
  geometry session's job, not this one's.
- **`toCreasedNormals` is the LIVE mode's largest phase** (2.0–2.4 s on the mophead). Every gate
  row pays it: the gates measure LIVE. A numeric-key re-implementation with an identical averaging
  order would cut it to a fraction and could be held bit-identical against the library's output. It
  is the vendored three file, and LIVE is not what a visitor sees.
- **Buffer reuse.** On an EXPORT rebuild the attribute copy is ~0.1 s at 1.24 M triangles, and most
  of it is the copy from the builder's plain Array, which reuse keeps. Reusing the Float32Array and
  the GL buffer when the length is unchanged would save the allocation (tens of ms). Not built, as
  too small to carry its own clause.
- **`neighbourFlag`** is 250 ms on the 240-petal head (5%), deferrable on the same mechanism. Not
  taken: the profile does not say it is where the time goes.
