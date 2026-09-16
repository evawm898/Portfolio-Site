# The leaf tip shape, its terminal, and the panel's structure

A small follow-up to the leaves (#240, `docs/bloom-leaves-outcome.md`), from
Eva looking at the shipped leaves. Three things: a tip shape control for the
leaf, told honestly about its limit; the panel restructured to her verbatim
list; and the naming question that structure raises, asked rather than decided.

## 1. `leafTipShape` — the control, and what it cannot do

> "Leaf should also have a tip breadth slider or like a tip shape slider,
> because there's no way to change it. It always shows as this very thick tip
> when it should be coming to a point, or at least have the option of coming to
> a point or being rounded."

**What shipped.** `leafTipShape` (Leaves section, 0.60–3.00, step 0.05,
default **1.30**) is the petal's superellipse exponent on the LEAF's own control
— the same law over `[widest point, 1]` that `widthProfile()` owns for the petal,
a separate control so neither organ moves the other. 1.30 was the fixed constant
`LEAF_TIP_SHAPE` and is now its default, so every leaf that shipped before the
control is bit-identical by construction. `leafBladeState` reads
`Number(state.leafTipShape)` where it read the constant; `leafPlan` records the
exponent; `buildLeafInto` reports the rows it built from and the clamp record
below. The range is exported by the geometry and imported by the registry.

### The premise in the brief, checked, and it is a width question

The brief said the clamp is "4.6% of a 35 mm petal and 13.3% of Eva's 12 mm
leaf", reading `2 x TIP_HALF_MM = 1.600 mm` as a LENGTH. It is a WIDTH, and
that changes what the honest read-out has to say. Measured with the shipped
`widthProfile` on the leaf's own outline, EXPORT mode, bisection on the base
outline to 2^-60 (the same instrument the builder now reports from):

**The terminal's share of the LENGTH does not move with the length.** The
outline meets the floor where `(W/2) f(u) = 0.8 mm` — a width equation — so at
a fixed width the station is fixed and the length only scales the millimetres:

| n | share at 12 mm long | 52 mm | 120 mm | mm at 12 / 52 / 120 |
|---|---|---|---|---|
| 0.60 | 21.28% | 21.28% | 21.28% | 2.55 / 11.07 / 25.54 |
| 1.30 (default) | 2.06% | 2.06% | 2.06% | 0.25 / 1.07 / 2.47 |
| 3.00 | 0.02% | 0.02% | 0.02% | 0.00 / 0.01 / 0.02 |

(width 17 mm throughout). So *"at what leaf length does the clamp stop
dominating"* has no answer: **width is the lever, and the exponent.**

**A pointier exponent makes the stub LONGER, not sharper.** An acute
superellipse hugs the axis over the last stretch of the blade
(`(1 - s^0.6)^(1/0.6) ~ (1 - s)^1.67` near the tip), so at 0.60 the last fifth of
a 17 mm blade is the 1.6 mm stub; at 3.00 the outline comes down steeply and the
stub is 0.02% of the length. The control moves the SHOULDER; the END is 1.60 mm
across at every value, in both modes. Share of the length under the clamp, by
width and exponent (export, length-invariant so quoted once):

| width (mm) | 3 | 6 | 8 | 10 | 12 | 17 | 25 | 40 |
|---|---|---|---|---|---|---|---|---|
| terminal / width | 53.3% | 26.7% | 20.0% | 16.0% | 13.3% | 9.4% | 6.4% | 4.0% |
| n 0.60 | 49.2% | 36.4% | 31.6% | 28.2% | 25.7% | 21.3% | 17.2% | 13.2% |
| n 1.00 | 30.7% | 15.3% | 11.5% | 9.2% | 7.7% | 5.4% | 3.7% | 2.3% |
| n 1.30 | 20.8% | 8.1% | 5.5% | 4.1% | 3.3% | 2.1% | 1.2% | 0.7% |
| n 1.70 | 12.6% | 3.7% | 2.2% | 1.5% | 1.1% | 0.6% | 0.3% | 0.1% |
| n 2.00 | 8.9% | 2.1% | 1.2% | 0.7% | 0.5% | 0.3% | 0.1% | 0.0% |
| n 3.00 | 3.1% | 0.4% | 0.2% | 0.1% | 0.0% | 0.0% | 0.0% | 0.0% |

**Both modes agree exactly** (live 0.212832 / export 0.212832 at 0.60; identical
to six figures at 1.30 and 3.00), because `buildLeafInto` floors the half-width
at `TIP_HALF_MM` — the constant, not the mode floor — which is a fact the petal
does not share (its floor is `tipFloor`, 0.15 live / 0.80 export).

### The measurement Eva asked for, reported not decided

*"At what leaf length does the clamp stop dominating?"* — restated as the width
at which the stub is under a bar, since the length cannot move it:

| n | stub under 5% of the length from width | under 2% from width |
|---|---|---|
| 0.60 | never (13.2% at the 40 mm ceiling) | never |
| 1.00 | 18.5 mm | never |
| 1.30 (default) | 9 mm | 17.5 mm |
| 1.70 | 5.5 mm | 9 mm |
| 2.00 | 4 mm | 6.5 mm |
| 3.00 | 3 mm | 3.5 mm |

For comparison the shipped default PETAL (16 x 35 mm, n 1.70) reads 0.76% of its
length / 0.265 mm under the clamp in export, and nobody has called its tip thick.
The 12 mm figure in the brief, read as a WIDTH, is where the terminal is 13.3% of
the blade's width whatever the exponent — that is the thick tip Eva is looking
at, and no exponent changes it. **What would**: a wider leaf (the terminal is 4%
of a 40 mm blade), or a different terminal law — a print floor below 0.8 mm of
half-width, which is `TIP_HALF_MM`'s and `MIN_FEATURE_MM`'s to rule on, and a
declared guess nothing here has printed against (§18b). That is Eva's decision
and this session did not pre-empt it: nothing in the floors moved.

### Clamped and told

The read-out (the control's own line, and the TIP line of the LEAVES read-out)
prints the builder's record — `fmt`'s third argument is the SHOWN build, the
stamen spread's precedent, so the figure is not a second producer:

```
1.30 · pointed (the shipped leaf) · ends 1.60 mm across, the print terminal, in
both modes — the last 1.07 mm (2.1% of the length) is that stub, 9.4% of the width
```

and above 5% of the length it adds the direction of both levers:

```
0.60 · acute · ends 1.60 mm across, the print terminal, in both modes — the last
11.07 mm (21.3% of the length) is that stub, 9.4% of the width — CLAMPED: a point
below 1.60 mm cannot be printed, and a pointier shape only LENGTHENS the stub; a
WIDER leaf shortens it (the share is set by the width, never the length)
```

The six named states are the petal ruling's; 1.30 falls in the "pointed" band
and is named "pointed (the shipped leaf)" rather than "today's pointed petal".

### LF9, and the three clauses it needed

Written before the control existed and **seen red on the real export gate**
(`LF9: the plan reports no tipShape`; `no per-row base half-widths`), on the
commit before the feature:

* **(a)** the exponent the PLAN declares equals the page's read-back control;
* **(b)** the exponent READ BACK off the half-widths the blade was actually
  built from (`rowHalfBaseMm`, the `hb` handed to the cross-section) equals the
  control — the law `y^n + s^n = 1` restated in the gate over the stretch above
  the widest point and above the floor, never imported. This is the clause that
  can see a blade built from the constant while the plan reports the control
  (session 41's L7: the measured side has to be the artefact). Measured on the
  clean tree: the fit reproduces the exponent to **5.6e-16 at 0.60, 1.6e-14 at
  1.30, 3.9e-10 at 3.00** (worst row), against a 1e-6 bar;
* **(c)** the clamp record is a biconditional against those rows OVER THE TIP
  STRETCH `[uPk, 1]`: every row below the declared station above the floor,
  every row at or past it exactly on it, and the millimetres and fractions are
  that station applied to the control's own length and width. **The first cut
  swept every row and fired on the CLEAN tree at row 0** — the leaf's base
  outline reaches zero where it meets the petiole, so u = 0 sits on the same
  floor for a reason that is not the tip's. The mutant table's control pass
  found it before any mutant ran.

Two mutants in `tools/verify-bloom-apex-mutants.mjs`, which now runs the LF
family and carries a leaf row at the ACUTE end (a mutation pinning the exponent
at 1.30 reads 1.30 against 0.60 there and 1.30 against 1.30 at the default —
the witness state is part of the claim): `leaf-tip-ignores-the-control` (the
blade at the constant, the plan truthful — only (b) sees it) and
`leaf-clamp-record-lies` (the record at the widest point, the blade untouched —
only (c) sees it). Each witnessed on the MUTATED module's own builder output.
**Result: the clean tree is SILENT on every row and both mutants fire LF9** —
a subset of 2 of 39, the other 37 not run; all 39 anchors match exactly once.
And the table's control pass found the clause defect above (row 0 on the
floor) before any mutant ran, which is what the control pass is for.

`tools/verify-bloom-leaf-decoupled.mjs` re-anchored (its control neuters the
new override): 199 petal-side values x 2 modes, **0 leaf floats moved**; the
control fires (19,800 floats).

## 2. The panel — Eva's structure, verbatim

```
Arrangement
Petal
    > Petal shape (> Lobes, > Fringe)
    > Petal form
    > Petal curl
    > Petal roles (> Petal 1, Petal N, the per-petal groups)   <- see §3
Head
Center
    > Androecium (> Anther)
    > Gynoecium (> Stigma)
Stem
    > Leaves
        > Serration
Part thickness
[Reset / Get STL / Get grid]
```

**Depth was checked before anything was designed.** Stem > Leaves > Serration is
three levels. The shipped panel already had one: Center > Androecium > Anther
(session 29), after session 27 lifted the two-level bound and replaced it with
the parent-before-child precedence check, and session 29 paid the third level's
CSS as a descendant selector. So three costs nothing structural, and the gate's
own census reads the result: **6 top-level sections, 23 nested, max depth 2
enclosing `<details>`**, every section at its declared ancestor in declared
order, accordion holding across all 29 by real click.

`petal` is a container on the Center shape — no control, no predicate, hidden
iff every child is (never). The panel gate's WITNESS table gains it, witnessed
through the Petal shape child while both are shut. `leaves` takes
`parent: 'stem'`. Part thickness is last.

**Panel gate: PASS; `--negative-control`: PASS, all seventeen routes observed
their failure.** No route's coverage changed: every route names ids, not
positions, and every id is unchanged.

**0 moved, measured on the panel commit alone** (`e614a77`) with
`node tools/verify-bloom-leaf-bytes.mjs --base <worktree of 3f664be> --change
tipShape --expect 0/758`: **0 MOVERS / 758 HOLDERS, PASS**, over 759,870,288
base floats in both modes under `Object.is`, the tool printing that 0 plans on
that tree carry a tip exponent at all. A section reorder that moved a float would
have meant something reading order where it should read identity — there was
none.

## 3. Two things placed without a ruling — WAITING ON EVA

**(i) Petal roles.** Eva's list names three children under Petal and does not
mention Petal roles. It is nested as Petal's FOURTH child, because a role is an
adjustment to petals and because that keeps the top level exactly her seven; the
alternative is a top-level section her list does not contain. Its groups
therefore sit at depth three. One `parent` field moves it back out.

**(ii) The children's names.** Under "Petal", "Petal shape / Petal form / Petal
curl" read redundantly. Proposed: **Shape / Form / Curl** (and "Roles" if (i)
stands). Cost: one `label` string each in `SECTIONS`, nothing else — the panel
gate, the app and the sheets key on section IDs (`shape`, `form`, `curl`,
`roles`), which do not change, and no route names a label. The only place the
labels are read as text is the gate's "no two sections on screen share a name"
clause, which "Shape" / "Form" / "Curl" still satisfy. Not renamed: it is Eva's
word.

## 4. Verification

* **Gate rows before the feature, seen red** — commit `1c4bb68` adds the rows
  and LF9; the export gate on `LEAVES: alternate x 3 nodes` drops the row on
  LF9 there.
* **Matrix** 758 -> 762: four rows in block 33 (0.60; 3.00; 0.60 x serration
  at maximum; 3.00 on the narrowest blade), and the GATED row takes the slider
  at maximum. `bloom-smoke --check`: 86 rows over 29 blocks, **91 families
  claimed both directions**, LF9 among them.
* **`frozen/phase32` is the 758 rows at `3f664be`**, generated from main's own
  `buildMatrix()` in a worktree, its first 746 rows checked identical to
  phase31's, registered in BOTH maps, `--verify-frozen --phase32 --base` PASS.
* **The byte partition** (`--change tipShape`, predeclared from the builder's
  record — a row moves iff a leaf is built AND its plan reports an exponent
  other than the default), live matrix, 762 rows x 2 modes, 764,649,288 base
  floats, `Object.is`: **4 MOVERS / 758 HOLDERS, PASS** — 0 movers that failed
  to move, 0 holders that moved, 0 movers where anything but the leaves' own
  floats moved (with the leaves removed the two trees agree, and each leafless
  stream is a prefix of its own full one). The four movers are the four new
  rows; the GATED row at length 0 with the slider at 3.00 HOLDS, which is the
  guard proved by bytes. Both controls fire: `--control` on a holder (clause 1,
  2 findings), `--control-only` on a mover (clause 2, 8 of 8 mover x mode).
* **The self-intersection census is the verdict**: `bloom-smoke --conn`, 86
  rows over 29 blocks — the export half **PASS, 85 of 86 watertight and the one
  declared ALL MAX refusal asserted by XR1**, in 965 s; the acute tip row reads
  **0 within-shell pairs** (7,343 cross-shell, the by-design overlaps) with LF9
  green; the flood fill: FLOOD_FILL_RESULT.
* **Mutants** `--only=leaf-tip-ignores-the-control,leaf-clamp-record-lies`:
  clean tree silent, both fire LF9 (see §1).
* **Cost**: 2,548 triangles a leaf, unchanged at every exponent (the lattice
  does not vary with the outline); the shipping default is 19,040.

## 5. The image

`node tools/shot-bloom-leaf-tip.mjs <dir>` -> `docs/img/leaf-tip-shape.png`. The
SHIPPED builder at exportMode (print preview ON), serration at its default,
through the Phase A rig's own renderer: four exponents (0.60 / 1.30 default /
1.80 / 3.00) on the 12 mm blade the brief named and on the 40 mm ceiling, each
whole-leaf cell at one scale per row and every MACRO of the last 14 mm at one
magnification for the whole sheet, and a third row holding the width at 17 mm
while the length sweeps 12 / 36 / 52 / 120 mm — the stub reads 2.1% on all four.
**Same-tree control: 24 cells rendered twice, 0 differ** — an identity, not a
floor. Every caption is the builder's own clamp record.

## 6. Not done, on purpose

Nothing in `petalTipShape`, `petalTipEnd`, the cut law, the coverage arc, the
fringe, `bladeStations`, the ladder, the stem, the bore, the band, the omission
or the hub moved; `TIP_HALF_MM`, `MIN_FEATURE_MM`, `SHEET_THICKNESS_MM` and
`STEM_MIN_WALL_MM` are untouched; no cup or twist control on the leaf; no section
renamed. Nothing in the flower.
