# The petal curl family, session 16 — what was ported, what was declined, and what the crown turned out to be

Session 16 brought the flower's curl family over to the bloom as sheet geometry on a domed
hub: **curl bias**, **curl start**, **cross-section taper** and — renamed — **cup gradient**.
Merged on Eva's ruling from the curl sheet (Sep 4). The charter's session-16 entry carries
the design and the rulings; this document carries the numbers a later session will want,
and the two things Eva asked to be written down in so many words.

Everything below is the EXPORT reading unless it says live, registered against a real STL.

## Crown closure on the incurve target is emergent, and it has no margin

In Eva's words, recorded here on her instruction: **crown closure on the incurve target is
an emergent property of curl 150 × tilt × `domeLean` landing tips within 0.3–1.3 mm of
the axis. It was never designed and has no margin. A future session changing tilt, curl or
`domeLean` re-opens it silently unless coverage is asserted on the pinned rows.**

That is now asserted. The two DOME rows that name the incurve target pin the four new
controls at their identities ("a row that names a state sets it") and carry a `coverage`
assertion the export gate checks on every run: 0.0% of the hub disc uncovered and a bald-cap
radius of at most 0.09 mm (the measured 0.08 mm plus one part in ten). Nothing else in the
project would see the crown re-open. `tools/bloom-plan-coverage.mjs` is no longer only a
measurement tool: its line prints on every export-gate row and its numbers are asserted on
those two rows only.

**The acceptance criterion the brief carried was withdrawn by Eva and is recorded here so
it is not re-derived.** It demanded that the incurve target read 0.0% / ≤ 0.08 mm at every
new control's min, default and max. Curl bias and curl start preserve the total turn and
move the TIP — that is what redistributing curl along the length means — and coverage is a
tip-position property. Measured in Phase A on the incurve target at head rise 0.50:

| control | uncovered | bald-cap | tips (innermost → rim) | D_max |
|---|---|---|---|---|
| all four at identity (the pinned row) | 0.0% | 0.08 mm | 0.27–1.27 mm from the axis | 5 |
| curl bias 0.05 | — | — | 0.64 / 1.02 mm | 5 |
| curl bias 0.50 | 5.4% | 2.72 mm | 3.1–7.9 mm | 5 |
| curl bias 1 | 16.0% | 4.59 mm | 5.0–11.0 mm | 5 |
| curl start 0.04 (one blade row) | 0.0% | 0.08 mm | | 5 |
| curl start 0.25 | 0.6% | 0.94 mm | | 5 |
| curl start 0.50 | 9.1% | 3.52 mm | 4.0–8.7 mm | 5 |
| curl start 0.95 | 23.1% | 5.78 mm | 8.9–17.2 mm | 5 |
| bias 1 × start 0.95 | 23.1% | 5.78 mm | | 5 |
| cup gradient −0.8 / +1.2 | 0.0% | 0.08 mm | unmoved | 5 |
| roll taper ±1 (roll is 0: inert) | 0.0% | 0.08 mm | unmoved | 5 |

D_max is identical on every row because the feet never move. A non-default bias or start
opening the crown is **documented behaviour, not a gate failure**: the controls relocate the
tip, and that is them working.

## What came over, what was declined, and why

