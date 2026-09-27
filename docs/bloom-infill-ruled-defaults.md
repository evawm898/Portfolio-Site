# The Voronoi infill — the ruled defaults, and the solid base parked

Eva's rulings, from the live preview with print preview on:

| control | was | now |
|---|---|---|
| `infillDensity` | 16 | **20** |
| `infillRelax` | 4 | **5** Lloyd passes |
| `infillLaw` | 1.00 | **0.30** |
| `infillAniso` (stretch) | 2.20 | **1.65** |
| hole bar | 1.50 mm | 1.50 mm — not revisited |
| `infillBase` (solid base) | visible with the guard on | **hidden at every state, pinned at 0** |

Nothing else moves. The four numbers are the geometry's own constants
(`INFILL_DENSITY_DEFAULT`, `INFILL_LLOYD_PASSES`, `INFILL_TIP_GAMMA`,
`INFILL_ANISO`), so the registry defaults and the builder's fallbacks stay the
same doubles and I8(a)/(d) still hold by construction. The shipping default is
still `petalInfill: NONE` — every number below is about a blade with the guard
ON.

## 1. The premise reproduces

Before anything moved, on `a8cea82` with the four values passed explicitly
(`tools/bloom-infill-wall.mjs`'s `infillPlanFor`, the shipped plan):

**20 asked · 20 cells · 20 holes at or over 1.50 mm · 0 solid, in EXPORT and
LIVE alike. Holes by fifths of the blade, base → tip: 3 / 5 / 5 / 4 / 3.**
Hole widths 1.54 – 3.41 mm, median 2.73. So the ruling was made against a state
this tree has.

## 2. The stretch trap — 1.65 is one slider step clear, reported not moved

Swept at 0.02 from 1.00 to 3.00 with the other three at their ruled values,
counting a reshuffle as a cell centroid moving > 1.5 mm between neighbouring
steps or the cell count changing (§3 of `docs/bloom-infill-s4-outcome.md`'s own
criterion, with a symmetric nearest-centroid distance so a re-indexing is not
read as a move):

- **reshuffles at 1.06, 1.14, 2.38, 2.84** (4 of 100 steps; with relaxation off,
  the same four). The nearest to 1.65 are 1.14 and 2.38 — neither adjacent.
- **but the HOLE COUNT has an edge the centroid criterion does not see:**
  18 holes up to stretch 1.585, 20 from 1.586. At the slider's own 0.05 step:
  `1.55:18 1.60:20 1.65:20 1.70:20 … 2.35:20 2.40:13`.

So a one-step nudge from 1.65 (to 1.60 or 1.70) keeps all 20 holes; **two steps
down (1.55) loses two**. The 20-hole plateau runs 1.60 – 2.35; the nearest value
with two clear steps either side is **1.70**. Identical in both modes. The
ruled 1.65 ships as ruled — the value is Eva's.

## 3. Parked, not retired: the solid base

`infillBase` keeps its id, its registry row and its `DEFAULTS` key (0), so no
saved design needs a migration and `RETIRED_IDS` does not apply. Its predicate
is `{ all: [{ ref: 'infillPresent' }, { any: [] }] }` — never true — with a
`hiddenReason`. **Why `infillPresent` stays a term:** the harness's
`INFILL_SUBS` is DERIVED from a control's predicate drivers including
`petalInfill`; a bare `{ any: [] }` has no driver, so the control would fall out
of `INFILL_SUBS`, into `SWEEPABLE`, and the blanket sweep would gain two rows
and `ALL MAX` a new value. Checked: the drivers still read `['petalInfill']`.

**The reason, recorded:** at 0 the cells already start on the derived lamina
floor, and what makes the base read solid is `INFILL_BASE_NARROW` plus the basal
V — both below the floor and neither a control. If the basal-V work makes the
base fillable, the control becomes meaningful again: drop the `{ any: [] }`
term.

**It still works when written**, and the gates still say so: I9 drives it at
0 / 0.5 / 1 through the shipped plan; the panel gate's route (u) writes it to
0.5 and 1 and reads the builder's floor back off the levers line; the matrix
rows `INFILL: x solid base 1` and `x the four at their far ends` build it. I8
now asserts both directions — hidden with the guard off AND hidden with the
guard on — and the three other levers visible with the guard on.

## 4. A finding the defaults exposed: I1 on ALL FORM MAX

At the ruled defaults I1 went red on `ALL FORM MAX` (cup 1.2 + gradient 1 +
roll 330 + twist 180 + curl 360): the builder keeps a hole whose on-object
width, measured in-sheet from its Chebyshev centre, reads **1.4799 mm** against
the 1.50 mm bar (plan width 1.6060). Attributed one lever at a time, EXPORT:

| state | narrowest emitted hole |
|---|---|
| the old defaults | 2.3818 |
| old + density 20 | 1.6292 |
| old + relax 5 | 2.3605 |
| **old + law 0.30** | **1.4034** |
| old + stretch 1.65 | 2.6837 |
| the new defaults | 1.4799 |
| new with the law back at 1.00 | 1.5814 |

It is the DENSITY LAW leaving 1 that exposes it: the builder decides the bar
through `infillWidthMm` on the metric field and I1 measures the emitted loop on
the surface; the two estimators agreed while the law was 1 and disagree by 1.3%
on the most deformed state once it is not. **Pre-existing, not built here.** It
is declared in `I1_XFAIL` with its magnitude, held in both directions (still
under the bar, and at 1.4799 ± 5e-5 mm), so the day the builder's estimator is
fixed the gate says so. The default blade itself reads 1.550 mm narrowest, and
every other one of the 18 states clears the bar.

**The law at 0.30 also puts `Math.pow` on every infilled row** — at gamma 1 it
was skipped outright. The comment at the spacing law now says so; the witness is
X0 in the browser gate (§6).

## 5. Census — every `INFILL:` row re-measured

Node, EXPORT, the builder's doubles, both trees:

- **Four entries clear to 0 and come off:** `the ruled defaults` (4 → 0 —
  the feature's own shipping state now reads clean), `x density 40` (2 → 0),
  `x tipThinning 0.80` (4 → 0), `x sepals 8` (4 → 0).
- **Fourteen re-recorded**, both directions, previous figure kept in each note:
  cup × curl 360 10,536 → 8,776; ALL FORM MAX 15,264 → 21,704; roll 330
  32,088 → 40,280; solid base 1 12 → 18; far ends 12 → 20; length 60 × density
  40 800 → 320; buckle 3,017 → 3,422; 40 × 3 whorls 6,720 → 3,684; CONTINUOUS
  1,032 → 948; SPHERE with stem 576 → 476 (**and its worst span goes 0.0000 →
  0.4270 mm — no longer a tangency, a real fold, the infill's own**); petalWidth
  8 384 → 384 (span 0.1459 → 0.0000); petalWidth 30 1,216 → 1,056; footDelicacy
  0.25 736 → 800; petalTipShape 3.00 1,024 → 1,056.
- **Five new declarations, all span-0.0000 tangencies** (the knife-edge
  class): density 8 (2), petalLength 20 (12), relaxation 0 (4), law 2 (4),
  stretch 3 (5). Each read 0 on `a8cea82`.

`node tools/bloom-xfail-magnitudes.mjs --only '^INFILL'`: 19 declared rows, 19
at their recorded magnitude.

## 6. Gates

All run on this tree before the push:

- `verify-bloom-infill.mjs` — **PASS, I0..I11 over 18 states x 2 modes**; `--negative-control`:
  **all six I-family mutants and all six S4 mutants fire every clause they name, each S4
  witness MOVED** on the mutated module.
- `verify-bloom-export.mjs --only '^INFILL'` in Chromium — **31 of 31 reached the results,
  31 watertight, 0 degenerate, live = export triangle counts on all 31, 12 free of
  within-shell self-intersection and 19 declared, each failing at EXACTLY its recorded
  magnitude** — which is what confirms the Node re-records in the browser, and X0 (the page's
  STL against the Node rebuild) is clean on every row, so the `Math.pow` exposure did not
  diverge on any of them.
- `verify-bloom-panel.mjs` — **PASS**; `--negative-control` — **ALL TWENTY ROUTES observed the
  failure**, the infill levers route (u) among them. Route (u) now asserts the solid base is
  hidden with the guard on as well as off, and still reads its value back off the builder.
- `bloom-combination-gate.mjs` — **22 pairs, 294 cells, CG0–CG7 clean**; the two density pairs'
  grid now opens at 20 (CG0: the first value is the registry default) and the density is still
  bit-identically inert for `self` (CG7 at exactly 0); `--control` green.
- `verify-bloom-grid.mjs` + `--negative-control`, `bloom-wall-thickness.mjs`,
  `bloom-smoke.mjs --check --negative-control` (122 rows / 36 blocks / 119 families) — green.
- `bloom-xfail-magnitudes.mjs --only '^INFILL'` — 19 of 19 at record.

## 7. Byte partition

`verify-bloom-surface-bytes.mjs` CANNOT answer this: it builds both trees from THIS tree's
DEFAULTS, so a defaults move reads "held" on every row by construction. The new
`tools/verify-bloom-defaults-bytes.mjs` builds each tree from its OWN registry and matrix,
pairs the rows by index (refusing a pair whose control sets differ — the renamed row passes,
its set is unchanged), and predeclares a MOVER from the BASE tree's own builder record: some
built petal carries an infill plan that was not refused.

**PASS — 27 predeclared MOVERS, 27 moved; 924 HOLDERS, 0 floats moved on any of them**,
positionally under `Object.is`, LIVE and EXPORT, over **1,229,799,420 export floats and
172,282,730 captured-grid values**, the whole 951-row matrix. `--control` perturbed the
shipping DEFAULT row's first float by 1e-9 and the holder clause reported it. The 27 are every
`INFILL:` row except the four whose base record builds no plan: the two REFUSED rows (fringe,
lobed) and the two GATED rows. **Hiding the solid base moves 0 bytes** — it is in the 924,
since no holder can reach it — and `ALL MAX`, the shipping default and every non-infill row hold.

## 8. Budget

EXPORT triangle counts, `a8cea82` → this tree:

| row | before | after | of 1,500,000 |
|---|---|---|---|
| the infilled shipping default (whole bloom) | 52,320 | 58,880 | 3.9% |
| one petal (the sheet) | — | 7,528 | — |
| **`INFILL: x 40 petals x 3 whorls`** (the infill's own corner) | 678,912 | **712,512** | **47.5%** |
| `INFILL: x CONTINUOUS x 3 turns` | 121,172 | 121,100 | 8.1% |
| `INFILL: x petalLength 60 x density 40` | 64,064 | 68,864 | 4.6% |

`ALL MAX` is uninfilled (the guard is a CHOICE, out of the blanket sweep) and a
holder of this change. Every other row is unaffected.

## 9. Frozen phase

`frozen/phase41` is the 951 rows at `a8cea82`, registered in BOTH maps. It is
owed twice over: every infilled row's bytes move, and block 39's
`INFILL: the ruled defaults (...)` row is RENAMED (its old label named 16 cells)
— a row definition changing. The live matrix stays 951 rows.

## 10. The picture

`node tools/shot-bloom-infill-shipped.mjs <dir> --png docs/img/infill-ruled-defaults.png`
— EXPORT mode, which is the geometry print preview shows. The single petal:
20 asked, 20 holes, 0 solid, fifths 3/5/5/4/3, 7,528 triangles. The whole
bloom: 20 of 20 a petal, fifths 3/5/5/4/3, 58,880 triangles.
`docs/img/infill-shipped.png` stays put — it records S3's defaults.
