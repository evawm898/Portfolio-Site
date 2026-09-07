# Session 28 — the per-petal mid-surface grid, captured and exported

**Scope, as ruled:** the capture and the export only. The `perDescriptor`
dedupe removal in `buildBloomInto` is **deliberately not done here** and is
scoped separately with its gate reconciliation, so that the structural change
does not swallow this one.

**0 bytes moved.** Measured, not constructed — see "The zero-byte claim" below.

---

## 1. The seam at u = 0 — the concern, measured, and what it actually is

The ruling for the export grid was: drop the two overhang foot rows, keep the
`s = 0` row as `u = 0`, giving a uniform 29-row grid at `u = 0, 1/28 … 1`. The
concern raised against it was that the `s = 0` row is built with `flatSect`
while the blade rows are built with `form.sectAt`, so the two might not meet.

**That concern is not the live one. The cross-section LAW is exactly
continuous across the seam.** `petalForm`'s `ramp(u)` is
`u >= FORM_ONSET_END ? 1 : u / FORM_ONSET_END`, so `ramp(0)` is exactly 0,
which makes `kAt(0, 0)` and `cAt(0, 0)` exactly 0, which makes `sectAt`'s
`aT = a`, `aN = 0`, `dT = 1`, `dN = 0` — character for character the
expression `flatSect` evaluates. Measured with **every form control at its
maximum** (roll 360, cup 1.0, cup gradient 1.0, roll taper 1.0, twist 180,
spine curl 360):

```
sectAt(u = 0) deviation from a straight chord = 0.00e+0
```

Exactly zero, not "small". This is asserted by clause 4 of
`tools/verify-bloom-grid.mjs` rather than left as a remembered result.

**What DOES step at the seam is the FRAME, and it is exactly `petalTilt`.**
The foot lies in the hub plane; the blade leaves at the tilt. Measured on the
captured grid, comparing the two rows' sheet normals:

| petalTilt | frame step across the seam |
|---|---|
| 0 | 0.0000° |
| 25 (shipping default) | 25.0000° |
| 75 (top of the slider) | 75.0000° |

Exactly the tilt, to six decimals, and pinned by clause 4b. **This step is the
junction's own geometry and it is in the emitted STL too** — it is not
introduced by the grid and cannot be removed by changing how the grid is
sampled.

**And the seam is not even the sharpest joint in its own neighbourhood.**
Measuring the turn angle at the `u = 1/28` vertex of a drawn u-line, against
the *same* measure one row later as its control:

| build | kink at the seam | kink one row later (control) |
|---|---|---|
| default (tilt 25) | 29.69° | **31.89°** |
| tilt 0 | 29.69° | **31.89°** |
| tilt 75 | 29.69° | **31.89°** |
| roll 360 | 24.32° | 27.58° |
| cup 1.0 | 28.68° | 30.55° |
| curl 360 | 32.34° | 33.76° |
| all form | 33.21° | 37.70° |

The seam turn is **smaller than its neighbour's on every row measured**. The
root region as a whole is strongly curved at this row pitch because
`rootBlend` collapses the half-width over `ROOT_BLEND_END = 0.30` — six rows —
and that is a property of the width profile, not of the foot drop.

**Continuity of the other two quantities, for completeness.** Position:
`base` and the `s = 0` foot row's centreline are the *same point*
(`attachment.point` measured 0.0e+0 from the row centre on every flat build;
7.1e-3 mm on a dome, and that residue is the measurement's chord-midpoint
proxy, not the code — the row's `C` is `[R·ring.radius, ring.z]` and `base` is
the identical expression). Half-width: `rootBlend(0) = footHalf` exactly, so
the width is continuous into the foot.

**The one case where the seam is genuinely violent is the dome**, and it is
the frame again, not the law:

| build | frame step |
|---|---|
| `headRise` 0.5 | 78.14° |
| `headRise` 1.0 (hemisphere) | 114.98° |

On a cap the foot lies on the sphere, whose normal at the rim is nearly
horizontal, while the blade tilts from the tangent plane. A consumer reading
the grid's *normals* near `u = 0` on a domed head should expect this;
`attachment.footNormal` is exported so it can be read rather than measured off
the points. On the dome the `u = 0` row is also a **great-circle arc**, not a
straight segment — measured 0.57 mm of bow at hemisphere — which is correct
(the foot is laid on the cap) and is why the dome's `chordDev` is not zero
where every flat build's is 8.9e-16.

**Conclusion: the ruling stands, and it stands for a different reason than the
one it was made for.** Keeping the `s = 0` row mixes no laws. It does inherit
one real crease — the tilt — which belongs to the junction and is present in
every other representation of this geometry.

---

## 2. What shipped

### `bloom-geometry.js`

- `MeshBuilder` takes `captureGrid` (default **false**, so every existing
  caller is unchanged). It is not a geometry switch: nothing downstream of it
  decides what to build.
