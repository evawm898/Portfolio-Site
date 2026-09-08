# Session 33 — margin buckling, part 1: the normal and the instrument

Read this before touching `buckleIsFlat`, `buckleLaw`, `trueNormalRows` in `buildPetalInto` or `tools/bloom-wall-thickness.mjs`.

**Nothing visual changed and no control shipped.** This session lands the displacement
field, the surface normal it needs, and the instrument part 2's ranges have to be
argued in front of. The four controls, their ranges, the clamp and the sheet are session
32; the brief for it is at the bottom of this file, including Eva's amendment.

---

## What shipped

1. **The field.** `buckleIsFlat(state)` / `buckleLaw(state)` in `bloom-geometry.js`, and
   one term added to `aN` in `petalForm`'s `sectAt`:

   ```
   w(u, v) = A * h(u) * |v|^p * cos(2 pi f u + phase)
   ```

   ridden onto the same `ramp(u)` the other curves use, so the foot and the root blend are
   untouched by construction rather than by a special case.

2. **The guard, joined to `petalFormIsFlat`.** That predicate is what decides whether
   `petalForm()` is constructed at all, and at the shipping default it is true — so a
   buckle wired only inside `sectAt` is a **dead slider**. The discovery rig built the
   field, measured an identical triangle count and an identical byte, and was right to.
   Same move session 16 made for `cupGradient`.

3. **The true surface normal**, in the buckled branch only — `trueNormalRows` in
   `buildPetalInto`. It is a NAMED local rather than an inline block precisely so that the
   header, this doc and the charter can point at something that exists; a label naming a
   thing nobody can grep is this project's most repeated defect.

4. **`tools/bloom-wall-thickness.mjs`**, with V1–V4 and a five-mutant negative control,
   wired into `bloom-export-watertight.yml` (see "Why not a sixth gate" below).

---

## Eva's six rulings, with their reasons

Recorded here because a ruling whose reason is not attached becomes precedent by accident.

1. **Amplitude is a FRACTION OF THE LOCAL HALF-WIDTH, not millimetres.** Scale-free is the
   principle — the same one that settled the pinch mapping. Absolute mm fails in a specific
   way: it is applied **unchanged where the blade has already tapered to its tip floor**, so
   the tip crumples while the body of the blade ripples gently. Photographed on the
   discovery sheet's row E.

2. **Fixed `NU = 56`, frequency capped at 7** — *not* a row count derived from the buckle
   frequency, even though "derive, don't expose" is the doctrine. **This is a ruled
   exception and here is its reason, so nobody reads it as an oversight:**
   `CURL_START_MIN = 1 / NU`, and `bloom-registry.js` **imports it as a control bound**. A
   row count that moved with the buckle frequency would silently move a *curl* slider's
   declared range — a control reaching into an unrelated control's range, which is the
   registration violation this project has unpicked five times. 37.7% of the export budget
   at the 240-petal worst case is affordable.

3. **Clamp the `A·f²` product**, `spineLaw`'s treatment: full ranges, output clamped,
   saturation printed with `(CLAMPED)` and the tightest radius named. **Q6's "bound the
   ranges so the shape cannot invert" DOES NOT APPLY HERE, and this is why:** the cap
   `A·f² ≤ L²/(4π²t)` moves by a factor of **22** across the reachable `L × t` box (4.22 mm
   at L=20/t=2.4 to 91.19 at L=60/t=1.0), so **no static rectangle is dead-free**. Q6's tip
   bound holds because one number covers the whole reachable space; this one does not have
   that property. Same shape as `stamenSpread`'s saturation.

4. **Frequency in CYCLES, not wavelength in mm.** It keeps the clamp, the cap and the
   resolvability check in one unit, and with a fixed `NU` the 8-samples-per-cycle bar is
   expressed in cycles anyway. The trade Eva accepted: a longer petal gets longer waves
   rather than more of them. If that reads wrong on a 60 mm petal it is a sheet finding and
   will be ruled then.

5. **Phase derived from the slot index.** One phase for the whorl reads machined.
   *Not shipped this session* — the field takes `bucklePhase` as a plain input; the
   slot-index derivation is part 2's, with the controls.

6. **The two found-in-passing defects get their own sessions** — recorded below rather than
   bundled here.

**And on the sizing**, in Eva's words: an instrument that is the **input to a ruling** is
not the same as one built for completeness. That distinction is why this session is
instrument-first when Eva has argued against instrument-first sessions repeatedly.

---

## The one thing that is not like cup and roll

