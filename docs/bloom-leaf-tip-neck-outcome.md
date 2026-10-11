# Bloom S5b: the tip neck, the already-round leaves, the E2 churn

Leaf/stem build S5b, Eva's rulings of Oct 11 on S5 (#395). Three jobs, done in
the order ruled: Job 1 (the neck), Job 3 (the E2 churn), Job 2 (the
already-round leaves). Branch `claude/compassionate-curie-97863i`, from `main`
at `d92a0c6`. The sheet is `docs/img/leaf-tip-neck.png`
(`node tools/shot-bloom-leaf-tip-neck.mjs <png> --base <worktree of d92a0c6>`).

| | what shipped | bytes |
|---|---|---|
| Job 1 | the converging tip gives up the tooth pair that necks it (LF35) | leaf rows with a neck move; every other row holds |
| Job 3 | the nib's three arc rows come from the stations nearest the arc | leaf rows with a nib move; every other row holds |
| Job 2 | an already-round sinus is said plainly (LF36) | none — `bloom-geometry.js` is untouched |

---

## 1. Job 1: the converging tip gives up the pair that necks it

### 1.1 What the neck is, measured

S5 closed every leaf blade on the petal's nib, and the tooth law's relief is
constant along the margin (`R = depth x (peak half-width - TIP_HALF_MM)`, a
per-period guard). Against a converging tip a constant relief is a growing
fraction of the blade, so the tip-most notch takes most of what is left: on the
mum it reads as a KNOB on a stalk, on the default SIMPLE leaf as a parallel
SHAFT. Measured on the base tree (`node tools/bloom-leaf-tip-neck.mjs --defaults
--root <d92a0c6>`), each notch's worst fraction of the way to the midrib — the
cut against the base outline it is cut from, off the nib:

| blade (defaults) | tip-most notch | the next ones | body's deepest |
|---|---|---|---|
| SIMPLE, the default leaf | **76.9 %** at u 0.917 | 35.5 %, 25.0 % | 25.9 % |
| the mum (LOBED) | **80.9 %** at u 0.902 | 43.3 %, 67.1 %, 41.3 % | 50.4 % |
| the rose leaflet, toothed at 0.26 | **85.9 %** at u 0.939 | 32.5 %, 24.6 % | 26.1 % |

**SIMPLE's shaft comes from the tooth, not from the print floor**, so the
ruling applies and there was no stop. With the teeth off the default SIMPLE tip
tapers smoothly into the nib. The parallel stretch is the terminal notch's
flank held near the floor by the cut.

### 1.2 The criterion, and why it is not the one the brief sketched

The brief suggested "the drawn outline below the last crest never drops below
the base further up". Taken literally that flags every tooth (every tooth is a
waist followed by a widening), and read as "below the last crest only" it is
vacuous in the apex-crest case. **Re-spacing the teeth (a count yield) was
measured and refuted**: every count puts its tip-most notch in the closing tip,
so a count yield cascades toward zero teeth.

