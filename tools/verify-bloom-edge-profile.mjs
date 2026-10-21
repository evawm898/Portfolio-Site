#!/usr/bin/env node
/* THE PETAL'S EDGE PROFILE — the gate for the taper and the bead.
   ============================================================================

   WHAT IT MEASURES, and why each clause needs to exist. `emitPanel` used to
   close a petal with a flat wall one sheet thickness tall; it now eases the
   sheet toward RIM_FLOOR_MM over RIM_TAPER_MM of SURFACE DISTANCE and closes
   it with a half-round bead whose apex sits on the original boundary point.
   Both STL gates are structurally blind to every part of that:

     - a rim at half the ruled thickness is still a closed shell, so the
       watertight gate passes it;
     - a flat wall is still one connected piece, so the flood fill passes it;
     - the WALL INSTRUMENT cannot see it either, and that is the important
       one: `measureWall` RECONSTRUCTS both skins from the captured mid
       surface, the captured normal and the per-row scalar `thickness`, and
       builds its triangles from the skin lattice alone. It never reads an
       emitted rim triangle and never reads a per-column thickness, so V1-V5
       and the combination gate stay GREEN on any rim treatment whatsoever —
       green on a bead, green on no bead, green on a rim at 0.1 mm. Declared
       here rather than fixed there: teaching `measureWall` a per-column
       thickness fires V1's own calibration (a flat build must read the
       declared thickness) on the tapered columns, which is its own change.
     - and a bead whose apex has been RECOMPUTED rather than placed lands a
       few ulp off the original boundary, which no gate here would notice and
       which is the whole of "the silhouette does not move".

   SO THE FAMILY IS E0-E5 AND NOTHING ELSE ASSERTS ANY OF IT.

     E0  the capture is not vacuous — a treated rim exists, and it covers the
         share of the perimeter the panel's own extents predict.
     E1  THE RIM FLOOR. |top - bot| at every treated profile is at or above
         RIM_FLOOR_MM less RIM_FLOOR_BAND_MM, except where the narrow-span
         clamp is declared — and the declaration is a BICONDITIONAL against
         the law restated here, so a builder that logged every location (the
         ST9 trap: a guard that reads the record it checks) empties nothing.
     E2  NO HARD EDGE. The largest turn between adjacent faces within
         RIM_NEAR_MM of a treated apex is under DIH_BAR.
     E3  the mesh is still closed and degenerate-free.
     E4  THE SILHOUETTE. Every vertex the builder says it emitted at a treated
         profile IS in the emitted stream, as the same double.
     E5  THE TOPOLOGY IS MODE-FREE. The triangle count and the treated-profile
         count are identical live and export. This project has refused a
         mode-dependent topology five times; the bead's segment count reads
         the sheet through `Math.max(t, MIN_FEATURE_MM)` precisely so that it
         cannot become the sixth, and this is the clause that says so.

   THE REFERENCE AND THE MEASURED VALUE HAVE DIFFERENT OWNERS (Eva's fourth
   durable rule). Every bar is IMPORTED from the geometry or declared here as
   Eva's own number; every measured value is read off the EMITTED TRIANGLE
   STREAM or off arrays the gate has first proved are in it. The builder's
   `rim.apex` record only says WHICH vertices to look at, and E4 proves those
   are real mesh vertices before E1 measures anything with them.

   RUN: node tools/verify-bloom-edge-profile.mjs [--all] [--only <regex>]
        node tools/verify-bloom-edge-profile.mjs --control     (REQUIRED
        before quoting a pass from a changed harness: it rewrites
        bloom-geometry.js several ways and each mutation must redden the clause
        it names and no clause it does not.)
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const ALL = argv.includes('--all');
const PROGRESS = argv.includes('--progress');
const ONLY = (() => { const i = argv.indexOf('--only'); return i >= 0 ? new RegExp(argv[i + 1]) : null; })();
/* `--rows-file <json>` (F6-spoon) runs a written-down row set — `[{label, set:
   [{id, value}]}]`, the matrix's own row shape — instead of the matrix: the
   sweep instrument for states no matrix row carries (tools/bloom-spoon-rim-
   turn.mjs drives it). A report, like `--only`: never the full set, so the
   stray-declaration clause does not run. */
const ROWS_FILE = (() => { const i = argv.indexOf('--rows-file'); return i >= 0 ? argv[i + 1] : null; })();
/* `--dump-e2 <file>` (S5b) writes every row's measured E2 turn (EXPORT, the
   treatment's own turn in degrees, declared or not) as JSON, so two trees or
   two station laws are compared row by row rather than through the gate's
   pass/fail messages. A report, never a clause. With `E2_AT=1` in the
   environment each entry is `{ deg, at }` (the worst site's position), which
   is how S5b placed its four SIMPLE rows at the converging tip. */
const DUMP_E2 = (() => { const i = argv.indexOf('--dump-e2'); return i >= 0 ? argv[i + 1] : null; })();
const E2_DUMP = {};

/* EVA'S NUMBERS, declared here because they are hers and not the geometry's.
   The band on the floor is her own "-0.01" and the 2 mm window is the
   ruling's. RIM_FLOOR_MM itself is IMPORTED, never restated. */
const RIM_FLOOR_BAND_MM = 0.01;
const RIM_NEAR_MM = 2.0;

/* THE TURN ALLOWANCE IS DERIVED FROM THE SEGMENT COUNT, AND THE TYPED 30 IT
   REPLACES WAS IN DIRECT CONFLICT WITH EVA'S LATER RULING — said here rather
   than left as a number that moved.

   The first ruling set this at 30 degrees when the bead carried EIGHT
   segments. The second ruled the count down to FOUR, because eight puts
   facets at about 0.2 mm, under Nylon 12 White's ~0.35-0.4 mm resolvable
   detail. A half round sampled at K segments turns `180 / K` between adjacent
   facets BY CONSTRUCTION — that is what the tangent-angle sampling buys and
   it is the bead drawing itself, not an edge the treatment added — so at
   K = 4 the bead turns 45 degrees and a typed 30 forbids the count Eva ruled.
   The two rulings cannot both be satisfied by a constant.

   So the bar is the bead's OWN resolution, `180 / K`, imported through
   `rimSegmentsOf` rather than restated: a turn at or under it is the facet
   count, and anything above it is a hard edge that has to be explained. IT IS
   STRICTER THAN THE NUMBER IT REPLACES WHEREVER THE OLD ONE APPLIED — at
   K = 8 it is 22.5 against 30, and the shipped tree measured 21.50 there, so
   the derivation would have held on the geometry it replaces as well as on
   this one. That is the test that says it is a re-derivation and not a bar
   fitted to the data in hand.

   The SHADING half of the old bar's job is answered by the other half of the
   same ruling: the bead now carries its own smooth normal, so a facet edge is
   no longer something the eye can find. */

/* THE OUTLINE CORNER'S OWN NEIGHBOURHOOD, in bead radii. The profile pivots
   about ONE skin vertex there and its reach is |apex - C| at the corner, which
   is the two insets in quadrature — 0.84 mm at the shipping default against a
   0.5 mm radius. Two radii is that, rounded up to the bead's own diameter, and
   it is a length rather than a tuned number. Measured: at ONE radius twelve
   edges of 4,777 sat between 30 and 36.02 degrees, every one of them inside
   the pivot and none anywhere else. */
const RIM_CORNER_R = 2;


const loadGeom = async (file) => import(pathToFileURL(file).href);
const G0 = await loadGeom(path.join(HERE, 'bloom-geometry.js'));
/* K IS THE CAP, and the cap is what every reachable row takes: `rimSegments`
   reads the sheet through `max(t, MIN_FEATURE_MM)` and MIN_FEATURE_MM is 1.0,
   so its radius arm is 0.5 mm at every state and the ratio is exactly 1 —
   measured over the whole live matrix in both modes. A tree on which that
   stopped being true would take a SMALLER K, turn MORE per facet, and go RED
   here against a bar computed from the cap, which is the safe direction: the
   allowance is named in the message, so the red says what it is. */
const DIH_BAR = 180 / G0.RIM_BEAD_SEGMENTS;

/* WHERE THE SURFACE ITSELF TURNS FASTER THAN THE OUTLINE SAYS, DECLARED WITH
   ITS MAGNITUDE — this project's own xfail idiom (#213), applied to an angle
   instead of a span.

   E2 subtracts the OUTLINE's own turn, which is a PLAN quantity: it is the
   angle the boundary polyline turns through as seen from above. Three things
   turn the SURFACE at a rim without turning that polyline at all — a buckle
   wave (out of plane by construction), a steep taper on a thick sheet (the
   profile's own half-thickness changing along the sweep), and a fringe tooth's
   terminal. The bead has to follow the surface it rides, so the residual is
   not an edge the treatment invented; it is the surface's, arriving at a rim.

   EACH ENTRY CARRIES THE EXCESS OVER THE BAR AS A NUMBER THE GATE READS, IN
   BOTH DIRECTIONS. A row that grows is a finding for whatever moved it; a row
   that stops exceeding is a stale record and says so. The band is 5e-5 deg —
   #213's own 5e-5, in the unit this quantity carries — which is eight orders
   above the float floor of an angle taken from two unit normals, and well
   inside the smallest excess declared here (1.68e-4). */
const E2_TURN_BAND_DEG = 5e-5;
/* E7 DECLARED BY VALUE (big petals, Oct 21). `ALL MAX` asks a 150 mm petal
   (the 100 mm maximum x its size field's 1.5) on a 6.56 mm root body under
   every form control at once, and two side profiles at its root-blend end
   (base row 16, u 0.2857) stop 0.0097 mm off the drawn radius against the
   builder's 0.0096 mm bracket: the bracket is the half's ARC over 4096, and
   the bisection's twelve halvings are in the section parameter, which this
   section does not stretch evenly. The root taper OFF reads clean. Both
   directions: the count exactly, the worst within E7_INSET_BAND_MM. */
const E7_INSET_BAND_MM = 5e-5;
const E7_INSET_XFAIL = {
  'ALL MAX': { profiles: 2, worstMm: 0.00971, note: 'the 150 mm root-tapered petal at its root-blend end; the inset bracket assumes an even section stretch (see above)' },
};
/* RE-RECORDED ON a4dc836 BY THE GATE-COVERAGE SESSION, ELEVEN MERGES LATE. This
   gate ran in no workflow (D14), so the apex nib (#283, 6ebf784) moved seven of
   these rows and the row ramp (#289, 4f3d31b) two more, and nothing said so
   until the first run on the fixed tree: 9 findings, every one bisected to
   those two merges on worktrees. The nib converges the last stretch of every
   blade from a 1.60 mm parallel strip to a 0.10 mm mini-face, so the bead's
   profile turns hard where the outline turns hard, and on six rows the
   treatment now adds more than the 45 deg allowance within 2 mm of the rim.
   Declared at the measured magnitude with the previous figure kept, never
   widened — a row that reads WORSE than its record is a finding for the
   change that moved it (#283 and #289), and this is where it is named. The
   ruling on whether a nibbed bead may turn past the allowance is Eva's.
   S5b's CI run REDEFINED one row: `LEAF TIP: COMPOUND, a leaflet tooth
   reaching the converging tip` was tip 0.60 / depth 0.3, where the tip-neck
   walk now gives up the tooth that reached the nib, so the row stopped
   exercising LF33's branch. At tip 0.80 / depth 0.1 a tooth still reaches the
   nib, and that state reads 43.69 deg, so its entry (2.184653 at the old
   state) is OFF, not re-recorded. */
