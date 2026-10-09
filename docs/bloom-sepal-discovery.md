# Sepals — discovery (Oct 9): what exists, what we would build off, what we could do

**Nothing in the generator moved.** `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`,
`bloom.html`, `bloom.css` and `tools/bloom-harness.mjs` are untouched. The deliverables are this
doc, one sheet tool (`tools/shot-bloom-sepal-discovery.mjs`, wired to no gate) and its output,
`docs/img/sepal-discovery.png` with the per-cell numbers in `docs/img/sepal-discovery.json`.
Measured on `main` at `ee91b94` (#385, the lobed leaf), the newest head when this session
branched. The leaf overhaul S1–S4 (#377, #378, #380, #381, #383, #385) and the TUBE (#323 and
after) are all on that head.

![the sheet](img/sepal-discovery.png)

The sheet is built in Node through the shipped `buildBloomInto`, in EXPORT mode, and drawn with
the deterministic soft renderer, so the same tree gives the same bytes. **No pixel delta is
quoted anywhere.** Sepals are tinted green. Which triangles are sepals is MEASURED: the tool
builds the same state with `sepalCount` 0 and takes the run from the first differing triangle,
`built.sepals.tris` long. One cell, **PROTO: TOOTHED SEPAL**, is not the shipped geometry; see
§2.

---

## 0. The premise check: sepals already exist, and they ship

The brief says sepals "have never been discussed as a feature". **That is not true of this
repository, and it is the first finding.** The bloom has had sepals since **#243
(`eb2aaa7`, Sep 17), "Sepals, part 1"**. Eva ruled the design over two rounds ("a sepal is a
petal"). The record is `docs/bloom-sepals-outcome.md` (662 lines). The `CLAUDE.md` pointer block
is headed **A SEPAL IS THE PETAL BUILDER ON A SECOND RING**.

What ships today:

- **21 controls in 4 panel sections.** The sections are `Sepals`, `Sepal shape`, `Sepal form`
  and `Sepal curl`, between Center and Stem, all at the Standard tier.
- **72 matrix rows** in block 35, plus 8 cross-feature rows, so **80 of the 1,261 live rows build
  sepals**.
- **9 smoke rows.**
- **The SP0–SP9 assertion family**, in both STL gates.
- **9 mutants** in the apex table.
- **Three verification tools:** the byte tool `verify-bloom-sepal-bytes.mjs`, the decoupling
  sweep `verify-bloom-sepal-decoupled.mjs` and the dense contact re-draw `bloom-sepal-contact.mjs`.
- **A sheet**, `shot-bloom-sepals.mjs`.

The feature ships **OFF**: `sepalCount` defaults to 0, so **the shipping default renders no
sepals at all** (sheet cell 1, `SHIPPING DEFAULT`, 24,688 triangles).

Two further stale premises, for the record:

- **The `flower-project` skill is stale here.** Its "Junction ≠ base ornament" section says of
  sepals and the base ornament "Neither is built yet". Its "Known gaps" section calls sepals
  "Untouched". On the bloom, sepals are built. A base ornament is not.
- **The lace FLOWER generator has its own, separate sepals** (`flower-geometry.js`
  `buildSepalsInto`, `flower-registry.js`, `flower-presets.js`). It is a different generator, out
  of scope here, and nothing below refers to it.

**The brief's framing — "purely as hub decoration … not a structural calyx, not botanically
faithful" — is not contradicted by what shipped.** The shipped sepals are a decorative whorl:
the petal builder's own blade law with its own values. They carry no structural role: the
junction is the hub's, and sepals add nothing to it. What *is* open is whether "around the hub"
means where they ship today. That is Q1.

---

## 1. Inventory

### 1.1 Every reference

| where | what |
|---|---|
| `bloom-geometry.js` (195 lines mention sepals) | The `SEPAL_*` range and default constants (`:16869–16878`, `SEPAL_HEIGHT_*` `:18539`); `SEPAL_TWINS` (`:16887`, 15 pairs); `sepalsEligible` / `sepalsAbsent` (`:16900`); **`sepalBladeState`** (`:16902`); `laminaFromPanels` (the contact lamina); `sepalAttachment` (`:18542`); `sepalAngleLimit` (`:18696`); **`buildSepalsInto`** (`:18777`); `footRing()`'s FOURTH descriptor kind, `fr.sepals`; the budget-cap decision's `sepalTipShape` ramp; the crowding raster's sepal feet (`:3459`). It is called once, from `buildBloomCore` (`:19810`), after the gynoecium and before the inflorescence. |
| `bloom-registry.js` (85) | The predicates `sepalsEligible` / `sepalsPresent` (`:447–448`); four sections (`:1169–1172`); five hand-written rows (`sepalCount`, `sepalScale`, `sepalHeight`, `sepalPhase`, `sepalFootBreadth`, plus `sepalAngle` in Sepal curl, `:3643–3719`); **15 generated twin rows** (`sepalTwinControls`, `:4518`, generated from `SEPAL_TWINS` so a pair cannot drift). |
| `bloom.js` (59) | The read-out lines, the `cap` ticks (count ceiling, angle limit) and the metrics projection. |
| `bloom-grid-gltf.js` (1) | A comment. **The `.glb` grid export does not carry the sepals.** |
| `tools/bloom-harness.mjs` (2,147) | SP0–SP9; block 35; 11 `SELF_INTERSECTION_XFAIL` entries (§1.7); sepal rows in E2 declarations; the decoupling list. |
| Other tools | `verify-bloom-sepal-bytes`, `-sepal-decoupled`, `bloom-sepal-contact`, `shot-bloom-sepals`, the smoke census (block 35, 9 rows), the crowding and coverage instruments (R1 counts sepals through the builder), the defaults bar (one row; see §1.7), and the apex mutants (9 `sepal-*`). |
| Saved designs | **None.** The bloom persists no design and ships no presets. The only stored control sets are the matrix rows and the frozen phases. Sepal ids are named by 76 to 83 rows in every frozen phase from `phase35` to `phase58`. |

### 1.2 How they are built

**Sepals reuse the petal builder. There is no sepal builder and no leaf-builder reuse.**
`buildSepalsInto` does four things:

1. It asks `sepalAngleLimit` how far the sepals may rise.
2. It forms one substate, `bs = sepalBladeState(state, angleBuilt)`.
3. It calls the shared whorl primitive `buildWhorlInto` on the `fr.sepals` ring.
4. For each slot, it calls **`buildPetalInto(acc, bs, sepals.ring, slot, …)`**, the same
   function every petal goes through.

There are no sepal-specific shape ids: the blade is `petalSurface` → `widthProfile` +
`petalForm` → `bladeStations` → `emitPanel`, exactly as a petal's.

`sepalBladeState` is the whole difference:

```js
{ ...state, petalTilt: angleDeg, petalTipEnd: 0, fringeCount: 0, lobeDepth: 0, petalInfill: 'NONE',
  [petalId]: Number(state[sepalId]) for each of the 15 SEPAL_TWINS }
```

Length and width scale through the whorl's `slot.scale = sepalScale`, the same arithmetic as an
inner whorl's `layerSize`.

**Cost: 3,062 triangles a sepal**, fixed, and the same in LIVE and EXPORT. Sheet figures, EXPORT:

| state | triangles | of which the sepals |
|---|---|---|
| default | 24,688 | — |
| 5 sepals | 39,998 | 15,310 |
| 8 sepals | 49,184 | 24,496 |
| 40 sepals on 40 petals | 245,152 | 122,480 |

`ALL MAX` carries 40 sepals and is the declared export refusal.

### 1.3 Controls

| control | range | default | notes |
|---|---|---|---|
| `sepalCount` | 0–40 | **0** (the guard) | Clamped to the petal count of the placement (the outer whorl's n; the fan's k; one turn under CONTINUOUS), and told. |
| `sepalScale` | 0.20–1.00 | 0.60 | One factor for length AND width. **The session's own pick, never ruled** (§1.8). |
| `sepalHeight` | 0–1 | 0.75 | Eva's value. A fraction of the hub-to-stem join's axial extent; INERT, and told, where there is no hub below the head. |
| `sepalPhase` | 0–1 | 0.50 | 0 is aligned with a petal, 0.5 interleaved, 1.0 aligned with the next petal. |
| `sepalFootBreadth` | 0.25–1.50 | 1.00 | Clamped to the foot floors, and told. |
| `sepalAngle` (Sepal curl) | −90..90, step 1 | 0 | Clamped at the **drawn** contact limit, and told. |
| 15 twins | each petal control's own | each petal control's own | Base taper, tip shape, tip taper, cup, cup gradient, the three buckle controls, apex sweep, roll, roll taper, spine curl, curl bias, curl start, twist. |

**Visibility:**

- Every sub-control is hidden AND inert at `sepalCount` 0. SP0 asserts that the registry's
  `sepalsPresent` and the geometry's `sepalsAbsent` agree.
- The whole family is hidden and inert under SPHERE. The read-out says "UNAVAILABLE under SPHERE",
  and SP9 asserts that nothing was built.

**Reachability:**

- The controls are reachable from the panel. The panel gate (`bloom-panel.yml`) passes on `main`,
  and it is the gate that proves every control renders once and still works inside a collapsed
  section.

**Not exposed, deliberately:**

- **Thickness** is the shared `Part thickness` section. One material; asserted by the decoupling
  sweep.
- **Per-sepal roles** do not exist.
- **The capability hook `{ sepalAngleUnclamped: true }`** builds past the limit. No control
  reaches it.

### 1.4 Where they attach, and how count and phase are placed

There are two attachment modes, and `sepalAttachment` is the one owner of the solve.

- **RIM.** Used where there is no hub below the head: no stem (the shipping default), an inert
  join, or a dome whose bowl holds the stem end above the join. The sepal ring is
  `fr.sepals.ring`.
  - It has **the same radius as the petal ring** (8.845 mm on the default) and the petal foot's
    own overhang (3.538 mm).
  - Its foot is **0.60 of the petal foot's width** (3.84 against 6.40 mm), because the foot is
    scaled by `sepalScale`.
  - It sits at `z = 0`.

  So on a stemless bloom the sepals leave **the same circle as the petals**, and differ only in
  angle: 0° against the petals' 25° tilt. Sheet cell 3, `SAME, SIDE`, shows this.

- **HUB.** Used where a stem's hub-to-stem join flares below the head. The whorl attaches
  `sepalHeight` of the way up the join's axial extent, by the join reading (§12a of the sepals
  outcome doc). At the shipped 6 mm stem that is **0.33 mm under the head**. The foot runs inward
  through the whorl primitive's `height` argument.

**Placement:**

- **Count.** `min(asked, ceiling)`.
- **Phase.**
  - On RADIAL and SPIRAL it is a fraction of the petal pitch.
  - On a FAN, a `LIST` arm of `buildWhorlInto` takes the k fan positions nearest the mirror line.
    Mirror symmetry there is measured and told, not assumed.
  - Under CONTINUOUS there is no pitch, and the fraction is applied against slot 0's azimuth.
- **Under the variance fields, the sepals stay at their nominal azimuths.** They take no size,
  form or spacing field, by declaration. Rows: `VARIANCE: x SEPALS`, `FORM VARIANCE: x SEPALS`
  and `SPACING VARIANCE: 0.9 x SEPALS`.

### 1.5 What sepals inherit and what they pin

| treatment | sepals | mechanism |
|---|---|---|
| Edge profile (taper + half-round bead, #278) | **Inherited** | `emitPanel`'s rim block: the same builder. |
| Apex nib (rounded 0.40 mm face, #283) | **Inherited** | `petalTipEnd` is zeroed, so the nib's squared-terminal guard never fires. Row: `APEX NIB: x SEPALS`. |
| Petal tip law (`petalTipShape`) and the apex row ramp | **Own twin** | `sepalTipShape`. The budget decision ramps the sepal ring off its own tip shape. |
| Cup, and the fold clamp on the cup | **Own twin** (`sepalCup`); **the clamp is inherited** | `petalForm` / `cupScale`. `cupClampLine` prints over every sepal. |
| Roll, curl, twist, buckle, apex sweep, cup gradient | **Own twins** | `SEPAL_TWINS`. |
| Lobes / serration (petal) | **Pinned off** | `lobeDepth: 0`. Part 2 is costed, not built. |
| Fringe / squared terminal | **Pinned off** | `fringeCount: 0`, `petalTipEnd: 0`. |
| Leaf tooth-relief floor (S2) | **Not applicable** | It is a leaf cap (`cap.toothReliefFloorMm`) and never set on the petal path. |
| Leaf outline types (LOBED chevron, COMPOUND) | **Not reachable** | They live in `leafSurface` / `lobedSurface` / `buildCompoundLeafInto`. |
| Voronoi infill | **Pinned off** | `petalInfill: 'NONE'` (Eva's ruling 4 of the Voronoi port). Row: `INFILL: x sepals 8`. |
| TUBE (corolla fusion) | **Not wired** | The tube is per petal LAYER (`tubeLayerN`), and the sepal ring is not a layer. **The sepal limit is drawn against FREE petals** — it ignores the tube's ring. That is TUBE open question Q3 (`docs/bloom-tube-outcome.md` §8). |
| Variance (size, form, spacing) | **Not taken** | By declaration. Sepal variance is ruled ("ruling 5: independent sepal amounts, defaulting to the petals'") and not built. The registry has no follow-another-control mechanism. |
| Petal per-slot roles and overrides | **Not taken** | The sepal ring has `overrides: null`. |
| Thickness | **Shared** | `Part thickness`. |

### 1.6 Inflorescence

**Every floret builds the head's sepal whorl too.** This is ruling 10 of the inflorescence work,
and the row is `INFLO: x SEPALS`. A floret is one whole `buildBloomInto` call, and `PEDICEL_PINS`
does not pin `sepalCount`.

Measured, at a 60 mm rachis (one floret fits):

| state | triangles |
|---|---|
| raceme without sepals | 44,308 |
| raceme with 5 sepals | 74,928 |

The difference is 30,620 = 15,310 for the head + 15,310 for the floret. So **sepals multiply
with the floret count**, and the floret's whorl is clamped to its own `floretPetals`. The sheet's
raceme cell (120 mm rachis, 4 florets, 173,112 triangles) tints only the head's sepals.

### 1.7 Print status

**Both long gates are green on `main` at `ee91b94`, with every sepal row in them.**

- `bloom-export-watertight` (run 37865440134) and `bloom-connectedness` (run 37865440127)
  cover the full 1,261-row matrix. That includes all 72 block-35 rows and the 8 cross-feature
  rows.
- **A local foreground re-run of the sepal subset** used `verify-bloom-export.mjs --only` over
  18 rows: the 9 smoke rows, `sepalCount max`, and every cross-feature sepal row except
  `ALL MAX`. Result: **PASS, 18 of 18 watertight**.
  - Live and export triangle counts are identical, with 0 degenerate triangles.
  - Two declared self-intersection xfails held at their recorded magnitudes.
  - 0 rows flagged CROWDED.

**Census (X1/X2): 11 sepal rows are declared in `SELF_INTERSECTION_XFAIL`. None is a sepal
defect.** They fall into four classes:

- **The ALIGNED WELD — 7 rows.**
  - At phase 0, the sepal foot's columns are bit-equal to the petal foot's (0.6 is 3/5).
  - The census welds the two into one shell, so the by-design overlap reads as a fold.
  - The interleaved default reads 0 at every angle.
  - The worst row is the crowded corner: 16,920 pairs.
- **The DESCENDING SEAM — 1 row** (`angle min (-90)`, 50 pairs / 0.3225 mm).
  - The petal builder folds at its own foot-to-blade seam on a blade turned down past about −55°.
  - The clearance law was derived for the top skin. This is the seam owner's, and unscheduled.
- **The head's own hemisphere fold — 1 row.**
- **The petal builder's own roll and curl folds on the shorter blade — 3 rows** (`sepalRoll ±330`,
  `sepalSpineCurl max`).

**Print floors.**

- **Sheet.** The sheet is shared, so a sepal is never thinner than a petal: 1.00 mm export floor,
  1.20 mm shipped.
- **Foot.** The sepal foot is clamped to `[FOOT_MIN_WIDTH_MM 1.60, FOOT_MAX 10]`, and told. The
  `foot breadth min (0.25)` row binds it.
- **Rim.** The rim is #278's bead with its narrow-span clamp. The edge-profile gate draws from the
  smoke subset, which includes sepal rows.
- **Material.** Nothing here has been printed (SLS PA12). Every floor is a declared guess, as
  everywhere in this project.

**ONE INSTRUMENT FINDING — the defaults-bar's sepal row measures a PETAL, not a sepal.**
`tools/verify-bloom-defaults-bar.mjs` lists `the sepals at the shipped whorl` with
`measures: ['self']`. `measureSelf` reads `m.petal.grid`. `m.petal` is the representative
petal, `petalsAll[0]`, and never a sepal (measured: `b.sepals.built.includes(b.petal) === false`).

| reading | self (mm) |
|---|---|
| that row, with the 5 sepals | 1.2377 |
| that row, with no sepals | **1.2377**, bit-identical |
| the sepal's own lamina, through the same `measureWall` | 1.2288 (wall 1.2000) — clears the 1.00 bar |

So **that row cannot fail for any sepal**. This is the fifth durable rule: a clause whose subject
excludes the thing it doubts.

The wall instrument and the combination gate carry **no sepal row at all** (0 mentions). The
sepal twins at their extremes are therefore measured by nothing on `self`. Readings taken this
session, on the sepal's own grid:

| state | self (mm) | wall (mm) |
|---|---|---|
| `sepalCup 1.2` | 1.1522 | 1.1320 |
| `sepalSpineCurl 360` | 1.2180 | 1.1963 |
| `sepalScale 0.2` | 1.2245 | 1.2000 |
| **`sepalRoll 330`** | **0.8764 — under the bar** | 0.8563 |

The `sepalRoll 330` reading is the petal's own `roll-max` class on a shorter blade. Reported, not
fixed: this session ships nothing (Q7).

**Default sweep / `ALL MAX`.**

- `ALL MAX` takes `sepalCount 40`. The blanket sweep hands every top-level slider its maximum.
- The 20 sub-controls are hidden at DEFAULTS and so stay out of the sweep. `ALL MAX` builds 40
  sepals at the sub-controls' DEFAULTS.
- Its census and refusal entries are recorded with the sepals in.
- `sepalCount max (40)` is its own sweep row.
- Block 35 sweeps every twin to both ends.

### 1.8 Open items carried from the sepals sessions, never ruled

These are in `docs/bloom-sepals-outcome.md` §11 and §12i, and are repeated in
`docs/bloom-state-of-play-oct-5.md`:

1. **`sepalScale` 0.60.** The session's pick, from its own sheet.
2. **The two readings of the hub's axial extent.** The join reading is built; the whole-body
   reading would put the shipped default 0.03 mm under the plate's mid-plane.
3. **The descending-seam fold.** Reflexed past about −55°.
4. **Sepal variance's "follow the petals" mechanism.** Ruled, with no registry mechanism to carry it.
5. **TUBE Q3.** The sepal limit ignores the tube's ring.

---

## 2. What we would be building off — the three candidates, measured

**The structural finding first: A and C are the same code, and B shares the same blade law.**
The leaf overhaul did not build a separate blade tree. Both blades end in the same calls:

- `leafBladeLaw` calls `petalForm` and `widthProfile` (with `cap.petiole`).
- `leafSurface` hands the rows to the same `emitPanel`.

What differs is the **entry point**:

| | the petal entry (`petalSurface`) | the leaf entry (`leafSurface`) |
|---|---|---|
| **root** | a foot on a ring (`footRing`) | a petiole rod |
| **seam** | seam clearance | — |
| **row stations** | the turning-rate ladder | `LEAF_BLADE_ROWS` uniform stations |
| **apex** | the nib | the 1.60 mm stub |
| **fold clamp** | the cup clamp | the cup clamp |
| **outline types** | lobes, fringe | serration with the 1 mm relief floor, plus LOBED (chevron) and COMPOUND |

So "which foundation" is really two questions:

- **Which ROOT** does a sepal have?
- **Which OUTLINE FAMILY** can it reach?

| | A — keep/extend the shipped path | B — re-root on the leaf blade path | C — a constrained petal layer |
|---|---|---|---|
| **What it is** | Sepals as shipped. Part 2 adds the rim family as twins. | Build each sepal through `leafSurface` / `lobedSurface` with no petiole, footed on the hub. | Another petal whorl (the `layerCount` system) with a separate state. |
| **Reused for free** | Everything in §1.5: bead, nib, cup clamp, the drawn angle limit, attachment, SP0–SP9, all 72 rows. **Part 2 is zero geometry**: `widthProfile` reads `ps`, so lobes and fringe arrive through the substate. 8 twin rows. | The leaf's outline types (LOBED chevron, COMPOUND), its tooth floor, its arch convention. | The layer roles (`inner*`), the tube (it is per layer). |
| **What breaks / is new** | Nothing. The LOBED chevron and COMPOUND types are not reachable; wiring them to a foot is a new primitive. | **The root.** A leaf blade starts buried in a petiole rod. A sepal on the hub needs a foot, the seam clearance, the drawn angle limit and the attachment solve. All of that is A's, and would have to be rebuilt or carried across. **The nib is lost** (leaves end on the 1.60 mm stub). **Every sepal row's bytes move**: 80 live rows and every frozen phase from `phase35` on. That is a partition event. SP0–SP9 are re-derived. | **Layers step INWARD and smaller** (`layerSize`, the area rule), and nothing places a whorl outside or below the outer petals. Sheet cell `C: A 2ND PETAL LAYER` shows this. An outer "layer" is a new primitive, and it is exactly the sepal ring A already has. Layer controls are shared deltas (`innerCurl` …), not an independent set. |
| **Saved designs** | None persist. New twin ids only; no id renamed; matrix rows untouched where the guard holds (`lobeDepth` 0). | None persist. Ids could stay (labels only), but the frozen phases' BYTES stop reproducing on every sepal row. Their definitions still would. | Would need new ids, or retire the sepal ids (`RETIRED_IDS`). |
| **Fit with "decoration around the hub"** | Good: an independent whorl with its own shape, placed under the petals. The panel says "a sepal is a petal", which is accurate and is Eva's prior ruling. | Good for LEAF-LIKE sepals. Awkward for petal-like ones: it imposes the leaf's rulings (tooth floor, `LEAF_CUP`, the stub). | Poor: it reads as a second corolla, and sheet cell `8 ALIGNED SIZE 1` shows a sepal at size 1 does too. |

**Two cells on the sheet make B's main attraction concrete without leaving A:**

- **`A: LEAF OUTLINE`.** The sepal twins are set to the leaf's own constants: base taper 0.85,
  tip taper 1.15, tip shape 1.30, cup 0.35. These are shipped sliders. **The leaf outline is
  reachable today.**
  - The drawn angle limit drops from 18° to 14°, because the blade is wider near the base.
- **`PROTO: TOOTHED SEPAL` — a prototype, NOT SHIPPED.** It is a patched copy of
  `bloom-geometry.js`, written to a temp directory, in which `sepalBladeState` passes a tooth cut
  (depth 0.26, 6 teeth, coverage 1, crest and notch 2.00) instead of zeroing `lobeDepth`.
  - **The witness:**
    - At tooth depth 0 the patched module is **byte-identical to `main`** (0 floats differ over
      the whole bloom).
    - With teeth, **93,870 floats move, by up to 1.529 mm**.
    - **The triangle count is unchanged at 42,200.** The cut is on a fixed lattice, as the
      petal's lobes are.
  - That is §10 of the sepals doc made visible: **the rim family on a sepal is zero geometry.**
  - **What the prototype does NOT do:** apply the leaf's 1 mm tooth-relief floor (a leaf cap);
    add the 8 twin controls; touch any instrument.
- **What A cannot reach without new work:** the LOBED chevron lattice (a different surface law,
  `lobedSurface`) and the COMPOUND leaf (rachis plus stalked leaflets).

---

## 3. What we could do from here — grouped by geometry mechanism

Grouped by mechanism, not ranked by taste. Each item is tagged with its cost:

- **built** — ships today.
- **free** — the mechanism exists and needs only exposure: a twin row or one value.
- **small** — the mechanism exists and needs wiring.
- **new** — a new primitive.

**Placement on the ring** (the whorl primitive)

- Count and phase relative to the petals: **built**.
- More sepals than petals: **small**. The ceiling is a rule in `fr.sepals`, not a geometric limit.
- Sepals that follow the variance fields (size, form, spacing — "defaulting to the petals'"):
  **small**. `buildWhorlInto` already takes the size field; the registry has no follow mechanism.
- A second sepal whorl (epicalyx): **new**. It would be a fifth descriptor kind. The whorl
  primitive was built so this is "free later" — `docs/bloom-charter.md`'s own claim.
- Per-sepal roles: **new**.

**Outline** (the substate into `widthProfile`)

- Length and width via one size factor: **built**. Separate length and width factors: **small**
  (two rows).
- Tapers and tip shape: **built** (twins).
- A leaf-like outline: **built**, reachable through the twins (sheet cell).
- Lobes, serration, fringe: **free**. 8 twin rows, zero geometry; prototype rendered.
- The 1 mm tooth floor on sepal teeth: **small**. It is one cap field; whether it applies is a
  ruling.
- LOBED chevron or COMPOUND sepals: **new** on a foot.

**Pose** (the blade frame and the angle limit)

- Angle −90..90, clamped at the DRAWN contact limit: **built**.
  - The limit is 21° interleaved / 24° aligned at the rim, and 18° on the shipped stem.
- Cupped or curled up toward the petals: **built, but bounded by contact**.
  - On the sheet, `CUPPED + CURLED UP` (cup 1.2, curl 120, asked 90°) is built at **−37°**: the
    curl carries the blade over the petals, so the limit goes negative.
  - **A sepal that wraps up around the corolla is unreachable**, because the limit forbids
    passing through a petal.
- Reflexed down: **built** to −90°. It folds at the seam past about −55° (open).

**How they meet the hub** (the attachment solve)

- At the rim / partway down the hub-to-stem join: **built** (`sepalHeight`).
- **On the hub's top face, inside the petal roots: new.**
  - Today that face is the bare disc inside the innermost petal row, about 10.6 mm across on the
    default (8.845 − 3.538 = 5.31 mm radius). It is the centre's region.
  - The androecium and gynoecium already decorate it (sheet cell `FACE WITH A CENTRE`).
  - The **CORONA** — "a flared collar between petals and stamens" — is a reserved name there from
    session 20.
  - Blades rooted on the face would cross the petal feet and the stamen roots.
- Sepals on a SPHERE head: **new**. Unavailable today: there is no underside ring.

**Fusion** (the TUBE mechanism)

- A calyx cup (sepals fused partway up): **small to new**.
  - The tube machinery exists and is per PETAL layer.
  - Wiring it to the sepal ring is a new descriptor in `tubePlan`.
  - Q3 (the sepal limit ignoring the ring) would have to be answered at the same time.
  - Sheet cell `TUBE ON PETALS` shows the mechanism on the petals.

**Surface**

- Voronoi infill on sepals: **free** (one pinned value). Gated on Eva's ruling.
- An own sepal thickness: **new** in kind. It is a second material; today the sheet is shared by
  declaration.

**Instancing**

- Sepals on every floret: **built** (ruling 10).
- Head-only sepals: **free** (one `PEDICEL_PINS` entry). That is a ruling.

---

## 4. Open questions for Eva

Each is multiple choice. None is resolved here.

**Q1. "Around the hub" means:**

- (a) **The botanical position.** Under and behind the petal whorl, from the rim or partway down
  the hub-to-stem join. This is what ships.
- (b) **Literally decorating the hub's top face**, inside the petal roots. This is the centre's
  region and the reserved corona.
- (c) **Both**, as two separate features.

**Q2. This work is:**

- (a) **Extending** the shipped sepals (#243).
- (b) **Replacing** them. That is a partition event; the ids would stay and the labels move.
- (c) **A separate decoration** beside them.

**Q3. The foundation:**

- (A) The shipped petal-builder path, extended by twins.
- (B) Re-root on the leaf path. This loses the nib and the drawn limit, and moves every sepal row.
- (A+) A's root, plus the leaf's outline family passed through the substate where it can be.
  Lobes and serration are free; the chevron and compound types would be new.

**Q4. The shipping default:**

- (a) Stays at `sepalCount` 0.
- (b) Gains a whorl. That moves every matrix row whose state has no `sepalCount`: a partition
  event and a frozen phase.

**Q5. Florets:**

- (a) Keep inheriting the head's sepals (ruling 10).
- (b) Pin them off on pedicels.

**Q6. Sepal teeth, if the rim family ships:**

- (a) The petal lobes' rule, with no relief floor.
- (b) The leaf's 1 mm relief floor.
- (c) Its own floor.

**Q7. The defaults-bar's sepal row measures the petal:**

- (a) Fix it to read the sepal's own lamina in the next sepal build.
- (b) Fix it now, in a hygiene PR.
- (c) Also add a sepal row to the wall instrument and the combination gate (`sepalRoll 330` reads
  0.876 mm, under the bar, today).

**Q8. The five never-ruled carry-overs (§1.8):**

- (a) Rule them now (sheet cells on request).
- (b) Fold them into whichever sepal build comes next.

The five are: `sepalScale` 0.60, the axial-extent reading, the descending seam, the follow
mechanism, and TUBE Q3.

---

## 5. Reproduce

```
npm i --no-save playwright-core                      # only for the export gate; the sheet tool needs nothing
node tools/shot-bloom-sepal-discovery.mjs docs/img/sepal-discovery.png --json docs/img/sepal-discovery.json
node tools/verify-bloom-export.mjs --only '<the 18-row regex in §1.7>'
```

The sheet takes about 15 s. The tool refuses to render the prototype cell if its
`sepalBladeState` anchor does not match exactly once.