**The shipped criterion (LF35's subject):** walking from the apex down, a pair
whose sinus lies past the blade's widest point is a NECK iff its worst fraction
(law, off the nib, 512 samples) is past the BAR, and it is given up — its
stations stay, both margins get relief 0 (the even-count apex notch's own
treatment). The walk stops at the first pair at or under the bar. **The bar is
`max(1/2, the body's own deepest tooth)`** — the body being the margin periods
below the widest point, the root-most period excepted. Past halfway a notch
parts the blade; the relative half exists because at deep serrations (depth 1,
`lobedSinus` 0.9, `leafletToothDepth` max) a half-only rule left the whole upper
blade as a bulb on a notch below the widest point — the tip is necked only
where it is parted MORE than the blade's own serration parts it.

Told like the other yields, on the teeth line: asked against drawn, the
fraction, the reason ("past halfway a notch parts the blade — a neck"), the
pair below's fraction; the slider keeps its value.

### 1.3 What it costs — the mum's pins, old and new

LF31 pins the mum (Eva's ruled lobed defaults). They move for this reason
only, and only where the give-up acts:

| pin | S5 (`d92a0c6`) | S5b |
|---|---|---|
| teeth asked / laid out | 28 / 28 | 28 / 28 |
| teeth **drawn** | 28 | **26** (one pair given up at the tip) |
| per lobe, base to terminal | 3 / 4 / 4 / 6 | **3 / 4 / 4 / 4** |
| tris a leaf | 6,916 | 6,916 |
| roundness saturation | 0.175018 | 0.175018 |
| round-bottom radii | 1.7458 / 1.2312 / 1.2428 mm | unchanged |

The terminal lobe stays a pointed, toothed lobe with no knob (the sheet's
terminal-lobe pair); the walk did not need to apply a second time on the mum —
**the mum gives up one pair**.

Over the live matrix (base tree, the restated rule): **187 rows build a leaf
and 111 give at least one pair up**; over 568 blades, 91 give none, 466 one,
11 two, and **no blade is drawn to zero teeth**. The nearest decision to the
bar is **0.49980 on `LOBED: lobedAngle min`** (2e-4 of margin) — reported, a
knife edge the 512-sample geometry and the 2,048-sample instrument agree on.
The geometry and the instrument agree on all 187 rows.

### 1.4 LF35 and its witnesses

LF35 has two halves. **(b) the record**: the bar restated from the body's
fraction, the give-ups exactly the tested pairs past it, both mirror periods at
relief 0, the drawn count restated from the reliefs. **(a) the rows**: on the
emitted half-widths, the body's deepest row fraction bracketed by the layout's
own crests and sinuses, and the tip-most cut period (past the widest point)
held at or under the bar. Replicated over 559 blades of the matrix before it
shipped: 0 would fire, worst margin 0.0018.

Two standing mutants: `the-tip-keeps-its-neck` (the bar doubled — fires LF35
and LF31) and `the-given-pair-is-told-and-still-cut` (the record honest, the
outline still cut — fires LF35 and LF29). LF13 and LF29 exempt a given pair by
name. **Declared blindness:** a mutation that INFLATES the fraction gives up
too much, which LF35's record half cannot tell from a real neck (it restates
the same fraction); on the mum only LF31's pin sees it.

Block 60 carries the arms (the default SIMPLE leaf alone, two pairs given at
depth 0.5 x 9, the bar raised to the body's at 0.5 x 12, nothing given at 0.8
x 9, the rose toothed at 0.26), and smoke block 60 the four that claim LF35.

---

## 2. Job 3: the E2 churn — where the nib's rows come from

### 2.1 The finding

S5 took the arc's three rows from the WHOLE base stretch (LOBED: every station
of `[0, uF)` about 3 % coarser; SIMPLE: everything above `RIM_TIP_ROWS`), so
every lobe, sinus and tooth was re-faceted by a fraction of a gap, and the edge
profile's E2 — a tessellation reading — moved mid-blade in both directions. The
mum went 32.876 -> 39.630 deg over the allowance, and five shared-node rows
(one leaf state, five labels) came newly over it.

### 2.2 The variant table

