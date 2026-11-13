# /frame — the flow study (Nov 13, overnight, unattended; NOTHING SHIPS)

Eva's brief: *"We don't yet have a great ability to create filigree in a nice swooping motion that follows and flows
with the shape of the frame. Not the same shape repeated over and over. It needs to flow and understand flow."*

This session did three things:
- read the references (`docs/frame-flow-grammar.md`, the spec);
- built a FLOW MODEL behind a hidden param (`frame-flow.js`, `ornFlow: 'band' | 'contour'`);
- iterated it for five rounds against a FRESH outside critic each round. Each critic saw only the sheet, the
  references and the grammar.

**Nothing ships.** The shipped default is untouched: no control writes `ornFlow`. With it absent every row is
byte-identical to `main` (§6, FF0).

## 1. What was built

`frame-flow.js` (`flowFor`, called from `withOrnament` when `ornFlow` is set and the layout is not `groups`).

- **Sources and meetings (grammar §1).** Each side's half outline is ONE path. Sources are the axis motifs (crest,
  bottom) and, on a rectangle or arch, the corners and springings. Each consecutive pair of sources meets at a
  per-kind fraction (`FLOW_MEET`): oval crest→bottom 0.30 (R2's traced 28 %), rectangle crest→corner 0.62, a long
  side corner→corner 0.40 (R5's waist), corner→bottom 0.5, arch apex→springing 0.55. The oval's side is NOT a source.
  A flow is laid from each source toward its meeting.
- **The element (grammar §2, §8.2).** Each element is two clothoids:
  - the BODY, κ0 → κm over Lb1, carrying one bow `B sin(π s / Lb1)` against its volute;
  - a short RAMP, κm → 1/rv over (1.1 + split) rv;
  - then a LOG-SPIRAL volute, radius rv → the 1 mm floor over T turns.

  The end heading is solved by bisection so the body lands at the asked offset.
- **Hand-offs.** The child takes the parent's point, tangent and curvature (G1 + G2) where the parent begins to
  curl. It bows AWAY from the parent's line (a Y-fork) and steps out at the parent's width, so there is no seam.
  Measured G2 on the emitted centrelines (§4).
- **The fit.** The element count and a scale are searched per flow:
  - a grid, then bisection; the reach is not monotone in the scale (a long element loops);
  - chains whose elements break their limits are refused;
  - the score prefers a scale near 1, the asked reach, and an element length near the references' (3.3/16 of the
    frame's height, §3 of the grammar).
- **Variation (grammar §3).** Size falls along a flow (`decay`) and follows the outline's radius (`flat`). Each source
  carries a weight (its class's amplitude, upper corners heavier). Turns, bow, split and length carry a per-flow
  jitter offset, so no two flows draw one sequence.
- **The settle.** An element that grazes is handled in this order:
  1. its turns are lowered;
  2. it is re-sized on a ladder, with the chain re-laid from it;
  3. the ladder is tried again with the volute on the other side;
  4. failing all of that, its flow ends there (told).
- **Width.** The body follows the carved law. The volute keeps 0.75 → 0.4 of the body's cap, and the crown never
  falls under 0.85 of the body's. Both break the carved law inside a volute, on purpose (round 2).
- **Meetings.** A flow that meets another ends on an outward volute, so the two last volutes are an opposed pair.
- **Leaves.** Each hand-off gets a sheathing acanthus (§6); each flow end gets a terminal leaf.
- **Motifs.** The crest shell is `drapedCrest`, at 1.7× the band in contour; the bottom shell is the same. No
  rosette is laid on a corner or springing: the corner is formed by the C-scrolls leaving it.
- **The two layouts.**
  - **ON-BAND:** the elements stay inside the band, widened to 16 mm as the rinceau's is.
  - **OUTER CONTOUR:** the band keeps the asked width (`rinceauBand` returns null). Each body straddles the band's
    outer edge, dipping 0.6 M in, so it is welded to the molding, never a slit. Elements may stand out to the
    envelope `[0.9, 1.7] M` past the edge, so the whole is one solid on the flat back (FC on every row).
- **What it reuses, unchanged:**
  - `runPath` / `mapToPath` (the boundary owner is `offsetCurve`, through the band region);
  - `seatEmitted`;
  - the carved width law;
  - `acanthusLeaf`, `drapedCrest`, `placeMotif` / `mirrorElement`;
  - `standMotifs` (the flowers-in-front order, now run under `layout: 'flow'` too);
  - the relief's band solids.

## 2. The rounds

### Round 1 — the first flow model (sheet `docs/img/frame-flow-r1.png`)

Critic's scores ("flows with the frame like the references", 1–10): **rinceau 3 · band 2.5 · contour 4**. Its ranked
failures: (1) big bare stretches — the flows do not cover the half outline (oval contour bare from the shoulder to the
flank, and again above the bottom); (2) "a thin vine with things hung on it, not a chain of scrolls" — 1 mm stems,
hooks for volutes, leaves as bunches; (3) the band flank still a sine wave; (4) stray crescents on the band — volutes
buried in the molding with only their eyes showing (confirmed on cell 10: the coils sit under the molding's crown); (5)
the contour flank stalk standing vertical, ignoring the oval's curve; (6) crest and feet too light; (7) the same small
hook over and over; (8) the rectangle's corners as "stuck-on buttons", not sources; (9) leaves as pom-poms, and seams
on the volute tubes. Most important change: *fill the envelope with a few large, thick scroll elements in which the
volutes carry the mass.*

What round 2 changed (`frame-flow.js`):
- **Element law.** The ramp into the volute is SHORT ((1.1 + split) rv) — a long ramp piled up heading the solve
  cancelled with a loop; the volute's radius is held to the room and to a minimum body share (the gentle body at least
  45 % of the element, so the chain advances by its bodies); the body's width follows the volute (≤ 0.8 rv).
- **Bigger, fewer elements**: the source element 4.2 + 1.8 w band widths in contour (2.8 + 1.2 w on the band), the cap
  on length 7.5 M / 5 M.
- **The BOW**: every body carries one swoop, B sin(π s / Lb1), turned against its volute (body + volute read as one S);
  zero at both ends, so the fork's G2 is untouched.
- **The fit**: the reach is NOT monotone in the scale (a long element loops), so the scale is searched on a grid first,
  inadmissible chains refused, then bisected (round 1's bisection landed the oval's bottom flow at its bracket edge with
  90 mm elements).
- **The settle**: an element that grazes is re-sized on a ladder (0.88, 1.12, 0.78, 1.25, 0.68, 0.58) with the chain
  re-laid from it, then the ladder again with its volute turned to the other side, before its flow is cut.
- **Contour bodies straddle the band's outer edge** (dipping 0.6 M in): a body running alongside the edge just short of
  2 mm off it is a slit (a web in print), so a contour body is either overlapping the edge or clear of it.
- **Corners are formed by the two C-scrolls that leave them** — no rosette is laid on a corner or a springing in the
  flow (round 1: "stuck-on buttons"). The crest shell is built on a 1.7× band in contour (it heads the silhouette).
- **Leaves as flames**: longer (0.5 of the element), narrower (aspect 0.34), four lobes, pointing with the growth.

### Round 2 (sheet `docs/img/frame-flow-r2.png`)

Critic's scores: **rinceau 3 · band 3 · contour 4** — band up half a point, contour flat. Its ranked failures: (1) the
oval contour's flank reads as ONE long rod or hoop rather than 3–5 discrete C/S elements; (2) seams at the hand-offs (a
thin child stepping out of a fat parent); (3) the volutes as tiny curls, repeated; (4) no opposed meeting at the
shoulder — the two flows' last volutes do not face each other; (5) leaves pasted on at right angles; (6) "debris" on
the band (measured: coils on the molding's falling flank whose crown, following the tapering width, falls to 1 mm —
the seat was right, the crown was not); (7) no feet at the bottom; (8) the rectangle's corners bare; (9) the arch's
contour a wavy wire parallel to the band. Most important change: *build each side as a sequence of 3–5 distinct C/S
scroll elements, each ending in its own volute, the two flows ending in opposed volutes at the meeting.*

What round 3 changed:
- **A Y-fork**: the child bows AWAY from its parent's line (a child continuing the parent's line read as the parent's
  volute hanging off a pigtail), and steps out at the parent's width (`rootW`), so the hand-off has no seam.
- **Volute mass**: the volute keeps 0.75 → 0.4 of the body's cap from its start to its eye (the carved law alone
  thinned it to a hairline), and the crown never falls under 0.85 of the body's (the round-2 "debris").
