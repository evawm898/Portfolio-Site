# Bloom curves-leaves — the leaf's spine and outline curves, and the seed's fit to its tolerance

*Oct 20. The last of the curve sessions. Eva's rulings of Oct 20 govern; nothing here
re-litigates them. Sheet: `node tools/shot-bloom-curves-leaves.mjs` →
`docs/img/curves-leaves.png` (print preview on).*

## 1. What shipped

**Leaves take both curves, through the petal's own laws, by TWINS** — one table in the
geometry, `LEAF_CURVE_TWINS`, the `SEPAL_TWINS` shape:

| twin | petal law it stands in for | reaches | rest value (a state that predates it) |
|---|---|---|---|
| `leafCurlMode` | `petalCurlMode` | the simple blade, the LOBED blade, the compound RACHIS | `SLIDER` |
| `leafSpineCurve` | `petalSpineCurve` | the same | a gentle droop |
| `leafOutlineMode` | `petalOutlineMode` | the SIMPLE blade only | `LAW` |
| `leafOutlineCurve` | `petalOutlineCurve` | the SIMPLE blade only | the lanceolate the law draws |
| `leafletOutlineMode` | `petalOutlineMode` | every compound LEAFLET | `LAW` |
| `leafletOutlineCurve` | `petalOutlineCurve` | every compound LEAFLET | the ovate the leaflet law draws |

The registry GENERATES its six rows from the table (`leafCurveTwinControls`): each is its
petal twin's kind, a choice with the petal twin's option values, a curve with the petal
twin's spec but for its OWNER (`leafLength`, or `leafletLength` for the leaflet outline).
The harness holds that at load (THE LEAF CURVE TWINS block), including that no
hand-written leaf curve control stands beside them.

- **One curve law per curve.** The spine is `spineLaw`'s curve arm through
  `spineCurveLaw` (centripetal Catmull-Rom); the outline is `outlineCurvePlan` through
  `curveFunction` (PCHIP). No new sampler.
- **One resolver.** `leafBladeState` hands the petal laws the twins' values;
  `leafletBladeState` hands the leaflets theirs (and pins the leaflet's own spine to
  SLIDER — a leaflet lies flat in the rachis's plane, S3's ruling); `lobedBladeState`
  pins `LAW` — **the LOBED blade keeps its own law, ruled**, told on the leaf-type
  read-out ("its outline is the lobes' own law"). `leafSpineCurveLaw` is the one owner
  of a leaf's drawn spine; `rachisSpine` the rachis's.
- **Tilt / angle owns the root** — the drawn spine's first chord is laid along the leaf's
  angle (J8's contract, the petal's); **length is arc length** — the curve is scaled so
  its arc is the blade's asked length.
- **The fold limit applies** to a drawn blade spine (`spineBendTable` on the blade's own
  section, read off the rows the mesh emits); the rachis is a ROD and has no section to
  fold, so it has none (LF37 holds that too). **The Arch slider is unchanged** — the fold
  limit is NOT applied to the arch, which is what keeps every SLIDER leaf at 0 floats.
