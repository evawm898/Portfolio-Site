# Session 32 — PETAL TIP SHAPE: the whole-petal apex

**Phase A costed seven mechanisms and two survived, so it stopped at a sheet. Eva ruled
`blunt`. Phase B is that build.** Sections 1–6 are the discovery the ruling was made on and are
kept verbatim as its evidence; sections 8 onward are what shipped.

**THE RULING, in her words and for the record.** *"The reason is not the row count — it is that
`cap` cannot deliver a round apex. Six rows in the cap is a shoulder turning through 0.15 mm;
the sheet reads it as a faceted gable, which is a control that appears to do a thing and does
not. That is the dead sharpness slider again, and this project has now found that class five
times. Zero rows moved for a control that lies is the more expensive option, and the
discontinuity, the kink and the dead zone all leaving with `petalTipBreadth` is worth 66 rows
on its own."*

---

## 1. What governs the apex today, from source

`widthProfile()` in `bloom-geometry.js` is the one owner of "how wide is the blade at u".
Three shipped things reach the apex, and the third is the one nobody had written down as an
apex control:

| | what it is | what it does to the apex |
|---|---|---|
| `CORE` | `u^a (1-u)^b / gPk`, a = `petalBaseTaper`, b = `petalTipTaper` | pinched to zero at both ends for every a, b > 0 |
| `TIP_PLATEAU` | `petalTipBreadth · halfW · clamp((u-uPk)/(1-uPk), 0, 1)` | a **linear** ramp, `max`-ed with the core |
| **the converging tip cap** | `h = hEntry + (tipFloor - hEntry) · s` over `[uCap, 1]` | a **linear** lerp — a straight cone |

### 1a. THE APEX IS A STRAIGHT CONE OR A FLAT TRUNCATE. ROUND IS NOT REACHABLE.

`uCap = min(1 - TIP_CAP_FRACTION, crossing)` and `TIP_CAP_FRACTION` is 0.20, so **`uCap ≤ 0.80`
always**, structurally, whatever the exponents are. The cap therefore owns at least the last
20% of every pointed petal: **6 of 28 blade rows, 7.00 mm of a 35 mm petal, rows 1.25 mm
apart**. Inside it the half-width is a straight line — measured at the steepest reachable core
(`petalTipTaper` 4), successive samples differ by a constant −0.1422 mm.

So the two taper exponents set **how wide the cone starts** and nothing at all sets its curve:

```
  b      uPk    uCap  hEntry | half-width at the last 6 blade rows (live, mm)
  0.60  0.625  0.800  7.023 | 6.286 5.059 3.832 2.605 1.377 0.150
  1.80  0.357  0.800  2.191 | 1.972 1.608 1.243 0.879 0.514 0.150   <- the shipping default
  4.00  0.200  0.592  1.600 | 0.785 0.658 0.531 0.404 0.277 0.150
```