- **Opposed volutes at the meeting**: a flow that meets another ends on an outward volute, so the two last volutes
  face each other.
- **The corner as a source with its volute AT the corner**: the flow into the LONGER run from a rectangle's corner (or
  an arch's springing) is laid reversed — its volute at the corner, its tail handing on along the side.
- **A target element length** (the references' elements average ~3.3 R2 molding widths, a sixteenth of the frame's
  height each — 37 mm at 180 mm): the fit now prefers several elements of about that length to one long rod, and its
  scale grid reaches down to 0.38. This is what turns the rectangle's long sides and the arch's jambs into 2–3
  elements where round 2 laid one.
- **The bottom shell at the crest's scale in contour** (the feet: round 2 had none), leaves tilted 0.12 rad toward the
  growth.
### Round 3 (sheet `docs/img/frame-flow-r3.png`)

Critic's scores: **rinceau 3 · band 3 · contour 4.5** (contour +0.5, band flat). Its ranked failures: (1) the flank is
still "a rod with hooks on it" — a long gentle stem with small volutes branching off left/right/left, the rinceau's
tendril vocabulary moved outboard, no C-into-S; (2) the crest and bottom are not SOURCES — nothing pours out of the
shell, the bottom fan floats alone with no feet; (3) the crest flow reads as a second molding (long plain stems
parallel to the band, no visible tightening); (4) volutes sunk under or clipped by the band edge, seams on stems; (5)
the rectangle contour's sides have a hole mid-side (a flow cut early); (6) the rectangle's corners still not sources;
(7) the contour silhouette wrong — no waist under the crest, widest at the lower flank, the bottom projects nothing;
(8) lower-flank mush (two leaves, a volute and a crossing stem in one blob); (9) every volute one radius by eye despite
the measured 0 sharing pairs; (10) the band layouts sparse. Most important change: *replace the long stem with side
hooks by a true chain — each element's tail the next one's start, the chain sprung from heavy opposed C pairs on the
crest and bottom shells.*

