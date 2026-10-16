/* ===================================================================
   THE ORCHID SHEET — session B's deliverable, and the picture Eva rules from.

   WHAT IT IS FOR. The zygomorphy sheet beside it photographs the IRIS, which
   is a per-LAYER claim: whorl differs from whorl, and the view that shows it
   is the PROFILE (falls hang, standards rise). This sheet photographs a
   per-SLOT claim, which is a different thing seen from a different angle: the
   petals of ONE whorl differ from each other about a mirror plane, and the
   view that shows THAT is FACE-ON. Hence the headline: the flower now has a
   face — a labellum below, a hood above, laterals to either side.

   FACE-ON IS THE HEADLINE HERE, WHICH INVERTS THE IRIS SHEET'S ORDER, and the
   inversion is the point rather than a layout preference. On the iris sheet
   face-on says almost nothing and the profile carries the ruling; here the
   profile says almost nothing (a bilateral bloom seen edge-on hides its own
   symmetry plane) and face-on carries it. Both views are shot for both, so
   the claim that each view is the one that matters is checkable rather than
   asserted.

   THE ORIENTATION IS DECLARED, NOT LUCKY. The mirror plane contains the axis
   and slot 0's radial direction, which is +x. The face-on camera therefore
   passes up = [-1, 0, 0], putting +x at the BOTTOM of the frame: labellum
   below, hood above, laterals beside, in every face-on cell. Before this
   session `fitCamera` hardcoded up = [0,0,1], which is PARALLEL to the
   face-on view direction — so face-on roll was whatever three.js's degenerate
   fallback picked. That did not matter for a radially symmetric bloom and it
   matters completely for a bloom with a face.

   THE CONTROL IS A RADIAL BLOOM WITH NO ROLE ENGAGED, in the same
   arrangement, with the same petal count and the same triangle count — so the
   only thing that can differ between it and the orchid is which state each
   SLOT was built from. And session A's IRIS is on this sheet as a cell that
   must be UNMOVED: a session B sheet is the right place to prove session A's
   ruling still renders what she approved, rather than assuming it.

   EVERY CELL ASSERTS ITSELF. A record that resolves correctly and never
   reaches the blade renders as an undifferentiated bloom under a caption
   saying otherwise, and nothing in the frame says so — measured on a
   worktree: it exports watertight, one piece, identical triangle count and
   byte length, and passes every STL check. So each cell runs the junction and
   zygomorphy assertions, reads its whole state back, and checks its own
   caption against what the BUILDER reported using.

   THE ORCHID MOVED UP A WHORL ON SEP 3 (Eva's ruling from the deploy preview,
   with the cost stated to her and accepted): slot roles need TWO OR MORE
   WHORLS IN STEP now, "Petal roles" at one whorl is the all-petals group, and
   Petal 1 / Petal N are hidden AND INERT there. So every orchid cell on this
   sheet — and the CONTROL beside it, which must be the same arrangement — is
   at two whorls with Layer offset 0, and the sheet carries one more pair: the
   ONE-WHORL orchid BEFORE (rendered from a git worktree of the base commit,
   where it still had a face) and AFTER (this tree, where the same eight
   sliders at the same values build an undifferentiated rosette). A removed
   capability is photographed rather than only recorded — the per-petal
   sheet's precedent.

   RUN:  node tools/shot-bloom-orchid.mjs <out-dir> [base-tree]
         base-tree: a git worktree of the commit before the retirement
         (default /tmp/base-orchid); without it the BEFORE cell is omitted
         and the run says so.
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
     node /tmp/base-roles/tools/shot-bloom-orchid.mjs <out-dir>

   The code is kept in git history at that commit, not here. */
console.error('shot-bloom-orchid.mjs: retired with the role table (Q3.4) — run it from a worktree of f95b244; the retirement sheet is tools/shot-bloom-role-retirement.mjs');
process.exit(2);
