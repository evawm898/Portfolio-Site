# The stem's tip plug — closing the bore at the bottom

**Eva's ask, in her words:** *"i want the bottom of the stem when it is a bored
cylinder to still look solid."*

**THE DEFECT.** A hollow stem's bottom was an ANNULUS — watertight, one connected
piece, zero boundary edges, and it reads as a cut length of pipe. On the shipping
preview a 4 mm stem (a 1.0 mm bore under Eva's own `max(0, r − 1.5)` rule, a
1.5 mm wall) shows an open channel at the bottom where the 3 mm solid one reads
as a proper stem end.

**THE FIX.** The root band already closes the bore where the HEAD would otherwise
stand inside it; this closes it where a viewer would otherwise look up it. **One
law, two ends.**

---

## 1. The plug's length is derived from a length, and it is the CONSTANT and not the wall

`tipPlugMm = boreR > 0 ? STEM_MIN_WALL_MM : 0`. A plug as thick as the wall is as
strong in the same sense the wall is, and that thickness is already owned: Eva's
bore rule spends exactly `STEM_MIN_WALL_MM` on the SIDE of the tube at every
diameter above the 3 mm floor. Nothing is typed and no constant is added.

**AND IT IS THE CONSTANT AND NOT `wallMm`, WHICH IS THE NEARER-LOOKING OWNER AND
THE WRONG ONE.** `wallMm` is `outerR - boreR` — a DIFFERENCE, and `a - (a - x)` is
not `x`. At a 3.1 mm diameter it reads **1.4999999999999998** rather than 1.5, so
the plug's length would carry a per-diameter wobble of a few ulp and the crossover
in §3 would be decided on it. That is this file's own recorded **ST5 trap**
(session 43, the fourth instance of its class), refused here rather than repeated.
Eva's rule states the wall as a constant and derives the bore FROM it; the plug
reads the same constant for the same reason.

**A MUTANT FOR IT WAS CONSIDERED AND NOT WRITTEN, with the reason.** Substituting
`outerR - boreR` for the constant moves `voidBottomZ` by ~2e-16 mm — a real byte
change and below every threshold any instrument here has. It is a mutation with no
available witness, so a table row for it would report "the behaviour did not move"
on a live and correct edit. The choice rests on the argument above, not on a red.

---

## 2. The three arms are two, and `endFace` is the one law

`buildStemInto` had three arms — a solid stem, a hollow stem, and the root band —
and the last two differed only in which end was shut. What ships is:

* **`endFace(face, cap, closed, up)`** — an end of the bore is either CLOSED over a
  length (the outer face is a full DISC and the void gets a cap facing into it) or
  OPEN (an annulus between the two walls). **Two call sites**, the top and the
  bottom.
* **the no-void arm** — a capped cylinder, reached either because the bore is zero
  at Eva's floor OR because the two closures meet (§3).

`face` is the tube's ring at that end; `cap` is the VOID's ring there — coincident
with the face when that end is open (the closure's length is exactly 0, so the
ladder lands on the face's own z to the bit) and a closure's length away when shut.

**THE OPEN ARM IS EXERCISED BY THE TOP CALL SITE.** Under the shipped law a hollow
stem's BOTTOM is always closed, so that call never takes the open arm; the TOP one
takes it on every hollow stem without a root band, which is nearly all of them. The
arm is live code reached by one caller rather than a branch nobody runs — which is
the reason to write this as one expression rather than as two shapes that resemble
each other.

**THE VOID'S LADDER COMES FROM THE PLACER, over its own length** — the root band's
own construction generalised. A `z < voidTopZ` filter would decide by the last bit
whether a station an ulp away is kept, and a kept one an ulp from a closure's edge
is a DEGENERATE quad. That also makes the plain hollow stem's inner wall ONE segment
where it used to follow the outer tube's two: the void's extent is not the stem's
extent, so its sampling is not the stem's sampling. When curvature arrives the
placer owes the void a pitch law exactly as it owes the tube one.

---

## 3. The crossover is derived, not special-cased — and the plain `> 0` is the SAFE comparison

Both closures are lengths, so on a short enough stem they MEET and no bore survives.
`voidMm` simply comes out non-positive and the SAME arm a stem at the 3 mm floor
takes runs. There is no third shape and no `if` naming the case.

**WHY A PLAIN `> 0` AND NOT A DERIVED EPSILON — MEASURED RATHER THAN ARGUED.** A
branch on a continuous quantity is this project's most-repeated defect (six recorded
instances), so the margin was swept rather than assumed. Over **3,996,000 reachable
hollow-stem states in BOTH modes** (`stemLength` 1–120 × `stemDiameter` 3–12 step 0.5
× `sheetThickness` 0.6–2.4 step 0.05 × flat / cap / sphere heads at many sizes):