### Round 4 (sheet `docs/img/frame-flow-r4.png`)

Critic's scores: **rinceau 3 · band 2 · contour 4** — a REGRESSION on both flow layouts. Ranked failures: (1) half the
frame bare on the band (the oval band's flanks empty from the shoulder down — the length jitter cut the flank flow);
(2) the contour flank "a pole with pegs" — a near-straight rod with three look-alike outward C's; (3) the crest pours
nothing; (4) the bottom has no feet, a sawtooth fan; (5) segmented / stuck-on construction, seams and orphan
fragments; (6) the rectangle's sides a sausage, a gap and a comb; (7) the arch jambs a detached handle, with a 0.2 mm
gap in plan (a slit); (8) meetings are absences; (9) leaves as blobs; (10) the arch band's two elements near-twins.
Most important change, a third time: *a true chain, each tail the next one's start, sprung from the crest's C pair and
the feet.*

What round 5 changed: the length jitter withdrawn (round 4's regression), and a SHORT heavy first C at the crest shell
(0.55 of the length, on a crest chain of two or more — at the bottom shell it cut the oval contour's flank and is
off). Every flow on the six layouts now lands at its meeting with none cut early (the oval band and contour, the
rectangle's corners and the arch's jambs included).

### Round 5 (sheet `docs/img/frame-flow-r5.png`, the final state)

Critic's scores: **rinceau 2 · band 3 · contour 4**. Ranked failures: (1) "a hose with hooks" — one continuous wire at
a near-constant offset with question-mark volutes budding off it, the rinceau's stem-and-tendril model thinned; (2)
repetition by eye (four look-alike outward hooks a flank) whatever the metric says; (3) the bottom source dead — no C
out of the shell, no feet; (4) the crest's volute rises AWAY from the shell, no marked meeting at the shoulder; (5)
the envelope flat — no waist, no upper-flank swell, no feet; (6) volutes sliced where they meet the molding, seams at
the nodes; (7) leaves as stuck-on blobs; (8) the band layouts sparse, 1 mm wires in a 16 mm band; (9) the
rectangle's corners not sources; (10) the arch contour's jamb element floats and quits.

**The stopping rule fired here**: rounds 4 and 5 are two consecutive rounds without an improvement on round 3's best
(band 3 → 2 → 3, contour 4.5 → 4 → 4). The rinceau baseline read 3, 3, 3, 3, 2 across five independent critics, which
is the critic's own noise: about half a point.

| round | rinceau (main) | flow on the band | flow, outer contour |
|---|---|---|---|
| 1 | 3 | 2.5 | 4 |
| 2 | 3 | 3 | 4 |
| 3 | 3 | 3 | **4.5** |
| 4 | 3 | 2 | 4 |
| 5 (final) | 2 | 3 | 4 |

## 3. Did flow get better

Round 1 against the final round, same params and camera: `docs/img/frame-flow-r1-vs-final.png`. Every round's whole
sheet is `docs/img/frame-flow-r1.png` … `frame-flow-r5.png`.

**A little, and not enough to ship.** Against `main`'s rinceau the flow model fixes what can be measured:
- No two elements share a shape on the oval or the arch; the rinceau repeats one shape 14, 6 and 7 times.
- Every hand-off is G1 + G2 (≤ 0.6° and ≤ 0.02 /mm), where the rinceau's tendrils leave the stem at 26–33°.
- The bodies follow the frame's tangent (median 6–11°, against the rinceau's 34–36°).
- Every source flows to a meeting.
- The outer contour gives the frame a silhouette, which is the one thing every critic said the references have and
  the band cannot.

By eye it moved only from about 3 to about 4 out of 10. All five independent critics named the same failure first or
second, and it is STRUCTURAL rather than a tuning problem: **the model's topology is a trunk with side shoots.** A
child leaves its parent where the parent BEGINS to curl, so each parent's volute hangs off to one side of a
continuing line. The eye reads one wire with hooks on it, "a vine on a trellis", not a chain of scrolls whose tails
become the next ones' starts.

Round 4 tried the other topology: the child leaving from the shoulder of the parent's curl, a true C into S. The
chains then collapsed into short elements and the flows ended early (`forkOnCurl`, kept in the code and OFF). Making
it work is a construction change, not a constant:
- the element must be laid KNOWING it will be continued from its curl;
- the volute's outer turn and the next body must share a stretch;
- the fit must budget the overlap.

That, plus the crest and feet as real sources, is the next session.

## 4. Measurements (Node builds of the sheet's params, `tools/frame-flow-measure.mjs`)

Round 1 against round 5 (the final state), the default 180 mm print. Two notes on the columns:
- Repetition counts the right side's scroll elements (the rinceau's volute tendrils) sharing a shape: length within
  5 %, turns within 0.08, curvature profile RMS within 0.15. d is the closest pair's distance, where d < 1 shares.