- **A curve made unprintable later is clamped and told** (the print floor and the fold
  limit), the petal's own treatment; a hand drag the validator refuses is refused
  (`spineCurveRefusal` / `outlineCurveRefusal` on the leaf's own lengths and blades —
  `curveValidatorCtx` carries the leaf's asked lengths, fold tables and outline blades).

### The sign, stated once

**`leafArch` POSITIVE turns the tip DOWN — the opposite of `petalSpineCurl`.** That has
been true since S2 (`leafBladeState` hands the spine law `-leafArch`). A **drawn leaf
spine is the leaf SEEN FROM THE SIDE, root at the left, y UP: a curve that FALLS toward
the tip arches the tip DOWN** — the bend a positive Arch makes — and it goes to the law
UNNEGATED, the petal's own convention. So the arch slider is the odd one out, and the
seed fits the curve to the spine the arch draws (through that negation): a switch from
any arch value lands on the same bend (Arch +60 → a 9-point curve ending at
(0.833, −0.497); Arch −90 → (0.641, +0.658)). The editor says so in its own words
("drawn SEEN FROM THE SIDE, root at the left: a curve that FALLS toward the tip arches
the tip DOWN — the bend a POSITIVE Arch makes"). LF37(b) and the mutant
`the-leaf-spine-sign-flipped` hold it; panel route (am) holds the seed's sign.

### The width scale

A drawn outline's y are fractions of the blade's own length; the reference is **the
leaf's own width default** (Eva):

- **the simple blade: `leafWidth / 17`** — `LEAF_WIDTH_DEFAULT` is **17 mm**, a branch at 17;
- **each leaflet: `(W / L) / (17 / 26)`** — the curve read as drawn for the reference
  leaflet (26 × 17 mm, the leaflet defaults) laid across the leaflet's OWN length at its
  OWN width. The terminal (30 × 19 mm) draws at **0.969**; every lateral at the ratio its
  ramp gives it.

The harness restates both as the ruling's numbers (`LEAF_WIDTH_REF_RULED_MM = 17`,
`LEAFLET_LENGTH_REF_RULED_MM = 26`, `LEAFLET_WIDTH_REF_RULED_MM = 17`) and refuses to load
if the registry's defaults move.

### Placements made without a ruling (Eva: "my call") — reported, not silently changed

1. **One leaflet outline curve shared by every leaflet, the terminal included**, each
   scaled to its own length and width (the sepal precedent).
2. **The leaf spine curve applies wherever `leafArch` applies today, the compound RACHIS
   included** — the curved rachis is the arc the stations, the load taper and the pair
   placement are measured along.

Two more, smaller, that fell out of building it:

3. **A drawn rachis is subdivided like an arched one** (the blade law's own rows over the
   rachis length) — +1,296 triangles a compound leaf against a straight arch-0 rachis
   (16,662 against 15,366), the same count an ARCHED rachis already pays.
4. **A drawn rachis is built at the EXPORT floor in both modes** (a rod with no section:
   one radius of sheet thickness at `max(sheet, MIN_FEATURE_MM)`), so the inset that
   reads it is mode-free by construction.

## 2. Serration stays on in CURVE mode

Eva, Oct 20: the teeth are cut INTO the drawn outline with today's rules unchanged — the
1.0 mm relief floor, the count yield, the tip neck, the nib (no tooth cuts it), and
`leafletToothDepth` on leaflets. The lobe/arc table is built on the DRAWN base outline
(the lobes block runs on a petiole blade with an outline curve where a petal's would
refuse: `petiole && outline ? !fringeEngaged(state) : lobesEligible(state)`). On an
asymmetric blade each half is its own one-sided profile with its own teeth record
(`serration.sides`), its own nib and clamp record (`tipClamp.sides`).

## 3. Every reader of the leaf's shape reads the curved leaf

| reader | what it reads now |
|---|---|
| the node inset (`leafNodeLayout`) | `leafBladeRiseMm`: the arch law VERBATIM on the slider; in CURVE mode `leafCurveRiseMm` — the highest substep of the EXPORT build's drawn spine (the print floor and the fold limit included), cached per state; a compound leaf's `compoundLeafRiseMm` reads its drawn rachis's highest substep plus each leaflet's tip along its own direction |
| SN4's arc reach (`emittedReachMm`) | `spineArcReachMm` — each emitted point footed on the drawn spine's own polyline, then on the law between the bracketing substeps (the arc analogue of the arch's circle-foot) |
| the shared node's offset | `leafBladeLocalTris` builds through `buildLeafInto`, so `bladeReachMm` reads the CURVED blade's emitted triangles |
| the shared node's cap | `leafFloretCapMm` reads those same emitted local triangles |
| the petiole cap | `petioleClampMm` reads the leaf's ANGLE and the stem's radii only — unaffected by either curve, by construction |
| the compound rachis taper | `compoundRachisRadiusMm` at ARC LENGTH along the drawn rachis (`rachisSpine`'s law: the stations, the taper's knots and the pair placement are arc lengths along the curve) |
| `rodAxes` for ST9 | the builder's EMITTED ring centroids — they follow the curve |
| the combination gate's leaf measures (`leaf-stem`, `leaf-floret`, `leaf-pedicel`) | the emitted leaf geometry; no leaf curve id is on any pair's grid |

## 4. The seed's fit (from #425)

#425's sheet read "curl 120 fits to 0.112 mm at 10 points, NOT within the 0.10
tolerance, where 11 points pass live". **Re-measured, the mode was never the cause**:
the same fit read 0.112 at 10 points in BOTH modes in Node, and #425's "11 points 0.099
live" does not reproduce. The cause was the search: each point count started from fresh
seeds and could land in a worse local minimum than the count below it. The fitter now
also starts each count from the previous count's best (a midpoint inserted in its first
and last spans — a CONTINUATION), and **it reaches the tolerance in the mode it fits, or
names the constraint that stopped it** (`seed.constraint`: `the fold limit`, `the print
floor`, or `the point cap (12 points)`, counted from the barred candidates), told on the
read-out ("— stopped by …"). Re-measured in print preview (export) and live, identical:

| state | points | error | |
|---|---|---|---|
| petal curl 60 | 8 | 0.0773 mm | within |
| **petal curl 120 (the sheet's)** | **9** | **0.0915 mm** | **within** (was 10 / 0.112, not within) |
| petal curl 150 | 11 | 0.0843 mm | within |
| petal curl 180 | 10 | 0.0898 mm | within |
| petal curl 270 | 11 | 0.1848 mm | NOT within — stopped by the print floor |
| petal curl 360 | 12 | 0.1591 mm | NOT within — stopped by the print floor |
| leaf Arch −90 | 11 | 0.0683 mm | within |
| leaf Arch 30 | 7 | 0.0709 mm | within |
| leaf Arch 60 | 9 | 0.0848 mm | within |
| leaf Arch 90 | 11 | 0.0683 mm | within |
| leaf Arch 180 | 12 | 0.2302 mm | NOT within — stopped by the print floor |

## 5. Gates

- **LF37** (new): (a) the three modes, two statements (registry predicate against the
  record each leaf and blade reports), the LOBED blade's outline record null by ruling;
  (b) the spine record is the control's curve on the blade's own length (the RACHIS on a
  compound leaf) and turns with the restated law's SIGN; (c) the fold limit off the
  EMITTED rows (three-point curvature × the emitted margins' reach toward the bend + half
  the live sheet ≤ 1 + `C5_BAR`; `bendClamped` iff applied; each applied limit
  `1/(reach + t/2)`); (d) the outline record is the control's curve (the LEAFLET curve on
  every leaflet), at the ruling's restated scale (the terminal at its own), and the
  emitted base half-widths are the curve restated through bloom-curve's evaluator, per
  half, below the nib.
- **Re-derived for CURVE mode, never relaxed**: **LF4** (the inset against the drawn
  spine's rise restated from the control's points); **LF11** (every row on the drawn
  curve's law restated from the control — the rachis's rings on the rachis law — the
  arch hidden and inert); **LF9** (on a drawn outline the tip shape is hidden and inert,
  so no exponent is read back; the clamp record holds per half against each half's
  record, the widest point the curve's own); **LF12** (the cup per margin on each half's
  own half-widths); **LF13** (the relief floor per half against the curve's own peak);
  **LF21** (a lobed chevron's lean, stations footed on the drawn spine); **LF32 / LF33 /
  LF35** (the neck, the fold zone and the tip neck per half, the widest point the
  curve's own). The arc stations of a two-sided blade are the earlier of the two nibs'
  arcs (`twoSidedProfile`'s own window).
- **The LOBED reference blade** (LF26's) is the simple leaf's DEFAULTS — pinned to the
  LAW outline whatever a lobed state stores (it read 781 mm² against 584 on the first
  run, an outline curve leaking into a reference).
- **Mutants**, each witnessed on the mutated module's own build (apex table, `rows` /
  `for` scoped to the eight and to block 73's seven table rows): the leaf spine sign
  flipped (LF11, LF37), teeth dropped on a drawn outline (LF13), a tooth cutting the nib
  on a drawn outline (LF33), leaflets reading the simple leaf's curve (LF37), the
  terminal leaflet not at its own scale (LF37), the inset reading the slider arch (LF4),
  the fold limit skipped for leaves (LF37), the LOBED blade taking the curve (LF37 — the
  lobed record is its ENVELOPE's now, the one place a curve could reach it). **The seed
  ignored** is panel route **(am)**'s, with a second mutant (the seed fitted to the
  MIRRORED arch); THIRTY routes.

## 6. Matrix, census, bytes, frozen phase

- **Block 73** (13 rows, 1,424 → 1,437): a drooping, an upward and an S spine; the
  lanceolate outline at 17 and 25 mm; the asymmetric toothed oak on a drawn spine; the
  fold limit on a cupped leaf; the compound rose on a drawn rachis with the shared
  leaflet curve, toothed; a raceme's shared-node leaf on a drawn spine; the steep 85°
  leaf on a drawn spine; the LOBED blade on a drawn spine with an outline curve stored;
  two GATED rows. **Smoke block 73** (the anchor + four: the oak, the rose, the raceme,
  the steep leaf).
- **Census: no new fold.** All 13 rows export watertight, live = export triangle counts,
  **0 within-shell self-intersection pairs on every row** (X2), orientation clean.
- **Cost**: zero triangles on a simple or lobed leaf (the lattice is fixed); +1,296 a
  compound leaf on a drawn rachis (placement 3).
- **Edge profile (E2), three rows declared from birth, never widened**: the fold-limit
  row adds 0.764° over the 45° allowance (the same cupped leaf flat reads 43.69°); the
  compound rose adds 5.628° (its LAW leaflets read 43.69°); the LOBED row adds 44.061° —
  and the same lobed blade on the Arch slider reads 94.20°, worse, so it is the lobed
  bead class on a bent blade and not the curve's. Recorded in `E2_TURN_XFAIL` both ways.
- **`frozen/phase79`** is the 1,424 rows at `fc96dc9` (main's head before this session),
  registered in both maps.
- **The sheet** (`docs/img/curves-leaves.png`, print preview on, every leaf seen from
  below): (1) a leaf at Arch +60 switched SLIDER → CURVE, before and after — the seeded
  curve is 9 points within 0.085 mm and the built turn is −56.8° (the tip down); (2) the
  oak-ish asymmetric toothed leaf on a drawn spine (width scale 1.294, six teeth a
  margin); (3) the compound rose on a drawn rachis with the shared leaflet curve
  (rachis turn −21.3°; laterals at 1.000, the terminal at 0.969 of the curve's own
  proportion); (4) the arch-sign pair — Arch −60 beside its own seeded curve, rising,
  ending at (0.833, 0.497), the same bend from two controls.


## 7. The byte partition

Predeclared from the BASE tree (`verify-bloom-surface-bytes --movers-predicate
leaf-curve`: a row moves iff the base tree's own `leafPlan` builds a leaf AND the row
asks a leaf curve mode the twins make effective — `leafCurlMode` CURVE, or `leafOutlineMode`
CURVE on a SIMPLE leaf, or `leafletOutlineMode` CURVE on a COMPOUND one), measured over
the whole 1,437-row live matrix in both modes against a worktree of `fc96dc9`, twelve
`--range` chunks merged:

**PASS — 11 movers / 1,426 holders, 0 floats moved on any holder**, positionally under
`Object.is`, over **1,716,661,908 export floats** (190,740,212 triangles) and
**81,131,136 captured-grid values**. The holders include **196 rows that build a leaf on
SLIDER / LAW** (49 compound, 66 lobed) and block 73's GATED row with both curves stored
and the modes left SLIDER / LAW. The 11 movers are block 73's non-GATED rows, every one
moving: the drooping, upward and S spines; the lanceolate outline at 17 and 25 mm; the
asymmetric toothed oak; the fold limit; the compound rose; the raceme's shared-node leaf;
the steep 85° leaf; and the LOBED blade on a drawn spine (its spine moves, its outline
does not — LF37 (a) holds the outline record null).

**A DEFECT IN THE BYTE TOOL, FOUND BY THIS RUN AND FIXED, NOT THE GEOMETRY'S.** The first
pass reported two block-72 rows (`SEPAL CURVES: two tiers on two outlines` / `…on two
spines`) moved by ~0.002 mm. Built in one process with both modules they agree to the
bit: the tool's `baseScopes` strips value ids the BASE tree does not list, and it read
the PETAL list (`SCOPE_VALUE_IDS`) for a TIER — whose values are the SEPAL ids
(`SEPAL_SCOPE_VALUE_IDS`, #425) — so the base build lost every sepal tier's own curve.
A tier now strips against the base's sepal list; with it the two rows hold and the
merged partition above reads PASS. (#425's own partition predates this — its tier rows
were movers there, where a mover is not compared to the bit.)
