# Bloom surface texture: the T5 rulings on the hub, the fade and the florets (Oct 25)

**Status: SHIPPED.** These are Eva's Oct 25 rulings on T5's open items
(`docs/bloom-surface-texture-t5-outcome.md` §8). Rulings 1, 2 and 5 are built. Rulings 3, 4 and 6 are
accepted as declared, and the only change for them is this doc. Ruling 7 (the leaf-to-stem instrument)
shipped first, as its own PR (`docs/bloom-leaf-stem-instrument-outcome.md`).

**Untextured is still the shipped tree by branch.** The shipping default (24,688 triangles) does not move a
float. Triangle counts do not move on any row, because every change acts on the relief and none acts on the
lattice. The changes stay in `organReliefPass`, `buildInflorescenceInto`'s floret append and `t5Finish`.

## 1. Ruling 1: the hub top is smooth wherever petal feet cover it

> the hub top is smooth wherever petal feet cover it (Q7, visible surfaces only). Coverage is derived from
> the emitted feet, never a typed radius. The exposed hub top stays textured.

**The test** is `textureVertexCovered`. A visible hub vertex is COVERED when the segment from just inside
the surface (`q − δn`) out to the full relief height `H` along its own facet normal meets a triangle in the
PETAL range of the stream (`[0, petalTriEnd)`, which is the feet as the petal builder emitted them).

- The test reads only the emitted triangles, so no radius is typed anywhere.
- It runs after T5's escape ray, so it can only take vertices away from the visible set.
- The fade then measures from the covered set as from any buried one, so the relief eases up from the
  edge of a foot.

**Only the hub carries a `cover` range.** The ruling names the feet and the hub top and nothing else. So
the stem, the tube ring and the stem near a 70° leaf keep T5's rule exactly as it was. That rule is:
visible by escape ray, and coincident faces outside the union.

| state (EXPORT, PEBBLE 0.4) | main: hub visible / buried | here: visible / buried / **covered** | fade |
|---|---|---|---|
| shipping default | 3,386 / 272 | 1,256 / 2,402 / **2,130** | 0.8 → 0.75 mm |
| a 60 mm stem | 4,581 / 807 | 2,524 / 2,864 / **2,057** | 0.8 → 0.75 |
| umbel, head ON | 4,553 / 835 | 2,519 / 2,869 / **2,034**; floret hubs 4,690 covered | 0.8 → 0.75 |
| a 6-petal closed tube | 2,464 / 432 | 2,464 / 432 / **0** | 0.8 → 0.75 |

**The tube reads 0 covered, and that is correct.** The tube carries the petals from r 12.52 mm, while the
hub's radius is 7.66 mm. So no foot lies over the hub top; the measured petal vertices inside r 7.5 number
0, against 1,488 on the default.

**The exposed hub top stays textured.** The covered ring is the annulus under the feet. The hub's centre,
and the gaps between feet where a foot does not reach, keep their relief. The sheet shows it (§5).

### 1a. Decided without a ruling: an organ's copy of a vertex that an EARLIER organ also emits takes no relief

Two organs can emit the same exact double. The hub's rim and the tube ring's foot row do, and so do the
hub-to-stem join and the stem's top ring. Before this PR both copies were relieved by the same field at the
same point, so they stayed coincident.

Coverage broke that. Once the hub's copy was covered and the tube's copy was not, two coincident vertices
moved apart by different amounts. Their shells then welded in the census (it welds by exact position), and
the tube's by-design overlap with the hub read as **12,066 within-shell pairs**. Restricting coverage to
the feet took that to 6,275, still welded.

The rule that clears it: **the earlier organ in emission order owns a shared vertex, and the later copy
takes no relief** (counted as `shared` on the record). Measured on the tube row: 3 shared vertices, 8
shells, 0 within-shell pairs, which is main's own reading. The reason this ordering and not the reverse:
the earlier organ's surface already carries the field at that point, so the later copy reading it would
double-relieve one place.

