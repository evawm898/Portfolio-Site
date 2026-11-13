# /frame — the flow grammar (a reading of the references, and the spec for `ornFlow`)

Eva, Nov 13: *"We don't yet have a great ability to create filigree in a nice swooping motion that follows and
flows with the shape of the frame. Not the same shape repeated over and over. It needs to flow and understand
flow."* This document reads HOW the ornament flows in the five references she attached (none is committed — stock
photographs; the trace tool reads them from a directory you pass it), states the grammar as rules with numbers, and
is the spec the flow model (`frame-flow.js`, the hidden `ornFlow` option) is built and judged against. Read §0 for
how the measurements were taken, §1–§6 for the grammar, §7 for what the rinceau on `main` does against it.

The references, as numbered in the session:

| # | what | read for |
|---|---|---|
| R1 | a set of six gilded frames: a large oval with a ribbon crest and leaf garlands, a rectangle with scrolled corners, four small shield/cartouche frames | the cartouche: an outline MADE of C-scrolls |
| R2 | a bronze oval, shell crest, shell cartouche at the bottom, pierced scrollwork all round (600 × 800 px) | the whole grammar — traced in full (§0, the overlay) |
| R3 | an arched photo frame, palmette crest, beaded and leaf-run band | ornament ON the band; the crest as the one projection |
| R4 | a gilded rectangle, shell crest and bottom shell, corner clusters | a rectangle's flow: crest → corner → side |
| R5 | a gilded square, corner volutes, centre cartouches top and bottom | the corner as a source, the waist mid-run |

## 0. How it was read

R2 was cropped at 2× and its ornament's main spine lines traced by eye in its own pixel coordinates; the trace is
data in `tools/frame-flow-trace.mjs` and draws as `docs/img/frame-flow-trace.png` (the spines, their growth arrows,
the molding and the envelope — line art only; `--refs <dir>` lays the same trace over the photograph into the
output directory, which is not committed). The molding was measured off the photograph's own dark runs: the outer
edge at x 85 on the row through the centre and y ≈ 127 at the top, so the outer semi-axes are **a ≈ 215 px, b ≈ 287
px**, the opening's **a ≈ 178**; the band is **M ≈ 37–40 px** on the flank (≈ 0.18 a). Every proportion below is in
units of M so it transfers to the frame's own band.

## 1. Direction — two sources and a meeting

