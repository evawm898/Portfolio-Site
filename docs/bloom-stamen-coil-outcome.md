# Bloom — the independent coil (F1.3a, helical filaments)

Session outcome, Oct 14. Eva's rulings of Oct 12 (`docs/reference-flower-feature-map.md` §11,
Q2.3 / Q2.5) govern; nothing here re-litigates them. Base: `main` at `037a4a8`. Braided (Q2.4)
is a later session. **[Oct 21: built — `docs/bloom-stamen-braid-outcome.md`; BRAIDED is the third value of `stamenCoil`.]**

## §1 What shipped

- `stamenCoil` (Androecium, a CHOICE: **NONE** / **INDEPENDENT**, default **NONE**): NONE is the
  plain rod by BRANCH — no law, no station, every byte the plain rod's. **BRAIDED is not an option**:
  an option in a choice is reachable by definition and it is not built, so it waits for its session.
- `stamenCoilRadius` (0–10 mm, step 0.1, default **1.5**, shown once a coil mode is chosen) and
  `stamenCoilTurns` (0.5–12, step 0.25, default **3**, shown only where a coil is BUILT — a radius
  of exactly 0 is the plain rod by branch, so the turns would be a dead slider there). Both ranges
  are the geometry's own declarations, imported by the registry (Q6's shape) and asserted at harness
  load. **The defaults are a proposal, not a ruling** — see §7.
- The per-stamen **phase is DERIVED from the index** (an integer mix with its own constants, exact
  in every engine, the length variance's seed precedent) — never a control.
- **The anther follows the coil's END TANGENT** (Q2.5), carried on the rod's own end frame.
- The read-out's STAMENS line says COILED, the radius and turns asked, the stations a rod, how many
  turn counts and radii the floor CLAMPED (told), and the tightest measured radius of curvature;
  **SLENDERNESS under a coil is the longest coiled WIRE's arc length over its diameter** —
  `UNMEASURED — no coupon has been printed`, verbatim. The six-stamen default reads 26.6 (32.0 mm
  of wire on a 20 mm axis) against the plain rod's 16.7.

## §2 The law — beside spineLaw, never a second one

`coilLaw()` in `bloom-geometry.js` is an OFFSET about spineLaw's own centreline:

    C(s) = B(s) + rho(s) (cos th N1 + sin th T),   th = phase_i + 2 pi n s / L

`B` and its tangent come from `spineLaw()` (the filament curl, untouched); `N1 = dD/dphi` is the
in-plane normal and `T` the azimuthal tangent — exactly the rotation-minimising frame of a planar
curve. `L` is the stamen's BUILT length (so the pitch follows the length variance and the 120 mm
ceiling). `rho` ramps in by smootherstep over `rampMm`, so the filament leaves its root along the
normal with continuous tangent AND curvature, and JS1/JS3 hold the root unchanged. `rodInto()`
stays the one rod emitter: its plain arm is verbatim, its coiled arm samples the coil law and
carries the tube on a rotation-minimising frame by double reflection (Wang et al., arithmetic only),
started from the plain rod's own `T`, and hands the tip an exact `(D, T)` end frame.