| the flower's control | here | ruling |
|---|---|---|
| Curl bias (uniform → tip-loaded) | `curlBias`, PETAL CURL, hidden and inert at curl 0 | ships; the flower's TOTAL-turn doubling (360° → 720° at bias 1) is NOT reproduced — the total is spine curl's alone |
| Curl start (whole petal → outer portion) | `curlStart`, PETAL CURL, hidden and inert at curl 0 | ships; **floored at one blade row** (any non-zero start is at least 1/28, told in the read-out) so the root chord is straight wherever start is engaged |
| Cross-section taper | `petalRollTaper`, PETAL FORM, hidden and inert at roll 0 | ships; the flower's cup-damping-under-roll is declined — roll is isometric here and cup composes onto it |
| Edge curve — profile | `petalCupGradient`, "Cup gradient", PETAL FORM, always visible | ships **renamed**: the flower's law is the same v² lift cup is, with a linear-to-the-tip envelope; the best-fitting cup leaves a 28% RMS residual at every amplitude, so it is a cup that grows toward the tip, and **the flower's label is now known to be wrong there too** |
| Edge curve — top-down | — | **declined**: a width MULTIPLIER, reproducible by petal width × base taper × tip taper to 0.32 mm max billow and 0.59 mm max pinch on an 8 mm half-width; shipping it makes a second producer of the width profile and breaks the registration rule. Do not re-propose it as a form control |
| the flower's ungated sliders | — | declined: both curl modifiers are dead at curl 0 in the flower; here `visibleWhen: { id: 'petalSpineCurl', awayFrom: 0, by: 2.5 }` hides them and the guard makes them inert |

**The flower's constants are lace constants with no thickness behind them.** Bias power 4
and start to 0.95 were tuned for wireframes. On a printed sheet the spine curvature floor
— one sheet thickness of spine radius, the roll floor's own constant, because the sheet's
inner face inverts under half a thickness of spine radius exactly as it does under roll —
binds over most of that range:

| blade, sheet (export) | curl | start max at bias 0 | bias max at start 0 | start max at bias 1 |
|---|---|---|---|---|
| 20 mm, 1.00 mm (the incurve target) | 150° | 0.87 | 1.00 | 0.35 |
| 20 mm, 1.00 mm | 360° | 0.69 | 0.55 | 0.00 |
| 35 mm, 1.20 mm (the default) | 150° | 0.91 | 1.00 | 0.55 |
| 35 mm, 1.20 mm | 360° | 0.78 | 0.91 | 0.00 |
| 60 mm, 1.00 mm | 360° | 0.90 | 1.00 | 0.48 |

Where it binds the BUILT turn collapses: 150° asked builds 96° at start 0.95 and 50° at
bias 1 × start 0.95 on the incurve target. **Eva's ruling: full ranges, clamped, told.**
Trimming the input to hide that cliff is an input proxy; the roll floor and the FOOT WIDTH
FLOORED line are the precedents. The read-out's SPINE CURL line prints the tightest spine
radius, "(CLAMPED at one sheet thickness …)" and the turn asked beside the turn built.

**The uniform arc is never clamped, and it already sits under the floor on three shipped
rows.** The first full gate run fired C1, C2 and C3 on `6 layers x innerCurl max (360)`,
`DEPTH: 6 layers x ALL FORM MAX` and `DEPTH: ZYGO 6 layers x ALL INNER MAX`: under layers
the blade shrinks by `layerSize` per whorl, and at six deep × curl 360 the innermost
whorl's 6.8 mm blade is a 1.08 mm spine radius against the 1.20 mm floor. The shipped
closed-form arc builds it; the law had clamped it, so the two disagreed by 0.69 mm at the
tip. A pre-existing state found by the instrument, not damage it caused — a clamp could
not be byte-identical (the session-13 precedent), so the floor is the MODIFIERS' floor: a
uniform curl is never clamped, `underFloor` is stamped on the ring, the read-out says
"UNDER ONE SHEET THICKNESS on 1 of 6 rings — the shipped uniform arc on a shrunk whorl,
told, not clamped", and C3 asserts the flag against the law in both directions. The claim
that the uniform arc never reaches the floor was true of one whorl and false of six.

## Orthogonality, measured

- **Edge profile against cup**: same v² law along the row normal, envelope `u` against cup's
  onset ramp; best-fitting cup residual 28% RMS at every amplitude, 0.91 mm max at +1 on a
  16 mm petal. Not one deformation entered twice; a cup gradient. Renamed.
- **Edge curve top-down against the taper family**: petal width × base taper × tip taper fit
  max billow to 0.12 mm RMS / 0.32 mm max and max pinch to 0.26 / 0.59 mm on an 8 mm
  half-width. One deformation entered twice. Declined.
