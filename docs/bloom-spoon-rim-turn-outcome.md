# The spoon's 72° rim turn — F6-spoon

*Session of Oct 18. Read `docs/bloom-outline-curve-2-outcome.md` §4 for where the two spoon rows were left
(ungated, "Eva's"), and CLAUDE.md's edge-profile, apex-nib and fold-clamp blocks for the bead, the nib and the
cup's clamp.*

## 1. The question, and the answer

`OUTLINE CURVE: the spoon x cup 0.6` reads **71.986507°** on the edge-profile gate's E2 (EXPORT) against the 45°
allowance — identically on a worktree of `1bb7c35` (#417), as #418 measured; `OUTLINE CURVE 2: the spoon x petalWidth 30` reads
**49.198688°**. Neither row was in the smoke subset, so CI never ran E2 on either. The question: is 72° **(a)** the
cup law misbehaving on a WAISTED outline, or **(b)** the geometry of cupping that blade?

**(b), and the premise behind (a) is refuted by measurement: the turn is not at the waist, it is not the curve's,
and a non-waisted CURVE and the nearest LAW shape (main's own geometry) both read WORSE at the same cup.** It sits on
a BLUNT end's last ladder gap before the nib — the class #283 already declared on LAW rows (`GRADIENT: cup gradient
max x cup max x widest petal`, 85.92°). No geometry was changed. Both rows are now smoke rows, declared in
`E2_TURN_XFAIL` at their measured magnitudes, never a widened allowance.

## 2. Where the turn is

`node tools/bloom-spoon-rim-turn.mjs` reads E2 through the gate's own clause (`verify-bloom-edge-profile.mjs
--rows-file`, new — a written-down row set, report-only) and maps the site to the nearest treated profile off the
builder's own `rim.apex` and `profileU`:

- **spoon × cup 0.6: row 52 of 58, u 0.9992, half-width 0.199 mm** — the FIRST NIB-ARC ROW, a clamped bead (room
  0.402 mm). Face-to-face 89.96°, the outline's own turn there 17.98°.
- **spoon × width 30: row 51 of 58, u 0.9806, half-width 4.47 mm** — the last ladder row before the nib, unclamped.
- **spoon × cup 0** (the control): 44.53° at row 16, u 0.25 — the claw, under the allowance. The waist never
  reaches the allowance at any cup; as the cup rises the worst site jumps to the nib and stays there.

**The mechanism is one ladder gap.** On every blunt end the last blade station before the nib's arc rows sits at a
half-width of 2.4–3.0 mm, and the next is already inside the 0.05 mm arc (EXPORT, cup 0.6):

| blade | row n-7 → row n-6 | along | half-width fallen |
|---|---|---|---|
| spoon (CURVE, waisted) | u 0.9803 h 2.418 → u 0.9992 h 0.199 | 0.659 mm | 2.220 mm |
| near-rectangle (CURVE, not waisted) | u 0.9821 h 3.045 → u 0.9994 h 0.201 | 0.605 mm | 2.844 mm |
| LAW spatulate (base 3 / tip taper 0.6 / tip 1.7) | u 0.9839 h 2.621 → u 0.9996 h 0.197 | 0.551 mm | 2.424 mm |
| default curve | u 0.9751 h 1.039 → u 0.9978 h 0.200 | 0.794 mm | 0.839 mm |
| LAW default | u 0.9830 h 1.124 → u 0.9986 h 0.201 | 0.547 mm | 0.924 mm |

The nib's flank and the end's steep fall share that one gap, and the cup's lift at the margin (`c · h`) falls with
the half-width — 1.45 mm to ~0.1 mm in one step at cup 0.6. The bead strip across that gap meets the nib-arc strip
at ~90°. A pointed end (the default curve, the LAW default) arrives at the nib already narrow and never reads over
43.7° at any cup.

## 3. The sweeps (EXPORT, E2 in degrees, through the gate's clause)

**Cup 0 / 0.2 / 0.4 / 0.6 / 0.8:**

| blade | 0 | 0.2 | 0.4 | 0.6 | 0.8 |
|---|---|---|---|---|---|
| **spoon** | 44.53 (claw) | 50.20 | 68.69 | **71.99** | 74.57 |
| near-rectangle (not waisted) | 45.00 | 67.06 | 88.87 | 89.84 | 91.84 |
| LAW spatulate, tip 1.7 | 43.23 | 55.29 | 82.55 | 81.33 | 84.26 |
| LAW spatulate, tip 2.5 | 43.23 | 102.84 | 129.10 | 121.44 | 121.11 |
| LAW spatulate, tip 3.0 | 44.87 | 117.98 | 140.47 | 132.42 | 130.46 |
| default curve | 43.59 | 43.63 | 43.60 | 43.47 | 43.22 |
| LAW default | 43.69 | 43.68 | 43.62 | 43.50 | 43.32 |

Every value from cup 0.2 up on a blunt end is at the nib's first arc row. The spoon's climb is smooth and
monotone, and it is the MILDEST blunt end in the table — the LAW spatulate on main's own law is 9° to 68° worse.
A defect of the curve on a waisted outline would show as a waist-local spike or a curve-only jump; neither exists.

**Width 8 / 16 / 20 / 24 / 30 (cup 0):** spoon 44.96 / 44.53 / 44.38 / **47.09 / 49.20** (the last two at row 51,
the last gap); near-rectangle 45.00 ×4 / 46.47; LAW spatulate tip 2.5 45.00 / 43.23 / 42.79 / 44.74 / 46.51; tip
3.0 45.00 / 44.87 / 46.47 / 46.54 / 47.87; default curve and LAW default ≤ 44.52 everywhere. The width row is the
spatulate head's steeper fall at ×1.875, the same class at a lower magnitude, and a LAW spatulate crosses the
allowance from 20 mm.

**Length 20 / 35 / 60 (cup 0.6):** spoon 69.75 / 71.99 / 86.84, near-rectangle 88.78 / 89.84 / 71.39, LAW
spatulate 106.47 / 81.33 / 66.85 — not monotone in the length, which is what a turn decided by where one ladder
station lands on a steep fall looks like.

## 4. The printed consequence

`tools/bloom-self-intersection.mjs`'s census and per-shell orientation, and the rim's |top − bot| on the emitted
vertices, EXPORT:

| state | tris | within-shell pairs | shells / inward | rim at the first nib-arc row |
|---|---|---|---|---|
| spoon, cup 0 | 24,688 | 0 | 9 / 0 | 0.359 mm (clamped) |
| spoon, cup 0.6 | 24,688 | 0 | 9 / 0 | 0.363 mm (clamped) |
| spoon, width 30 | 24,688 | 0 | 9 / 0 | 0.360 mm (clamped) |
| near-rectangle, cup 0 / 0.6 | 24,688 | 0 / 0 | 9 / 0 | 0.364 / 0.368 mm |
| LAW spatulate 1.7, cup 0 / 0.6 | 24,688 | 0 / 0 | 9 / 0 | 0.356 / 0.360 mm |

**No fold, no inward shell, no triangle moved, and the cup does not thin the rim** — the 0.36 mm rim at the hot
profile is the nib's own narrow-span clamp (#278's room arm on a 0.4 mm-wide nib), the same at cup 0. What the
cup adds is a CREASE: two adjacent facets 90° apart, sound as a solid. The close-up (`docs/img/spoon-rim-turn.png`,
`node tools/shot-bloom-spoon-nib.mjs <dir> --png <file>`, print preview on, J/C/AN/OC asserted before every shutter)
shows it as a pinched "beak" where the cupped bowl closes into the nib — the same beak on the spoon, the
near-rectangle and the LAW spatulate, and absent from the spoon at cup 0.

## 5. What was done

- **No geometry change.** Fixing it "inside CURVE mode only" would put a station into the CURVE ladder that the LAW
  ladder does not get, for a class LAW has worse — two answers to one boundary (the registration rule). This doc
  named the ladder as the remedy: a station inside a blunt end's last gap (a resolution demand from the nib, the
  way `ladderDemand` already asks for `APEX_ARC_ROWS`), for LAW and CURVE alike. **[Oct 21: REFUTED — the ladder
  was tried as ruled and made 10 of 17 measured states worse (`docs/bloom-blunt-nib-ladder-outcome.md`). The class
  is DECLARED BY RULING (Eva, Oct 21): closed, no further session.]**
- **Both spoon rows are smoke rows** (blocks 65 and 66; `--check` reads 254 rows over 62 blocks, 185 families), so
  E2 holds them in CI.
- **Declared in `E2_TURN_XFAIL`**: `the spoon x cup 0.6` at excess 26.986507, `the spoon x petalWidth 30` at
  4.198688, each with its site and reason. Band 5e-5°, both directions — a move either way is a finding.
- **`verify-bloom-edge-profile.mjs --rows-file <json>`** runs a written-down row set as a report (never the full
  set, so the stray-declaration clause stays with full runs). Nothing else in the gate moved.
- Two tools: `tools/bloom-spoon-rim-turn.mjs` (every figure above, ~2 min, no browser) and
  `tools/shot-bloom-spoon-nib.mjs` (the sheet).
- No matrix row added, no byte moved (no geometry file touched), so no frozen phase is owed; `frozen/phase72`
  stays the newest.

## 6. Not done, and named

- **The blunt-nib ladder gap** (§5): every blunt end under a cup reads 50–140° at the nib's first arc row, the LAW
  spatulate worst (140.47° at tip shape 3.0, cup 0.4). It is #283's declared nib × cup class. **[Oct 21: "measured
  as one missing station" is REFUTED — the ladder demand was built and made 10 of 17 states worse
  (`docs/bloom-blunt-nib-ladder-outcome.md`). Eva's ruling, Oct 21: the class stays DECLARED, closed.]**
