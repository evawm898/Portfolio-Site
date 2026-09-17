# The hub's shape — GOBLET / ANGLED / CURVED (the hub-shape session)

Eva made the head-to-stem **hub** a shaped, controlled thing: three styles, a
pronouncedness amount and a length. This is the record of what shipped, the
name mapping it turns on, the byte-exactness argument, the #236 fix folded into
it, and the decisions left for Eva at the preview.

## The name, settled and reported

Eva calls "the hub" the thing that connects the head to the stem. In this code
that object is the **hub-to-stem join** — `stemJoinThickness`, `hubThicknessAt`,
the swelling underside `buildHubInto` emits, and `joinReason`. The code's own
`hub` / `hubR` / `hubT`, and the existing `hubShape` control (CAP / SPHERE),
name the **head's base plate** — a different object, and untouched here.

So, verbatim mapping:

| Eva's word | Code | Owner |
|---|---|---|
| the hub (head↔stem connector) | the hub-to-stem **join** | `stemPlan`, `buildHubInto`'s swelling underside, `hubJoinThicknessAt` (new) |
| — | the head base plate / disc / dome | `buildHubInto`'s outer surface, `hubR`, `hubT` |
| — | the HEAD's shape (cap vs sphere) | the existing `hubShape` control (section `head`) — **not touched** |

The three new controls carry Eva's meaning in the UI (section **"Hub"**) with
code names that do not collide: `hubStyle`, `hubShapeAmount`, `hubLength`. No
botanical term is used for the join anywhere — panel, read-out, code or docs.

**Flagged for Eva:** `hubShapeAmount` sits one word away from the head's
`hubShape` control. They are different things (join pronouncedness vs head
cap/sphere) and never collide as ids, but a reader scanning `hubShape*` gets
both. Rename either on the preview if it reads wrong; it is one registry field.

## The standing ruling this reverses

`bloom-geometry.js`'s own `stemJoinThickness` comment read *"DERIVED, WITH
NOTHING TO TUNE (Eva's ruling: option (b), no new control)"*. That is the line
superseded: the join's **shape** is now controlled. **What stays derived is
thickness** — the sheet the hub is made of (`hubT`) and the section-modulus
strength (`joinT`) are unchanged and never become controls. The comment now
records the supersession in place.

The prompt said the ruling lived in `claude/bloom-roadmap-sep-2026.md`. **That
file does not exist in this repository** (checked); the superseded line was the
geometry comment above, and this doc is the other half of the record.

## The parameterisation, and why GOBLET's default is a nonzero value

One style has to land on today's shape at one slider value, and that fixes the
family:

- **`hubShapeAmount`** is how pronounced the flare is. It is a multiplier on the
  swell, default **1.00 exactly**, where `x * 1 === x` reproduces today's
  arithmetic term for term. **0** collapses all three styles to a straight join
  (the flat underside a thin stem already had). The range is one-sided [0, 2] —
  no waisted/inward half, by ruling.
- **`hubLength`** is the reach below the head. Default **0 = auto**, the sentinel
  for the derived join depth (`joinT`), which varies with the stem's own
  diameter — so no fixed number could reproduce today "on every state where a
  stem exists", and the reach has to stay derived at the default. A nonzero
  value overrides it with that many millimetres, floored at the sheet.

`axisDepth` folds the pronouncedness in **once** (`amount === 1 ? refReach :
hubT + amount * (refReach - hubT)`), so the reach `rootZ` and the funnel profile
cannot disagree, and at the default `axisDepth === joinT` to the bit.

**GOBLET + amount 1.00 + length auto reproduces today BYTE FOR BYTE** on every
healthy state, by branch (`hubJoinThicknessAt`'s first line returns
`hubThicknessAt` verbatim) — the `domeIsFlat` discipline, not an argument about
arithmetic. Measured: the shipped `STEM: the shipped middle` row is 21148/21148
tris, boundary 0, identical to main; and **0 floats moved on all 762 of main's
rows** built in export mode on both trees (`Object.is`), because the hub
controls are `STEM_SUBS` (gated on `stemLength`, 0 by default) and never reach
the blanket sweep.

The style curves map a normalised radial coordinate x (0 rim, 1 axis) to a swell
fraction, each f(0)=0, f(1)=1: **ANGLED** f(x)=x (hard shoulders), **CURVED**
f(x)=x²(3−2x) (zero slope at both ends, no shoulder), **GOBLET** off its default
1−√(1−x²) (a rounded goblet bowl; at the default it is the constant-stress law).

hubLength **adds** to the object's height (Eva's ruling); `stemLength` is
unchanged. The read-out states the total below the head's top face
(`belowHeadMm = axisDepth + lengthMm`) so it is visible without measuring the
export.

