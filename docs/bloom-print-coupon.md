# Bloom print coupon (BPC1)

A single printed part that turns the bloom's typed print floors into measured
ones. Eva ruled the first print is **SLS PA12, bureau-printed, priced per part**.
Nothing in this project has ever been printed, so every floor the bloom uses
(`MIN_FEATURE_MM`, the 1.2 mm sheet, the 1.5 mm stem wall, the 0.40 mm nib
face, the sealed stem) is a declared guess. This coupon is the measurement
instrument for those guesses.

It is wired to no gate, no CI job and no page. It changes no bloom file.

## Generate it

```
node tools/bloom-print-coupon.mjs [--out <path>]
```

Default output is `coupon/bloom-print-coupon.stl` relative to the current
directory. Do not commit the STL; regenerate it. Node only, no browser, no
dependencies beyond Node builtins (it imports `bloom-geometry.js` and
`bloom-registry.js` directly; Node prints a harmless
`MODULE_TYPELESS_PACKAGE_JSON` warning on stderr while doing so).

The tool prints the bounding box, triangle count, volume, estimated mass, the
full feature map and the tube masses, then runs a self-check on its own mesh
and **refuses to write (exit 1)** if any part of it fails:

- **per shell:** a DIRECTED edge census (every directed edge matched by exactly
  one reverse; an undirected census cannot see an inverted face), no directed
  edge used twice (non-manifold), no two vertex indices at one float32
  position, no triangle with float32 area at or below 1e-9 mm², signed volume
  positive (outward) for every solid shell and negative for exactly the four
  declared sealed cavities;
- **whole mesh, welded on float32 bit patterns** (what the STL stores): the same
  directed census, so no two shells share an edge;
- **bores clear:** nothing but the tube itself reaches into any tube's bore;
- **layout:** no two feature groups closer than 1.5 mm (0.8 mm where one side is
  text), so the spacing between rungs is not itself an accidental gap test.

The self-check was shown able to fail: five mutations of the tool (a cavity
wound outward, one side face of a box flipped, a tube rib cut into the bore,
pins crowded together, a wedge collapsed to a degenerate end) each made it
refuse to write. The written STL was also re-read independently from the
binary file (float32 weld, directed census, per-component volume): 0
unmatched directed edges, 0 boundary edges, 0 non-manifold edges, 0
degenerate triangles, 1104 components of which exactly 4 have negative volume
(the sealed cavities). Flipping one triangle in the re-read file gives 3
unmatched directed edges and **0 boundary edges** — the undirected count does
not see it, which is why the census is directed.

### Numbers (this tree)

| | |
|---|---|
| bounding box | 107.0 x 106.0 x 37.5 mm |
| plate | 107 x 106 x 2.5 mm, stepped in to 79 mm wide behind the wide bands (9,538 mm²) |
| triangles | 25,772 |
| shells | 1,104 closed shells (4 of them inward cavities) |
| volume, divergence theorem on the emitted mesh | 44,433 mm³ (solid shells 46,462, cavities −2,028; overlaps counted once per shell) |
| volume, union (vertical-ray winding, 0.1 mm grid) | 43,534 mm³ — what is actually sintered |
| mass at an ASSUMED 1.01 g/cm³ | ~44 g |
| sealed powder if it cannot escape | 2,028 mm³ → ~0.91 g at an ASSUMED 0.45 g/cm³ |
| STL size | 1.29 MB |

The plate is 55% of the volume. The brief aimed at ~100 x 70 mm; the five
ladders plus nineteen tubes need about 7,500 mm² of feature area with no
packing loss at all, so that footprint was not feasible without dropping
content. The plate steps in behind the three widest bands to save ~1,700 mm²
of plate.

### The mesh is overlapping closed shells

The coupon follows the bloom's own export contract: every primitive is an
individually closed solid and overlapping closed shells are allowed (a slicer
or bureau unions them). Every feature reaches 0.3 mm down into the plate, text
pixels overlap their neighbours, and each tube's rib overlaps the tube's outer
wall. No two shells share an edge (checked). If a bureau's upload check flags
"intersecting shells", ask them to union or repair — the union volume above is
the honest material figure; the divergence-theorem sum double-counts the
embedded overlaps by ~900 mm³.

## Constants read, and from where

Every dimension that belongs to the bloom is imported, never retyped.