Above `petalTipBreadth === 0` there is no cap at all (Eva's exact-branch ruling, Sep 1), and
the end is flat. **Neither construction is a rounded apex, and no combination of the shipped
controls produces one.** That is the gap this session was called for, and it is real.

### 1b. `petalTipBreadth` IS A TERMINAL-WIDTH CONTROL, AND IT HAS DEAD TRAVEL NOBODY IS TOLD ABOUT

The plateau is floored by `TIP_HALF_MM = 0.8`, so every breadth with `breadth × halfW ≤ 0.8`
draws a **bit-identical tip**:

| petal width | dead range | of 60 steps |
|---|---|---|
| 8 mm | 0.01 – 0.20 | **20** |
| 16 mm (default) | 0.01 – 0.10 | **10** |
| 22 mm | 0.01 – 0.07 | 7 |
| 30 mm | 0.01 – 0.05 | 5 |

It is width-dependent, so no static range is dead-free — the `stamenSpread` situation exactly
(Eva, Sep 6), and unlike `stamenSpread` **it is told nowhere**: no cap mark, no read-out
clause. This is the anther-sharpness class of defect sitting on the control this session was
asked to replace, found by sweeping the range rather than by reading the code.

Two more facts about it, both measured, both relevant to whether it should survive:

* **0 → 0.01 is a discontinuity**, by ruling. The live terminal half-width jumps 0.150 → 0.800 mm
  (5.3×) and the apex changes construction. Deliberate — it is what makes the pointed cap's
  partition byte-sharp — but it means the control's first step is its largest.
* **Above the floor it makes the blade *widen* toward the tip.** Not truncate — **spatulate**:

  | breadth | waist | at u | tip | flare | worst outline corner |
  |---|---|---|---|---|---|
  | 0.20 | 1.250 mm | 0.859 | 1.600 mm | +28% | 9.1° |
  | 0.30 | 1.753 mm | 0.827 | 2.400 mm | +37% | 6.7° |
  | 0.45 | 2.409 mm | 0.787 | 3.600 mm | +49% | 8.6° |
  | 0.60 | 2.974 mm | 0.755 | 4.800 mm | +61% | **16.4°** |

  The 0.60 row is the state `shot-bloom-silhouette.mjs` already photographed as **THE KINK**
  and Eva already ruled reads fine (Aug 31). Whether the flare is a wanted silhouette or an
  artefact of `max`-ing two terms is a question that ruling did not ask.

---

## 2. The mechanisms, costed

| | mechanism | verdict |
|---|---|---|
| **M1** | **`cap`** — one exponent on the cap's interpolant: `g = m === 1 ? s : 1 - (1-s)^m` | **SURVIVES** |
| M1+ | the same exponent applied to the plateau ramp as well | **DEAD**, measured — see below |
| M2 | a tip-local exponent on the CORE | **DEAD in both families** — in the pointed family the cap owns `u ≥ uCap ≤ 0.80`, so a core-side term is inert exactly where the apex is; in the truncate family the plateau `max`-dominates the core near the tip (2.400 mm against ~0 at breadth 0.30), so it is inert there too. Below `uCap` it is a second owner of the falling limb `petalTipTaper` already owns |
| M3 | a superellipse quadrant across the cap, `(h,s)` on `x^q + y^q = 1` | **DOMINATED** — see below |
| M4 | expose `uCap` | **DEAD** — a longer or shorter *straight* cone is still straight, so it cannot make round; and `uCap` is a derived `min` of two print-floor rules, i.e. plumbing |
| M5 | widen the terminal face | that **is** `petalTipBreadth`; not the named axis |
| **M6** | **`blunt`** — make the cap unconditional, suppress the plateau, give the cap its own terminal width | **SURVIVES** |

### 2a. ONE EXPONENT CANNOT SERVE BOTH CONSTRUCTIONS — the measurement that killed M1+

The cap's lerp and the plateau's ramp are *both* linear today, so one exponent shaping both
looks free. It is not. The same value means **opposite** aesthetic directions in the two
families, because on the cap the interpolant drives the width *down* and on the plateau it
drives it *up* (breadth 0.30, default petal):

```
  m=0.40: waist 1.126 mm at u=0.868, widens 1.274 mm; worst kink 10.3 deg
  m=1.00: waist 1.753 mm at u=0.827, widens 0.647 mm; worst kink  6.7 deg   <- shipped
  m=2.50: waist 2.263 mm at u=0.796, widens 0.137 mm; worst kink  0.0 deg
```

The value that **rounds** the cap (m < 1) **deepens** the truncate's waist and raises its
corner. That is a control running backwards from its own label over half its domain — exactly
what session 31 retired `antherSharpness` for. Giving the plateau a mirrored law (`s^m`) would
be two expressions under one name, which is the two-owners defect. So the exponent belongs to
the cap alone, and any mechanism that reaches the truncate family has to reach it by owning
the terminal width itself. That is what forces M6 to exist as a separate candidate rather than
as a setting on M1.

### 2b. M3 IS DOMINATED ON RESOLUTION, AND THE NUMBER IS THE REASON

Six rows sit in the cap, so the question is not what the law does but what the sampling can
draw. Share of the cap's whole narrowing that lands in the **final row gap**, where there are
no rows left to draw it — computed over the **six rows inside the cap** (the sheet's own cell
captions use a seven-row window that reaches one row below `uCap`, so its percentages read
lower for the same shape; both are stated where they are used):

```
  shipped straight cone        20.0%
  M1 cap exponent m=0.50       44.7%     <- the natural "round" value
  M1 cap exponent m=0.35       56.9%     <- M1's own extreme
  M3 superellipse   q=2        57.4%     <- the circular quadrant: M3's natural "round" value
  M3 superellipse   q=3        76.4%
```

M3 hits the resolution wall **at its nominal round setting**, where M1 still has headroom and
only reaches the same place at the far end of its travel. A superellipse is the obvious law for
"make it circular" and it is the wrong one here, which is the session-25 lesson arriving again:
a settled family is not a settled mechanism.

### 2b-bis. RECORDED, NOT BUILT: a C1 join at the cap entry

The cap meets the core with a corner — worst 11.1° at `petalTipTaper` 0.6, 2.9° at the default,
0.0° at 4.0 (where the crossing rule rather than the 0.80 clamp picks `uCap`). Blending them
C1 would remove it. It is **not a candidate for this axis**: a smooth join of a monotone-falling
core into a terminal face is still not a rounded apex, so it cannot produce the thing the
session is named for. It is a separate, separately-evidenced improvement and it is recorded
here so a later session does not mistake it for one.

### 2c. BOTH SURVIVORS ARE BYTE-IDENTICAL AT THEIR IDENTITY, MEASURED BEFORE ANY PICTURE

Run in Node against the shipped module, `Object.is` on every drawn row, 96 configurations ×
both modes × three petal widths:

```
  identity control: 16,704 half-widths, 0 differ  (no spec, and cap at m = 1)
  blunt-law identity (end 0, m 1): 2,088 half-widths, 0 differ
```

So **"0 moved is a construction" is available to phase B for either candidate**, and the blunt
law's identity is what makes it a candidate for *superseding* tip breadth rather than a rewrite
of the silhouette engine.

---

## 3. Why this is a ruling and not a preference

The two survivors are not two spellings of one thing. They ship different petals, retire
different amounts, and move different numbers of rows.

**`cap` — the additive reading.** `petalTipShape` is the cap's exponent. It lives only in the
pointed family, so it is hidden AND inert whenever `petalTipBreadth > 0` (the
`androeciumEligible` / `sphereMode` pattern). `petalTipBreadth` stays, keeps owning the
terminal width, and its dead travel gets told the way `stamenSpread`'s is.
*Cost:* **0 rows move**, nothing retired, no frozen phase owed for the change itself (one is
owed if the matrix grows, and it would).
*What it does not do:* it is not a replacement — the session was scoped as one. Roundness and a
broad end stay mutually exclusive, so a poppy stays unreachable.

**`blunt` — the supersession reading.** `petalTipShape` owns the terminal width *and* the
curve; the cap becomes unconditional; the `TIP_PLATEAU` term goes; `petalTipBreadth` is retired
with its three role twins.
*Cost:* **71 rows of the 572-row live matrix name a tip-breadth id and 66 set one non-zero —
the identical counts in `frozen/phase20` (571 rows)**:

| id | rows naming it | rows setting it non-zero |
|---|---|---|
| `petalTipBreadth` | 11 | 8 |
| `allTipBreadth` | 12 | 11 |
| `innerTipBreadth` | 17 | 16 |
| `labellumTipBreadth` | 37 | 36 |

Four ids into `RETIRED_IDS`, three `ROLE_OVERRIDES` rows repointed, and **`frozen/phase20`
joins `frozen/phase17` and `frozen/phase19` as a tag whose row definitions reproduce and whose
bytes do not** (66 of 571). A frozen phase is owed on top, because the new control's gate rows
grow the matrix.
*What it buys:* one apex construction instead of two, no `=== 0` discontinuity, no C0 crossing
corner, and **the state neither shipped control can reach — a broad end approached by a rounded
shoulder**, which is what a poppy is.
*What it gives up:* the spatulate silhouette. Today's high breadths flare 28–61% back out to the
tip; a monotone cap cannot, and will not.

**That last trade is the ruling.** It is an aesthetic question about whether the flare is a
petal shape or an artefact of `max`, and it is not mine to settle from a header.

---

## 4. The dead-control sweep

Run on the **drawn rows**, not on the continuous law — a curve the 28-row sampling cannot
resolve is a control that has stopped responding whatever the arithmetic says. Default petal,
live, worst row movement between adjacent sweep steps:

* **The exponent (both laws) is live across 0.2 → 8.** Smallest step movement anywhere in that
  span is **0.0973 mm** (m 3.5 → 4.0); nothing falls under a twentieth of a millimetre. No dead
  travel, at either end, on either candidate. A shipped range would be narrower than this sweep
  and is therefore live throughout.
* **The blunt law's terminal is live across 0 → 0.60**, smallest step **0.2500 mm** (end 0 →
  0.05). Note what that means against §1b: **the blunt law has no dead zone where the shipped
  control has ten to twenty steps of one**, because its terminal is the cap's own floor rather
  than a term competing with `TIP_HALF_MM`.
