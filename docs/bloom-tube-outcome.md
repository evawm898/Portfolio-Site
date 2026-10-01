# Bloom TUBE — corolla fusion ships

The build session for the closed-ring tube. The reference was
`tools/bloom-tube-core.mjs` at `f266606` (#323). Read
`docs/bloom-tube-ring-prototype.md` Parts A–C first. That prototype and its preview
page are deleted from this tree: no gate imports them, and both reproduce from
`f266606`.

## 1. What ships

- **`tubeLayer1..6`** (Petal > Tube). Each is a 0–40 slider that steps over
  {0 = TUBE, the divisors of n, n = FREE} and defaults to 40, which is FREE.
  - The slider keeps the asked k. The build snaps to the nearest valid divisor,
    ties going down (`tubeSnap`, owned by the geometry and imported by the
    registry).
  - The readout prints `asked — BUILT k` when the two differ.
- **`tubeHeight`** (0.10–0.70, default 0.25) and **`tubeBlend`** (0–1, default
  1), in Petal > Tube > Fusion. Both are shown only when some whorl is fused
  (`tubeAnyFused`, with a hiddenReason).
- **Availability:** `tubeEligible` and `PREDICATES.tubeEligible` are two
  statements of one rule, and TU0 checks them against each other. The tube is
  unavailable for:
  - anything not RADIAL;
  - a SPHERE head;
  - size or form variance;
  - a buckle;
  - a fringe;
  - Voronoi infill;
  - a raceme;
  - labellum/hood slot overrides;
  - a cleft. The cleft is reachable only through the capability hook, so it is
    refused in the builder.
- **Found while checking, and reported:**
  - **The buckle throws** inside `T0` ("does not share one ladder"): the
    buckle's per-petal ladders break the shared row lattice the ring is built on.
    It is excluded, and the `the-eligibility-forgets-the-buckle` mutant is what
    measures the throw.
  - **Slot-role overrides** give the labellum and hood petals a different blade.
    The ring would interpolate across that discontinuity, so they are excluded
    the same way per-slot fields are.
- **Inherited by neither:** florets pin every whorl FREE, and sepals do not see
  the tube. The sepal angle limit is drawn against FREE petals; see Q3.
- **Construction:** three passes (collect, build, rings), as in the core. The
  collect pass runs in both modes so every discrete decision is mode-free.
- **`emitPanel`** gains the periodic panel natively (`panel.periodic`, `nv`) and
  per-vertex thinning (`panel.thinAt`).

## 2. Parity

Before either fix, the shipped build matched the scratch core **float for float
on 10 of 10 states**: 0 positions differing, compared with `Object.is` in both
modes. Every later change is attributed below.

| change | what moved |
|---|---|
| MUST FIX 1 — trim | ring vertices only; worst about 0.26 mm on the default; triangle count unchanged |
| MUST FIX 2 — mode-free notch | the notch is cut only where the half-sinus `W ≥ RIM_BEAD_RADIUS_MM` in BOTH modes, and the flare `need` is the maximum over both modes. The default k 0 at h 0.40 goes from 32,576 to 23,552 triangles; three-layer inner rings are skipped |
| weld fix | sinus knots move half a sinus column inside the margins. In the core, the ring's top-rim apex sat on the petal margin's apex vertex, so ring and petals welded into one shell and the census counted their by-design overlap as a fold: 708 / 2,088 / 3,342 pairs on 5 and 6 petals, h 0.10 / 0.58, and multi-whorl. All read **0** now |
| analytic tangents | the ring and dipped-curve tangents use the Catmull-Rom derivative instead of a 1e-6 finite difference. The difference amplified last-bit trig disagreement between V8 builds: X0 read **4.25e-12 mm** on the 12-petal snap row. Worst move 3.68e-7 mm, at BLEND 0 |

## 3. MUST FIX 1 — coincident surfaces

The ring's half-thickness eases from 1 to `TUBE_TRIM_KEEP` (0.5) under every
petal lobe that lies on it. The ramp is linear over `MIN_FEATURE_MM`, measured
from the lobe's first row and from each margin. There is no render-side nudging.
TU4 measures the coincident area between ring and petal triangles within 0.01 mm:

- the full tube on the default reads **0 mm²**;
- slit states read 4.7–22.7 mm², which is the crossing curve itself plus base
  walls buried in the hub;
- the untrimmed ring reads, for example, **124 mm²** on 5 petals at k 0, against
  a bar of 47.

The live sheet is `docs/img/bloom-tube-live.png`
(`node tools/shot-bloom-tube-live.mjs`: h 0.25 and 0.58, TUBE and K 2, BLEND 1,
untrimmed beside trimmed). On stills the difference is subtle, so the evidence
is the TU4 number, not the picture. **The trim never added a census pair on any
row, and it removed pairs where there were some.**

## 4. MUST FIX 2 — the notch at a thin sheet

The decision reads the same input in both modes. TU5 asserts, row by row, that
the triangle count, the notch set and the flare rows match between modes. The
separating row is `thin sheet 0.6, 7 petals, k 0, h 0.40`:

- live W reads 0.144 and export W reads 0.908;
- the old per-mode rule would cut in export and not in live;
- the shipped rule cuts in neither.

The `the-notch-reads-its-own-mode` mutant fails on exactly this row.

## 5. Gates

- **`node tools/verify-bloom-tube.mjs`** (TU0–TU6, 40 states, about 70 s) runs in
  `bloom-export-watertight`'s preflight, together with `--control`.
  - TU2: the fused seams are closed below h.
  - TU3: the slits are open.
  - TU4: coincident area.
  - TU5: mode parity.
  - TU6: boundary 0, directed edges, winding, and one piece by voxel fill.
  - **What it does not see:**
    - the probe only samples rows 3 to 0.6 of the ring;
    - it does not judge the blend's look;
    - it cannot see a slit reopened below h at a seam it did not probe;
    - TU4 bounds an area, not a gap.
- **Mutants:** six, run with `--control`. All six fire.

| mutant | must redden | fired |
|---|---|---|
| a-ring-panel-is-dropped (positive control) | TU2 | yes |
| a-slit-is-fused-shut (negative control) | TU3 | yes |
| the-ring-is-untrimmed | TU4 | yes |
| the-notch-reads-its-own-mode | TU5 | yes |
| the-snap-ties-go-up | TU1 | yes |
| the-eligibility-forgets-the-buckle | TU0 | yes |

- **TU0/TU1** also run on every row of both STL gates (`tubeAssertions`), through
  the real page with read-back.
- **Matrix block 45** has 54 rows:
  - n 5/6/8/12 × every valid k;
  - h 0.10/0.25/0.40/0.58;
  - BLEND 0, 0.5 and 1;
  - multi-whorl with a different k per whorl;
  - snaps through the UI;
  - two thin-sheet rows;
  - form composites;
  - 40×6;
  - six GATED rows.
  - Smoke block 45 has 6 rows; `--check` passes with 140 rows / 41 blocks.
- **Byte partition:** rows 0–992 move **0 floats** positionally in both modes, so
  FREE is the base tree's own build. In block 45, 47 movers moved and 7 holders
  (the snap-to-FREE row and the GATED rows) held.
- **`frozen/phase49`** is the 993 rows at `f266606`. It is registered in both
  maps and declared in advance in `TAG_PUSH_XFAIL`, because this PR edits
  `bloom-export-watertight.yml`.

## 6. Declared xfails

Measured, and identical in Node and Chromium:

| row | pairs | worst mm | why |
|---|---|---|---|
| TUBE: tilt 105 | 320 | 0.3800 | effective tilt past 90: the ring follows a blade that lies back over its own foot |
| TUBE: headRise 1 | 318 | 0.3512 | a hemisphere head turns the seam the same way |
| TUBE: curl 270 at h 0.58 | 400 | 0.1985 | strong curl inside the blend: the ring's chord cuts across a blade that curls away within the fused height |

Every other block-45 row reads 0 pairs, 51 of 54.

The edge-profile gate (E2) reads two GATED rows over its 45 deg allowance. On
both, the tube is unavailable and inert, so the turn belongs to the feature that
gates it:

- `TUBE: GATED — the buckle` adds 48.30 deg, the buckle's out-of-plane class. It
  is in the smoke subset, so it is declared in `E2_TURN_XFAIL`.
- `TUBE: GATED — the fringe` adds 45.0002 deg at the squared terminal's corners,
  the carnation class. It is not in the smoke subset and shows only under
  `--all`, so it is recorded here and not declared.

## 7. Cost

Export triangles, every whorl FREE against every whorl at k 0 (h 0.25, BLEND 1).
Live and export are identical on every state.

| state | FREE | TUBE | Δ |
|---|---|---|---|
| default (8 petals, 1 whorl) | 24,688 | 24,672 | −0.1% |
| 40 petals × 6 whorls (the densest) | 735,072 | 782,112 | +6.4% |
| LAYERS: 3 × ALL THIN × spread min × 40 | 367,632 | 382,752 | +4.1% |
| layerCount max (6) | 147,168 | 175,200 | +19.0% |
| petalCount 40 | 122,672 | 122,592 | −0.1% |
| ZYGO: THE IRIS | 49,184 | 50,144 | +2.0% |
| SEPALS: THE CROWDED CORNER (all three hubs) | 247,260 | 247,180 | −0.0% |
| ROSE-ish | 24,688 | 31,008 | +25.6% |
| GYNOECIUM: style × the APEX CORNER | 10,338 | 12,708 | +22.9% |

A single whorl is roughly cost-neutral, because the ring replaces the lobe rows
it covers. The ring costs more where the flare needs extra rows, as on
ROSE-ish's broad base and the six-whorl stack. The largest tube build anywhere is
782,112, which is 52% of the export budget. The incurve target, the mum,
`EVA_CONFIG` and the orchid rows are tube-unavailable (slot roles, sphere or
variance), so they do not appear here.

## 8. Parked questions

1. **A fourth predicate leaf, `{ id, snapsBelow: other }`.** The grammar could
   not express "the built k is not FREE". Is a new leaf acceptable, or should it
   become a derived boolean?
2. **Placement.** Tube and Fusion are nested under Petal, after Infill. This was
   placed without a ruling.
3. **The sepal angle limit is drawn against FREE petals.** It ignores the ring's
   open sinuses, which are conservative only where the ring covers them.
4. **`TUBE_TRIM_KEEP` 0.5 and the linear trim ramp** are my defaults, not a
   ruling.
5. **The notch-skip bar is `RIM_BEAD_RADIUS_MM`**, compared against the
   half-sinus width W, in both modes. Should it be the full sinus width?
6. **roll 330 + TUBE** reads 8,448 pairs against 13,584 FREE: the petal's own
   declared fold, which the tube reduces. The block-45 row uses roll 180 instead,
   so the row is not a second declaration of the petal's fold.