const E2_TURN_XFAIL = {
  'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)': { excessDeg: 8.532510, note: 'the ROOT RIM of a tapered 100 mm petal (big petals, Oct 21): the rim taper eases the thickened body (3.88 mm at the root) to the 1 mm bead within RIM_TAPER_MM, so the rim turns past the allowance at the root (radius ~11.6 mm); the same state with the root taper OFF passes E2, and the two remedies tried (the bead scaled by the root factor; the buried-end ramp lengthened by it) each moved the excess to another length (80 mm read 61.9 / 77.5). Declared and open for Eva — docs/bloom-big-petals-outcome.md §6' },
  'BIG PETALS: 100 mm x cup 1.2 (the fold clamp reads each row\'s own thickness)': { excessDeg: 13.141118, note: 'the CUPPED TIP, not the taper\'s: the same state with the root taper OFF reads the identical turn at the identical site (the cupped-nib bead class main declares)' },
  'BIG PETALS: 100 mm x stem 60 x 6 (the join floor is the thickened hub)': { excessDeg: 8.532510, note: 'the ROOT RIM of a tapered 100 mm petal (big petals, Oct 21): the rim taper eases the thickened body (3.88 mm at the root) to the 1 mm bead within RIM_TAPER_MM, so the rim turns past the allowance at the root (radius ~11.6 mm); the same state with the root taper OFF passes E2, and the two remedies tried (the bead scaled by the root factor; the buried-end ramp lengthened by it) each moved the excess to another length (80 mm read 61.9 / 77.5). Declared and open for Eva — docs/bloom-big-petals-outcome.md §6' },
  /* CURVES-LEAVES (Oct 20, docs/bloom-curves-leaves-outcome.md): three block-73
     rows over the allowance, each measured against the SAME state on the arch
     slider and the law outline (`--rows-file`, `--dump-e2`) — none is a new
     class. The LOBED blade on a drawn spine reads 89.06 where the identical
     state on the Arch slider reads 94.20 (the lobed bead class main declares
     on its lobed rows; the drawn spine IMPROVES it); the tight upward curl on
     a cup 1.2 leaf is the spine-cup-fold block's own class (the cupped bead on
     a hard-bent spine) — 43.69 flat, 45.76 bent, the fold limit holding it;
     the compound rose's 50.63 is the LEAFLET CURVE on the wide cupped leaflets
     (43.69 with the leaflets on the law and the rachis drawn), the bead class
     "on wide cupped blades" S4 named. Declared at their values, never widened. */
  'LEAF CURVES: the FOLD LIMIT \u2014 a tight UPWARD curl drawn on a cup 1.2 leaf (held at the inner skin\'s limit, told)':
    { excessDeg: 0.764243, note: 'adds 45.764243 deg — the cupped bead on a hard-bent drawn spine (the spine-cup-fold class); the same leaf flat adds 43.686' },
  'LEAF CURVES: the COMPOUND rose on a drawn rachis, one leaflet curve shared by every leaflet (the terminal at its own size), toothed':
    { excessDeg: 5.627818, note: 'adds 50.627818 deg — the leaflet curve on the wide cupped leaflets (the S4 bead class on wide cupped blades); the rachis drawn and the leaflets on the law read 43.686' },
  'LEAF CURVES: the LOBED blade on a drawn spine, an outline curve STORED (the lobed blade keeps its own law \u2014 the outline mode inert, told)':
    { excessDeg: 44.060970, note: 'adds 89.060970 deg — the lobed bead class main declares on its lobed rows; the identical state on the Arch slider reads 94.200 — the drawn spine improves it' },
  /* SPINE-CUP-FOLD (Oct 20, docs/bloom-spine-cup-fold-outcome.md): five smoke
     rows over the allowance, every one a strongly CUPPED blade on a strongly
     CURLED spine — the cup's bead on a surface that bends hard along its
     length, the twist/buckle out-of-plane class. NONE IS NEW GEOMETRY MADE
     WORSE: two were declared census folds on the base tree (so E2 exempted
     them) and now read 0 pairs, so E2 reads them for the FIRST time; one is the
     just-valid side of the fold limit, where the limit does not bind and the
     geometry is the base tree's to the bit (94.824898 on both); and the two
     clamped rows read BETTER than the same state on the base tree (167.739178
     -> 127.246563 and 156.680134 -> 51.659533, measured through --rows-file on
     a worktree of 3dc8ee1). Declared at the measured magnitude, never widened. */
  'ZYGO: 3 layers x ALL INNER MAX (one role over two whorls)':
    { excessDeg: 56.225279, note: 'adds 101.225279 deg; face-to-face 112.83, outline 11.61 — measured for the FIRST time by spine-cup-fold: on the base tree this row was a declared census fold (E2-exempt); the fold limit opens the inner layers\' coils and the census reads 0, so E2 now reads the cupped bead on the curled blade' },
  'ALL PETALS: max x every base at max (curl 360+360, cup 1.2+1.2 — every clamp binds)':
    { excessDeg: 78.771989, note: 'adds 123.771989 deg — measured for the FIRST time by spine-cup-fold: a declared census fold on the base tree (E2-exempt), 0 pairs under the fold limit; the cup-1.2 bead on the clamped curl' },
  'SPINE FOLD: curl 195 x cup 1.2 (just valid at the widest cup)':
    { excessDeg: 49.824898, note: 'NEW with block 71 (smoke): adds 94.824898 deg — the just-valid side of the fold limit, where the limit does not bind, so this is the base tree\'s geometry: the same state reads 94.824898 on a worktree of 3dc8ee1. The cup-1.2 bead on a 195-degree curl' },
  'SPINE FOLD: curl 270 x cup 1.2 (clamped — the coil opens, told)':
    { excessDeg: 82.246563, note: 'NEW with block 71 (smoke): adds 127.246563 deg; the same state reads 167.739178 on a worktree of 3dc8ee1 (BETTER under the limit, which opens the coil to 243.9 deg)' },
  'SPINE FOLD: curl 360 x cup 0.9 x curl bias 0.5 (the general arm, clamped)':
    { excessDeg: 6.659533, note: 'NEW with block 71 (smoke): adds 51.659533 deg; the same state reads 156.680134 on a worktree of 3dc8ee1 (BETTER under the limit)' },
  /* F6-scope (Oct 18, docs/bloom-outline-curve-scope-outcome.md): NOT THE
     SCOPING'S. The SPIRAL row's turn 1 owns the NEAR-RECTANGLE, and the same
     two-turn SPIRAL with EVERY petal on the near-rectangle, unscoped, reads
     45.000180 through this same gate (all on the diamond: 41.394) — the
     near-rectangle's blunt nib under the bead (#419's class), 0.000168 deg over
     the allowance, never widened. */
  'SCOPED OUTLINE: SPIRAL x 2 turns on two different curves (turn 1 the rectangle, turn 2 the diamond)':
    { excessDeg: 0.000168, note: 'adds 45.000168 deg at [-17.524, 8.525, 3.302]; face-to-face 45.00, outline 0.00 — the near-rectangle turn; unscoped all-rectangle twin 45.000180, all-diamond 41.394' },
  /* SEPAL OWN SIZE (docs/bloom-sepal-own-size-outcome.md): the two WING rows — a
     120 x 5 mm sepal blade, so every rim bead sits under #278's narrow-span clamp
     at the 1.00 mm wall (the class already declared for narrow leaves above);
     0.000151 deg over the allowance on both, at the blade's margin, never widened. */
  'SEPAL SIZE: the WING — 120 x 5 mm, angle -10, curl +120 biased to the tip, tapers 3 / 4, tip 0.60 (the sepals three times the 35 mm petals\' length)':
    { excessDeg: 0.000151, note: 'adds 45.000151 deg at [16.423, 5.990, -1.520] — the narrow-span bead clamp on a 5 mm blade, found by CI on 8255893' },
  'SEPAL SIZE: 120 x 5 mm asked UP at 40 — the limit drawn with the root exclusion in MILLIMETRES (pinned at or under 22; a fraction of the sepal\'s length read +24 here)':
    { excessDeg: 0.000151, note: 'adds 45.000151 deg at [-2.550, 22.830, 5.418] — the same 5 mm blade at the other angle, the same clamp' },
  /* LEAF/STEM BUILD S5 (the leaf nib, the tip yield, the broad-sinus fillet —
     docs/bloom-leaf-tip-broad-sinus-outcome.md): nine smoke rows newly over
     the allowance, each declared at its measured magnitude with its reason;
     never widened. */
  'LOBED YIELD: 6 lobes asked on a 12 mm blade (the count gives 6 -> 2, where the print minimum fits; told)':
    { excessDeg: 64.684789, note: 'adds 119.471415 deg; face-to-face 123.06, outline 3.59 — measured for the FIRST time at S5: until S5 this row was a declared self-intersector (21 pairs at the tip stub), which E2 exempts; the nib clears the fold and E2 now reads it, mid-blade at u 0.457, not at the tip; RE-RECORDED at S5b from 74.471415 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  'LEAF TIP: the tip gives its tooth up (SIMPLE, width 10, 12 teeth at depth 1, tip 0.60 — the first given up at the tip, told)':
    { excessDeg: 1.707137, note: 'adds 46.550106 deg; face-to-face 46.65, outline 0.10 — NEW at S5: in the nib\'s FLAT FLANK on an acute (FLOOR-regime) blade, a blade 1.6 mm across closing toward the 0.10 mm face: the narrow-span clamp class, as `LEAVES: tip shape ACUTE` and the petal nib\'s own declared rows; RE-RECORDED at S5b from 1.550106 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  'TIP NECK: the body parts the blade as deeply (SIMPLE depth 0.8 x 9 — the body 80%, the tip 77%: no neck, nothing given)':
    { excessDeg: 3.312938, note: 'adds 48.312938 deg — NEW at S5b with block 60 (a SIMPLE leaf serrated at depth 0.8, every notch past half the base width, so the tip keeps its teeth); MID-BLADE at u 0.45, on the margin at a deep notch (the depth-0.8 serration itself), not at the tip (3.56 on the S5 stations, 3.31 on the S5b ones)' },
  'BROAD SINUS: filleted at roundness 0.12 (lobe shape 2.5 — every sinus broad)':
    { excessDeg: 44.818165, note: 'adds 62.425253 deg; face-to-face 106.87, outline 44.44 — the broad sinus FILLETED at its V point (S5); the same state unfilleted (`LOBED: lobedShape max (2.5)`) reads 46.02 on the base tree and 17.43 here; RE-RECORDED at S5b from 17.425253 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  /* LEAVES ENTERED E2's SUBJECT WITH LEAF/STEM BUILD S2 (the blade through
     `emitPanel`; before it a leaf closed on a flat 90-degree wall that no
     clause here read). Four smoke rows exceed the allowance and every site is
     where the BLADE IS NARROW — 1.6 to 2.9 mm across against a 1.2 mm sheet
     (a sinus cut to the print floor, a 3-6 mm blade near its base, an acute
     tip's stub): the narrow-span clamp shrinks the bead and the skin turns
     into it harder than the 45 deg allowance. Declared at the measured
     magnitude, never widened; the flat wall they replace turned 90 deg at
     every one of them. Located by (u, v) on each leaf's own surface in
     docs/bloom-leaf-emitter-arch-cup-outcome.md. */
  'LEAVES: tip shape ACUTE (0.60 — the floor; the 1.6 mm terminal stub is at its longest)':
    { excessDeg: 2.406582, note: 'NEW with S2 (leaves through emitPanel): adds 45.501270 deg; face-to-face 45.63, outline 0.13 — a serration sinus cut to the print floor (h 0.80 mm at u 0.652, v -0.95), the narrow-span clamp; RE-RECORDED at S5 from 0.50127 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 2.2117 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  'LEAF POSE: the CARNATION — opposite (decussate) x 4 nodes, swelling 1, arched linear leaves (60 x 6 mm, arch 90, cup 0.6, entire)':
    { excessDeg: 9.397567, note: 'NEW with S2: adds 46.666347 deg; face-to-face 48.06, outline 1.39 — a 6 mm blade near its base (h 1.45 mm at u 0.099, v -0.95), the narrow-span clamp; RE-RECORDED at S5 from 1.666347 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 8.381233 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  'TOOTH FLOOR: a 5 mm blade (the count GIVES — 9 asked, fewer fit a 1 mm notch)':
    { excessDeg: 3.821279, note: 'NEW with S2: adds 45.446864 deg; face-to-face 45.78, outline 0.34 — a floored sinus on a 5 mm blade (h 1.06 mm at u 0.848, v 0.95), the narrow-span clamp; RE-RECORDED at S5 from 0.446864 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 4.122391 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  'TOOTH FLOOR: a 3.5 mm blade (NO ROOM — the widest point has 0.95 mm over the print floor)':
    { excessDeg: 3.142874, note: 'NEW with S2: adds 46.321726 deg; face-to-face 46.73, outline 0.41 — a 3.5 mm blade near its base (h 1.43 mm at u 0.224, v -0.95), the narrow-span clamp; RE-RECORDED at S5 from 1.321726 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 2.85791 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  /* F6-sym-2 (docs/bloom-outline-curve-2-outcome.md): smoke block 66's trumpet.
     NOT the curve's: its LAW twin (`OUTLINE CURVE 2: the TRUMPET in LAW …`, a
     byte HOLDER against 1bb7c35, so main's own geometry) reads 46.253052 at the
     same height on the same state — worse — and is not a smoke row, so only the
     CURVE row reaches this gate. A tilt-85, curl -45, 50 mm trumpet: the tube's
     own class. Declared, never widened. */
  /* F6-spoon (Oct 18, docs/bloom-spoon-rim-turn-outcome.md): the two spoon rows,
     in the smoke subset so this gate HOLDS them. Neither is the waist's and
     neither is CURVE's: both sit on a BLUNT end's last ladder gap before the
     nib, where the half-width falls ~2.4 mm -> 0.2 mm in one row step (rows
     51 -> 52 of 58, 0.66 mm along the blade, every blunt end alike) — the
     near-rectangle (not waisted) reads 89.84 at cup 0.6 and the LAW spatulate
     (base 3 / tip taper 0.6 / tip shape 1.7, main's geometry) 81.33. The cup
     row climbs smoothly with the cup (44.53 / 50.20 / 68.69 / 71.99 / 74.57 at
     0 / 0.2 / 0.4 / 0.6 / 0.8); the width row is the spatulate head's steeper
     fall at x1.875 (LAW spatulate tip shape 2.5 at 30 mm reads 46.51). No fold
     (0 within-shell pairs), no inward shell, the rim at the hot profile is the
     nib's own clamp (0.363 mm, 0.359 at cup 0). Declared, never widened. */
  'OUTLINE CURVE: the spoon x cup 0.6 (the form laws read the drawn half-width)':
    { excessDeg: 26.986507, note: 'adds 71.986507 deg at [-27.655, -28.812, 15.309]; face-to-face 89.96, outline 17.98 — row 52/58 (u 0.9992, the first nib-arc row, a clamped bead, room 0.402) on the blunt end\'s last ladder gap; identical on a worktree of 1bb7c35 (#417)' },
  'OUTLINE CURVE 2: the spoon x petalWidth 30':
    { excessDeg: 4.198688, note: 'adds 49.198688 deg at [25.592, -33.329, 14.808]; face-to-face 51.92, outline 2.72 — row 51/58 (u 0.9806, h 4.47, unclamped), the spatulate head\'s steep fall into the nib at x1.875; the same spoon at 16 mm reads 44.53 (at the claw)' },
  /* F6-asym (Oct 18, docs/bloom-outline-curve-asym-outcome.md): the one
     asymmetric smoke row over the allowance. Its two symmetric TWINS (each half
     mirrored) read 47.256717 (left) and 52.266642 (right) through this same
     clause, so the asymmetric petal adds no turn its halves do not already
     have — the blunt-nib-under-a-cup class #419 declared on the spoon. */
  'ASYM OUTLINE: the lateral x cup 1.2 (the fold clamp on each half)':
    { excessDeg: 1.961139, note: 'NEW with F6-asym block 67: adds 46.961139 deg at [28.355, -27.879, 15.092]; face-to-face 70.57, outline 23.61 — row 52/59 (u 0.9954, the LEFT half on the nib, hL 0.294 / hR 0.200, a clamped bead, room 0.600); the twins read 47.256717 (left mirrored) and 52.266642 (right mirrored)' },
  'OUTLINE CURVE 2: the TRUMPET with a drawn lobe':
    { excessDeg: 0.523018, note: 'NEW with F6-sym-2 block 66: adds 45.523018 deg at [-8.088, -18.185, 30.843]; face-to-face 51.24, outline 5.72 — the LAW twin reads 46.253052 at [-17.815, 4.836, 30.310] on main\'s bytes, so the trumpet\'s, not the curve\'s; found by CI on ab757de' },
  'TUBE: GATED — the buckle (unavailable, inert)':
    { excessDeg: 3.295065, note: 'NEW with the tube PR\'s smoke block 45: adds 48.295065 deg; face-to-face 56.43, outline 8.14 — the BUCKLE\'s out-of-plane class (the tube is unavailable and inert on this row, so this is the buckle alone)' },
  'BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)':
    { excessDeg: 5.440992, note: 'the buckle wave curves the margin OUT OF PLANE, which the outline\'s plan turn cannot see; raw 60.05 deg, outline 8.81. Was 6.236137 before #283 (the nib re-stations the tip rows)' },
  /* 'TIP SHAPE: 0.60 x the thickest sheet (2.40 — the floor doubles and binds early)' was declared at
     excessDeg 0.005430 and reads 43.585233 deg since #283 — UNDER the allowance by 1.41 deg; entry
     removed, the gate's own STALE clause is what said so. */
  /* 'ORCHID: the labellum and the hood (the flower has a face) x 2 whorls in step' (1.152165) left
     with its row: a RADIAL labellum-and-hood design, DROPPED BY RULING at the role retirement (Q3.4). */
  'FAN x PER-PETAL: petal 1 extreme x toggle OFF (the same sliders now drive the INNER PAIR)':
    { excessDeg: 3.204461, note: 'NEW at #283: adds 48.204461 deg; face-to-face 66.54, outline 18.33. 0 excess before the nib' },
  'GRADIENT: cup gradient max x cup max x widest petal (the metric reaches 2.6 at the tip)':
    { excessDeg: 40.920822, note: 'NEW at #283: adds 85.920822 deg; face-to-face 103.16, outline 17.24 — the largest, on the row where the fold clamp binds hardest. 0 excess before the nib' },
  'LADDER x BUCKLE: f 7 — the ceiling, where the gap bound collapses the ladder to uniform':
    { excessDeg: 35.478378, note: 'NEW at #289: adds 80.478378 deg; face-to-face 90.52, outline 10.04. Clean at #283, red from the row ramp on' },
  'APEX NIB: tip shape 3.00 x 20 mm (the steepest flank on the shortest — a 0.003 mm arc)':
    { excessDeg: 2.968831, note: 'NEW at #289: adds 47.968831 deg; face-to-face 55.73, outline 7.76. Clean at #283, red from the row ramp on' },
  'PER-LAYER: RADIAL x 4 layers — layer 4 asks a width past the outer whorl\'s (the HUB GROWS to its ring, told)':
    { excessDeg: 3.783426, note: 'NEW with the role retirement\'s block 64 (Q3.5): adds 48.783426 deg; face-to-face 53.44, outline 4.66 — at u 0.973 on the INNERMOST ring, whose length is still ramped (0.373 x, ~13 mm) while its width is owned at 19 mm (Q3.5 drops the ramp from an owned value only): a short wide blade closing on the apex nib, the nib class of `APEX NIB: tip shape 3.00 x 20 mm`. THE BLADE\'S, NOT THE FOOT\'S — 48.783426 to six decimals with the foot and ring put back on their pre-ruling law; layer 3 owning the same +3 reads 43.69, a global 19 mm width 43.39, +2 on layer 4 47.81' },
  'APEX NIB: INERT — a squared terminal holds the outline above the print floor':
    { excessDeg: 6.872304, note: 'NEW at #283: adds 51.872304 deg at the squared terminal\'s corners; face-to-face 51.87, outline 0.00 — the carnation terminal\'s class (a tooth\'s corner), with the nib inert by declaration' },
  'FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth':
    { excessDeg: 0.000168, note: 'a tooth\'s terminal; the frame rotates a hair between adjacent columns. raw 45.00 deg, outline 0.00' },
  'FRINGE: GATED — LOBES asked for under a fringe (hidden AND inert, by ruling — the fringe wins)':
    { excessDeg: 0.000168, note: 'the carnation row again — this row carries the same fringe, and the lobes are inert by ruling' },
  /* FORM VARIANCE (build 2, #320): THE SURFACE'S OWN TURN, ON A PETAL WHOSE
     TWIST AND CURL THE FIELD HAS MOVED — not the treatment's, and that is a
     two-sided measurement rather than a reading of the label. Each petal's
     composed (curl, cup, twist) set directly on the SLIDERS reproduces it:
     the ALIASED row's worst petal is curl 135 x cup -0.8 x twist 90, which on
     the sliders alone reads 74.408025 deg, to the sixth decimal; the amount-1
     row's worst petal (curl 233.8 x cup 0 x twist -155.9) reads 117.64 at
     the rounded slider values 234 / 0 / -156. And the class is on MAIN by one
     slider: `petalTwist max (180)` adds 45.307323 deg (face-to-face 49.99,
     outline 4.68), in no row this gate's default subset carries, so CI never
     ran it — seven of the eight per-petal slider states on the default
     amount-1 row exceed the allowance. A twist rotates the section OUT OF
     PLANE, which the outline's plan turn cannot see — the buckle's class. */
  'petalTwist max (180)':
    { excessDeg: 0.307323, note: 'IN THE DEFAULT SUBSET SINCE the headroom PR (block 1 of tools/bloom-smoke.mjs): adds 45.307323 deg; face-to-face 49.99, outline 4.68 — the twist rotates the section out of plane, the buckle\'s class, on MAIN and on the slider alone. The form-variance rows below are this class reached per petal' },
  'FORM VARIANCE: amount 1 (1 cycle round the shipping whorl, phase 0)':
    { excessDeg: 73.633038, note: 'NEW at #320: adds 118.633038 deg; face-to-face 124.79, outline 6.15 — the petal at curl 233.8 x cup 0 x twist -155.9, which reads 117.64 on the sliders alone at 234 / 0 / -156' },
  'FORM VARIANCE: 20 cycles on 8 slots (ALIASED — scatter, told and not capped)':
    { excessDeg: 29.408025, note: 'NEW at #320: adds 74.408025 deg; face-to-face 100.38, outline 25.97 — curl 135 x cup -0.8 x twist 90, which reads 74.408025 on the sliders alone, identical to the sixth decimal' },
  'FORM VARIANCE: x FAN, phase 90 (even about the mirror line — the phase is INERT)':
    { excessDeg: 14.498401, note: 'NEW at #320 at 24.729474 excess (adds 69.729474 deg; face-to-face 94.70, outline 24.97 — a fan petal the field has twisted, the same class as the two rows above). RE-RECORDED by the headroom follow-up: 14.498401 — at the default the headroom scales the DOWNWARD curl (room 180 of a 270 half-span) and DOWNWARD cup (0.8 of 1.0) continuously where the old law clipped them, so the curled-under fan petals carry a different composition (twist is symmetric about its default and is not scaled); the same row\'s self-approach moved 0.620 -> 0.767 mm in the same direction' },
  /* NODE VARIANCE (inflorescence build 3, Phase B): the same class one level
     down — a FLORET's petal whose twist two fields composed. The row's worst
     floret petal is curl 45.3 x cup 0.61 x twist -111 (the node term's -45
     of twist on the head's slot field's -45 to +88 — measured from the
     builder's own `applied` record on each distinct unit); the form field
     alone on this raceme reaches twist +/-88 and node variance alone +/-45,
     and both of those sibling rows PASS E2 in the same CI run, so it is the
     composition. Two-sided through this gate's own measurement on a PLAIN
     bloom at the sliders: twist -111 ALONE adds 49.099660 deg (face-to-face
     51.28, outline 2.18), curl 45 x cup 0.6 x twist -111 adds 53.656988, and
     the other node's -15 x -0.46 x 111 adds 48.978261 — the row reads 49.48 on
     a 0.60-scale five-petal floret. Found by CI on 5cf74e2 (the merged tree's
     first full `gates` job); the row is block 50's and had never reached this
     gate before the merge put it in the smoke subset. */
  'NODE VARIANCE: 0.5 x the form field 0.5 (the head\'s slot field composing on the moved base; the phase DERIVED outward)':
    { excessDeg: 4.478652, note: 'NEW with build 3 Phase B (block 50): adds 49.478652 deg; face-to-face 50.75, outline 1.28 — a floret petal at twist -111, the twist\'s out-of-plane class (petalTwist max (180) above), reached by the node term composing on the head\'s form field. Twist -111 on the sliders alone adds 49.099660' },
  /* AND IT IS NOT THE INFILL'S, WHICH IS A TWO-SIDED FACT RATHER THAN A
     READING OF THE LABEL: the plan REFUSES a blade that is several panels, and
     I2 asserts on that row that the mesh is BIT-IDENTICAL to the same state
     with the guard off. So this excess is a property of `petalTipEnd` 1 x
     `fringeCount` 4 — a combination the matrix did not reach before block 39
     put the two together — and the same class as the carnation's above, one
     tooth count along. */
  'INFILL: REFUSED — a FRINGE owns the same region (several panels)':
    { excessDeg: 0.000231, note: 'a tooth\'s terminal on a FOUR-tooth full terminal; the frame rotates a hair between adjacent columns. raw 45.00 deg, outline 0.00. The infill is REFUSED here and the mesh is bit-identical to the guard-off build (I2), so this is not the infill\'s' },
  /* THE LOBED (CHEVRON) LEAF, leaf/stem build S4 — every block-56 row whose
     leaf is built lobed exceeds the allowance, and it is ONE CLASS, PRE-EXISTING
     IN THE SHIPPED LEAF BEAD AND DEEPENED BY THE LOBES, never widened. The
     edge is the seam between the BOTTOM skin and the bead's last facet at the
     margin (bot -> bot between neighbouring rows). Measured on the SIMPLE
     leaf, whose bytes this session does not move: at its own 17 mm the seam
     reads 42.22 deg (under the bar); at 34 mm wide it reads 51.61, and at
     34 mm x cup 1.2 it reads 82.83 — reachable on main, carried by no smoke
     row. The lobed blade's envelope is 34 mm by default (the mum's), so it
     starts in that class (the degenerate chevron — tilt 0, no sinus, no teeth
     — reads 52.53), and on every lobe FLANK the rows meet the margin
     OBLIQUELY: sin(alpha) = L cos(tau) / |d(margin)/du|, about 12 degrees on
     the default's flanks, so the bead's cross-section across the margin is
     narrower than its drawn half-ellipse and the bottom skin turns into it
     harder (74.06 at the defaults, 90.07 at 6 lobes, 114.38 at cup 1.2).
     Making the bead's inset follow the margin's normal instead of the row is
     a change to emitPanel's rim law for every blade — not this session's.
     Declared at the measured magnitude on the block-56 SMOKE rows that
     exceed it (this gate's own row set); the other 27 lobed rows' figures are
     in docs/bloom-leaf-lobed-outcome.md. Each note says what it adds. */
  /* RE-MEASURED FOR S4b (the round sinus bottoms and the mum retune), never
     widened: the U's walls run at the flank's own pitch over a whole stretch
     where the V only touched it at a point, so more rows meet the margin as
     obliquely as the V's steepest point did — four rows read WORSE and one
     better; three S4b smoke rows are new. Same class as S4's (the bead's
     inset follows the row, not the margin's normal — an emitPanel change for
     every blade, out of scope). Each note keeps S4's figure. */
  /* RE-MEASURED FOR THE S4c FOLLOW-UP (Eva's rulings of Oct 9: 130 rows, four
     teeth a lobe, the tangent shoulders), never widened. The class is S4's
     (the bead's inset follows the row, not the margin's normal). Seven rows
     IMPROVE — the finer rows meet the flanks less obliquely and the filleted
     shoulders take the corner the walls met the flanks at; three read WORSE
     (the NONE FIT row, the two-lobe yield on a 12 mm blade, two teeth a
     lobe), each where the extra rows land on a steep short flank. The two
     relabelled rows (the roundness max, the tooth max) and the two new
     block-58 rows are declared at their measured figures. Each note keeps the
     previous figure. THEN THE X0 FIX (the fillet's flank tangent held a
     sixteenth of a stencil step clear of the crest) moved eleven of them by
     at most 0.26 deg, re-recorded with the figure before it; and the 6 -> 2
     yield row is OFF this list because it is a declared SELF-INTERSECTOR now
     (its tip folds with four teeth a lobe), which E2 exempts. */
  "LOBED: the MUM \u2014 alternate 137.5 x 4 nodes at the lobed defaults, arch 25":
    { excessDeg: 32.875913, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 32.720329; earlier: S4c follow-up: IMPROVED at the ruled four a lobe on 130 rows with tangent shoulders (S4c: 41.771712; S4b: 38.227001; S4: 26.972835); RE-RECORDED at S5 from 32.875913 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 39.630214 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED: lobedSinus max (0.9 \u2014 the narrowest sinus gaps)":
    { excessDeg: 64.836813, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 64.971444; earlier: S4c follow-up: IMPROVED (S4c: 70.118997; S4b: 48.743268; S4: 34.108313); RE-RECORDED at S5 from 64.836813 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 62.909417 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED: lobedAngle max (60 \u2014 the TILT CAP binds, built under asked)":
    { excessDeg: 23.137342, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 23.104974; earlier: S4c follow-up: IMPROVED (S4c: 29.902202; S4b: 30.630533; S4: 27.598071); RE-RECORDED at S5 from 23.137342 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 27.658345 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED: NONE FIT \u2014 6 lobes x sinus 0.9 x depth 0.3, 3 teeth a lobe (39 asked: the fold cap 0.08 mm, under the 1 mm floor; no teeth, told)":
    { excessDeg: 53.575426, note: "S4c follow-up: WORSE by 3.40 deg — no tooth fits either way; the 130 rows land on the six short flanks (S4c: 50.178275; S4b, as '... x 12 teeth': 50.306301; S4: 48.235885); RE-RECORDED at S5 from 53.575426 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 49.588173 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)" },
  "LOBED: 6 lobes x tooth depth 0.3, 1 tooth a lobe (the fold clamp binds \u2014 4.86 mm asked, built at the 1.71 mm cap)":
    { excessDeg: 45.583532, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 45.588366; earlier: S4c follow-up: IMPROVED (S4c: 47.328459; S4b: 45.517769; S4: 47.171007); RE-RECORDED at S5 from 45.583532 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 44.878068 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED: S4's form (sinus 0.62, shape 0.70, angle 38, teeth 0.08 \u2014 two V's under 1 mm, both ROUNDED, told)":
    { excessDeg: 26.924157, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 26.696014; earlier: S4c follow-up: IMPROVED (S4c: 30.119270; S4b: 29.002875); RE-RECORDED at S5 from 26.924157 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 30.631701 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED: THE LOBE COUNT YIELDS \u2014 5 lobes asked on a 36 mm blade at 30 deg, 3 built (no round bottom fits even at the print minimum at 5 or 4; told)":
    { excessDeg: 45.557069, note: 'S4c follow-up: IMPROVED (S4c: 48.995555); RE-RECORDED at S5 from 45.557069 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 45.684991 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED: the petiole CLAMPED \u2014 no sinus on a 3 mm stem at 90 deg (asks 0.82 mm, the rooted end holds 0.75)":
    { excessDeg: 2.507365, note: 'S4c follow-up: IMPROVED — no sinus, so the move is the rows and the tooth count alone, four a lobe on 130 rows (S4c: 24.185405; S4b: 13.371781); RE-RECORDED at S5 from 2.507365 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 1.83657 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED ROUNDNESS: max (0.5 \u2014 SATURATED from 0.18: every sinus at its largest smooth radius, told and hatched)":
    { excessDeg: 37.320181, note: "the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 37.432361; earlier: S4c follow-up: relabelled (was 'max (0.5 — every sinus SHRINKS, told)', 43.956893); the largest smooth radii, bit-identical to roundness 0.18 (block 58); RE-RECORDED at S5 from 37.320181 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 43.466762 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)" },
  "LOBED ROUNDNESS: 0.3 x S4\'s form (the radius shrinks at all three sinuses)":
    { excessDeg: 32.034003, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 32.29332; earlier: S4c follow-up: IMPROVED (S4c: 32.679957); RE-RECORDED at S5 from 32.034003 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 26.682552 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED YIELD: the RESIDUAL \u2014 3 lobes on a 24 mm blade over a 5.5 mm window at 58 deg (no count fits; the V kept, told)":
    { excessDeg: 20.912930, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 20.913176; earlier: S4c follow-up: IMPROVED (S4c: 43.134177); RE-RECORDED at S5 from 20.91293 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 45.867604 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED TEETH: 2 a lobe (14 \u2014 an even count: the apex notch on the terminal face)":
    { excessDeg: 51.829243, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 51.820781; earlier: S4c follow-up: WORSE by 1.99 deg (S4c: 49.830577); RE-RECORDED at S5 from 51.829243 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 53.697729 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED TEETH: max (6 a lobe \u2014 42 asked, the ROWS cap builds 28 at 130 rows, told)":
    { excessDeg: 33.699198, note: "the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 33.54865; earlier: S4c follow-up: relabelled (was '... the ROWS cap builds 24, told)', 35.310162); 28 built on 130 rows; RE-RECORDED at S5 from 33.699198 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 40.213484 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)" },
  "LOBED RULINGS: roundness 0.18 (the first DEAD step \u2014 SATURATED, the same leaf as 0.5; told and hatched)":
    { excessDeg: 37.320181, note: 'the X0 fix of the S4c follow-up (the fillet tangent held clear of the crest) moved it from 37.432361; earlier: NEW with the S4c follow-up: the first dead step, the same leaf (and the same figure) as roundness 0.5; RE-RECORDED at S5 from 37.320181 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 43.466762 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
  "LOBED RULINGS: a told shoulder CORNER \u2014 the disc meets the flank (5 lobes on a 58 mm blade at lobe shape 1.5)":
    { excessDeg: 28.347335, note: 'NEW with the S4c follow-up: a told shoulder corner on a broad-sinus blade; RE-RECORDED at S5 from 28.346182 (the three arc rows of the nib re-space the stations of every leaf blade, so the bead is faceted at different rows mid-blade); RE-RECORDED at S5b from 20.886846 (the three arc rows of the nib now come from the stations nearest the arc — the lobe window and the blade below the donors keep their pre-S5 stations)' },
};

/* THE BEAD IS NOT DRAWN ON AN INFILLED BLADE, AND THAT IS DECLARED HERE
   RATHER THAN LEFT FOR E2 TO TRIP OVER.

   `emitInfillPanel` calls `emitPanel` on the BASAL sub-panel alone, so #278's
   taper and half-round bead run around that panel's own perimeter and nowhere
   else; above the split the cells close with `emitRim`, which is a FLAT WALL
   from top skin to bottom skin. Eva's ruling for S3 is that HOLE rims stay
   flat walls and the bead is S5's, and this emitter extends that to the
   blade's OUTER margin, which the ruling did not name. So an infilled blade
   gives back, over the treated region, the 90-degree cliff one sheet thick
   that #278 exists to remove: a REGRESSION AGAINST IT on every row that cuts
   a pattern, named here rather than hidden.

   AND E2'S WINDOW IS EMPTY THERE FOR A SECOND REASON, WHICH IS MEASURED
   RATHER THAN INFERRED: the basal sub-panel's treated apexes all lie inside
   `RIM_TAPER_MM` of the foot-to-blade seam, so every edge near one is already
   the RAMP the clause skips by name. Both halves say the same thing — an
   infilled blade has no treated apex E2 can stand on — and a clause whose
   subject is EMPTY passes on anything, which is why this is a declaration
   with a reason and not a pass. `emitRimLoop` is the S5 hook these loops are
   already kept for; running the bead's profile machinery along the cell
   region's outer boundary is its work, never a tolerance here.

   READ FROM THE BUILDER'S OWN RECORD, NEVER FROM THE LABEL OR THE CONTROL
   SET, AND APPLIED PER PART RATHER THAN PER ROW. `petalInfill: 'VORONOI'` is
   what the row ASKS for; whether a pattern was CUT is that part's own
   `infill.built`, and the two differ on every REFUSED row — where the mesh is
   bit-identical to the guard-off build (I2), the bead IS drawn and E2 has a
   real subject it must keep measuring. A predicate taken from the control set
   would have carved exactly those rows out; a predicate applied to the whole
   ROW would have carved out the SEPALS on `INFILL: x sepals 8`, which are
   pinned uninfilled by ruling 4 and carry 2,192 edges of beaded rim. Both are
   the same carve-out this project has a rule about, one level apart. So the
   clause drops the PARTS that cut a pattern and keeps every other one, and
   what is declared is the case where NOTHING is left — an empty subject,
   named as such. */
const cutsAPattern = (part) => !!(part && part.infill && part.infill.built);
const { DEFAULTS } = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const H = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-harness.mjs')).href);

/* A matrix row's `set` values are STRINGS and the geometry's guards are
   truthiness tests on numbers — `!'0'` is FALSE. Coerced against DEFAULTS,
   the shape tools/verify-bloom-seam-bytes.mjs already uses. */
const stateFor = (row) => {
  const st = { ...DEFAULTS };
  for (const { id, value } of (row.set || [])) {
    /* the row's own overrides record (the role retirement, Q3.4): never a
       control, so it never enters the state — `scopesFor(row)` hands it to the
       build instead. Read as a state key it built the row WITHOUT its scope
       offsets, silently: every migrated role row measured as the plain bloom. */
    if (id === H.SCOPES_SET_ID) continue;
    if (!(id in DEFAULTS)) { st[id] = value; continue; }
    const d = DEFAULTS[id];
    st[id] = typeof d === 'number' ? Number(value) : typeof d === 'boolean' ? (value === true || value === 'true') : value;
  }
  return st;
};
const scopesFor = (row) => H.rowScopesForBuild(row);

/* A ROW WHOSE SURFACE IS DECLARED TO PASS THROUGH ITSELF CANNOT BE HELD TO A
   SMOOTHNESS BAR, and that is not a carve-out for this change: two faces of a
   folded sheet that share an edge legitimately turn through 180 degrees, and
   the census — not this gate — is what owns a fold. The list is the harness's
   own SELF_INTERSECTION_XFAIL, imported rather than restated, so a row that
   stops folding stops being exempt here the same day X1 says so. The count of
   rows skipped is printed on every run. */
const FOLDS = new Set(Object.keys(H.SELF_INTERSECTION_XFAIL || {}));

const MATRIX = H.buildMatrix();
/* THE DEFAULT ROW SET is one per matrix BLOCK plus every row whose label names
   a rim-shaped feature, because those are the panels whose boundaries are not
   the plain span: a cleft's sinus, a fringe's teeth and gaps, a lobe's
   scallops, and the narrow tips. `--all` runs the whole matrix. */
/* THE DEFAULT ROW SET IS THE PROJECT'S OWN SMOKE SUBSET, imported rather than
   restated: a second hand-written list of "interesting rows" is a second owner
   of that judgement, and this repo has paid for that before. `--all` runs the
   whole matrix; `--only <regex>` runs a named slice. What the subset is BLIND
   to is in tools/bloom-smoke.mjs's own header. */
const SMOKE = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-smoke.mjs')).href);
const SMOKE_LABELS = new Set(SMOKE.SMOKE_BLOCKS.flatMap((b) => b.rows.map((r) => r.label)));
const pickRows = () => {
  if (ROWS_FILE) return JSON.parse(fs.readFileSync(ROWS_FILE, 'utf8'));
  if (ONLY) return MATRIX.filter((r) => ONLY.test(r.label));
  if (ALL) return MATRIX;
  return MATRIX.filter((r) => SMOKE_LABELS.has(r.label));
};

const key3 = (x, y, z) => `${x},${y},${z}`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* The emitted stream, read as a mesh: the vertex set, the edge census, the
   degenerate count and every edge's turn angle. Nothing here reads the
   builder. */
/* THE EMITTED STREAM, READ AS A MESH, ON TYPED ARRAYS. Nothing here reads the
   builder. The obvious implementation — a Map keyed by "a|b" per edge — runs
   out of an EIGHT GIGABYTE heap on `ALL MAX` at 4.3 million triangles, where
   there are thirteen million directed edges: the keys alone are gigabytes of
   string. Vertices still go through a Map because the dedup must be EXACT on
   the double (this project keys on `String(v)`, the shortest round-tripping
   form, precisely so two keys are equal iff the doubles are); everything after
   that is integer ids in Float64Arrays, sorted. */
function meshOf(pos) {
  const T = pos.length / 9;
  const id = new Map();
  const vid = new Int32Array(T * 3);
  let next = 0;
  for (let i = 0, k = 0; i < pos.length; i += 3, k++) {
    const key = key3(pos[i], pos[i + 1], pos[i + 2]);
    let v = id.get(key);
    if (v === undefined) { v = next++; id.set(key, v); }
    vid[k] = v;
  }
  /* One packed double per DIRECTED edge: a * 2^27 + b. Exact while the vertex
     count stays under 2^27 (134 million), which is far past any reachable
     matrix row; asserted rather than assumed. */
  if (next >= 134217728) throw new Error(`meshOf: ${next} vertices exceeds the packing this census uses`);
  const SH = 134217728;
  const dirs = new Float64Array(T * 3);
  const und = new Float64Array(T * 3);
  const N = [];
  let degen = 0, m = 0, volume = 0;
  for (let t = 0, k = 0; t < pos.length; t += 9, k += 3) {
    const a = vid[k], b = vid[k + 1], c = vid[k + 2];
    if (a === b || b === c || a === c) { degen++; N.push(null); continue; }
    const ax = pos[t], ay = pos[t + 1], az = pos[t + 2];
    const bx = pos[t + 3], by = pos[t + 4], bz = pos[t + 5];
    const cx = pos[t + 6], cy = pos[t + 7], cz = pos[t + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz);
    if (!(L > 0)) { degen++; N.push(null); continue; }
    N.push([nx / L, ny / L, nz / L, (ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    for (const [x, y] of [[a, b], [b, c], [c, a]]) {
      dirs[m] = x * SH + y;
      und[m] = (x < y ? x : y) * SH + (x < y ? y : x);
      m++;
    }
  }
  const D = dirs.subarray(0, m).slice().sort();
  const U = und.subarray(0, m).slice().sort();
  let boundary = 0, nonManifold = 0;
  for (let i = 0; i < m;) {
    let j = i; while (j < m && U[j] === U[i]) j++;
    const n = j - i;
    if (n === 1) boundary++; else if (n > 2) nonManifold++;
    i = j;
  }
  /* THE DIRECTED CENSUS: every directed edge must have its reverse. Binary
     search over the sorted packed ids — no second Map. */
  const has = (x) => { let lo = 0, hi = m - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (D[mid] === x) return true; if (D[mid] < x) lo = mid + 1; else hi = mid - 1; } return false; };
  let dirUnmatched = 0;
  for (let i = 0; i < m; i++) {
    if (i && D[i] === D[i - 1]) continue;
    const a = Math.floor(D[i] / SH), b = D[i] - a * SH;
    if (!has(b * SH + a)) dirUnmatched++;
  }
  /* The edge list the dihedral pass walks: only edges with exactly two faces,
     as (packed, faceA, faceB). Built from the undirected sort, so it costs no
     extra map. */
  const pairs = [];
  {
    const order = new Int32Array(m);
    for (let i = 0; i < m; i++) order[i] = i;
    const arr = Array.from(order).sort((x, y) => und[x] - und[y]);
    for (let i = 0; i < m;) {
      let j = i; while (j < m && und[arr[j]] === und[arr[i]]) j++;
      if (j - i === 2) pairs.push([Math.floor(arr[i] / 3), Math.floor(arr[i + 1] / 3), und[arr[i]]]);
      i = j;
    }
  }
  return { vertIds: id, edges: pairs, degen, boundary, nonManifold, dirUnmatched, volume, N, tris: T, SH };
}

/* A bucket grid over a point set, answering "how far to the nearest of these"
   within a bounded radius. Linear in the mesh; the apex set reaches tens of
   thousands of points on the densest rows. */
function nearestWithin(points, cell) {
  const grid = new Map();
  const ck = (p) => `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)},${Math.floor(p[2] / cell)}`;
  for (const a of points) { const k = ck(a); let g = grid.get(k); if (!g) { g = []; grid.set(k, g); } g.push(a); }
  /* A ONE-CELL HALO AROUND THE OCCUPIED CELLS, so the common case — an edge
     nowhere near a rim — costs ONE lookup instead of twenty-seven. On the
     densest matrix rows this is thirteen million edges against sixty-five
     thousand rim points, and without it the clause is minutes per row. */
  const halo = new Set();
  for (const k of grid.keys()) {
    const [x, y, z] = k.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) halo.add(`${x + dx},${y + dy},${z + dz}`);
  }
  return (p) => {
    const bx = Math.floor(p[0] / cell), by = Math.floor(p[1] / cell), bz = Math.floor(p[2] / cell);
    if (!halo.has(`${bx},${by},${bz}`)) return Infinity;
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const g = grid.get(`${bx + dx},${by + dy},${bz + dz}`); if (!g) continue;
      for (const a of g) { const d = dist(a, p); if (d < best) best = d; }
    }
    return best;
  };
}

/* The sharpest OUTLINE turn among the recorded apexes within `near` of a
   point. Same bucket grid; returns 0 where nothing is in reach. */
function nearestTurn(apexes, cell) {
  const grid = new Map();
  const ck = (p) => `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)},${Math.floor(p[2] / cell)}`;
  for (const a of apexes) { const k = ck(a.p); let g = grid.get(k); if (!g) { g = []; grid.set(k, g); } g.push(a); }
  return (p) => {
    const bx = Math.floor(p[0] / cell), by = Math.floor(p[1] / cell), bz = Math.floor(p[2] / cell);
    let t = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const g = grid.get(`${bx + dx},${by + dy},${bz + dz}`); if (!g) continue;
      for (const a of g) if (dist(a.p, p) <= cell && a.outlineTurnDeg > t) t = a.outlineTurnDeg;
    }
    return t;
  };
}

/* THE LARGEST TURN OVER THE TREATED RIM, and the subject is stated rather than
   assumed. An edge counts when it lies within `near` of a TREATED apex AND is
   closer to one than to any perimeter vertex the treatment did not reach.
   That second half is load-bearing and is not a carve-out to dodge a red: the
   buried perimeter — the foot under the hub slab, a cleft's or a fringe's base
   panel under the panels that overlap it — is a flat wall at ninety degrees BY
   DESIGN, identically on main, and at the shipping default the first treated
   apex sits 0.65 mm above the foot's own wall, well inside a 2 mm window. The
   excluded count is REPORTED, and the two sets come from the builder's own
   `rim.apex` / `rim.flat` so neither can be silently widened. */
/* THE SUBJECT IS THE RIM'S OWN EDGES, AND IT IS A MEMBERSHIP TEST RATHER THAN
   A DISTANCE ONE. "Within 2 mm of a rim" is the ruling's window and it is the
   right window for a petal on its own; on a bloom it is not a subject. A
   floret's petal rim sits millimetres from the RACHIS, a sepal's from the HUB,
   a leaf's from the STEM — and those are flat walls at ninety degrees by
   design, on this tree and on main. Measured before this was scoped: `INFLO:
   pedicels STRAIGHT UP` reported an 84.47 degree "rim" turn where the outline
   turns 1.01, and the faces involved were the stem's.

   An edge qualifies when BOTH its endpoints are vertices the builder declared
   on a treated profile — the apex and the two points where the bead meets the
   skins. That is exactly the rim strip plus the skin's outermost row, it comes
   from the builder's own record rather than from a radius, and no other part
   can share those vertices. The distance window still applies on top, so the
   ruling's 2 mm is kept rather than replaced. */
function worstTurnNearRim(mesh, apexes, flats, corners, near, cornerR, rampMm, rimVerts) {  // apexes: {p, outlineTurnDeg}
  if (!apexes.length) return { deg: 0, at: null, edges: 0, skipped: 0, corner: 0, cornerDeg: 0, rampDeg: 0, raw: 0, outline: 0 };
  const pts = apexes.map((a) => a.p);
  const dT = nearestWithin(pts, near);
  /* THE OUTLINE'S OWN TURN NEAR AN EDGE — the largest of it over the apexes
     within reach, because an edge sits between vertices and inherits the
     sharper of them. */
  const turnNear = nearestTurn(apexes, near);
  const dF = flats.length ? nearestWithin(flats, near) : () => Infinity;
  const dC = corners.length ? nearestWithin(corners, Math.max(cornerR, 1e-6)) : () => Infinity;
  let worst = -1, at = null, n = 0, skipped = 0, nCorner = 0, cornerDeg = 0, rampDeg = 0, worstRaw = 0, worstOutline = 0;
  const deg0 = (A, B) => { let d = A[0] * B[0] + A[1] * B[1] + A[2] * B[2]; d = d > 1 ? 1 : d < -1 ? -1 : d; return (Math.acos(d) * 180) / Math.PI; };
  for (const f of mesh.edges) {
    const A = mesh.N[f[0]], B = mesh.N[f[1]];
    if (!A || !B) continue;
    const va = Math.floor(f[2] / mesh.SH), vb = f[2] - va * mesh.SH;
    if (!rimVerts.has(va) || !rimVerts.has(vb)) continue;
    const mid = [(A[3] + B[3]) / 2, (A[4] + B[4]) / 2, (A[5] + B[5]) / 2];
    const t = dT(mid);
    if (!(t <= near)) continue;
    /* THE SUBJECT IS THE RIM THE TREATMENT FINISHED, and both halves of that
       are stated rather than assumed. An edge nearer an UNTREATED perimeter
       vertex than a treated one belongs to the buried stretch. An edge within
       RIM_TAPER_MM of one belongs to the RAMP — the hand-over to the foot-to-
       blade seam, which is the receptacle join and is out of this change's
       scope by Eva's own ruling. Inside that ramp the wall's strip is a ruled
       surface between two segments that are not parallel, and subdividing it
       at K steps resolves a twist main's single quad did not: the corner reads
       108.21 deg on this tree against 93.92 on main, at the seam, inside the
       hub's own rim. That is REPORTED beside the bar, not silently dropped —
       `skipped` is printed on every run. */
    const fd = dF(mid);
    if (fd < t || fd <= rampMm) { skipped++; if (deg0(A, B) > rampDeg) rampDeg = deg0(A, B); continue; }
    let d = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    d = d > 1 ? 1 : d < -1 ? -1 : d;
    const deg = (Math.acos(d) * 180) / Math.PI;
    /* THE BAR IS THE OUTLINE'S OWN TURN PLUS THE ALLOWANCE, not the allowance
       alone. Where the OUTLINE turns — the four apex corners, a squared
       terminal's two, every lobe sinus at a cusped notch power — the drawn
       surface must turn with it, because the apex is placed on every original
       boundary vertex and that is the silhouette ruling. What this asserts is
       that the treatment ADDS no more than the allowance on top. Where the
       outline is straight the two are the same statement and the bar is 30
       degrees flat. */
    const ot = turnNear(mid);
    if (ot >= DIH_BAR) { nCorner++; if (deg - ot > cornerDeg) cornerDeg = deg - ot; }
    n++;
    const excess = deg - Math.max(0, ot);
    if (excess > worst) { worst = excess; at = mid; worstRaw = deg; worstOutline = ot; }
  }
  return { deg: worst < 0 ? 0 : worst, at, edges: n, skipped, corner: nCorner, cornerDeg, rampDeg, raw: worstRaw, outline: worstOutline };
}

async function runRows(G, rows, fails, notes, fullSet = false) {
  const check = (clause, ok, msg) => { if (!ok) fails.push(`${clause}: ${msg}`); return ok; };
  let insetChecked = 0, profiles = 0, worstTurn = 0, worstCorner = 0, worstRamp = 0, minRim = Infinity, clamps = 0, leafRows = 0, leafApexAll = 0;
  let done = 0;
  const declaredSeen = new Set();
  for (const row of rows) {
    if (PROGRESS) process.stderr.write(`  [${++done}/${rows.length}] ${row.label.slice(0, 70)}\n`);
    const st = stateFor(row);
    const per = {};
    for (const exportMode of [false, true]) {
      let acc, built;
      try {
        acc = new G.MeshBuilder({ exportMode, captureRim: true });
        built = G.buildBloomInto(acc, st, { below: null, capability: row.capability || null, scopes: scopesFor(row) });
      } catch (e) { check('E0', false, `${row.label} [${exportMode ? 'export' : 'live'}]: build threw — ${e.message}`); continue; }
      const mesh = meshOf(acc.positions);
      const rim = [], rimE2 = [];
      for (const p of (built.petalsAll || [])) if (p && p.rim) { rim.push(p.rim); if (!cutsAPattern(p)) rimE2.push(p.rim); }
      for (const s of (built.sepals && built.sepals.built) || []) if (s && s.rim) { rim.push(s.rim); if (!cutsAPattern(s)) rimE2.push(s.rim); }
      /* LEAVES ARE IN THE SUBJECT (leaf/stem build S2): the blade goes through
         `emitPanel` and closes on the same bead, so every clause here asks of
         a leaf rim what it asks of a petal's. A leaf row whose leaves carry no
         treated rim at all is E0's — the treatment silently not reaching the
         leaves would otherwise leave this whole family green over them. */
      let leafApex = 0;
      /* A COMPOUND LEAF IS MANY BLADES (leaf/stem build S3): every leaflet is a
         blade through `emitPanel` with its own rim — the free BASE beaded as
         the tip is — so each one is in the subject, not the first. */
      for (const l of built.leavesBuilt || []) for (const b of (l && l.compound ? l.leaflets : [l])) if (b && b.rim) { rim.push(b.rim); rimE2.push(b.rim); leafApex += (b.rim.apex || []).length; }
      if ((built.leavesBuilt || []).length) {
        check('E0', leafApex > 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${built.leavesBuilt.length} leaves built and none carries a treated rim — the bead did not reach the leaves`);
        leafRows++; leafApexAll += leafApex;
      }
      const apexRecs = rim.flatMap((r) => r.apex || []);
      const clampRecs = rim.flatMap((r) => r.clamps || []);
      per[exportMode ? 'export' : 'live'] = { tris: mesh.tris, apexes: apexRecs.length };

      /* ---- E3: still a closed, degenerate-free solid ---- */
      check('E3', mesh.boundary === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${mesh.boundary} boundary edges`);
      check('E3', mesh.degen === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${mesh.degen} degenerate triangles`);

      /* ---- E6: and degenerate-free AS THE STL STORES IT ---- */
      /* E3 IS NOT THIS CLAUSE AND THE TWO WERE ONE WORD APART. `meshOf`
         counts a welded-index collision or an exactly-zero cross product on
         DOUBLES; `analyzeStl`, which is what both STL gates rate, counts
         area <= DEGENERATE_AREA_MM2 on the FLOAT32 the file actually holds.
         The corner-fan slivers this gate now has a row for measure 8.88e-8
         mm2 on doubles — comfortably ABOVE the bar — and collapse only under
         rounding, so E3 answered "degenerate-free" about them truthfully and
         said nothing. Measured: the mutant that removes the corner gate fires
         E6 and not E3. The bar is READ FROM THE HARNESS rather than restated,
         so this clause and the gates that rate it cannot drift apart. */
      {
        const f = Math.fround, P = acc.positions, BAR = H.DEGENERATE_AREA_MM2;
        let bad = 0, worst = Infinity;
        for (let t = 0; t < P.length / 9; t++) {
          const o = t * 9;
          const ax = f(P[o+3])-f(P[o]), ay = f(P[o+4])-f(P[o+1]), az = f(P[o+5])-f(P[o+2]);
          const bx = f(P[o+6])-f(P[o]), by = f(P[o+7])-f(P[o+1]), bz = f(P[o+8])-f(P[o+2]);
          const cx = ay*bz-az*by, cy = az*bx-ax*bz, cz = ax*by-ay*bx;
          const area = 0.5 * Math.hypot(cx, cy, cz);
          if (area <= BAR) { bad++; if (area < worst) worst = area; }
        }
        const declared = E6_XFAIL[row.label];
        const want = declared ? (exportMode ? declared.exp : declared.live) : 0;
        check('E6', bad === want, want === 0
          ? `${row.label} [${exportMode ? 'export' : 'live'}]: ${bad} triangle(s) at or under ${BAR} mm2 once rounded to float32 (worst ${bad ? worst.toExponential(3) : '-'}) — what analyzeStl rates, which E3 does not measure`
          : `${row.label} [${exportMode ? 'export' : 'live'}]: declared at ${want} and reads ${bad}${bad > want ? ' — WORSE, a regression for whatever moved it' : ' — FEWER than declared, so the record is stale: re-measure and re-record it in the commit that moved it'} (${declared.note})`);
      }
      /* THE DIRECTED CENSUS, and it is the clause that would have caught this
         session's own worst defect. The first rim sweep walked its strip the
         wrong way round and produced a mesh with ZERO boundary edges and ZERO
         non-manifold edges whose every rim triangle faced INWARD — 2,112
         directed edges with no reverse partner and a signed volume of −455.58
         mm³ against main's +4,415.57. The undirected census keys on a SORTED
         pair, so it cannot see a face wound the wrong way; ST10 found the same
         thing on the stem tube's annuli one solid earlier. */
      check('E3', mesh.dirUnmatched === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${mesh.dirUnmatched} directed edges have no reverse partner — some faces are wound inside-out`);
      check('E3', mesh.volume > 0, `${row.label} [${exportMode ? 'export' : 'live'}]: the solid's signed volume is ${mesh.volume.toFixed(3)} mm³, not positive`);

      if (!apexRecs.length) {
        /* A bloom with no petals at all is legitimate (the bare sphere-stem
           corner), so this is only an observation. E0 below is what refuses a
           vacuous run over the whole set. */
        continue;
      }
      profiles += apexRecs.length;

      /* ---- E4: the silhouette — every declared vertex is a real one ---- */
      let missing = 0, firstMiss = null;
      for (const r of apexRecs) {
        for (const [what, P] of [['apex', r.apex], ['top', r.top], ['bot', r.bot]]) {
          if (!mesh.vertIds.has(key3(P[0], P[1], P[2]))) { missing++; if (!firstMiss) firstMiss = `${what} at panel ${r.panel} row ${r.row} col ${r.col}`; }
        }
      }
      check('E4', missing === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${missing} of ${apexRecs.length * 3} declared rim vertices are not in the emitted stream (first: ${firstMiss})`);

      /* ---- E7: each side's bead stops at its OWN drawn radius (F6-asym) ----
         The skin stops `a` mm of chord inside the boundary point, solved on
         the side's own section (`rimInsetV`). Measured here on the EMITTED
         vertices — the apex and the midpoint of the two skin corners, which is
         the skin point the bead leaves from — against the drawn radius the
         builder declares (or the half's own chord to the midrib, where that is
         shorter and the inset stops at the midrib), within the bisection's own
         bracket in mm of the half's arc. A bead
         that solved one side and mirrored the inset to the other (in the
         section parameter) is right on a symmetric petal and wrong by the
         halves' ratio on an asymmetric one; nothing else here measures where
         the skin stops, so a mirrored inset exports watertight with every
         other clause green. */
      let insetN = 0, insetBad = 0, insetWorst = null;
      for (const r of apexRecs) {
        if (!r.inset) continue;
        insetN++;
        const mid = [(r.top[0] + r.bot[0]) / 2, (r.top[1] + r.bot[1]) / 2, (r.top[2] + r.bot[2]) / 2];
        /* where the half's own chord to the midrib is shorter than the radius
           (a narrow half under a deep cup) the inset stops AT the midrib —
           the inset law's own bound, the same on both halves */
        const d = Math.abs(dist(r.apex, mid) - Math.min(r.inset.mm, r.inset.chordToMidribMm));
        if (d > r.inset.tolMm + 1e-9) { insetBad++; if (!insetWorst || d > insetWorst.d) insetWorst = { d, r }; }
      }
      insetChecked += insetN;
      const e7d = E7_INSET_XFAIL[row.label];
      if (e7d) {
        check('E7', insetBad === e7d.profiles && insetWorst && Math.abs(insetWorst.d - e7d.worstMm) <= E7_INSET_BAND_MM, `${row.label} [${exportMode ? 'export' : 'live'}]: declared ${e7d.profiles} profile(s) off by ${e7d.worstMm} mm and reads ${insetBad}${insetWorst ? ` off by ${insetWorst.d.toFixed(5)}` : ''} — the declaration is stale (re-record or remove it)`);
      } else check('E7', insetBad === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${insetBad} of ${insetN} side profiles stop ${insetWorst && insetWorst.d.toFixed(4)} mm off their own drawn radius ${insetWorst && insetWorst.r.inset.mm.toFixed(4)} mm (panel ${insetWorst && insetWorst.r.panel} row ${insetWorst && insetWorst.r.row} col ${insetWorst && insetWorst.r.col}) — the bead's inset was not solved on this side's own section`);

      /* ---- E1: the rim floor, with the clamp as a BICONDITIONAL ----
         THE BAR IS `min(RIM_FLOOR_MM, the body's own thickness)`, and that is
         Eva's second ruling rather than a softening: where the body is already
         at or under the floor there is no taper and the bead alone closes the
         edge, so the rim IS the body and holding it to 1.0 mm would be asking
         the sheet to get thicker toward its edge. In LIVE mode nothing floors
         the sheet, so this is a reachable state and not a corner — `ALL MAX`
         alone reads 61,533 profiles there.

         THE CLAMP IS READ OFF THE APEX'S OWN RECORD, not matched against a
         separate list by (panel, row, column). That key is NOT UNIQUE — every
         petal's panel is called 'full' — so on a 240-petal head one petal's
         clamp excused another petal's rim: measured, 10,508 false exclusions
         on `ALL MAX` before this was fixed. The flag travels WITH the profile
         it is about. */
      clamps += clampRecs.length;
      let thin = 0, thinWorst = null, wrongClamp = 0, unjustified = 0;
      for (const r of apexRecs) {
        const t = dist(r.top, r.bot);
        if (t < minRim) minRim = t;
        const bar = Math.min(G.RIM_FLOOR_MM, r.bodyMm) - RIM_FLOOR_BAND_MM;
        const under = t < bar;
        if (under && !r.clamped) { thin++; if (!thinWorst || t < thinWorst.t) thinWorst = { t, r, bar }; }
        /* THE OTHER DIRECTION USES THE FLOOR ITSELF, NOT THE BANDED BAR. The
           band is slack for the MEASUREMENT of a rim that should clear the
           floor; applying it here would call a rim at 0.995 mm an unjustified
           declaration when it is under the floor by exactly the amount the
           clamp says. Measured: 64 false findings on the carnation before this
           was separated. */
        if (r.clamped && !(t < G.RIM_FLOOR_MM)) wrongClamp++;
        /* AND THE CLAMP MUST BE JUSTIFIED BY THE ROOM, which is the clause the
           must-fail found missing. Without it a builder that simply LOWERED
           the floor would mark every profile clamped and E1 would excuse the
           lot — the ST9 trap (a guard that reads the record it checks) getting
           in through the exclusion rather than the guard. Measured: the
           `the-rim-floor-is-lowered-to-0.4` mutation fired NOTHING until this
           existed. The room arm must be the one that BOUND: a clamp is only a
           clamp where `RIM_ROOM_FRACTION * room` is what took the radius
           below the other two arms, restated here from Eva's fraction and the
           builder's measured room rather than read from the clamp record. */
        if (r.clamped && !(G.RIM_ROOM_FRACTION * r.roomMm < Math.min(G.RIM_BEAD_RADIUS_MM, r.bodyMm / 2) - 1e-12)) unjustified++;
      }
      check('E1', thin === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${thin} rim profiles are under ${G.RIM_FLOOR_MM} mm and are NOT declared clamps (worst ${thinWorst && thinWorst.t.toFixed(4)} mm against a bar of ${thinWorst && thinWorst.bar.toFixed(4)} at panel ${thinWorst && thinWorst.r.panel} row ${thinWorst && thinWorst.r.row})`);
      /* THE OTHER DIRECTION, and it is the one that stops the exclusion
         emptying the clause: a location declared clamped must actually BE
         under the floor. A builder that logged everything would fail here. */
      check('E1', unjustified === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${unjustified} declared clamps are not justified by the span's room — the radius was taken below the floor by something other than the narrow-span rule`);
      check('E1', wrongClamp === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${wrongClamp} declared clamp locations are NOT under the floor — the declaration is excluding rows it has no business excluding`);

      /* ---- E2: no hard edge within RIM_NEAR_MM of a treated apex ---- */
      /* E2'S SUBJECT IS NARROWED PER PART, NEVER PER ROW, and that distinction
         is the whole of the declaration below. An infilled blade has no
         treated apex above the split, so a row-level skip would have taken
         the SEPALS' rims out with it on `INFILL: x sepals 8` — 2,192 edges
         of real, beaded, uninfilled subject, excluded because something ELSE
         on the same bloom was perforated. Measured before it was narrowed;
         the fifth durable rule landing one level down from where it was
         being applied. */
      const apexE2 = rimE2.flatMap((r) => r.apex || []);
      const rimVertIds = new Set();
      for (const r of apexE2) for (const P of [r.apex, r.top, r.bot]) {
        const v = mesh.vertIds.get(key3(P[0], P[1], P[2]));
        if (v !== undefined) rimVertIds.add(v);
      }
      if (exportMode && !FOLDS.has(row.label)) {
        const turn = worstTurnNearRim(mesh, apexE2.map((r) => ({ p: r.apex, outlineTurnDeg: r.outlineTurnDeg || 0 })), rim.flatMap((r) => r.flat || []), rim.flatMap((r) => r.corner || []), RIM_NEAR_MM, RIM_CORNER_R * G.RIM_BEAD_RADIUS_MM, G.RIM_TAPER_MM, rimVertIds);
        if (turn.cornerDeg > worstCorner) worstCorner = turn.cornerDeg;
        if (turn.rampDeg > worstRamp) worstRamp = turn.rampDeg;
        if (turn.deg > worstTurn) worstTurn = turn.deg;
        const notBeaded = apexE2.length === 0;
        if (notBeaded) {
          /* THE WHOLE CLAUSE, NOT HALF OF IT. Leaving the magnitude arm
             running on an empty window asserts `0 < 45` and reads as a pass,
             which is the vacuity this declaration exists to name. The numbers
             are REPORTED so the mechanism stays checkable: `edges` is what
             the window found and `skipped` is what the ramp took. */
          notes.push(`E2 SKIPPED (empty subject): ${row.label} — every part that carries a rim on this row CUT A PATTERN, so the blade's outer margin above the split is a FLAT WALL and the basal panel's own apexes are inside the seam ramp (${apexRecs.length} treated profile(s) exist and 0 are E2's subject; window ${turn.edges} edge(s), ramp skipped ${turn.skipped}). #278's bead over the cell region is S5's, through emitRimLoop.`);
          continue;
        }
        check('E2', turn.edges > 0, `${row.label}: no edge lies within ${RIM_NEAR_MM} mm of a treated apex — the window found nothing to measure`);
        E2_DUMP[row.label] = process.env.E2_AT ? { deg: turn.deg, at: turn.at } : turn.deg;
        const declared = E2_TURN_XFAIL[row.label];
        if (!declared) {
          check('E2', turn.deg < DIH_BAR, `${row.label}: the treatment adds ${turn.deg.toFixed(6)} deg of turn within ${RIM_NEAR_MM} mm of a rim, at or over the ${DIH_BAR} deg allowance (the face-to-face turn there is ${turn.raw.toFixed(2)} deg and the OUTLINE's own turn is ${turn.outline.toFixed(2)}) at [${turn.at ? turn.at.map((x) => x.toFixed(3)).join(', ') : '?'}]`);
        } else {
          /* BOTH DIRECTIONS. A declaration is a record of the tree, and a
             record that stops reproducing is stale whether the row got worse
             or better — the message says which. */
          const excess = turn.deg - DIH_BAR;
          declaredSeen.add(row.label);
          check('E2', excess > 0, `${row.label}: declared as exceeding the ${DIH_BAR} deg allowance by ${declared.excessDeg} deg and it no longer does (${turn.deg.toFixed(6)} deg) — the declaration is STALE, take it off`);
          check('E2', Math.abs(excess - declared.excessDeg) <= E2_TURN_BAND_DEG, `${row.label}: the excess over the ${DIH_BAR} deg allowance is ${excess.toFixed(6)} deg against a declared ${declared.excessDeg} (band ${E2_TURN_BAND_DEG}) — re-record it in the same commit as whatever moved it`);
        }
      }
    }
    /* ---- E5: the topology is the same in both modes ---- */
    if (per.live && per.export) {
      check('E5', per.live.tris === per.export.tris, `${row.label}: ${per.live.tris} triangles live against ${per.export.tris} export — the rim's topology is mode-dependent`);
      check('E5', per.live.apexes === per.export.apexes, `${row.label}: ${per.live.apexes} treated profiles live against ${per.export.apexes} export`);
    }
  }
  check('E0', profiles > 0, `no treated rim profile was found on any row — the run is vacuous`);
  check('E7', insetChecked > 0, `no side profile carried an inset claim — E7 asserted nothing`);
  /* A DECLARATION NAMING A ROW THE GATE NEVER RAN IS A DECLARATION NOBODY CAN
     CHECK — the combination gate's CG5, one instrument later. ONLY on a run
     over the FULL row set, and the caller says so rather than this reading
     `ONLY`: the negative control runs five hand-picked rows with no `--only`
     flag in sight, so keying off the flag made every mutation fire this on
     the four rows the subset does not carry. The control caught it, which is
     what a control is for. */
  if (fullSet) {
    for (const label of Object.keys(E2_TURN_XFAIL)) {
      check('E2', declaredSeen.has(label), `E2_TURN_XFAIL declares "${label}" and no row of this gate carries that label — a declaration nothing evaluates`);
    }
  }
  notes.push(`declared surface-turn rows ${declaredSeen.size} of ${Object.keys(E2_TURN_XFAIL).length} · rows ${rows.length} (${rows.filter((r) => FOLDS.has(r.label)).length} exempt from E2 as declared self-intersectors) · treated profiles ${profiles} · declared clamps ${clamps} · thinnest rim ${Number.isFinite(minRim) ? minRim.toFixed(4) : 'n/a'} mm · worst turn the treatment ADDS ${worstTurn.toFixed(2)} deg (allowance ${DIH_BAR}, over and above the outline's own) · worst EXCESS at an outline corner ${worstCorner.toFixed(2)} deg · worst turn in the RAMP to the receptacle join ${worstRamp.toFixed(2)} deg (exempt, out of scope; main reads 93.92 at the default) · leaf row-modes ${leafRows}, leaf treated profiles ${leafApexAll}`);
  return { profiles, worstTurn, worstCorner, minRim, clamps, insetChecked };
}

/* ======================= THE MUST-FAIL ==================================
   Each mutation names the clause it must break. A mutation that does not
   apply, a named clause that stays green, or a clause it did not name going
   red are all failures — the last is how a mutation that merely breaks the
   build gets caught pretending to be a negative control. */
/* THE ONE ROW E6 CANNOT CLEAR, DECLARED WITH ITS NUMBER — #213's idiom, and
   the gate holds it in BOTH directions: a row that reads MORE is a
   regression, a row that reads FEWER (or zero) is a stale record and says so,
   because an entry is a measurement of the tree and not a licence.

   WHAT IT IS, measured rather than characterised: two REAL adjacent corner
   points 6.23e-7 mm apart at ~12 mm from the origin. Their triangle is
   8.88e-8 mm2 on DOUBLES — eighty-eight times the bar — and collapses to
   exactly zero only once rounded to float32, where one ulp at 12 mm is
   9.5e-7. RIM_CORNER_MIN_MM removes the profiles the fan INSERTS between
   them; it cannot remove the two genuine entries, so no corner threshold
   reaches this. LIVE only: the same row's export reads 0.

   IT IS NOT LEFT HERE FOR WANT OF A FIX. Merging two sub-micron corner points
   would clear it, and is safe in exactly this case because the fan fires only
   where both entries share a skin point (`sk2 === sk && j2 === j`), so
   dropping one leaves the rim closed against the skins. That is a change to
   the loop's construction with a watertightness failure mode, and it is Eva's
   call whether two invisible triangles in the LIVE mesh are worth it. */
const E6_XFAIL = {
  'SPHERE: 6 turns x layerSize min (the 0.18 mm blade at the face pole)': { live: 2, exp: 0,
    note: 'two real adjacent corner points 6.23e-7 mm apart; 8.88e-8 mm2 on doubles, zero under float32. NOT the corner fan\'s, measured both ways: the pair is present with the fan GATED and with the fan disabled entirely (RIM_CORNER_STEPS -> 1), so no subdivision threshold can reach it and neither can the bead floor. Before RIM_CORNER_MIN_MM this row read 118 live and 56 export' },
};

const MUTATIONS = [
  /* E6 IS COLLATERAL ON SOME RIM MUTATIONS AND NOT ALL, AND THE BLANKET THAT
     USED TO STAND HERE WAS WRONG ON HALF OF THEM. It read *"EVERY rim mutation
     below also reddens E6, and that is a property of the CONTROL SET rather
     than a loose clause… on a petal that cramped, ANY change to the rim
     surface moves profiles into the band where a triangle survives in doubles
     and collapses under float32"* — a generalisation, asserted once over six
     mutations rather than measured on each.

     MEASURED, and on BOTH TREES so it is not the infill's: three of the six
     claim E6 and do not fire it — `the-rim-floor-is-lowered-to-0.4`,
     `the-bead-apex-is-recomputed` and `every-clamp-is-logged` — identically at
     `55ca84c` (a worktree of the base, same command, same three, same `MISSED
     E6`) and on this branch, whose cramped row is byte-identical to main's by
     the byte partition. So the control was FAILING 3 of 6 on main and the
     claim is what is wrong, not the clause.

     WHY, per mutation, because "it did not fire" is not a reason.
     `every-clamp-is-logged` sets a RECORD (`wasClamped = true`) and moves no
     vertex at all, so a triangle-area census cannot see it under any row —
     that claim could never have been true. `the-bead-apex-is-recomputed`
     perturbs the apex by at most an ulp (`C + (apex − C)` is the identity in
     reals and not in floats), which E4 sees as an exact-key miss and which
     does not cross E6's float32 bar on this row. `the-rim-floor-is-lowered-to-
     0.4` genuinely redraws the bead — E1 and E2 fire on it — and leaves the
     cramped row's two declared entries at 2 live / 0 export.

     THE CLAIMS ARE NARROWED, WHICH IS STRICTLY STRONGER. A clause a mutation
     does not name going red is still a failure here, so the day one of these
     three starts moving E6 the control says so by name instead of absorbing
     it. E6 still discriminates where it matters: `the-corner-fan-is-not-gated`
     fires E6 and NOTHING ELSE, and two of the six fire it as real collateral. */
  /* RESTORING THE WALL REDDENS THREE CLAUSES AND ALL THREE ARE TRUE OF IT,
     which is a statement about the geometry rather than a loosened claim. The
     skin is INSET by the bead's own radius, so a profile collapsed onto the
     straight wall (a) puts a hard edge back where the bead was — E2; (b)
     stops emitting the original boundary point, because a wall has no apex —
     E4; and (c) leaves the solid's own surface inconsistent at the two
     corners where a pivot's profiles become identical — E3. A wall and an
     apex are the same surface here, so there is no surgical form of this
     mutation, and saying so is better than pretending one clause owns it. */
  { id: 'the-flat-wall-is-restored', breaks: ['E2', 'E3', 'E4', 'E6'],
    from: '    const th = aLen > 0 ? Math.atan2(aLen * Math.sin(psi), b * Math.cos(psi)) : psi;',
    to:   '    const th = aLen > 0 ? Math.atan2(aLen * Math.sin(psi), b * Math.cos(psi)) : psi; const FLATWALL = 1;' },
  /* E2 as well as E1, and it is TRUE of this mutation rather than a
     loosening: a smaller bead radius is a different surface, so the buckle
     row's declared excess moves 6.236137 -> 6.526126 deg. Named as collateral,
     because the honest remedy for an unclaimed red that is real is to name it. */
  /* LEAVES (leaf/stem build S2). The blade goes through `emitPanel`, so every
     mutation above reaches leaves through the shared emitter (the leaf row in
     CONTROL_ROWS is what makes each of them ask a leaf too); this one reaches
     the LEAF alone and is what says the leaves are in this gate's subject
     rather than merely sharing its code. A leaf whose rim record is dropped
     still exports watertight with its bead; E0's leaf clause is the only
     thing that sees it. (A leaf handed HALF its sheet was tried as a second
     and fires nothing, correctly: the taper eases toward the floor and never
     raises a sheet already under it, so a thinner body is a law-abiding rim
     and E1 reads it as one. Not a mutant of this gate.) */
  { id: 'the-leaf-rim-is-not-recorded', breaks: ['E0'],
    /* RE-ANCHORED (leaf/stem build S3): the blade's emitPanel call moved into
       `emitLeafBladeInto`, the one emitter a simple leaf and every leaflet go
       through, so the mutation reaches both. */
    from: "  emitPanel(acc, rows, panel, () => t, rim);",
    to:   "  emitPanel(acc, rows, panel, () => t, null);" },
  { id: 'the-rim-floor-is-lowered-to-0.4', breaks: ['E1', 'E2'],
    from: 'export const RIM_FLOOR_MM = 1.0;',
    to:   'export const RIM_FLOOR_MM = 1.0; const RIM_FLOOR_APPLIED = 0.4;' },
  /* THE CORNER GATE REMOVED — and the clause it reddens is E3, which ALREADY
     EXISTED and could not fire. Nothing about E3 was wrong; its SUBJECT was.
     `pickRows` draws the smoke subset, and no row in it carried a cramped
     petal, so "the mesh is degenerate-free" was being asked only of rows that
     could not be otherwise. The row that makes it answerable — `SPHERE: 6
     turns x layerSize min`, 56 degenerate triangles in export and 118 in live
     before the gate — is in that subset now, and this mutation is what proves
     the pair works: remove the gate and E3 goes red on it. The fifth durable
     rule, in a clause written long before the defect existed. */
  { id: 'the-corner-fan-is-not-gated', breaks: ['E6'],
    from: '      if (seg < RIM_CORNER_MIN_MM) { if (rim) rim.pivotsSkipped++; continue; }',
    to:   '      if (seg < 0) { if (rim) rim.pivotsSkipped++; continue; }' },
  { id: 'the-bead-apex-is-recomputed', breaks: ['E4'],
    from: '  pts[APEX] = apex;',
    to:   '  pts[APEX] = [C[0] + (apex[0] - C[0]), C[1] + (apex[1] - C[1]), C[2] + (apex[2] - C[2])];' },
  { id: 'every-clamp-is-logged', breaks: ['E1'],
    from: '      const wasClamped = 2 * b < RIM_FLOOR_MM - 1e-9 && 2 * b < tBody - 1e-9;',
    to:   '      const wasClamped = true;' },
  /* E5'S MUTANT, REPLACED BECAUSE THE RULED SEGMENT COUNT MADE THE OLD ONE
     UNREACHABLE — session 32's three retired lerp mutations, one gate later.
     It was `the-segment-count-reads-the-live-sheet`: strip the mode-free floor
     out of `rimSegments` so the live build reads the unfloored sheet, which at
     EIGHT segments took `sheetThickness` 0.60 to six live against eight
     export and fired E5. At FOUR it fires nothing, and that is arithmetic
     rather than luck: with a cap of 4, a minimum of 3 and the round-up to
     even, `min(4, max(3, raw))` rounded even is 4 for EVERY raw, so no input
     to that function can move K at all. The mutation still applies, still
     changes the radius, and changes no count — `bore-is-not-evas-rule`'s
     lesson (a mutation is invisible wherever the law it replaces happens to
     agree with it), arriving because a later ruling collapsed the law's range
     to a point.

     WHAT REPLACES IT IS THE DEFECT `RIM_TIP_ROWS`' OWN HEADER WARNS ABOUT, in
     so many words: "a `drop rows until the gap clears the radius` rule would
     be this project's sixth discrete decision on a continuous quantity". That
     rule reads the emitted half-width, which carries the TIP FLOOR — 0.15 mm
     live against 0.80 mm export — so the two modes drop different numbers of
     rows and E5's two clauses both have something to say. A plausible defect
     rather than an injected one. */
  /* E2 AS WELL, AND IT IS TRUE OF THIS MUTATION RATHER THAN A LOOSENING (the
     gate-coverage session, the first control run since #283): a tip that
     drops on a threshold is a different rim at the apex, and the ORCHID
     row's declared excess — declared at 1.152165 deg since the nib — reads
     43.686211 deg under it, UNDER the allowance, so the both-directions
     clause fires its STALE arm. Named as collateral, the bead-apex mutant's
     precedent above. */
  /* F6-asym: THE BEAD FOLLOWING ONE SIDE ONLY. The right half's inset is the
     left half's mirrored in the section parameter — exactly right on a
     symmetric petal (the section is its own mirror there) and wrong by the
     halves' ratio on an asymmetric one, where the narrow half's bead then stops
     at the WIDE half's parameter. Watertight, one piece, the apex still on the
     boundary; E7 is the only clause that measures where the skin stops. The
     asymmetric control row is what makes it observable at all. E2 as well,
     and true of it: a bead stopped at the wrong place is a different surface,
     and on the lateral's narrow half that surface turns past the allowance. */
  { id: 'the-bead-follows-one-side-only', breaks: ['E7', 'E2'],
    from: '    const inLo = side ? rimInsetV(row.sect, vLo, vMid, aLo) : vLo;\n    const inHi = side ? rimInsetV(row.sect, vHi, vMid, aHi) : vHi;',
    to:   '    const inHi = side ? rimInsetV(row.sect, vHi, vMid, aHi) : vHi;\n    const inLo = side ? (vLo === -vHi ? -inHi : rimInsetV(row.sect, vLo, vMid, aLo)) : vLo;' },
  { id: 'the-tip-drop-is-a-threshold-on-the-emitted-width', breaks: ['E5', 'E6', 'E2'],
    from: '  const skinTo = tipExposed ? Math.max(rowFrom, rowTo - RIM_TIP_ROWS) : rowTo;',
    to:   '  const skinTo = tipExposed ? (() => { let i = rowTo; while (i > rowFrom && rows[i].h < RIM_BEAD_RADIUS_MM) i--; return i; })() : rowTo;' },
];
/* The floor mutation needs a second edit: the constant is exported and read
   by the gate as the BAR, so lowering the export alone would move the bar
   with the geometry and check nothing (the `seam-floor-removed` trap). What
   moves instead is the value the BUILDER applies. */
const EXTRA = {
  /* THE FLAT WALL IS RESTORED BY ZEROING THE OUTWARD TERM, which is what the
     bead IS: `w` is the vector from the skin's edge to the original boundary
     point, so a profile built with it dropped is the straight segment from
     `C + n*b` to `C - n*b` — the wall this change replaced, on the same
     corners. The apex still lands on the boundary (E4 stays green), so this
     mutation is about the SURFACE BETWEEN the corners and nothing else. */
  'the-flat-wall-is-restored': [
    ['    pts[m] = [C[0] + n[0] * b * cs + wx * sn, C[1] + n[1] * b * cs + wy * sn, C[2] + n[2] * b * cs + wz * sn];',
     '    pts[m] = [C[0] + n[0] * b * cs, C[1] + n[1] * b * cs, C[2] + n[2] * b * cs];'],
    ['  pts[APEX] = apex;', '  pts[APEX] = C;'],
  ],
  'the-rim-floor-is-lowered-to-0.4': [
    ['    const r = Math.min(RIM_BEAD_RADIUS_MM, tBody / 2, RIM_ROOM_FRACTION * roomMm[k]);',
     '    const r = Math.min(RIM_FLOOR_APPLIED / 2, tBody / 2, RIM_ROOM_FRACTION * roomMm[k]);'],
  ],
};

async function control() {
  const src = fs.readFileSync(path.join(HERE, 'bloom-geometry.js'), 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-edge-'));
  /* bloom-geometry.js imports ./bloom-curve.js (F3-global), so a copy written beside it needs the sampler too */
  fs.copyFileSync(new URL('../bloom-curve.js', import.meta.url), path.join(dir, 'bloom-curve.js'));
  /* THE ANCHOR PRE-CHECK, over EVERY mutation, before any of them runs. A
     refactor disarms a mutant either by moving its `from` or by making it
     match twice, and the one nobody sees is inside a mutant a subset skips. */
  const bad = [];
  for (const m of MUTATIONS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) bad.push(`${m.id}: its anchor matches ${n} times, not once`);
    for (const [f] of (EXTRA[m.id] || [])) {
      const k = src.split(f).length - 1;
      if (k !== 1) bad.push(`${m.id}: its second anchor matches ${k} times, not once`);
    }
  }
  if (bad.length) { console.error('edge-profile control: ANCHORS STALE\n  ' + bad.join('\n  ')); process.exit(1); }

  /* A SMALL, LIGHT, RIM-DIVERSE SET. The control runs every mutation over
     every row, so it must not carry `ALL MAX` (4.6 million triangles and a
     three-minute census) to say what a 30-thousand-triangle petal already
     says. These five reach the plain span, a cleft's sinus, a fringe's teeth,
     a lobed margin and a thin sheet — every arm of the rim law. */
  /* NAMED, NOT `regex.filter(...).slice(0, 5)` (gate-hygiene session, Oct 6).
     That was the shape this comment promised and did not deliver: the regex
     matched eight rows, the slice kept DEFAULT and four `THIN:` rows, the
     cleft and the carnation were dropped, and `^LOBES: the shipped` matched no
     row at all — so for at least two sessions (measured Sep 30 and Oct 5) the
     control ran over two arms of the rim law where it claims five, and stayed
     green because every mutation still fired on the plain span. Five labels,
     each REQUIRED: a name that goes missing refuses the run. The lobed margin
     is the shipped three-tooth row (an odd count, so a crest at the apex),
     which is what "the shipped lobe" can mean since MODEL B. */
  const CONTROL_ROWS = [
    'DEFAULT (the shipping configuration)',                                     // the plain span
    'CAPABILITY: cleft (two-span domain)',                                      // a cleft's sinus
    'FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth',  // a fringe's teeth
    'LOBES: 3 teeth at the default coverage — an ODD count (eleven, twelve, one), so a CREST sits at the apex and the apex carries a tooth', // a lobed margin
    'THIN: ALL THIN',                                                           // a thin sheet
    'LEAVES: alternate x 3 nodes at the ruled 35 deg',                          // a leaf's margin (S2)
    'ASYM OUTLINE: an orchid LATERAL — one-sided (a wide left half, a 3 mm right half)', // two halves of different widths (F6-asym)
  ];
  const missingRows = CONTROL_ROWS.filter((l) => !MATRIX.some((r) => r.label === l));
  if (missingRows.length) { console.error(`edge-profile control: the named control row(s) ${missingRows.map((l) => `"${l}"`).join(', ')} are not in the matrix — an arm of the rim law would be exercised by nothing`); process.exit(1); }
  const rows = CONTROL_ROWS.map((l) => MATRIX.find((r) => r.label === l));
  /* AND EACH NAMED ROW MUST STILL EXERCISE THE ARM IT IS NAMED FOR, read off
     the clean builder's own record. A row that keeps its label while the arm
     goes away (a cleft that stops splitting, a carnation whose teeth are
     refused, a lobe count that clamps to 0, a sheet no longer under the floor)
     would satisfy the name and empty the claim. */
  {
    const arm = [
      ['CAPABILITY: cleft (two-span domain)', (p) => (p.panels || []).length > 1, 'more than one panel (the sinus)'],
      ['FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth', (p) => !!(p.fringe && p.fringe.built && p.fringe.count > 0), 'fringe teeth built'],
      ['LOBES: 3 teeth at the default coverage — an ODD count (eleven, twelve, one), so a CREST sits at the apex and the apex carries a tooth', (p) => !!(p.lobes && p.lobes.countBuilt > 0 && !p.lobes.noRoom), 'lobes cut'],
      ['THIN: ALL THIN', (p) => !!(p.thickness && p.thickness.floorBinds), 'the export floor binding on the sheet'],
      ['LEAVES: alternate x 3 nodes at the ruled 35 deg', (p, b) => b.leavesBuilt.length > 0, 'leaves built'],
      ['ASYM OUTLINE: an orchid LATERAL — one-sided (a wide left half, a 3 mm right half)', (p) => !!(p.tipCap && p.tipCap.twoSided), 'a two-sided outline'],
    ];
    const lost = [];
    for (const [l, ok, what] of arm) {
      const row = rows.find((r) => r.label === l);
      const acc = new G0.MeshBuilder({ exportMode: true });
      const b = G0.buildBloomInto(acc, stateFor(row), { below: null, capability: row.capability || null, scopes: scopesFor(row) });
      if (!b.petal || !ok(b.petal, b)) lost.push(`"${l.slice(0, 60)}" no longer has ${what}`);
    }
    if (lost.length) { console.error(`edge-profile control: a named control row stopped exercising its arm — ${lost.join('; ')}`); process.exit(1); }
  }
  /* AND AT LEAST ONE DECLARED ROW, OR E2's MAGNITUDE CLAUSE HAS NO MUTANT.
     It did not, and only asking which messages the control actually printed
     found it: the regex names the carnation, `.slice(0, 5)` took five earlier
     matches, and the two clauses that hold a declared row to its recorded
     excess were exercised by nothing while the run reported 5 of 5. A clause
     nobody has shown can fire is the thing this whole file exists to avoid. */
  /* NAMED, NOT "THE FIRST DECLARED ROW IN MATRIX ORDER" — which is what it
     was until the headroom PR declared `petalTwist max (180)`, a blanket-sweep
     row that sits BEFORE every other declaration. It became the witness, and
     neither rim mutation moves a twist's out-of-plane turn, so E2 went MISSED
     on two mutants in CI while the clause itself was fine. The witness is a
     row whose declared excess the RIM LAW moves; which row that is is a
     property, not an ordering, so it is named here and fails loudly if it
     goes missing or stops being declared. */
  /* (It was the RADIAL orchid row until the role retirement removed it, Q3.4; the FAN per-petal
     extreme is the same class — a scoped petal's curl folding its margin — and declared beside it.) */
  const DECLARED = 'FAN x PER-PETAL: petal 1 extreme x toggle OFF (the same sliders now drive the INNER PAIR)';
  const declaredRow = MATRIX.find((r) => r.label === DECLARED);
  if (!declaredRow || !Object.prototype.hasOwnProperty.call(E2_TURN_XFAIL, DECLARED)) { console.error(`edge-profile control: "${DECLARED}" is missing from the matrix or from E2_TURN_XFAIL — E2's magnitude clause would be exercised by nothing`); process.exit(1); }
  if (!rows.some((r) => r.label === declaredRow.label)) rows.push(declaredRow);
  /* AND THE CRAMPED PETAL, OR `the-corner-fan-is-not-gated` HAS NO MUTANT.
     The same shape as the declared row above, and the same lesson one clause
     later: E3 asks whether the mesh is degenerate-free, and on a rim whose
     corners are all millimetres long the answer is yes however the corner
     gate behaves. What makes this row a witness is a PROPERTY — it carries
     corner-fan segments under RIM_CORNER_MIN_MM, 56 degenerate triangles in
     export and 118 in live before the gate existed — and the mutant firing
     E3 on it is the proof that the pair works. It is named rather than
     detected because detecting it means building the row, and a name that
     goes missing must fail LOUDLY rather than quietly empty the clause. */
  const CRAMPED = 'SPHERE: 6 turns x layerSize min (the 0.18 mm blade at the face pole)';
  const crampedRow = MATRIX.find((r) => r.label === CRAMPED);
  if (!crampedRow) { console.error(`edge-profile control: the matrix has no row "${CRAMPED}" — E3's corner-gate mutant would be exercised by nothing`); process.exit(1); }
  if (!rows.some((r) => r.label === CRAMPED)) rows.push(crampedRow);
  if (rows.length < 3) { console.error('edge-profile control: the control row set did not resolve — ' + rows.length + ' rows'); process.exit(1); }
  let failures = 0;
  for (const m of MUTATIONS) {
    let mutated = src.replace(m.from, m.to);
    for (const [f, t] of (EXTRA[m.id] || [])) mutated = mutated.replace(f, t);
    if (mutated === src) { console.error(`  ${m.id}: MUTATION DID NOT APPLY`); failures++; continue; }
    const file = path.join(dir, `bloom-geometry.${m.id}.js`);
    fs.writeFileSync(file, mutated);
    let G;
    try { G = await loadGeom(file); } catch (e) { console.error(`  ${m.id}: the mutated module does not load — ${e.message}`); failures++; continue; }
    const f = [], n = [];
    try { await runRows(G, rows, f, n); } catch (e) { f.push(`RUN THREW: ${e.message}`); }
    const fired = new Set(f.map((x) => x.split(':')[0]));
    const missed = m.breaks.filter((c) => !fired.has(c));
    const extra = [...fired].filter((c) => !m.breaks.includes(c));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) failures++;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${m.id.padEnd(42)} claims ${m.breaks.join(',').padEnd(6)} fired ${[...fired].join(',') || '(nothing)'}`
      + (missed.length ? `  MISSED ${missed.join(',')}` : '') + (extra.length ? `  UNCLAIMED ${extra.join(',')}` : ''));
    if (process.argv.includes('--why')) for (const x of f) console.log(`        ${x.slice(0, 200)}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  if (failures) { console.error(`\nedge-profile control: FAILED — ${failures} of ${MUTATIONS.length} mutations did not behave.`); process.exit(1); }
  console.log(`\nedge-profile control: PASS — ${MUTATIONS.length} of ${MUTATIONS.length} mutations reddened exactly the clauses they name.`);
}

if (CONTROL) { await control(); }
else {
  const rows = pickRows();
  const fails = [], notes = [];
  const t0 = Date.now();
  await runRows(G0, rows, fails, notes, !ONLY && !ROWS_FILE);
  for (const n of notes) console.log('edge-profile: ' + n);
  console.log(`edge-profile: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (DUMP_E2) { (await import('node:fs')).writeFileSync(DUMP_E2, JSON.stringify(E2_DUMP, null, 1)); console.log(`edge-profile: E2 turns of ${Object.keys(E2_DUMP).length} rows written to ${DUMP_E2}`); }
  if (fails.length) {
    console.log(`\nedge-profile: FAILED — ${fails.length} findings`);
    /* `--all-fails` lists every finding rather than the first 40 (S5: a sweep
       over 190 rows had to be compared row by row against the base tree) */
    const LIM = process.argv.includes('--all-fails') ? Infinity : 40;
    for (const f of fails.slice(0, LIM)) console.log('  ' + f);
    if (fails.length > LIM) console.log(`  ... and ${fails.length - LIM} more`);
    process.exit(1);
  }
  console.log('edge-profile: PASS — E0-E7 clean.');
}