- **R2 grows from BOTH axis motifs toward a meeting at the upper shoulder.** From the crest shell the ornament pours
  OUTWARD AND DOWN: a C-scroll leaves from under the shell, sweeps out, and rises into an outer volute that curls
  back toward the shell (its eye points at the source). From the bottom shell the ornament climbs: a C sweeps out to
  the FOOT (a volute curling down and under, the frame standing on it), and above it every leaf on the flank POINTS
  UP — the long acanthus flames have their tips up and curling outward. The two flows meet at the **upper shoulder,
  about 28 % of the way from the crest to the bottom** (by the ellipse's own parameter; traced at (116, 204) px), where a small fan
  leaf pointing down-and-out (the crest flow's last word) sits against the volute that caps the topmost flame (the
  bottom flow's last word). The meeting is MARKED, not hidden: two opposed ends, a gap, a leaf.
- **The meeting is not halfway.** The crest's flow is short and heavy (two elements and a fan), the bottom's is long
  and light (foot, a long fluted stem, a volute node, two flames). The meeting sits where the weight is least, which
  is nearer the crest because the crest's elements are larger and therefore fewer.
- **R4 and R5 (rectangles):** the crest motif's scrolls run outward along the top toward the corner, and the CORNER
  is itself a source — the largest volute on the frame, from which the side's ornament runs down. The meeting on a
  long side is at its WAIST (R5's side: a narrowing in the silhouette a third of the way down, then a smaller node).
  On the top run R5 meets at the centre cartouche, R4 at the corner cluster.
- **Mirror:** every reference is bilaterally symmetric about the vertical axis; nothing crosses the axis but the two
  axis motifs, which are each their own mirror.

## 2. Continuity — how one scroll hands off to the next

- **A scroll's tail becomes the next scroll's start.** In R2's flank the fluted stem of one element runs up into the
  next element's leaf without a break: the stem is tangent-continuous through the hand-off and the two elements
  share their first few millimetres (they fuse, then part). The branch is a SPLIT, not a joint: the child leaves the
  parent along the parent's own tangent and curls away only gradually (traced: the flame stem leaves the lower volute
  node at (52, 532) along the node's outgoing tangent, within ~10°).
- **C into S.** The crest element is a C (both ends curl the same way); the next (the shoulder arch) is a C laid the
  other way up, and together they read as one S whose inflection is the opposed-volute junction at (233, 125–145).
  Along the flank the stems are S-curves: they bow toward the frame and away again (one inflection each) and end in a
  volute or a flame.
- **Where two volutes meet they are OPPOSED** — each curling back toward its own source, eyes facing (crest scroll's
  outer volute vs the shoulder arch's volute; the bottom C's inner volute vs its mirror across the shell). A volute
  is never laid tangent into another volute's coil.
- **Curvature is monotone along each element** — the line of beauty: a long gentle body, the curvature growing
  steadily until it winds into the eye; no element straightens again once it has begun to coil.

## 3. Variation — size, curvature and spacing with position

- **Nothing repeats identically — but not because every length differs.** Measured off the trace (spine length in M,
  `node tools/frame-flow-trace.mjs`): crest C 3.25, shoulder arch 4.14, shoulder fan 1.37, bottom C 4.18, foot fan
  1.27, lower stem 4.82, lower flame 5.79, upper flame 3.38, flank cap 2.19. Two pairs ARE within 10 % (shoulder arch
  4.14 / bottom C 4.18; the two fans 1.37 / 1.27) — and they never read as a repeat, because each pair differs in
  KIND and in how it lies: the arch is a C rising off the frame and curling down, the bottom C sweeps out and curls
  under; one fan points down at the meeting, the other up from the foot. Variation is length AND turn AND which way
  the curl faces AND where it sits on the outline. Volute radii run ≈ 0.2 M (the flank node) to ≈ 0.35 M (the foot).
- **The sides carry the long elements and the ends the short, tight ones.** Where the outline is flat (R2's flanks:
  the outline's radius ≈ 6 M) the elements are long and slow, their bodies nearly parallel to the frame; where it
  turns fast (the crest and bottom: radius ≈ 2–3 M) they are short and coil tightly. Element length tracks the
  outline's own radius of curvature, not a fixed pitch.
- **Size falls away from a source and rises toward a heavier one.** The bottom C (2.6 M) is followed by a long stem
  and flames (4–5 M) — the bottom flow GROWS as it climbs and peaks at the upper flank, then the topmost element (the
  volute cap) is small; the crest flow is heavy at once and shrinks to its fan. Spacing tightens where the sizes
  shrink.

## 4. Relationship to the frame — following, and the outer silhouette

- **Following:** along the flanks the stems run within ~10–15° of the frame's tangent (the fluted stem of the lower
  flank is nearly a parallel curve, offset ≈ 0.6 M outside the molding); only the volutes and the leaf tips leave the
  tangent. The ornament's long axis turns with the frame: on the shoulder the arch scroll's chord follows the oval's
  turn.
- **The outer silhouette is ONE continuous envelope, with gaps.** R2's ornament stands beyond the molding all round,
  and its outer edge reads as one cartouche outline: projection beyond the molding, in M — **crest 2.5** (the shell),
  **shoulder 0.6–0.8** (the arch and the flank cap — a waist below the crest), **upper flank 1.8** (the flames; the
  widest point of the whole object sits ABOVE the oval's widest), **lower flank 1.7** (the stem's volute node), **the
  feet 2.5** (`frame-flow-trace.mjs`'s reach column). Between the elements the envelope
  dips to the molding (pierced gaps between scroll and molding — the scrolls are attached at their roots and at the
  hand-offs, never along their whole length).
- **R3 is the counter-example: ornament ON the band** (a beaded border and a leaf run inside the molding's width),
  and only the crest projects. So both relationships are classical; R2 and R4/R5 project, R3 stays on.
- **R1's small frames go further: the outline IS the scrolls** — a shield whose every edge is a C-scroll.

## 5. Hierarchy

- **R2:** crest (shell + C pair, 2.5 M tall) heaviest; bottom (shell + feet, 2.5 M) second; the upper-flank flames
  the largest elements by length but light in mass (thin flames); the shoulder meeting a small fan; the lower flank's
  volute node a minor accent. One element shouts (the crest), the bottom answers, the flanks are long and quiet.
- **R4/R5:** crest shell and the corners heavy; the top run between them light, with a waist; the side light with
  one node.

## 6. Acanthus — sheathing, terminating, curling back

- **A leaf SHEATHES the hand-off**: where a child scroll splits from its parent, an acanthus wraps the fork (R2's
  flank node at (52, 532); R4's corners).
- **A leaf TERMINATES a flow**: the crest flow ends in a fan leaf at the shoulder; the foot carries a fan leaf above
  it pointing up. A terminal leaf points along the flow it ends.
- **Flames point with the growth and curl back at the tip**: R2's flank flames point up (the bottom flow's direction)
  and their tips curl OUTWARD and over (away from the frame), opposite to the curl of the volute they spring from.
- **Feathering**: each flame is three to five lobes stepped down its outer edge, the inner edge smooth along the stem.

## 7. What `main`'s rinceau does against this (why it reads as repeated)

| grammar | the rinceau on `main` (§18 of the charter) |
|---|---|
| two sources and a meeting (§1) | no direction: the stem waves at a constant phase from axis to junction; every volute is the same shape at its w(s) |
| hand-off: the tail becomes the next start (§2) | volutes are tendrils hung off one sine-wave stem; nothing hands off |
| size follows the outline's radius and rises/falls along the flow (§3) | one law, `len = (1.25 + 0.5 w) M`; w falls smoothly from anchors, so neighbours differ by a few % — measured (`tools/frame-flow-measure.mjs`, the right side's volute tendrils): the oval's 14 of 45 pairs share a shape (closest d 0.10: 16.4 / 16.3 mm, 0.92 / 0.93 turns), the rectangle's 6 of 36 and the arch's 7 of 21 at d 0.00 (21.2 / 21.2 mm, 1.06 / 1.06 turns — one shape, drawn again) |
| a long element where the outline is flat (§3) | half wavelength (1.15 + 0.55 w) M × compression: the curve only ever SHRINKS elements |
| an outer envelope (§4) | the band is the cap (Eva's earlier ruling): everything inside a 16 mm band |
| opposed volutes at a meeting (§2) | stems end under a rosette |

## 8. The spec for the flow model (what `ornFlow` must do)

1. A **flow per side**: the half outline from the top axis to the bottom axis (or the sill) is one path; sources at
   the axis motifs and the corners/springings, each with a weight; a **meeting** between consecutive sources at the
   least weight; elements laid from each source toward the meeting.
2. **Elements are spines of monotone curvature** (a clothoid body tightening into a log-spiral volute); each child
   **splits from its parent with G1 and G2** (same point, tangent and curvature) and parts gradually.
3. **Length tracks the outline's radius and the source weight**, decays along the flow by a non-constant ratio
   solved to land the last element at the meeting; no two elements on a side share length / turns / curvature profile
   within a stated tolerance.
4. **Meetings are opposed volutes** with a terminal leaf; hand-offs carry a sheathing acanthus; flames point with the
   growth.
5. **Two layouts**: (A) ON-BAND, inside the 16 mm band (the band cap); (B) OUTER CONTOUR, the elements standing
   beyond the molding by an envelope offset per §4 (crest highest, a waist, feet), every element attached at its root
   and the chain one connected solid on the flat back.
