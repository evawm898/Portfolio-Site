# The NU coupling — fixed

*Sep 29, 2026, on `a4dc836` (#303). Eva's ruling on #303's finding: fix it by pinning each of
the three readers to its own value; add a witness row that reaches the leaf case. Every number
below comes out of a command named beside it.*

## 1. The defect, as #303 measured it

`NU`, the blade row count, is set per petal by `petalSurface` (`NU = bladeRowsFor(ps.petalTipShape)`)
and never reset. Three builders run AFTER the head petals in `buildBloomInto` and read it:

| reader | what it read | consequence on `a4dc836` |
|---|---|---|
| `buildLeafInto` — `rowCapacity: NU`, the blade's `for (i <= NU)`, `widthProfileBlendIsDown` | the last head petal's `NU` | 2,548 → **5,012** triangles a leaf at `petalTipShape` ≥ 2.70; `leafTipShape` moved nothing |
| `rodInto` → `spineLaw` (`N = NU * SPINE_SUBSTEPS`) | the same | stamen/style integrator moved by ≤ 2.1e-12 mm |
| `sepalAngleLimit` → `seamLatticeStep` (first iteration) | the same | latent — the drawn limit unchanged |

No row of the 970-row matrix paired leaves with a ramped tip, so no gate could see the leaf half.

## 2. The fix — three readers pinned, `NU` not reset

- **The leaf** reads `LEAF_BLADE_ROWS` (= `NU_BASE`, 56) for its rows, its lobe capacity and its
  `widthProfileBlendIsDown` telemetry. A leaf has no apex ramp; whether it should get one is the
  open leaf-apex-nib item and is deliberately not decided here. Its shape is exactly what it was
  under any head that did not ramp.
- **The rod** calls `spineLaw({ …, rows: ROD_SPINE_ROWS })`. `spineLaw` gained a `rows` argument
  defaulting to `NU`, so every petal-side caller evaluates the expression it did.
- **The sepal scan** passes `bladeRowsFor(sepalBladeState(state, lo).petalTipShape)` — the row count
  the sepal ring's own trial builds set — to `seamLatticeStep`. So the scan's first iteration now
  agrees with every later one. `HELD_ROWS`, `SEAM_MAX_STEP`, `seamLatticeStepRaw` and
  `seamLatticeStep` take an optional `nu` defaulting to `NU`; `HELD_ROWS` stays the one owner of
  `floor(ROOT_BLEND_END * nu)`.
- **`NU` is not reset globally**, per the ruling: a reset changes WHEN `NU` is valid for every
  other reader (the harness's Node-side ladder calls, #303 §4e, among them).
- `tools/bloom-sepal-contact.mjs` re-implements the scan's seam step, so it passes the same row
  count; `tools/verify-bloom-apex-mutants.mjs`'s `ladder-eats-the-base` anchor follows `HELD_ROWS`'s
  new signature.

Measured in Node (`DEFAULTS + stemLength 60 + leafLength 40 + leafNodes 3`, live = export):

| `petalTipShape` | `a4dc836` | fixed |
|---|---|---|
| 1.70 | 34,440 | 34,440 |
| 2.35 | 38,276 | 37,352 |
| 2.70 | 65,128 | 57,736 |
| 3.00 | 65,128 | 57,736 |

The differences are exactly 3 × 308 and 3 × 2,464 — three leaves back at 2,548 each. The base
column reproduces #303 §4a to the triangle.

## 3. The witness — block 42 and LF10

**Block 42, one row: `LEAVES: x petalTipShape 3.00 (the petals ramp their rows; the leaf keeps its own)`**
(`stemLength 70, stemDiameter 6, leafLength 52, leafWidth 17, leafNodes 3, petalTipShape 3`). It is
the only kind of state where a leaf reading the petals' `NU` and a leaf reading its own 56 disagree,
which is why no earlier leaf row could see the defect. It is a new final block rather than a row in
block 33 because the byte tools pair rows by index and require additions to be appended.

**LF10** (in `leafAssertions`, both STL gates): each built leaf's blade row count — read off the
builder's own per-row record `rowHalfBaseMm`, one entry per emitted row — must equal `BLADE_ROWS`,
the geometry's STATIC module-load row count. Its reference has a different owner from both `NU`
and `LEAF_BLADE_ROWS` (the fourth durable rule). The fixed tree reads 56 on every leaf; the export
gate on the witness row, clean tree:

```
ok   LEAVES: x petalTipShape 3.00 (…) tris(live)= 57736 tris(export)= 57736 boundary=0 degenerate=0 nonManifold=0 (unrated) shells=16 (unrated) 2819 KiB
export gate: PASS — 1 of 1 attempted configs reached the results and every one exports watertight.
```

**Smoke**: yes, it belongs in the subset — LF10 must be claimed by a smoke row's path (the census's
biconditional), and this is the only row that can make it fire. Smoke block 42 carries it;
`bloom-smoke --check` reads 128 rows over **38** blocks (37 before) and 121 of 121 families claimed.

## 4. The must-fail

A copy of the tree with the leaf un-pinned (`const nu = LEAF_BLADE_ROWS;` → `const nu = NU;`; the
plant refuses unless its anchor matches exactly once — it matched once). **Not vacuous**: the planted
copy builds the Node table above at 65,128, the pre-fix figure. The real export gate on the witness
row:

```
ROWS: 1 attempted · 0 reached the results · 0 watertight (boundary = 0) · 1 DROPPED by a validity assertion — NOT a pass; 8s
export gate: HARNESS INVALID — 2 validity assertion(s) failed. No result above is trustworthy.
  - LEAVES: x petalTipShape 3.00 (the petals ramp their rows; the leaf keeps its own): LF10: leaf 0's blade was built on 112 rows where a leaf's own lattice is 56 (petalTipShape 3, leafTipShape 1.3) — the leaf is reading a row count some other part left behind
  - row census: 1 rows attempted but 0 reached the results — dropped: LEAVES: x petalTipShape 3.00 (the petals ramp their rows; the leaf keeps its own)
export gate: FAILED — 1 row(s) dropped of 1 attempted, 2 validity assertion(s), 0 not watertight, 0 with degenerate triangles, 0 whose triangle count moved between modes. Nothing above is a pass.
```

LF10 is the only family that fired (the second assertion is #220's row census naming the drop).

It is also a standing mutant: `the-leaf-reads-the-petals-nu` in `tools/verify-bloom-apex-mutants.mjs`,
on a new table row (a leaf under petals at 3.00), witnessed on the MUTATED module (a ramped bloom
built first, then one leaf: 112 rows on the mutant, 56 clean):

```
ANCHORS: 79 mutants, 79 matching their find-string exactly once
  ladder-eats-the-base: …  names A7 · fired A7, L3, L5, L6   ok
  the-leaf-reads-the-petals-nu: …  names LF10 · fired LF10   ok
APEX MUTANT TABLE (SUBSET of 2/79) … THIS IS NOT A SWEEP — 77 mutants were not run.
```

## 5. The instrument — `verify-bloom-build-order.mjs --coupling`

On the fixed tree, five foreground chunks with `--resume`, both modes:

```
coupling: 971 of rows 0..970 compared, shipped against decoupled, both modes; 0 carry the coupling
```

**1 of 970 on `a4dc836` (#303 §4d) → 0 of 971.** The decoupled copy pins the same readers to the
same values, so 0 is expected by construction on the fixed tree; what makes the fix a measured claim
is the byte partition (§6) and the must-fail (§4).

## 6. The byte partition

**Predeclared from the BASE tree's own builder record** (`verify-bloom-seam-bytes.mjs --change nu`):
a row moves iff the last head petal's `bladeLadder.rows` is not `BLADE_ROWS` AND the build carries a
leaf, a stamen or a style. The fix writes no part of that record. The sepal scan is deliberately
left OUT of the predicate — #303 measured it latent — so a sepal row that moved would fail the run
as an undeclared mover rather than be absorbed.

```
$ node tools/verify-bloom-seam-bytes.mjs --base <worktree of a4dc836> --change nu --matrix live --added 1 --control --control-mode
  1 row(s) ADDED on the head, declared — they are appended and have no counterpart, so they are outside the partition:
      + LEAVES: x petalTipShape 3.00 (the petals ramp their rows; the leaf keeps its own)
  control: "DEFAULT (the shipping configuration)" [export] perturbed by 1e-9 is reported MOVED — the held class can fail.
  control-mode: "DEFAULT (the shipping configuration)" reclassified live as moved against export held — the mode clause must report it.
  the mode clause fired on the control, exactly once.
  the MOVER SET is exactly as the base tree's builder record predeclares it, in both directions: 1 rows where the last head petal's row count is ramped and a leaf, stamen or style reads it there, and those are the 1 rows whose bytes moved.

live matrix, change "nu": 970 comparable rows (+1 ADDED on the head, outside the partition), both modes, 1,279,751,076 floats compared positionally under Object.is
  MOVED 1   HELD 969   REDEFINED 0   (per row, export; live agrees on every row or this run has already failed)
  triangle counts unchanged on every row but the 0 declared ()
  the FOOT is identical on every row: 6,977,880 captured foot values (mid-surface point, normal, half-width, thickness, u) under Object.is
  first movers: "TIP SHAPE: x the whole centre (stamens and a style under a r"

PASS (control: the planted mode finding was reported and is not counted against the run)
```

**Exactly #303's prediction: one row moves** — `TIP SHAPE: x the whole centre (stamens and a style
under a round tip)`, the rod integrator's ulp-scale half (#303 measured 2.096e-12 mm, 92,760 of
742,896 floats, both modes) — **and 969 hold to the bit**, the shipping default among them (the
default petals do not ramp). No sepal row moved. Its declared census entry (272 pairs / 0.0796 mm)
is a property of the petals' ramped tip and the stamens, not of a picometre in the rod, and is
re-measured by X1 in CI on every run. **Frozen bytes** — the charter's session-24 obligation, answered through the SAME predicate the
full comparison above just proved exact in both directions (`--change nu --frozen-sweep`, 1,184
distinct states built):

```
  frozen/phase2 .. phase23     0 rows move
  frozen/phase24     1 of  624 rows move
  frozen/phase25     2 of  666 rows move   (and phase26, 27, 28: 2 of 674 / 680 / 699)
  frozen/phase29 .. phase46    1 row each (e.g. phase46: 1 of 970)
  23 of 45 baselines carry at least one row whose bytes stop reproducing; 27 of 27340 frozen rows in total.
```

The rows, named by evaluating the predicate over those matrices: **`TIP SHAPE: x the whole centre`
in every tag from phase24 on** (the row entered the matrix there), plus **`ALL MAX` in phase25–28**,
whose frozen definitions carry stamens under a ramped tip that this geometry does not budget-hold.
Every one is the rod's integrator (the leaf half cannot appear: no frozen matrix pairs leaves with a
ramped tip). Their DEFINITIONS are untouched; no phase is owed for the byte move, only this naming.

## 7. The frozen phase

The row set changed (block 42 adds one row, 970 → 971), so a phase is owed. **`frozen/phase46` is
the 970 rows at `a4dc836`**, generated from that commit's own `buildMatrix()` and registered in BOTH
`FROZEN_MATRICES` and `FROZEN_BASE_COMMITS`:

```
$ node tools/diff-bloom-bytes.mjs --verify-frozen --phase46 --base <worktree of a4dc836>
PASS — phase46Matrix() is deep-equal to the base commit's own buildMatrix(), row for row.
```

No workflow file is edited by this change, so no `TAG_PUSH_XFAIL` entry is declared in advance.

## 8. What this does not do

- No apex ramp for the leaf (the open leaf-apex-nib item).
- None of #303's 28 prose corrections beyond the two `CLAUDE.md` sentences this fix makes false
  ("2,548 triangles a leaf, FIXED" and "a recorded defect, NOT fixed").
- The sepal scan's half has no row or clause of its own: #303 measured it latent and the partition
  (§6) confirms no sepal row moves.
- The order passes were not re-run in full: the fix adds no module state and removes three reads of
  the one variable they cover.
