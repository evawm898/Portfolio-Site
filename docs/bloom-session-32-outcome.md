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

## 8. THE `blunt` RULING WAS WITHDRAWN, AND WHAT REPLACED IT

`blunt` was built in full and is recorded in this repository's history; Eva then
withdrew the ruling, on the grounds that it answered the wrong question. What she
ruled instead, from phase C's four-state sheet:

* **The law is the SUPERELLIPSE over `[widest point, 1]`**, exposed as its exponent
  `n` directly, range **0.60 – 2.00**, default **1.00**. It is a
  **REPARAMETERISATION of the existing tip taper, not a control beside it** — the
  existing core already IS that family over that region (RMS 0.005 at the round
  end), and two controls over one region violates the registration rule. `n = 2.00`
  is the ceiling because the ellipse is the roundest state wanted.
* **A terminal-width control is DROPPED.** It was built as `petalTipEnd`, measured,
  and dropped on this ruling. **Terminal width is DEFERRED as a separate shape
  family** — recorded here so it is schedulable rather than forgotten. What it would
  buy, from the phase-B measurements: truncate and rounded-truncate apices (rose,
  poppy), which no other control reaches; what it costs is a second owner over the
  same region as the superellipse unless it is scoped to the terminal alone.
* **The faceting at the round end is a MESH problem, not a law problem**, and the
  law cannot be judged by eye until it is fixed. Rows sit evenly in `u` while the
  outline's curvature concentrates near the tip, so the sampling is sparsest exactly
  where the curve is tightest. **The row COUNT stays fixed and the row POSITIONS
  move** — `NU` must not rise, because `CURL_START_MIN = 1 / NU` is imported by the
  registry as a control bound and changing `NU` silently moves an unrelated curl
  slider's floor.

It lands as three PRs in order: **this one** (the structural prerequisite), a
**sagitta instrument** (zero bytes), and the **law plus redistribution**.

## 9. WHAT THIS PR SHIPS — the structural prerequisite

One apex construction and **no control at all**. `TIP_PLATEAU` is gone; the
converging cap is unconditional and runs to the mode floor along a straight lerp on
every petal. Four ids are retired — `petalTipBreadth` and its three role twins — and
**nothing replaces them**: `petalTipShape` and `petalTipEnd` were stripped entirely,
so the superellipse arrives with no incumbent to fight for ownership of the region.

The live matrix goes **572 → 562 rows**; the registry goes **101 → 97 controls**.

### 9a. The apex family, A2–A6, re-established on the stripped tree