- **Tilt, head rise and curl on the incurve target**: tilt −10° lifts the tip 1.8–2.1 mm;
  curl +10° lowers it 1.0–1.4 mm; head rise 0 → 0.50 moves the tip's plan radius by exactly
  0.000 mm on every ring (session 15's mechanism, measured) and lifts it 0 at the rim to
  3.3 mm at the innermost. Three levers with three distinct ring profiles; the perceptual
  overlap is tilt against curl on tip height, which the Sep 1 adjacency ruling addresses.

## Self-intersection is a property of the petal alone

Across 243 combinations (curl 150/250/360 × rise 0/0.5/1 × shrink 0.9/0.6/0.35 × bias
0/0.5/1 × start 0/0.5/0.95), the spine self-contact reading was identical for all nine rise ×
shrink states of every (curl, bias, start). The brief's named corner "curl max × rise max ×
the innermost rings" does not enter it; what rise and shrink change is blade-into-shell
interpenetration, which the charter already allows. The only single-petal self-contacts are
the shipped hoop (curl 360, tip on root, 0.11–0.52 mm) and curl 360 × start 0.50 (the tip
landing on its own mid-blade at 0.000 mm). Bias winds the spiral inside itself and never
touches (1.46–2.03 mm clear at curl 360).

**The instrument is SPINE CLEARANCE**: the nearest approach between blade rows at least
three sheet thicknesses apart along the spine, and between the blade and its own foot,
against one sheet thickness. Read from the builder's own rows, O(NU²) per petal,
microseconds per row. **A FLAG, never a gate** (Eva): it fires on the shipped, photographed
hoop. The first draft compared rows three apart by INDEX and read every shrink-0.35 blade
(0.88 mm long) as self-touching — row pitch, not contact — which is why the separation is in
sheet thicknesses along the spine. The spine curvature floor is the CAP, on the output.

## The instruments, and what each shipped instrument could and could not see

Positive controls, run against the SHIPPED instruments before any assertion was written,
each on a throwaway copy of the tree; every row watertight, 0 degenerate, identical live and
export triangle counts:

| tree | STL vs the un-biased control | shipped instrument | witness now |
|---|---|---|---|
| a correct bias / start build | new bytes | J8 FIRED on all 120 rings ("tilt plus half this row's curl"): INDISCRIMINATE for a redistributed spine | J8 re-derived: the law's own first-row direction |
| a correct cup-gradient build | new bytes | formAssertions' isometry clause FIRED (its `cup === 0` proxy) | the clause now scopes on cup OR gradient |
| A — bias/start read, spine keeps the arc | **BIT-IDENTICAL** (same sha) | **NOTHING** | **C1** — the emitted rows against the law rebuilt from other owners |
| B — start reaches the foot rows | different | J1 SILENT, flat and domed; crowding R4 fires (validity, both gates) | R4 |
| C — Euler integrator at the row pitch | different | nothing discriminating | **C2** — the table against the closed form on uniform rows (5e-3 against 1e-14) |
| D — no spine floor, 0.03 mm spine radius | different on clamped rows | NOTHING | **C3** — the floor, both directions |

**Mutant A is the one that matters, and its witness was built FIRST, red then green** (Eva's
instruction). With the registry rows, the telemetry and the read-out in place and
`buildPetalInto` still on the arc, C1 fired on every ring of every bias or start row (120 on
the incurve target, 1 on the default, 6 on the orchid) and stayed silent on the control, flat
and hoop rows; wiring the spine turned all of them green with nothing else changing.

C1 reads the emitted blade-row centres against `spineLaw()` evaluated in the GATE from
inputs read from OTHER owners than the builder's own spine record — bias and start from the
registry (not overridable), the effective curl and length from the builder's applied state,
tilt from `petalTiltApplied + tiltExtra + domeLean` (J9's three owners), the floor from the
ring's own thickness — and requires the builder's record to agree with that reconstruction.
**One numerical finding on the way to green**: at the tiny curvature a tip-loaded law has
near the root, the exact-arc substep `(sin p1 − sin p0)/k` cancels catastrophically, and a
one-ULP difference in `Math.sin` between Node's V8 and Chromium's V8 became 1.4e-3 mm of
spine on the incurve target's ring 0. The substep is now the same arc in its product form,
`ds · cos(pm) · sinc((p1 − p0)/2)`, and the cumulative turn is taken from the closed-form
`Phi(u)` so the unclamped total is exact (the first draft's midpoint quadrature built 149.9998
of 150 degrees, which C3 read as a clamp that was not there).

**J1 is blind to a foot shortened by a modifier, flat and domed.** Mutant B moved the foot's
inner rows and J1 was silent on every row; the crowding instrument's R4 ("every emitted foot
frame sits where the rectangle built from its descriptor's numbers puts it") is the only
witness, and it is a validity assertion in both gates. Recorded, not fixed: R4 covers it.

## The panel

PETAL CURL is a new section holding petal tilt, spine curl, curl bias, curl start and twist
(Eva's ruling, Sep 4, the session's proposal over her own). Tilt moves WITH curl rather than
to Arrangement, because the Sep 1 ruling put it beside spine curl and considered and rejected
exactly the Arrangement alternative; twist is in on the ordering law in `petalForm`'s header.
PETAL FORM keeps cup, cup gradient, roll, roll taper. Presentation only: `section` is never
persisted, no role changed, zero geometry. The panel gate's route (l) drives curl 0 → 150 → 0
and roll 0 → 90 → 0 on ONE page — route (d) drives a slider driver to its two ends only, and
both ends of spine curl are away from 0, so it could assert that bias and start appear but
never that they disappear — and asserts the SPINE CURL line, its "(CLAMPED" clause and
SELF-CONTACT in both directions against the builder's own record. The negative control
freezes the read-out and requires all TEN routes to fire, and does.

## The matrix

`phase13Matrix()` — the 469 rows frozen at 6b8e94b — is the thirteenth baseline. **Session
15 left this debt**: it grew the live matrix 466 → 469 and froze nothing, so the newest
frozen baseline stayed phase12 at 434 while the live matrix carried 35 rows no baseline held,
the domed corners and the crown-coverage rows among them. Paid here; `--verify-frozen
--phase13` proves it deep-equal to that commit's own `buildMatrix()`, in CI.

The live matrix grew 469 → 499: block 1 sweeps cup gradient at its ends on its own; the
three gated controls are excluded from that sweep as hidden-at-defaults (`CURL_SUBS`, derived
from `predicateDrivers` and `evalPredicate` at DEFAULTS — the latent trap #124 closed, from
a sixth direction) and swept in block 21 at a curl or roll that shows them; and they JOIN
`SWEEPABLE`, so the ALL rows move — **predeclared: eight rows**, the four ALL MAX (bias 1,
start 0.95, taper +1, gradient 1.2) and the four ALL MIN (taper −1 under roll −330 and
gradient −0.8; bias and start are at their identities there). The two pinned incurve rows
are relabelled (" · curl family pinned at identity, COVERAGE ASSERTED") and gain four
identity sets, which move no byte.

## The centre rim hover — one owner for the number

Session 14 reported the incurve target's button rim hovering 1.88 mm above the shell, on a
5.92 mm patch of a 9.38 mm footprint; the Phase A read-out on the same recipe reads 1.67 mm
on a 4.04 mm patch of a 7.27 mm footprint. **Same configuration, two modes**: session 14's
numbers are PRINTED (the export floor moves the hub from 9.69 to 12.51 mm and the button
with it), Phase A's are LIVE. The read-out prints the seat line in whichever mode is on
screen. No configuration in the documents reads 1.2 mm; the brief's figure has no owner and
is withdrawn. The hover is a centre-versus-shell number: curl start neither hides nor worsens
it (1.67 mm live on every row of the Phase A sweep at rise 0.50, 2.46 mm at rise 1.00).

## Fields

`curlBias`, `curlStart`, `petalRollTaper` and `petalCupGradient` are separate controls;
`spineLaw()` is a separate owner; the ring's `domeLean` and `tiltExtra` are untouched and
nothing is folded into either. The builder sums the three tilt terms at the one place it
always did and hands the sum to the law.

## Verification retention

The close ran the newest baseline plus the live partition, on the charter's retention ruling.

- **Both STL gates, full:** export 499/499 watertight, 0 degenerate, identical live and export
  triangle counts, 1961 s; connectedness 499/499 one piece, 1977 s. Coverage measured on 372
  rows, 127 split-whorl rows SKIPPED with the label, 2 ASSERTED (the pinned incurve rows: 0.0%
  uncovered, bald cap 0.08 mm under a 0.09 mm bound). 56 rows flag SELF-CONTACT; 3 six-whorl
  rows carry the shipped uniform arc under one sheet thickness on the innermost whorl (told,
  not clamped); 24 CROWDED.
- **Panel gate** PASS, negative control fires on all ten routes. `--verify-frozen --phase13`
  PASS. CI on af2cd99: all six verify jobs green.
- **phase13 on both trees:** 469/469 bit-identical between a worktree of 6b8e94b and head.
- **The live partition, by label:** 467 shared, 459 bit-identical, **8 moved = the eight
  predeclared ALL MIN / ALL MAX rows, none outside the prediction** (each keeps its byte length
  and triangle count), 32 new, 2 absent because relabelled — the pinned incurve rows are
  bit-identical under their new labels (4b250b664500 flat, cd46ad682fd3 at rise 0.50).

## The positive controls on the final tree

The Phase A table above was measured against the SHIPPED instruments. The same four mutants
were rebuilt as full-tree copies of the final tree and driven through the final harness on
seven rows (the pinned control, bias 1, start 0.95 clamped, the flat incurve target at start
0.5, default x curl 90 x bias 1 x start 0.5, the fiddlehead, the flat default). Every row on
every tree: watertight, 0 degenerate, identical live and export triangle counts — the STL
gates see none of it.

| tree | where it is BIT-IDENTICAL to a correct build | what fires |
|---|---|---|
| A — spine keeps the arc | the pinned control's sha on bias 1 and start 0.95 | **C1 on every ring** of every bias/start row, and the re-derived J8 with it; silent on control, hoop, flat |
| B — start reaches the foot rows | every row with start 0 | crowding R4 on every start row (x480 on the incurve target) |
| C — Euler integrator at the row pitch | the uniform rows (control, fiddlehead) | **C2 on those uniform rows**; C1 at 1e-2 mm on the bias/start rows |
| D — no spine floor | every row the floor does not bind (bias 1, start 0.5, curl 90) | on start 0.95: **C3 both ways** (0.38 mm spine radius told under the floor while the owners' inputs say clamped) and C1 at 3.7e-1 mm |

Every tree is silent and bit-identical on the flat default.

## The sheet

`node tools/shot-bloom-curl.mjs <dir> [base-tree]` rendered 33 cells across 26 rows, every one
PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted. The two BEFORE cells are exported
from a worktree of 6b8e94b with their sha required equal to the head's controls, and the
taper-under-roll-0 cell is required equal to the pinned control. Each sweep shares one camera
framed from its widest cell, with a 12 px clear margin asserted on every whole-bloom view.
The pair Eva asked to look at rather than read: the incurve target at bias 1 (the crown
re-opened) and at start 0.95 (23.1% uncovered, bald cap 5.78 mm, CLAMPED on 120 of 120 rings,
25.6° built of 150° asked), with the seat line reading 1.88 mm printed. Held for her ruling;
merge is released by it.