- `emitPanel` collects the mid-surface it is **already evaluating** —
  `row.sect(v)`'s `P` and `n`, the vectors the two skins are offset from — and
  returns the panel's grid, or `null` when not capturing. The capture stores
  the **global `v`**, not the column index, because a trimmed panel runs over
  `[vLo, vHi]` and a consumer reconstructing `v` from `j` would be right on the
  default and wrong on every cleft.
- `buildPetalInto` returns `grid` (one entry per panel) and `attachment`
  (`point`, `dir`, `normal`, `tangent`, `footNormal`, `ringRadius`, `ringZ`,
  `tiltRad`, `azimuth`).

### `bloom-grid-gltf.js` (new)

`buildGridGltf(built, { mode, state })` → a `.glb`. One node per petal; the
petal's mesh is LINE_STRIPs — one per column (u-lines, base to tip) and one per
row (v-lines, across the width) — and a child node whose `translation` **is**
the attachment point, carrying a POINTS primitive so it is visible in a viewer
as well as machine-readable.

LINE_STRIP and not a triangulated patch because **the grid structure is the
deliverable**: the same points as triangles would throw away which are rows and
which are columns, which is exactly what the existing STL already does.

### `bloom.js` / `bloom.html`

A non-primary **Get grid ↓** button beside Get STL. It **follows
`shownMode()`** and the STL deliberately does not — the STL is the object being
made, so the print-preview toggle must never reach it; the grid is a
*description of what is on screen*, so it describes that and labels which it
was, in the filename (`bloom-grid-live.glb` / `-export.glb`), in
`asset.extras.mode`, and in the read-out.

### The two things carried because downstream cannot recover them

- **`metric` / `polyline`** (from the form telemetry). `v` is uniform in
  *parameter*, not arc length, so evenly spaced `v` is not evenly spaced
  millimetres. Measured range of `metricMax` across the gate's rows: **1.0000**
  under roll alone (the roll is an isometric bend) to **4.1231** under cup with
  a gradient — at that extreme a step in `v` near the margin covers four times
  the millimetres it covers at the midrib. **It is `null` on a flat build**,
  which is the shipping default, and a `1.0` written there instead would be a
  number standing in for a measurement nobody took. Clause 8 asserts both
  directions.
- **The mode label.** Live and export are different geometry here (the
  thickness floor moves the area rule moves the ring radius), so a grid without
  its mode names a computation the reader cannot identify. `buildGridGltf`
  **throws** rather than defaulting one.

---

## 3. The zero-byte claim — measured, and with a positive control

The construction is that the capture adds no arithmetic: `P` and `n` are
already computed and already consumed, and the capture pushes references. That
is an argument. Here is the measurement.

**Two trees, every matrix row, both modes, `Object.is` float by float** — a
worktree of the base commit `cb798f6` against this tree, comparing
`acc.positions` (the doubles the exporter is handed):

| matrix | rows | builds | floats compared | **moved** |
|---|---|---|---|---|
| live `buildMatrix` | 528 (0 refused) | 1056 | 328,820,760 | **0** |
| `phase17` (newest frozen, 6335ac4) | 507 (0 refused) | 1014 | 314,814,024 | **0** |

**This is strictly stronger than the STL hash diff** for this question: the STL
quantises to float32 and is compared by digest, so a moved double that rounded
to the same float32 would hash equal. This compares the doubles, and `Object.is`
means a `+0` → `-0` move is a difference too (`Object.is(-0, 0) === false`).

**Positive control — the comparison can fail.** A clean sheet from an
instrument that cannot detect a move is not evidence:

```
identical state                   no difference detected
petalLength 35 -> 35.0000001      DETECTED at float 654: 9.723964003217581 -> 9.723964006454395
petalTilt  25 -> 25.000000001     DETECTED at float 654: 9.723964003217581 -> 9.723964003198873
```

**And a vacuity guard, learned the hard way in this session.** The first run of
this comparison reported `0 moved` over **3 applied rows and 525 refused** —
`coerceValue(c, raw)` takes the control *object* and was being handed an id, so
every row threw and the clean sheet was a comparison of almost nothing. The
refusal count is now printed beside the result and is `0`. A "0 moved" without
its applied-row count is not a result.

**Separately, within this tree:** clause 1 of the new gate builds every one of
its 19 rows with the capture off and on and requires `acc.positions` identical
float for float, live and export. That is the flag's own claim; the two-tree run
above is the base-commit claim.

---

## 4. The gate

`node tools/verify-bloom-grid.mjs` — **528 checks over 19 rows**, PASS.
`node tools/verify-bloom-grid.mjs --negative-control` — six mutations, PASS.

Both STL gates are structurally blind to everything here: the capture emits no
triangles, so no edge census can move and no flood fill can split. A grid
describing a *different surface* from the one the mesh was built out of would
pass `verify-bloom-export`, pass `verify-bloom-connectedness`, produce an
identical triangle count and an identical STL byte length, and be wrong in the
only way that matters. Clause 2 is the witness: every captured point is
re-offset by its own normal and half-thickness and required to be present
**exactly** (shortest-round-trip string, no tolerance) among the emitted
vertices.

