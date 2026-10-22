# Root support — sepals and leaves take the root law; the foot clamp is derived

*Oct 21, Eva's two rulings. Base: `main` at `8403b47` (big petals, #434).*

Read [`bloom-big-petals-outcome.md`](bloom-big-petals-outcome.md) first: this session
finishes what its §3b left open (sepals pinned off, leaves never wired) and replaces
the fixed 10 mm foot clamp its §7 reported binding over 56% of the width slider.

## 1. What was ruled

1. **Sepals and leaves take the root law.** ONE law and one owner
   (`petalRootTaper` / `petalRootTaperFor`), each organ at its OWN length against the
   35 mm / 1.2 mm reference, the identity BY BRANCH at or under 35 mm.
2. **The fixed 10 mm foot clamp is replaced by a cap derived from the hub — the arc
   each foot owns at its ring.** A length from lengths, never typed; clamped and told;
   `footRing()` stays the one owner; the floors do not move.

## 2. Sepals

- **The pin is lifted.** `sepalBladeState` no longer sets `rootTaper: 'OFF'`. A sepal is
  the petal builder on a second ring, so the one law (`thicknessProfile`) reaches it
  through `petalRootTaperFor(ps, bladeAskedLengthMm(ps))` with nothing else changed —
  the seam clearance, the fold limit, the cup fold clamp, the roll floor and the rim
  bead all follow, as they do on a petal. `petalRootTaperFor` keeps the pin's READ as
  the one place an organ could be held off the law.
- **Each tier reads its own length** (`sepalAskedLengthMm(st)` on the tier's state:
  the own `sepalLength`, else the petal's × `sepalScale`).
- **The descriptor's foot height follows the root**: the foot's bottom skin passes
  through the attachment, so the ring row stands half the ROOT's thickness above it
  (half the sheet by branch at or under 35 mm).
- **The angle limit's seam step reads the sepal's root factor** (the bucket's
  `seamClearanceMm(…, rootFactor)`). Its contact test still compares laminae against
  one sheet (`t`), not each root's own thickness — **declared, not changed**: the
  contact half-thickness under a thickened root is under-counted by up to
  (τ_r − 1)·t/2 near the roots, and the drawn limit is therefore slightly permissive
  there. Recorded as the one open follow-up of this ruling.

### 2a. What "the hub thickens to match" means for a sepal — decided and measured

A sepal does not stand on the plate's rim the way a petal does: on a stemmed bloom
it stands partway down the hub-to-stem JOIN's flare (`sepalHeight`), where the
material above the attachment is the plate plus whatever the join adds. The question
was whether that flare already carries a thicker root, or whether the plate must
follow. **Measured** (`sepalHeight` 0.25 / 0.75 / 1.00, stems 6 and 12 mm, lengths
40–120 mm, 30 states): **with the plate held at the sheet, 23 of 30 states have less
material above the attachment than the sepal's own root** (at `sepalHeight` 0.75: −0.57
mm at 60 mm on the 6 mm stem, −3.43 mm at 120 mm). The flare alone does not carry it.

**Decision: the plate is held to the LONGEST BLADE IT CARRIES, sepals included** —
`hubRootTaperLengthMm` is `max(the petals' bound, every built tier's sepal length)`.
A 120 mm sepal puts a **4.961 mm** plate under the bloom (×4.134 the sheet).

