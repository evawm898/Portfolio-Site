# Organic variance — discovery, and Eva's rulings

**A discovery session: nothing built, everything measured, and Eva's rulings recorded here so
that the build session starts from them.** Read `docs/bloom-charter.md` first, and the
`CLAUDE.md` pointer blocks on the per-petal roles (session 11), the seam clearance (session 38)
and the sepals (PR #243) — this document leans on all three. Every figure below was measured on
`main` at `7ebfb7f` in Node, through the real `footRing` / `buildWhorlInto` / `buildPetalInto`
and the real census (`tools/bloom-self-intersection.mjs`), EXPORT mode unless a row says LIVE,
on the builder's own 56 × 10 lattice. The two instruments are `tools/bloom-neighbour-gap.mjs`
and `tools/bloom-curl-near-zero.mjs`; both are instruments only and neither is wired to a gate.
No browser was available, so no render exists yet; the sheet is the build session's.

The ask, as ruled before the session: three petal properties vary across the whorl — size
(length and width), spacing (angular position), and curl / twist / cup. Tilt is excluded. The
variation is a deterministic field over position with an amount, a frequency and a phase: a
monotone ramp at frequency 0, a wave around the azimuth at low integer frequencies. No seed, no
PRNG. The range must reach visibly irregular.

## 1. Q1 — three routes, and only one of them is the override table

The slot payload the whorl primitive hands every petal is `{ index, azimuth, radius, z, scale,
tiltExtra }`, with `scale` and `tiltExtra` produced by `sizeRamp(i, count)` and
`angleRamp(i, count)` — already functions of the slot index (the CONTINUOUS arm passes
`(i) => fr.rings[i].scale`). `petalSurface` reads `slot.scale` into both length and width.
Everything else a petal is built from arrives through `ps = petalStateFor(state, ring)`, which is
per DESCRIPTOR, and a descriptor is a role group (the whole whorl, or labellum / hood, or a fan
mirror pair) — never a slot.

| property | what exists today | what variance needs |
|---|---|---|
| size (length and width together) | `sizeRamp` per slot (the layer-size route, `slot.scale` reaches length and width); also `mul` rows in `ROLE_OVERRIDES` per group | a per-slot size ramp handed to the primitive — one function, the CONTINUOUS arm's own shape |
| spacing | nothing: the azimuth is `phase + i·2π/n` inside `buildWhorlInto`; PR #243 adds a `LIST` arm (explicit azimuths) for the sepals | `footRing` owns a graded azimuth list and hands it down through the `LIST` arm |
| cup, spine curl | `delta` rows in `ROLE_OVERRIDES`, per group only | a per-slot delta merged into `ps` AFTER the group rows and clamped ONCE into `OVERRIDE_BOUNDS` |
| twist | no row | one row in `ROLE_OVERRIDES` and one entry in `OVERRIDE_BOUNDS` (the base's own range), then as cup and curl |

**The per-slot form term cannot be "one descriptor per slot."** The collapse guard exists because
regrouping the area rule per foot moves bytes by ULPs on rows with nothing engaged (measured
before session B; 46 of 264 rows), and four metrics arrays are index-matched to `fr.rings`
through `petals`. The right shape is a per-slot record ON THE SLOT PAYLOAD, resolved by the same
composition law (base, then the group rows in table order, then the slot term, clamp once), with
amount 0 producing a NULL record so `petalStateFor`'s object-identity guard holds and the default
is byte-identical by branch rather than by an IEEE argument. On the geometry side that is one
merge in `petalSurface`, one law function, one ramp per property. The harness side is most of the
build (§8).

The sepal session's instancing census (PR #243, §1 of its outcome doc) holds here too: every
builder read is of `ps` or of the slot, so a slot term reaches `widthProfile`, `petalForm`,
`petalFormIsFlat` (which decides whether the form is constructed at all) and `thicknessProfile`
through the front door. `FORM_IDS` in the harness is the second owner of that predicate and must
gain the form amounts (session 34's lesson).

## 2. Q2 — there is no gap to defend on the shipping default

Nominal spacing, default form, EXPORT. "Blade" is every row with `u >= ROOT_BLEND_END`; the skin
gap is the nearest mid-surface distance between any two petals less the 1.2 mm sheet, so negative
means the skins cross. "Crossing pairs" is the real census over the petal triangles alone with the
hub's disc excluded by triangle centroid, so every pair is petal against petal, OUTSIDE the hub.
Cross-shell, which the export contract permits and which no gate here has ever counted.

| count | hub R (mm) | blade skin gap (mm) | crossing pairs outside the hub | where the nearest approach is |
|---|---|---|---|---|
| 3 | 5.42 | +16.866 | 0 | u 0.301, r 16.9 |
| 4 | 6.25 | +10.051 | 0 | u 0.301, r 17.6 |
| 5 | 6.99 | +5.552 | 0 | u 0.301, r 18.3 |
| 6 | 7.66 | +2.424 | 0 | u 0.301, r 18.9 |
| 7 | 8.27 | +0.134 | 7 | u 0.301, r 19.5 |
| **8 (shipped)** | 8.84 | **−1.170** | **1,504** | u 0.316, r 20.5, z 4.7 |
| 10 | 9.89 | −1.136 | 3,660 | u 0.429, r 24.8 |
| 13 | 11.27 | −1.199 | 7,020 | u 0.429, r 25.6 |
| 20 | 13.98 | −1.198 | 17,720 | u 0.429, r 27.9 |
| 40 | 19.78 | −1.200 | 69,600 | u 0.429, r 33.5 |

The default's crossing sits at the shoulder just past the root blend, where the core profile is
widest (half-width 7.84 mm at u 0.30) and the plan radius is still 20 mm. LIVE reads the same
(−1.170, 1,504). Around the default, one control at a time: width 8 clears (+3.910), width 30
crosses (−1.182, 4,728 pairs), spread 6 clears (+11.927), spread 0.6 crosses (−1.199), tilt 75
crosses (−1.159), tilt 0 crosses (−0.857). FAN at 3 per side crosses (−1.197, 1,386 pairs),
SPIRAL crosses (−1.181, 1,515), CONTINUOUS 8 × 1 reads +0.313 with 318 pairs, three RADIAL layers
read −0.707 whorl to whorl. The root blend is nearer still: the LAMINA distance (every row above
the foot) at the default is 0.013 mm, at 5 petals 4.016 mm against the blade's 6.752.

**So the "print floor gap" is not a bar the spacing control can be clamped against: it is already
crossed on the shipped bloom from 7 petals up, and nothing sees it.** A derived clamp of the
sepal-angle kind would clamp spacing to zero on the default — dead, not safe. What a printed
crossing collar looks like has never been measured, because nothing here has ever been printed.

### 2a. The pitch-density law and how the gap falls

The spacing grade measured is a pitch density `1 + A·cos(fθ + φ)` for f ≥ 1 and a ramp
`1 + A·(2i/(n−1) − 1)` at f 0, normalised to the whorl's span with slot 0 held at its nominal
azimuth — so the tightest pitch is `(1 − A)` of nominal and A → 1 is coincidence. The equivalent
continuous statement, and the one the build should use so every placement shares one law, is a
monotone remap of the azimuth circle `F(θ) = θ + (A/f)·sin(fθ + φ)`, whose derivative IS the
density and which reproduces the discrete law to the normalisation.

Drawn against analytic on gap-positive states. The analytic model is the flat-chord law per row,
`2·(r·sin(Δ/2) − h·cos(Δ/2))` with the spine's plan radius `r` and the row's tangential half-extent
`h` read off the EMITTED row; "first A" is the first 0.05 step at which the drawn blade skin gap
falls under `MIN_FEATURE_MM` (1.0), under 0 (skins touch), and at which the census counts its first
crossing pair outside the hub.

| state | nominal skin gap (mm) | drawn: under floor / touch / first census pair | analytic: under floor / touch / mid-surfaces cross |
|---|---|---|---|
| 5 petals, default form | +5.552 | 0.20 / 0.25 / 0.20 | 0.200 / 0.243 / 0.295 |
| 5 petals, RAMP (f 0) | +5.552 | 0.20 / 0.25 / 0.20 | 0.200 / 0.243 / 0.295 |
| 6 petals | +2.424 | 0.10 / 0.15 / 0.10 | 0.083 / 0.142 / 0.212 |
| 8 petals, width 8 | +3.910 | 0.25 / 0.35 / 0.40 | 0.242 / 0.324 / 0.423 |
| 8 petals, spread 6 | +11.927 | 0.45 / 0.45 / 0.50 | 0.411 / 0.448 / 0.493 |
| 4 petals, width 30 | +2.543 | 0.10 / 0.15 / 0.10 | 0.061 / 0.101 / 0.148 |
| **5 petals, cup 1.2** | **+0.880** | **0 / 0.05 / 0.10** | **0.198 / 0.241 / 0.294 — UNSAFE** |
| 5 petals, cup −0.8 | +8.667 | 0.30 / 0.35 / 0.20 | 0.201 / 0.244 / 0.297 |
| 5 petals, roll 120 | +9.979 | 0.50 / 0.55 / 0.20 | 0.534 / 0.581 / 0.638 |
| 5 petals, twist 90 | +9.477 | 0.70 / 0.80 / 0.20 | 0.267 / 0.311 / 0.364 |
| 5 petals, curl 120 | +3.233 | 0.15 / 0.20 / 0.20 | 0.108 / 0.156 / 0.214 |
| 5 petals, curl −120 | +6.418 | 0.25 / 0.30 / 0.20 | 0.230 / 0.272 / 0.322 |
| 5 petals, buckle 0.6 f 3 | +5.775 | 0.25 / 0.30 / 0.20 | 0.202 / 0.246 / 0.298 |
| 5 petals, tilt 75 | −1.178 | already crossed at A 0 | — |

**The analytic model is exact on a flat petal** — to three decimals at every count, and it
reproduces the nominal gap on every flat row of the count table (18.066 / 11.251 / 6.752 / 3.624 /
1.334 mm at 3 .. 7 petals) — because the nearest approach is between two straight rows at the same
station. **Under cup it is wrong in the UNSAFE direction:** it predicts the 5-petal cupped whorl
holds its gap to A 0.198 while the drawn gap is already 0.880 mm at A 0, under the floor, because a
cupped margin is lifted over the neighbour's surface and the nearest approach is no longer along
the chord. Under reflex, roll and twist it is wrong the other way (conservative by 0.1 to 0.4 in
A). So if a ceiling were ever wanted it would have to be DRAWN — the third instance of the
drawn-versus-analytic trap in this project, caught before it was built rather than after. The ramp
and the wave give identical crossings: the tightest pitch is the whole story.

The "first census pair" column at A 0.20 on flat rows, while the blade skin gap is still +0.99 mm,
is the ROOT EXIT crossing (u < 0.30, outside the hub), the crowding instrument's own region — the
lamina column is where it shows, and it is why the sepal session dropped those rows from its
contact scan.

### 2b. Crowding under the grade

`tools/bloom-crowding.mjs`'s own `nearestFeet` and `stackDepth` on the graded feet, EXPORT:

| count | A | NN adjacent q (d / foot width) | D_max (CROWDED at ≥ 11) |
|---|---|---|---|
| 8 | 0 | 0.846 (5.42 / 6.40) | 2 |
| 8 | 0.5 | 0.464 (2.97 / 6.40) | 3 |
| 8 | 0.8 | 0.226 (1.45 / 6.40) | 4 |
| 8 | 0.95 | 0.106 (0.68 / 6.40) | 4 |
| 40 | 0 | 0.388 (2.48 / 6.40) | 4 |
| 40 | 0.5 | 0.195 (1.25 / 6.40) | 7 |
| 40 | 0.8 | 0.079 (0.50 / 6.40) | **12** |
| 40 | 0.95 | 0.021 (0.13 / 6.40) | 15 |

The crowding flag is the one existing instrument that responds to a spacing grade, and it responds
at high counts. The only hard failure the grade can reach is coincidence at A 1 — duplicate
geometry, the family's known cause of non-manifold edges, and the state J7's own clause names.

### 2c. Size and form per slot

Through the two routes the builder has (`slot.scale`; a per-slot state spread clamped into the
base ranges), 8 petals unless stated, EXPORT. Triangle counts do not move on any row (size and form
move vertices, spacing moves azimuths).

| state | blade skin gap (mm) | crossing pairs outside the hub | within-shell pairs (worst span) |
|---|---|---|---|
| 8 uniform | −1.170 | 1,504 | 0 |
| 8, size ±30 % | −1.155 | 924 | 0 |
| 8, size ±50 % | −1.134 | 960 | 0 |
| 8, size ±50 % ramp | −1.164 | 3,032 | 0 |
| 8, cup ±1.0 about 0 | −1.103 | 338 | 205 (0.2104) |
| 8, cup ±1.0 about 0.5 | −0.977 | 728 | 276 (0.1268) |
| 8, curl ±180 about 0 | −0.808 | 542 | **2,239 (1.6737) — see §4** |
| 8, curl ±180 about 180 | −1.197 | 958 | 126 (0.5233) |
| 8, twist ±90 | +1.186 | 74 | 0 |
| 8, twist ±180 | +3.369 | 8 | 0 |
| 5, size ±50 % | +6.371 | 0 | 0 |
| 5, curl ±180 about 180 | −1.190 | 13 | 118 (0.5213) |
| 8, length 20, tilt 75, size ±50 % | −1.200 | 3,651 | 0 (seam steps 2,2,2,3,4,3,2,2) |
| 8, length 20, sheet 2.4, tilt 75, size ±50 % | −1.199 | 2,390 | 0 (seam steps 3,3,4,6,7,6,4,3) |

Size variance shrinks a petal against a fixed sheet, so the seam clearance is a larger fraction of
a small petal's length and the held block starts later: seam steps of 4 to 7 on the half-size
petals of a 20 mm blade. Told by `bladeLadder`, never clamped, and the `SEAM CLAMPED` biconditional
already covers the extreme. The within-shell counts on the cup and curl rows are the per-petal
folds the matrix already declares at those values, summed over the petals that carry them — except
the curl-about-0 row, which is §4.

## 3. Q3 — graded curl, cup and twist cannot reach the reflexed seam fold

A composed value is clamped into the base's own range, and the base ranges do not reach it. Whole
default bloom, EXPORT, within-shell census:

| state | pairs | note |
|---|---|---|
| spine curl −180 at tilt 0 / 25 / 75, bias 0 | 0 / 0 / 0 | seam chords (rows 3→4, 4→8) −4.8 / −12.9° at tilt 0; the arc is distributed along the blade |
| spine curl −180 at tilt 0 / 25 / 75, bias 1 | 0 / 0 / 0 | bias loads the TIP, never the base — `curlBias` runs uniform → tip-loaded, there is no base-loaded curl |
| spine curl −180, start 0.5, tilt 0 / 25 / 75 | 0 / 0 / 0 | |
| twist ±180 | 0 / 0 | |
| cup −0.8 / 1.2 | 384 / 752 | the cup's own declared pairs, none under the slab |
| **positive control: petal at tilt −40 / −50 / −55 / −60 / −90** | **0 / 56 / 56 / 56 / 64** | at z −0.60 to −0.65, r 9.2 to 9.4: the rim's underside — the fold the sepal session named, on a full petal it onsets between −40 and −50 |
| tilt −60 × curl −180 / +180 | 56 / 56 | curl adds nothing at the seam |
| tilt 0 × curl −180 × cup 1.2 × twist 180 | 696 | under the slab at z −22, r 8.8 to 9.5: the tip curled under, a combination fold, not the seam's |

Tilt is excluded from the variance and `petalTilt`'s floor is 0, so the seam fold does not need
fixing first. What does is §4.

## 4. The defect the field exposes — the uniform arc's near-zero branch

A per-slot field hands the geometry values off the slider grid. At 8 petals and f 1 the slots at
90° and 270° receive `180 × cos(π/2)` = **1.1e-14**, not 0. `petalFormIsFlat` guards on exact
zeros, so the form is constructed; the uniform arc is built from the closed form
`(sin p1 − sin p0) / k`, kept verbatim for byte identity; that form cancels as k → 0.
`spineLaw`'s general branch already carries the sinc remedy and its comment says why.

Whole default bloom, EXPORT, one control off the slider grid (`tools/bloom-curl-near-zero.mjs` §1):

| control value | within-shell pairs | worst span (mm) | tip plan radius / height (mm) |
|---|---|---|---|
| flat (default) | 0 | — | 40.566 / 14.792 |
| **curl 1e-14** | **8,806** | 1.1978 | **31.109 / 0.000** — the blade laid onto the hub plane |
| **curl −1e-14** | **11,027** | 1.2928 | 42.241 / 22.264 |
| curl 1e-12 | 0 | — | 40.459 / 14.694 — the tip moved 0.1 mm |
| curl 1e-9 | 0 | — | 40.566 / 14.792 |
| curl 1e-6 | 925 | 0.0000 | 40.566 / 14.792 |
| curl −1e-6 | 1,214 | 0.0000 | |
| curl 1e-3 | 456 | 0.0000 | 40.565 / 14.792 |
| curl 0.05 / 0.5 / 1 / 2.5 / 5 | 0 | — | clean |
| cup 1e-14 / 1e-3 / 0.01 | 0 | — | clean |
| cup 1e-6 | 10 | 0.0000 | |
| twist 1e-14 / 0.01 / 5 | 0 | — | clean |
| twist 1e-6 | 129 | 0.0000 | |
| roll 1e-14 / 0.01 / 5 | 0 | — | clean |
| cup gradient 1e-14 | 0 | — | clean |
| curl 1e-14, bias 1 (the general law) | 0 | — | clean — the sinc branch |

Two classes. **The 1e-14 rows are a fold**: the tip lands on the hub plane. **The 1e-6 .. 1e-3
band reads span-zero touches** of a near-flat sheet against itself, the session-42 knife-edge
class — an instrument reading rather than a fold, but a pair count all the same, and X1/X2 count
pairs. On the curl-graded 8-petal whorl (§2 of the instrument) the whole reads 2,239 pairs at
worst span 1.6737 mm: the petals at 0°, ±45°, ±135° and 180° (curl 180, ±127.3, −180) each read
0; the two at 90° and 270° (curl handed 1.1e-14 and −1.1e-14) read 979 and 1,260. Single-petal
builds at 90, 100, 110, 120, 125, 127.3, 130, 140, 150, 160, 170, 180, −127.3 and −180 all read 0.

Reachable through no slider (spine curl steps by 5, twist by 5, cup by 0.01) and through a field
on every even-count whorl. Ruled in §9: fixed before any field lands, by the arc's closed form
made sinc-stable.

## 5. Position, per placement — and the FAN's evenness requirement

The field indexes the EMITTED AZIMUTH in every mode, because "one side of the flower" is an
azimuth statement. RADIAL and SPIRAL: immediate. CONTINUOUS and SPHERE: the golden-angle azimuth,
with the polar sequence, the equal-area law and the stem channel untouched (S1, J5 and the
omission mask keep their meaning; the mask re-measures each slot's real petal, so varied petals
are handled by construction). A spacing grade on a golden-angle spiral does destroy the packing the
golden angle buys; that is a look, not a gate.

**On a FAN the field must be EVEN about the mirror plane** — a function of the unsigned angle from
it — or the fan stops being a fan. Per-petal groups are mirror PAIRS by construction; Z4a asserts
the role assignment is mirror-symmetric; Z4b asserts the emitted azimuths pair as a bijection about
one plane; Z8 asserts the group index is the distance from the plane; J7 asserts the span about the
plane equals `footRing`'s derived span (`|hi + lo| < 1e-9`, the two sides equally far), the notch
equals the derived notch, and the tightest neighbours are no closer than `min(step, notch)`. An
even field keeps all of Z4a, Z4b and Z8 true as they stand. J7's span, notch and minimum-gap
clauses read `footRing`'s derived law, so a graded fan needs `footRing` to own the graded azimuths
and derive span, notch and the tightest step from them, and J7 restated against that law — harness
work, no assertion weakened. Phase is therefore inert on a FAN and the ramp there runs outward
from the plane. No placement has to be excluded.

## 6. One amount or three

Three amounts, one shared frequency, one shared phase (ruled, §9). The three properties have three
scales and three failure modes — spacing: coincidence and crowding; size: the seam step and the
foot floor; form: the census — and a shared frequency and phase is what makes "larger AND more
crowded on one side" one side. Five controls, not nine.

## 7. The matrix block

The live matrix is 778 rows. Read off `actions_list` at the time (the rule: never off a written
figure): the export gate's most recent completed successes run 169.6 min on 778 rows (`f64f3bc`),
208.5 on 758, 220.8 on 762, 246.1 on 845 (PR #243) — 13.1 to 17.5 s a row; connectedness 104.3 on
778 and 117.1 on 845 — 8.0 to 8.3 s a row.

A defensible block is about 45 rows: the three properties at maximum at f 0 / 1 / 2 / 3, phase
off zero, on all four placements, at 3 / 8 / 40 petals, composed with the labellum and with a
per-petal fan group, the near-zero corner (an even count at f 1), a frequency above n/2 (the
scatter row), a CROWDED row, and GATED rows (frequency and phase at their extremes with amount 0).
The blanket sweep adds two rows per amount slider (six; frequency and phase are hidden at amount 0
and stay out of it). Cost at the rates above: **10 to 13 minutes on the export gate, about 6 on
connectedness.** `ALL MAX` gains all three at maximum on the 240-petal head; no triangle count
moves, but its within-shell entry moves and must be re-measured (#213 does not gate magnitude).
The full product space is thousands of rows and stays unbuilt with the combination gate.

## 8. Sepals, and the harness list

**Sepals are not free.** PR #243 builds the sepal whorl with constant ramps (`sizeRamp: () =>
sepals.scale`, `angleRamp: () => 0`) and derives the sepal azimuths from the NOMINAL petal pitch;
a graded petal spacing needs the sepal azimuths re-derived from the graded petal azimuths, and
size or form variance needs the ramps passed through — one call site each. The real cost is the
DRAWN angle limit, which tests one sepal per congruent neighbourhood (5 on the shipped whorl):
under variance every neighbourhood is distinct, so its 0.23 to 0.65 s per build scales with the
count. The ruling (§9) gives sepals their own field, which is one more instance of the same
five controls through the `SEPAL_TWINS` mechanism.

**What the harness owes, from the source:** Z2 and Z6 compare the representative petal's applied
state against the ring's record and fire on any slot term — a per-slot applied record joins the
metrics; `FORM_IDS` gains the form amounts; J7 is restated against the graded fan law (§5); the
smoke census gains a block and `--check` must show the block count rising; the mutant table gains
a witness per property (the field never reaching the blade, amount 0 not the identity, an
unnormalised spacing opening a gap at θ 0, a fan field that is not even, the near-zero corner
handed a non-zero); the panel gate learns five rows and their predicates; and the byte partition is
predeclared from the builder's own record (a row moves iff a slot record resolved), with the
default holding by branch.

## 9. RULINGS (Eva, Sep 17) — binding on future sessions

1. **Interpenetration on the shipping default is an ACCEPTED LOOK.** Spacing variance REPORTS
   the tightest pitch, the nearest-neighbour approach and crowding; there is NO derived clamp. A
   fixed maximum below A = 1 stands, because coincidence at A = 1 is duplicate geometry and J7's
   own clause. **The told flag ships with the FIRST variance PR, not with spacing — this is the
   condition of the ruling.** The crossing collar has never been printed; the ruling is
   revisitable on that evidence and on nothing else.
2. **Five controls:** three amounts, one shared frequency, one shared phase.
3. **Ranges:** size ±50 %; the form deltas at each control's base range (spine curl −180..360,
   cup −0.8..1.2, twist −180..180, clamped once into `OVERRIDE_BOUNDS`); spacing to A 0.9.
4. **Frequency is TOLD, not capped.** A wave above n/2 aliases into scatter, and scatter is a
   wanted look. The read-out says so; the range is not narrowed.
5. **Sepals are fully independent** — their own amounts, their own frequency, their own phase —
   with the sepal frequency and phase DEFAULTING to the petals' values, so the coherent case is the
   out-of-box one.
6. **The near-zero curl branch (§4) is fixed BEFORE any field lands.** Recommended: the arc's
   closed form made sinc-stable, matching `spineLaw`'s general branch; it moves bytes on every
   curled row and owes its own partition. **The exact-zero resolver rule was considered and
   REJECTED as a fifth typed threshold.**
7. **Build order: size → form → spacing. All of it after #243.**

## 10. The instruments, and what was not kept

Promoted into `tools/`, headers state what each measures and that neither is wired to a gate:

* `tools/bloom-neighbour-gap.mjs` — §1 the nominal count / width / spread / tilt / placement
  sweep (the interpenetration table), §2 the grade sweep with the drawn-versus-analytic
  comparison, §3 size and form per slot, §4 crowding under the grade. `--quick` runs a two-row
  subset of each. §4 imports `bloom-crowding.mjs`, which imports the harness, which imports
  `playwright-core` at module load — the dev deps every other tool here needs; §1–§3 need none.
* `tools/bloom-curl-near-zero.mjs` — §1 the near-zero ladder, §2 the curl-graded whorl petal by
  petal, §3 the reflexed-seam positive control and the curl / twist / cup corners.

Not kept, and why: the first seam script read the census's site record by the wrong field (`s.p`
rather than `s.at`), so its under-slab column was a NaN comparison — it is superseded by §3 of the
near-zero tool, whose figures are the ones in §3 above; a one-off smoke probe (a default build and
a census, nothing a future session would re-derive); a matrix row count, which the harness's own
`buildMatrix()` answers; and a module-loader stub that resolved `playwright-core` to a no-op so the
harness could be imported on a box without the dev deps. That last one is an environment
workaround and not an instrument, and it is recorded here for the next box without deps: a
`--import` hook that short-circuits the specifier to a file exporting a `chromium` that throws.
Nothing that measured a number in this document was dropped.

## 11. What this session did not do

No render (no browser). No byte partition (nothing moved). No frozen phase (no row added). No
gate was run: the two new files are instruments under `tools/`, which the two FLOWER workflows
path-filter on (`tools/**`) and no bloom workflow does, so this PR triggers `flower-export-
watertight` and `flower-geometry-quality` and nothing else — and two green flower jobs on this PR
are not evidence about anything in it.