| | |
|---|---|
| states where `voidMm` is exactly 0 | **0** |
| nearest approach to 0 | **0.0999999999999996 mm** (a sphere at sheet 0.60, a 3.5 mm stem, 1 mm long) |

A tenth of a millimetre against a float noise of ~1e-16 — fifteen orders of margin.

**AND THE OBVIOUS "SAFER" ALTERNATIVE IS MEASURABLY WORSE.** A `voidMm >=
MIN_FEATURE_MM` floor looks like the more derived choice (a cavity shorter than the
minimum printable gap is not a cavity a print can have). It would put the boundary
**EXACTLY on a reachable state**: a sphere at sheet 1.50, a 3.5 mm stem, 1 mm long,
whose void is exactly 1.0 mm. **The derived-looking floor is the dangerous one here,
and only the sweep says so.**

---

## 4. Its mode-dependence is INHERITED and not its own

Whether a void exists is TOPOLOGY, and this project has refused mode-dependent
topology four times. Measured over **843,600 control sets built in both modes**:

| | |
|---|---|
| stem topology differs live/export on MAIN's law | **2,400** |
| stem topology differs live/export on the BRANCH's | **2,400** |
| the ROOT BAND's own condition differs live/export | **2,400** |
| mode-dependence the plug ADDS | **0** |
| mode-dependence the plug REMOVES | **0** |

The three sets are **identical**, both directions empty. The cause is
`headInsideBore`, whose `headOuterMm = dome.Rd + hubT/2` reads the accumulator's
floor — so on 2,400 control sets the root band exists in LIVE and not in EXPORT.
**That is pre-existing on `main` and is the BAND's, not the plug's.** `voidMm` is
mode-free wherever the band's condition is, because on a sphere the band IS the join
and the head's thickness cancels out of the difference.

**RECORDED, NOT FIXED, and the brief is why:** "DO NOT change the root band." The
remedy that is already established here is the omission's own — a union over both
modes, which makes a set mode-free by the symmetry of a union — and it would apply
to `headInsideBore` unchanged. It is one condition and its own small PR.

---

## 5. Inert at length 0 and on a solid stem — 0 floats, measured

| state | live | export |
|---|---|---|
| DEFAULTS (no stem) | 0 of 171,360 | 0 of 171,360 |
| `stemLength` 0 × diameter MAX | 0 of 171,360 | 0 of 171,360 |
| `stemLength` 0 × diameter MIN | 0 of 171,360 | 0 of 171,360 |
| SOLID at the floor (3 mm × 60) | 0 of 188,604 | 0 of 188,604 |
| SOLID at the floor × 120 mm | 0 of 188,604 | 0 of 188,604 |
| SPHERE × SOLID at the floor | 0 of 190,260 | 0 of 190,260 |
| SPHERE × length 0 | 0 of 230,112 | 0 of 230,112 |
| **the CONTROL — a hollow 60 × 6 mm stem** | **2,559 of 191,232** | **2,559** |

`Object.is`, over the whole emitted bloom. The control moves and the triangle count
goes 21,248 → 21,148, so the comparison is not vacuous. The no-void arm is the
pre-plug solid arm VERBATIM, so this holds by BRANCH rather than by an argument
about arithmetic.

---

## 6. AND BOTH OF THE PRE-PLUG TUBE'S ANNULI WERE WOUND INWARD

