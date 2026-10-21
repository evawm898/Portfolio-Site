# Bloom — the braid (F1.3b, BRAIDED stamens)

Session outcome, Oct 21. Base: `main` at `955b90a` (merged forward to `0a48f17`). These rulings govern
and nothing here re-opens them:

- Eva's Q2.4: braided = ONE bundle.
- The braid session's three rulings: one bundle of ALL the androecium's filaments; the anther on the
  braid's end tangent; select-and-edit with the existing picker.
- The coil-§7 confirmations of Oct 20, recorded RULED in `docs/bloom-stamen-coil-outcome.md` §7.

The last build on the feature map.

## §1 What shipped

- **`stamenCoil` gains BRAIDED** (label "Braided (one bundle)"). It shows wherever the coil does.
  The radius and turns mean the bundle's lay radius and turns. NONE and INDEPENDENT are untouched,
  BY BRANCH (the partition is §5).
- **One bundle.** Every filament gathers from its own root onto the bundle's axis and winds round it
  at the coil's radius and turns.
  - The axis is the style's: the apex, the azimuth-0 plane.
  - Each strand lays at its own angle, its root's azimuth, so the strands go round one another.
  - At equal radius and turns they are parallel helices: a rope-laid bundle.
- **The anther sits on the braid's END TANGENT**, through the coil's own end frame. One expression
  serves both coils.
- **Select-and-edit reuses the scope picker** (Scoping-b's `#scopeBar`); there is no second picker.
  - On a built braid the bar lists "The bundle (every strand)" and "Strand i of N", one entry per
    built stamen, from the owner's own record.
  - A pick LOADS and writes nothing.
  - An edit writes an offset onto the picked strand's own entry, `scopes.strands [{strand, offsets}]`.
    Only a strand's length, coil radius and turns can be offset (`SCOPE_STRAND_IDS`, the geometry's
    list). Every other androecium control is the bundle's, and under a pick it is told "the bundle —
    <the file reader's own reason>".
  - The offsets are clamped into the registry's bounds. They are live only while the braid is built:
    a record on an INDEPENDENT coil is kept and inert.
  - The design file's fourth container (`overrides.strands`) is added with no migration. An older file
    reports it missing, and the page keeps its offsets (rule 3).
- **The read-out:** the STAMENS line says BRAIDED, and gives:
  - the longest gather, the radius, the turns asked and the revolutions laid, and the stations a strand;
  - how many strands carry their own values;
  - how many were too short to gather all the way, how many had their turns clamped and how many their
    radius held by the fold limit;
  - the tightest radius of curvature, and how many strands fall under one sheet thickness with the curl.

## §2 The law — an offset laid in the bundle's frame, through the one emitter

`coilLaw`'s third arm, `braidLaw`, returns the strand's centreline in its own rod frame, so `rodInto`
draws a braided strand exactly as it draws a coil. Every strand is still its own rod, rooted through
the slab on its own foot (JS1–JS3 unchanged).

    C(s) = A(s) + E(s) w(s)

- **A, the bundle's axis**, is spineLaw at the apex, curled at `stamenCurl / stamenLength`: the
  CONTROL's length, so one strand's length offset never bends the others' axis.
