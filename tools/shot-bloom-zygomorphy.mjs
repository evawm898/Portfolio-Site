/* ===================================================================
   shot-bloom-zygomorphy.mjs — contact sheets for ZYGOMORPHY: petals that
   differ by POSITION. Session A of two, so this sheet is about PER-LAYER
   roles — the iris. Canvas only.

   THE QUESTION THIS SHEET EXISTS TO ANSWER, and it is the one no number here
   can: DO THE TWO WHORLS READ AS DIFFERENT THINGS? Every measurement this
   session produced says the machinery is correct — the roles partition, the
   records reach the blades, the area rule is bit-exact, the export is
   watertight and one piece. None of that says the falls hang and the
   standards rise. That is Eva's eye, and it is ruled from these cells.

   THE CONTROL IS THE POINT OF THE SHEET, not a courtesy. Every zygomorphic
   cell sits beside a RADIAL BLOOM UNCHANGED — the same controls with the
   three deltas at zero — so what changed is legible rather than asserted.
   A before/after in one frame is the only form in which "the whorls now
   differ" can be judged at all: a differentiated bloom photographed alone
   looks like a bloom.

   TWO VIEWS, AND EACH ANSWERS A DIFFERENT HALF.
     face-on  down the axis. WHICH PETALS ARE WHICH — the outer whorl's
              silhouette against the inner one's, which is where a different
              tip and a different cup are visible and where the plan of the
              flower reads.
     profile  horizontal, through the hub plane. WHICH WAY THEY CURVE — falls
              hanging against standards rising is a DEPTH statement, and it is
              invisible face-on. The iris is defined by this view.
   A cell photographed in a view its own subject is invisible in has not been
   photographed (the flower project's lesson, and every bloom sheet's since).

   WHAT IS NOT ON THIS SHEET, and it is a scope statement rather than an
   omission: the ORCHID. A labellum needs a mirror plane and a slot role, and
   both are session B. This sheet is the iris and says so; a cell captioned
   "the flower has a face" belongs to the sheet that can show one.

   FRAMING IS THE APP'S OWN CAMERA, never a crop and never re-derived
   projection maths. THE FRAME IS ASSERTED, NOT TRUSTED — chrome hidden and
   autoRotate off, both read back via stillFrame(); one fresh page per cell;
   every value read back; the whole registry state compared against
   DEFAULTS + set; and the gates' OWN junction AND zygomorphy assertions run
   on every cell before the shutter. That last one is not decoration: a
   picture of a bloom whose override record never reached the blade looks
   exactly like a picture of a bloom with the deltas at zero, and this sheet
   is the one place a human would rule from the picture without noticing.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness is
   verify-bloom-export.mjs, connectedness is verify-bloom-connectedness.mjs,
   and the structural claims are Z1-Z3 in zygoAssertions(), which both gates
   run on every row. This shows what zygomorphy LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-zygomorphy.mjs <out-dir>
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
     node /tmp/base-roles/tools/shot-bloom-zygomorphy.mjs <out-dir>

   The code is kept in git history at that commit, not here. */
console.error('shot-bloom-zygomorphy.mjs: retired with the role table (Q3.4) — run it from a worktree of f95b244; the retirement sheet is tools/shot-bloom-role-retirement.mjs');
process.exit(2);
