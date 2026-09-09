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

**PHASE A's predeclared untouched list — a statement about the DISCOVERY PR only, kept as the
record of what that tree was.** It is *not* a claim about what this session ships: PR ONE
changes `bloom-geometry.js`, `bloom-registry.js`, `bloom.js` and the harness by design, and its
own list is §9c. Verified by `git diff` against `b323268` on the phase-A tree**
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

### 9c. PR ONE's OWN untouched list, verified on the final tree

Against `origin/main` (`33c1195`, i.e. after #191), on the tree that is being merged — 18 files
changed, +2,423 / −203.

**Changed, all of it in scope:** `bloom-geometry.js` (the apex construction), `bloom-registry.js`
(four ids retired, four rows gone), `bloom.js` (the read-out clause and `petalProfileU`),
`tools/bloom-harness.mjs` (A2–A6, the stripped live matrix, `phase21Matrix()`,
`FROZEN_MATRICES`), `tools/bloom-smoke.mjs`, `tools/diff-bloom-bytes.mjs`,
`tools/verify-bloom-panel.mjs`, six `shot-bloom-*` sheets (retired-id references removed),
`tools/verify-bloom-apex-mutants.mjs` and `tools/shot-bloom-apex.mjs` (new), plus this doc, the
charter and `CLAUDE.md`.

**Untouched, verified by `git diff` on the final tree:** `bloom.html`, `bloom.css`,
`bloom-grid-gltf.js`, `bloom-view-presets.js`, `tools/chromium-harness.mjs`,
`tools/verify-bloom-export.mjs`, `tools/verify-bloom-connectedness.mjs`,
`tools/verify-bloom-grid.mjs`, `tools/bloom-crowding.mjs`, `tools/bloom-plan-coverage.mjs`,
`tools/bloom-solid-angle-coverage.mjs`, `tools/publish-frozen-tags.sh` and #191's
`tools/bloom-wall-thickness.mjs` — **and zero files** under `flower*`, `print*`, `plot*`,
`cards*`, `artist-tracker*` or `.github/`.

**Note the contrast with phase A on CI.** Phase A added a tool and nothing else, so no bloom
workflow triggered. PR ONE changes bloom source, so **all six do** — which is why this one is
merged on CI rather than on inherited byte-identity.

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

## 12. TWO FROZEN-BASELINE DEFECTS THIS PR INTRODUCED — one CI caught, one nothing could

Both are recorded because the second is the interesting one: it had **no row that could go
red**, and it was found only by going looking after the first.

### 12a. TEN FROZEN MATRIX LABELS HAD BEEN EDITED AS PROSE

Retiring `allTipBreadth` turns the live matrix's *"only the Inner trio applies"* into
*"only the Inner pair applies"* — correct, because above one whorl the Inner group really is
now `innerCurl` + `innerCup`. The same sentence also sits inside `phase11Matrix()` through
`phase20Matrix()`, where it is **not prose but DATA**: a verbatim snapshot of that base
commit's own `buildMatrix()`, in which the trio had three members. Editing it there is the
same class of error as editing a checked-in fixture to match new behaviour.

`--verify-frozen phase11` went red on **row 400**, naming both strings. That is the check
working exactly as its header says — *a frozen tag pins ROW DEFINITIONS* — and it is worth
noting the failure was **24 seconds into CI**, not at the end of a 44-minute matrix.

Reverted in the JSON-literal form only (`{"label":"…"`), which cannot reach the live matrix
because that one uses the array form (`['ALL PETALS: …', { … }]`). All twenty baselines then
re-verified against real worktrees of their own base commits: **20 of 20 PASS**.

### 12b. `phase21Matrix()` WAS REGISTERED IN NO CENSUS, AND NOTHING WENT RED

The new baseline this PR owes was written, verified by hand, and **left out of
`FROZEN_BASE_COMMITS` entirely.** It was present in `diff-bloom-bytes.mjs`'s own `FROZEN`
table, so `--verify-frozen --phase21` worked when invoked by hand — which is exactly what made
it look done.

**Both consumers iterate the other map.** CI's frozen-matrices job builds its phase list from
`FROZEN_BASE_COMMITS`; so does `publish-frozen-tags.sh`. An unregistered matrix therefore
means the loop runs one fewer iteration:

* the new baseline is **verified against nothing** — the one property a frozen phase exists to
  have, and
* its base commit is **pinned by no tag**, leaving it one force-push from the orphaning that
  cost `phase10` (session 17).

Neither failure is observable. There is no row to fail, no count that looks wrong, and CI
stays green. This is the registration rule this project keeps re-learning, arriving through a
new door: not two definitions of one predicate, but **one definition with two lists of what it
applies to.**

**The fix is a single owner plus a biconditional, not a line.** The name → matrix map moved out
of `diff-bloom-bytes.mjs` into the harness as `FROZEN_MATRICES` — imported by its consumer
rather than restated — and the harness asserts **at module load** that its keys and
`FROZEN_BASE_COMMITS`' keys agree in both directions: *a matrix with no base commit is
unverifiable; a base commit with no matrix is a phase nobody wrote.* It throws in the harness
so every tool that imports it pays for it, and no gate can be run that skips the census.

**Negative control:** deleting `phase21`'s base entry fires it, naming `phase21` and the
reason; the clean tree loads silently. Measured, not assumed.

`b323268` is on `main` (it is #188's merge), so `phase21` is frozen at a commit on main rather
than at a branch head, as the charter requires.

### 12c. `frozen/phase21` COULD NOT BE PUBLISHED FROM THIS SESSION — session 17's limit, unchanged

`tools/publish-frozen-tags.sh` runs and refuses to publish a partial set. The rejection is the
one already diagnosed in its own header: **a GitHub App token cannot push a tag whose
`.github/workflows` content differs from the default branch's**, and `GITHUB_TOKEN` cannot be
granted `workflow` scope at all. `#191` added 11 lines to
`.github/workflows/bloom-export-watertight.yml` after `b323268`, so `frozen/phase21` is exactly
such a tag.

Measured state of the remote: **18 `frozen/*` tags published**, phases 2–4 and 6–20.
`frozen/phase5` was already absent before this session and is named in the script's own error.
`frozen/phase21` is **not published** and cannot be from here.

Per the script's own asymmetry argument this one is **belt-and-braces, not load-bearing**:
`b323268` is a commit in `main`'s history, so only a force-push to `main` could orphan it, and
the standing remedy Eva ruled for that is **branch protection on `main`**, not a stored
credential. `phase10` — the base that was never on main and whose tag is the only thing keeping
it alive — is published and unaffected.

**What is owed:** one `git push origin refs/tags/frozen/phase21` from a clone whose credentials
are a user's. Nothing in the tree needs changing for it.

---

## 13. THE SAGITTA, MEASURED ON THIS TREE BEFORE THE INSTRUMENT IS BUILT

Taken while PR ONE's matrix gates were in flight, on **this** tree — which is
post-PR-ONE `main`, the tree PR TWO builds on. It is the "report the distribution
before proposing a bound" Eva asked for, arriving early.

**What it measures and what it does not.** This is the **width-profile** sagitta: the outline
in the blade's own `(s, h)` plane, where `s = u × petalLength` is exactly what the row loop
uses. It calls the **real `footRing()` and the real `widthProfile()`** — no approximation of
either, which the earlier phase-A probe could not say. It is **not** the 3D margin sagitta the
shipped instrument will measure (that needs `buildPetalInto`'s own row closures and is PR TWO's
structural change). Over **all 562 live matrix rows × both modes = 1,124 measured profiles, 0
skipped.**

### 13a. THE WORST CHORD ERROR IS AT THE BASE, AND THE APEX IS EXACTLY ZERO

| region | n (intervals) | p50 | p90 | max |
|---|---|---|---|---|
| base, `u ≤ 0.30` | 8,992 | 0.0186 | 0.4025 | **0.6325 mm** |
| middle | 16,860 | 0.0085 | 0.0174 | 0.1580 mm |
| apex, `u ≥ 0.80` | 5,620 | 0.0000 | 0.0000 | **0.0000 mm** |

Whole-profile worst: **0.6325 mm at u = 0.049**, on *SLOT: size ×2.00 saturating (petalLength
60, petalWidth 30) × 2 whorls in step*. **Live and export are identical at the top** (0.6325
both). Of the 1,124 rows, **991 (88.2%) have their worst interval at the base** and 133 in the
middle; **none at the apex.** As a fraction of the local half-width the worst is **45.7%**
(0.3462 mm on 0.758 mm, at u = 0.016, `footDelicacy min`).

**THE APEX ZERO IS NOT GOOD NEWS AND MUST NOT BE READ AS ONE.** It is zero **by construction**:
above `uCap` the profile is a straight lerp to the terminal, and a straight line has no chord
error against its own chords. The instrument's headline number at the apex is therefore
**vacuous today** and becomes meaningful the moment PR THREE curves that region. Anyone reading
a green apex sagitta on `main` as evidence the mesh is fine there has read a tautology.

**Which also says what the visible faceting is.** The "faceted gable" is not chord error along
`u` — there is none. It is the apex **being a straight cone**, plus the slope discontinuity at
`uCap`. That is a *shape* fact, which is why the cap question and the law question are the same
question.

**And the base number is a pre-existing defect with nothing to do with the apex.** 0.6325 mm of
chord error at `u = 0.049` is the root blend collapsing the width over six rows
(`ROOT_BLEND_END = 0.30`) on the widest reachable petal. A bound set from "the observed
distribution" would bind **there**, on geometry this session never touched.

### 13b. WHAT PR THREE'S LAW WILL COST AT UNIFORM ROWS — the prediction that justifies redistribution

Worst interval above `uPk`, EXPORT mode, mm:

| state | n = 0.60 | n = 1.00 | n = 2.00 |
|---|---|---|---|
| DEFAULT `a=1.0 b=1.8 W=16 L=40` | 0.2424 | 0.0333 | 0.1041 |
| WIDEST `W=30` | 0.2728 | 0.0304 | 0.1775 |
| LONGEST `L=60` | 0.3109 | 0.0338 | 0.1102 |
| TAPER MIN `b=0.6` | **0.5881** | 0.1885 | 0.1536 |
| TAPER MAX `b=4.0` | 0.5695 | 0.1097 | 0.0893 |
| LATE PEAK `a=3.0 b=0.6` | 0.0000 | 0.0000 | 0.0000 |

Two readings, neither of them the expected one:

* **The acute end is the expensive one, not the round end.** `n = 0.60` costs 2–6× what
  `n = 2.00` does. The shoulder is a corner, and a corner is what uniform rows follow worst.
* **At `n = 2.00` the worst interval sits at `u ≈ 0.99`** — the last one, where the ellipse
  quadrant's tangent goes vertical. Redistribution has to put rows *there*, which is the
  opposite end from where the eye complains.

### 13c. THE CAP MAKES `n` INERT ON 26 REACHABLE STATES — a dead-control finding, before the control exists

`uCap = min(1 − TIP_CAP_FRACTION, crossing) ≤ 0.80` **always**. The law lives on `[uPk, 1]`. So
wherever `uPk ≥ 0.80` the law's entire domain is inside the straight cap and **`n` does
nothing at all** — not hidden, not clamped, *inert*, with no read-out saying so.

`uPk ≥ 0.80 ⟺ a ≥ 4b`, and over the reachable grid (55 × 69 = **3,795** taper states):

* **26 states (0.69%) make `n` fully inert** — `a ≥ 2.45` against `b ≤ 0.75`.
* **137 more (3.61%) leave the law fewer than two of the 28 row intervals.**
* **Together 163 of 3,795 (4.30%)** give `n` two intervals or fewer.

The LATE PEAK row above is that fact in the table: `0.0000` at every `n` **with** the cap, and
`0.4480 / 0.3590 / 0.2565` with it demoted. **Demoting the cap removes the dead region
outright**, because the law then owns `[uPk, 1]` at every taper. That is a second, independent
argument for the demotion §10a already asked for on the roundness reading — and it is a
measurement, not a preference.

### 13d. ONE THING TO SETTLE BEFORE PR THREE, flagged not decided

The ruling says `n` **default 1.00** and calls the law a *reparameterisation* of the existing
taper. But today's outline above `uPk` is the **core** `u^a(1−u)^b`, and phase A's own finding
was that the core matches this family *at the round end* (RMS 0.005), not at `n = 1`. So
`n = 1.00` is a straight chord from the widest point to the terminal, which is **not** today's
shape — the default would move every shipped petal rather than reproduce it.

That may well be intended: the ruling does say every shipped shape's bytes move under PR THREE
and a frozen phase is owed. But "the continuous surface must be unchanged — prove by sampling
the underlying law densely on both trees" cannot hold for the law change and the redistribution
at once. **Which of the two the identity claim attaches to is Eva's to say**, and it changes
what PR THREE has to prove. Raised here rather than resolved.

---

## 14. THE DEFAULT RULING, MEASURED — and it does not hold together as stated

Eva ruled: *"Measure the n that best reproduces the shipped default taper's core and report it
with its residual. The default is that value, floored at 1.40. The floor is because the two
limbs meet with different slopes for n at or below 1, so only n at or above roughly 1.4 is C1."*

Both halves were measured. **The measurement contradicts the floor's stated reason, and the
floor's own cost is larger than the reshape it was meant to prevent.** Reported, not acted on.

### 14a. A CORRECTION TO MY OWN EARLIER REPORT: the join is C1 for EVERY n > 1

§10c said *"only `n` ≥ ~1.4 is C1"*. **That is wrong, and it is what the floor was built on.**

`uPk` is the core's MAXIMUM, so the core's slope there is exactly 0. The superellipse's slope
is `dy/ds = −s^(n−1)(1−s^n)^(1/n−1)`, whose limit at `s = 0` is **0 for every `n` > 1**, −1 at
`n` = 1, and −∞ below it. So the two limbs meet with the SAME slope — analytically C1 — at any
`n` above 1, not only above 1.4.

What §10c actually measured was the **drawn** turn angle at 28 uniform rows, which is a
different quantity. The approach to that zero slope is what matters, and it is slow (half-width
8 mm, length 40 mm, default taper, slope measured 1e-7 in `u` past the join):

| n | slope just past the join | drawn turn, 28 uniform | drawn turn, 28 by arc length |
|---|---|---|---|
| 0.60 | −10966 | 59.7° at u=0.36 | 37.9° |
| 1.00 | −12.44 | 19.8° at u=0.36 | 16.2° |
| 1.05 | −5.41 | 17.0° at u=0.36 | 14.3° |
| 1.20 | −0.451 | **10.9° at u=0.36** | **9.8°** |
| 1.40 | −0.0168 | 12.5° **at u=0.96** | 13.2° |
| 1.70 | −0.0001 | 20.3° at u=0.96 | 21.3° |
| 2.00 | −0.0000 | 25.5° at u=0.96 | 24.5° |

So the curve is C1 at `n` = 1.05 and still reads as a corner, because it turns through its whole
bend in an infinitesimal neighbourhood of the join. **C1 is not the property that was wanted;
bounded curvature is.**

### 14b. THE DRAWN CORNER IS NON-MONOTONIC IN n, AND THE FLOOR LANDS PAST ITS MINIMUM

The worst drawn turn does not fall as `n` rises. It **moves to the other end of the blade and
grows again**: below `n` ≈ 1.3 the corner is the shoulder at `u` = 0.36; above it the corner is
the TIP at `u` = 0.96, where the ellipse's tangent goes vertical. The minimum is around
**`n` = 1.20 (10.9°)**, and the approved ceiling `n` = 2.00 is the **worst** corner in the table
at 25.5° — worse than `n` = 1.00's shoulder.

**Redistribution does not rescue either end.** Arc-length sampling takes `n` = 1.05 from 17.0°
to 14.3° and `n` = 2.00 from 25.5° to 24.5°. Real improvements, not fixes — so the shoulder and
the tip corner are geometry, not sampling artefacts. That is a useful result for PR THREE: the
redistribution's job is the sagitta, and it should not be expected to remove these.

### 14c. THE BEST FIT, AND WHAT THE FLOOR COSTS

Best-fit `n` for the shipped default taper (`a` 1.0, `b` 1.8), least-squares over `[uPk, 1]`,
both curves pinned to 1 at `s` = 0 and 0 at `s` = 1 so there is no scale freedom:

**best-fit `n` = 1.0519, RMS residual 0.0641** (of a half-width normalised to 1).

Deviation from **today's** core, in mm, on the default 8 mm half-width:

| n | RMS | MAX | where |
|---|---|---|---|
| 1.0000 | 0.5602 mm | 0.9114 mm | u=0.518 |
| **1.0519** (best fit) | **0.5124 mm** | **0.7330 mm** | u=0.880 |
| **1.4000** (the floor) | **1.2964 mm** | **2.0860 mm** | u=0.843 |
| 2.0000 | 2.4498 mm | 3.7496 mm | u=0.851 |

**The floor moves every shipped petal's outline by up to 2.09 mm — 26% of the blade's
half-width, and 2.3× the reshape at `n` = 1.00 that the ruling rejected *for being a
reshape*.** The floor was adopted to avoid silently reshaping every petal and to avoid a corner;
measured, it reshapes them more than the option it replaced, and it does not remove the corner —
it relocates it to the tip at 12.5°.

### 14d. WHAT THE MEASUREMENT ACTUALLY SAYS

**No `n` is both close to today's petal and corner-free.** Today's petal is smooth at `uPk`
because it is one unimodal core across the whole blade; the law splices a different function
onto `[uPk, 1]`, and every choice trades:

* `n` ≈ 1.05 — closest to today (0.73 mm max), 17.0° shoulder.
* `n` = 1.20 — the smallest drawn corner anywhere (10.9°), ~1 mm reshape.
* `n` = 1.40 — the ruling's floor: 2.09 mm reshape AND a 12.5° tip corner.

And the best fit is **not stable across tapers** (0.656 at `a` 0.3/`b` 4.0 up to 1.988 at
`a` 3.0/`b` 0.6): the core is a two-parameter family and the law is one-parameter, so
"reparameterisation" holds only in the best-fit sense at each taper, with the residual as the
honest statement of how well.

**This is Eva's to rule, not the session's to resolve.** The build is held at PR TWO, which is
unaffected.

### 14e. THE REGISTRY LOCK AND PR TWO — compatible, checked rather than assumed

The lock forbids touching `bloom-geometry.js` and `bloom-registry.js` until margin buckling
part 2 lands. The PR TWO design recorded before the lock required factoring `buildPetalInto`'s
blade loop into a named `rowAt(u)` closure — **a geometry change, which the lock forbids.**

Checked: it is not needed. Eva's spec says *"the true continuous **outline**"*, and the outline
is the width profile, whose owners — `widthProfile()`, `footRing()`, `MeshBuilder`,
`TIP_HALF_MM`, `TIP_CAP_HALF_MM`, `TIP_CAP_FRACTION`, `ROOT_BLEND_END`, `CAP_ENTRY_FACTOR` — are
**all already exported**. A tools/-only instrument calls them at arbitrary `u` and computes the
chord-to-curve distance exactly. **PR TWO ships entirely under the lock.**

What that version is BLIND to, and its header will say so: the 3D margin — the drawn edge in
space, carrying spine curl, cup, roll and tilt. That needs the row closure and waits for the
lock to lift. The outline is the quantity the redistribution acts on, so it is the right one
first; it is not the whole picture.

---

## 15. THE SCRATCH RIG — the law rendered, and §14b RETRACTED for the tip

Eva's order: one picture before PR TWO, because every ruling so far had been made on a shape
nobody had rendered. Built as a scratch rig touching no shipped source, with the cap **demoted**
(a print-floor clamp only) — the point of the exercise, since through the cap the asked `n` is not
what is drawn. Artifact: **Petal Apex Law**.

**Three readings.**

1. **The cap was the whole problem.** With it demoted, the **drawn `n` equals the asked `n` to four
   decimals at every value on both tapers** — `2.0000`, not the 1.740 the earlier cell showed. Read
   back by least-squares off the emitted 28-row polyline, not asserted.
2. **The widest point holds** — `u` = 0.538 on Eva's settings across the whole range, with the drawn
   maximum on the nearest row at 0.536. Sampling, not law, exactly as §10b said.
3. **§14b IS RETRACTED FOR THE TIP.** Turning-rate weighting at the **same 28 rows** collapses the
   apex turn **75–83%**: default `n` 2.00 23.6° → 6.0°, `n` 3.00 34.1° → 6.6°; Eva's `n` 3.00
   **34.9° → 6.1°**. Drawn `n` is unchanged at 2.0000 / 2.5000 / 3.0000. **The tip corner is
   sampling, not geometry.** Eva's correction was right and my test was wrong: arc length puts
   *evenly spaced* rows through the one place the outline turns fastest. The shoulder reading at
   low `n` stands — it is a slope discontinuity, which no ladder can resolve.

**THE FIRST TURNING LADDER WAS BROKEN AND SAID THE OPPOSITE**, which is worth recording because the
failure looks like a result. Cumulative turning **STEPS at a kink** — the root-blend join and the
tip-floor join are corners, whose turning is a delta function — so equal increments stacked **5 rows
on `u` = 0.058 and 8 duplicates on `u` = 1.000**, starving the middle, and reported an apex turn of
**84.0°** that was a zero-length segment between two identical stations. It read as "redistribution
makes it 256% worse". The fix is one clause: **count turning only where the law is the active
branch**, plus a strictly-increasing assertion on the ladder. A kink cannot be resolved by row
placement, so spending rows on it is the one thing the weighting must not do.

**AND THE LARGEST DRAWN CORNER ON A REAL PETAL IS NOT AT THE APEX AT ALL.** With the real
`footRing()` ring in play, the whole-blade maximum is **31.9° at `u` = 0.07 on the default taper and
27.2° at `u` = 0.07 on Eva's** — the root blend collapsing width over six rows — and it dominates
until `n` ≥ 2.5. Every apex figure in §15 is therefore measured **restricted to `u` ≥ u_pk**, and is
labelled with its row count and weighting. That restriction is not a detail: §14b's unrestricted
table was computed without a root blend and is not comparable to it.

**What the rig is not:** it draws the blade's own outline — the half-width profile, which is what
the row positions act on and what a face-on petal's silhouette is. No spine curl, cup, roll or tilt,
and **no export**: watertight and connectedness under a demoted cap remain PR THREE's to prove on a
real run.

---

## 16. EVA'S RULING ON THE SHEET — the final range, the default, and what PR THREE owes

Ruled from the rendered cells, which is the point of §15 having been built at all.

### 16a. THE RANGE IS 0.60 – 3.00, AND THE DEFAULT IS n = 2.50

The ceiling moves from 2.00 to **3.00**; the floor stays **0.60**; the default is **2.50**,
chosen **by eye** because it holds the blade's width past the widest point and then turns — the
shape in the hand-drawn reference, and one **nothing on the shipped control could reach**.

**THE SIX STATES, IN EVA'S OWN WORDS.** These names are the ruling, not a gloss: the panel's
read-out, the contact sheet's captions and this doc must all use them, so the control and the
person operating it speak one language.

| n | what it is |
|---|---|
| **0.60** | acute |
| **1.00** | straight point |
| **≈ 1.20** | today's pointed petal |
| **2.00** | the true ellipse |
| **2.50** | **the default** — holds width past the widest point, then turns |
| **3.00** | the held-width round tip (the ceiling) |

The pointed look at `n` ≈ 1.20 **must stay reachable** — ruled explicitly — and the acute end
below 1.00 stays in range as originally ruled.

**THE RESHAPE-FROM-TODAY ARGUMENT IS FORMALLY DEAD.** §14c measured the floor at 1.40 costing
2.09 mm against today's core and treated that as a cost; it is not one. The default moves the
shape deliberately and substantially — *that is the point* — and nothing here is published or
printed, with no library of saved configurations, so proximity to today's petal buys nothing. Do
not re-raise it.

### 16b. TURNING-RATE REDISTRIBUTION IS A DELIVERABLE, NOT AN OPTIMISATION

The chosen default sits **where the apex turn is largest**: 29.6° at `n` 2.50 and 34.1° at 3.00,
uniform-in-`u`, 28 rows. §15 measured turning-rate weighting collapsing that **75–83% at the same
row count with the drawn `n` unchanged**. **PR THREE ships it.**

Two things carry forward verbatim: the clause that **counts turning only where the law is the
active branch**, and **the note saying why** — a kink's turning is a delta function, and
integrating through it stacked 5 rows on `u` = 0.058 and 8 duplicates on `u` = 1.000. It is the
**third instance of this bug class** in the project and the note is what stops a fourth.

### 16c. CAP DEMOTION IS CONFIRMED REQUIRED — and the reason is now the default itself

Not a preference: **the chosen default is not reachable through the cap at all.** With the cap in
place an asked 2.50 does not draw 2.50. It stays conditional on exactly one thing — the
**connectedness and watertight invariants surviving a real export run**, which **PR THREE must
prove rather than argue**. If they do not survive, stop and report.

### 16d. THE ROOT BLEND IS ITS OWN SESSION — do not fold it into PR THREE

§15 found the largest drawn corner on a real petal is **the root blend at `u` ≈ 0.07 — 31.9° on
the default taper, 27.2° on Eva's** — exceeding the apex until `n` reaches 2.5. **Scheduled as its
own session, with that measurement attached.** It is not PR THREE's: **one owner per boundary, and
that boundary belongs to `footRing()`.** Folding a root-blend fix into an apex PR would put two
owners on one profile, which is the registration rule this project keeps re-learning.

### 16e. WHAT THE FINAL CONTACT SHEET MUST SHOW

The full range **0.60 through 3.00**, at **Eva's settings and at the shipped default taper**,
**with turning-rate weighting in place**. Every cell prints: asked `n`, drawn `n`, the widest
point, the **apex turn with its row count and weighting named**, and the **last six half-widths**.
**Each of the named states above appears as its own labelled cell.**

### 16f. STANDING, UNCHANGED

* The verification claim **splits across two commits with two separate proofs** — the law (surface
  changes; drawn `n` matches asked `n` across the range) and the redistribution (surface unchanged;
  dense sampling of the law agreeing on both trees). Never one proof spanning both.
* The **shoulder is approved as a property of the law**, with its turn angle printed per cell.
* The **sagitta instrument's header states that 0.6325 mm is base-driven** root-blend chord error
  and is **not** the bound the redistribution aims at; the apex bound is set after the law lands,
  from the post-law distribution.
* **PR TWO is tools/-only and proceeds under the registry lock. PR THREE waits for the lock.**

---

## 7. Standing gaps this session did not touch

* The dead travel on the shipped `petalTipBreadth` (§1b) is a defect **today**, on `main`,
  independent of this session's outcome. If Eva rules `cap` (tip breadth stays), telling it is
  one registry `cap` declaration plus the `applyCaps()` tick that `stamenSpread` already has.
  If she rules `blunt`, it goes with the control.
* The `perDescriptor` dedupe in `buildBloomInto` (RADIAL exports 1 petal of 8) is unchanged and
  still the next known blocker for the grid export — `docs/bloom-session-28-outcome.md`.


---

## 17. PR THREE — the law, the cap demotion and the turning ladder (shipped)

Rebased onto `7544796` (main's head with margin buckling merged as `5ab3458`
and its outcome doc on top). The CLAUDE.md conflict Eva expected did not
arise: PR ONE and PR TWO were already merged, so this branch carried nothing
main lacked, and both sessions' pointer entries were verified present on main
before starting rather than assumed.

### 17a. The redistribution earns its place at 56 — measured, not assumed

Eva's instruction was to check before building, and to say plainly if the gap
had collapsed. It has not.

**Apex turn, past the widest point. Row count and weighting named on every
figure**, per the standing rule:

| | n 1.20 | n 2.00 | n 2.50 | n 3.00 |
|---|---|---|---|---|
| Eva's, 28 rows uniform-in-u | 4.8° | 23.7° | 30.0° | 34.9° |
| Eva's, 56 rows uniform-in-u | 5.0° | 19.0° | 22.6° | 25.3° |
| Eva's, 56 rows turning-rate | 14.6° | 5.5° | 11.8° | 14.2° |
| default, 28 rows uniform-in-u | 12.4° | 23.6° | **29.6°** | 34.1° |
| default, 56 rows uniform-in-u | 9.7° | 19.6° | 23.0° | 25.4° |
| default, 56 rows turning-rate | 15.4° | 7.6° | 13.6° | 15.2° |

The 28-row default column reproduces Eva's own recorded 29.6° at 2.50 and
34.1° at 3.00, which is the check that the rig is measuring the same thing
she was.

**Apex chord error (main's own `sagittaOf`), which is the criterion**:

| | 28 uniform | 56 uniform | 56 turning | ratio |
|---|---|---|---|---|
| Eva's, n 2.50 | 0.3525 | 0.1752 | 0.0469 | 3.74x |
| Eva's, n 3.00 | 0.4325 | 0.2156 | 0.0777 | 2.77x |
| default, n 2.50 | 0.3682 | 0.1844 | 0.0604 | 3.05x |
| default, n 3.00 | 0.4539 | 0.2276 | 0.0891 | 2.56x |

Doubling the row count halved the error; the weighting takes another 3-4x on
top of that, at the ruled default. Over 9 tapers x 8 exponents the worst apex
chord error falls **0.2423 -> 0.1025 mm, 2.36x**.

**THE APEX TURN ANGLE IS NOT THE CRITERION AND CANNOT BE.** It is
discontinuous in row placement — the same outline reads 65.7° or 10.6°
depending on where a row happens to land — so it bounds nothing. The sagitta
is continuous, which is why Eva's ruling that acceptance is the sagitta
instrument's is the right one. At n 1.20 the ladder's turn goes *up* (5.0° ->
14.6°) while its sagitta goes *down* (0.0696 -> 0.0532): that is the tip-floor
join being resolved rather than smeared across two long chords.

### 17b. The ladder competes with margin buckling for the same 56 rows

Not theoretical, and not something the previous session could have known: it
was measured against the merged tree.

Margin buckling's frequency ceiling is `NU / BUCKLE_ROWS_PER_CYCLE_MIN`,
asserted at harness module load. **That is a claim about row SPACING expressed
as row COUNT** — true of a uniform ladder and false of any other. Measured, an
unbounded ladder at maximum amplitude:

| f | buckle chord error, 56 uniform | 56 turning, unbounded |
|---|---|---|
| 3 | 0.1843 mm | 0.0971 mm (better) |
| 5 | 0.2179 mm | 0.2492 mm (**worse**) |
| 7 | 0.2808 mm | 0.5626 mm (**double**) |

**AND UNIFORM UNIQUELY MAXIMISES THE MINIMUM LOCAL ROWS-PER-CYCLE**, so no
bound can restore the bar: any redistribution lowers it. Two candidate fixes
were measured, and neither is clean alone — a gap bound derived from the
buckle's own constants fails at f 5, and folding the wave into the turning
measure fails at f 7, where 56 rows over 7 cycles leaves no slack at all.

**WHAT SHIPS IS BOTH**, and it is clean at every frequency: the measure counts
the margin wave's own turning (so the buckle buys its own rows), and the gap
bound is `NU / (BUCKLE_ROWS_PER_CYCLE_MIN * f)`, which is **exactly 1 — i.e.
uniform — at the ceiling**. Measured: the buckle never regresses at any
frequency, improves at every f <= 5, and at f 7 the ladder is bit-identical to
uniform, so the apex keeps today's faceting there. That is the honest trade at
the one corner where the two features cannot both be served, and it is a
matrix row rather than an argument.

At the shipping default the buckle is flat, so the bound does not bind and the
full apex gain lands: 3.74x on Eva's settings, 3.05x on the default taper.

### 17c. The root blend is not touched, by construction

Every station below `ROOT_BLEND_END` keeps its uniform value **exactly**, so
the base's chord error is identical at every exponent and every taper (0.1023
mm and 0.1293 mm on the two reference tapers, unchanged across 16 states).
A7 asserts it as a bit identity. That boundary belongs to `footRing()` and is
scheduled as its own session; a tip control must not resample it.

It also keeps `CURL_START_MIN = 1 / NU` meaning what it says: the first blade
row is still at `1/NU`, because it is one of the held ones.

**After the redistribution the worst chord error on the blade is the root
blend's, at every exponent.** That is §13's finding arriving as the new
ceiling, and it is the scheduled session's to fix.

### 17d. Three cautions, each discharged by measurement

**Second independent copies of a predicate.** The ladder needs to know where
the law is the active branch, and the first version answered that with its own
copy of `widthProfile()`'s `max` — exactly the `FORM_IDS` shape. It is now
`profile.lawIsActiveAt()`, declared beside the `max` it is about, with the
ladder as its one caller. Separately: `petalTipShape` correctly does NOT join
`FORM_IDS` (it is a width-profile control, not a form one), and that was
verified by building rather than reasoned — `petalFormIsFlat` stays true with
the exponent at its extreme.

**The house block format.** Block 28 was written in the parsed form and the
census was then *run*: it fired by name — `DRIFT: matrix block 28 ... has NO
smoke row` — which is the guard doing its job and the evidence that the block
is visible.

**Prove a new smoke row can fail.** The mutant table found **four real
problems** on its first run, all of them the session's own:

1. `plateau-returns` reported **MUTATION DID NOT APPLY** — the law moved its
   find-string. Session 34's lesson arriving verbatim, and the one failure
   mode that makes a disarmed mutant survivable.
2. `ladder-eats-the-base` over-claimed A8. With the held count at 0 the gap
   bound is still respected, so A8 is *right* not to fire. The claim was
   corrected, not the check.
3. `stations-not-increasing` was silent because the de-duplication pass never
   fires on an unbuckled row — measured over 288 states, zero. It fires at
   amplitude 0.6, f 1; but the row first chosen saturated only in EXPORT mode,
   and `__bloomMetrics()` reports the LIVE build, so the mutation stayed
   invisible. Amplitude 0.30 at f 1 and exponent 1.00 saturates in live.
4. `ladder-ignores-the-buckle` was silent because no mutant row carried a
   buckle at all.

And then a fifth, which the corrected table exposed: **A6 fired on the clean
tree.** It read the peak as the largest *emitted* row, and the ladder does not
guarantee a row near `uPk` — 7.9936 mm against a true 8.0000, enough to read
an asked 1.50 as 1.5014. The peak is now declared by the builder
(`tipCap.peakHalf`). Reading the sampling as if it were the geometry, again.

The table now passes: every family fires on a mutation that names it and is
silent on the clean tree.

### 17e. The two proofs, kept separate as ruled

**The law** (surface deliberately changes): drawn n equals asked n, read off
the emitted polyline, worst **8.88e-16** over 32 states. Fitted on the ACTIVE
BRANCH ONLY — fitting through the print floor biases an asked 0.60 to 0.6080,
the fourth instance of this bug class here.

**The redistribution** (surface unchanged): with the ladder forced uniform,
**0 of 4,112,640 floats moved** against commit one, with a positive control
detecting 134,280 at a 1e-9 perturbation; and 4,800,024 dense samples of the
continuous law agreeing at exactly **0.00e+0 mm**. Same surface, different
sampling.

`frozen/phase23` is the 596 rows at `7544796`. It is 23 and not 22 because
phase22 is margin buckling's own baseline — the `FROZEN_MATRICES` census added
in PR ONE caught the collision at module load, by name.


### 17f. Three gates were asserting the OLD sampling, and the smoke run found them

The ladder does not only have to be right; every instrument that had quietly
assumed evenly-spaced rows has to be found. Running `bloom-smoke --conn`
before pushing is what surfaced them, and all three are the same defect —
a SECOND, INDEPENDENT statement of where the blade rows sit.

**C1 reconstructed the station as `(i + 1) / n`.** It fired on every
continuous row at 5.8e-1 mm, reporting *"the controls were read but the spine
did not follow them"* about a spine that was perfectly correct. The builder
now emits `spine.rowU` and C1 reads it, refusing to run rather than guessing
— session 32's own A5/A6 repair, on the same class of defect.

**`verify-bloom-grid.mjs`'s clause 3 asserted the rows were uniform in u**, in
two places. That is not a property of the export any more; what replaced it is
stronger, because it pins the file to the builder rather than to a formula —
the count, the first row at exactly 0, strictly increasing stations ending at
1, and the declared list agreeing with the emitted v-lines. `/plot` reads a
point's station off that list rather than from its index, so a list that
disagreed would silently misplace every bend on a warped petal.

**And `spineLaw().at()` was `Math.round(s / ds)` — a SNAP to the nearest
tabulated substep.** That is exact when and only when every station is
substep-aligned, which uniform blade rows always were (`(i/NU)*length` is
substep `i*SPINE_SUBSTEPS` exactly — verified, 0 of 56 stations land off-grid).
The ladder moved rows off that grid and the snap became a real error of up to
`ds/2`, measured at 8.8e-3 mm.

**That last one is a GEOMETRY defect and not a gate defect**, which is why it
matters most: `generalSpine` — any curl bias or start — is the one arm of the
builder that evaluates `at()` rather than the closed-form arc, so a snapped
lookup would have quantised those rows' own centreline to the substep grid.
`at()` now advances the remaining fraction of a substep along the same arc
construction the table is built with: it agrees with the closed-form arc to
**1.78e-14 mm** at off-grid stations, and returns the tabulated value
bit-for-bit at `f = 0`, so nothing substep-aligned moves. Commit two's proof
was re-run with bias/start rows included and still reads **0 of 8,225,280
floats moved**.

The buckle ceiling's own rationale in the harness now says that counting is
not sufficient on its own — that it is a claim about row SPACING written as
row COUNT, and that `ladderGapFactor()` plus A8 are what keep it honest.


### 17g. THE WALL INSTRUMENT GOES RED AT EVA'S DEFAULT, AND IT IS THIS PR'S

CI failed on `tools/bloom-wall-thickness.mjs` (session 34's instrument), five
assertions across V4 (normal) and V5 (self-approach). **Main is completely
clean** — all five validity checks pass there, `p=6` reads 0.090 mm against a
0.12 mm bar and cup 1.2 reads 1.031 mm against the 1.00 mm printable gap — so
this is not pre-existing, not a flake, and not the base branch's.

**It is not the ladder, and it is not the surface normal.** Both were checked
before concluding:

- A raw central difference `Pb - Pa` is not a tangent on a non-uniform grid —
  it is the secant, which skews toward the longer half-interval. That is a
  real defect and is fixed (the second-order non-uniform difference, with the
  equal-spacing case kept as its own branch so every un-redistributed build
  stays byte-identical — measured, 0 of 1,370,880 floats). But it moved the
  number by 0.002 mm. **It was not the cause.**
- With the ladder forced uniform in a worktree, two of the three V4 failures
  and the cup-1.2 V5 failure disappear — but `p=6` still fails at 0.228 mm.
  So the ladder is not the cause either.

**IT IS THE LAW'S DEFAULT, and the relationship is monotone in the exponent:**

| `n` | cup 1.2 SELF | `p=6` wall | failing assertions |
|---|---|---|---|
| 1.20 | 1.031 | 1.128 | 1 |
| 1.70 | 1.031 | 1.104 | **0** |
| 2.00 | 1.019 | 1.055 | 1 |
| **2.50 (ruled default)** | **0.977** | **0.918** | **5** |
| 3.00 | 0.832 | 0.855 | 10 |

The mechanism is the shape itself, and it is exactly what the default was
chosen for: n 2.50 **holds the blade's width past the widest point**, so a
cupped or buckled sheet carries more material near the tip and comes closer to
itself. The clearance the old pointed tip had was a by-product of being narrow
there.

**This is a print-safety finding and it is Eva's to rule on, not the session's
to tune around.** The three options, with their numbers:

1. **Accept it.** The 1.00 mm gap is itself an unprinted guess — every floor
   in this project is (the charter says so in its own Printing section, and
   the parked cantilever coupon is what would settle it). 0.977 mm is 2.3%
   under a bar nobody has measured against a printer.
2. **Move the default down.** 1.70 is entirely clean on this instrument; 2.00
   fails one assertion. Both give up the shape Eva picked by eye, and the
   reshape-from-today argument is formally dead, so this is a real loss.
3. **Track it as an xfail with a number**, the treatment session 33 gave its
   own composition row — which is already a declared pre-existing self-approach
   in this same instrument.

Nothing was weakened to clear the red, and no assertion was touched. The
normal fix ships because it is correct on its own terms; the red stands until
the ruling.


---

## 18. THE DEFAULT IS 1.70 (Eva's ruling from the sheet)

The range does **not** change — it stays 0.60 to 3.00, so 2.50 remains fully
reachable and is still Eva's preferred *look*. What moved is only which value
ships. The law, the ladder, the cap demotion and both commits' proofs all
stand; every number below was re-established at the new default rather than
carried forward.

**The wall instrument is clean at 1.70** — exit 0, all five validity checks
passing, only the three declared pre-existing xfails still failing as expected.
`SHIPPED cup 1.2` reads **1.031 mm** against the 1.00 mm gap (3% of headroom)
and `buckle p=6` reads **0.108 mm** against the 0.12 mm bar. Nothing in that
instrument was touched to get there.

**The redistribution's value, corrected — and the correction is the finding.**
Every ratio this session reported before now (3.74x / 3.05x at 2.50, then
5.84x / 5.04x at 1.70) was measured in **LIVE** mode and quoted without naming
the mode. The exported object's numbers are smaller. Mode named on every
figure from here, which is this project's own rule and was broken:

| taper | mode | 28 uniform-in-u | 56 uniform-in-u | 56 turning-rate | ratio |
|---|---|---|---|---|---|
| Eva's reference | live | 0.1612 | 0.0732 | 0.0330 mm | 2.22x |
| Eva's reference | **export** | 0.1655 | 0.1609 | **0.1118 mm** | **1.44x** |
| default taper | live | 0.1608 | 0.0732 | 0.0352 mm | 2.08x |
| default taper | **export** | 0.1812 | 0.1693 | **0.1054 mm** | **1.61x** |

The base chord error is **identical** — 0.1023 and 0.1293 mm, unchanged by the
ladder, as A7 asserts.

**In EXPORT the row count alone did almost nothing** (0.1655 → 0.1609 on Eva's
taper): the export floor truncates the tip, so doubling rows buys the apex
little there and the ladder is the only lever that moves it. That is the
opposite of the live-mode reading, where 28 → 56 halved the error.

Re-established at the new default: commit one's proof (drawn n equals asked n,
worst **8.88e-16** over 32 states); commit two's proof (**0 of 8,225,280**
floats moved with the ladder forced uniform, positive control detecting
134,280 at 1e-9; **9,600,048** dense samples agreeing at exactly 0.00e+0 mm);
the mutant table (every family fires on a mutation naming it, silent on the
clean tree). Triangles unchanged: 19,040 live and export, 929.8 KB.

**The read-out does not call 1.70 a named state, because it is not one.** The
six names are the ruling and the panel speaks them, but 1.70 sits between the
pointed petal and the true ellipse and the read-out says exactly that. Rounding
it to the nearer anchor would be the panel claiming a shape the geometry is not
drawing.

**The contact sheet was not re-rendered** (it does not need to be — the cells
are per-exponent and the law did not move). The cell labelled as the default is
now **n = 1.70**, and **2.50 remains in range as Eva's preferred look rather
than the shipped default**. The artifact carries that annotation.

### 18a. A REACHABLE COMBINATION THE GATE DOES NOT COVER

**At high `n` combined with high cup, a petal self-approaches below the 1.00 mm
printable gap.** Measured, `SHIPPED cup 1.2`:

| `n` | cup 1.2 self-approach | `p=6` wall | failing assertions |
|---|---|---|---|
| 1.20 | 1.031 mm | 1.128 | 1 |
| **1.70 (shipped)** | **1.031 mm** | **1.104** | **0** |
| 2.00 | 1.019 mm | 1.055 | 1 |
| 2.50 | 0.977 mm | 0.918 | 5 |
| 3.00 | 0.832 mm | 0.855 | 10 |

Monotone in `n`. **This is the same class as session 34's composition
finding**: self-approach arising from two shape controls both pushed, with no
closed form in the individual parameters. Neither control alone does it — the
shipped default at cup 1.2 clears the gap, and `n` 2.50 on an uncupped blade
clears it too.

**IT IS A COMBINATION A USER CAN SELECT AND THE GATE DOES NOT COVER**, and that
is stated here plainly rather than mitigated. The reason is structural: the
matrix varies **one control at a time**, so a hazard that only exists in a
product of two settings is invisible to it by construction. The wall
instrument's rows are the same shape — one axis each, plus the handful of
compositions session 34 wrote down by hand.

**No range limit, no clamp and no warning dialog was added.** Narrowing the
range would remove states Eva ruled reachable, on the strength of a threshold
that is itself a guess (below). This is recorded so a later session can decide
whether a COMBINATION GATE — a small predeclared set of two-control products
run through the wall instrument — is worth building. That is the schedulable
item; nothing here pre-empts it.

### 18b. THE 1.00 mm PRINTABLE GAP IS AN UNVALIDATED CONSTANT

Recorded once, where it can be seen rather than assumed: **nothing in this
project has ever been printed.** `MIN_FEATURE_MM`, the 1.00 mm minimum
printable gap, the 1.20 mm sheet floor, the 1.60 mm foot width, the roll and
spine curvature floors and the 0.50 mm tip waist are all **declared guesses**,
carried forward from SLS PA12 datasheet figures and from reasoning, never from
a coupon that came out of a machine.

**That is not a reason to weaken any of them.** A guessed threshold enforced
consistently is what turns a class of defect into something a gate can catch;
an unenforced one becomes folklore within two sessions (session 34's own
ruling). The wall instrument's V5 was correctly refused a loosening in this
session for exactly that reason, and the refusal is why the gate meant
anything when it went red.

**It is a reason the parked cantilever coupon matters.** Every number above —
including the 2.3% by which `n` 2.50 at cup 1.2 misses the bar — is a
comparison against an unmeasured constant, so the honest reading of §18a is
"this combination crosses a line we drew ourselves", not "this combination will
fail on a printer". One printed coupon converts the whole family of floors from
guesses into measurements, and would let §18a's table be read as a real
buildability limit rather than a self-imposed one.


### 18c. THE LADDER IS NOT UNIFORMLY BETTER, AND THAT WAS NOT REPORTED BEFORE

Measured over 9 tapers x 9 exponents, mode named:

| | apex better | apex WORSE | worst apex over all states | whole-blade worst REGRESSES |
|---|---|---|---|---|
| **export** (the object) | 52 of 81 | **23 of 81** | 0.3952 → 0.2147 mm (1.84x) | **4 states**, by up to 0.0361 mm |
| live (the preview) | 56 of 81 | 25 of 81 | 0.3952 → 0.1319 mm (3.00x) | 1 state, by 0.0110 mm |

Most of the 23 do not matter — they are states where the apex error was already
far below the base kink, so the blade's worst chord is unchanged. **The four
that do are these**, all EXPORT:

| taper | uPk | `n` | uniform | ladder |
|---|---|---|---|---|
| 3 / 0.6 | 0.833 | 1.00 | 0.1786 | **0.2147 mm** |
| 3 / 0.6 | 0.833 | 1.70 | 0.0658 | 0.0661 mm |
| 2 / 1 | 0.667 | 1.00 | 0.0877 | **0.1149 mm** |
| 2 / 1 | 0.667 | 1.20 | 0.0862 | **0.1197 mm** |

All four are **spatulate** tapers — the widest point far out at u 0.67–0.83 —
at a low exponent. Neither the shipped default taper (1/1.8) nor Eva's
reference (0.7/0.6) is among them.

**So the honest summary is: the ladder improves the worst case on the object by
1.84x and makes 23 of 81 states worse at the apex, four of them enough to move
the blade's worst chord.** That is a materially different trade from the one
reported when the ruling to ship it was made, and the difference is entirely
this session's error — a live-mode ratio quoted as if it were the object's.

**It is NOT resolved here.** Two options, neither taken without a ruling:
ship as measured (a better worst case, some states worse); or gate the ladder
per state so it can never be worse than uniform — blend toward uniform until
the emitted chord error is no larger, which is new design work rather than a
tuning constant, and would need its own witness.