The premise the discovery session was asked to hold — *this is a displacement field, the
same family as petal cup and cross-section roll, so it does not compete with the tip-shape
work for ownership of the outline* — **holds, and it is load-bearing.** `widthProfile` is
untouched, `h(u)` is unchanged, `v` still runs −1..1, the plan outline is byte for byte
what it was. The two lines of work can be sequenced in either order.

**The correction is about the normal, and it is what this session is for.** Cup and roll
are functions of `v` alone at a given row, so the row's cross-section is a plane curve and
the shipped normal — `dP/dv` rotated a quarter turn in the row's own `(T, N)` plane — is the
surface normal to the accuracy the along-length variation allows. Every deformation before
this one varies *slowly* along `u` (a taper, an onset ramp, a constant-curvature spine),
which is exactly what makes that approximation good. **A buckle varies fast along `u`; that
is what a buckle is.** Measured on the discovery rig: the cross-section normal sits **29°**
off the true surface normal at a moderate setting and **71°** at the top corner. Offsetting
the two skins along it makes a **wedge**, not a sheet.

So the buckled branch takes `n = normalise(dP/du × dP/dv)`, oriented onto the cross-section
normal so the **winding cannot flip** (`emitPanel`'s quads are wound off `n`; a sign flip
there is a boundary-edge failure, not a shading one). `dP/dv` comes back analytically on the
row's own section — the same two components the 2D normal was just built from, so there is
one tangent and not two. `dP/du` is a difference over the **neighbouring rows' own
sections at the same `v`**, which is legitimate because a section is a function of the
*global* `v` — the property that already lets a cleft's two lobes stay on one arc.

**The foot is not touched.** Only blade rows are wrapped: the foot is a different surface
with a different width law, so differencing across the seam would be a derivative of
nothing, and the buckle's ramp is exactly 0 there anyway. First blade row one-sided forward,
last one backward, the rest central.

**One bug worth not re-learning.** The field's `v`-derivative must be **`d/da` where
`a = h·v`** — that is the shipped convention (`dT`/`dN` are `d/da`: roll's `cos(k*a)`, cup's
`2*c*v` which is `d(c·a²/h)/da`). Differentiating in `v` overstates the cross-width slope by
a factor of `h`, about 8 mm on the shipping petal. The discovery rig read a thinning that
was the instrument's before this was written down; `derivative-in-v` is now a mutant.

---

## The byte close — 0 of 203,212,800

| set | rows × modes | floats compared | differ |
|---|---|---|---|
| live `buildMatrix()` | 571 × 2 | 103,602,240 | **0** |
| frozen `phase19Matrix()` (newest) | 549 × 2 | 99,610,560 | **0** |
| | | **203,212,800** | **0** |

Head against a `git worktree` of `7011e88`, float-level, `Object.is` (so `-0` is a
difference). **Positive control: a single 1e-9 perturbation reads as exactly 1 differing
float**, so the comparison can fail. Stronger than an STL hash diff, which quantises to
float32 and can only ever merge two doubles, never split one — session 28's precedent.

Honest footnote: the run encountered **0 signed zeros** in `positions` on the head side, so
`Object.is` and `===` would have agreed here. The `-0` sensitivity is present and is not what
carries this result.

**It is a construction, not luck.** `buckleIsFlat` gates `petalFormIsFlat`, so an unbuckled
build never constructs `petalForm` at all and takes the shipped expression character for
character. No registry row declares these keys, so every shipped build reads them as
`undefined` and the guard is true. **V3 in the instrument is the standing version of this
claim** and runs in CI on every push; the table above is the one-time close.

**No frozen phase is owed**: no row was added, no byte moved, `frozen/phase19` stays the
newest baseline. The session 18/19 and 23 case, not the last three sessions'.

**Triangle counts (live · export) and STL size are unchanged**, base tree against head:
shipping default 10,080 · 10,080, 492 KiB; 40 petals × 6 whorls 296,832 · 296,832,
14,494 KiB. The field adds **no triangles at all** — it is pure vertex displacement. A
buckled build evaluates three sections per emitted column instead of one; unbuckled builds
do not enter that code at all.

---

## The instrument

`node tools/bloom-wall-thickness.mjs` — and read its header, which carries what it does not
cover.

**The gap it fills.** Nothing in this project had ever measured the emitted wall. The roll
curvature floor is a *curvature* argument that had never been checked against the mesh that
comes out, and `thicknessProfile` reports the thickness a row was **built at** — the number
handed to the offset, not the distance between the two skins that were offset. Those are the
same only while the mid-surface is gentle.

**What it measures**, from the builder's own captured grid, using the normal the builder
**emitted** (never one recomputed here, which would make the instrument agree with itself):

- **WALL** — nearest bottom-skin triangle within `near` cells: the wall *under* this point.
- **SELF** — nearest bottom-skin triangle *outside* that neighbourhood: the sheet
  approaching another part of itself.