A pre-existing defect on `main`, found while checking this session's own geometry and
corrected in the expression that emits it.

**MEASURED**, on the shipping 60 × 6 mm stem, per face, from the emitted triangles:

| face | mean normal | outward is | verdict |
|---|---|---|---|
| outer wall | radial **+1.000** | radial + | ok |
| inner wall | radial **−1.000** | into the void | ok |
| top annulus (z = 0.600) | n_z **−1.000** | **+z** | **INVERTED** |
| bottom annulus (z = −61.916) | n_z **+1.000** | **−z** | **INVERTED** |

The shell's own signed volume came out **440.64 mm³** against a true **1321.91** —
the outer prism less the bore.

**NOTHING IN THIS PROJECT COULD SEE IT.** `analyzeStl`'s edge census keys each edge
on a SORTED pair (`key(a,b) = a < b ? a+'|'+b : b+'|'+a`), so it is **UNDIRECTED**:
two triangles crossing one edge the SAME way count as a matched pair, `boundary`
stays 0 and `nonManifold` stays 0. O1 asks only for a shell's volume SIGN, and the
outer wall dominates, so +440.64 passes exactly as +1321.91 would. The flood fill,
the degeneracy census and the self-intersection census are all blind for the same
reason: the faces are in the right PLACES. **Found by computing the shell's volume in
closed form and disbelieving the disagreement** — session 35's own route to the
petals' inside-out shells, one solid later.

**THE FIX HAS A WITNESS, because a fix without one is folklore.** `buildStemInto`
folds a DIRECTED-edge census over the triangles it just emitted and ST10 asserts it
is zero. After the correction every face points outward, the shell's volume equals the
closed form to ~1e-12 on every probe state, and **0 of 27 stem rows carry an unmatched
directed edge** (against 22 of 27 on `main`: 192 edges on every hollow row, 96 on the
banded ones, and clean on exactly the four rows with no annulus).

**THE WHOLE-MESH CENSUS IS RECORDED AND NOT BUILT, and what was measured of it is
stated as a partial rather than as a sweep.** Over the 27 stem rows the census is
complete on both trees (22 of 27 faulted on `main`, 0 of 27 on the branch). Over the
rest of `main`'s matrix it was run as a SAMPLE and then STOPPED to free the box for the
gates, so no whole-matrix figure is claimed. What the sample established is the
distinction a whole-mesh clause would have to draw: the flagged rows split into two
kinds and **only one is a fault** — rows with **unmatched** directed edges (a winding
inversion; every one seen was a hollow-stem row, including `stemLength max (120)` and
`ALL MAX`) and rows with **duplicated** edges only (`0 unmatched, N duplicated` — two
by-design closed shells sharing a quantised vertex, which the export contract
explicitly allows; every FRINGE row sampled was of this kind). A clause that did not
separate them would redden rows the contract permits. That is why it is its own
instrument and its own session, and why ST10's census is the STEM's own and says so.

---

## 7. Three gates learned the new geometry, each seen RED first

### 7a. ST10 is the new family, and it is owed because both STL gates are blind

A tube left OPEN at the bottom is a perfectly good closed shell — zero boundary edges,
one connected piece, positive volume, consistent winding — so watertight, connected,
manifold, orientation and the degeneracy census ALL pass on the very defect the clause
exists for. The only thing that changes is what the bottom of the stem LOOKS like,
which is Eva's whole ask, and no gate here looks.

* **EXPECTED:** `STEM_MIN_WALL_MM`, imported — Eva's own stated print requirement, an
  external fact rather than a quantity under test. ST3's precedent exactly: that clause
  imports her 1.5 mm and deliberately does NOT import `stemBoreRadius`.