**Alternatives not taken:** relieving both copies by the covered one's weight (it couples two organs'
visibility), or letting the census unweld (it is the census's job to weld). Reversible: it is one `Set` in
`organReliefPass`.

## 2. Ruling 2: the 2H fade width is derived from the relief height and the lattice edge

> the 2H fade width is DERIVED from relief height and lattice edge. State the derivation in the doc; no
> typed constant remains.

T5 faded the relief in over a geodesic `2H` from every buried or covered vertex, using the typed
`TEXTURE_CONTACT_FADE_K = 2`. That constant is gone.

**The derivation.** The fade's weight is the quintic ease `g(t) = 6t⁵ − 15t⁴ + 10t³` (`rimEase`) of
`t = distance / λ`. The height a relieved vertex reaches is `H·g`, so the steepest slope the fade itself
puts into the surface is `H · g'max / λ`. For the quintic, `g'(t) = 30t²(1−t)²`, whose maximum at
`t = ½` is **15/8**.

- **Ruling it no steeper than 45°** (`H·15/8 / λ ≤ 1`) gives `λ = H × 15/8`.
- **A fade shorter than one lattice edge is not drawn at all.** The ramp would sit inside one facet, which
  is a step and not a ramp. So the edge in force is the floor.

```
λ = textureFadeWidthMm(H, e) = max(H × TEXTURE_FADE_PEAK_SLOPE, e)
TEXTURE_FADE_PEAK_SLOPE = max g' of rimEase   (read numerically off the shipped rimEase: 1.8750)
```

**What it moves:** 0.80 → **0.75 mm** at the ruled 0.4 mm floor height, 1.60 → 1.50 at 0.8, and
3.00 → 2.8125 at the 1.5 maximum.

- **The edge term does not bind anywhere on today's ranges.** The edge is 0.40–0.50 mm and `H × 15/8` is at
  least 0.75 mm, so the fade is exactly 45° at every reachable state.
- The floor is there so the law stays honest if the height range or the edge rungs move.
- **`TEXTURE_FADE_PEAK_SLOPE` is read off the shipped `rimEase`**, never typed. The gate (TX13) restates it
  from the derivative's closed form, `30 × ¼ × ¼`, which is a different owner.

## 3. Ruling 5: floret hubs are relieved in the WORLD frame, one shared layer

> floret hubs are textured in the WORLD frame, one shared layer, so no two florets carry the same pattern
> copy. The umbel's junction knot stays smooth.

**The old behaviour.** A floret is one `buildBloomInto` call, built once and appended under N rigid
transforms. T5 relieved its organs inside that build, in the floret's own frame. So every floret carried
the SAME copy of the pattern, laid N times.

**The new behaviour:**

- A floret build (`pedicel: true`) now defers its organs (`built.t5Deferred`) instead of relieving them.
- `buildInflorescenceInto` carries each deferred organ through each placement's own matrix M, positions
  and normals both, into `t5FloretOrgans`. It gives each organ its own triangle range and its covered
  range offset by the placement's stream position.
- The PARENT's relief pass relieves them with every other organ, sampling the ONE world field.
- So two florets of one unit now differ wherever the field differs.

**The umbel's junction knot is untouched.** The boss is not an organ (T5 never relieved it, and this PR
adds no organ), and the apex table's umbel row holds it.

**Floret PETALS are still relieved inside the floret build, in the floret's own frame.** The ruling names
floret hubs, so the petals are one copy laid N times, as before. Flagged in §6.

**`floretsMaxZ` is measured before the world relief.** It is the inset's reach and the plan's quantity, and
the relief can add up to H on a floret hub's top. Flagged in §6.

## 4. Accepted as declared (no change)

- **3. The summed normal at creases.** A crease vertex takes the sum of its faces' normals, as T5 shipped it
  (`docs/bloom-surface-texture-t5-outcome.md` §3).
- **4. The horizontal radial normal on the noded stem.** The noded stem's rings are horizontal and only
  their centres move, so its relief normal is the ring's radial direction, not the leaning tube's.
- **6. The 164 tube-ring vertices left smooth.** These are the wall vertices to which the tube's own law
  hands no normal. They remain unrelieved.

## 5. Gates

**TX12, coverage, in both STL gates:**

- It restates the coverage test with the harness's own segment test and grid, the PETAL BUILDER's per-petal
  `triRange`s, and the control's height.
