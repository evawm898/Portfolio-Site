# Leaf/stem build S3c: the load-tapered rachis

Eva's ruling of Oct 8, built into the generator. Base: `main` at `9dbb8e1` (#382, docs only, on
#381's `13e8c80`). Sheet: `docs/img/leaf-rachis-taper.png`, made by
`node tools/shot-bloom-rachis-taper.mjs <out.png> --base <worktree of 9dbb8e1>`.

## 0. Why

The compound petiole was meant to stay thick up the rachis toward the terminal leaflet, tapering on
the way. #381 built what its brief said ("the rachis and stalks stay at the 1.2 mm floor"). A
45-degree cone took the petiole from 2.68 mm to the wire within about 2 mm of the stem, so the whole
leaf, every leaflet included, hung on the thinnest rod in the bloom. The brief was wrong, not the
build (Eva, Oct 8).

## 1. The law

**Every point of the petiole and the rachis is sized by the area rule from the leaflets it still
carries beyond that point:** radius = `wire × sqrt(n)`, where n counts 2 for every pair still to
come plus 1 for the terminal. At the shipped sheet the wire is 1.20 mm across.

| | rachis base | first pair (6 mm) | second pair (26 mm) | tip (40 mm) | terminal stalk |
|---|---|---|---|---|---|
| carried | 5 | 5 | 3 | 1 | 1 |
| diameter (mm) | 2.68 | 2.68 | 2.08 | 1.20 | 1.20 |

These are the shipped compound defaults (two pairs at 0.15 and 0.65 of a 40 mm rachis).

**The knots.**
- The rachis base is at the BUILT petiole.
- Each pair's station is at the load carried UP TO it. The pair leaves there, so the section just
  short of the station still carries it.
- The rachis tip is at the wire, which is the terminal stalk's own ruled radius.

### 1a. The interpolation: linear in arc length, and why

The taper is **linear in arc length between the knots**. There are two reasons.

1. **It is the thinnest continuous profile the rule allows.** The area rule, taken literally, is a
   STEP function: each stretch carries a fixed load. Any continuous profile has to stand above that
   step somewhere. A linear ramp meets the rule exactly at every station where a load leaves, and
   is above it in between. It is never under it.
2. **It is what the mesh draws.** The rod is straight frustums between rings. So with a ring at
   every station, a linear ramp IS the drawn rod: no extra rings, no chord error between the law
   and the mesh. An arched rachis is subdivided for its arc (as before), and those rings read the
   same ramp.

A monotone cubic would be C1 at the stations, but it would need extra rings just to be drawn at all.
The corners a linear ramp leaves are at the stations, where a stalk roots. On the default leaf they
measure **0.87° at the first pair, 0.93° at the second, 1.80° at the tip**.

Two alternatives were rejected by the ruling and not built: a constant thickness to the terminal,
and a linear taper floored at about 1.6 mm.

### 1b. The one owner

- **`compoundRachisRadiusMm(taper, s)`** in `bloom-geometry.js` is the rod's radius at arc length s
  from the rachis base. It is read by the builder (every axis ring), the read-out and the
  slenderness line.
- **`compoundRachisTaper(layout, wire, built)`** builds the knots.
- **`compoundRachisStretches`** gives the slenderness stretches.

The plan carries the taper as `compound.rachis.taper`.

### 1c. The one step

When the last pair sits ON the rachis tip (`leafletLast` 1), that pair and the terminal leave at one
point. The rachis carries three to the tip, and the terminal stalk carries one. There the rod steps
to the wire: a forward-facing shoulder among three stalk roots. The alternative was to run under the
rule over the last stretch, which I judged worse for print. This is the only place the profile is
not continuous. LF17(iii) asserts the step exists exactly there and nowhere else.

### 1d. The stalks

The stalks stay the 1.20 mm wire, as ruled. Each one roots ON THE RACHIS'S AXIS at its station, so it
is buried by exactly the station's own radius. This is the same construction as #380's, unchanged.
The leaflet positions do not move, and neither do the stalk rods: the byte change is confined to the
axis rod (§4).

## 2. The clamp and the cone

- **The stem-wall cap still binds at the root**, told exactly as before (`petioleRootCapMm`
  unchanged; the PETIOLE read-out line is unchanged but for the cone clause).
- **Where the cap clamps the base, the taper starts from the BUILT value.** Every knot is
  `min(area rule, built)`, so the rachis never rises above the built petiole further up.
  - Example: four pairs on the 3 mm solid stem ask 3.60 mm. The stem holds 2.98.
  - Knots: **2.98 at 0, 2.98 at 6 (asked 3.60), 2.98 at 12.7 (asked 3.17), 2.68 at 19.3, 2.08 at 26,
    1.20 at 40**.