Measured with each variant on a scratch tree: E2 over the 63 leaf smoke rows
(EXPORT, `--dump-e2`), against the d6d2ab4 figures; the tip-corner censuses
(`tools/bloom-lobed-tip-corners.mjs`, EXPORT, LOBED 972 / SIMPLE 243 /
COMPOUND 243 corners, over the leaf's own triangles). "Newly over" counts rows
that EXISTED at d6d2ab4 and were under the allowance there. The four rows new
since then (the LEAF TIP pair, BROAD SINUS, the lobe-yield row first measured at
S5) and Job 1's TIP NECK row are counted apart.

**LOBED** (q = how many stations nearest `arcU` donate):

| variant | mum E2 | lobed rows vs d6d2ab4 | tip folds (new / gone vs S5) | mid-blade |
|---|---|---|---|---|
| S5 (the whole base stretch) | 39.630 | 15 moved | **16** | 4 |
| the whole tip stretch | **32.876** | all exact | 15 (3 / 4) | 3 |
| **6 donors (ships)** | **32.876** | **all exact** | **14 (0 / 2)** | 3 |
| 9 donors | 32.876 | all exact but one (RESIDUAL 24.54) | not run | — |
| 12 donors | 32.876 | all exact | 23 (7 / 0) | 3 |
| 18 donors | 32.876 | all exact | not run | — |

**SIMPLE and leaflets:**

| variant | rows newly over | `arch 180 x cup 1.2` | CARNATION | tip folds SIMPLE / COMPOUND |
|---|---|---|---|---|
| S5 (above `RIM_TIP_ROWS`) | **5** (the shared-node leaf) | -1.31 | 8.38 | 0 / 0 |
| 6 donors | 1 | **17.34** | 15.88 | 0 / 0 |
| 12 donors | 1 | 4.58 | 13.27 | 0 / 0 |
| 18 donors | 1 | 0.93 | 9.41 | 0 / 0 |
| **24 donors (ships)** | **0** | -0.52 | 9.40 | **0 / 0** |
| 30 donors | 0 | -0.13 (a knife edge) | 9.01 | 0 / 0 |
| 36 donors | 0 | -0.10 | 8.77 | not run |
| the last crest to the crossing | 3 (one by 32 deg) | 6.91 | 9.40 | 0 / **3** |

(3 donors is invalid on both types: it duplicates stations and emits thousands
of degenerate triangles.)

**Shipped, L6 + S24:** the mum **32.876** (its d6d2ab4 figure, to the sixth
decimal), **0 rows newly over** on rows that existed at d6d2ab4 (S5: 5), 24
entries over the leaf smoke rows against S5's 28; tip folds **LOBED 14, SIMPLE 0, COMPOUND 0** (S5: 16 /
0 / 0, none new), mid-blade LOBED 3 (S5: 4). The goal is met.

### 2.3 What it gives back, plainly

- **BROAD SINUS (an S5 row) 17.43 -> 44.82.** Its unfilleted sibling
  (`LOBED: lobedShape max (2.5)`) read 46.02 on the pre-S5 stations; S5's
  re-faceting happened to land that state's bead lower, and restoring the
  pre-S5 lobe window gives it back. A tessellation reading, re-recorded with
  the before figure.
- **Four SIMPLE rows still read over the d6d2ab4 figure** (`tip shape ACUTE`
  2.41, CARNATION 9.40, `TOOTH FLOOR` 5 mm 3.82 and 3.5 mm 3.14). Their worst
  sites are at the converging tip, u 0.83-0.94 on narrow or acute blades
  (`E2_AT=1`): the nib's own flank, not mid-blade churn. Before S5 these blades
  ended on the stub, so there is no pre-S5 nib figure to return to.

### 2.4 S5's tip-paid measurement

S5 wrote that taking the arc's rows from the tip stretch "reads 7 corners worse
than main". **It does not reproduce on this tree**: the whole tip stretch
donating reads 15 tip folds of 972 against the base stretch's 16. **Whether S5
measured before or after its nib-cut fix cannot be read from the record** (its
intermediate commits are not on the remote). So it was re-measured on a scratch
tree with the fix undone (`leafHalfAt` cutting the nib again): S5's law 16,
tip-paid 15. That is identical to the fixed tree, so the fix does not explain
S5's figure either way. Its "7 worse" belongs to a state no longer
reconstructible. One candidate, untested: it was taken while `LEAF_ARC_ROWS`
was still 6.

### 2.5 The law and its witnesses

