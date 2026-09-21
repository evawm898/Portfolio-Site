# Petal edge profile — taper + bead on the free rim

Session outcome. **Read §1 before scheduling any follow-up**: four of the
brief's premises are wrong about this repository, and two of the three
boundary types it names do not exist.

## 1. What the brief named, and what is actually here

The brief's mechanism — *"the up/down offset surfaces are stitched with a flat
strip across the boundary"* — is `MeshAccumulator.addBladeSolid` in `flower.js`,
whose own header reads *"offset ±half-thickness along its normal into a top face
(+n) and a bottom face (-n); the whole grid perimeter is then sealed with a
wall"*. That is the FLOWER. Four of its other premises are not.

| brief says | measured |
|---|---|
| "the 28-row smoke subset" | `smoke: true` appears **exactly 28** times in `verify-flower-export.mjs`. ✔ the flower's |
| "POINTED/ARCHED apexes" | `petalShape` is ROUNDED / POINTED / STRAP / CLAWED / LOBED. **There is no ARCHED.** |
| "the inner edges of LACE cutouts" | **There is no LACE boundary type.** `infillType: 'lace'` is a RETIRED value migrated to `veins` (`flower.js`), and `acc-lace` is a *section label* over the infill controls. The nearest real thing — the Voronoi hole rim — **is already filleted** (§3). |
| "the /plot grid glTF export" | `/plot` reads the **BLOOM's** grid (`plot-grid.js:1`: *"reading a bloom grid glTF"*). No flower file can reach it. |
| "the solidified petal" | In this generator the **petal is lace** (ribbons + a perforated slab + a margin rib tube). `addBladeSolid` is reached by SOLID **sepals**, **leaves** and **petaloid-fill centres** — and by nothing else. The render in `docs/img/flower-edge-profile.png` shows it: the solid blades are the sepals. |

## 2. What shipped

`edgeThickness()` plus a bead column in `addBladeSolid`. Two terms:

* a **taper** easing the body to `EDGE_FLOOR_MM` (1.0) over `EDGE_TAPER_MM`
  (3.0) of **surface distance in millimetres**, accumulated along the lattice —
  never a grid parameter, because a blade grid converges hard at a POINTED apex
  and a taper in `v` would spend its whole travel in the cells where the petal
  is thinnest;
* a **half-round bead**, `BEAD_SEGMENTS` = 8, **inset** so its apex lands on the
  original boundary vertex and the silhouette is preserved to the vertex.

Smootherstep, not linear: zero slope at *both* ends, so the taper starts without
a crease **and arrives flat**, which is what makes the bead tangent to the face
rather than merely adjacent to it.

**The new emitter is a strict generalisation of the one it replaces.** At
`BEAD_SEGMENTS` 1 and radius 0 its samples are exactly (top, bottom) and it emits
`push(t0, b0, t1, t1, b0, b1)` — the previous wall quad, triangle for triangle.
That identity is what says the base stretch (row 0, the receptacle's join, out of
scope) is *untouched* rather than merely similar.

### Measured

`node tools/verify-flower-export.mjs --smoke` — **33/33 exported configs
`boundaryEdges = 0`**, including the solid-sepal, petaloid-fill and fiddlehead
rows, which are the ones reaching `addBladeSolid`.

`node tools/measure-flower-edge.mjs` reads the edge off the **exported STL** — no
page hook, no reading a record the emitter wrote. Sepals ON minus sepals OFF, same
instrument, both trees:

| | main | branch |
|---|---|---|
| sepal-blade triangles | 25,352 | 32,632 (+28.7%) |
| cliff-band edges (dihedral 80–100°) | 1,009 | **309 (−69.4%)** |
| boundary edges | 0 | 0 |

Whole flower: 131,464 → 138,744 export tris (**+5.5%**); live 124,454 → 131,734.
The residual 309 is the **base stretch**, deliberately left flat, plus the rim
tube. Isolating those further needs a part-aware instrument that was not built.

**Inert where no solid blade is built**, measured rather than argued: a fixture
with no sepals and no leaves is byte-identical between the trees (106,112 tris,
identical dihedral histogram).

## 3. The three gates that cannot pass as written, with the numbers

1. **`rim-floor` ≥ 1.0 mm conflicts with the shipped `thickEdge` control.**
   `thickEdge` exists to drive the margin to a knife edge — `THICK_EDGE_MIN` 0.16
   takes the default 1.398 mm body to **0.224 mm**, floored to 0.8 at export. The
   ruling's own carve-out ("where body thickness is already ≤ 1.0 mm there is no
   taper") resolves it, so the gate must read **`min(1.0, body)`**, not a flat 1.0.
   Otherwise every `thickEdge` design fails a gate for doing its job.

2. **The `< 30°` dihedral bar is stricter than the flower's own round features.**
   `RADIAL_SEGMENTS = 8` makes every tube a **45°-per-facet** prism — and the rim
   tube traces the blade margin, i.e. it sits *inside* the 2 mm band the gate
   measures. So "max dihedral within 2 mm of any boundary < 30°" fails on `main`
   and on this branch, for the tube and not the bead. The bead itself is
   180/8 = **22.5°** and clears the bar with a quarter of it to spare.

3. **`grid-export-unchanged` is discharged by construction, not by comparison.**
   The whole change is `flower.js` + one new tool; `bloom-geometry.js`,
   `bloom-grid-gltf.js`, `bloom.js`, `bloom-registry.js`, `plot-grid.js` and
   `plot.js` are **sha256-identical to main**. The /plot grid is produced from
   those files alone, so its bytes cannot move. What this does *not* cover: it is
   an argument about inputs, not a diff of outputs.

## 4. Findings recorded, not acted on

* **`thickEdge` measures its band in `|v|`** (`THICK_EDGE_BAND = 0.12` of the
  half-width) — the exact parameter-space trap the brief names, pre-existing and
  steep at apexes for precisely that reason. Moving it is a partition event.
* **The Voronoi hole rim is already a full bullnose** (`SLAB_FILLET = 1.0`,
  `holeColumn`'s `ee = -r + r·cos φ` — the same inset construction this session
  gave a name to). What falls short is **segments: 4, against the ruled 8**.
  Raising `PHI` from 6 to 10 entries is a one-line change; it was not taken
  because it also changes the hole rim's radius rule and floor, which moves every
  lace cell on every design and wants an eye on a render.
* **The slab's CELL wall and the vein RIBBON are square geometry with rounded
  NORMALS** — `wallColumn` is *"full ±half-thickness, no outward offset"*, and
  `addRibbon` is *"a watertight box beam"* whose corner normals are averaged
  ("a soft bevel; the STL uses per-facet normals regardless"). They shade round
  and print sharp. **On a lace flower this is the dominant exposed 90° geometry**,
  and the brief does not mention it.
* The `addSlab` comment's reason for keeping the cell edge square — the groove
  between adjacent bulges — applies to **shared** edges. The petal's **outer**
  rim has no neighbour, so that argument does not cover it.

## 5. Not done

No cross-section render (no such renderer exists here). The four named gates were
not built as gates — §3 says why three of them cannot pass as written; what was
built instead is one instrument that reports the numbers and states its blindness
in its own header.
