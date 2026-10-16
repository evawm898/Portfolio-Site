/* ===================================================================
   THE PER-PETAL SHEET — session 11's deliverable, and the picture Eva rules
   from.

   THE COMPOSITION IS THE FAN SHEET'S, which is the flower's: the fan read
   FACE-ON with the mirror plane drawn down the middle of every frame, one
   untouched fan and one radial bloom as controls, and the extreme
   photographed rather than argued about. What this sheet adds is the thing
   the session is for — PETAL ONE CALLED OUT ON THE MIRROR LINE, and one group
   visibly differentiated from its neighbours.

   THE MIRROR LINE IS MEASURED PER CELL, never drawn at a layout guess. The
   plane contains the axis and +x; the face-on camera passes up = [-1, 0, 0],
   so +x is at the BOTTOM of the frame and the plane projects to a vertical
   line at 50% width. Every cell recomputes it from the EMITTED azimuths (the
   midpoint of a mirror pair, the same property Z4b asserts) and this sheet
   ABORTS rather than write a frame whose line is not the model's plane.

   THE RETIREMENT IS PHOTOGRAPHED, NOT ONLY RECORDED (Eva's instruction,
   Sep 3). Eva ruled that per-petal roles SUPERSEDE slot roles on the fan, so
   a fan that used to be shaped with `labellum*` is shaped with `petal1*` now
   and the old sliders do nothing there. A ruling that removes a capability
   should be visible, so the BEFORE/AFTER pair renders the IDENTICAL config on
   the base tree and on this one — two servers, two roots, one set of sliders
   — and the "before" cell is the only cell on this sheet not produced by the
   code under review. Its caption says so.

   EVERY CELL ASSERTS ITSELF, on the fan sheet's own rule. A per-petal fan
   whose numbering does not follow the mirror line renders as a perfectly
   plausible fan, and NOTHING in the frame says so — measured on a throwaway
   worktree, where an off-by-one orbit index exported watertight, in one
   piece, with zero degenerate triangles, at an identical triangle count and
   an identical STL byte length, and fired nothing in the shipped instrument
   until Z8 existed. So each cell runs the junction assertions (J7 included)
   and the zygomorphy assertions (Z7, Z8 and Z9 included), reads its whole
   state back, measures its own plane, and decodes its own PNG to refuse a
   crop.

   RUN:  node tools/shot-bloom-per-petal.mjs <out-dir>
   =================================================================== */

/* RETIRED WITH THE ROLE TABLE (Q3.4, the role retirement — read
   docs/bloom-role-retirement-outcome.md). This sheet photographed controls
   that no longer exist (the slot roles, the per-petal groups, the ALL and
   INNER deltas), so this tree cannot render it and does not pretend to: a
   stored design naming them now loads through `migrateRoles` (the RADIAL
   labellum and hood DROPPED by Eva's Oct 14 ruling, the rest as scope
   offsets), and the before/after of every affected row is
   tools/shot-bloom-role-retirement.mjs. To see this sheet as it was, run it
   from a worktree of the last commit that had the table:

     git worktree add /tmp/base-roles f95b244
     node /tmp/base-roles/tools/shot-bloom-per-petal.mjs <out-dir>

   The code is kept in git history at that commit, not here. */
console.error('shot-bloom-per-petal.mjs: retired with the role table (Q3.4) — run it from a worktree of f95b244; the retirement sheet is tools/shot-bloom-role-retirement.mjs');
process.exit(2);
