# Bloom session 38 — the foot-to-blade seam clearance

**Status: pushed, CI running, waiting on Eva's ruling. Nothing is merged.**

---

## 1. What the defect actually is

The brief called it "the root blend" and expected a foot collapsing across the
blend on short, multi-layer petals. **It is not that, and the diagnosis in the
brief is superseded.** It is an **offset-surface fold at the foot-to-blade
kink**, and the evidence is decisive rather than suggestive:

* every site sits **on the top skin, at the ring radius, at dz = t/2**;
* **both triangles of every pair are seam quads** — the foot's own top-skin
  quad and the blade's first;
* **zero pairs at zero tilt**, at any layer count;
* and a **single layer** at `petalTilt` 75, `petalLength` 20, `sheetThickness`
  2.4 folds **376 pairs with no layers involved at all**.

Layer count was a proxy for two things that really do drive it — shorter petals
(a smaller first-station spacing in mm) and stacked tilt (a sharper kink).

Read off the builder's own captured grid at that state, the top skin's radius
goes **12.5133 mm at the foot's ring row → 11.4464 mm at the first blade row**,
a **−1.0667 mm** step backward, and then advances +0.092 mm per row. The blade's
top skin has plunged back inside the foot's own slab.

### The three candidates in the brief are disqualified, and here is why

1. **and 3. Widen the foot with the petal.** The foot width already scales with
   the petal by the shipped law (`footRing()` owns it), so both candidates
   describe what exists. Moving them either way changes the census by **at most
   8 pairs**.
2. **Spread a width change along the blend.** The fold is not in the blend, it
   is *at the kink*, so this spreads a correction across a region the defect
   does not live in. It measured **worse at every value tried**, and it moves
   the shipping default's bytes, because `ROOT_BLEND_END` sets the ladder's
   held-row count.

The brief was written from a mechanism that had been inferred rather than
measured. Recorded here so the next reader does not re-derive the dead branch.

---

## 2. The derivation — `s₁ > (t/2)·sin θ`

Nothing here is dialled.

Work in the petal's own radial cross-section with the ring row at the origin,
the foot running along `+r`, the blade leaving at the seam turn `θ`, and
`a = t/2`. Write `c = cos θ`, `s = sin θ`. The first blade row's centre is
`s₁·(c, s)`; its two skin points are

```
T = ( s₁c − a·s ,  s₁s + a·c )      (top)
B = ( s₁c + a·s ,  s₁s − a·c )      (bottom)
```

while the foot's own skins sit at `(0, ±a)` and run inward. The seam panel's
**rim** — the closing face at `v = ±1` — is the quad through the foot's two skin
points and `T`, `B`, and it is what carries the panel across the foot's top
plane `z = a`. That plane cuts the rim on the edge `T→B` at

```
λ = (z_T − a) / (z_T − z_B) = (s₁s + a·c − a) / (2a·c)
```

and the crossing lands at `r = r_T + λ(r_B − r_T)`. Requiring that crossing to
fall **outside** the foot — `r ≥ 0`, i.e. at or beyond the ring — and clearing
the denominator:

```
s₁c − a·s + 2a·s·(s₁s + a·c − a)/(2a·c)  ≥ 0
s₁c² − a·s·c + s₁s² + a·s·c − a·s        ≥ 0
s₁(c² + s²)                              ≥ a·s

                s₁  >  (t/2)·sin θ
```

### The bare bound is necessary and not sufficient, and the gap is `1 + cos θ`

The naive offset-corner bound — put the first row's own skin point above the
foot's top plane — is `a·tan(θ/2)`. That is the bound the brief expected, and
**at exactly that value the result is worse than main**: the tilt-75 state goes
**376 → 632 pairs**, with **every site at z = t/2 exactly**, because the row
lands *coplanar* with the foot's top skin rather than clear of it.

The ratio between the two is

```
sin θ / tan(θ/2)  =  1 + cos θ
```

which is **2 at a shallow kink, 1.906 at the shipping tilt of 25°, and 1 at a
right angle**. That is the answer to *"if the derivation lands near 2.0, say so
and show the working"*: it lands at 2 in the limit, and it is a **function of
the turn angle**, not a constant. It is the cost of the mesh drawing the seam as
a flat **chord** from the foot's offset ring to the blade's offset first row
where the bound assumes the corner is mitred.