`LOBED_ARC_DONOR_ROWS = 6`, `LEAF_ARC_DONOR_ROWS = 24` (counts: shares of a
fixed row budget, bounded by the census and E2, never a length). The stations
below the donors are the pre-S5 doubles by construction. The harness restates
both laws (`restatedLobedStations`, `restatedLeafStations`: 1,453 blades of the
matrix, 0 differing to the bit), and LF20 (lobed), LF11 (a simple blade's row centres) and LF16 (a leaflet's) read them. Two standing
mutants revert each type to S5's whole-blade spread
(`the-lobed-arc-rows-come-from-the-whole-window`,
`the-leaf-arc-rows-come-from-the-whole-blade`), witnessed on the mutated
module's own stations. E2: 23 entries re-recorded with the before figure, 5
stale entries off, 1 new (the TIP NECK body row, mid-blade at u 0.45, the
depth-0.8 serration's own notch).

---

## 3. Job 2: the "already round" leaves

### 3.1 Measured, before anything moved

In the 500-state sampler at roundness 0.12 (`tools/bloom-lobed-sinus-sample.mjs
--n 500 --set lobedRound=0.12`), on the Job-1 tree, **58 leaves have the slider
entirely dead and carry only already-round sinuses** — 148 sinuses (S5 counted
60 on its own tree). Instrumented on a scratch copy:

- the sinus's own law bottom curves on a radius **1.6 to 11 times the largest
  fillet its arms take** (median 19 mm against a ~6 mm fit; p10 6.6 mm);
- **that largest fillet adds at most 3.9e-7 mm to the law ANYWHERE** in the
  half-period at 4,096 samples (span at most 0.016 mm) — not only at the rows;
- the drawn rows turn at most 12.8 deg near the bottom (median 3.5), and the
  chord between the rows straddling the bottom stands 0.001 mm (median) above it.

**They are round, not a V that is round only between the rows.** So the second
branch of the ruling applies: no row moves, and the read-out says so plainly.

### 3.2 What shipped

The roundness control names every such sinus with its largest fillet: *"ALREADY
ROUND at 4 sinuses (41%, 52%, 63%, 74%): each bottom is rounder than the largest
fillet its arms take (5.86 mm, 5.77 mm, 5.63 mm, 5.16 mm), which only rests on it
— this slider cannot round them further, so the whole travel builds the same
leaf (hatched)"*. **LF36** measures the claim on the Node rebuild's lamina: a
circle of the largest fitting radius resting on the law's own bottom enters the
lamina by at most a hundredth of the minimum feature (0.01 mm). Over the sample,
184 told-round sinuses enter by 2.2e-16 (median) to 4.0e-3 mm, and 210 filleted
ones by 3.3e-2 mm and up. **One direction only, by measurement**: of the 859
broad sinuses told LIVE, 16 have a largest fillet entering by 9.6e-5 to 9.8e-3
mm and the rest run on continuously from 1.08e-2. There is no empty band on that
side. Those fillets touch a drawn row and do move the leaf, by under ten microns
— reported, not asserted against. One mutant: `a-v-is-told-already-round`.
Block 60 gains the ALREADY ROUND row (a smoke row too). `bloom-geometry.js` is
untouched by this job.

### 3.3 The sampler, before and after

`node tools/bloom-lobed-sinus-sample.mjs --n 500 --set lobedRound=0.12`, the same
500 states on each tree, S5's format:

| | d6d2ab4 (pre-S5) | S5 (`d92a0c6`) | S5b |
|---|---|---|---|
| ENTIRELY DEAD | 336 | **111** | **109** |
| ... narrow sinuses only | 29 | 31 | 29 |
| ... broad (at d6d2ab4: no fillet law yet; since: no fillet room) | 290, and 17 broad + narrow | 20 | 19 |
| ... already round | — | 60 | 61 — **now told as such** |
| no dead travel | 31 | 291 | 293 |
| dead part-way | 82 | 44 | 42 |

The base tree reproduces S5's published 111 / 31 / 20 / 60 exactly; Job 1 moves
none of it. Job 2 moves no row, so S5b's figures are Job 3's (the lobe window's
stations decide which rows a fillet touches). The already-round leaves stay
dead, because they are round, and the slider now says so.

**And a finding the sampler turned up, S5's and not fixed here:** a broad
sinus's fillet adds material, and nothing re-checks the drawn opening
afterwards. So a fillet can close a sinus's drawn opening under the 1 mm print
gap with no NO FIT told. That happens on 1 state of 500 on S5's tree (k 92,
0.991 mm) and on **3** on S5b's (k 304 / 378 / 379, 0.981 / 0.955 / 0.975 mm).
On those three, Job 3's stations turned a sinus that read narrow on S5's
stations into a broad one, and its fillet then narrows the gap. d6d2ab4, with no
fillets, has none. Eva's to rule whether the fillet's fit should require the
drawn opening to stay at 1 mm (a change to S5's fillet law, moving lobed bytes).

---

## 4. Verification

Every figure here was measured on this tree or on a worktree of its base, in a
local run, before the push. CI's own figures are in the PR.

**Byte partitions, per job.** Each one is `verify-bloom-surface-bytes`, run over
the whole live matrix in both modes, positionally under `Object.is`. Movers are
predeclared from the BASE tree's own record, never from labels. Every run covers
1301 rows × 2 modes, 1,590,016,644 export floats over 176,668,516 triangles, and
84,092,324 captured-grid values.

| job | base | predicate | movers | holders | floats moved on holders |
|---|---|---|---|---|---|
| 1, the tip neck | d92a0c6 | `tip-neck` (the base tree's own lobe layout through the restated walk) | **115 of 115 moved** | 1186 | **0** |
| 3, the arc donors | job 1's head | `arc-donors` (the base tree's emitted rows against the restated new station laws) | **192 of 192 moved** | 1109 | **0** |
| 2, already round | job 3's head | none: `bloom-geometry.js` sha256-identical, `DEFAULTS` deep-equal | 0 by construction | all | 0 by construction |

Job 2 changes a read-out's wording, one matrix row, one clause and one mutant.
No float can move, and none is claimed to.

**Export and connectedness, on every leaf row.** 196 rows, matched by
`leafall.re` (every live row that builds a leaf, block 60 included), run through
the real gates in Chromium:
- `verify-bloom-export --only`: **PASS, 196 of 196 reached the results and
  every one exports watertight.** 196 of 196 are free of within-shell
  self-intersection and 196 of 196 meet O1's baseline (10,457 s).
- `verify-bloom-connectedness --only`: **PASS, 196 of 196 are one connected
  piece** (7,772 s).

**The census.** The leaf rows were censused in Node on this tree: **196 rows, 0
within-shell pairs, 0 threw**. No new self-intersection declaration is owed.
`bloom-xfail-magnitudes` over the declared leaf rows: every declared magnitude
reproduces.

**The tip-corner censuses** (`tools/bloom-lobed-tip-corners.mjs`, EXPORT):
- LOBED: **14** tip folds over 972 corners, against S5's 16. None is new;
  2 cleared.
- SIMPLE: **0** over 243.
- COMPOUND: **0** over 243.

These are the figures in the §2.2 table, row "6 / 24 (shipped)".

**E2.** The edge-profile gate (`verify-bloom-edge-profile`, the CI invocation,
on the final tree) reads **PASS — E0-E6 clean**:
- 40 of 40 declared surface-turn rows reproduce, over 218 rows (36 exempt as
  declared self-intersectors) and 951,640 treated profiles.
- 23 entries were re-recorded, each with its before figure kept in its note.
- 5 shared-node entries came off, now under the allowance.
- One new entry: `TIP NECK: the body parts the blade as deeply`, 3.313° excess,
  mid-blade at u 0.45, and not the tip.
- No band was widened.

**The combination gate** reads exit 0, all eight clauses clean: 614 cells over
38 pairs and 5 triples, 208 under the bar, **208 declared**. Nothing was
re-recorded; no leaf-measure cell moved past its band.

**The defaults bar** (`verify-bloom-defaults-bar`): **PASS** — all eight ruled
default states hold `MIN_FEATURE_MM` on every measure the combination gate owns.

**The mutants** (`verify-bloom-apex-mutants`). There are five new:

| mutant | names | fires |
|---|---|---|
| `the-tip-keeps-its-neck` | LF35 | LF31, LF35 (LF31 because the pinned mum keeps 28 drawn) |
| `the-given-pair-is-told-and-still-cut` | LF35 | LF29, LF35 |
| `the-lobed-arc-rows-come-from-the-whole-window` | LF20 | LF11, LF20, LF26, LF27, LF29, LF30 |
| `the-leaf-arc-rows-come-from-the-whole-blade` | LF11, LF16 | LF11, LF16 |
| `a-v-is-told-already-round` | LF36 | LF36 |

Each is witnessed on the MUTATED module's own build. The table's clean pass
over all 68 rows is the gate's own control. The panel gate,
`verify-bloom-panel --negative-control`: every clean route reads `ok` (no FAIL), and **NEGATIVE CONTROL: PASS — all twenty-three routes and session 23's four clauses observed the failure** they exist to catch.

**Not run locally, and named:** the full export and connectedness matrices
(CI's), the full apex-mutant sweep beyond the new mutants and their clean
control, and the frozen-matrix replay beyond `--verify-frozen` (CI's).

---

## 5. Findings flagged during the session

1. **The brief's literal neck test does not work** — it flags every tooth, or is
   vacuous in the apex-crest case; and **re-spacing the teeth cascades** toward
   zero. The relative bar is what shipped (§1.2).
2. **The mum's 0.702 sinus cuts 67.1 %** — mid-terminal-lobe, past the bar, and
   kept, because the walk stops at the 0.779 sinus (43.3 %) below the given
   pair. It is the deepest notch left on the mum. Eva's to rule whether a
   second, non-contiguous neck should go too.
3. **A knife edge**: `LOBED: lobedAngle min` decides at 0.49980 against the 0.5
   bar.
4. **Deep serrations are left alone by the relative bar** (a body as parted as
   the tip): the shipped answer to the bulb the half-only rule made.
5. **SIMPLE's shaft is a tooth, not the floor** (no stop was owed).
6. **LF35's declared blindness**: an inflated fraction gives up too much and only
   LF31's pin sees it on the mum.
7. **S5's "tip-paid reads 7 worse" does not reproduce, with or without the
   nib-cut fix** (§2.4).
8. **BROAD SINUS regresses 17.43 -> 44.82** with the pre-S5 lobe window, and four
   SIMPLE rows sit over d6d2ab4 at the nib's own flank (§2.3).
9. **16 broad sinuses are told LIVE whose largest fillet moves the leaf by under
   ten microns** — a slider that is technically live and visibly dead (§3.2).
10. **S5's broad fillet can close a sinus's drawn opening under 1 mm** with no NO FIT
   told — 1 sampled state on S5's tree, 3 on S5b's (§3.3).
11. **CI found a stale witness that the neck walk made: S5's `a-tooth-cuts-the-nib`
   moved nothing** (apex mutant sweep 0 on `4e6a563`: *"the mutant cuts 0 mm into
   its leaflets' nibs against the clean 0"*). Its witness state, and the block-59
   row it copies (`LEAF TIP: COMPOUND, a leaflet tooth reaching the converging
   tip`, leaflet tip 0.60, tooth depth 0.3), had a tooth reaching the nib only
   because nothing gave it up. The neck walk now gives that pair up, so the row
   stopped exercising LF33's branch and the mutation had nothing to cut. The
   second durable rule, arriving from this session's own change. Swept on a
   mutated copy (leaflet tip 0.6–1.6 × depth 0.1–0.5 × 2–8 teeth): six states
   still reach the nib, and the deepest cut is at **tip 0.80, depth 0.1, 3 teeth
   (0.243 mm)**. The row and the witness are redefined to that state; the label
   carries the new numbers, and the frozen phase64 copy keeps the old one
   verbatim. Its E2 entry (2.184653 deg over the allowance) is **OFF**, not
   re-recorded: the new state reads 43.69 deg, under the 45 deg allowance.
   **I had run this session's five new mutants and the ones over the code it
   touched, but not S5's four**, which is where the miss came from.
