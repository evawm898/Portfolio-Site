# The partition comparison, re-measured against the fixed clip bound

Every row of the option table in `docs/flower-lobed-voronoi-findings.md` was measured
against a clip polygon with a collapsed neck in it. PR #77 removed the neck, so "today" is
not the same today. Re-run before any of it is used to justify building the partition.

Harness: `docs/tools/diag-lobed-voronoi-options.mjs`, on the head of
`claude/voronoi-hole-escape-assertion` that carries `ribClipPolygon`.

> **Correction.** The first version of this document compared `today` against
> **`optPartition`**, which is the STRAIGHT CUT — the option that was *rejected*. The
> approved design is **`optWatershed`**. Every conclusion drawn from the straight-cut column
> was about the wrong candidate, and it made the watershed's case look far weaker than it
> is. The table below is the watershed. The straight cut is kept only for contrast.

## The harness was measuring geometry that no longer ships

`_diag2-hook.js` clipped its replica against `G.ribMarginPolyline(P, 240)`. #77 did not
change `ribMarginPolyline` — it added `ribClipPolygon` and moved only `buildVoronoi` onto
it. So the first re-run returned **byte-identical numbers in all 25 configs**: a table
describing a bound that is no longer used.

The harness's own replica-vs-real check had seen it — 20 of 25 configs disagreed — but the
check only *reported* two numbers into JSON. Nothing diffed them, so it sat there looking
like data. It now **asserts**: a cell-count gap over 1, or a total-area gap over 1%, names
the config and sets a non-zero exit. Reporting was not enough; it never is.

Repointed at the bound `buildVoronoi` actually clips against, drift falls 20/25 → 3/25.
The three survivors were invalid before #77 too — the aniso row's replica never implemented
per-seed metrics (#73), and two COST rows always mismatched. They are excluded below rather
than quietly averaged in.

## What #77 fixed, and what it did not

`ribClipPolygon` trims the bound where `ribInnerEdge` collapses to zero, and that collapse
is at the **ends**. Between the trims the bound is still a ±band around the axis, so **cells
still span the sinuses**. That is visible in the numbers: `area / bound` measured against the
material stays at **1.244–1.435** after the fix, and today's mean perimeter in void stays at
**0.235–0.332**.

So the defect that was photographed — cells ignoring the lobes — is *not* fixed by #77. #77
fixed the collapsed neck: real, invisible on screen, and blocking everything downstream. The
visible defect still needs the partition.

## Watershed against today

| config | metric | today | clip-only | straight cut | **watershed** |
|---|---|---|---|---|---|
| LOBED 4, margin ON *(the real default)* | cells crossing void | 27 | 8 | 6 | **0** |
| | mean perimeter in void | 0.332 | 0.098 | 0.021 | **0.000** |
| | area / bound | 1.435 | 1.000 | 1.000 | **1.000** |
| LOBED 4, margin off | cells crossing void | 37 | 11 | 9 | **2** |
| | mean perimeter in void | 0.330 | 0.090 | 0.025 | **0.007** |
| LOBED 7 d12, margin off | cells crossing void | 51 | 24 | 10 | **2** |
| | mean perimeter in void | 0.280 | 0.073 | 0.016 | **0.005** |
| LOBED 2, margin off | cells crossing void | 32 | 7 | 6 | **4** |
| | mean perimeter in void | 0.235 | 0.075 | 0.022 | **0.012** |

**On the real default the watershed reaches zero cells crossing the void, at every density
from d3 to d12 and every Lloyd setting from 0 to 20.** Not reduced — zero. The straight cut
never gets below 4 on the same rows, and clip-only never below 4.

## Degeneracy: the column that "flipped" was the wrong column

Degenerate cells reported by the replica, today → after #77, with both partition variants:

| config | today before | today after | straight cut | **watershed** |
|---|---|---|---|---|
| SMOOTH, margin ON | 2 | 0 | 0 | **0** |
| LOBED 2, margin off | 2 | 0 | 1 | **1** |
| LOBED 4, margin off | 3 | 2 | 0 | **0** |
| LOBED 4, margin ON *(real default)* | 5 | 2 | 0 | **0** |
| LOBED 7 d12, margin off | 0 | 0 | 1 | **0** |

The watershed is worse than post-#77 today on **one** config, not two. LOBED 7 was the
straight cut's problem, not the watershed's.

## Why LOBED 2's one cell is flagged — two hypotheses, both refuted

**Hypothesis 1: the #77 defect one level down** — a per-lobe region bound pinching to zero
width the way the petal bound did, most likely at the foot where the dividers converge.
**Refuted, and the two configs dissociate:**

| config | region min width | region folds | degenerate cells |
|---|---|---|---|
| LOBED 7 d12 | **0.0000 mm** at t = 0.013 (a real pinch, at the foot, exactly as predicted) | 0 | **0** |
| LOBED 2 | 0.6011 mm at t = 0.412 (no pinch anywhere) | 0 | **1** |

The config whose regions genuinely pinch produces none, and the config that produces one has
no pinch. Pinched regions are not the cause. (The pinch at LOBED 7's foot is real and worth
knowing about, but it is not producing bad cells.)

**Hypothesis 2: a seed lying exactly on a divider,** where the region's clip edge passes
through the site. **Refuted by universality:** for an even lobe count one divider coincides
with the axis, and *every* lobed config has axis seeds sitting on it at distance exactly 0 —
8 seeds on LOBED 2, 8 on LOBED 4, 14 on LOBED 4 at d12. Only LOBED 2 degenerates.

**What the cell actually is.** Region lobe0, seed at (0.981, 0), **2.159 mm², 26 vertices —
not a sliver.** Walking it vertex by vertex: **no reversal anywhere**, no antiparallel pair.
What it has is two coincident-vertex pairs (indices 2/3 and 10/11) and one vertex landing on
the long closing edge.

Which means the flag is not measuring what its name says. `degenerateCells` here is
`doubledBack` applied to the **raw clipped cell**; the shipped gate asserts on the
**annulus ring after `dedupePolygon`**, which is precisely what #77 added to the head of
`cellAnnulus` to remove coincident vertices. **The two are different objects, so this column
was never comparing like with like** — replica-raw against gate-deduped.

## Conclusion

The partition's case is **void content and seam direction**, and on the real default the
watershed takes void content to zero rather than merely reducing it. Degeneracy was never
its reason; it was a column that happened to favour it, and re-measuring shows the one row
where it does not is an artifact of a replica-only metric that the shipped path no longer
applies.

The remaining honest measurement is to build the watershed and put it through
`verify-geometry-quality`, which asserts on the object that actually gets exported. That is
the only degeneracy number that counts.

---

# FINAL — re-measured against corrected seeds (post-#81)

Third and last time this baseline moves. Everything above was measured before #81
removed the seeds sitting in the cleft void; this section is the comparison the partition
should actually be judged against. Harness re-run on `main` at `1e5050e`.

**Two configs excluded, and the harness excluded them itself.** `COST d4` and `LLOYD l6`
tripped the replica-vs-real assertion (cellGap 2, areaGap 0.0023) and the run exited
non-zero rather than reporting them. Both are the pre-existing class where the real
builder's culls and the replica's plain clip disagree by a cell or two — not caused by
#81, which in fact removed the third member of that list (the anisotropy row, whose
replica had disagreed by 87% of area).