### Measured, which is what makes it a derivation and not a fit

Sweeping a constant `k` in front of `a·sin θ` and reading the within-shell
census:

| k | tilt 45 | tilt 60 | tilt 75 | sheet 1.2 | 3 layers | 6 layers |
|---|---|---|---|---|---|---|
| 0.90  | 72 | 72 | 56 | 56 | 56 | 704 |
| 0.99  | 56 | 56 | 56 | 56 | 56 | 248 |
| **1.0000** | **64** | **64** | **64** | **64** | **64** | 272 |
| **1.0005** | **0** | **0** | **0** | **0** | **0** | **0** |
| 1.05  | 0 | 0 | 0 | 0 | 0 | 0 |

Every state flips to **exactly zero between 1.0000 and 1.0005**, across three
turn angles, two sheet thicknesses and two layer counts. At exactly 1.0000 all
of them read the **same 64 pairs**, which is the signature of the equality
*touching* rather than of geometry. The constant is 1 and it is derived.

### Strictness costs no epsilon

The inequality is strict, and a margin dialled until the count reached zero
would have been precisely the invented-constant defect this project keeps
finding — carrying a printability guarantee, no less. So the first blade row is
not placed **at** the clearance: it is the **first station of the row lattice
strictly beyond it**,

```
m = max(1, floor(uSeam·NU) + 1),      first blade row = m / NU
```

The margin is *one row* — a length this file already owns.

---

## 3. Redistribute, never pile

The held block keeps the uniform **row lattice** exactly and simply **starts
later**: the held stations are `(m + i)/NU` for `i = 0 … held−1`, still `held`
consecutive lattice steps, still one row apart. Nothing can stack against a
floor, because nothing is being clamped to it.

`m = 1` whenever the floor does not bind, and the code then takes the same
`uniform.slice(0, held)` it always took — so the shipping default is
bit-identical **by construction and by branch**, not by an IEEE-754 argument.

The ladder above the block is untouched either way: it runs over `[u₀, 1]` from
wherever the block ends.

---

## 4. A7 and `CURL_START_MIN`, re-derived

### A7

It read *"every station below `ROOT_BLEND_END` is the uniform one, exactly"* —
the same claim, while the block always started at row 1. It now states the
identity on the **lattice** rather than on its first member: the held stations
are `(seamStep + i)/rows` for the integer offset **the builder declares**. Still
a bit identity; still bit-identical to the old expression wherever `seamStep` is
1. **Nothing is relaxed — this pins `seamStep` as well, which the old form could
not**, and A7 gained three clauses it did not have:

* the first blade row stands **strictly beyond** the declared clearance (the
  print-safety claim itself, asserted on the emitted station);
* the declared clearance **is the law's own value**, rebuilt in the gate from
  the two other owners;
* the clearance's **half-thickness is `max(sheetThickness, MIN_FEATURE_MM)/2`**,
  reconstructed from the registry state — the mode-independence claim, asserted
  in the live gate.

**A7 now runs per ring.** The clearance is a function of the ring's own
effective tilt, and on a layered bloom the outer whorl typically does not bind
while the inner ones do — measured, three layers at the defaults turn 25°, 37°
and 49° and only the innermost binds; six layers turn 25 … 85° with steps
1/1/2/3/4/5. Reading layer 0 alone would never have entered the branch.
`petalRingBladeLadder` and `petalRingProfileU` are the new per-ring telemetry.

**A8 gave up one term, and it was vacuous before.** Its gap measure opened with
`blade[0]`, which was *always* exactly `1/NU` and so could never be the widest
gap. It is no longer vacuous, and it is no longer A8's: the offset from the seam
to the first row is placed by the clearance law and pinned by A7, where A8's
question is whether the ladder's own **redistribution** starved the wave.

### `CURL_START_MIN`

The ladder's header could say *"the first blade row is still at 1/NU, because it
is one of the held ones"*, and that is what made Eva's Sep 4 floor mean **"the
root chord is straight wherever start is engaged"** — the premise J8's stronger
normal clause rests on. The first blade row is now at `m/NU`.

