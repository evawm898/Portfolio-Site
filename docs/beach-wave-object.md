# Scene 3 — the wave as an object

The merged scene (`71b73c1`) draws the water as a **tone field with a swash edge**.
It has no wave in it: the break at the back of frame is one clause inside
`waterTone` — a fixed dip whose depth and width scale with set energy — and the
swash is a full life cycle. That is the gap this session closes. The swash is
**stage six of a wave's life**, not a separate system.

Everything below is measured off the two reference recordings unless it says
PICKED. `tools/beach-reference.mjs` reproduces every figure from a directory of
extracted frames.

---

## 0. Provenance: there are TWO recordings, not three

`IMG_3911` and `IMG_3912` are **the same recording**. Frame *k* of 3912 is frame
*k+25* of 3911, and they are not merely similar — they are **bit-identical**:
over all 77 overlapping frames the mean absolute luminance difference is
**0.00**, with min, median and max all 0.00. 3912 is 3911 shifted by 25 frames
(0.83 s) and extended 23 frames beyond its end.

So the reference is:

| | frames | duration | what it holds |
|---|---|---|---|
| **sequence A** = 3911 ∪ 3912 | 125 | 4.17 s | one break caught **from the swell on** — every stage |
| **sequence C** = 3914 | 73 | 2.43 s | one break caught **mid-peel** — stages 3 to 6 |

That corrects a calibration provenance claim in `beach-draw.js`. The foam band's
width was set against four per-column bare runs quoted as `c1_001 3.56% ·
c1_050 1.39% · c2_001 3.06% · c3_001 0.43%` — and `c2_001` **is** `c1_026`. Three
of those four samples are one clip, two of them 0.83 s apart in one continuous
shot. The width is not re-derived here (see §4), but the four readings are two.

---

## 1. The six stages, measured

Sequence A, `t` from frame 61 (the sheet is `docs/img/beach-reference-break.png`,
top 34% of frame, every third frame):

| stage | t | measured |
|---|---|---|
| **1 SWELL** | 0.0 – 0.6 | a dark band, **no foam anywhere in the frame**. The water at s 0.01–0.11 darkened **36 levels** over the preceding 2.4 s (L 79 → 43 at s = 0.05), leaving a local dark minimum at s ≈ 0.04 sitting 6–8 levels under the water either side of it. |
| **2 STEEPEN** | 0.6 – 1.0 | a bright lip **0.010 of frame height** appears along the top of the ridge. Crest 183, face 56, **Δ 127**. |
| **3 PEEL** | 1.0 – 1.7 | the bright run spreads **along** the crest. 64 of 64 column blocks break over **1.77 s**, onset slope **−1.35 s across the frame** — right to left. |
| **4 COLLAPSE** | 1.3 – 1.6 | band 0.025 → 0.040, crest 201 → 217, face 61 → 65. **Δ peaks at 161.** |
| **5 FOAM BAND** | 1.7 – 2.1+ | band 0.060 → 0.095 and still widening; face lightens 80 → 84; the band travels shoreward at **0.09 frame heights per second**. |
| **6 SWASH** | — | the shipped model, unchanged. |

Sequence C, independently: **32.8% → 100% of columns over 1.0 s**, onset slope
**−0.80 s**, right to left again. Band **0.020 → 0.130 over 1.5 s** then fading;
crest 195 → 230 → 176; face 95 → 73 → 92; **Δ peaks at 156 at t = 1.17**.

The brief's "71% → 100% over 1.0 s, treat ≥1 s as a FLOOR" is confirmed and the
floor is right: a break caught from its start peels for **1.8 s**.

## 2. The dark face is the finding, and the scene has no object for it

It is not "the water below the foam". Measured against the **ambient water
immediately shoreward of it**, the face sits **14 to 46 levels below it** —
darker than the sea around it — and it is deepest right after the break, fading
as the band matures (−45, −37, −23, −14 over 0.7 s in sequence A).

In the drawing's own tone units that is **+0.08 to +0.31 of tone above the local
water**, and at its deepest (L 57) the face reads tone **0.93** — *darker than
`TONE.deep` (0.78), which is the darkest thing the drawing currently has*, and it
sits at s ≈ 0.05–0.13 where the shipped ramp puts the water at **0.73–0.77**.

**It is the strongest edge anywhere in the frame, and by how much is measured.**
The largest luminance step over 0.02 of frame height, per frame:

* before the break, the strongest edge in the frame is the **shore foam band**, at 92 falling to 39 as the old swash drains;
* at the break it is **133** (sequence A, t = 3.30) against **36** for the strongest edge below s = 0.30 — **3.7×**;
* in sequence C, **111** against **20–23** — **5×**.

Losing that face leaves a white stripe, which is what the scene has now.

## 3. Several waves are alive at once — measured, and the interval already suits it