| | asserts |
|---|---|
| A2 | the last emitted row **is** the terminus |
| A3 | never a true apex (the retired centre dome's 48-degenerate-triangle bug) |
| A4 | the terminal is the **mode floor and nothing else**, rebuilt from the mode the builder reported |
| A5 | the apex narrows monotonically — the retired waist's only witness, on every row |
| A6 | the capped rows are **collinear**: the cap is a straight lerp |

**There is no A1, and the mutant table is why** — it read "entry ≥ terminal" off the
descriptor and is vacuous; the proof sits where it used to be in `bloom-harness.mjs`.

**A6 is written to fire when the law changes, deliberately.** The superellipse owns
`[widest point, 1]`, which contains the cap's last fifth, so either the cap is
demoted or it stops being straight — and both should be loud rather than absorbed.

### 9b. What the mutant table found on the stripped tree, re-run rather than inherited

`node tools/verify-bloom-apex-mutants.mjs` — **six mutations, every family fires on
one that names it, silent on the clean tree.** It took three passes, and each failure
was real:

1. **A5 and A6 both reconstructed a row's station from its array index**, which is
   off by however many FOOT rows precede the blade. A5 scanned the wrong region and
   went silent on the mutation it exists for; A6 fired on the clean tree. Fixed by
   emitting `profileU` — the builder's own per-row `u` — and reading it. **The gate
   now refuses to run rather than guess** if it is absent.
2. **The plateau mutation had to be raised to the retired control's OWN maximum
   (0.6) to fire at all**, and that is a finding rather than a tuning: with the cap
   unconditional and its terminal pinned to the mode floor, a re-introduced
   `TIP_PLATEAU` is **mostly masked**. Measured over the four mutant rows — at
   amplitude 0.30 and 0.45 it produces **no waist anywhere**; at 0.60 it produces one
   **on the default taper only**; on taper 0.6 and on the narrowest petal it produces
   none at any amplitude to 0.9. **A5's coverage against "the retired term returns"
   is therefore narrower than it was**, and its stronger witness is `inverted-lerp`,
   which fires it on every row.

---

## 10. THE THREE MEASUREMENTS — reported, not decided

### 10a. THE CAP: it must be demoted, or the law cannot be judged

**What depends on `TIP_CAP_FRACTION` today: two places.** Its own definition
(`bloom-geometry.js:2950`) and one use — `uCap = Math.min(1 - TIP_CAP_FRACTION, lo)`
— plus one sheet caption. The blast radius is as small as it could be.

**With the cap as a SHAPE, the ceiling Eva set is unreachable.** Least-squares fit of
the superellipse to the 28 drawn rows, default petal, live:

| asked `n` | cap as a SHAPE (today) | cap DEMOTED to a floor | no floor at all |
|---|---|---|---|
| 0.600 | reads **0.610** (rms 0.239) | reads 0.600 (rms 0.048) | reads 0.600 (rms 0.000) |
| 1.000 | reads **1.005** (rms 0.054) | reads 1.000 (rms 0.035) | reads 1.000 (rms 0.000) |
| 1.400 | reads **1.360** (rms 0.166) | reads 1.400 (rms 0.035) | reads 1.400 (rms 0.000) |
| 1.725 | reads **1.590** (rms 0.324) | reads 1.725 (rms 0.035) | reads 1.725 (rms 0.000) |
| 2.000 | reads **1.740** (rms 0.432) | reads 2.000 (rms 0.035) | reads 2.000 (rms 0.000) |

Eva's own reading of phase C — n 1.725 falling to 1.585 — reproduces here at 1.590.
**The round half of the range is where the cap does the damage**: it costs 0.005 at
`n` 1.0 and 0.260 at `n` 2.0. Demoted to a print-floor clamp the drawn outline reads
the asked `n` **exactly**, and the residual rms 0.035 is the floor itself pinning the
last row.

**A clamp would bind on very few rows** — it acts only where the law falls below the
printable minimum:

```
  live  : n 0.6: 3 of 28 rows below the 0.15 mm floor · n 1.0: 1 · n 2.0: 1
  export: n 0.6: 7 of 28 rows below the 0.80 mm floor · n 1.0: 2 · n 2.0: 1
```

**The invariants under the demotion are measured in §10d** — this section is the
shape reading only. **The reading is that the cap cannot stay a shape if the
superellipse owns that region; the boundary is not changed here.**

### 10b. THE WIDEST POINT: fixed by construction, with one sampling caveat

**The law holds it exactly.** At `s = 0` the superellipse is `(1 - 0)^(1/n) = 1` for
every `n`, so `h(uPk) = halfW` exactly and `n` never appears in `uPk = a/(a+b)`.

**The DRAWN maximum is fixed on five of six taper pairs and moves by one row on the
sixth** — measured across `n` = 0.60, 0.80, 1.00, 1.40, 2.00:

| taper | `uPk` | drawn widest across the sweep |
|---|---|---|
| 1 / 1.8 | 0.3571 | 0.3571 throughout — **fixed** |
| 1 / 0.6 | 0.6250 | 0.6071 throughout — **fixed** |
| 3 / 0.6 | 0.8333 | 0.8214 throughout — **fixed** |
| 0.3 / 4 | 0.0698 | 0.0714 throughout — **fixed** |
| 2 / 1.1 | 0.6452 | 0.6429 throughout — **fixed** |
| **1 / 4** | **0.2000** | 0.1786, 0.1786, 0.1786, **0.2143, 0.2143** — moves one row |

The mover is `uPk = 0.2000` sitting exactly BETWEEN two stations (5/28 = 0.1786 and
6/28 = 0.2143); which neighbour is taller depends on the curvature either side, and
`n` changes one of them. **That is the sampling, not the law** — the same defect as
the faceting, and the row redistribution should be measured against it too.

### 10c. THE SHOULDER: it appears at `n` < 1.4 and is a right angle by 0.70

The core reaches its peak with slope 0; the superellipse leaves the peak with slope 0
for `n` > 1, −1 at `n` = 1, and **−∞ for `n` < 1**. So the reparameterisation
introduces a corner at the widest point that the current core does not have. Turn
angle of the outline there, in the petal's own millimetres:

| taper (`uPk`) | n 0.60 | 0.70 | 0.80 | 0.90 | 1.00 | 1.40 | 2.00 |
|---|---|---|---|---|---|---|---|
| 1 / 1.8 (0.357) | 88.8° | 85.9° | 76.2° | 50.1° | **19.6°** | 0.2° | 0.0° |
| 2 / 1.1 (0.645) | 89.2° | 87.3° | 81.3° | 63.9° | **32.8°** | 0.4° | 0.0° |
| 3 / 0.6 (0.833) | 89.5° | 88.4° | 85.2° | 76.1° | **53.9°** | 1.2° | 0.0° |

**The shoulder becomes the dominant feature between `n` 0.90 and 0.80** — 50–76° at
0.90, 76–85° at 0.80 — and is within half a degree of a right angle by 0.60. On that
reading **0.60 is well past where the shoulder takes over**, and a floor around 0.85–0.90
is where it stops competing with the tip for attention.

**AND THE DEFAULT IS NOT CORNER-FREE**, which is the part of this measurement that was
not asked for and matters most: at `n` = 1.00 the shoulder is already **19.6° at the
default taper and 53.9° at taper 3 / 0.6**, because the two limbs meet with different
slopes there by construction. Only `n` ≥ ~1.4 is C1. That is a property of the law Eva
approved, not of any implementation of it, and it is a ruling she may want to revisit
before PR THREE builds it.

---

## 10e. THE PARTITION, CLOSED — 45 / 21 / 506 on `frozen/phase21`, exactly as predeclared

Predeclared BEFORE the captures, by evaluating each retired control's own registry predicate
on each row's state against the BASE tree's registry — not by counting which rows name an id:

```
  frozen/phase21 (572 rows @ b323268):  --expect 45/21/506
```

Closed by the session-20 three-capture construction (old plain / old with the four ids pinned
to 0 / new with the four stripped), `--compare … --retirement … --expect 45/21/506`:

```
  byte diff: 572 configs compared
    before: /tmp/bloom-base @ b323268   after: this tree
  45 MOVERS · 21 INERT · 506 HOLDERS
  twin === new on 572 of 572 rows; V1 fired 0, V2 fired 0
  byte diff: PASS — every one of the 45 movers is BIT-IDENTICAL to its twin on the old
  tree, every one of the 506 holders is bit-identical outright, the 21 predeclared inert
  rows named the control and did not move, and the twin moved exactly the movers (V1-V5 held).
```

**The predeclaration was exact in all three classes.** The 21 inert rows are the GATED ones —
a labellum delta under FAN, an all-petals delta above one whorl, an inner delta under
CONTINUOUS — plus `6 layers x allTipBreadth max`, where the control is hidden and inert by
construction. Three rows had their set become EMPTY once the ids were stripped and build the
new default: `petalTipBreadth min (0)`, `petalTipBreadth max (0.6)` and the old
`TIP: truncate (breadth max)` row.

**`frozen/phase21` therefore joins `frozen/phase17` and `frozen/phase19` as a tag whose row
definitions reproduce and whose bytes no longer do — 45 of 572.**

**One instrument note, because the tool caught the session's own bug rather than producing a
plausible answer.** The first run of the third capture was launched with an unexported shell
variable, so `--strip` received an empty list. It did not quietly close a partition over the
rows that happened to apply: it recorded `strip: []`, refused 71 rows BY NAME
(`petalTipBreadth: not in the DOM`), wrote `complete: false`, and the chain stopped. That is
"a harness that sets a config must read it back" applied to the harness's own arguments, and
it is the difference between a re-run and a wrong number in this document.

---

## 11. THE #191 MERGE, VERIFIED RATHER THAN ASSUMED

Eva's instruction was that PR #191 (session 33, margin buckling) merges first and that its
clean auto-merge should be checked rather than taken on trust. Tested by merging its head
into this PR's commit in a throwaway `git worktree` — never in the live tree, because
`git checkout <sha> -- <files>` stages the revert and a stray commit then pushes it:

```
  Auto-merging CLAUDE.md
  CONFLICT (content): Merge conflict in CLAUDE.md
  Auto-merging bloom-geometry.js          <- clean
  Auto-merging docs/bloom-charter.md      <- clean
```

**`bloom-geometry.js` and the charter auto-merge clean, and `CLAUDE.md` does NOT.** #191's own
PR body predicted the first half and not the second. The conflict is one 117-line hunk and it
is **pure adjacency**: both sessions appended a new pointer entry at the same place in the
bloom section. **Neither side is a superset of the other**, so the resolution is BOTH entries
in session order — not a choice between them, which is the trap the squash-merge rule exists
for. Recorded here so whichever session rebases second does not resolve it by preference.

---

## 7. Standing gaps this session did not touch

* The dead travel on the shipped `petalTipBreadth` (§1b) is a defect **today**, on `main`,
  independent of this session's outcome. If Eva rules `cap` (tip breadth stays), telling it is
  one registry `cap` declaration plus the `applyCaps()` tick that `stamenSpread` already has.
  If she rules `blunt`, it goes with the control.
* The `perDescriptor` dedupe in `buildBloomInto` (RADIAL exports 1 petal of 8) is unchanged and
  still the next known blocker for the grid export — `docs/bloom-session-28-outcome.md`.