- **Where the cap is UNDER the wire** (sheet 2.4 at 85°), the petiole stays the wire. Every knot is
  then the wire, and the rod is the wire throughout, as before.
- **The 45° cone is gone.** The ruling said it goes unless it is still needed at the root to meet
  the cap, and it is not. The cap bounds the petiole's own radius, which the petiole already
  respects; the cone only ever softened the step down to the wire, and there is no step now. The
  petiole runs straight from its rooted end to the rachis base at the built radius.
- **`thickens` keeps its mode-free decision.** Which branch is taken is the same in both modes. The
  tip step exists iff `tipStep && thickens`, which is mode-free too.

## 3. Slenderness, per stretch

L/d is read at each stretch's THINNEST end. The last stretch runs on through the terminal stalk to
the terminal's base. The read-out line carries all of it, and keeps `UNMEASURED — no coupon has been
printed` verbatim.

| state | stretches (L/d) | most slender | #381 |
|---|---|---|---|
| shipped compound defaults | 0–6 **2.2**, 6–26 **9.6**, 26–47 **17.5** | 26–47 mm at 1.20 mm, **17.5** | 39.2 (all 47 mm at the wire) |
| 4 pairs, 3 mm stem (clamped) | 2.0, 2.2, 2.5, 3.2, **17.5** | the last, 17.5 | 39.2 |
| last pair on the tip | 0–6 2.2, 6–40 **16.4**, 40–47 5.8 | 6–40 mm at 2.08 mm | 39.2 |
| sheet 2.4 × 85° (the wire throughout) | 2.5, 8.3, 8.8 | the last, 8.8 | 19.6 |

**The most slender stretch is now the last one before the terminal**, at about 17.5 against #381's
39.2. That is still the wire over 21 mm. Whether 17.5 prints is the coupon's question.

## 4. The byte partition — predeclared, closed

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 9dbb8e1> --movers-predicate compound-taper`
was run over the whole 1,222-row live matrix, in both modes. It ran in 69 foreground `--range`
chunks, merged with `--merge`, which refuses chunks that do not tile the matrix.

**The predicate is new** (`compound-taper`). A row moves iff the BASE tree's own plan chain builds
a compound leaf whose petiole THICKENS. That is where #381 drew a cone and a wire rachis.

```
MERGED 69 chunks over 1222 rows x 2 modes, predicate compound-taper
partition     : 43 of 43 predeclared movers MOVED (every one must), 1179 holders compared to the bit
export stream : 1,453,595,580 floats over 161,510,620 triangles
captured grid : 83,348,080 values over 9,600 panels (live)
PASS — 0 floats moved on the 1179 holders, positionally, under Object.is; all 43 predeclared movers moved.
```

- **43 movers:** every compound row whose petiole thickens.
- **The holders:** every SIMPLE and leafless row, and five compound-asked rows:
  - the raceme pin;
  - the three GATED rows;
  - `sheet 2.4 x leafAngle 85`, whose cap is under the wire. It was the wire throughout on #381
    and is the wire throughout here — the taper's own clamp, measured.
- **`--control` fires both clauses** (export stream and captured grid) on a holder.
- **The /plot grid export cannot move**: it names no leaf.
- **The Cup read-out fix moves no geometry**: it is a `fmt` in the registry.

**No frozen phase is owed:** no row was added or removed, and the live matrix is 1,222 rows on both
trees. **`frozen/phase57`'s bytes stop reproducing on 33 of its 1,210 rows**, which are its compound
rows that thicken (measured with the same predicate over that phase's own rows). It was already in
that class from #381. `frozen/phase56` has no compound row, so it is untouched.

## 5. Gates

### 5a. Re-derived and seen red first

Committed as `18addda`, before the geometry. They were run on 9dbb8e1's tree (the scratchpad's
`red-lf17.txt` and `red-route-ab.txt`).

| clause | red on the #381 tree | what it now asserts |
|---|---|---|
| LF17 | "the rachis base is axis ring 2 where the tapered petiole runs straight to it (ring 1) — a cone or a stray ring stands before it" on the defaults, `leafletLast max` and the 3 mm clamp row | (i) no cone, the petiole one cylinder at the built radius; (ii) every axis ring at the restated taper's radius at its OWN arc length, read off its position, and every ring past the tip the wire; (iii) continuous — no step but the declared tip step; (iv) every stalk the wire, its root disc inside the restated rachis section at its station |
| LF18 (a2) | "reports no taper record" | the plan's knots (station, radius, carried) and `tipStep` are the restated taper |
| LF18 (c) | rods excused at the wire | each `rodAxes` segment named at its own `innerR -> outerR`, equal to the restated taper at its two ends (the petiole at the built radius; the terminal stalk and the stalks at the wire) |
| route (ab), panel gate | "the COMPOUND read-out does not quote the basal pair's 2.38 mm lift" on every compound step | §6 |