- Feature / gap are `measurePrint`'s narrowest plan feature and enclosed gap at a 0.2 mm cell.

| round | frame / layout | elements a side | repetition (share / pairs) | hand-offs: tangent / curvature jump | following: median / p90 | boundary / regions | thinnest wire (mm) | plan feature / gap (mm) | triangles (of 1.5 M) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | oval · rinceau | 10 | 14 / 45 (d 0.10) | 10: 32.88° / 0.11 | 35.6° / 70.2° | 0 / 1 | 1.00 | 15.80 / — | 510,824 |
| 1 | oval · band | 13 | 3 / 78 (d 0.75) | 11: 1.11° / 0.03 | 12.3° / 27.5° | 0 / 1 | 1.00 | 15.80 / — | 553,512 |
| 1 | oval · contour | 10 | 3 / 45 (d 0.59) | 8: 0.73° / 0.01 | 10.7° / 25.6° | 0 / 1 | 1.00 | 1.24 / 0.20 | 454,800 |
| 1 | rect · rinceau | 9 | 6 / 36 (d 0.00) | 9: 26.36° / 0.04 | 35.6° / 61.8° | 0 / 1 | 1.00 | 15.80 / 79 | 484,520 |
| 1 | rect · band | 12 | 3 / 66 (d 0.18) | 6: 0.22° / 0.01 | 4.6° / 13.4° | 0 / 1 | 1.00 | 15.80 / 79 | 512,344 |
| 1 | rect · contour | 14 | 6 / 91 (d 0.17) | 8: 0.51° / 0.01 | 10.7° / 18.9° | 0 / 1 | 1.00 | 0.60 / 1.40 | 583,192 |
| 1 | arch · rinceau | 7 | 7 / 21 (d 0.00) | 7: 27.93° / 0.07 | 34.3° / 66.6° | 0 / 1 | 1.00 | 9.40 / 18.20 | 424,020 |
| 1 | arch · band | 5 | 2 / 10 (d 0.82) | 2: 0.22° / 0.01 | 6.3° / 27.5° | 0 / 1 | 1.00 | 9.40 / 18.20 | 278,764 |
| 1 | arch · contour | 6 | 1 / 15 (d 0.78) | 3: 0.40° / 0.00 | 8.8° / 23.9° | 0 / 1 | 1.00 | 1.40 / 0.20 | 311,812 |
| **5** | oval · band | 8 | **0** / 28 (d 1.04) | 6: 0.50° / 0.02 | 11.0° / 22.5° | 0 / 1 | 1.00 | 15.80 / — | 372,136 |
| **5** | oval · contour | 9 | **0** / 36 (d 1.22) | 7: 0.61° / 0.01 | 10.5° / 22.0° | 0 / 1 | 1.00 | **0.20 / 0.20** | 413,200 |
| **5** | rect · band | 8 | 1 / 28 (d 0.50) | 2: 0.01° / 0.00 | 5.8° / 17.1° | 0 / 1 | 1.00 | 15.80 / 79 | 315,128 |
| **5** | rect · contour | 14 | 4 / 91 (d 0.15) | 8: 0.48° / 0.01 | 8.6° / 33.5° | 0 / 1 | 1.00 | 1.24 / 0.60 | 515,936 |
| **5** | arch · band | 5 | **0** / 10 (d 3.33) | 2: 0.05° / 0.01 | 6.7° / 13.9° | 0 / 1 | 1.00 | 9.40 / 18.20 | 254,172 |
| **5** | arch · contour | 4 | **0** / 6 (d 1.07) | 1: 0.00° / 0.00 | 10.9° / 44.7° | 0 / 1 | 1.00 | **0.20** / 23.80 | 214,892 |

