# Session 35 — the apex under cup, and why the rim-keyed field does not ship

**Status: STOPPED AT STEP TWO, on Eva's own stopping rule.** No geometry changed.
What shipped is the mutant-sweep strengthening step ONE asked for, and the two
findings below.

---

## 0. The ruling this session was working to

Eva ruled (session 35): the apex threshold stays at **1.80** as its own exposed
control with a registry row and slider, per session 15 — the measured 1.90–2.15
crossing does not move it, because only the 1.33 onset is a property of the
outline while the crossings move with the reach law. Seven ordered steps, and
*"stop at any gate that does not clear"*.

Step ONE cleared for the wall instrument and found a pre-existing red in the apex
one (§3). **Step TWO did not clear (§2), so the build stopped there.**

---

## 1. What the discovery measured, kept here so it is not re-derived

Cup and margin buckling are both scaled by `h(u)`, the row's own half-width. At
the apex `h` is the terminal half-width — the print floor — so:

* **apex displacement = amplitude × terminal half-width, exactly.** 0.960 mm at
  `petalCup` 1.20 in export (`cup × 0.8`), 0.180 mm live (`cup × 0.15`).
  Independent of tip shape, taper, length and width; measured agreement 9e-16 mm.
* **apex ÷ rim peak is pinned at `terminalHalf / peakHalf`** — 10.00% export,
  1.88% live — for every cup in −0.80…1.20 and every buckle state swept
  (amplitude 0.10–0.60, f 3 and the f 7 ceiling, p 2/3/6).
* So the apex is **not** "undeformed by construction": it is deformed at exactly
  the print floor's share. That is why the ratio is a constant and why no
  setting of either control changes how the apex reads against the sides.

Two instrument lessons from getting there:

* **The turning ladder puts the buckle's own turning into row placement**, so a
  buckled build and its zero-amplitude control sample different stations
  (0.30408 against 0.30309 at row 19). Differencing them mixes the field with
  the ladder. The reference used instead is the flat sheet's **plane**, which at
  spine curl 0 / twist 0 / roll 0 is exact (planarity residual 1.8e-15 mm) and
  is defined everywhere rather than only at sampled stations.
* **The buckle amplitude is clamped**, so the law must be read at the builder's
  `ampBuilt` (0.359) and not the asked 0.600. Compared against the asked value
  the cross-check failed by 1.91 mm, which was the clamp and not the field.

---

## 2. STEP TWO — the rim-keyed field does not close V5, and the derivative is
not the reason

The formulation under test: `r` the plan distance to the rim, `R` the medial
radius at the nearest rim point, `q = 1 − r/R`, `w = c·R·q² = c·(R−r)²/R`.

### The analytic derivative

Derived and implemented: `dw/dy = c·(R−r)·[R_y(R+r) − 2R·r_y]/R²` with
`r_y = n̂·ŷ` (the exact gradient of a polyline distance field) and
`R_y = R'(s)·(t̂·ŷ)`.

**The smooth-curve Jacobian `1/(1 − rκ)` does NOT belong here** and applying it
was measured wrong: `r` is the distance to a *polyline*, whose foot point slides
along straight segments, so `ds/dy` is exactly `t̂·ŷ` with no curvature term.
With the Jacobian in, it ran 0.06–5.01 across the blade interior where a gently
curved rim should hold it near 1.

**κ must be smoothed if it is used at all.** It is a second difference of a
sampled curve: at 1,303 vertices over an 80 mm rim the spacing is ~0.06 mm and
the raw estimate is sampling noise (Jacobian 0.1167–13.8049 raw).

### Why it will not converge

The analytic derivative **cannot** converge against a central difference,
because the field is not continuous. Measured at the worst interior point
(u 0.196, v 0.333), stepping 1.25e-3 mm:

| quantity | across the step | note |
|---|---|---|
| `r` | −9.76e-4 mm | smooth; `r_y` = −0.7819 reproduces it to 4 s.f. |
| `s` (foot point) | **+2.35e-2 mm** | a HOP — `ds/da` reads 18.8 where `t̂·ŷ` is 0.625 |
| `R` | +1.19e-2 mm | inherited from the hop |
| `w` | +7.13e-3 mm | a jump in the field itself |

Convergence ratios over steps 1e-2 → 3.1e-4 mm: **1.04 / 1.23 / 0.88 / 0.68**,
where 4 is the signature of a correct derivative. The max error *doubles* as the
step halves, which is a jump discontinuity, not a wrong gradient.

**`R` is looked up at a foot point, and the foot point on a polyline is not
continuous.** That is structural, not a tuning problem.

### And the geometry is creased, independently of all of that

With the analytic derivative wired in — **no numerical step anywhere** — V5
still fails on every rim-keyed state:

| state | keying | WALL mm | SELF mm | V5 |
|---|---|---|---|---|
| cup 0.40 tip 2.45 | shipped | 1.0333 | 1.0929 | pass |
| cup 0.40 tip 2.45 | rim-keyed | 0.3133 | 0.2559 | **FAIL** |
| cup 0.80 tip 2.45 | shipped | 0.9095 | 1.0119 | pass |
| cup 0.80 tip 2.45 | rim-keyed | 0.0880 | 0.0657 | **FAIL** |
| cup 0.80 tip 1.20 | shipped | 1.1518 | 1.1709 | pass |
| cup 0.80 tip 1.20 | rim-keyed | 0.2929 | 0.5509 | **FAIL** |