**Consequence, stated rather than worked round:** the join's thickness is floored at
the plate (#434), so a plate thicker than the join the stem asks for makes the join
**inert** — and a sepal on an inert join stands on the RIM (the existing fallback,
told). Measured: on the 6 mm stem every sepal from **80 mm** up stands on the rim; on
the 12 mm stem from **120 mm**. Block 76's `8 sepals x 120 mm x stem 60` row is that
state.

## 3. Leaves

- **The one law at each blade's own length**: `leafBladeLaw` takes the root's length
  as a separate argument (`rootLengthMm`) **named at every call** — the simple leaf's at
  its node, each COMPOUND LEAFLET's own (`sp.L`, never the rachis's), the lobed leaf's
  through `lobedLaws` — so a wrong owner can be seen at the call site (and is two of
  the mutants). `tAt(u)` is handed to `emitPanel`, the form, the fold limit
  (`leafSpineCurveLaw`'s `tauAt`) and the curve rise.
- **The petiole carries the root (simple and lobed)**: `petioleRootFloorMm(wire, L)` —
  the petiole's DIAMETER at least the blade's root thickness (radius = wire × τ_r) — then
  `petioleClampMm` (the compound / lobed rod law, one owner): where the rooted end would
  no longer fit the stem the petiole is **CLAMPED at the stem's cap and told**. A 120 mm
  leaf on the default 6 mm stem at 35° asks 2.481 mm of radius and is clamped at **2.239
  mm** (the cap); on a 3 mm stem at **1.491 mm**; a 60 mm leaf gets its 1.050 mm.
  The lobed petiole is `max(area law, root floor)`.
- **Compound stalks STAY THE WIRE** (S3's ruling, untouched): a tapered leaflet's root
  is thicker than the rod that holds it, said on the read-out. Thickening the stalk to the
  root would push it past the rachis's own section at the stalk's root (LF17's root disc),
  which is a ruling, not a measurement.
- **The thickness readers**: the shared node offset reads the emitted blade and the rod's
  real radius (so a thicker root and petiole seat themselves); the slider arch's inset
  reads no thickness; the drawn spine's rise reads the fold limit at each substep's own
  thickness; SN4's reach is tip-based and unaffected; the leaf E2 rows read the emitted
  rims. ST9, its witness and the combination gate's leaf-stem measure name the petiole at
  its real radius through the builder's `rodAxes`.
- **Florets**: a raceme's floret is the same builder on its own state — its sepals take
  the law at their own length (an own `sepalLength` is not scaled by `floretScale`).

## 4. The foot cap

**The law.** `footRing()` places each ring by the area rule over the ASKED feet
(floored, uncapped), then caps each foot at the arc it owns on that ring:
`arc = radius × span`, span = the fan's step or 2π/n; `width = asked > arc ?
max(FOOT_MIN_WIDTH_MM, arc) : asked`. A foot inside its arc is the asked double, no
product formed — the shipping default (6.40 mm against a 6.95 mm arc) is the
expression it was. The sepal foot takes the same cap at its own ring.

**The alternative measured and refused: the fixed point.** Placing the ring by the
area rule over the CAPPED feet has a closed form: with `R₀ = s·sqrt(n·w·t/π)` and
`w = 2πR₀/n` the capped foot is `w = 4π·s²·t / n` whatever width is asked (7.54 mm at
eight petals on the shipping spread and sheet), so once the cap binds the petal-width
slider stops moving the ring OR the foot over most of its travel, and the ring depends
on the cap that depends on it. The ruling's words are "a cap derived from the
hub": the hub is placed by the asked feet and the feet are capped to their room ON it.

**Measured** (`node tools/bloom-foot-cap.mjs --base <worktree>`, EXPORT, one RADIAL
whorl, `petalWidth` 8..46 in whole mm):

| petals | cap binds (this tree) | 10 mm clamp bound (base) | width 16: built / arc | width 46: built / arc (base) | D_max (base) |
|---|---|---|---|---|---|
| 8 | 28 of 39 | 21 of 39 | 6.400 / 6.947 | 11.778 / 11.778 (10.000) | 2..2 (2..2) |
| 16 | 37 of 39 | 21 of 39 | 4.912 / 4.912 | 8.329 / 8.329 (10.000) | 2..2 (2..3) |
| 40 | 39 of 39 | 21 of 39 | 3.107 / 3.107 | 5.267 / 5.267 (10.000) | 2..2 (3..5) |

**Crowded caps lower and sparse ones higher, as ruled**: at 8 petals a 46 mm petal now
stands on an 11.8 mm foot (the old clamp held it to 10); at 40 petals the foot is the
arc, 3.1–5.3 mm, where the old clamp let a 10 mm foot overlap four of its neighbours.
**The crowding raster's D_max falls to 2 on every measured state** (the feet abut
instead of stacking). **The cap binds at the shipping width from ten petals up**
(6.40 mm against a 6.21 mm arc at ten) — every `petalCount` 10..40 row of block 1
moves, which is why the byte partition below is large.

The read-out says it (`FOOT WIDTH CAPPED by the ring's own room …`, the asked and built
widths and the arc), and `FOOT ROOM UNDER THE FLOOR` where the arc is under 1.6 mm and
the floor wins (40 petals × 6 whorls, inner rings).

## 5. Gates

- **T4 restated** (it asserted the pin): every built sepal's root and untapered rows,
  read off the FILE, against the law at its tier's own restated length; T3 counts sepal
  roots among the roots the plate must carry.
- **T5** (new): every leaf blade — simple, lobed, each compound leaflet at its own
  length — read off the file on every row clear of its rim taper (row 0 is held by the
  petiole). A compound leaf whose rachis passes 35 mm is entered even where no leaflet
  does (the state on which a leaflet reading the rachis would taper).
- **T6** (new): the petiole's rooted ring, **read off the file** (the cluster of
  `LEAF_PETIOLE_SIDES` vertices one distance from the axis in that plane), is at least
  half the restated root, or exactly at the stem's restated cap. **Its first cut read
  the radius off the harness's own clean REBUILD** and could not fire on a petiole the
  page built at the wire — the mutant table said so (fourth durable rule's mirror image:
  the measured side's owner).
- **FC1** (new, pure, `footCapClauses` — junctionAssertions carries it in both STL
  gates): each ring's foot against the cap restated from the ring's radius × the span
  restated from the controls (never the builder's `footArcMm`), the told flag both ways,
  the record's arc, and the EMITTED foot rows' half-widths. Its first name, `FC`, was
  invisible to the smoke census (it counts codes with a digit).
- **Re-derived, never relaxed**: Z3's restated foot through the cap; SP3's foot thickness
  and whorl height and SP11's tier height at the root factor; LF18 / LF26 the root-floored
  petiole; SO13's widths through the cap; panel route (j)'s foot through the cap.
- **Mutants** (`node tools/verify-bloom-root-taper.mjs --control`, each witnessed on its
  mutated module before the clause is consulted): the sepal pin restored (T4), the leaf
  reading the petal's length (T5), the leaflet reading the rachis's length (T5, on the
  default 26/30 mm leaflets of a 120 mm rachis), the petiole left at the wire (T6), the
  foot cap typed back to 10 mm (FC1) — beside #434's four. **9 of 9 fire what they
  name.** The must-fail now carries `--only=<id>`.
- **`rootTaperFactor` is memoised on the exact double** — pure, so bit-identical; owed
  because the four-tier × 40-sepal corner went 16 → 24 s a build once sepals took the law
  (15.3 s with the memo).

## 6. Matrix, census, bytes

- **Block 76** (21 rows, 1,485 → 1,506): sepals at 60 / 120 mm, on a stem, two tiers,
  at the petal's own 100 mm, GATED at 35; the simple leaf at 60 / 120, on a 3 mm stem,
  arched; the LOBED leaf; COMPOUND with 60 mm and with default leaflets; a raceme's
  leaves and sepals; width 46 at 8 / 16 / 40, width 16 at 40, the FAN, and 40 × 6 whorls.
  **Smoke block 76** (7 rows, `--conn`). The 100 mm petal's eight-sepal row in block 75
  is RELABELLED (its label said the sepals were pinned off).
- `frozen/phase82` is the **1,485 rows at `8403b47`**, registered in both maps and proved
  deep-equal.

*(the byte partition, the census re-records and the combination gate — §6a–§6c — are
filled in from the runs below)*

## 7. Sheet

`node tools/shot-bloom-root-support.mjs <dir> --base <worktree> --png docs/img/root-support.png`
— the 120 mm sepal and leaf before (a worktree of `8403b47`, its own server) and after,
each root edge-on, and the wide petals at 8 and 40 from below; every thickness read off
the exported file, every foot the emitted foot row.

## 8. Open, for Eva

- The sepal angle limit's contact test reads one sheet, not each root (§2).
- A long sepal makes the join inert and stands on the rim (§2a) — whether that is the
  wanted look on a stemmed bloom.
- Compound stalks stay the wire under thickened leaflet roots (§3).
- Nothing has been printed; the 35 mm / 1.2 mm reference and every number above are
  comparisons against a line drawn here.