**THE RESTATEMENT HAS ITS OWN OWNERS.** `restatedRachisTaper` is written from the restated
layout's pair STATIONS and the leaflet COUNT. It uses its own expressions: the load as
`2(pairs − k) + 1`, the radius as `sqrt(n wire²)`, the ramp as a weighted mean. It never imports
the geometry's owner.

**AND IT HAD A CONDITIONING DEFECT OF ITS OWN, FOUND BY THE COST-CORNER ROW.** The first version
recovered each ring's arc length by inverting the chord through `asin`. At an arch of 180° the
far end's chord is the diameter, where `asin` is ill-conditioned. It read the exact tip ring
**2.062e-8 mm** off, on `COMPOUND: whorled x 8 x 4 pairs x arch 180`. The fix is to read the angle
about the arc's centre with `atan2` (`restatedRachisArcOf`), which is well conditioned everywhere.
The bar was not widened.

### 5b. The rod exemption, per station

`rodAxisExcessMm(a, x, y, z)` in the geometry is now the ONE statement of what a rod record covers.
It is read by ST9 (both of its sites), ST9's Node witness and the combination gate's leaf-stem
measure.

- A tapered segment is a frustum from `innerR` to `outerR`, capped by its two end balls.
- A record with only `radiusMm` is exactly the uniform capsule it always was. That covers a simple
  petiole, a pedicel, or a `--root` tree that predates this.
- The region is never widened. The mutant `the-rod-exemption-is-widened` is re-anchored to double
  both ends, and LF18(c) fires on it.

### 5c. Mutants

All are in `tools/verify-bloom-apex-mutants.mjs` (128 anchors, each matching exactly once). Every
one listed was run and fired what it names, and the clean tree was silent:

| mutant | names | fired |
|---|---|---|
| `the-taper-is-stepped` (new: each stretch at its own load's radius, a shoulder at every station) | LF17 | LF17, LF18 |
| `the-taper-stops-at-the-petiole` (new: #381's shape) | LF17 | LF17, LF18 |
| `the-taper-counts-every-leaflet` (new: sized from n_total, not n_beyond) | LF17, LF18 | LF17, LF18 |
| `the-stalk-roots-at-the-wire` (new: the stalk begins a wire radius out, where a wire rachis's surface would be) | LF16, LF17 | LF16, LF17 |
| `the-rod-exemption-is-widened` (re-anchored) | LF18 | LF18 |
| `the-rods-are-typed` (re-run; now reaches the stalks) | LF17, LF18 | LF17, LF18 |
| `the-petiole-is-the-wire`, `the-petiole-clamp-is-removed`, `the-petiole-cap-is-the-outer-radius` (re-run: the law changed) | LF17, LF18 | LF17, LF18 |
| `the-leaf-type-is-ignored` (re-run) | LF14 | LF14, LF7, LF9, LF11, LF12 |
| `the-stalk-stops-short-of-the-blade`, `the-terminal-leaves-the-rachis-tip` (re-run: the axis and stalk code moved) | LF16 | LF16 |

- Each new mutant is witnessed on the MUTATED module's own emitted axis rod at the shipped sheet
  (`TAPER_WIT`), and the table gained that state as a row.
- **Retired:**
  - `the-petiole-steps-down-flat` — the cone it mutated is gone;
  - `the-rachis-thickens-with-the-petiole` — it mutated the rachis into an area-rule taper, which is
    now the law.
- **This is a subset of 12 of 128, not a sweep.**

### 5d. Run locally

| gate | result |
|---|---|
| export gate, all 48 COMPOUND / COMPOUND RETUNE rows (8 foreground chunks) | PASS 48/48: watertight, census, orientation, LF14–LF18 |
| connectedness, the same 48 rows | PASS 48/48: one piece each |
| byte partition (§4), and its `--control` | PASS; both clauses fire |
| combination gate | PASS: 529 cells, 184 under the bar, all declared, CG0–CG7 clean; no cell moved, so nothing re-recorded |
| defaults bar | PASS: the compound leaf at its defaults reads self 1.2377 mm and leaf-stem 8.0690 mm, unchanged |
| panel gate | PASS |
| panel gate `--negative-control` | PASS: ALL TWENTY-TWO ROUTES |
| stem channel (ST9's witness) and its `--control` | PASS |
| leaf decoupling | PASS |
| `bloom-smoke --check` | 192 rows over 51 blocks, 159 families both ways |
| apex mutant anchors | 128 of 128 |

## 6. The Cup read-out under COMPOUND

#382 found that the Cup control's read-out quoted the edge lift from the HIDDEN simple-leaf width
(`leafWidth`) under COMPOUND. At the defaults that happened to be right for the top lateral pair,
and the figure ignored every leaflet slider.

- **Under COMPOUND it now quotes one lift per leaflet size class**: the basal pair, the top pair and
  the terminal (a pair and the terminal at one pair). The sizes come from the geometry's
  `compoundLeafLayout`, the leaflets' one owner, including its width floor.
- **SIMPLE is byte-identical text.**

| | before (#381) | after |
|---|---|---|
| defaults | 0.35 — the margins lifted 2.97 mm at the widest point | 0.35 — the margins lifted 2.38 mm (basal pair, 13.6 mm wide) · 2.97 mm (top pair, 17.0 mm wide) · 3.32 mm (terminal, 19.0 mm wide) at each leaflet's widest point |
| leafletWidth 30 | 2.97 mm (deaf) | 4.20 (basal) · 5.25 (top) · 3.32 (terminal) |
| + terminal width 10 | 2.97 mm (deaf) | 4.20 · 5.25 · 1.75 |

**Panel route (ab)** restates each class's width from the leaflet CONTROLS, never from the read-out
or the geometry. It requires every lift, moves the leaflet and terminal widths, and checks the
SIMPLE sentence names no leaflet. It was seen red on main first, and its negative control
(the span frozen) is in the flag list. That took three edits: the header entry, the block, and the
flags and banner, which now read TWENTY-TWO.

## 7. Cost

**−24 triangles a compound leaf that thickens** (the cone's ring), and nothing else. Live and
export are identical. Measured on both trees:

| state | 9dbb8e1 | this PR | of budget |
|---|---|---|---|
| one default compound leaf | 15,390 | 15,366 | |
| default compound bloom, 1 node | 42,280 | 42,256 | 2.8% |
| default compound bloom, 3 nodes | 73,060 | 72,988 | 4.9% |
| the rose (4 leaves, arch 10) | 104,770 | 104,674 | 7.0% |
| 4 pairs on the 3 mm stem, 3 nodes | 109,660 | 109,588 | 7.3% |
| corner: whorled × 8, 4 pairs, 12 mm stem, arch 0 | 690,586 | 690,010 | 46.0% |
| corner row: whorled × 8 × 4 pairs × arch 180 | 721,690 | 721,114 | 48.1% |
| the shipping default (no stem) | 24,688 | 24,688 | 1.6% |

The STL is `84 + 50 × triangles` bytes: 2.11 MB for the default compound bloom, 36.06 MB at the
corner.

## 8. The sheet

`docs/img/leaf-rachis-taper.png`, print preview ON (export mode, the builder's normals):

- the rose leaf, #381 against now, at one camera, and a macro on the rachis base (where #381's cone
  stood);
- the section along the rachis, both trees, with the across axis ×4 (stated) and mm ticks at each
  pair station and the tip;
- the radius against arc length, the emitted rings of both trees against the area rule's step;
- the plan's knots and per-stretch L/d;
- the 4 mm and 6 mm stem joins in section, with their profile (neither cap binds at 35°);
- a macro on the second pair's stalk rooting into the tapered rachis, and the same stalks in
  section (rooted on the axis, inside the section);
- 4 pairs on the 3 mm stem: the leaf, the join in section, and the profile starting from the built
  2.98 mm;
- the Cup read-out under COMPOUND, before and after, from each tree's own `fmt`.

## 9. Open questions, and what is Eva's

1. **The taper profile, from the sheet.**
   - The linear-in-arc-length choice and its knots (the load up to each station).
   - The one tip step when a pair sits on the tip, chosen over running under the rule.
2. **Slenderness.** The last stretch is still 21 mm of 1.20 mm wire (L/d 17.5). That is the
   ruling's own consequence (the terminal stalk is the wire) and is reported, not bounded.
   UNMEASURED — no coupon has been printed.
3. **Out of scope, untouched:** S4 (chevron and lobed leaves), the rose defaults, a leaflet cup,
   stipules, the leaf apex nib, serrate skew, SIMPLE petiole sizing, the tooth floor.
