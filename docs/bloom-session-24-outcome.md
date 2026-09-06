# The Vogel disc's inner limit, session 24 — the annulus law, `rFil + rSty`, always; JS5; 11 live and 8 phase17 rows moved

Session 23 measured something its own instrument was not built to look for: **on the Vogel
disc the innermost stamen stands inside the style**, so the filament-against-style flag fires
at the ROOT on every disc setting, straight, at any count. It was ruled an OPEN PLACEMENT
QUESTION (Eva, Sep 6) rather than a defect, and parked.

This session closes it. **Nothing else was in scope.** The parametric tip — discovered and
ruled in the same conversation — is sessions 2, 3 and 4 of that plan and no part of it is in
this commit.

---

## The rulings this implements (Eva, Sep 6, carried — not re-derived)

Eight rulings came out of the discovery pass. **Only Q3 is implemented here**; the other
seven are recorded so sessions 2–4 inherit them rather than re-deriving them.

| | ruling |
|---|---|
| **Q1** | **THE ONE-EXPONENT OUTLINE LAW** for the parametric tip — `h(u) = (\|cos(nu/4)\|^s + \|sin(nu/4)\|^s)^(−1/s)`, blended by roundedness. One number sweeps star → polygon → circle → rounded n-gon and reaches all five named targets; the lobe law reaches four and makes a trefoil where a triangle was asked for. Roundedness is the ONLY producer of the circle and sharpness is inert there — the curl-bias precedent, hidden and inert. |
| **Q2** | **RODRIGUES, AND NO GUARD.** The anther migrates byte-identically under it (0 of 1,800 floats) and the trifid does not (17 live rows, 0 frozen — phase17 contains no style at all). *Eva's reason, on the record because it cuts against this project's habits:* 17 moving rows is better than a guard that gives 0 moved and buys a discontinuity the moment roundedness leaves 1. **A slider that jumps is a defect a user meets; a predeclared partition is an accounting entry.** |
| **Q3** | **THE ANNULUS FORM, ALWAYS.** *This session.* |
| **Q4** | **NO NEW FROZEN PHASE FOR A BYTE MOVE, AND THE RULE GETS WRITTEN DOWN.** A frozen tag pins ROW DEFINITIONS, not bytes. See below and the charter, Sep 6. |
| **Q5** | **FLOOR THE ELONGATION.** A floor keeps the pill byte-identical; the ellipsoid is more correct, moves the pill, and the difference between a 0.01 mm band and none is invisible. No second partition for something nobody can see. |
| **Q6** | **NO SELF-INTERSECTION INSTRUMENT.** The gate is blind to it and always will be — measured, and it goes in the instrument's own header as a stated blind spot. What is wanted instead is cheaper: **bound the parameter ranges so the outline cannot invert.** A law that cannot turn inside out needs no check that it hasn't. |
| **Q7** | **LIFT THE NESTING BOUND, AND GENERATE THE ROWS FROM ONE TABLE** — both, not either. Seven descriptors authored once and instanced twice, the `ROLE_OVERRIDES` pattern, so the two tips cannot drift. |
| **Q8** | **`size` BECOMES A REAL SLIDER,** superseding `ANTHER_DIAMETER_FACTOR`: points are unreachable on a 1.92 mm anther, so without it the sharp end of the range is decorative. |

**Sizing, approved:** four sessions — this one, then the primitive and the migration (zero new
controls, the 17 movers alone in their commit), then the anther's seven controls, then the
stigma's. Session 2 is not to be compressed: a ruled byte event gets its own commit.

---

## Re-established from source before anything was edited

- `footRing()`'s androecium descriptor: `rFil = diameter/2` where `diameter = thickness`;
  `derivedRadius = rFil √N`; `asked = derivedRadius × spread`; `limit = max(0, hub − rFil)`;
  `radius = clamped ? limit : asked`. The disc arm was `r_i = radius √((i + 0.5) / count)`.