* **MEASURED:** the rings `buildStemInto` folds over on its way to `acc.quad`, which
  ARE the artefact (session 43's ST2/ST3 lesson).

Five clauses: the plug exists iff there is a bore to close; the crossover as a
biconditional in both directions; the directed census; the plug's own extent off the
emitted rings against Eva's constant; and, where the two closures meet, that no inner
ring was emitted at all.

**ITS DECLARED BLINDNESS:** nothing reads the EXPORTED FILE for the plug. The clause
that would is the bottom face's AREA — and it exists, in the byte tool (§8), which
already holds both streams where ST10 does not.

**MEASURED RED before the geometry existed:** three rows of the export gate, "ST10:
the plan declares nothing about a tip plug", 3 attempted / 0 reached the results.

### 7b. ST1's prediction is read off the VOID and the two ENDS

```
hasVoid ? 2N·bands + 2N + endTris(top closed) + endTris(bottom closed)
        : 2N·bands + 2(N−2)
```
with `endTris(closed) = closed ? 2(N−2) : 2N`. The crossover arrives as `voidMm <= 0`
rather than as a fourth case.

**AND ST1 IS STRUCTURALLY BLIND TO EVERY MUTATION OF THE PLAN'S OWN CLOSURE LENGTHS
— the table said so twice before the claim came off.** ST1 predicts FROM THE PLAN and
compares against the BUILDER, so both of its sides read `voidMm`: a mutation INSIDE the
plan moves the prediction and the emission together. That is not a hole — it is a
builder-against-plan consistency check and says so. What checks the plan's own law is
ST10.

### 7c. ST3 learned that a stem emits no inner ring in TWO cases

A SOLID stem has no bore to ring; a hollow stem whose closures MEET has none LEFT.
Measured red on `SPHERE STEM: THE TWO CLOSURES MEET` — "the emitted stem's narrowest
vertex stands at 5.999999999999999 mm; a hollow stem of outer radius 6 asks for 4.5".
**Nothing is relaxed:** the condition names the geometry that now exists, and it reads
the PLAN's `voidMm` while the measurement stays the BUILDER's, so a builder that
dropped its bore still fires.

### 7d. O1 gained a SECOND declared inward shell, bounded rather than counted

With both ends shut the bore stops being a channel and becomes an **enclosed CAVITY**,
so the stem's boundary has two connected components — an outer surface wound outward
and a cavity wall wound into the void. That is the correct boundary of a solid with a
void in it and it is not avoidable: the inner and outer boundaries of an annulus
genuinely do not touch, so they can only be one welded shell while an END is open.

Measured red on `SPHERE STEM: THE BARE CORNER` — "2 of 4 shells are wound INWARD".
The shells there: 3360 tris (hub outer, +32.95), 3360 (hub inner, −2.07, the declared
sphere exception), **284 at r = 6.000 exactly (+13,668.29)** and **188 at r = 4.500
exactly (−7,517.13)**. On `main` those last two are ONE welded shell of 476 triangles
spanning r 4.5..6.0, welded through the annuli.

**IT IS BOUNDED BY A DIFFERENT OWNER FROM ST10's:** the cavity's volume must equal the
bore's own prism, `poly(boreR) × voidMm`, in closed form from the side count the plan
declares. ST10 asks whether the PLAN's plug is Eva's wall and whether the BUILDER's
rings sit where the plan says; O1 asks whether the EXPORTED FILE's cavity is the size
the plan asked for. Three owners, three questions.

**AND THE PREDICATE WAS CORRECTED BY MEASUREMENT, not by reasoning.** The first cut
declared a cavity wherever the bore survived, and O1 read **"0 of 10 shells are wound
INWARD"** against a baseline of 1 on every FLAT-hub stem. Where there is no root band
the bore is a BLIND HOLE — its wall reaches the top face and welds to the outer shell
through the annulus there, so the stem stays ONE shell. A separate inward shell needs
**both ends shut in the mesh**: `voidMm > 0 && solidBandMm > 0 && tipPlugMm > 0`.

---

## 8. Verification

### 8a. The mutant table

Three new mutants, each witnessed on the MUTATED module's own emitted geometry — the
bottom face's AREA, which is the feature itself rather than a proxy for it.

| mutant | what it does | fires |
|---|---|---|
| `the-tip-plug-is-never-built` | the bore runs to the tip again — a CUT PIPE, watertight and one piece | ST10 |
| `the-tip-plug-is-typed` | a typed 3 mm instead of Eva's wall — the SAME triangle count, so ST1 is blind by construction | ST10 |
| `the-two-closures-are-allowed-to-cross` | `Math.abs` for `Math.max(0, …)`, so the closures cross and a void runs out through the bottom | ST10 |

**A ROW WAS OWED FOR THE THIRD**, without which it is a no-op everywhere:
`Math.max(0, x)` and `Math.abs(x)` are the SAME number for every non-negative x, and
the void is non-negative on every state but the crossover. It fired NOTHING until the
table gained `the two closures MEETING` as a row — `seam-reads-the-live-sheet`'s lesson
one family later.

### 8b. THE TABLE'S OWN DEFECT: a two-digit family was attributed to a one-digit one

`famsOn` captured a family with `/^(ST\d)/` — **ONE digit** — so every `ST10:` message
was recorded as `ST1`. A mutant naming only ST10 reported "fired ST1": SILENT on the
clause it exists for, and CREDITED to a clause that could not have moved. Measured on
`the-tip-plug-is-typed`, whose triangle count is unchanged by construction.

**IT IS A CLASS, NOT AN INCIDENT.** Any family whose code is a PREFIX of a new one is
misattributed the moment the new one exists, in BOTH directions — the new family reads
as silent and the old one reads as having fired, and a green table is exactly what it
looks like. The capture is anchored on the colon now (`/^(ST\d+):/`, and the same for
`A` and `L`), since every assertion message here is `FAMILY: text`. **This is the first
two-digit family in the project, so nothing had exercised it before.**

### 8c. The byte partition

`node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree of 41d7a87> --change plug`

**THE MOVERS ARE PREDECLARED FROM `stemPlan`'S OWN RECORD** — a row moves iff the plan
reports a stem PRESENT with a BORE to close — never from the control set. A stem at or
under the 3 mm floor is a HOLDER; so is every row at `stemLength` 0. Rows where the two
closures MEET are movers, and have to be: the bore they used to carry is gone entirely.

**CLAUSE 2 CARRIES THE CLAIM THE BAND'S COULD NOT.** It keeps the band's two halves
(every differing float inside the stem's own envelope; the outer cylinder wall
bit-identical) and adds **the bottom face's own AREA**: on the base it is the tube's
section `poly(R) − poly(b)`, on the branch a full disc `poly(R)` — a 56% difference at
the widest bore. That clause exists because half (b) DEFINES the wall as the triangles
not all at one height, and the bottom face is exactly the triangles all at one height,
so without it **the one surface this change is about would be the one surface clause 2
had defined itself out of** — the fifth durable rule, and the band's own recorded trap.

**ALL THREE CLAUSES ARE SHOWN ABLE TO FAIL:**

| control | what it perturbs | what fired |
|---|---|---|
| `--control` | one coordinate of every HOLDER by 1e-9 | CLAUSE 1 on both narrowed holders |
| `--control-only` | the first float of a MOVER's stream | CLAUSE 2 on 6 of 6 (mover × mode) builds |
| `--base` pointed at a tree that ALREADY has the plug | nothing — the base's own bottom face | CLAUSE 2(c): "the BASE's bottom face measures 28.1937 mm² at z = −61.9156; the tube's own section is 21.1452" |

---

## 9. What this session did NOT do

* **It did not change the root band, the sphere omission, the bore rule, the stem's
  controls, `STEM_MIN_WALL_MM`, `MIN_FEATURE_MM` or `SHEET_THICKNESS_MM`.**
* **It did not touch the head, the hub, the fringe, or anything above the hub-to-stem
  join.**
* **It did not fix `headInsideBore`'s mode-dependence** (§4) — measured, attributed to
  the band, and out of scope by the brief.
* **It did not build a whole-mesh directed-edge census** (§6) — measured, scoped, and
  its own instrument.
* **It did not touch #236**, `main`'s other reachable one-connected-solid violation
  (the join's flat zero-volume shell where the hub is narrower than the stem). Still
  filed, still open.