Conflating those reports a fold as a thinning. The discovery pass did exactly that for an
afternoon.

At the shipped 28 × 10 grid, declared sheet 1.200 mm:

| state | WALL | buckle's own |
|---|---|---|
| flat — the shipping default | 1.200 | — |
| SHIPPED cup 1.2 | 1.074 | — |
| SHIPPED roll 330 | **0.587** | — |
| SHIPPED twist 180 | 0.974 | — |
| SHIPPED all form at maximum | **0.015** | — |
| buckle A=0.10 · f=2 | 1.195 | 0.005 |
| buckle A=0.20 · f=3 | 1.173 | 0.027 |
| buckle A=0.30 · f=3 | 1.152 | 0.048 |
| buckle A=0.30 · f=3 · p=2 | 1.152 | 0.048 |
| buckle A=0.30 · f=3 · p=6 | 1.092 | 0.108 |
| buckle A=0.20 · f=7 | 0.903 | 0.297 *(reported)* |
| buckle A=0.20 f=3 over cup 1.2 + curl 180 | 0.491 | 0.438 *(xfail)* |

**"Buckle's own" is each state against the same state with the buckle removed** — its own
control, and the only column here that is the buckle's. Without it the assertion reads cup's
and curl's deficits as the buckle's.

**A deficit at one grid is not a thinning.** A vertex-to-facet measurement under-reads on a
curved sheet by the facets' own sagitta. Refinement separates the two, and it is the only
thing that does.

**V1–V4 abort the run**; a self-check that reports instead of failing is a log line.
`--negative-control` runs five mutants, each naming the assertions it must redden:
`cross-section-normal` → V4, `derivative-in-v` → V4, `dead-branch` → V2, `unguarded-form` →
V2, `guard-on-presence` → V3. **All five behave.**

**Two defects the negative control found in itself**, both worth not re-learning:

- **Node's ESM loader caches by resolved URL.** Writing every mutant to one path and
  importing them in turn serves the **first** mutant's module to all of them: three mutants
  reported identical numbers and two "passed" on mutant one's behaviour. Each mutant now
  gets its own directory. A mutation that did not *apply* is survivable and is checked for;
  a mutation that silently did not *run* is not.
- **A refactor silently disarms a mutant, and the guard is what makes that survivable.**
  Naming the block `trueNormalRows` moved `cross-section-normal`'s anchor; the sweep reported
  *"the mutation did not apply — its anchor has moved and this mutant is silently disarmed"*
  rather than a false pass. That is the one failure mode that has to be loud, and it was.
- **Two mutants named the wrong assertion.** `unguarded-form` was written as V3's witness
  and is V2's — dropping the buckle clause from `petalFormIsFlat` makes the field a dead
  slider, it does not move the default's bytes. V3's real witness is `guard-on-presence`
  (the guard testing whether the keys *exist* rather than whether they are zero), which was
  written after the sweep said so.

### Why not a sixth gate

It rides in `bloom-export-watertight.yml` rather than in a workflow of its own: same
question (print safety), Node-only, seconds, and it runs **before** the browser install so a
red there costs nothing. The bloom gate count stays at five.

---

## The composition finding — part 2's real problem

**One state is an `xfail` with a measured reason.** `buckle A=0.20 f=3 over cup 1.2 + curl
180` costs 0.438 mm of wall against its own control at 28 × 10 — and **it does not recover
under refinement, it diverges**:

| grid | 28×10 | 42×15 | 56×20 | 84×30 |
|---|---|---|---|---|
| buckle over cup+curl | 0.491 | 0.438 | 0.353 | **0.333** |
| its own control (cup 1.2 + curl 180) | 0.929 | 0.966 | 0.976 | 0.968 |
| **buckle's own contribution** | 0.438 | — | — | **0.635** |

Divergence under refinement is the signature of **real geometry**, not faceting. Compare
`buckle A=0.20 f=7`, which *recovers* — 0.903 → 0.991 → 1.050 → **1.114**, own contribution
0.086 mm at 84 × 30 and inside V4's bar — so that one is the row count and is `report`ed
with its numbers rather than asserted.

**What it means for part 2.** The buckle **composes** with the curvature cup and curl
have already spent, and the composition reaches inversion where neither does alone.
**The closed-form bound derived in discovery — `A·f² ≤ L²/(4π²t)` — is necessary and NOT
sufficient**, because it knows nothing about the curvature already present. Part 2's
clamp has to be argued in front of this row. It is an `xfail`, not a wider bar: the run
**fails hard if it starts passing**, and that marker comes off in the same commit as the
clamp.