- The gynoecium descriptor: `rSty = diameter/2` on the same `thickness`, count 1, radius 0.
- `buildBloomInto`'s filament-against-style flag: `threshold = fr.androecium.rFil +
  fr.gynoecium.rSty`, computed there from the two descriptors.
- The read-out's `stamenLine()` in `bloom.js`, and `stamenAssertions()` (JS0–JS4) in
  `tools/bloom-harness.mjs`, whose DISC arm asserted the old law's `r² = (i+0.5) R²/N`.

## The fact the record did not have

`R = rFil √N × spread` and `r_0 = R √(0.5/N)`, so **the N cancels**:

> **r₀ = rFil × spread / √2 — 0.8485 mm on every UNCLAMPED disc at ANY count**, one stamen or
> forty-five. It drops only when the hub clamp binds: 0.7526 mm at 60, **0.5322 mm at 120**.

Session 23's two figures (0.53 at 120, 0.85 at one) both reproduce exactly; what was missing
is that they are the same number at every count in between, so **the flag fires at the root at
every spread below 2.83, and always once the disc clamps**. It was never a 120-stamen problem.

---

## What was built

**`partRadius` is the ONE OWNER of the reproductive parts' radius.** A filament and a style are
each one sheet thick, so `thickness / 2` is one number, not two that agree: the androecium's
`rFil`, the gynoecium's `rSty` and the disc's `innerLimit` are all it, and
`buildBloomInto`'s flag now **READS** the limit instead of re-deriving it from the two
descriptors. Both expressions it replaces were `thickness / 2` on the same double.

**The law** — the equal-area law re-based on the annulus `[inner, R]` instead of the disc
`[0, R]`, which is "start the spiral's index past zero" with the integer rounded away:

```
innerLimit = partRadius + partRadius            // a filament radius plus a style radius
innerUsed  = disc ? min(innerLimit, radius) : null
r_i        = sqrt(innerUsed² + (i + 0.5)(radius² − innerUsed²) / count)
```

**ALWAYS, not only with a style present** (Eva): a limit that existed only with a style would
make turning the style on move every stamen, which is exactly the coupling session 22 ruled
against when it made each part independently present or absent. `innerLimit` is well-defined
without a gynoecium because both parts are one sheet thick.

**NO ROOM is told, never refused**, on the crosses-axis precedent: when the disc radius is
inside the limit the annulus has no width and every stamen stands on the rim. That corner is
already a matrix row on both trees — `STAMENS: 1 stamen on the DISC`, at R = inner = 1.20 mm
exactly — so it is covered without adding one. At the on-axis corner R is 0, `inner` with it,
and every stamen is on the axis exactly as before: **byte-identical there by construction**,
and measured (`every r === 0` is `Object.is`-true).

`innerUsed` and `noRoom` are **NULL under RING** — a claim nothing can make reads as absent.

---

## Why the annulus form and not a radius floor — the measurement

Both fixes were costed before either was written. The discriminator is not the pile-up the
brief expected; it is what each does to crowding that already exists.

| N | today r₀ | **(a) annulus** r₀ | closest pair of roots — today | **(a)** | **(b) floored** | filament d |
|---|---|---|---|---|---|---|
| 6 | 0.849 | 1.428 | 1.855 | 1.802 | 1.789 | 1.20 |
| 30 | 0.849 | 1.462 | 1.855 | 1.937 | 1.789 | 1.20 |
| 60 | 0.753 | 1.412 | 1.646 | 1.729 | 1.580 | 1.20 |
| **120** | **0.532** | **1.310** | **1.164 — ROOTS FUSE fires today** | **1.233 — clears** | **0.991 — worse** | 1.20 |

- **(b) does NOT pile up** — only 1 of 6, 1 of 30 and 3 of 120 stamens clamp onto the minimum
  circle, and at 120 those three sit 1.621 mm apart, clear of the filament. The brief's worry
  is not what is wrong with it.
- **(b) is still worse**: pushing three points outward takes the 120-disc's closest pair from
  1.164 mm (already fused) to **0.991 mm**, deeper into the flag it was meant to relieve, and
  those three abandon the equal-area law while 117 keep it.
- **(a) preserves equal area exactly** — the annulus areas spread **3.6 × 10⁻¹⁴ mm²** across
  all 120 — and it is **continuous in R**, so the spread slider never jumps. The integer-`i0`
  form Eva named works but steps: eight discontinuities over the low half of the spread range,
  moving the innermost stamen up to 0.13 mm per slider step. The annulus form is the same idea
  with the integer rounded away.
- **(a) clears an existing flag.** The 120-disc's ROOTS FUSE goes away, and with a style
  present the filament-against-style flag reads **1.310 mm against 1.200** where it read 0.532
  and fired.
- The outermost stamen moves **+0.021 mm at N = 6** and **+0.0004 mm at N = 120**, and never
  overshoots the hub clamp.

---

## JS5, and the mutant table

`stamenAssertions()` gains **JS5** in both STL gates: the inner limit and the layout law, as a
property of the emitted radii.

- The limit is **REBUILT FROM THE SLAB** (`m.hubThickness`), never read from the descriptor's
  own `rFil` or `innerLimit` — C1's discipline, so a limit derived from the wrong quantity
  fails rather than agreeing with itself.
- The annulus law is rebuilt from that and `A.radius` (already pinned by JS2) and compared
  against every emitted radius.
- **Equal area is asserted as its own property of the emitted radii**, not inferred from the
  law matching.
- The DISC/RING biconditional is asserted **in both directions**: numbers on a disc, NULL on a
  ring, and a ring's stamens stay at R even when R is inside the limit.
- With a style built, `A.innerLimit === A.rFil + Gy.rSty` and the flag's threshold equals it —
  the one-owner claim, asserted rather than commented.

**Both STL gates are blind to every one of these**, by the same construction that makes them
blind to JS1–JS4: a disc that starts on the axis exports watertight and as one piece. Recorded
in `STAMEN_SCOPE`.

**What JS5 does not cover, stated in its own header rather than assumed:** whether `rFil + rSty`
is the right distance for a *printed* part. It is where two tubes stop intersecting, which is
geometry; whether a filament that close to a style survives SLS is **UNMEASURED — no coupon has
been printed**. It is also silent on stamen-on-stamen crowding, which stays the ROOTS FUSE
flag's job and is not a gate.

### The positive control — red then green, in throwaway copies

Seven mutations, each applied to a throwaway copy of the tree (never the live one), the mutated
root served, and the **shipped** `stamenAssertions()` run against the page it produces. The
unmutated tree is green first, or nothing below means anything.

| mutant | names | fired |
|---|---|---|
| the limit is one radius, not two | JS5 | 16 — including `inner limit 0.6 is not a filament radius plus a style radius on a 1.2 mm slab` |
| the disc starts on the axis again | JS5 | 4 — the annulus law on every disc row |
| the limit reaches the ring | JS2 | 2 — `RING stamen 0 at radius 1.2, the ring is 0.36 — the inner limit must NOT apply to a ring` |
| NO ROOM never fires | JS5 | 1 — only the corner row can see it |
| the annuli are not equal-area | JS5 | 6 — the law clause and the equal-area clause together |
| the flag re-derives its threshold | JS5 | 1 — `the flag must READ the limit, never re-derive it` |
| the ring reports the disc's numbers | JS5 | 2 |

**7 of 7 caught by the clause they name — but only after the control was fixed, and that is the
finding worth keeping.** On the first run `the limit reaches the ring` fired **NOTHING**. The
mutation (`Math.max(radius, innerLimit)`) was INERT on every row tested, because every ring in
the set sat well outside the 1.20 mm limit and `Math.max` returned the ring's own radius. The
assertion was never blind; **the control could not observe the failure it was testing for.** The
row that discriminates is `1 stamen on the RING at spread 0.60`, whose ring sits at 0.36 mm —
inside the limit — and it is reachable from three shipping controls. Added, and the mutant fires.

---

## The frozen-tag rule (Q4) — the gap this session found

**A frozen tag pins ROW DEFINITIONS, not bytes.** `--verify-frozen` imports the base tree's own
`buildMatrix()` and deep-compares row order, labels and set lists against the named frozen
function. **It has never compared a byte, and it was never meant to.** So the question "does CI
go red when frozen bytes move?" has no useful answer: it cannot see them.

The freeze rule as sessions 20–23 applied it — a phase is owed when the ROW SET changes, and is
not owed when nothing moved — had no arm for a change that moves frozen bytes with the row set
unchanged. Every prior byte event either added rows (21, 22) or retired a control (20).

**Eva's ruling, Sep 6, now in the charter:** no new phase is owed for a byte move alone (that
would freeze one per session and put the suite back on the quadratic path the retention ruling
closed), and byte identity is proved per session by the retention close against a worktree of
the base commit, never by a tag. The protection that makes the chain safe is an obligation on
the outcome doc:

> **WHEN A SESSION MOVES FROZEN BYTES, ITS OUTCOME DOC MUST NAME WHICH TAG'S BYTES NO LONGER
> REPRODUCE, with the row count, even though that tag's definitions still do.**

### This session's entry

> **`frozen/phase17` — 8 of its 507 rows no longer reproduce their bytes**, and they are exactly
> the eight rows that build a Vogel disc. Its DEFINITIONS are unchanged and `--verify-frozen
> --phase17` still passes: these rows are still those rows. The cause is the inner limit, ruled
> by Eva on Sep 6. A later session re-exporting phase17 on a new tree and finding eight rows
> different from a number written down earlier should read this, not a regression.

The eight, by label: `STAMENS: 6 on the DISC`; `STAMENS: 120 on the DISC (the cushion…)`;
`STAMENS: 1 stamen on the DISC`; `STAMENS: 120 DISC × Head rise 0.5`; `STAMENS: 120 DISC × Head
rise 1`; `STAMENS: 120 DISC × the mum`; `STAMENS: 120 DISC × CONTINUOUS × 3 turns`; `STAMENS:
120 DISC × sheet 2.40`.

## Is a new frozen phase owed? NO

No row is added — the limit is derived, not a control — so the row set is the same 528 live and
507 phase17. **phase17 stays the newest baseline; nothing is frozen and no tag is owed.**

---

## Verification

- **Smoke subset, export + the flood fill** (`node tools/bloom-smoke.mjs --conn`): clean.
  **39/39 rows watertight** (boundary 0), 39/39 identical live and export triangle counts,
  39/39 no degenerate triangles, **39/39 a single connected body**, every assertion family
  green (J1–J9, Z1–Z9, C1–C3, **JS0–JS5**, JG0–JG4, R1–R5); 4 rows CROWDED (a flag), 6 SPHERE
  rows a labelled coverage skip. Export 266 s, connectedness 234 s on this box, timing
  anecdotal. **NOT a matrix pass** — the full 528 rows on both gates in CI is the merge
  criterion. `--conn` was run rather than skipped because the change moves every disc stamen's
  root, even though it adds no geometry mode.
- **JS5 positive control:** the shipped tree GREEN, then **7 of 7 mutants caught by the clause
  they name** (table above), each in a throwaway copy of the tree.
- **Panel gate:** PASS. The read-out gained a clause, so it was run rather than assumed; it
  also found the false positive recorded below, which is not about this change.
- **Byte diff — `frozen/phase17`, 507 rows, a plain capture per tree, `--compare`**
  (`/tmp/base-main` at a worktree of `b847f81` against this tree, one box, one run):
  **499/507 byte-identical; 8 MOVED**, and the eight are exactly the eight predeclared by label
  above. **Every mover keeps its byte LENGTH and its triangle count to the byte** — e.g.
  `STAMENS: 6 on the DISC: 672084B/13440t 7a64896cf869 → 672084B/13440t 897d490f4d96` — which
  is the claim "the limit moves stamens and adds none", measured rather than argued. The tool
  exits non-zero on any mover by design (a byte move is a stop-and-report, not a migration);
  these eight are ruled and predeclared.
- **Byte diff — the live matrix, 528 rows, both trees** (the same plain-capture-per-tree shape,
  same box, same run): **517/528 byte-identical; 11 MOVED**, exactly the eleven predeclared —
  phase17's eight plus the three block-24 rows that pair a style with a disc
  (`GYNOECIUM: style × 120 on the DISC`, `… × Head rise 0.5`, `… × CONTINUOUS × 3 turns × 120
  DISC`). Every mover again keeps its byte length and triangle count. **The DEFAULT row is
  bit-identical** — it builds no centre at all. The base capture reads `b847f81+dirty` (the
  gitignored `node_modules` symlink in the worktree, read by no geometry); the head reads
  `79096f8` clean.
- **The predeclared untouched manifest:** **376 of 376 held** (`sha1sum -c`) on the final tree;
  the working tree carried exactly the ten predeclared movers and nothing else.

## What this session predeclared it would not touch

A sha1 manifest of **376 files** taken from the working tree at `b847f81` before any edit —
every tracked file except the ten predeclared MOVERS: `bloom-geometry.js`, `bloom.js`,
`tools/bloom-harness.mjs`, `tools/verify-bloom-export.mjs`,
`tools/verify-bloom-connectedness.mjs`, `tools/bloom-smoke.mjs`,
`tools/shot-bloom-inner-limit.mjs` (new), `docs/bloom-session-24-outcome.md` (new),
`docs/bloom-charter.md`, `CLAUDE.md`. Re-verified by `sha1sum -c` on the FINAL tree.

## The sheet — `node tools/shot-bloom-inner-limit.mjs <dir> [base-tree]`

Six pairs, BEFORE from a git worktree of `b847f81` and AFTER from this tree, each pair sharing
one camera sized from the BEFORE cell, every cell the print preview with chrome hidden and
auto-rotate off through the asserted `stillFrame()`:

1. **6 on the DISC** — the sparse case; the hole is 14.3% of the disc's area.
2. **30 on the DISC** — the middle.
3. **120 on the DISC** — the ROOTS-FUSE row. The flag fires today at 1.164 mm and must clear.
4. **120 on the DISC with a style** — the defect the session exists for.
5. **1 stamen on the DISC** — the NO-ROOM corner, told and not refused.
6. **6 on the RING** — the CONTROL. A sheet of only movers cannot show that something held.

Three views per cell, and **the headline is the hub FROM ABOVE**, because the inner limit is a
hole in a disc and a hole in a disc is invisible in profile.

**The sheet asserts, from the two trees' own numbers** rather than captioning them: the triangle
count and hub radius are identical on every pair (the limit moves stamens, adds none, and does
not reach the ring); the inner-limit clause is absent on the base tree and present here for
every disc and on neither for the ring; ROOTS FUSE and FILAMENT AGAINST STYLE both flip; NO ROOM
appears on the corner row.

**What the sheet cannot show, stated:** its RING control sits at 2.94 mm, well outside the
limit, so a defect that applied the limit to a ring would be invisible in the picture. That case
is JS5's and the mutant table's, on a ring at 0.36 mm.

## A FALSE POSITIVE IN A SHIPPED GATE, found by this session and WORKED AROUND, not fixed

**An apostrophe inside a template literal, anywhere in a scanned bloom file, makes the panel
gate report retired ids that are not there.** It cost this session a diagnosis and it will cost
the next one unless it is written down.

Route (n)(iv) of `tools/verify-bloom-panel.mjs` scans executable bloom source for retired
control ids, exempting string literals (the frozen matrices name those ids as row data). It
strips block comments, line comments, template literals, then `'…'`, then `"…"`, with regexes.
**The template-literal regex is already phase-shifted in `bloom-harness.mjs` on `main`** — it
matches the GAPS between literals rather than the literals — and in that state an apostrophe
written inside a template literal survives to the `'…'` pass, where it re-pairs the quotes of
the frozen matrices' own label strings and exposes `centerSize`, `centerRise`, `centerDish`
inside them.

Measured, on both trees: the base at `b847f81` scans **0 hits over 34 files**; adding nine
possessive apostrophes inside nine new `bad.push(\`…\`)` messages took this tree to **48 hits**,
every one of them a frozen-matrix label from 2020 lines away, reported at a line number that is
an offset into the STRIPPED source and therefore points nowhere. Removing the nine possessives
(`the owner's inner limit` → `the inner limit the owner declares`) took it back to **0**. The
em dash in the same literals is harmless and was kept; the apostrophes alone were the trigger.

**Nothing about the code under test was wrong.** This is a parser too weak for the source it
scans, producing a confident, precise-looking, entirely false report. It is not fixed here:
fixing it means editing a gate outside this session's ruled scope, and gates are exactly where
an unscoped change is most dangerous. **It is question 1 for Eva at the close.**

## Loose threads

- **The panel gate's source scanner** — above. A real fix is a tokeniser rather than five
  regexes, or scanning only for the ids as *bare identifiers* (`\bid\b` not preceded by a quote
  on the same line), which would survive any string-stripping failure.
- **The parametric tip** is sessions 2–4, with all eight rulings above already made. Session 2
  is the primitive and the migration alone: zero new controls, 17 movers.
- **B2b** (the crowding-raster extensions, anther-against-blade, the independent stamen splay)
  stays parked, unchanged since session 21.
- **The clear-disc question the limit does NOT answer:** a stamen may still stand in a petal-root
  annulus, which remains a flag with its own number on the STAMENS line. The inner limit is about
  the style, not the petals.