* **The proposed default is m = 1.00 on either law, and it is not degenerate.** It is today's
  straight cone, it is the identity, and **nothing else goes inert there**: both taper exponents
  still set `hEntry`, `petalTipBreadth` (if kept) still sets the terminal. This is the check the
  anther's sharpness failed in session 29 — that default sat exactly on the value that made
  roundedness inert for its whole travel — and m = 1 passes it.
* One thing a future session must re-sweep rather than inherit: the exponent's *useful* range
  is bounded by the six rows in the cap, not by the arithmetic. At m = 0.35 the apex already
  puts 56.9% of its narrowing in the final row gap. If a range wider than roughly 0.35 – 4 is
  ever wanted, the row count is the thing to change, not the bound.

---

## 5. What session C needs from this — the upstream contract

It was ruled that round-to-pointed is handled here and not duplicated in lobes. Concretely,
and independently of which candidate Eva picks:

1. **`widthProfile()` stays the ONE owner of "how wide is the blade at u", including the
   apex.** A lobe or tooth treatment consumes `profile.halfWidthAt(u)`; it never re-derives the
   terminal region and never overrides it.
2. **The whole-petal apex is the region `[uCap, 1]`, and its extent is published.** The profile
   object already returns `uCap`, `capEntryHalf`, `capTerminalHalf` and `pointed` for exactly
   this reason. **A lobe treatment that needs to know where the apex begins reads `uCap`; it
   does not pick its own splice.** At the shipping defaults that region is 7.00 mm of a 35 mm
   petal — 6 of 28 rows — so it is not a detail a tooth can be laid over casually.