A row median cannot count them (it is the previous session's own sheared-band
lesson: a wave that has peeled across part of the width has a row median that is
water). **Per column**, the reference carries a mean of **1.2 – 3.4** separate
bright bands, max **4 – 7**, with **33 – 98% of columns carrying two or more**.
The median column carries **2 – 3**.

The shipped `INTERVAL_S = [3.2, 6.4]` needs no change to reach that: the whole
life proposed in §5 is ~9.3 s, so 2–3 waves are alive at any moment by
arithmetic.

## 4. The five band figures, re-measured on the same frames

| band | shipped L | re-measured L | verdict |
|---|---|---|---|
| deep | 47 | **41 – 61** | **MOVED, and it is not a constant** — it falls 20 levels over 2 s as a swell arrives |
| shallow | 118 | **109 – 113** | 5–9 levels darker |
| gloss | 125 | — | not re-sampled; unchanged |
| wet | 152 – 161 | **149 – 158** | holds |
| dry | 186 – 194 | **187 – 192** | holds |
| foam | 191 – 197 | **168 – 230** | **MOVED, hard** — foam brightness is a function of AGE: 230 fresh, 168 dying |

**Two moved and both for one reason: they are properties of a wave at a stage,
not of a place on the beach.** The old calibration fit a smooth ramp to frames
containing a discrete wave, so it got a single number for each, and the single
number is the average of a thing that swings. `wet`, `dry` and `gloss` hold
exactly, which is the control: those three really are properties of a place.

**The ramp is not tuned to hold the old numbers.** `TONE.deep` is re-stated as
the tone of water with **no wave in it**, and the swell's darkening is the
wave's own contribution on top — which is where the headroom has to come from,
since there is only 0.22 of tone above 0.78 today. The constants are set in
front of the mockup, against the contact sheet, not here.