---

## Found in passing — scheduled, not folklore

Both were found by `tools/bloom-wall-thickness.mjs` on shipped states, neither is this
feature's, and neither should be bundled into it. Recorded here with the instrument named so
they are schedulable. (The character-walk scanner defect sat unscheduled for three sessions
because it lived only in an outcome doc.)

1. **`petalRoll` 330 emits a 0.587 mm wall against a declared 1.200 mm** at the shipped
   28 × 10 grid. Discovery measured it recovering to **1.177 mm at 168 × 60**, so the roll
   curvature floor is doing its job and the deficit is the **mesh** — but the faceted mesh
   is what a slicer receives, so at the shipped grid the printed wall really is 0.587 mm on
   a reachable, shipped setting, and **no gate measures it.** Owner: its own session.

2. **All form at maximum diverges downward under refinement** — 0.282 mm at 28 × 10 to
   **0.014 mm at 168 × 60** (discovery), i.e. a genuine near-self-contact on a reachable
   shipped state, not faceting. Pre-existing, no buckle involved; the session-13 precedent
   (a pre-existing fact *found* by a session, not damage it caused). Owner: its own session.

---

## Part 2's brief

Everything in the sizing split stands: the four controls, the clamp with its read-out
clause, and the sheet, argued in front of this instrument. That session **stops for Eva's
ruling**.

- amplitude as a fraction of the local half-width (ruling 1);
- fixed `NU = 56`, frequency capped at 7 and expressed in cycles (rulings 2 and 4) — note
  `CURL_START_MIN = 1 / NU` moves with `NU` and is a registry-imported bound, so raising
  `NU` **does** move bytes and **does** owe a frozen phase and a predeclared partition,
  which this session does not;
- clamp the `A·f²` product, `(CLAMPED)` and the tightest radius in the read-out (ruling 3),
  argued in front of the composition row above;
- phase derived from the slot index (ruling 5).

### Eva's amendment — `p` is a fourth control

From the reference photographs, which show **two axes of variation, not one**: a bearded
iris ruffles at **high amplitude AND with the wave reaching well inward** from the margin,
visibly a third of the blade's half-width; a rose undulates at **low amplitude AND confined
to a narrow band** at the margin itself; a lily is flat. **A single fixed inward-falloff
exponent cannot draw both the iris and the rose.**

So `|v|^p`'s exponent is promoted from a constant to the fourth exposed control:

| | value |
|---|---|
| floor | **2** — retained, and `p = 1` is **out of range**, not discouraged: `|v|` is not differentiable at 0, so p=1 is C⁰ at the midrib and creases the blade down its centre (photographed, discovery row D) |
| ceiling | **6** |
| default | **3** (`BUCKLE_ENV_DEFAULT`, already the one owner in `bloom-geometry.js`) |

It reads as **"how far the ruffle reaches in from the edge"**, higher = more confined.

Two things to **work through and report, not to decide alone**:

1. **`p` interacts with the clamp.** A low `p` spreads the same amplitude over more surface
   and may make the cap too conservative; a high `p` concentrates it and may make it too
   permissive. **Measure whether the cap must be a function of `p`** rather than a constant,
   and report the reading — do not adjust the clamp on judgement. This instrument already
   shows the direction: at A=0.30 f=3 the buckle's own contribution goes 0.048 mm at p=2 and
   p=3 to **0.108 mm at p=6** — more than double, at identical amplitude and frequency, so
   the cap being independent of `p` is already doubtful.
2. **The dead-control sweep applies to `p`.** Exercise it across its whole range at several
   amplitudes, confirm it does something everywhere, and confirm no default of amplitude or
   frequency sits where `p` goes inert.

**The sheet must vary `p` as its own axis**, and needs at minimum a row that reproduces the
**iris** look (high amplitude, low `p`) and one that reproduces the **rose** look (low
amplitude, high `p`), so the ruling is made against the same two references that motivated
the control.

---

## What is NOT done

- No control, no registry row, no range, no clamp, no read-out. The keys are reachable only
  from a tool.
- No contact sheet. Nothing visual changed, so none is owed; part 2's is.
- `NU` is still 28. Raising it to 56 is part 2's, and it moves bytes.
- No self-intersection instrument, and there will not be one (Q6). The composition row above
  is the closest thing: it measures a *wall*, and a wall going to zero is what an inversion
  looks like from the outside.
- Petal-to-petal clearance is untouched. Discovery measured that buckling **improves** it at
  8 petals and changes it by ≤0.014 mm at 40, where the flat bloom already interpenetrates
  by ~1.1 mm — both STL gates are blind to that by ruling, and it stays a flag.