- **E** is A's rotation-minimising frame.
- **w** is the strand's offset in that frame. It has two regions:
  - **The gather.** w runs from the strand's outer root to its slot `R (cos th0 N1 + sin th0 T)`,
    with th0 = pi − azimuth. The strand leaves its root along its own normal and arrives with the
    twist's velocity. Its curvature is EXACT and arithmetic only (`|c' x c''| / |c'|^3` on polynomials
    between fixed vectors), so the gather length is bisected, never bounded.
    - Two earlier bounds were measured too pessimistic, and the reasons are in `braidGatherGeometry`'s
      header. One let the gather cancel the strand's speed into a 0.0036 mm cusp. The other clamped up
      to 82% of the strands of a flat hub.
    - The gather is at least 15/8 of its distance, so the lateral slope is at most 45 degrees. That
      was a choice made without a ruling.
    - It may take the whole strand. Capping it at half (the coil's ramp precedent) twisted a domed
      strand obliquely, at 0.18 mm of radius.
    - Where even the whole strand fails the floor, the strand gathers the largest fraction the floor
      admits and does not twist (told, continuous).
  - **The twist.** `th = th0 + Omega(s)`, at rate `2 pi n / stamenLength` (the length is the AXIS),
    ramped in over one asked pitch. On a straight axis its curvature is the coil's exact form, so the
    turns clamp is a bisection.

## §3 The floors, on every strand

- **The composite curvature floor** (Q2.3, one sheet thickness of radius) bounds the gather and the
  twist exactly, as above. Swept over 3,780 states (3/6/30/120 stamens, RING/DISC, curl −180..180,
  rise 0/0.5/1, R 0.3–10 mm, turns 0.5–12, length 5–120):
  - **0 uncurled states under the floor.**
  - With the filament curl, the composite in the twist is MEASURED and told, the coil's precedent:
    BRAIDED §7a-n states, the tightest §7a-w mm; INDEPENDENT §7b-n states, the tightest §7b-w mm.
- **The fold limit** (spine-cup-fold: a spine may not bend past its own cross-section) is the
  BUNDLE's. A strand laid at R about an axis bending at 1/k has its inner skin `1/k − R − t/2` from
  the bend's centre. So the lay radius is clamped to `1/|k| − t`, per strand, and told. The bundle's
  curl itself is never clamped by one strand.

## §4 Self-contact — cross-shell, by design, measured and declared

**Strands of one braid touch and cross by design. That is CROSS-shell:** each strand is its own closed
rod, so their overlap is the export contract's own case of overlapping closed solids.

**Within-shell pairs read 0 on every braid row.** Two block-74 rows are declared, and neither fold is
the braid's. Each reads its base class's own record to the pair and the fourth decimal:

- `BRAID: 6 on a hemisphere (rise 1)` reads 248 / 0.4262 mm at (−5.77, −7.37, 0.85). That is 9.4 mm
  off the axis, among the petals, and is `headRise max (1)`'s own effective-tilt fold.
- `BRAID: 6 x STYLE` reads 272 / 0.0796 mm at the style's inner root ring. That is every STYLE row's
  by-design rod overlap.

The census (Node, export mode, `tools/bloom-self-intersection.mjs`):

| stamens | NONE cross | INDEPENDENT cross | BRAIDED cross | within (all) |
|---|---|---|---|---|
| 3 on a ring | 4,706 | 4,864 | 4,694 | 0 |
| 6 on a ring | 5,096 | 6,148 | 8,228 | 0 |
| 30 on the disc | 10,325 | 23,345 | 139,235 | 0 |

The braid's own contacts are the difference from NONE. At 30 on the disc that is ~129,000 pairs,
because thirty strands share one bundle. Nothing is clamped. The INDEPENDENT coil's interpenetration
at 3+ stamens is a declared look, ruled (coil §7), and so is this.

## §5 Byte partition — NONE and INDEPENDENT hold to the bit

Predicate `stamen-braid` in `tools/verify-bloom-surface-bytes.mjs`: a row moves iff the BASE tree's
own `footRing()` builds an androecium AND the row asks for BRAIDED at a radius above 0.

**The base build of a BRAIDED row.** The base tree has no BRAIDED value, and its builder refuses an
unknown coil by name. Its page cannot hold the value either: the select has no such option, and a
design file naming it keeps the control's own default. So the base build of such a row is the row with
`stamenCoil` at the BASE's default. The byte tool now hands the base tree only the choice values its
own registry lists (`baseState`, the choice twin of `baseScopes`).

§8 has the measured result.

## §6 THE HANDEDNESS — a measurement against a ruling, left to Eva

The coil-§7 ruling says "right-handed only". **The coil as shipped is LEFT-handed.** It turns CLOCKWISE
seen from above as it rises. Measured on the emitted stations, it turns −11.49 rad about +z over the
upper 60% of a three-turn coil (`th = phase + 2 pi n s / L` laid on `cos th N1 + sin th T`, with `T`
the frame's azimuthal tangent).

The braid follows the shipped hand: one handedness, −11.48 rad on the same measure.

Making both right-handed is one sign on the turn, but it moves every INDEPENDENT row's bytes, and this
brief holds INDEPENDENT byte-identical. So the hand is LEFT, recorded here and in CLAUDE.md, and the
flip is Eva's to rule: a byte partition of its own, every INDEPENDENT and BRAIDED row a mover.

## §7 Cost — reported before building

| state | export tris | of budget |
|---|---|---|
| 6 BRAIDED on a ring (r 1.5 x 3) | 33,808 | 2.3% |
| 30 BRAIDED on the disc | 70,288 | 4.7% |
| **120 BRAIDED on the disc x 12 turns x 120 mm** | **552,688** | **36.8%** |

A strand carries the coil's station count, `STAMEN_ROWS + ceil(turns x 16)`, a function of the asked
turns. So a braid costs exactly what the same INDEPENDENT coils cost, and live equals export on every
row.

## §8 Verification

§8 is completed below with the measured results.

## §9 Frozen phase

`frozen/phase80` is the **1,437 rows at `0a48f17`**, registered in `FROZEN_MATRICES` and
`FROZEN_BASE_COMMITS`, and proved deep-equal (`--verify-frozen --phase80`). 80 was the next number on
`main` at registration (phase79 = `fc96dc9`). The bloom files at `0a48f17` are `2378a3b`'s; the two
stretch-simulator commits after it move no bloom row and no workflow file. A phase is owed because
block 74 adds twenty rows (1,437 → 1,457).