Re-derived, not relaxed: the **control's** declared bound is untouched (the
registry still imports `1/NU`; a bound that moved with the tilt would be one
control reaching into another's range — the violation `NU = 56` exists to
avoid), while the floor the **law** applies becomes
`max(start, CURL_START_MIN, the first blade row)`.

**Relaxing instead would have made J8's clause SKIP those rows rather than fail
them** — coverage lost silently. `spineInputsFor` now reconstructs the floor
from the **ladder's** telemetry, so C3 compares two owners rather than one field
against itself.

*Found on the way:* the matrix row named **`CURL: start floored at one blade row
(0.02 → 0.036)`** has been stale since session 34. `0.036` is `1/28`; at
`NU = 56` the floor is `0.01786`, so `0.02` was no longer floored at all and the
row stopped testing what it names. Under the seam floor it is floored again
wherever the clearance binds.

---

## 5. Mode independence

The clearance reads `max(sheetThickness, MIN_FEATURE_MM)` — the **export**
thickness — in **both** modes, exactly as `ladderHalfAt` does. Row positions are
topology and the export floor may not move them. This is session 32's
mode-dependence defect refusing to ship a third time; the scratch patch that
read the live thickness had ring 2's first station differing live from export on
a 0.6 mm sheet.

`seamHalfThicknessMm()` is the **one owner** of that half-thickness — both the
clearance and the reported `seamHalfMm` call it — so the live gate's A7 clause
and the clearance itself cannot drift apart, and a single-line mutation of it is
visible to the gate.

Two independent instruments carry the claim: A7's thickness clause (live gate,
per ring) and `verify-bloom-seam-bytes.mjs`'s **MODE-DEPENDENT** class, which
fails if any row's moved/held verdict differs between the modes.

---

## 6. The two residual classes are not this defect

Retagged in `SELF_INTERSECTION_XFAIL` to their real class rather than left filed
under the root blend:

* **EFFECTIVE TILT PAST 90°.** The algebra in §2 multiplies by `cos θ`, so past
  a right angle the inequality **reverses** and no spacing satisfies it. That is
  the geometry telling the truth: the blade's own **mid-surface** lies back over
  its foot, which is a mid-surface overlap no offset spacing can fix. The
  clearance is held at its right-angle value there rather than falling away with
  `sin`, and those rows stay declared.
* **THE DOME'S OUTER RING AT A HEMISPHERE RIM**, whose pairs sit on ring 0 and
  are unchanged by the clearance.

**Whether the tilt control should reach past 90° at all is a separate ruling for
Eva.** It is independent, it blocks nothing, and it only scopes the claim.

---

## 7. What it did to the census — the whole matrix, both trees

Driven in Node through the same census the export gate calls, export mode, on
the builder's own doubles, every capability row with its capability applied,
**624 rows, no errors on either tree**.

**The sweep is calibrated, which is what makes the rest of this section
readable.** Run against a worktree of `main`, it reproduced session 36's
recorded count on **222 declared rows exactly** — zero disagreements, and zero
undeclared rows reading non-zero. So the Node state mapping is the page's, and
main's own numbers still hold.

| | |
|---|---|
| rows FIXED to exactly zero | **84** |
| improved | 58 |
| unchanged | 467 |
| **worse** | **15** |
| **went from clean to self-intersecting** | **0** |

Declared rows **318 → 234**. Total within-shell pairs **1,617,263 → 1,359,861**.

### The 15 that got worse — reported, not tuned around

| main | now | row |
|---|---|---|
| 72,598 | 77,990 | ALL MAX |
| 10,252 | 14,763 | CURL: bias 0.5 × start 0.5 × incurve target × rise 1 |
| **7,350** | **9,944** | **DOME: the INCURVE TARGET × rise 0.5** |
| 59,880 | 62,344 | DEPTH: ZYGO 6 layers × ALL INNER MAX |
| 6,794 | 8,070 | CURL: start floored at one blade row × incurve target × rise 0.5 |
| 6,740 | 7,227 | CURL: bias max × incurve target × rise 0.5 |
| 6,740 | 7,227 | CURL: bias 0.5 × incurve target × rise 0.5 |
| 6,740 | 7,227 | CURL: start max × incurve target × rise 0.5 |
| 6,740 | 7,227 | CURL: bias max × start max × incurve target × rise 0.5 |
| 4,544 | 4,744 | DEPTH: 6 layers × layerTilt max × petalTilt max (225° effective) |
| 1,294 | 1,342 | CONT: 3 turns × layerTilt max × petalTilt max (161.25° effective) |
| 1,120 | 1,231 | SPHERE: petalTilt 75 × layerTilt 30 × 3 turns |
| 848 | 1,056 | LAYERS: 3 × layerTilt max (135° effective) |
| 728 | 910 | FAN: 3 layers × toggle ON × layerTilt max |
| 25,284 | 25,319 | FAN × PER-PETAL: ALL PER-PETAL MAX × 3 layers |