(The rinceau rows are `main` and do not move between rounds.)

**A print finding, and it is the CONTOUR layout's: `measurePrint` reads a 0.20 mm plan feature and a 0.20 mm gap**
(one cell, so "at most 0.2 mm") on the oval and arch contours: a wire's tail or a volute's edge passing within a hair
of the molding or of another wire, in plan. The relief is still one region with 0 open edges, so this is not a
detachment. It is a near-slit, under the 1 mm the charter assumes printable, and it is what the round-4 and round-5
critics saw as "a detached handle with daylight under it" and "a volute sliced by the band". The flow's slit test
looks 2F along each wire against the BAND; it does not test wire against wire in plan at that resolution. A clause
for it (the plan gap ≥ 1 mm, or fused on purpose) is owed before any contour ships.

## 5. Decisions made alone (the brief said: take the most reasonable reading and record it)

1. **The meeting fractions** (`FLOW_MEET` above) are mine, read off R2 (oval) and R4/R5 (rectangle). The arch's are a
   guess; no reference is an arch with an outer contour.
2. **The oval's side is not a source.** R2 has none, and a third source would put a meeting on each flank.
3. **No rosette on a corner or springing in the flow.** The round-1 critic read them as "stuck-on buttons". The
   corner is formed by the two C-scrolls leaving it, and the flow into the longer run is laid REVERSED, its volute
   AT the corner.