**The station count is a function of the ASKED turns** — `STAMEN_ROWS + ceil(turns × 16)` — so
live and export agree (topology is mode-free; the floor's `t` is not) and every stamen carries the
same count whatever the clamp or the variance did. `tippedRodTris(lumps, sides, rows)` generalises.

## §3 The floor (Q2.3) — confirmed by measurement, and the first two cuts were wrong

The ruled default was "floored like the spine's, inert at radius 0". **A helix-only closed form is
NOT sufficient** — measured on the first prototype: a pitch floor of `pi t` left a 0.3 mm coil at a
**1.047 mm** radius of curvature inside its ramp, and a 10 mm coil on a 5 mm filament at **0.104 mm**
(the ramp itself turns). What ships bounds the COMPOSITE on a straight axis, with the EXACT curvature

    kappa = sqrt((a d - b c)^2 + c^2 + d^2) / q sqrt(q),  q = 1 + a^2 + b^2
    a = rho', b = rho w, c = rho'' - rho w^2, d = 2 rho' w, w = 2 pi n / L

which is arithmetic only (polynomial ramp, `pi` a constant, `sqrt` correctly rounded, no
`Math.pow`), so a decision on it is bit-identical across engines. Two clamps, both told:
the RAMP gets half the curvature budget on its own (`rampMm` = the longer of one asked pitch and
`sqrt(2 F2 R t)`, capped at half the length; where the cap binds the RADIUS is reduced, by branch);
the TURNS are the largest the curvature admits, bisected (52 steps), by branch when the asked turns
already pass. **A second cut used the upper bound `|C''|/|C'|^2`** and clamped a 1.5 mm × 12-turn
× 20 mm coil to 2.27 turns where the exact law admits 3.77 — 40% conservative, retired. **A third
defect was JS9's to find:** the maximum over a 512-point lattice read the peak low by up to
1.2 × 10^-5 of itself between samples, so a coil built a hair under the floor; every lattice local
maximum is now refined by ternary search.

**Measured** over 624 states (radius 0.05–10 mm × turns 0.5–12 × length 5–120 mm) at sheets
1.0 / 1.2 / 2.4, an independent 8,000-chord walk reads the tightest radius of curvature as
**1.0000 / 1.2000 / 2.4000 mm** — the floor holds, met with equality where it binds, inert at
radius 0. The FILAMENT CURL is not in the bound (the plain rod's uniform arc is never clamped
either — the spine's precedent); the composite with the curl is measured on every stamen and told
(`peakRadiusMm`, `underFloor`). No matrix row reads under the floor.

## §4 The gate family — JS9 (new) and four re-derived clauses

**JS9** in `stamenAssertions` (both STL gates): the two statements of "a coil is built" (registry
`stamenCoilBuilt` against the geometry's `stamenCoilBuilt()` and the owner's record); the coil
**restated** from the controls and the stamen index by `restatedCoil()` in the harness — the phase
hash, the ramp, the floor's curvature, lattice, refinement and bisection, and the base arc in CLOSED
FORM, all written a second time on purpose — against every EMITTED free ring centre (tolerance
1e-8 × (L + R); measured agreement 5e-13 mm); the rod end and the anther axis against the restated
END TANGENT; the end ring vector read off the EMITTED last ring (its first point less its centre)
and required unit and perpendicular to that tangent; both clamps counted both ways; SLENDERNESS as
the longest restated arc; and the restated coil held to the floor on a lattice eight times the
clamp's (a self-check, so a wrong restatement cannot pass quietly). The builder's coil record is a
reference for nothing.

Re-derived, each because the coil made it false: **JS4** counts the rows the CONTROL asks for;
**JS6** carries the tip's frame on the end ring vector read off the artefact instead of the
azimuthal `T`; **JS8**'s chord clause and its slenderness clause stand down under a coil (JS9
restates the whole centreline on JS8's own built length, so the length law keeps a witness); and
the harness's load-time two-statements check now walks the coil's two nested gates.

## §5 Self-contact — measured, declared by value, nothing clamped

New combination-gate measures `stamen-self` (one rod's own segments at least `pi t` apart along it
— a length derived from the floor) and `stamen-style`; four tier-2 pairs:

| pair | measure | verdict | finding |
|---|---|---|---|
| `coilradius-x-turns` (six) | self | clears | tightest **1.722 mm** (r 1.5 × 12 asked, clamped to 3.77) |
| `coilradius-x-curl` (six at 120 mm) | self | clears | **2.563 mm** or more at every curl |
| `coilradius-x-count` (a ring) | stamen-stamen | single-reaches | **17** cells under the bar |
| `coilradius-x-style` | stamen-style | single-reaches | **12** cells under the bar |

**A coil never approaches ITSELF under the printable gap** anywhere on the reachable grid — the
curvature floor keeps the pitch open — so the census never folds a single rod and nothing is
clamped for self-contact (the ruling's own condition). **Coils DO reach their neighbours and the
style**: at the default radius three or more coils on the shipping hub interpenetrate (each envelope
is 2 × (1.5 + 0.6) mm against a 2.08 mm ring for three; the hub saturates the ring at 1.77× for six,
so no spread clears it), and a sparse ring's coils reach the style. Overlapping closed shells are
the export contract's own case and both STL gates are blind to it; 29 cells declared by value.

## §6 Cost — reported before building past the prototype

| state | export tris | of the 1.5 M budget |
|---|---|---|
| default bloom (no androecium) | 24,688 | unchanged |
| six plain stamens | 28,048 | |
| six coiled, defaults (64 stations a rod) | 33,808 | |
| six coiled at 12 turns (208 stations) | 51,088 | |
| **120 on the disc × 12 turns × 120 mm × variance max** | **552,688** | **36.8%** |

Live equals export on every row. The worst corner exports a 27 MB STL.

## §7 RULED (Eva, Oct 20) — the confirmations

These were decisions made without a ruling when the coil shipped. Eva confirmed them on Oct 20, with
the braid's brief, and they are RULED now. Do not re-open them.

1. **RULED: length is the AXIS, not the arc.** The coil winds round the length, so `stamenLength`,
   its variance and the 120 mm ceiling keep their meaning, and SLENDERNESS reports the wire.
2. **RULED: the coil ramps in over its first pitch** (smootherstep), so the filament leaves its root
   on the normal. Without the ramp, the root would kink by up to the helix angle.
3. **RULED: right-handed only.** No handedness control. **A measured finding sits against this
   ruling** (the braid session, `docs/bloom-stamen-braid-outcome.md` §6):
   - The coil as shipped turns CLOCKWISE seen from above as it rises, so it is LEFT-handed. Measured
     on the emitted stations: −11.49 rad over the upper 60% of a three-turn coil.
   - The braid follows the shipped coil's hand.
   - Making both right-handed is a sign on the turn. It moves every INDEPENDENT row's bytes, and the
     braid's brief holds those byte-identical.
   - So the hand is LEFT, recorded, and the flip is Eva's question rather than something done quietly.
4. **RULED: default r 1.5 mm × 3 turns stays.** **Interpenetration at 3+ stamens is a declared look,
   never clamped** (§5): neighbours overlap as separate closed solids. A radius under ~0.4 mm clears
   six stamens but barely reads as a coil.
5. **RULED: 16 stations per turn.** The 2D chord sagitta is 1.9% of the coil radius (0.19 mm at
   10 mm).

## §8 Verification

- Export gate, the 15 coil rows: **PASS, 15 of 15** reach the results and export watertight, live =
  export, the one declared row (the STYLE's own 272-pair overlap) at its recorded magnitude.
- Connectedness, the 15 coil rows: **PASS, 15 of 15** one connected piece (`components=1 stray=0`), the
  552,688-triangle cost corner included.
- **The byte partition** — predicate `stamen-coil` in `tools/verify-bloom-surface-bytes.mjs`: a row moves iff
  the BASE tree's own `footRing()` builds an androecium AND the row asks for an INDEPENDENT coil at a radius
  above 0 (the base has no coil control, so the second half is the controls' and the first the base's).
  Predeclared: the 15 new block-23 rows less radius 0 and the three GATED rows — **11 movers**; `ALL MAX` a
  holder (the coil is a choice, out of the blanket sweep). **MEASURED, PASS: 11 of 11 predeclared movers
  MOVED and 0 floats moved on the 1,320 holders, positionally under `Object.is`, over the whole 1,331-row
  matrix in both modes — 1,602,518,688 export floats over 178,057,632 triangles and 84,420,144
  captured-grid values** (five `--range` chunks against a worktree of `037a4a8`, closed by `--merge`).
  `--control` fires both clauses on a 1e-9 perturbation. The first chunk ran on the branch before `main`'s
  Scoping-b (#407) was merged in and the other four after; Scoping-b records 0 floats moved on every row,
  and the merged tree against the pre-merge commit reads **0 floats moved over block 23's 44 rows** (55.9 M
  export floats, both modes, the coil rows included).
- **The mutant table** (`node tools/verify-bloom-apex-mutants.mjs --only=<the four> --rows='stamen|shipping
  default'`): **4 of 4 fire JS9 and the clean tree is silent on every row; 168 anchors, 168 matching their
  find-string exactly once** (no existing mutant disarmed). Each is witnessed on the MUTATED module's own
  builder records before JS9 is consulted: `the-coil-is-ignored` (the rod never takes its coiled arm — 18
  ring centres against 66; also fires JS4), `every-stamen-coils-at-the-same-phase` (1 distinct phase against
  6), `the-anther-stands-upright-on-the-coil` (the anther along the plain filament's end direction — off its
  wire by more than 30 degrees against under 15; also fires JS6, the frame read off the artefact), and
  `the-coil-curvature-is-unfloored` (12 turns built on 20 mm against 3.77). A ROW SUBSET (5 of 74 rows) and
  a SUBSET of mutants (4 of 168); the full table runs in CI.
- The panel gate: **PASS**. It held every androecium sub-control to "shown iff present", which the coil's
  nested gates make false; the stamens route now holds the radius and turns to their own gates both ways
  and steps through coil on / radius 0 / NONE. Its SLENDERNESS pattern admits a parenthetical after the
  filament figure (the F1.2 variance clause had the same shape and was simply never stepped).
- Node gates in CI, all clean on this tree: the combination gate (full, CG0–CG7), the defaults bar, the
  leaf and sepal decoupling, arc stability, the wall instrument, the design file (`--no-browser`: 1,331 of
  1,331 rows round-trip), the smoke census and its negative control (227 rows, 181 families, JS9 claimed),
  `--verify-frozen --phase67`.
- **The sheet** — `node tools/shot-bloom-stamen-coil.mjs <dir> --png <file>` → `docs/img/stamen-coil.png`
  (downscaled 2x and paletted for the repository): six on a ring plain / coiled at the defaults / at 6
  turns / coiled with the length variance at 0.50, from the side and off the axis on one camera; 120 on the
  disc plain / coiled / r 0.6 × 4 turns, from the side and from above; six at 120 mm r 3 × 8 turns; the
  turns clamp at 12 on 20 mm; and the two byte claims on the sheet — the coil at maximum with count 0 exports
  the default's own sha (`6d2e5700199f`) and NONE with the sub-controls at maximum exports six plain stamens'
  (`74610491c3f6`), both REQUIRED equal. Print preview on, JS0–JS9 asserted before every shutter, no pixel
  delta quoted.

## §9 Frozen phase

`frozen/phase67` is the **1316 rows at `037a4a8`**, registered in `FROZEN_MATRICES` and
`FROZEN_BASE_COMMITS` (67 was the next number on `main` at registration). Owed because block 23
gains fifteen rows (1316 → 1331).