### Eva's two named rows

* **The mum on a hemisphere: 0 → 0.** The piling patch's 0 → 72 is **cleared**.
* **The incurve target at rise 0.5: 7,350 → 9,944.** It **still regresses**,
  and by more than the piling patch did (8,641). **That is the stop condition,
  and it is reported rather than tuned around.** Its FLAT sibling goes
  **7,806 → 510**, so it is specifically the domed variant.

### The attribution is clean: all 15 are the seam floor's

Re-measured on a tree with the curl-start floor neutered and the seam floor
left in, all fifteen read **identically** to the shipped build. **The
`CURL_START_MIN` re-derivation moves no census count on any of them.**

### The clamp, told rather than hidden

The seam floor binds on **157 of 624 rows**. Worst-ring step histogram:
`{2: 80, 3: 26, 4: 6, 5: 28, 6: 1, 7: 9, 16: 1, 20: 1, 40: 5}`.

**On five rows the clamp binds**, and the reason is not a tuning choice: those
petals are **shorter than the fold they have to clear** — the 0.18 mm blade at
six whorls of `layerSize` 0.35 asks **1.0925 × its own length** at an 85° kink.
No station inside the blade satisfies the derivation there. Those rows start as
far out as the lattice allows, stay declared, and the read-out says CLAMPED.
All five still **improve** (25,944 → 20,912; 152,182 → 109,295; 7,336 → 6,528;
7,295 → 5,021); none regresses. A7 asserts the clamp as a **biconditional** in
both directions, so the clamp cannot fire where the blade did have room, and
the strict clause cannot be skipped where it did not. Measured across the whole
matrix: **0 A7 violations, 5 rows with a clamped ring.**

### Mode independence, measured rather than argued

**Zero of 624 rows have a `seamStep` set that differs between live and export.**
The clearance reads `max(sheetThickness, MIN_FEATURE_MM)` in both modes.

---

## 8. The byte claim

*The row count is fixed at NU, and only the stations move.* So:

* **Which rows move: the 157 on which the seam floor binds, and no others.**
  That was **predicted from the seam-step data before the byte comparison was
  run**, and it is the same 157 the census partition names (84 fixed + 58
  improved + 15 worse = 157, with the other 467 rows' counts unchanged). The
  first run reported 156/468 — the cleft row above was being skipped by the
  triangle-count failure before it could be classified, which is the off-by-one
  and not a disagreement about the geometry.
* **The shipping default does not move**, bit-identically and by branch: its
  seam step is 1 and `bladeStations` takes the same `uniform.slice(0, held)` it
  always took.
* **Triangle counts are unchanged on 623 of 624 rows, and the exception is
  declared rather than tolerated.** I claimed they would be unchanged on *every*
  row, on the grounds that the row count is fixed at NU and only the stations
  move. **That was wrong, and the tool found it rather than my reading it.** On
  `CAPABILITY: cleft x 6 layers` the count goes **168,256 → 170,816 (+2,560)**,
  because `trimPanels()` splits the blade into three panels at a **row index**
  — the row nearest the cleft onset in `u` — and the two lobes share that
  boundary row with the base panel. Move the stations and a different row is
  nearest: measured ring by ring, the split lands at **32 / 32 / 33 / 32 / 31 /
  31** where main puts it at 32 on every ring, so the base panel loses a row and
  **both** lobes gain one.

  **This is pre-existing in kind.** Any ladder change can move that split, and
  session 32's own redistribution acts above `u₀ = 0.2857` where the cleft onset
  at 0.55 sits. What is new is that something finally measures it. The exception
  is therefore ONE named entry carrying its numbers: the run fails hard if any
  other row's count moves, and fails hard if this row's count stops moving or
  moves to a different number. It is not a tolerance and it is not a skip.
* **The foot is untouched on every row**, measured on the builder's captured
  grid rather than argued from the code, because J1–J4, the crowding raster and
  the whole junction argument read those rows.

`node tools/verify-bloom-seam-bytes.mjs --base <worktree> --matrix live
--control --expect 157/467` is the instrument, and it **PASSES with the
partition exactly as predeclared** — 624 rows, both modes, **654,173,712 floats
compared positionally**, and **5,555,844 captured foot values identical**. It compares positionally under
`Object.is`, passes capability rows, and has **two controls** — `--control`
perturbs a held row by 1e-9 and requires it to be reported moved, and
`--control-mode` reclassifies one row's live answer and requires the
MODE-DEPENDENT clause to fire exactly once. A clause with only the first
control would leave the second exactly what this project calls a log line.

**No frozen phase is owed**: no row was added or removed, and the matrix is
still 624. **`frozen/phase23`'s bytes stop reproducing on 156 of its 596 rows**
— measured, `--matrix phase23 --control`, 640,601,424 floats, same one declared
triangle-count exception, foot identical across 5,443,956 captured values. Its
DEFINITIONS still deep-compare, which is what `--verify-frozen` proves on every
push, and that is the distinction session 24 established: **a frozen tag pins
row definitions, not bytes.** phase23 joins phase17, phase19 and phase21 as a
tag whose definitions reproduce and whose bytes do not fully.

---

## 9. What was run, and what was not

**Run and green:**

* the full-matrix within-shell census on both trees (624 rows each, no errors),
  calibrated against session 36's recorded numbers on 222 declared rows;
* `node tools/verify-bloom-apex-mutants.mjs` — **13 mutants, every family fires
  on a mutation that names it and is silent on the clean tree**, including four
  new A7 seam mutants and two new rows;
* `node tools/bloom-smoke.mjs --check` — coverage and the 53-family census, both
  directions;
* `node tools/verify-bloom-seam-bytes.mjs` with both controls.

**Two things the mutant table found that no amount of reading would have:**

1. **A7 could not see a clearance that was wrong.** `seam-floor-removed` (the
   law returns 0) fired **NOTHING**: every clause was checking the ladder
   against the *declared* clearance, and a zero clearance is declared zero too.
   The gate now **restates the one-line law** and rebuilds the expected value
   from the two other owners. Importing `seamClearanceMm` there would have
   mutated with it and checked nothing.
2. **`seam-reads-the-live-sheet` was a no-op on every row in the table.**
   `MIN_FEATURE_MM` only raises a sheet *under* 1.00 mm, so on the 1.20 mm
   default — and on the 2.40 mm binding row — `max(sheet, MIN_FEATURE_MM)` **is**
   the sheet. It needed a 0.60 mm row, which the table now carries.

Also: the `ladder-eats-the-base` mutant stopped applying (**matched 2×**) the
moment the seam code restated `Math.floor(ROOT_BLEND_END * NU)`. `HELD_ROWS` is
now the one owner of that count, which was standing in three places.

**Found on the way, pre-existing:** the matrix row **`CURL: start floored at one
blade row (0.02 → 0.036)`** has been stale since session 34 — `0.036` is `1/28`,
and at `NU = 56` the floor is `0.01786`, so `0.02` was no longer floored and the
row stopped testing what it names.

**Not run here, and owed to CI:** the full export-watertight and connectedness
gates. Boundary edges = 0 and non-manifold = 0 on every touched row is CI's to
prove, not this session's laptop's.

**Not built, recorded:**

* **A magnitude gate on the xfail list.** X1 fails a declared row that reads
  zero and X2 fails an undeclared row that does not; a declared row whose count
  doubles passes silently, which is how the 15 regressions above could land
  without a red. That is its own ruling.
* **A panel-gate route for the SEAM CLEARANCE read-out line.** The line ships;
  its route does not. A7 asserts every quantity in it per ring in **both** STL
  gates, which is a stronger read-back than the panel could give.
* **Whether the tilt control should reach past 90° at all** — Eva's, and
  independent of everything above.