4. **The contour keeps the asked band (9.5 mm), not the rinceau's 16.** The ornament stands beyond it, so it needs
   no bays in the band.
5. **The contour lays no web plate under the scrolls.** "No openwork through the plate" is read as: no hole in the
   molding's own back. The open spaces between a contour scroll and the molding are the silhouette's own and print
   from the flat back like the scrolls. Every row reads one region (FC) and 0 boundary edges (FW).
6. **The sheet's oval and rectangle have the bottom run ON** (`ornBottom: 'on'`), so both sources exist. The arch has
   no bottom run.
7. **The crest shell is drawn on a 1.7× band in contour**, so it heads the silhouette; the bottom shell is the same,
   standing in for the feet.
8. **Curvature is monotone in the RAMP and the VOLUTE, not in the body.** The body's bow (round 2) and the child's
   Y-fork bow (round 3) are one deliberate inflection each. The brief's "monotone curvature tightening into a volute"
   holds from the ramp on. A body without a bow read as a straight stalk (round 1).
9. **The volute holds width the carved law would take away** (`voluteMass`, `crownFloor`). The carved law thinned
   every coil to a hairline that the relief buried in the molding (round 1 "crescents", round 2 "debris").
10. **The settle flips a volute** to the other side before ending a flow (round 2).
11. **The fork on the parent's curl** (`forkOnCurl`, the C-into-S hand-off) was tried in round 4 and is OFF: §3.
12. **CI.** `frame-flow.js` and the three new tools are NOT added to `frame.yml`'s path filter. Editing an existing
    workflow costs the frozen tags dispatched after it (CLAUDE.md), and nothing ships. The PR still runs the frame
    workflow, because it touches `frame-filigree.js`, `frame-geometry.js`, `frame.js` and
    `tools/verify-frame-stl.mjs`.

## 6. Gates

- **`node tools/verify-frame-flow.mjs [--base <worktree of main>]`** (Node only, not in CI). Eleven rows: three
  skeletons × both layouts, plus hierarchy 0, leaves off, a 300 mm print, the oval with its bottom run off, and the
  rectangle with its corners off. Clauses:
  - FW watertight;
  - FC one voxel region;
  - FT thinnest wire ≥ 1 mm;
  - FB ≤ 1.5 M triangles;
  - FH every hand-off G1 + G2 on the emitted centrelines;
  - FM mirror to the bit;
  - FR no two elements on a side share a shape;
  - FF0 the param absent is `main` (relief STL bytes and SVG string; three skeletons × filigree off / rinceau /
    groups).

  **Final state, measured:** every clause passes on all eleven rows except FR.
- FR fails on four of the rectangle's rows (1–4 near-twin pairs; the closest d 0.15 is two rectangle-contour
  elements of 32.8 and 32.6 mm, 0.97 / 0.96 turns) and on the oval contour at hierarchy 0 (one pair, d 0.89).
- FR passes on the oval and arch rows at the defaults, the 300 mm print and the bottom-off oval.

  The repetition the critic sees by eye ("four look-alike outward hooks") is NOT what FR measures: the elements differ
  in length and turns, but they read alike because each one is a body with one small hook. FR is a necessary
  condition, not a sufficient one.
- **FF0, the param absent is `main`, passes 9 of 9**: relief STL bytes and SVG string, three skeletons × filigree off
  / rinceau / groups, against a worktree of `6c74726`.