### The negative control found two defects in the gate itself

Both were fixed; both are the reason the control is not optional.

1. **`drops-all-three-foot-rows` left clause 3 GREEN.** Clause 3 read
   `built.petals[].grid` and applied its *own* foot filter, so it asserted a
   property of the **capture** and never of the **export** — the `.glb` could
   drop a different number of rows and nothing would notice. Clause 3 now reads
   the file's own declared `u` list, the `u` carried on each emitted v-line,
   `footRowsDropped`, and that the `u = 0` row's half-width is the *foot's*
   (a file that kept a blade row instead would still be uniform in `u` and
   still be wrong about the junction).
2. **`json-chunk-padded-with-nul` reddened clauses 6 and 7 as well as 5.** Not
   a bad mutation — a fragile gate: the reader stripped only `0x20`, so a
   NUL-padded chunk failed to parse, `json` came back null, and every clause
   reading `asset.extras` cascaded. The reader is now lenient about which pad
   byte it strips and **clause 5 alone judges which one was written**. A
   mutation reddening three clauses is not a negative control, it is a broken
   build wearing one.

### What the gate is blind to — stated here and in its own header

- It does not run the browser. The button, the download and the read-out line
  are unexercised by it (the smoke gate covers page load and STL export).
- It does not compare against the base commit. That is the two-tree run above.
- It validates the structure it wrote; a spec violation shared by the writer
  and the validator would pass.
- Clause 2 is a **membership** test: a grid carrying *extra* points that
  correspond to nothing emitted would pass it.

---

## 5. The retention gap — not closed, and said out loud in three places

`buildBloomInto` keeps **one petal per descriptor** under the layered arm, so
most designs export far fewer petals than they build:

| placement | petals in the file | petals built |
|---|---|---|
| RADIAL (shipping default) | **1** | 8 |
| RADIAL, 3 layers | 3 | 24 |
| SPIRAL | 1 | 8 |
| FAN | 1 | 7 |
| CONTINUOUS | 8 | 8 |
| CONTINUOUS, 60 petals | 60 | 60 |

Only CONTINUOUS returns one grid per petal. This was ruled out of scope for
this session on purpose. Because a reader could otherwise open the default
file and conclude the bloom has one petal, the gap is reported in **three**
places: `asset.extras.petalsEmitted` / `petalsBuilt`, a prose
`asset.extras.retentionNote`, and the read-out line at the button
(`1 of 8 petals (one per descriptor — CONTINUOUS returns all)`). Clause 7
asserts all of it against the build.

---

## 6. File sizes

| build | `.glb` | LINE_STRIPs | nodes |
|---|---|---|---|
| default (1 petal) | 23 KB | 39 | 2 |
| 3 layers (3 petals) | 65 KB | 117 | 6 |
| CONTINUOUS 60 (60 petals) | 1,269 KB | 2,340 | 120 |

No triangle-budget check, because there are no triangles: the budget refuses an
STL nobody could slice, and this file's size is bounded by petals × rows ×
columns. The point count is reported instead.

---

## 7. Things a next session would otherwise rediscover

1. **`NV = 10` is EVEN, so no grid column lies on `v = 0`.** The columns are at
   `v = -1, -7/9 … +7/9, +1`. There is **no midrib line in the grid**. The
   spine is exported separately (`extras.spine.rows`) for exactly this reason.
2. **The three foot rows all carry `u = 0`.** They are three *positions* at one
   parameter (`-overhang`, `-overhang/2`, `0` along the radial), which is why a
   grid keyed on `u` cannot hold them and why the drop is a drop of positions.
3. **A cleft is three panels, not one grid.** `trimPanels` returns a shared base
   plus two lobes that both start `PANEL_OVERLAP_ROWS` below the split, so the
   export emits one grid per panel and labels it. Unreachable today
   (`capability` is `null`; it is a test hook), but the shape is already right.
   The foot drop is index-based on the **petal's** row index, so lobe panels —
   whose first row is already a blade row — correctly drop nothing.
4. **`form` telemetry is `null` on a flat build**, which is the shipping
   default. Anything reading `metricMin` must handle that.
5. **The environment needs `npm i --no-save playwright-core three@0.161.0` in
   ONE line.** A second `--no-save` install prunes the first one's packages —
   this is in the skill and it bit again here (the smoke gate failed on the
   *base* tree until `three` was installed, which is also the reminder to check
   the before column before attributing a red to your own change).

---

## Standing gaps this session did not touch

- The `perDescriptor` dedupe and its gate reconciliation — scoped separately,
  by ruling.
- The grid is mid-surface only. Thickness is carried per row
  (`panels[].thicknessMm`) so a consumer can re-offset, but no skin is exported.
- Nothing here has been printed, and nothing here is printable.