## #236, fixed on all three styles, and the clause gap named

`main` shipped #236 open: a hub **narrower than its stem** exported as two
pieces. It has two halves, and each needed closing:

1. **The flat zero-volume join shell.** `hubThicknessAt`'s `if (!(hubR >
   outerR)) return joinT` made every underside ring one z — a flat disc that
   encloses no volume and is held on only by intersecting the stem wall. This
   rewrite **does not build it**: the join is inert where the head is not wider
   than the stem (`swellActive` requires `hubR > outerR`), so no shell is
   emitted.
2. **The head in the bore.** The solid root band that embeds a narrow head was
   `sphere &&`-only. Generalised to `headOuterMm < boreR` for cap and flat heads
   too, so the narrow head embeds in the stem's own solid material.

Both together are the fix, and it is the **same fill for all three styles**
because the style builds no funnel in this corner. Measured: all three styles at
the #236 corner, flat and on a cap, export **one connected piece** (connectedness
gate, 9/9). Healthy rows do not move (`headOuterMm ≥ outerR > boreR` there).

**The clause that let it through** was the matrix's own coverage plus the
absence of any assertion that the join must be inert on a narrow head: #236
needs three controls at once (a narrow hub via few petals / low spread, a long
wide stem), and the matrix varies one control at a time, so no row reached it;
and a zero-volume shell passes watertight (boundary 0), one piece (it touched
the wall), the orientation check (O1 reads only the sign of a dominant outer
wall) and the triangle-count identity. The new **ST11** asserts, from the plan's
own record, that where the head is not wider than the stem no join is active and
the fill is built; **its mutants (`hub-236-fill-is-sphere-only`,
`hub-flat-shell-returns`) restore each half and are seen red**, and matrix block
34 carries the #236 corners so the connectedness gate exercises them.

## The cap clamp — a reachable watertightness corner

A flat hub carries the swell as a downward cone and tolerates any reach. A domed
hub carries it as a deformation of the inner cap, which inverts (the inner
sphere radius `Rd + t/2 − axisDepth` going negative) and self-intersects for a
large reach. That combination (a cap head with a big `hubLength` or amount) is
reachable, so the reach is **clamped on a dome to `Rd − t/2`** (one sheet of
inner apex kept), told in the read-out (`hubReachClamped`). The derived `joinT`
is always well under it, so the default never clamps and its byte-identity is
untouched.

## Instruments

- **ST5** kept its derived-**thickness** clause (`joinT` stays the section
  modulus) and its active/inert verdict, now against the styled `swellActive`.
- **ST11** is the new family: the emitted underside is the styled profile the
  controls declare (read off the hub builder's own samples against
  `hubShapeExpected`, whose owner is the controls, not the geometry), blending
  out at the styled radius; plus the #236 clause above.
- **Mutants** (`tools/verify-bloom-apex-mutants.mjs`): `hub-ignores-the-style`
  (ST11), `hub-236-fill-is-sphere-only` (ST11), `hub-flat-shell-returns` (ST5).
  All three fire and the clean tree is silent; the #236 probe row is FLAT, not a
  cap, because the cap clamp zeroes the swell there and ST5 would not bite.
- **Matrix block 34** (16 rows): each style at amount 1 and 2, amount 0, an
  explicit length, MAX amount × MAX length per style, the widest stem, the #236
  corners (flat, cap, all three styles), and a GATED inertness row.
- **Smoke block 34** (three rows, `--conn` required as a new geometry mode).
- **`frozen/phase33`** = the 762 rows at `0ece7e7`, registered in both maps.
- **Render:** `node tools/shot-bloom-hub.mjs docs/img` → `docs/img/hub-shape.png`
  — the 3×3 of styles × low/default/high, framed on the join.

## Panel placement — a ruling made without Eva

The `Hub` section is a child of `Stem`, sibling to `Leaves`, on the grounds that
its controls are inert without a stem. **This is my ruling; Eva may overturn it
on the preview.** Route coverage is unchanged in identity (the panel gate reads
the section tree, not a count).

## Total height / hubLength adds

`hubLength` **adds** to the object's height; `stemLength` is unchanged. The
read-out prints the total below the head's top face on every stem row.

## WAITING ON EVA

- The panel placement (`Hub` under `Stem`).
- The `hubShapeAmount` / `hubShape` (head) name proximity.
- The style curves and defaults, judged on `docs/img/hub-shape.png` and the
  deploy preview.