**Seeds in the void: 0 in all 23 clefted configs.** That is #81's control, still holding.

## The comparison

| config | today: cells crossing void / mean perim in void | **watershed** | today's `area/bound` |
|---|---|---|---|
| **LOBED 4, margin ON** *(the real default)* | 21 / 0.2521 | **0 / 0.0000** | 1.435 |
| LOBED 4, margin off | 31 / 0.2500 | **2 / 0.0067** | 1.316 |
| LOBED 7 d12, margin off | 53 / 0.2822 | **2 / 0.0053** | 1.359 |
| LOBED 2, margin off | 27 / 0.1917 | **3 / 0.0084** | 1.244 |
| SMOOTH, margin ON | 0 / 0.0000 | 0 / 0.0000 | 1.000 |

`area / bound` is **1.000 for the watershed on every row**, against today's 1.244–1.435.

## What #81 moved, and one row it moved the wrong way

Today's numbers improved on three of four clefted rows — the seed fix delivering part of
the defect, as predicted:

| config | today, before #81 | today, after #81 |
|---|---|---|
| LOBED 2 | 32 / 0.2347 | 27 / 0.1917 |
| LOBED 4, margin off | 37 / 0.3303 | 31 / 0.2500 |
| LOBED 4, margin ON | 27 / 0.3323 | 21 / 0.2521 |
| **LOBED 7 d12** | 51 / 0.2799 | **53 / 0.2822** |

**LOBED 7 got slightly worse.** Recorded rather than smoothed over: removing void seeds
redistributes the rest, and on seven lobes two more cells end up crossing a sinus. It is
small and it is in the opposite direction to the other three, which is exactly the kind of
row that gets quietly dropped from a summary.

## The row that said the partition was worse has disappeared

Before #81 the watershed showed **1 degenerate cell on LOBED 2** where today showed none —
the one row where the partition looked worse, and the row that stopped the partition being
built until it was explained.

It is now **0 degenerate cells for the watershed on every row.**

The cell belonged to the seed at **(0.981, 0), mask −0.123 — in the void**, and #81 removed
that seed. The attribution recorded in `docs/flower-axis-seeds-in-void.md` is confirmed by
its own fix: it was seed placement, not the partition, and not either of the two hypotheses
tested before it.

## The case, stated against a baseline that will not move again

- **Void content.** On the real default the watershed is **0 cells crossing the void
  against today's 21**, and mean perimeter in void **0.0000 against 0.2521**. On the other
  clefted rows, 2–3 cells against 27–53.
- **Tiling.** `area / bound` exactly **1.000**, against today's 1.244–1.435 — today's cells
  overhang the material by a quarter to nearly half again its area.
- **Degeneracy.** No longer an argument in either direction: **0 for both**, everywhere.
- **Seam direction.** Unchanged and unmeasured here; it is why the watershed was chosen
  over the straight cut, and the seam renders were approved at every lobe count.

Nothing above is contaminated by seeds in removed material, by a replica of a builder that
no longer ships, or by the wrong option column.