- **`node tools/verify-frame-stl.mjs --no-browser` passes 4 of 4**, FM0 with `frame-flow.js` in the scan. SP (the
  browser) was not run locally; CI runs it.
- The existing browser and relief gates (`verify-frame.mjs`, `verify-frame-relief.mjs --base e759041`, the relief
  mutants for the touched modules) were NOT run locally. The single push runs them in CI. With the option absent the
  shipped code paths are the ones FF0 proved byte-identical.
- **FM0** (`tools/verify-frame-stl.mjs`) now scans `frame-flow.js`. It uses only `frame-math.js`'s transcendentals.
- **The mutants the flow code will need** (not built; the brief said to skip the sweep):
  - the fork moved off the parent (FH);
  - the child's curvature not inherited (FH);
  - the mirror broken (FM);
  - every element one length (FR);
  - the envelope ignored in contour (a new clause: every point within `envelope` of the band's outer edge);
  - a flow cut at its first element (a new clause: each flow's element count against its fit);
  - the settle's clearance check removed (FW / FC by a graze, or a slit clause);
  - the band cap ignored on ON-BAND (a new clause: every point inside the band region);
  - `rinceauBand` widening under contour (FF0 cannot see it; a clause on the drawn band width).

## 7. Options for Eva

- **(a) Ship ON-BAND as the default.** NOT recommended. It scored the lowest of the two layouts in every round (2–3
  out of 10, against the rinceau's 2–3). On a band it reads as sparse wire: 1 mm stems in a 16 mm band, half the
  oval's band bare in round 4.
- **(b) Ship OUTER CONTOUR.** NOT yet. It is the better layout in every round (4–4.5) and the only one that gives the
  frame the references' silhouette. But two things stand against it:
  - the trunk-with-hooks topology (§3);
  - an open print question: a 0.2 mm plan gap / feature on the oval and arch (§4), under the 1 mm floor.
- **(c) Offer both as a layout choice.** NOT yet, for the same reasons. A control that offers two layouts both
  scoring 3–4 is a control nobody will keep.
- **(d) Not ready — RECOMMENDED.** What is wrong, in order:
  1. **The topology.** A child forks from its parent's body before the parent curls. It should leave from the
     SHOULDER of the parent's curl, so each tail becomes the next element's start (C into S). The construction has to
     be rebuilt for that: lay an element knowing it will be continued from its volute, and budget the shared stretch
     in the fit. Round 4's quick attempt collapsed the chains.
  2. **The crest and the bottom as real sources.**
     - an opposed C pair poured from under each shell, the crest's volutes curling BACK toward it;
     - the FEET at the bottom (§4's 2.5 M);
     - on a rectangle, the corner as the largest volute cluster.
  3. **The envelope as a profile** (crest 2.5, a waist 0.6–0.8, the upper flank 1.8, feet 2.5 M), driving each
     element's reach, not a band of `[0.9, 1.7] M` past the edge.
  4. **The plan-gap clause** for the contour (wire to wire and wire to molding, ≥ 1 mm or fused on purpose).
  5. **Leaves as flames** rooted in the forks (every critic: "blobs").

  The grammar doc (`frame-flow-grammar.md` §8) stands as the spec for that session. `frame-flow.js` is a working
  base: sources, meetings, the G2 element, the fit, the settle and the two layouts all hold up. What has to change is
  how one element hands to the next.

## 8. Reproduce

- `node tools/frame-flow-trace.mjs` writes `docs/img/frame-flow-trace.png`. Add `--refs <dir> --overlay <png>` for the
  photo overlay; it is not committed (the references are stock photographs).
- `node tools/shot-frame-flow.mjs <dir> --round <n>` writes the sheet: `index.html`, `cells/*.png` and `metrics.json`.
  The full-sheet PNG screenshot fails on a sheet this tall, and the rounds' PNGs were assembled from the cells.
- `node tools/frame-flow-measure.mjs [--json] [--fast]` prints the measurements.
- `node tools/verify-frame-flow.mjs [--base <wt>]` runs the gate.
