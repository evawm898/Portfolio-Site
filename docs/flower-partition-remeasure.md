# The partition comparison, re-measured against the fixed clip bound

Every row of the option table in `docs/flower-lobed-voronoi-findings.md` was measured
against a clip polygon with a collapsed neck in it. PR #77 removed the neck. "Today" is
not the same today, so the table was re-run before any of it is used to justify building
the partition.

Harness: `docs/tools/diag-lobed-voronoi-options.mjs`. Re-run on
`claude/voronoi-hole-escape-assertion` at the head that carries `ribClipPolygon`.

## The harness was measuring geometry that no longer ships

`_diag2-hook.js` clipped its replica against `G.ribMarginPolyline(P, 240)`. #77 did not
change `ribMarginPolyline` — it added `ribClipPolygon` and moved only `buildVoronoi` onto
it. So the first re-run returned **byte-identical numbers in all 25 configs**: a table
describing a bound that is no longer used.

The harness's own replica-vs-real check saw it — 20 of 25 configs disagreed — but the
check only *reported* two numbers into JSON. Nothing diffed them, so it sat there looking
like data. It now **asserts**: a cell-count gap over 1, or a total-area gap over 1%, sets
a non-zero exit and names the config. Reporting was not enough; it never is.

With the replica pointed at the bound `buildVoronoi` actually clips against, drift falls
from 20/25 to 3/25.

### The three that still fail, and why they are not #77's

| config | replica | real | gap | verdict |
|---|---|---|---|---|
| LOBED 4 aniso 4, margin off | 48 cells / 2.639 | 48 / 20.768 | area 87% | the replica never implemented per-seed anisotropic metrics — this is #73's overlap, and the row was invalid before #77 too (old: 2.639 vs 20.762) |
| COST d4 — LOBED 4, margin ON | 27 cells | 25 | 2 cells | pre-existing (old: 27 vs 25) |
| COST d10 — LOBED 4, margin ON | 56 cells | 60 | 4 cells | pre-existing (old: 59 vs 61) |

All three are excluded from the comparison below rather than quietly averaged in.

## What moved: the degeneracy column, and only it

Degenerate cells, **today** (the shipped path), before #77 → after:

| config | before | after | partition |
|---|---|---|---|
| SMOOTH, margin ON | 2 | **0** | 0 |
| LOBED 2, margin off | 2 | **0** | 1 |
| LOBED 4, margin off | 3 | **2** | 0 |
| LOBED 4, margin ON (the real default) | **5** | **2** | 0 |
| LOBED 7 d12, margin off | 0 | 0 | 1 |

**The 5 did not drop to 0. It dropped to 2, and the partition still shows 0.**

But the column no longer favours the partition uniformly, which the old table did not
show: on LOBED 2 and LOBED 7 the partition now has *more* degenerate cells than today
(1 vs 0). Degeneracy has stopped being an argument for the partition and become a wash.

## What did not move at all

The two columns the partition was really built on are untouched by #77 — they are about
the cleft void, not the neck:

| config | metric | today | clip-only | partition |
|---|---|---|---|---|
| LOBED 2, margin off | cells crossing the void | 32 | 7 | **6** |
| | mean perimeter in void | 0.235 | 0.075 | **0.022** |
| LOBED 4, margin off | cells crossing the void | 37 | 11 | **9** |
| | mean perimeter in void | 0.330 | 0.090 | **0.025** |
| LOBED 4, margin ON | cells crossing the void | 27 | 8 | **6** |
| | mean perimeter in void | 0.332 | 0.098 | **0.021** |
| LOBED 7 d12, margin off | cells crossing the void | 51 | 24 | **10** |
| | mean perimeter in void | 0.280 | 0.073 | **0.016** |

`area / bound` is likewise unchanged: today 1.244–1.359 (cells overhanging the material),
clip-only and partition 1.000 in every row.

## The conclusion, stated as the narrowed argument it now is

The partition's case is **void content and seam direction**. It is an order of magnitude
better than today on mean perimeter in void (0.016–0.025 against 0.235–0.332) and roughly
five-fold better on cells crossing the void, and #77 changed neither number.

What it can no longer claim is the degeneracy column. That was 5 → 0 in the old table and
is 2 → 0 on the real default now, with the sign flipped on two other configs. Anyone
citing "the partition removes degenerate cells" should stop; the clip trim did most of
that, and where it did not, the partition is not reliably better.

Clip-only remains worse than the partition on void content (0.073–0.098 against
0.016–0.025) and is still not a substitute.