- It requires every deeply covered vertex (whole one-ring covered) to stay unmoved.
- It requires the record to declare a coverage wherever the restatement finds one.
- It fails if any organ other than the hub declares coverage.

**TX13, the fade:** the record's width against the restated law, and every relieved sample's weight against
the restated ease of its own fade distance.

**TX14, the world frame:**

- It takes every pair of florets built from one unit, brings both back into the floret's frame through the
  inverse of each placement's matrix, and requires them to DIFFER.
- The relief-withheld rebuild is the control: there the same pair is identical to 1e-6, so the difference
  is the relief's.

**Four witnessed apex mutants (`T5_MUTANTS`):**

- `the-hub-is-textured-under-a-foot` (ruling 1);
- `the-coverage-reaches-every-part` (the scope);
- `the-fade-width-is-typed` (ruling 2: a constant 0.8 mm);
- `a-floret-hub-is-relieved-in-its-own-frame` (ruling 5).

Each is witnessed on the mutated module's own record before the clauses are consulted. `the-hub-is-skipped`
was re-anchored onto the new hub cut line. The table gained an umbel row so ruling 5's mutant has a state
that reaches it.

**Two block-80 smoke rows** carry TX12/13 and TX14/12 through the export gate. The coverage instruments
(plan raster and solid angle) skip the `floret …` organ keys in their R1 delta: those triangles are
already in the floret units they re-emit, and counting them twice read 407,802 against 398,338.

**Census over every `TEXTURE` row:**

- 34 censused, 0 rows whose within-shell count moved, 0 cross-shell moves, 0 span moves.
- Three rows read pairs, and all three are declared: COMPOUND leaflets 59, cup × curl 147, and the
  hemisphere's 352, which is the CELLULAR relief folding the petals.

**One declaration came off:** `TEXTURE T5: CELLULAR x a 60 mm stem x textureHeight max (1.5 on the organs)`,
40 / 0.1286. It reads **0**. Attributed on the state:

| | the 2H fade (T5) | the derived fade |
|---|---|---|
| coverage off | 40 / 0.1286 (the old record) | 64 / 0.2440 |
| coverage on | 0 | 0 |

The fold was at the CONCAVE hub-to-stem join (r 7.1, z −1.7). Coverage clears it at either fade, and the
derived fade alone makes it worse. **Why covering the feet clears a fold under the hub is not isolated**:
at H 1.5 a covering segment is long enough to reach from the join's underside to the feet's bottom skin.
This is part of the coverage-scope question in §6.

## 6. Flags (not resolved here)

1. **Coverage reaches the hub's UNDERSIDE where a foot's bottom skin is coplanar with it.** The ruling says
   "hub top". The test is the emitted feet within H along the normal, so a down-facing hub vertex under the
   foot's bottom skin can read covered too. That is how the CELLULAR join fold went away (§5). Eva's call:
   top only, or wherever the feet meet the hub.
2. **Sepals are not counted as feet.** The covered range is the petals', so a sepal's foot on the hub (or on
   the join) does not smooth the hub under it.
3. **The weld rule (§1a) is a decision made without a ruling.**
4. **The fade's edge floor never binds on today's ranges**: the fade is exactly 45° everywhere.
5. **Floret petals are still one copy per unit** (§3). Floret hubs are world-frame and petals are not.
6. **`floretsMaxZ` is measured before the world relief** (§3).
7. **The raceme row "every floret textured in its own frame" now misdescribes itself.** It is a live matrix
   row and its label is not edited, because that would be a row-definition change. The row is right; the
   phrase is stale.

## 7. Byte partition

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of main> --movers-predicate t5-rulings` runs in
both modes. Its movers are predeclared from the BASE tree's own record: a row moves iff it is textured
and the base build relieves at least one organ vertex (a hub, stem or tube record with `displaced > 0`) or
builds an inflorescence. Only textured rows may move,
and the shipping default holds. Figures are in the PR.

## 8. Sheet

`node tools/shot-bloom-texture-t5.mjs <dir> --png docs/img/bloom-texture-t5.png` gains three rulings rows,
with numbers in every caption:

- the hub top with coverage off and on;
- the fade at the old 2H (pinned through the `textureFadeWidthMm` capability) and the derived width;
- two umbel florets side by side, brought into their own frames, with differing patterns.