Four independent checks say this is the geometry and not the instrument:

1. **V1 calibration is exact on the rim-keyed tree** — a flat build reads
   1.200000 mm.
2. **The patch is additive** — float-identical to shipped over 4 states × 2
   modes with the key absent.
3. **The emitted normal is fine.** Against the mesh's own normal from
   neighbouring emitted points: worst 11.62° rim-keyed against 9.16° shipped,
   and *fewer* points over 5° (22 of 432 against 68 of 432).
4. **The surface is creased.** Principal curvature radius **0.369 mm** at
   (u 0.349, v −0.333) against the shipped 1.760 mm at the same state — and
   against the one-sheet-thickness floor of 1.200 mm below which a shell's inner
   offset inverts.

Note the last row: `cup 0.80 tip 1.20` is the state whose **apex is bit-for-bit
the shipped one**, and the worst point is at u 0.349 — mid-blade, nowhere near
the apex. The rim-keyed reach damages the whole blade, not the end.

### What would have to change

`R` must stop being a foot-point lookup. Either the outline becomes a smooth
curve so the foot point is continuous, or the reach becomes a field over the
plan that is smooth by construction. Both are redesigns of the reach, not
adjustments to it, and neither was ruled.

---

## 3. STEP ONE — what the sweeps needed, and a pre-existing red

**A premise correction first.** Both harnesses already failed loudly on a moved
anchor: `verify-bloom-apex-mutants.mjs:197` counted matches, and
`bloom-wall-thickness.mjs` checked `mutated !== src`. Neither could silently
green from a stale string. The real holes were narrower:

1. **The wall instrument checked "something changed", not "exactly one site
   changed."** `String.replace` takes the first occurrence, so an anchor that
   becomes ambiguous lands the mutation somewhere nobody chose while the guard
   still passes. It counts now, as the apex table has since session 32.
2. **Neither checked that the intended BEHAVIOUR moved.** Every mutant now
   declares a `witness`: a direct call on the *mutated module* proving the
   behaviour changed, run before the assertions are consulted. The witness is
   deliberately not the assertion the mutant names — asking the gate whether the
   gate fired is the circularity the table exists to avoid.

Both guards are proven by controls that must fail:

* `--disarm=<id>` gives one mutant a stale anchor → reported.
* `--neuter=<id>` makes one mutant's edit apply while changing nothing → the
  witness reports it (`ampBuilt is 0.0660, still clamped below the asked 0.6`).

**The witness clause immediately found a real defect in itself and then a real
defect in the table.**

* Its first version rebuilt the profile with a stub ring (`{ width: 6.4 }`) and
  read stations **7.11e-2 away** from the ones the builder emits — a second
  producer of the profile, inside the instrument written to catch second
  producers. Every witness reads `buildBloomInto`'s own report now.
* **`stations-not-increasing` is RED ON `main`, and was before this session.**
  Verified by running the committed file from `git show HEAD:` — it names A7 and
  fires nothing. The witness proves the mutation is live (the ladder moves
  9.302e-6 mm at row 23, both modes) and A7 simply does not cover it: A7 asserts
  the *held* root-blend stations are exactly uniform, and row 23 is above
  `ROOT_BLEND_END`. The mutant's `names` claim is wrong, and the row it bites on
  was chosen at **NU 28** (session 32); NU is 56 now.

  **This needs a ruling: correct the family it names, or retire it with its
  measurement the way `inverted-lerp` was.** It is not fixed here.

Also measured while establishing that: over 125 buckled states swept across
amplitude, frequency and tip shape, **exactly 3 carry the de-duplication pass's
own 1e-5 fingerprint** — the pass is rarely engaged at all, which is why the
mutant needs one hand-picked row and is a no-op on the taper rows.

---

## 4. §18a — a shipped state already sits under the printable gap

**Filed separately, against shipped geometry, and not folded into anything
above.** `petalCup` 1.20 × `petalTipShape` 2.45 reads **SELF 0.994 mm** against
the `MIN_FEATURE_MM` bar of 1.00 mm, in export at 56 × 10. At 3.00 it reads
0.832 mm.

This reproduces §18a of the session-32 outcome ("1.031 at 1.20, 1.031 at the
shipped 1.70, 1.019 at 2.00, 0.977 at 2.50, 0.832 at 3.00") on today's tree, and
it is the combination hazard that doc records: **the matrix varies one control
at a time, so a two-control product is invisible to it by construction.** The
scheduled item there is a combination gate — a predeclared set of two-control
products through the wall instrument. It is still not built, and this session
did not build it.

---

## 5. Not reached

Steps THREE (the reach `beta` exposed or pinned), FOUR (apex sampling, 2 rows
vs 4 above u 0.99), FIVE (the second copies), SIX (read-outs and prose) and
SEVEN (the rim curve as a shipped primitive with one owner) were **not started**,
because step TWO is the gate they all sit behind. The audit that costed them is
in the session-35 report; the three highest-value items were
`telemetry()` at `bloom-geometry.js:4109-4123` and `:4134-4153` (two more copies
of `sectAt`, both already omitting the buckle), `bladeStations`' wave at
`:3123-3126` (a third copy, assuming `|v|^p = 1` at the rim), and the
source-string pinning in the two negative controls — which is the one item step
ONE did address.
