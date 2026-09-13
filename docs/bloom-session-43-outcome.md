# Bloom session 43 — the stem on the hub, and the hub-to-stem join

**The ruling this is built on:** THE STEM ATTACHES TO THE HUB. IT DOES NOT ATTACH TO
THE PETALS. The petals join the hub; the hub joins the stem; two separate joins with two
separate rules. The thickened region where the hub meets the stem is the **hub-to-stem
join**, `stemJoin` in code.

Phase A was discovery (§1–§4 below, measured before anything was built). Phase B is the
PR (§5 onward).

---

## 1. The hub, measured from emitted geometry

MODE: EXPORT. SAMPLING: every triangle `buildHubInto` emits for ring 0, nothing else.
Normals recomputed from each triangle's own three vertices.

| head | tris | z extent | what it is |
|---|---|---|---|
| FLAT (default) | 192 | −0.6000 … +0.6000 | solid plate, **uniform 1.2000 mm** |
| DOME 0.50 | 3,456 | −0.3600 … 5.0223 | curved plate — a **bowl** |
| DOME 1.00 | 3,456 | 0.0000 … 9.4447 | deep bowl |
| SPHERE | 6,720 | −8.8496 … +8.8496 | hollow spherical shell, wall 1.2 |

The flat hub's material spans exactly 1.2000 mm at r = 0 **and** at r = 8.75 — the
thickness is uniform and no radius is thinner than another. Its underside is one
exactly-planar closed disc at **z = −0.6** (the slab straddles z = 0; an earlier reading
of −1.2 in this session's own Phase A draft was wrong by 0.6 mm and is corrected here).
The underside is CLOSED in every mode: "shell" in this code means *closed surface*.

**A domed hub is a bowl and its lowest material is the RIM, not the centre.** At rise
0.50 the underside on the axis is at z = 3.77 while the rim reaches −0.36.

## 2. The turn at the hub underside — two readings, and they differ by exactly 90°

| head | LEAN, nearest the axis | SURFACE, nearest the axis |
|---|---|---|
| FLAT | **0.0000°** | **90.0000°** |
| DOME 0.50 | 1.4790° | 88.5210° |
| DOME 1.00 | 2.5054° | 87.4946° |
| SPHERE far pole | 2.5054° | 87.4946° |

**LEAN** is the angle between the stem axis and the underside's own outward normal;
**SURFACE** is the angle between the underside and a vertical stem wall — normal to
normal, the same quantity `seamTurnRad` measures at the foot. They are complementary by
construction, because a stem on the axis meets a downward-facing surface at a right
angle. The non-zero LEAN values are the apex fan's own faceting; analytically 0.

**Why the hub is the better site, and it is measurable rather than tidier.** At the FOOT
the same turn runs 115–176° over the reachable range — past the right angle where
`seamClearanceMm`'s own algebra reverses and no spacing satisfies it. At the hub
underside it cannot exceed 90°, which is where that law **saturates**: the clearance it
asks for is `(t/2)·sin 90° = t/2`, its maximum and 0.6 mm on the shipping sheet.

## 3. The load path

The hub's thickness is uniform, so what shrinks inward is the section the load must
cross — `2πr·t`, falling **linearly to zero at the axis** — while the radial moment grows
as `ln(R₀/r)`. Both compound inward.

| r (mm) | 8.8447 | 4.4223 | 3.0 | 1.5 |
|---|---|---|---|---|
| shear section 2πr·t (mm²) | 66.69 | 33.34 | 22.62 | 11.31 |
| ln(R₀/r) | 0.0000 | 0.6932 | 1.0812 | 1.7743 |

**A WIDER STEM BUYS MORE THAN A THICKER HUB DOES** — where the section stops is set by
the stem's radius and by nothing the hub does.

The petal load arrives further out than the hub: area-weighted centroid of all petal
material is **r = 23.34 mm on the shipping default, 2.64× the hub radius**, reaching to
40.7 mm.

**Can a 1.2 mm shell carry a flower?** Not answerable from this repository — it needs a
material, a density and print-layer data, and nothing here has ever been printed. What IS
answerable is that Eva's stated floor for the STEM is 1.5 mm, which governs the stem only.

### THE THREE-FLOOR CONFLICT — an OPEN QUESTION FOR THE COUPON PRINT

Recorded with all three provenances, resolved by choosing nothing, blocking nothing:

| | value | provenance |
|---|---|---|
| `MIN_FEATURE_MM` | 1.0 mm | a geometry constant, a DECLARED GUESS |
| `SHEET_THICKNESS_MM` | 1.2 mm | the shipped sheet, and the hub |
| `STEM_MIN_WALL_MM` | **1.5 mm** | **Eva, Sep 13, a stated print requirement** |

Eva's ruling: the 1.5 governs the stem only. `SHEET_THICKNESS_MM` does not move, the
petals do not move, the hub does not move to satisfy it — a stem is a cantilever tube on
a long lever and a hub is a plate supported all the way round. Only a coupon print can
settle the rest.

## 4. The sphere channel — the reservation mechanism was measured and RETIRED

The proposed mechanism (grow `dome.reserved` derived from the stem radius, re-place all N
petals over the reduced arc) **does not work, and the measurement is why.**

Clear radius below the far pole vs reservation α, EXPORT, every emitted petal vertex:

| α (deg) | 0 | 10 | 20 | 30 | 40 | 45 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|
| 8 petals — clear r (mm) | 0.107 | 0.355 | 0.813 | 0.877 | 0.688 | 0.095 | 1.666 | 7.053 |
| 40 petals — clear r (mm) | 0.456 | 0.325 | 0.454 | 0.279 | 0.321 | 1.762 | 5.581 | 13.140 |

Flat near zero to ~45–50°, non-monotone there, then a cliff. **The reservation moves
FEET, not BLADES**: the sphere's law is "feet run toward the face pole, blades leave
toward the far pole", so at α = 30° petal k1 clears (0.11 → 3.79 mm) while the pole-most
petal k0 barely moves (0.68 → 0.88). It only clears near α ≈ 50°.

**So the reservation cannot be derived from the stem radius**: going from no stem to ANY
stem costs 46–51°; going from a 3 mm stem to a 12 mm one costs a further 5–8°.

`S3` clause (b) forbids it by name — *"the clearance is at most one equal-area step … the
reservation is a point and not a bald cap"*.

**Eva's replacement ruling, NOT in this PR:** petals whose geometry would collide with the
stem are NOT BUILT, with the sequence, the equal-area law, the golden angle and the
existing one-step reservation all untouched. It ships as its own small PR immediately
after this one, so the stem's byte partition is not entangled with sphere rows. In this PR
SPHERE refuses a stem, hidden AND inert, with a TODO naming the ruling.

---

## 5. What shipped

**#220 first.** Both STL gates opened their summary with the three real populations
(attempted / reached the results / passed), name DROPPED in the line when they differ,
echo one line into **stdout** beside each stderr failure block, and print the verdict
unconditionally. Verified against #220's own acceptance criterion reading STDOUT ONLY —
the exact reading that was broken. Before it, the export tail read `0/0 configs watertight`
with nothing else in the stream.

**The assertion family before the geometry, SEEN RED.** ST0–ST6 and matrix block 30 went
in first, and the first run reported `ST1: the metrics hook reports no 'stem' key at all`
and exited 1 with no geometry in the tree.

**Two controls.** `stemLength` (0–120 mm, default 0 — THE GUARD) and `stemDiameter`
(3–12 mm, default 6, hidden AND inert at length 0). Both ranges IMPORTED from the geometry.

**Eva's bore rule as one expression with one owner:** `bore = max(0, outerRadius − 1.5)`,
so the stem is SOLID at the 3 mm floor and hollow above it with a wall of exactly 1.5 mm.

**The join is DERIVED and has nothing to tune.** It is as strong in bending as the stem it
feeds — not stronger (waste), not weaker (the join becomes the weak link). Equating the
stem's section modulus with the plate's per-circumference one collapses to

    T = (sqrt(3)/2) * sqrt(r^4 - bore^4) / r

floored at the hub's own thickness, so a thin stem leaves the hub alone and the join is
INERT **by branch** — the `domeIsFlat` guard's shape. The profile out to the blend radius
is the constant-stress curve, a MAX over two terms with the winner decidable
(`widthProfile()`'s own shape), so the C0 join at the blend radius is DECLARED rather than
smoothed: smoothing needs a blend function, and a blend function is the thing the ruling
says there is none of.

Measured: a 6 mm stem gives T = 2.5156 mm blending out at r = 6.9156 of an 8.8447 mm hub;
a 3 mm stem gives 1.2990 blending out at 1.9459; a 12 mm stem 4.296 out to 8.582.

**The thickening grows DOWNWARD only**, so the face the feet sit on cannot move — that is
the whole of "do not change the petal-to-hub junction", and ST6 asserts it against a
STEMLESS build of the same state on the same page.

**The placer is in MILLIMETRES OF ARC from the hub, never in `u`.** A straight tube is
exact at two stations, so no pitch constant is invented; curvature is where a pitch law is
owed, and the parameterisation is established so that session is a change of law rather
than a change of argument.

**The read-out prints TOTAL and VISIBLE separately** — on a domed head the attachment face
is high inside the bowl, so the head swallows part of the stem (0 flat, 3.35 mm at rise
0.50, 8.13 mm at a hemisphere), derived per build and never tabulated.

### 5a. Two defects the gates found, both real

**THE SOLID STEM'S TOP CAP WELDED IT TO THE HUB.** A centre fan puts a vertex at exactly
`[0, 0, topZ]` — the hub's own top-fan apex, the same double — so the two shells WELD and
a by-design overlap of two coplanar discs becomes a **within-shell** self-intersection:
**528 pairs, worst span 0.1962 mm** on the 3 mm row, against **0** on every hollow one (a
bore leaves no axis vertex to share). Caught by X2 on the first full block run. The fix is
a rim fan: N−2 triangles over the same convex disc, none degenerate, and the stem's shell
then shares no vertex with the hub's.

**ST5 ASKED FOR AN EXACT EQUALITY ACROSS TWO ROUTES AND WENT RED ON FLOAT NOISE.** On a cap
the emitted thickness is `outerRad − innerRad(phi)`, and `a − (a − x)` is not `x` in
IEEE-754 because the vertices are rounded. Fourth instance of this class here (session 38's
`seamFrameResidual === 0`, session 41's L5). The prescribed remedy applied: bound the
difference in the unit the quantity carries — `STEM_JOIN_ULP = 8` times ULP of the
magnitude the builder differenced it from, which the builder now reports.

**And one the flat arm shipped with for an hour:** its reported triangle count was
COMPUTED and wrong by 48 (1872 against an emitted 1824 — the top fan is N triangles and
had been written 2N). Both other arms already read `acc.triangleCount`; this one does now.

### 5b. The hemisphere row is the HEAD's fold, not the stem's

`STEM: x a hemisphere` reads 216 pairs, worst span 0.4176 mm. **The identical state built
with `stemLength` 0 reads the same 216 pairs at the same point (−5.76, −7.37, 0.87), and
so does `headRise max (1)` on this tree** — a two-sided measurement rather than a reading
of the label. Declared with that tag. Same class as the lobe session's own 20 mm/2.40 mm
sheet row: a pre-existing fold no row on main names because the matrix varies one control
at a time.

### 5c. R1 caught the new part immediately

Both coverage instruments' R1 counts the parts through a third accumulator that EMITS, so
it sees the ORCHESTRATION. A new part that emits and is absent from that census makes R1
fire at once — which it did, by 576 triangles, the first time a stem was built. The stem
joins that accumulator.

## 6. Verification

* **Export gate, the STEM block: 17/17 rows PASS**, ST0–ST6 green, boundary 0, live and
  export triangle counts identical on every row.
* **Connectedness, the STEM block: 17/17 ONE connected piece.**
* **Panel gate PASS**, with the stem's own WITNESS reaching past the slider into
  `hubJoinActive` — a reading no stem control can write directly.
  `--negative-control`: all fifteen routes observed the failure they exist to catch.
* **Smoke census: 26 matrix blocks** (was 25 — the session-34 trap avoided, the block
  count was confirmed to rise) **and 68 families, both directions**, ST0–ST6 among them.
  `--check --negative-control` PASS.
* **`frozen/phase26` = the 674 rows at `8421d3c`**, registered in BOTH `FROZEN_MATRICES`
  and `FROZEN_BASE_COMMITS` (a matrix with no base commit is verified by nothing — session
  32's finding), and `--verify-frozen --phase26` is deep-equal to that commit's own
  `buildMatrix()`, row for row. A phase IS owed: the matrix grew 674 → 693.
* **The byte partition: see §6a.**

### 6a. The partition, predeclared from the builder's own record

Predeclared from the BUILDER's own record — a row moves iff `stemPlan` reports a stem
actually present on it — rather than from the control set. **16 movers / 677 holders**, and
the two non-`STEM:` movers are the ones that matter:

* `stemLength max (120)` — the blanket slider sweep's own row.
* **`ALL MAX`** — session 38's lesson honoured: a row that sweeps every control is a mover
  of any control a feature adds.

The three `STEM: GATED` rows are HOLDERS by construction (length 0, or SPHERE).

## 7. What this session did NOT do

* **The sphere omission.** Eva's ruling is recorded in §4; it is its own PR immediately
  after this one.
* **Curvature, droop, nodes, taper, branches, leaves.** Out of scope by ruling. Straight
  only, for the reason Phase A gave: a curved descent makes every turn angle a function of
  azimuth as well, and makes the past-90° regime reachable below the junction where the
  analysis assumes it is not.
* **A solid core inside the stem.** Out of scope by ruling.
* **THE TWELVE BARE `footS.length` ROW-INDEX BOUNDARIES.** Recorded as a standalone hygiene
  item for someone else, as instructed. `buildPetalInto` and its telemetry use
  `footS.length` as a raw index in at least twelve places, feeding J-family and Z-family
  inputs. Nothing in this PR touches a petal row list, so nothing here is exposed to it —
  but a session that ever prepends a row to `rows` shifts every one of them silently.
* **A MUTANT TABLE FOR ST0–ST6.** `tools/verify-bloom-apex-mutants.mjs` covers the A and
  LOBE families only. The smoke census's own header says it plainly: a citation is a claim
  about the PATH a row engages, never evidence the assertion can FIRE there, and **the
  mutant table must be re-run when a family is added.** ST0–ST6 were seen red in exactly
  one state (the metrics hook absent), and three of the seven were additionally seen red on
  real defects this session (ST5 twice, on the cap's float round-trip; X2 on the welded
  cap). The other four rest on their own reading. **Recorded as owed, not closed.**