3. **No second round-to-pointed axis on the whole-petal apex.** PETAL TIP SHAPE owns the shape
   of the blade's terminal region at the petal's own scale. LOBE TIP SHAPE owns a single
   tooth's own apex, an object one to two orders of magnitude smaller. If a lobe control's
   range would visibly change the *petal's* outline at its tip, that is the boundary being
   crossed, and the fix is on the lobe side.
4. **The terminal row is at `u = 1` exactly and is a real, measurable mini-face, never an apex
   vertex.** Topology must not depend on mode (live and export triangle counts are asserted
   equal on every gate row), and collapsing `NV` columns onto one edge is the retired centre
   dome's own bug — 48 degenerate triangles from `cos(PI/2) !== 0`. **A lobe treatment must not
   collapse that face**, in either mode.
5. **Vocabulary.** *PETAL TIP SHAPE* for the whole-petal apex, *LOBE TIP SHAPE* for the
   per-tooth one. Never "tip shape" unqualified — this project has already paid for two
   quantities sharing one word.

---

## 6. The sheet, and what a pixel number on it is worth

`node tools/shot-bloom-apex.mjs <dir> [--rows a,b] [--quick]` — 14 rows, every one rendered
**twice on the same tree at the same camera** as its own control, both frames settled until
three consecutive screenshots are byte-identical. Two views per cell: the blade face-on down
its own normal, and the apex cropped to 11.9 mm across (0.0066 mm/px).

What the app's own emitted rows measure, per candidate — the resolution question of §2b, over
the sheet's seven-row window:

| row | terminal half-width | share of the narrowing in the final row gap |
|---|---|---|
| TODAY / `cap` m 1.00 / `blunt` end 0 m 1.00 | 0.150 mm | 16% |
| `cap` m 0.35 (roundest) | 0.150 mm | **49%** |
| `cap` m 0.50 (round) | 0.150 mm | 38% |
| `cap` m 2.00 (pointed) | 0.150 mm | 3% |
| `cap` m 3.50 (most pointed) | 0.150 mm | 0% |
| `blunt` end 0.30, m 1.00 | 2.400 mm | 17% |
| `blunt` end 0.30, m 0.50 (a rounded truncate) | 2.400 mm | 41% |
| `blunt` end 0.60, m 1.00 | 4.800 mm | 17% |
| shipped `petalTipBreadth` 0.30 | 2.400 mm | *widens 0.13 mm inside the window — undefined* |
| shipped `petalTipBreadth` 0.60 | 4.800 mm | *widens 1.60 mm inside the window — undefined* |

The last two rows are the spatulate finding of §1b restated by the instrument: the shipped
control's high half does not produce an apex that narrows at all.

### THE WHOLE-BLADE FRAMING IS BIMODAL AND CARRIES NO PIXEL BOUND — the sharpest demonstration this project has

The same-tree control across the fourteen rows of the final run:

```
  petal   n=14  min 0  median 0  max 16,033   [0 ×10, 7255, 15507, 15795, 16033]
  tip     n=14  min 0  median 0  max 0        [0 ×14]
```

**And the identity comparison — between two builds proved bit-identical to the float in Node
before any browser opened — read 0 px on one run of this sheet and 7,036 px on the next.** Same
tool, same tree, same camera, same configuration, both sides of the comparison provably the same
geometry. Nothing about the picture changed; the renderer did. A single control sample is
therefore not a floor here in the strongest possible sense: the *identity itself* lands in
either mode.

