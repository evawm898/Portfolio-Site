# Bloom session 38 — the foot-to-blade seam clearance

**Status: waiting on Eva's ruling. Nothing is merged.**

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

## 7. Cost, and the byte claim

*(filled from the measured sweeps — see §8)*

---

## 8. What was run

*(filled)*