| constant | value | file | used for |
|---|---|---|---|
| `MIN_FEATURE_MM` | 1.0 | bloom-geometry.js | rung in W, G, H, Z, N, P (the print floor / min feature / min gap) |
| `SHEET_THICKNESS_MM` | 1.2 | bloom-geometry.js | rung in W and P; wedge thickness (N); handling strip thickness (L); tube top cap (the hub plate) |
| `STEM_MIN_WALL_MM` | 1.5 | bloom-geometry.js | rung in W; tube bottom plug length; gap block width; Z tower and arm |
| `stemBoreRadius(R)` | `max(0, R − 1.5)` | bloom-geometry.js | every tube's bore |
| `STEM_DIAMETER_RANGE` | [3, 12] | bloom-geometry.js | 12 mm = the widest stem (T12) |
| `STEM_LENGTH_RANGE` | [0, 120] | bloom-geometry.js | reported only |
| `TIP_HALF_MM` | 0.8 | bloom-geometry.js | 2x = 1.6, N rung (the old flat petal end) |
| `APEX_HALF_MM` | 0.2 | bloom-geometry.js | 2x = 0.4, N rung (the shipped nib face) |
| `APEX_END_HALF_MM` | 0.05 | bloom-geometry.js | 2x = 0.1, N rung (the nib's mini-face) |
| `NOZZLE_MM` | 0.4 | bloom-geometry.js | 2x = 0.8, rung in W and P (the stem-cut land's nozzle term) |
| `RIM_FLOOR_MM` | 1.0 | bloom-geometry.js | reported (equals `MIN_FEATURE_MM`) |
| `INFILL_WALL_MM` | 1.0 | bloom-geometry.js | reported (equals `MIN_FEATURE_MM`) |
| `DEFAULTS.stemDiameter` | 6 | bloom-registry.js | T6, the shipped stem |
| `DEFAULTS.sheetThickness` | 1.2 | bloom-registry.js | asserted equal to `SHEET_THICKNESS_MM` |
| `DEFAULTS.petalLength` | 35 | bloom-registry.js | handling strip height |
| `DEFAULTS.stemLength` | 0 | bloom-registry.js | reported: the stem is off by default |

Every value needed was exported; nothing was derived around a missing export.

**One measured figure is carried as a rung, and it is not a constant:**
0.527 mm, the worst petal self-approach on the default bloom under form
variance (`docs/bloom-organic-variance-form-outcome.md`). No module exports
it.

**Coupon-only dimensions are typed in the tool and say so** — plate 2.5 mm,
embed 0.3 mm, fin 10 x 8 mm, gap blocks 6 mm tall, slot depths 3 and 10 mm,
wedge 6 mm base x 10 mm tall, pins 8 mm tall, tubes 25 mm long lifted 3 mm, the
2.0 mm vent, the rungs below the floors (0.2–0.8 mm), pitches and text size.
They are coupon geometry, not bloom constants.

## PA12 assumptions — stated as assumptions

These are typical published SLS PA12 figures. Bureaus differ, and the point of
the coupon is to replace every line here with a measured number from *this*
bureau's machine. Each ladder is built to **straddle** the assumption, not to
confirm it.

| assumption | typical figure | ladders that straddle it |
|---|---|---|
| minimum wall | ~0.7–0.8 mm | W runs 0.3 → 2.0 |
| minimum gap / clearance between parts that must stay separate | ~0.5 mm | G, H, Z run 0.2 → 1.2 |
| minimum free-standing pin | ~0.5–0.8 mm | P runs 0.3 → 1.2 |
| minimum resolved feature (detail) | ~0.3–0.5 mm | N end faces 0.1 → 2.0 |
| layer height | ~0.1 mm | (Z row is the only Z-direction measurement) |
| solid density | ~1.01 g/cm³ | used for every mass figure |
| unsintered powder bulk density | ~0.45 g/cm³ | used for the sealed-powder mass |
| powder in a sealed cavity | cannot escape | T rows, variant 1 |

SLS needs no supports, so overhangs, bridges and supports are not tested.

## Orientation

Recommend **plate flat on the bed** (plate in XY, features standing in +Z).
SLS resolves XY and Z differently, so the coupon measures both: the W, G, H, N
and P rows are walls and gaps whose critical dimension lies in XY; the Z row's
critical dimension is vertical. If the bureau reorients the part, record the
orientation they used — every XY result then needs re-reading against it.

## Layout and orientation mark

Thinnest rung is always **index 1, at the left**, nearest the **chamfered
front-left corner** (6 mm 45° chamfer at x = 0, y = 0). `BPC1` is embossed
beside the chamfer. Each row has its letter embossed at its left end; each
feature has its index number embossed in front of it (towards the chamfer
side, −y). Text is 0.6 mm raised pixel boxes with 0.8 mm strokes.

```
 back (+y)
 +------------------------------------------+
 | T6   1  2  3  4  5  6  7                  |
 | T12  1    2    3    4                      |
 | Z    1 2 3 4 5 6 7 8 9 10                  |
 | H    1 2 3 4 5 6 7 8 9 10                  |
 | T8   1  2  3  4      T4  1 2 3 4    +------+
 | G    1 2 3 4 5 6 7 8 9 10    P 1234567    |
 | W    1 2 3 4 5 6 7 8 9    N 12345678    L 1|
 \ BPC1                                       |
  \_________________________________________+
 front (−y), chamfer at front-left            x →
```

### Full map

Positions are the front-left corner of each feature on the plate, in mm, as the
tool prints them (`x` right, `y` back, plate top at z = 2.5).

**W — free-standing fin thickness** (fin 8 mm long in y, 10 mm tall)

| index | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| mm | 0.3 | 0.4 | 0.5 | 0.6 | 0.8 (2·NOZZLE) | 1.0 (MIN_FEATURE) | 1.2 (SHEET) | 1.5 (STEM_MIN_WALL) | 2.0 |
| x | 7.2 | 12.2 | 17.2 | 22.2 | 27.2 | 32.2 | 37.2 | 42.2 | 47.2 |

y = 13.2 for all.

**N — wedge end-face width** (sheet 1.2 mm thick in x, 6 mm base in y tapering to the end face at 10 mm height)

| index | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| mm | 0.1 (2·APEX_END_HALF) | 0.2 | 0.4 (2·APEX_HALF) | 0.6 | 0.8 | 1.0 (MIN_FEATURE) | 1.6 (2·TIP_HALF) | 2.0 |
| x | 60.4 | 64.4 | 68.4 | 72.4 | 76.4 | 80.4 | 84.4 | 88.4 |

y = 13.2 for all.

**L — handling strip** (1 item): SHEET 1.2 mm thick x 5 mm wide x 35 mm tall
(`DEFAULTS.petalLength`), at x 100.6, y 13.2.

**G — through-slot gap, 3 mm deep** and **H — the same, 10 mm deep** (two 1.5 x
depth x 6 mm blocks with the slot between them, open at the top and both ends)

| index | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| gap mm | 0.2 | 0.3 | 0.4 | 0.5 | 0.527 (variance, measured) | 0.6 | 0.7 | 0.8 | 1.0 (MIN_FEATURE) | 1.2 |
| x | 7.2 | 13.7 | 20.2 | 26.7 | 33.2 | 39.7 | 46.2 | 52.7 | 59.2 | 65.7 |

G at y 27.8, H at y 52.0.

**Z — vertical gap under an arm**: a 1.5 mm tower, a 2.5 x 3 x 2 mm pad 1 mm
beside it, and an arm off the tower whose underside sits the gap above the
pad's top (open on three sides, 3 mm path). Same gap ladder and x positions as
G/H, y 68.6.

**P — free-standing pin diameter** (8 mm tall)

| index | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| mm | 0.3 | 0.4 | 0.5 | 0.6 | 0.8 (2·NOZZLE) | 1.0 (MIN_FEATURE) | 1.2 (SHEET = the stamen/style rod) |

Starting x 80.4 at a 3.5 mm pitch, y 27.8.

**T4 / T6 / T8 / T12 — tubes**, outer diameter in the row label, 25 mm long,
axis vertical, lifted 3 mm above the plate so both ends are free, each held by
one rib on its +x side that overlaps the outer wall only. Top cap = SHEET 1.2
(the hub plate over the stem); bottom plug = STEM_MIN_WALL_MM 1.5 (the flat-end
tip plug). Vents are axial holes through the bottom plug.

| row | OD | bore (from `stemBoreRadius`) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|---|
| T4 | 4 | 1.0 | sealed | vent 0.5 | blind | open | | | |
| T6 | 6 (default) | 3.0 | sealed | vent 0.5 | vent 1.0 | vent 1.5 | vent 2.0 | blind | open |
| T8 | 8 | 5.0 | sealed | vent 2.0 | blind | open | | | |
| T12 | 12 (max) | 9.0 | sealed | vent 2.0 | blind | open | | | |

"Blind" = top capped, bottom open (the pre-plug stem). "Open" = no caps. On T4
the vent is half the 1.0 mm bore (0.5 mm), because a 2.0 mm vent would be wider
than the bore. Tube x positions: T8 10.0 / 21.6 / 33.2 / 44.8; T4 67.4 / 75.0 /
82.6 / 90.2 (both at y 37.4); T12 12.8 / 28.4 / 44.0 / 59.6 (y 78.2); T6 10.0 /
19.6 / 29.2 / 38.8 / 48.4 / 58.0 / 67.6 (y 96.8).

## The rows: what each measures, and what it decides

### W — minimum wall (sheet thickness, stem wall)

- **Tests:** the thinnest free-standing wall that prints whole and survives
  depowdering.
- **Bears on:** `SHEET_THICKNESS_MM` 1.20 (every petal, sepal and the hub
  plate), `STEM_MIN_WALL_MM` 1.5 (the stem tube), `MIN_FEATURE_MM` 1.00 (the
  export floor every sheet is clamped to), the 0.60 mm minimum the
  `sheetThickness` control reaches.
- **Pass:** fin present full height and length; caliper reading within
  ±0.1 mm of nominal; not bowed.
- **Failure means:** if 1.0 and 1.2 are fine and 0.6–0.8 are fine too, the
  floor costs detail for nothing and `MIN_FEATURE_MM` can come down; if 1.0 or
  1.2 is missing or broken, the sheet default and the floor must rise.
- **Measure:** calipers at mid-height on each fin; note the thinnest intact
  one and the thinnest *present* one (they may differ — broken in handling).

### G and H — minimum gap (powder-evacuation limit), two depths

- **Tests:** the narrowest slot between two surfaces that comes out open,
  over a 3 mm path (G) and a 10 mm path (H).
- **Bears on:** `MIN_FEATURE_MM` read as the minimum printable GAP (V5's bar,
  the sphere-stem channel clearance, the combination gate's bar), the 1.0 mm
  advisory self-approach bar, and form variance's 0.527 mm worst petal on the
  default bloom (rung G5/H5). Whether two petal faces 0.5 mm apart fuse.
- **Pass:** light visible straight through the slot along its whole length and
  height; a feeler gauge of the next size down passes.
- **Failure means:** a fused slot at or above 0.527 mm says the default bloom
  under form variance would print with fused petals; a fused slot at 1.0 says
  the gap bar itself is too low. If 0.4–0.5 clears on both depths, the 1.0 mm
  bar is conservative and could be relaxed (that ruling is Eva's).
- **Measure:** hold to a light; feeler gauge; note the narrowest fully open
  slot at each depth separately — depth is the variable between G and H.

### Z — vertical gap

- **Tests:** the same gap ladder with the gap in Z (a downward-facing surface
  over an upward-facing one), where layer height and thermal bleed differ from
  XY.
- **Bears on:** the same bars as G/H, for petal faces stacked vertically (a
  cupped or curled petal over its neighbour).
- **Pass:** arm separate from pad; a feeler slides under the arm.
- **Failure means:** if Z fuses at a larger gap than G, the gap bar must be
  read as orientation-dependent (or the larger value taken).
- **Measure:** feeler gauge under each arm; light from the side.

### N — minimum resolved feature: the nib

- **Tests:** whether a 1.2 mm sheet tapering to an end face keeps that face at
  its width.
- **Bears on:** the apex nib — its 0.40 mm face (`2·APEX_HALF_MM`, rung N3) and
  its 0.10 mm mini-face (`2·APEX_END_HALF_MM`, rung N1), against the old 1.6 mm
  flat end (`2·TIP_HALF_MM`, rung N7). The 0.40 mm face is an authored exception
  below the minimum feature, ruled on a project that had printed nothing.
- **Pass:** end face present at full height, measured width within ~0.1 mm of
  nominal.
- **Failure means:** if N3 (0.4) prints rounded or short, the nib's face is
  below what this process resolves and `APEX_HALF_MM` should rise (or the nib's
  height loss accepted and measured); if N1 survives, the mini-face is real.
- **Measure:** loupe and calipers on the end face width; also the wedge's height
  (a lost tip shows as a shorter wedge).

Deliberately not built: a wedge that tapers in THICKNESS (a knife edge). The
bloom's nib tapers in plan at constant sheet thickness, which is what N tests.

### P — the print floor for thin rods

- **Tests:** the thinnest free-standing round pin that prints and survives.
- **Bears on:** `MIN_FEATURE_MM` 1.00 as the floor for rods; the stamen
  filament and style, which are rods one sheet thick (1.2, rung P7); the 0.8
  stem-cut nozzle term.
- **Pass:** pin present full height, upright, diameter within ~0.1 mm.
- **Failure means:** if 0.5–0.6 survive, the 1.0 floor costs rod detail for
  nothing on SLS; if 1.0 or 1.2 snaps, stamens and styles are unprintable at
  the default sheet.
- **Measure:** count surviving pins; calipers on each; note any that bend.

### L — handling strip

- **Tests:** whether a petal-thickness sheet of petal length survives
  depowdering, bead blasting and handling. Included because every bloom petal
  is a 1.2 mm sheet ~35 mm long attached at one end, and W's fins are only
  10 mm tall — a sheet can print fine and still break in post-processing. It is
  vertical and no taller than needed, not a long overhanging cantilever.
- **Bears on:** `SHEET_THICKNESS_MM` 1.2 at `DEFAULTS.petalLength` 35.
- **Pass:** present, unbroken, springs back after a light flex.
- **Failure means:** petals at the default sheet will break in handling; the
  sheet default, or the bureau's post-process, must change.
- **Measure:** present/broken; deflection under a light fingertip push.

### T — trapped powder in hollow tubes

- **Tests:** whether unsintered powder can escape a bore, and how much stays.
  Variant 1 is the stem **as shipped**: the hub caps the top and the bottom is
  closed by a solid plug (the flat-end tip plug is `STEM_MIN_WALL_MM` long; under
  the default florist cut, ruling 7, the plug is longer, D + 0.62 mm from the
  long point — either way the bore is SEALED). Variant 2+ adds an axial vent
  through the bottom plug; "blind" is the pre-plug stem (top capped, bottom
  open); "open" has no caps.
- **Bears on:** ruling 7's solid bottom plug and the hub-capped top; the
  tip-plug session's sealed bore; `STEM_MIN_WALL_MM` 1.5 and the bore law.
  The coupon tubes are 25 mm; the bloom's stem ranges to 120 mm
  (`STEM_LENGTH_RANGE`, default off at 0; the stem rows in the gates use 60 mm),
  so trapped powder is worse on a real stem in proportion to its length.
- **Pass:** for a vented, blind or open tube — mass equals the empty-tube
  figure below (powder came out), nothing rattles, light through the bore.
  For the sealed tube — record the mass: it is the measurement, not a pass.
- **Failure means:** if the sealed tube carries its full powder mass (expected
  for SLS — sealed powder cannot escape), the solid-plug ruling must be
  revisited for SLS: vent the plug (the smallest vent that empties is read off
  the T6 vent ladder, 0.5 → 2.0) or reopen the bottom. If even the open 1.0 mm
  bore (T4) holds powder, small stems should be solid on SLS.
- **Measure:** weigh each tube after cutting it from its rib (scale to 0.01 g),
  shake/rattle, look through, and saw one sealed tube open.

Expected masses, tube body only (rib excluded), ASSUMED densities 1.01 g/cm³
solid and 0.45 g/cm³ powder bulk:

| OD | tube material | sealed powder if trapped | fully solid equivalent |
|---|---|---|---|
| 4 | 0.300 g | 0.008 g | 0.317 g |
| 6 | 0.555 g | 0.071 g | 0.714 g |
| 8 | 0.827 g | 0.197 g | 1.269 g |
| 12 | 1.423 g | 0.638 g | 2.856 g |

The sealed T4's powder (8 mg) is below a kitchen scale's resolution — it is
there for the saw, not the scale. The T12 difference (0.64 g) is the clear
one. Vented, blind and open tubes weigh slightly less than "tube material"
(the vent or the missing cap), so compare each against its own sealed sibling.

## What the coupon deliberately does not test

- **Long cantilevers and overhangs** (e.g. a 60 mm stem horizontal): SLS needs
  no supports, and a cantilever measures stiffness, which the bloom does not
  yet have a number to compare against.
- **Supports**, and the old flower collar: not relevant to SLS.
- **Surface finish, colour, dimensional accuracy over large spans**: read them
  off the plate if wanted, but no rung is built for them.
- **Knife-edge thickness taper**: see N.

## Results template

Fill in one line per row. "Threshold" is the smallest rung that passed with
every larger rung also passing.

| row | thinnest present | thinnest intact & to size | threshold | notes (bureau, orientation, process) |
|---|---|---|---|---|
| W fins | | | | |
| G gaps, 3 mm deep | | | | |
| H gaps, 10 mm deep | | | | |
| Z vertical gaps | | | | |
| N end faces | | | | |
| P pins | | | | |
| L strip | present / broken | | | |

| tube | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| T4 mass (g) / rattle / light | | | | | | | |
| T6 mass (g) / rattle / light | | | | | | | |
| T8 mass (g) / rattle / light | | | | | | | |
| T12 mass (g) / rattle / light | | | | | | | |
| sawn-open sealed tube: powder found? | | | | | | | |

Bureau: ______  Machine/material: ______  Layer height: ______
Orientation as printed: ______  Post-process (bead blast?): ______