An earlier pass measured the same thing from the other side — the control read **7,034 / 7,122 px**
under a two-frame settle and **6,461 / 22,311 px** under a three-frame one, so *settling made it
worse*. It is not the camera: a separate probe drove three page sessions at the identical
configuration and got bit-identical framing inputs every time (petal midpoint
`24.705036500, 0, 7.395819580`, normal `-0.422618262, 0, 0.906307787`), all settling at the same
iteration, while two of the three frames came back the same size on disk and the third did not.

**So: the tip crop is the only framing on this sheet that carries a pixel claim**, and there it
is an identity rather than a threshold — `cap` at m = 1 and `blunt` at end 0 / m 1 each differ
from TODAY by **exactly 0 px**, against a control that read 0 px on all fourteen observations.
Every figure from the face-on view is reported, never bounded, and no cell on this sheet is a
whole-bloom framing at all.

### WHAT THE PICTURES SHOW THAT THE NUMBERS DID NOT — an observation, not a ruling

Two cells are worth looking at first, and they are not the ones the numbers predicted.

**`cap` at m = 0.35 does not read as round. It reads as a faceted gable** — the shoulders turn
in at two visible facets and then cut to the mini-face. That is the 49%-in-the-final-row-gap
number made visible: with six rows in the cap and a terminal half-width of 0.150 mm, there is
simply nowhere to draw a curve. The apex gets blunter, which is real, but "rounded" overstates
it at this row count.

**`blunt` at end 0.30, m = 0.50 does read as round** — a broad flat end with genuinely
rounded-off shoulders, which is what a poppy apex looks like. Same exponent, same six rows.

The difference is the terminal width, and in hindsight it is obvious: a shoulder turning
through 2.4 mm of half-width has room to be drawn, one turning through 0.15 mm does not. **So
roundness and a broad end are not merely both wanted — at this row count the broad end is what
makes the roundness legible at all.** That is an argument for `blunt` that neither the costing
nor the sweep produced, and it is the one thing on this sheet I could not have got without
rendering it.

It also bounds what `cap` could ever deliver on its own: if a true rounded apex at a *narrow*
terminal is wanted, the lever is the row count in the cap, not the exponent — a separate and
much larger change (`NU` is 28 for the whole blade and every frozen matrix depends on it).

**One defect in this sheet's own instrument, found by running it and worth not re-learning.**
The cell caption reports what share of the apex's narrowing lands in the final row gap — the
resolution question §2b is about. The first version decided whether a row *narrows* by comparing
the ends of its seven-row window, and the shipped plateau at breadth 0.30 is 0.036 mm lower at
the window's end than at its start while **rising** in the middle of it. So it was called a
narrowing apex and the share printed as **−369%** — a number naming a computation that does not
apply to that row, which is this project's most repeated defect wearing a percentage. The
question is monotonicity across the window, not its endpoints, and it is asked that way now: a
row that widens anywhere inside the window says so and reports no share.

---

## 6b. Gates — what was run, and what it is evidence of

**The predeclared untouched list, verified by `git diff` against `b323268` on the final tree**
(the head of `main` after session 31): `bloom.html`, `bloom.css`, `bloom.js`,
`bloom-geometry.js`, `bloom-registry.js`, `bloom-grid-gltf.js`, `bloom-view-presets.js`,
`tools/bloom-harness.mjs`, `tools/chromium-harness.mjs`, the four bloom verify gates,
`tools/bloom-smoke.mjs`, `tools/diff-bloom-bytes.mjs` and the three instrument tools — **all
UNCHANGED**, as is every `flower*`, `print*`, `plot*`, `cards*`, `artist-tracker*` file and
`.github/`. The session adds exactly two files and edits one: `tools/shot-bloom-apex.mjs`,
`docs/bloom-session-32-outcome.md`, and this repo's `CLAUDE.md` pointer.

**The five bloom gates are inherited by byte-identity, not re-run, and that is deliberate.**
Every input they read is byte-identical to a tree that has already passed them in CI, so
re-running them locally would certify nothing new and duplicate roughly an hour and a half of
runner time — the charter's own rule (*byte-identity to a certified tree IS evidence; re-run
only when you cannot prove the tree unchanged*). What was run instead, as a positive control
that the tree and this environment are sound rather than as a matrix claim:

```
node tools/bloom-smoke.mjs   ->  SMOKE: clean.  export gate PASS on the subset, 211s
                                 R5 mismatches across every row: 0
```

