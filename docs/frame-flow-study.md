# /frame — the flow study (Nov 13, overnight, unattended; NOTHING SHIPS)

Eva's brief: *"We don't yet have a great ability to create filigree in a nice swooping motion that follows and flows
with the shape of the frame. Not the same shape repeated over and over. It needs to flow and understand flow."*

This session did three things:
- read the references (`docs/frame-flow-grammar.md`, the spec);
- built a FLOW MODEL behind a hidden param (`frame-flow.js`, `ornFlow: 'band' | 'contour'`);
- iterated it for four rounds against a FRESH outside critic each round. Each critic saw only the sheet, the
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

ROUNDS

## 3. Did flow get better

VERDICT

## 4. Measurements (Node builds of the sheet's params, `tools/frame-flow-measure.mjs`)

MEASURES

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

  GATES
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

OPTIONS

## 8. Reproduce

- `node tools/frame-flow-trace.mjs` writes `docs/img/frame-flow-trace.png`. Add `--refs <dir> --overlay <png>` for the
  photo overlay; it is not committed (the references are stock photographs).
- `node tools/shot-frame-flow.mjs <dir> --round <n>` writes the sheet: `index.html`, `cells/*.png` and `metrics.json`.
  The full-sheet PNG screenshot fails on a sheet this tall, and the rounds' PNGs were assembled from the cells.
- `node tools/frame-flow-measure.mjs [--json] [--fast]` prints the measurements.
- `node tools/verify-frame-flow.mjs [--base <wt>]` runs the gate.
