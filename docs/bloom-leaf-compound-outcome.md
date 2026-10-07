# Leaf/stem build S3 — the compound leaf (outcome)

Eva's rulings (Oct 7) built into the generator. Branch `claude/epic-fermat-cm70ub`, base `be375b0`
(S2, #378). The sheet is `docs/img/leaf-compound.png` (`node tools/shot-bloom-leaf-compound.mjs <png>`).

**What a compound leaf is here:** one leaf. The petiole runs on into a rachis. Lateral leaflets
leave the rachis in pairs on short stalks. A terminal leaflet sits on the rachis tip. Every leaflet
is a blade of the ONE blade law S2 shipped (the bead, the cup, the tooth floor, the tip shape),
through `emitPanel`. That makes the lab's tree at fusion 0 (`tools/leaf-lab-core.mjs`, approach A)
the reference construction, ported rather than reinvented.

## 1. What shipped

- **`leafType`**, a CHOICE: SIMPLE / COMPOUND, default **SIMPLE**. SIMPLE is byte-identical over the
  whole matrix in both modes (§6).
- **Eleven leaflet controls** in a new **Leaflets** drop-down inside Leaves (before Serration). All
  are hidden AND inert under SIMPLE (§2).
- **`emitPanel` gains a per-panel `baseExposed` flag.** A leaflet's base is FREE. It closes on the
  bead exactly as the tip does: the first `RIM_TIP_ROWS` rows become the apex ring, the thickness
  taper reads distance to the base, and `rim.baseAxisMm` reports the base's own semi-axis. No
  existing panel sets the flag, so every existing panel is the expression it was.
- **Rods.** The petiole, rachis and stalks are 12-sided closed rods. Every join is embedded:
  - each stalk is rooted on the rachis axis and runs past its leaflet's base row by the beaded base
    (`RIM_TIP_ROWS · L / LEAF_BLADE_ROWS`), so it ends where the leaflet's full sheet begins;
  - the axis rod continues through the rachis tip along its end tangent into the terminal.
- **Pose.** The arch bends the RACHIS (the simple blade's uniform arc law, on the rachis). The
  leaflets lie flat in the rachis's local plane at their stations, each with its own cup.
  **There is no per-leaflet arch**, as ruled.
- **The inset reads the compound leaf's own rise** (`compoundLeafRiseMm`: the rachis arc plus the
  terminal) through `leafNodeLayout`. The first leaf node is placed so the whole compound leaf
  clears the head.
- **The leaf's root base has ONE owner now** (`leafRootBase`), shared by both builders. Before this,
  the expression stood in two places and the apex mutant table's
  `the-petiole-roots-on-the-world-axis` anchor matched twice, i.e. it was disarmed. That is §9b(i)'s
  class, found by the table's anchor pre-check.
- **Stalk lattices interleave.** At a leaflet angle of exactly 90° the two stalks of a pair leave one
  station back to back, and their mirrored frames map the half-step lattice onto itself. Both root
  rings were the same twelve points and welded the two rods into one shell. Measured:
  - before: 78 edges carrying a third face, and 40 shells → 34;
  - fix: the left side takes the other half step (the petiole's own remedy);
  - after: 0 non-manifold and 40 shells at every angle.

## 2. The controls — names, ranges, defaults, and what changed from the brief

| control | label | range | default | note |
|---|---|---|---|---|
| `leafType` | Leaf type | SIMPLE / COMPOUND | SIMPLE | the guard |
| `leafletPairs` | Leaflet pairs | 1–4 | 2 | **capped at 4 by cost (§3)** |
| `leafletFirst` | First pair at | 0.05–0.45 | 0.15 | **a FRACTION of the rachis**, not mm |
| `leafletLast` | Last pair at | 0.50–1.00 | 0.65 | a fraction; hidden at 1 pair |
| `leafletAngle` | Leaflet angle | 20–90° | 62 | to the rachis |
| `leafletLength` | Leaflet length | 4–60 mm | 20 | the TOP pair's |
| `leafletWidth` | Leaflet width | 3–40 mm | 12 | the leaf's own width range |
| `leafletBasalRatio` | Basal size ratio | 0.40–1.40 | 0.80 | basal pair against the top pair, linear between; hidden at 1 pair |
| `leafletTerminalLength` | Terminal length | 4–60 mm | 23 | |
| `leafletTerminalWidth` | Terminal width | 3–40 mm | 14 | the lab's 13.8, on the 0.5 step |
| `leafletStalk` | Lateral stalk | 0–20 mm | 2.5 | 0 = sessile on the rachis |
| `leafletTerminalStalk` | Terminal stalk | 0–30 mm | 7 | |

**Changes against the brief's list, reported as asked:**

1. **"First pair at" and "last pair at" are fractions of the rachis, not millimetres.** A station in
   mm would mean something different on every leaf length, and the lab's rose (6 and 26 mm on a
   40 mm rachis) is exactly 0.15 / 0.65.
2. **Under COMPOUND, `leafLength` is the RACHIS length.** Its read-out says so.
3. **`leafWidth` is hidden under COMPOUND** (`leafSimpleBlade`): the leaflets carry their own widths.
4. **Range ends are the leaf's own where the quantity is the same:** leaflet widths reuse
   `LEAF_WIDTH_RANGE`.
5. **All ranges are the geometry's exports and the registry imports them (Q6).** The harness checks
   the two at module load.
6. **A size the basal ratio drives under a floor** (3 mm wide, 4 mm long) is FLOORED. The read-out
   says CLAMPED on the basal-ratio control.

## 3. Cost — measured on the builder's own tally (export mode)

| state | tris | of 1,500,000 | file |
|---|---|---|---|
| one leaflet blade | 3,010 | | |
| the shipped compound defaults, one leaf | 15,366 | | |
| the same stem, 3 compound leaves | 72,988 | 4.9% | 3,564 KiB |
| the rose (4 leaves, arch 10) | 104,770 | 7.0% | 5,116 KiB |
| the same rose with SIMPLE leaves | 50,970 | 3.4% | |
| 4 pairs, one leaf | 27,630 (28,926 arched) | | |
| **worst corner: whorled x 8, 4 pairs, any arch** | **721,114** | **48.1%** | 35,211 KiB |
| the same corner, simple leaves (S2's) | 99,946 | 6.7% | |

- A simple leaf is 3,044 triangles. A compound leaf at the shipped defaults is about 5×; at four
  pairs it is about 9×.
- **Any non-zero arch subdivides the rachis**, so arch 0 is the only cheaper corner (690,010,
  46.0%). Block 54's cost-corner row is the arched one.
- **5 pairs would cost about 868,858 triangles (57.9%)**, past the brief's "report before building
  if > 50%". So the range stops at 4, and that is a cost decision put to Eva (§9).
  - The figure is EXTRAPOLATED, not built: the geometry clamps the count to its range.
  - The base is the measured 3 → 4 step at the corner, +147,744 triangles (573,370 → 721,114). A
    pair is two leaflets and two stalks a leaf, so the step is linear in the count.

## 4. The rods — derived, and the derivation collapses at this tree (an OPEN QUESTION)

**The law as ruled:** the area rule read down from the petiole, floored at the 1.2 mm wire.

- An interval of the rachis carrying `n` of the leaf's `N` leaflets asks
  `r = r_petiole · sqrt(n / N)`.
- A stalk carries one leaflet, so it asks `r_petiole · sqrt(1 / N)`.
- The built radius is `max(wire, asked)`.

**What it builds:** the bloom's petiole is not the lab's 2.68 mm rod. It is derived from the sheet
(`t/2`, export-floored at `MIN_FEATURE_MM`), which IS the 1.2 mm wire at the shipped sheet. The wire
is therefore read as the petiole's own radius. So:

- every area-rule ask is at or under the floor;
- **every rod is the petiole's radius, at every sheet**;
- `floorBinds` reads 7 of 7 rods on the shipped compound leaf.

The asks are told on the read-out:

| sheet | area-rule asks (radius, mm) | built |
|---|---|---|
| 1.2 (shipped) | 0.600 / 0.465 / 0.268, stalks 0.268 | 0.6 everywhere |
| 2.4 | 0.930 / 0.537 | 1.2 everywhere |

**The other reading is a FIXED 1.2 mm wire, independent of the sheet.** Then the area rule would act
above a 1.2 mm sheet (at 2.4 the rachis tip would be 1.2 mm against a 2.4 mm petiole). Below 1.2 the
rods would be THICKER than the petiole they hang from. That needs a ruling and is §9 question 2. The
law is one line (`compoundRodRadiusMm`) and the wire is one line in `compoundLeafPlan`.

**Slenderness**, printed on the read-out verbatim as `UNMEASURED — no coupon has been printed`:

| state | rachis + terminal stalk | rod | L/d |
|---|---|---|---|
| shipped compound (and the rose) | 40 + 7 mm | 1.2 mm | 39.2 |
| terminal stalk 30 | 40 + 30 mm | 1.2 mm | 58.3 |
| sheet 2.4 | 40 + 7 mm | 2.4 mm | 19.6 |
| sheet 0.6, EXPORT (floored) | 40 + 7 mm | 1.0 mm | 47.0 |

The lab's own figure for the rose rachis tip was L/d 11.7. Its rachis tip was only 14 mm free,
because its 2.68 mm petiole carried the rest.

## 5. The raceme's shared node pins the leaf to SIMPLE, in one place

`SHARED_NODE_LEAF_PINS = { leafType: 'SIMPLE' }`, the `PEDICEL_PINS` shape.

- The plan reports `type: 'SIMPLE'` and `typePinned: true`, and the read-out says the leaf was
  pinned.
- The registry hides the type at a shared node (`leafNodesOwn`).
- **Why not keep it compound:** the shared node's two laws are single-blade laws:
  - the seating offset clears the pedicel by the BLADE's own measured rise;
  - the floret cap shortens the blade through the petiole's law.
  
  Neither has a meaning for a rachis carrying nine leaflets. Making them compound-aware is its own
  work. A pinned SIMPLE leaf is exactly S2's shared-node leaf, byte for byte (the raceme-pin row is
  a holder in §6).

## 6. The byte partition — SIMPLE is byte-identical

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of be375b0> --movers '^COMPOUND: (?!GATED|under a raceme)'`
was run over the whole 1,210-row live matrix in both modes, in contiguous `--from/--rows` chunks
(0–1210, every row exactly once). The movers are predeclared by label and agree with the registry's
`leafCompound` on every row:

- **33 movers, every one moved.** These are the `COMPOUND:` rows that build a compound leaf.
- **1,177 holders.** These are all 1,174 base rows, plus the SIMPLE-inert row, the GATED row and the
  raceme-pin row.
- **0 of 1,450,872,792 export floats moved on the holders**, positionally under `Object.is`, over
  161,208,088 triangles.
- **0 of 83,241,760 captured-grid values moved.** This is the /plot grid's mid-surface capture.
  Leaves are not in the grid glTF (`bloom-grid-gltf.js` names no leaf), so **the /plot grid export
  bytes do not change**.
- `--control` fires both clauses (export stream and captured grid) on a holder.

## 7. The gates

**LF14–LF17, new, in both STL gates through `leafAssertions`:**

- **LF14 — the type.**
  - The two statements: the registry's `leafCompound` against the plan's type.
  - The raceme pin, as a biconditional.
  - Inertness under SIMPLE: no compound layout, no compound tree, no leaflet blades.
  - The plan's layout against the layout RESTATED from the controls (`restatedCompound`, the
    harness's own law, never `compoundLeafLayout`).
- **LF15 — the count and order.** The declared leaflet count is emitted per leaf, in the layout's
  build order. Every leaflet emits triangles. The metrics hook names every blade.
- **LF16 — placement and the free base.**
  - Each leaflet's base row stands on its stalk at the restated station.
  - Each stalk's root is on the rachis.
  - The stalk's (or the axis rod's) EMITTED end is past the base by the beaded base.
  - Every row is on the leaflet's straight line with the rachis's normal (flat, no per-leaflet arch).
  - Every leaflet base is FREE, i.e. `baseAxisMm > 0`, which only a beaded base has.
  - The rachis arc is restated from the controls (sum of sines).
- **LF17 — the rods.** Each rod's radius is MEASURED off the emitted rings and compared with the area
  rule restated from the SHEET (the petiole's own owner). The read-out's asks are held to the same
  restatement.

**LF7/LF9/LF10/LF11/LF12/LF13 hold every leaflet to the blade law**, through per-blade metrics
(`bladeOf`). LF11 has a compound branch: the axis rod's rings lie on the restated rachis arc, the
tip ring is present, and the built turn equals the asked turn.

**Module-load check.** The type is the choice SIMPLE / COMPOUND with SIMPLE the default. All eleven
ranges and defaults equal the geometry's exports. The two statements are swept over leaf × stem ×
raceme × type.

**Mutants, each witnessed on the MUTATED module's own build** (apex table: `leafRootBase` owner, all
119 anchors exactly once). Eight new ones, each firing the family it names, with the clean tree
silent on every row:

- `the-leaf-type-is-ignored` → LF14
- `the-leaflet-controls-leak-into-the-simple-leaf` → LF14
- `a-lateral-leaflet-is-not-built` → LF15
- `the-stalk-stops-short-of-the-blade` → LF16
- `the-terminal-leaves-the-rachis-tip` → LF16
- `the-leaflet-base-is-buried` → LF16
- `the-rod-floor-is-removed` → LF17
- `the-rods-are-typed` → LF17. This one needs the table's sheet-2.4 row: at the shipped sheet a
  typed 0.6 IS the derived radius, so the witness state is part of the claim.

My refactor disarmed three pre-existing mutants. All three were re-anchored and re-run, and fire as
named:

- `the-petiole-roots-on-the-world-axis` (LF2), onto `leafRootBase`;
- `leaf-clamp-record-lies` (LF9), onto `emitLeafBladeInto`;
- the edge-profile gate's `the-leaf-rim-is-not-recorded` (E0), onto the shared blade emitter.

**Rods excused BY NAME, never by a widened region.** ST9, its Node witness
(`verify-bloom-stem-channel.mjs`) and the combination gate's leaf-stem measure now read the
builder's own `rodAxes`: the petiole, rachis segments and stalks. On a simple leaf that list IS
`[petioleAxis]`, so every simple row reads the list it always did.

**Other gates:**

- **Edge profile:** reads every leaflet's rim. A compound leaf is many blades, and each free base is
  in the subject.
- **Panel:** the Leaflets section's witness is the builder's own blade and leaflet counts, 15/5 →
  27/9 at four pairs, read while the section is collapsed.
- **Defaults bar:** the compound leaf at its shipped defaults joins the table (ruling 3's standing
  rule). It reads self 1.238 mm and leaf-stem 8.717 mm, both over the bar.

**Run locally, all green:**

- **The block in the browser:**
  - export gate: all 36 block-54 rows, watertight, every validity clause, census 0 within-shell
    pairs, 0 non-manifold;
  - connectedness: all 36 rows are one piece.
- **Panel:** gate and `--negative-control` (ALL TWENTY-ONE ROUTES).
- **Grid:** gate and `--negative-control`.
- **Combination gate:** clean, 529 cells, all 184 under-bar cells declared. Its `--control` costs
  one more baseline (~10 min here) and is left to CI.
- **Defaults bar:** gate and `--control`.
- **Edge profile:** gate (E0–E6 over 187 smoke rows) and `--control` (7 of 7).
- **Leaf/stem tools:**
  - leaf-decoupled: gate and `--control`;
  - stem-channel: gate and `--control`;
  - stem-nodes and stem-cut.
- **Rim and infill tools:**
  - rim-owner, hole-rim, infill-margin, infill-conform, infill-metric: each `--negative-control`;
  - infill's own gate pass. Its negative control does not fit the 10-minute foreground limit; its
    twelve anchors were checked to match exactly once and no infill code moved.
- **The rest:**
  - wall-thickness, arc-stability, census-adjacency: each `--negative-control`;
  - surface-offstation, rim-arc and sepal-decoupled: each `--control`;
  - tube;
  - `bloom-smoke --check --negative-control`: 187 rows over 50 blocks, 158 families both ways.

## 8. Matrix, smoke, frozen phase

- **Block 54 is 36 rows** (live matrix 1,174 → 1,210):
  - the rose at its head;
  - the shipped compound defaults;
  - both ends of every leaflet control;
  - arch ±, cup 1.2, sheet 2.4 and 0.6, steep and drooping leaves, a SPHERE head (ST9);
  - the cost corner;
  - the raceme pin;
  - the two GATED arms (SIMPLE with every leaflet control at an extreme; and no leaf at all).
- **Smoke block 54 is nine rows.**
- **`frozen/phase56` is the 1,174 rows at `be375b0`.** It is registered in both maps and proved
  deep-equal to that commit's own `buildMatrix()`.
- **No workflow file is edited**, so the tag should publish under the Oct 5 rule.

## 9. Open questions for Eva (from the sheet)

1. **The compound defaults.** As shipped: 2 pairs at 0.15 / 0.65 of the rachis, 62°, the top pair
   20 × 12 mm, basal ratio 0.80, the terminal 23 × 14 mm, stalks 2.5 / 7 mm.
2. **Rod sizing.**
   - Today the wire is the petiole, so every rod is the petiole and the area rule never binds (§4).
   - Alternative (a): a FIXED 1.2 mm wire. The rule acts above a 1.2 mm sheet; below it, rods are
     thicker than the petiole.
   - Alternative (b): a thicker petiole under COMPOUND (the lab's 2.68 mm). The rule then reads down
     from it.
   - The rachis-tip slenderness is L/d 39 on today's law.
3. **The pairs cap at 4** (5 pairs ≈ 57.9% of budget at the whorled-8 corner, extrapolated from the
   measured per-pair step).
4. **Overlap at the dense ends.** At 4 pairs, and at basal ratio 1.4, neighbouring leaflets overlap.
   These are separate closed shells; the census reads 0 within-shell pairs and the export contract
   unions them. Accepted look, or narrow the reach?
5. **Small leaflets lose teeth (ruled behaviour, reported).**
   - The rose asks 12 teeth at depth 0.12 and builds 10 on every leaflet.
   - The shipped defaults ask 9 and build 8.
   - A 3 mm-wide leaflet builds none.
   - The basal pair at ratio 0.4 builds 4.

## 10. Not done (out of scope, as briefed)

The chevron and lobed leaves (S4), fused lobes, stipules, a leaf apex nib, serrate skew, a
per-leaflet arch, WHORLED n, the florets' divergence and the node swelling profile.