**CI ON THIS PR IS NOT EVIDENCE ABOUT THE BLOOM.** The six bloom workflows are path-filtered on
the bloom source files and their own gate tools by name, so **none of them triggers** on this
diff. The two FLOWER workflows are filtered on `'tools/**'`, so adding a tool runs both of them
— they test flower geometry, and two green `verify` jobs here say nothing about the bloom. That
is the corollary `/print`, `/plot` and `/cards` have each already hit, arriving on a bloom PR
for the first time because this one adds a tool and nothing else.

---

## 8. THE CONFIRM QUESTION — asked before the build, and it changed the design

Eva made the build conditional: *"after `blunt`, is a blade that widens toward the tip still
reachable from widthProfile? … If widening is genuinely gone rather than relocated, say so and
stop."* Her reading was that the widening was a `widthProfile` property smuggled into a
terminal-width control. **That is right, and checking it found a defect in this session's own
phase-A draft.**

**Two different shapes hide under "widens toward the tip", and only one of them goes.**

* **Obovate / spatulate** — the widest point above the middle. Owned by the two taper
  exponents alone: `uPk = a/(a+b)`, which reaches **0.833** at the shipped ranges. `blunt`
  does not touch it. Under the new law, at `a` 3.00 / `b` 0.60 / end 0.60 the widest point
  sits at **80% of the length** with a **widest/base ratio of 4.94×** and a 4.80 mm terminal.
  Reachable, and better than before, because it no longer has to travel through a waist.
* **Pandurate / fiddle** — a waist, then a genuine re-widening to the tip. **This is what
  `petalTipBreadth` uniquely made, and it goes.** Measured across the full shipped taper
  ranges: **0 of 3,795** (a, b) pairs show a rise-after-a-fall above the peak at breadth 0,
  **3,795 of 3,795** do at every breadth above it, and **0 of 3,795** do under `blunt`. It was
  not an edge case; it was the term's signature on every value it had.

**THE DEFECT THE QUESTION FOUND.** Phase A's `blunt` draft floored the whole blade at the
terminal (`Math.max(shape, rootBlend(u), hEnd)` below the cap). That forces a broad-tipped
petal to have a broad **base** — measured **base/tip 1.00** at a 3.00 / b 0.60 / end 0.60,
i.e. the narrow-base half of spatulate destroyed, which would have made Eva's premise false.
The shipped law floors below the cap at the **mode floor**, exactly as it always did, and the
comment at that line says why so it cannot be "simplified" back. Swept afterwards over
**14,364 states** (three petal widths × both modes × six terminals × the taper grid): **0 put
a rise after a fall above the peak**, so the step-up risk that motivated the wrong floor does
not occur anywhere reachable.

## 9. What shipped

### 9a. Two controls, because the ruling rests on the combination

| id | range | default | what it is |
|---|---|---|---|
| `petalTipEnd` | 0 – 0.6, step 0.01 | **0** | how BROAD the blade ends, as a fraction of the max half-width |
| `petalTipShape` | 0.35 – 3.5, step 0.05 | **1.00** | HOW it gets there: 1.00 straight, below rounded, above drawn out |

Separate rows rather than one dial moving both, and the reason is Eva's own: a rounded
shoulder is only legible at a broad end, so "round" and "broad" have to be reachable *together
and apart*. One control coupling them would also be the two-things-in-one-control defect
session 31 retired `antherSharpness` for.

`petalTipEnd` keeps the three role twins its predecessor had — `allTipEnd`, `innerTipEnd`,
`labellumTipEnd`, same roles, same laws, same ranges. `petalTipShape` ships with none, for the
reason the `ROLE_OVERRIDES` header already gives: the set is trimmed and grows on evidence, and
one row there plus one in the registry is always the cost.

### 9b. Four ids retired

`petalTipBreadth`, `allTipBreadth`, `innerTipBreadth`, `labellumTipBreadth` — into
`RETIRED_IDS` with `retiredAt: 32`, `schema: null` (nothing persists a bloom design yet) and a
`why` that carries the measurements above. The name may never come back: a stored 0.30 under
the old name is a waisted spatulate blade and under the new one is a clean truncate.

### 9c. The identity is a construction, and it is measured

`Math.max(0 * halfW, tipFloor)` **is** `tipFloor`; the crossing target
`CAP_ENTRY_FACTOR * Math.max(tipFloor, TIP_HALF_MM)` is `CAP_ENTRY_FACTOR * TIP_HALF_MM` in
both modes; and the interpolant's `m === 1` arm returns `s` itself rather than `1 - (1-s)^1`,
which is **not** `s` in IEEE-754. Measured against a `git worktree` of `b323268`:

```
  12,180 half-widths + every cap field (uCap, capEntryHalf), 0 differ   (Object.is)
     522 half-widths on the CLAW capability rows,             0 differ
```

and photographed: the shipping default rendered on both trees differs by **0 px on both
framings**, against a same-tree control that read 7,036 px on each row of that run.

### 9d. The apex assertion family, A1–A6

The old tip-cap check was a biconditional between the pointed and truncate families; both are
gone, so it is gone. What replaced it is stronger, and the reason is the retired term's own
failure mode: **a waisted blade is watertight, one piece, and has an identical triangle count**,
so both STL gates were blind to it for the whole life of that control.

| | asserts |
|---|---|
| A1 | the cap never widens — entry ≥ terminal |
| A2 | the last emitted row **is** the terminus |
| A3 | never a true apex (the retired centre dome's 48-degenerate-triangle bug) |
| A4 | the terminal is `max(effective petalTipEnd × halfW, mode floor)`, **rebuilt from the state** rather than read off the descriptor — C1's discipline |
| A5 | the apex narrows monotonically: no rise after a fall above the widest row. **The only witness for the retired waist**, and asserted on every row |
| A6 | the cap built at the exponent the **effective** state asks for — the only witness for a shape silently held at 1, which would pass A1–A5 on every row |

A1, A2, A4 and A6 read the **effective** state, not the row's own: `petalTipEnd` is
overridable, so a labellum delta gives descriptor 0's petal a different terminal from the one
the row asked for.

## 10. The dead-control sweep, reported rather than concluded

Every step of both shipped ranges, five petal-width × mode combinations, measured on the
**drawn rows**:

```
  petalTipEnd   (0..0.6 step 0.01, 61 steps, default 0)
    width 16 live  :  1 DEAD 0.01..0.01        · smallest live step 0.0100 mm
    width 16 export: 10 DEAD 0.01..0.10        · smallest live step 0.0800 mm
    width  8 live  :  3 DEAD 0.01..0.03        · smallest live step 0.0100 mm
    width  8 export: 20 DEAD 0.01..0.20        · smallest live step 0.0400 mm
    width 30 live  :  1 DEAD 0.01..0.01        · smallest live step 0.1500 mm

  petalTipShape (0.35..3.5 step 0.05, 64 steps, default 1.00)
    width 16 live  : NO DEAD STEPS · smallest live step 0.0107 mm
    width 16 export: NO DEAD STEPS · smallest live step 0.0073 mm
    width  8 live  : NO DEAD STEPS · smallest live step 0.0074 mm
    width  8 export: NO DEAD STEPS · smallest live step 0.0041 mm
    width 30 live  : NO DEAD STEPS · smallest live step 0.0207 mm

  neither control goes inert anywhere on the other's travel, at any width, in either mode.
```

**`petalTipShape` is clean across its whole declared range and its default 1.00 makes nothing
inert** — which is the check the anther's sharpness failed in session 29, where the default sat
exactly on the value that made roundedness inert for its entire travel.

**`petalTipEnd` has dead travel and it is TOLD, in the read-out, keyed to the shown build.**
Below `floor / halfW` the mode floor IS the terminal. Note what the numbers say: the retired
control had **10 dead steps of 60 in LIVE** at the default width; the replacement has **one**,
because the live floor is 0.15 mm rather than 0.8 mm. The ten remaining dead steps are in
EXPORT, where the floor is the **print floor** doing exactly its job — the same floor that
governs sheet thickness and every other printable feature. The read-out reads the SHOWN build
so it can never print an export number under a live label:

```
  0     ->  a point — the 0.15 mm floor is the whole terminal (live)
  0.01  ->  1% asked — FLOORED at 0.30 mm across (live); every step to 0.02 draws this same tip
  0.05  ->  5% asked — FLOORED at 1.60 mm across (export); every step to 0.10 draws this same tip
  0.30  ->  30% of width — 4.80 mm across (live)
```

**NOT drawn on the track, and costed rather than skipped.** The registry's `cap` mechanism
hatches travel *above* a mark (`stamenSpread`'s saturation); this dead zone is at the *bottom*.
A low-end tick is a new registry field, a change to `applyCaps()`, a new CSS rule and a new
panel-gate route — `/plot`'s density sliders already do exactly this with
`.plot-track--dead`, so the pattern exists and could be ported in a small session. It is not
built here because the read-out already carries the number and the live default has one dead
step.

## 11. The partition

**Predeclared before the captures, derived by evaluating each replacement control's own
registry predicate on each row's state** — not by counting which rows name an id:

```
  frozen/phase20 (571 rows):   45 movers  /  26 inert  /  500 holders
```

**A CORRECTION TO THE PHASE-A NUMBER, which Eva's ruling quotes.** Phase A reported "66 rows
move", counted by *naming* — rows that set a tip-breadth id to a non-zero value. That
overstates it: **21 of those 66 set a non-zero value on a control that is GATED OFF in that
row** (a labellum delta under FAN, an all-petals delta above one whorl, an inner delta under
CONTINUOUS), so they cannot move and land in the INERT class instead. The naming count was the
right thing to predeclare *before* the mechanism was chosen, and the wrong thing to keep once
the rows could be evaluated. The ruling does not turn on it.

Closed by the session-20 three-capture construction, generalised in session 31 for a
rename-with-map: old tree plain, old tree with the four retired ids pinned to **0** (the new
default's image on the old tree), new tree with the four **stripped**.

### THE BYTE CLOSE IS ON `frozen/phase18`, NOT ON THE NEWEST BASELINE — and that is a finding

**`frozen/phase20` and `frozen/phase19` can no longer be byte-re-exported from `main`.** They
were frozen at `8b4c671` and `eb3543f`, both of which predate session 31's retirement of
`antherSharpness` / `stigmaSharpness` — so their rows name controls that the current tree does
not declare, and a plain capture from `b323268` refuses **every one of those rows by design**
(`config did not take: antherSharpness: not in the DOM`). Session 31 could close on phase20
because it *was* that retirement and could pin the ids with `--override`; from any later
session, a plain re-export of phase19 or phase20 is impossible without stripping another
session's retired ids, which makes the capture something other than plain.

**`frozen/phase18` (528 rows at `cb798f6`) is the newest baseline this tree can still replay**
— it names `petalTipBreadth` and neither of session 31's ids — so the byte close runs there.
The partition is **identical in its two interesting classes**: `45 movers / 26 inert / 457
holders` on phase18 against `45 / 26 / 500` on phase20, because every tip-breadth row in
phase20 was already in phase18 and only the holder count grew. That agreement is itself a check
on the predeclaration.

**What this costs, stated rather than absorbed:** `--verify-frozen` still proves every frozen
matrix's row DEFINITIONS deep-equal on every push, and that is unaffected. What is no longer
available from `main` is a plain BYTE re-export of the two newest baselines. The charter's
retention section should say so, and the general remedy — freeze a new phase at every
retirement, so there is always a replayable baseline newer than the last retired id — is
recorded here rather than built.

## 12. A frozen phase IS owed: `frozen/phase21`

The live matrix goes **572 → 582** rows (block 5b gains nine apex rows; the registry's own
min/max sweep gains two for `petalTipShape` and keeps two for `petalTipEnd`), so `phase20` no
longer describes the live matrix and a new baseline is owed at the merge commit.

**`frozen/phase20` also joins `frozen/phase17` and `frozen/phase19` as a tag whose row
definitions still reproduce and whose bytes no longer do** — 45 of its 571 rows. Its
definitions are untouched: all 19 frozen matrices were verified deep-equal to `b323268` after
the change (the retired ids appear in `phase3Matrix` and `phase4Matrix` as bare object keys,
which the panel gate's retired-id scanner correctly reads as identifiers; they are **quoted**
now, which the scanner exempts as literals and which changes no emitted row).

## 13. Gates

Unlike the discovery PR, this one touches bloom source, so **all six bloom workflows trigger**
and the two flower gates run as well (the `tools/**` filter). Run locally before the push:

* `node tools/bloom-smoke.mjs` — **clean**, 53 rows through the real export gate, 219s, with
  A1–A6 live. Its CLAUSE C family census caught both things it exists for on the first run: a
  renamed row, and six assertion families claimed by no smoke row.
* `node tools/verify-bloom-panel.mjs` — see §14.
* the full matrices run in CI on both STL gates, which is the merge criterion.

---

## 7. Standing gaps this session did not touch

* The dead travel on the shipped `petalTipBreadth` (§1b) is a defect **today**, on `main`,
  independent of this session's outcome. If Eva rules `cap` (tip breadth stays), telling it is
  one registry `cap` declaration plus the `applyCaps()` tick that `stamenSpread` already has.
  If she rules `blunt`, it goes with the control.
* The `perDescriptor` dedupe in `buildBloomInto` (RADIAL exports 1 petal of 8) is unchanged and
  still the next known blocker for the grid export — `docs/bloom-session-28-outcome.md`.
