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

## 9. The measured forms (round 4, Nov 14 — `node tools/frame-forms-trace.mjs`)

Round 3 (`frame-mass.js`) placed the right material in the right places, and every critic still read it as "a web
behind a wire": the outline of each element came from C2's thin spine. Round 4 builds each element's outline from
the bronze's own forms, so they were measured first.

**How.** Six elements of R2 were traced by eye on 7–9× crops, gridded every 5 px. The traces are data in the tool,
in the photograph's own pixels (± 2 px ≈ ± 0.05 M). `docs/img/frame-forms-trace.png` draws them as line art.
`--refs <dir>` lays them over the photograph, and that output is not committed.

For each centreline, the tool:
- smooths it (three Chaikin passes);
- resamples it every 0.5 px;
- measures its length (in M; M = 38 px), its turn, and its curvature κ·M at eleven stations along its length,
  smoothed over ± 4 px.

**The widths are read by eye, and stated as a reading.** A threshold transect across the strap was tried first,
but it reads the bronze's highlights as gaps and its shadows as metal: it gave 0.03–1.6 M on one strap.

| | element | length | turn | κ·M at 0, 0.1 … 1 of its length | width (M): root · crown · entering its end | its end |
|---|---|---|---|---|---|---|
| E1 | the shoulder C (root at the waist → volute toward the crest) | 4.07 M | 1.34 | 0 · .68 · .73 · .90 · .98 · .82 · 1.04 · 1.44 · 3.09 · 7.64 · 7.88 | .45 · .47 · .37 | a volute: outer Ø 0.75 M, ≈ 1.05 turns, a ball eye Ø 0.16 M in a dark ring; its root curls the same way into a small tail volute (Ø 0.5 M) inside the arch |
| E2 | the crest C (from under the shell → volute facing it) | 2.68 M | 1.12 | 0 · .22 · .29 · .59 · 1.19 · 2.83 · 4.00 · 3.11 · 3.39 · 6.99 · 6.58 | .32 · .30 · .26 | a volute: outer Ø 0.55 M, ≈ 0.9 turn, a ball eye Ø 0.15 M |
| E3 | the foot (reeded, from under the bottom shell, curling under) | 3.57 M | 1.14 | 0 · .16 · .23 · .64 · 1.32 · 1.64 · 2.61 · 2.37 · 3.87 · 5.07 · 1.70 | .53 · .53 · .40 | a CLOSED curl: outer Ø 0.8–0.9 M round a dark hollow Ø 0.4–0.5 M, ≈ 0.9 turn |
| E4 | the node (the lower stem rolled over outward) | 3.64 M | 0.60 | 0 · .02 · .08 · .28 · .87 · 1.84 · .50 · 2.15 · 3.19 · 5.64 · .13 | .55 · .55 · .50 | a ROLL: outer Ø 0.95 M round a hollow Ø 0.18 M, ≈ 0.75 turn |
| E5 | a flank flame (reeded acanthus, tip rolled out) | 4.60 M | 0.49 | 0 · 0 · .14 · .18 · .27 · .22 · .35 · .08 · .20 · 6.17 · .61 | .35 · .75 · .45 | a HOOK: outer Ø 0.6 M, its hollow OPEN (≈ 0.3 M), ≈ 0.6 turn |
| E6 | the crest shell | rim 1.79 M | — | — | five lobes ≈ 0.47 M at the rim | a cupped fan: five broad LOBES touching at a scalloped rim, each tip rolled; ≈ 22 fine flutes (pitch ≈ 0.08 M); the lobes span ± 58° |

**What the measurements say, and where they correct the brief.**

- **Nothing is a comma.** The brief (from round 3's §10.6) asked for "a swelling comma ~1 M wide at its fullest".
  The bronze's bodies are not that:
  - the C-scrolls are STRAPS of near-constant width: 0.45–0.47 M on E1 and 0.3 M on E2, narrowing only to
    enter their volutes (0.37 M);
  - the flank's reeded straps hold 0.53–0.55 M;
  - only the flame swells, from 0.35 M at the root to 0.75 M at 60–70 % of its length.

  What reads as mass at a distance is several straps and flames lying side by side.
- **Two curvature laws, not one.**
  - The C's (E1, E2) are an ARC: κ ≈ 0.7–1.0 /M held over the first 60 % of the length, then rising steeply into
    the volute (3–8 /M).
  - The straps and flames (E3, E4, E5) are nearly STRAIGHT (κ ≤ 0.3 /M) for 40–80 % of their length, then turn
    all at once.

  The grammar's "monotone curvature, a clothoid" (§2) is right about the volute and wrong about the body. The
  measured body is either a held arc or a straight run.
- **Three kinds of end, not one.**
  - A VOLUTE (the C's): a spiral, ≥ 1 turn, round a ball eye.
  - A ROLL (the node): a curl of near-constant radius round a small hollow.
  - A HOOK (a flame's tip): an open curl, ≈ 0.6 turn.

  The foot's closed curl sits between a roll and a volute.
- **Surface: channels and reeds.**
  - A C strap is CHANNELLED: a raised bead along each edge with a hollow between.
  - Every strap and flame is REEDED: 3–5 parallel reeds of ≈ 0.1 M, converging at a flame's root.
  - The shell is FLUTED: ≈ 22 radial flutes inside 5 broad lobes.
- **Where the leaves attach.**
  - A pointed tongue hangs from E1's crown on the inner side.
  - The flank flames spring from the frame just ABOVE the node (arc 0.55, the node's roll at 0.63, 1.26 M out),
    so the lower flank runs on without a break: foot → stem → node → flames.
  - A fan leaf marks the meeting (arc 0.23), pointing down and out.
  - The crest C's pour out from under the shell's lower lobes.

**At the 180 mm print the volutes cannot be the bronze's size.** M is 9.5 mm at the default print, so the bronze's
0.75 M volute is 7 mm across. A coil of ≥ 1 turn with a pierced gap of 1.3 mm and a pierced eye of 1.3 mm does not
fit in 7 mm. Round 4's C volutes are therefore 1.2–1.4 M across, grown until the coil keeps its gap, and stated as
a consequence of the floor, not as the bronze's proportion.

**[Nov 14: the forms above are now drawn by hand.** Eva ruled the hand-drawn route (study §11.6 (b)). The
placeholders in `docs/frame-drawing-template.svg` are these profiles laid out straight, one artboard per element, and
`docs/frame-drawing-guide.md` is the contract for drawing them. Study §12 has the pipeline.]
