# Voronoi's axis seeds are placed inside the cleft void

Found while answering "why does the watershed partition introduce a degenerate cell on
LOBED 2". It is not the partition. **It is shipped today, on every even-lobe-count cleft
petal, and it is a registration-rule violation.**

## The measurement

`petalMask(x, y, P, cfg) < 0` means the point is in removed material. Counting seeds that
fail it, on the head of `claude/voronoi-hole-escape-assertion`:

| config | lobes | axis seeds | seeds in void | of which on the axis | watershed degenerate cells |
|---|---|---|---|---|---|
| LOBED 2, margin off | 2 | 8 | **5** | 5 | 1 |
| LOBED 4, margin off | 4 | 8 | **5** | 5 | 0 |
| LOBED 4, margin ON *(the real default)* | 4 | 8 | **5** | 5 | 0 |
| LOBED 4 aniso 4 | 4 | 8 | **5** | 5 | 0 |
| LOBED 7 d12, margin off | 7 | 14 | **0** | 0 | 0 |
| COST d3 … d12 (LOBED 4) | 4 | 4 … 14 | 2 … 5 | all | 0 |

Every offender is on the axis. The odd lobe count has none.

That is the tell: for an **even** lobe count `cleftConfig` puts a cleft centre at exactly
`y = 0` — a slot running straight down the midline — and the axis seeds are pinned to
`y = 0`, straight down the middle of it. Depth of penetration is not marginal: masks reach
**−0.398** on LOBED 2.

## The cause is two producers of "is this point in the material"

`buildVoronoi` samples its two seed groups with two different tests.

Off-axis seeds are tested against the cleft-aware silhouette:

```js
const y = lerp(Math.max(axisGap, 0.02 * hw + 0.015), hw * 0.95, rng());
if (!pointInPoly(x, y, sil)) continue;          // sil = buildSilhouette(P, 72)
```

Axis seeds are tested against the smooth analytic half-width, which knows nothing about
clefts:

```js
const x = lerp(xLo, xHi, rng());
if (margin(x / P.L) < minHW) continue;          // margin = petalHalfWidth — no cleft term
```

`petalHalfWidth` is the envelope. On a clefted petal the envelope spans every sinus, so the
axis test passes at points the material does not occupy. The comment above the axis block
says *"Their cells straddle y = 0, so the pattern is continuous across it (no seam)"* — true
on a smooth petal, and on an even-lobed one the thing they straddle is the slot.

This is the registration rule exactly: **one boundary, two definitions.** It is the same
shape of defect as the five infill patterns that each invented their own clip, and as the
two producers of the petal boundary fixed in PR #50.

## What it costs today

Seeds in the void own cells in the void, which is a direct contributor to today's
27–51 cells crossing the void on lobed configs. It is not the whole of that number — the
±band clip bound spans the sinuses regardless — but it is a part of it that no clip change
can remove, because the site itself is in the wrong place.

## Why it blocks the partition

The one config where the watershed looked worse than post-#77 today is LOBED 2, and its
single flagged cell belongs to the seed at **(0.981, 0), mask −0.123 — in the void**, lying
exactly on the midline divider. A partition built and measured against a seed set with five
seeds in removed material would be tuned against noise, and the "watershed is worse here"
row would be attributed to the partition when it belongs to seed placement.

## Two hypotheses that were tested first, and refuted

Recorded so they are not re-derived:

**Region bounds pinching to zero width — the #77 defect one level down.** Refuted, and the
configs dissociate cleanly:

| config | region min width | region folds | degenerate cells |
|---|---|---|---|
| LOBED 7 d12 | **0.0000 mm** at t = 0.013 — a real pinch, at the foot, where the dividers converge | 0 | **0** |
| LOBED 2 | 0.6011 mm at t = 0.412 — no pinch anywhere | 0 | **1** |

The config whose regions genuinely pinch produces none. (The LOBED 7 pinch is real and worth
knowing about; it is not producing bad cells.)

**A seed lying exactly on a divider.** Refuted by universality: every lobed config has
8–14 axis seeds at distance exactly 0 from a divider, and only LOBED 2 degenerates.

And the flagged cell is not a sliver in any case — 2.159 mm² over 26 vertices with **no
reversal anywhere**. It carries two coincident-vertex pairs, which is `doubledBack` on the
**raw** cell; the shipped gate asserts on the annulus ring *after* the `dedupePolygon` that
#77 added to `cellAnnulus`. Different objects.

## The fix, not built

Give the axis sampler the same test the off-axis sampler already uses — one definition of
"in the material", read by both. It is small, but it **changes shipped geometry for every
even-lobe-count cleft design**, so it needs its own change report and contact sheet rather
than being folded silently into the partition.