**The contact sheets are `docs/img/beach-reference-break.png`** (sequence A, the
whole life from the swell on) **and `docs/img/beach-reference-peel.png`** (sequence
C, the brief's peel). Every cell carries its own crest, face and the gap between
them.

---

## 5. What shipped

`scene/beach-wave.js` is new and holds no state — every export is a function over
a record and a position, the way `swashEnv` already is, so the gate drives every
law in Node. `beach-swash.js` keeps the two-line model unchanged and is **stage
six**: one record, born at sea, whose swash envelope starts `preS` seconds in.
`beach-draw.js`'s tone field gains the wave term and loses the fixed break.

### The wave record

`WAVE_FIELDS` is the claim written down, as `SWASH_FIELDS` already is, and the
claim it makes is the same one widened: **a wave is committed at birth, and
that now covers every stage rather than only the runup.** There is no `energy`
field, no `set`, no `target`, so deforming a running wave stays *unreachable*
rather than avoided.

```
age                seconds since birth
preS               the seaward life — how long before its swash starts
breakAge           when the lip appears
peelS   peelFrom   how long the peel takes, and which end it starts at
crest0  breakS     where it is born, and where it breaks
bandMax            the foam band's widest, in frame heights
faceDepth          the dark face's tone excess over the local water
swellDepth         the swell's, likewise
runup advanceS holdS retreatS wob peaked life      — stage six, unchanged
```

### Stages advance by derivation, and they are a function of u

A stage is **not stored**. `stageAt(w, u)` is a function of the record and the
along-shore position, the way `swashEnv` is a function of the record and the
clock — so a stage cannot disagree with the geometry that is drawn.

It takes `u` because **that is what a peel is**: `brokenAt(w, u)` gives how long
ago *this column* broke (negative: not yet), from `breakAge + peelS · peelPos(u)`,
and every stage boundary is a comparison against that one number. One wave is
therefore steepening at one end of the frame and collapsing at the other, which
is the thing the scene cannot currently express at all.

### How several are composited

`waveField(waves, u, s)` is the **one** place a wave becomes tone. Waves are
walked **seaward first**, each replacing the field inside its own window, so the
most shoreward wave wins where two overlap — a painter's order, which is what
"a nearer band of foam hides the water behind it" means in a plan view.

The tone field and the drifting surface **stay as the field**. Waves are objects
drawn into it. `waterTone`'s `breakS` / `breakW` / `breakE` arguments and
`BREAK_BAND_S` are **retired** — that fixed dip is the one clause this work
replaces.

### What set energy sizes

Everything in the second block of the record, frozen at `spawn(energy)` and read
nowhere else: **how far out it breaks** (`breakS`), **how deep the dark face**
(`faceDepth`), **how wide the foam band** (`bandMax`), the swell's depth, the
peel duration, and the runup it already sized.

### What is kept

Commit-at-birth; the two-line model and both drying rates; `sat` / `wet` /
`edge`; the overrun feed; the published three-thing interface; the streaks; the
dry sand and its register; the shear; the foam speckle and the front line.

### Module layout

`beach-wave.js` is **new** and holds no state — it is functions over a record,
like `swashEnv`. DOM-free, so every law in it is driven by the gate in Node.
`beach-swash.js` keeps the two-line model and spawns a wave `preS` earlier;
`beach-draw.js`'s tone field gains the wave term.

---

## 6. Open, and for Eva

**The peel direction.** Both observed breaks peel **right to left**, and that is
the direction the measured shore tilt predicts: the waterline is higher on the
right, so the water is shallower there and breaks first. The brief asks for the
direction to vary wave to wave. The proposal is to **vary it but bias it toward
the shallow end** rather than drawing it uniformly — and to say out loud that
this rests on **two** observed breaks.


---

## 7. What the build cost, and the four things that are Eva's

### The swell is the weakest of the six stages in this medium, and it is a trade

The lattice **saturates**. Measured through `beach-draw.js`'s own `__flatTone`
hook — the delivered ink coverage of the shipped row walk:

```
tone      0.40  0.50  0.55  0.60  0.65  0.70  0.75  0.80  0.90  1.00
coverage  0.47  0.59  0.72  0.86  0.87  0.97  0.98  0.99  1.00  1.00
```

From 0.70 to 1.00 — **thirty percent of the control's travel** — the ink moves
2.9 percentage points. At the shipped `TONE.deep = 0.78` the deep water was
already 98% inked, so a swell darkening it to 0.93 changed the drawing by about
**one percentage point**: the first mockup's swell cell was pixel-for-pixel its
own no-wave control, and that is why.

Rendering the same swell at each resting tone:

| `TONE.deep` | 0.78 | 0.74 | **0.70** | 0.66 | 0.62 | 0.58 |
|---|---|---|---|---|---|---|
| resting coverage | 0.972 | 0.968 | **0.930** | 0.864 | 0.808 | 0.763 |
| largest white gap | 24 px | 21 px | **25 px** | 44 px | 39 px | 46 px |
| what a swell buys | +0.005 | +0.004 | **+0.016** | +0.029 | +0.035 | +0.018 |

**0.70 ships**: three times the shipped travel at an unchanged gap, so the sea's
solidity costs nothing. **0.62 would buy twice as much again and open the
lattice's own gaps from 25 px to 39.** That is a real trade and it is Eva's, not
mine. It is also worth saying plainly that even at 0.70 the swell moves about
1.6 percentage points of ink — it is the least a stage can be worth here, and
no tuning inside this lattice changes that.

### The peel direction

Both observed breaks peel **right to left**, which is the direction the measured
shore tilt predicts. The brief asks for it to vary wave to wave. It currently
varies uniformly (`peelFrom: rand.unit()`). Biasing it toward the shallow end is
one expression; it rests on **two** observed breaks.

### The face is held at one depth, and the reference's is not

In the footage the dark face **dips progressively under the peel** — at the
unbroken end it is the wave's own front, at the crest, and it slides under the
foam as each column breaks. Held at one depth, the not-yet-broken end carries a
face further below its crest than it should.

It is held anyway, and the alternative was measured: per column the depth runs
over 0.09 of frame height, and a row of a **bilevel** lattice averaged across
that reads L 117 where the reference's face is 60. **One depth reads as a band;
the true law reads as nothing.** A ramped depth is the obvious next thing to try.

### Set energy now takes 17.6 seconds to reach the shore

A wave's seaward life is `PRE_S`, so a scroll sizes a wave that **breaks about
4.4 s later and arrives as a swash about 17.6 s later**. The break is the visible
half and it is prompt; the swash is not. Nothing was done about it because it is
what the model says, but it is a change to how the one interaction in this scene
feels and it should be looked at on the preview.

---

## 8. Two instrument corrections worth keeping

**A row MEDIAN of a bilevel drawing is not comparable to a row median of a
photograph.** A band at tone 0.67 delivers 87% coverage, so more than half its
pixels are ink and its median reads **L 24 — solid black — for a region whose
value is L 51**. The first cut of `shot-beach-stages.mjs` used the median for
symmetry with `beach-reference.mjs` and reported a face 27 levels darker than
anything the renderer can draw. A **mean** over a bilevel row *is* its coverage,
which is the quantity that corresponds to a photograph's luminance. The reference
tool keeps its median, for its own reason: rejecting a bird from a photograph.
Same question, two media, two right answers.

**Normalised darkness is not tone, and the chain between them has three links.**
`(194 − L)/147` is a reading of the *footage*; the drawing's tone reaches a
luminance through its own delivered coverage. Run properly —
`coverage = (241 − L)/218`, then the table above — the chain **re-derives the
shipped ladder** rather than contradicting it (deep 0.68 against 0.70, shore 0.48
against 0.45, foam 0.05 against 0.00), which is the check that it is right. It
also says the dark face is **not** dramatically dark in tone: it sits 0.03–0.09
above the water beside it, and the 153-level crest-to-face gap is mostly the
crest being bare paper. A face pushed to 0.90 is not more faithful, it is black.
