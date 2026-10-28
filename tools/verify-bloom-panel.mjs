/* ===================================================================
   verify-bloom-panel.mjs — BUILD GATE: every control the registry declares
   is REACHABLE in the panel, and collapsing a section does not take it away.

   SEVERAL ROUTES, AND NONE SUBSTITUTES FOR ANOTHER. This is the flower
   project's dump-versus-sheet lesson, moved to the thing it was learned on:
   a check that sets state and evaluates predicates proves the DECLARATIONS,
   and it cannot catch an app that never re-runs — `predicateDrivers` was
   imported and never called, and the panel silently stopped responding while
   every declaration stayed correct. Each route below names the failure it
   exists for, and --negative-control requires every one of them to fire.

     (a) THE DECLARATION ROUTE — the render census. Every non-retired registry
         control appears in the panel EXACTLY ONCE, in the section it declares,
         in the registry's order, with exactly one label and one read-out span;
         every section renders exactly once, in SECTIONS order, at the
         first-load `open` the registry declares; nothing appears in the panel
         that is not a registry control; and each wrapper's `hidden` agrees
         with its own predicate evaluated against the same state. Counting is
         the point: "exactly once" catches the duplicate-span defect as well as
         the missing-control one, and only one of those is visible by eye.
         It also compares the tree AS BUILT — each section's actual ancestor
         element and the number of <details> above it — against the tree as
         DECLARED, which the order comparison alone cannot see, and asserts
         that INSTANCED DESCRIPTOR FAMILIES SHARE ONE SPEC: a set authored
         once and instanced N times (the per-petal groups today, the two tips
         from session 3b) cannot drift while it stays generated, and this is
         what says so if one instance is ever hand-written beside the rest.

     (s) THE NESTING RELATION, AT ANY DEPTH (session 3a). verifySections()
         used to REFUSE a grandchild, on the stated grounds that
         applyVisibility() and this gate were "written for one level". That was
         re-verified from source and was not what either said — see the check's
         own header in bloom-registry.js. The bound is lifted; what replaces it
         is the ORDERING every one of those instruments was silently leaning
         on. This route hands verifySections() section arrays whose answer is
         written down: three levels must be ACCEPTED, and a child-before-parent
         array, a parent cycle, a self-parent and a missing parent must each be
         REFUSED. Four must-fails that run on every invocation, so the route
         carries its own positive control and needs no --negative-control
         mutation — which matters here because the live tree is two levels and
         a wrong answer about depth 3 is unobservable on it. Route (a) also
         compares the tree AS BUILT (each section's actual ancestor and its
         count of enclosing <details>) against the tree as declared, which the
         order comparison cannot see; and the two expressions in this file that
         really were one level deep — the witness-through-a-descendant test and
         the on-screen walk — are pinned to the answers they replace on this
         tree, in every state route (d) drives.

     (c) THE ACCORDION ROUTE — the panel holds at most one open section: the
         declared one at first load, exactly the clicked one after a real
         summary click, and none after the open one is closed. Every accordion
         assertion awaits a frame, because `toggle` is QUEUED rather than
         synchronous (measured) and a synchronous read would fail on correct
         code.

     (d) THE VISIBILITY-TRANSITION ROUTE — does a gated control ever APPEAR?
         Route (a) evaluates every predicate at DEFAULTS only, which is ONE
         DIRECTION: a control gated on `layerCount >= 2` is hidden there and
         would pass route (a) even if it never appeared at all, and so would
         `centerRise` (retired in session 20), gated on DOME since the centre
         rig shipped and never asserted to appear by this gate. So each DRIVER named by any
         predicate (derived from the registry, never listed) is driven through
         the real UI to every value that can change the dependent set, and
         EVERY control's `hidden` is re-checked against its own predicate at
         the new state — appearance and disappearance in one pass. The flower
         paid for checking only one direction: Advanced silently stopped
         showing 25 controls while every gate passed.

     (f), (g) AND (h) ARE RETIRED WITH THE ROLE MACHINERY (Q3.4, the role-
         retirement session). (f) drove the slot / per-petal / all-petals
         eligibility through combined states; (g) read the rosette's hood
         group's derived "Petal N" label back against the builder's hood slots;
         (h) walked the depth transitions of the three role groups and their
         hiddenReason caption. Every one of those groups is gone: their ids are
         in RETIRED_IDS (route (n) asserts they never render), FAN petals are
         per-pair SCOPES (route (ae)) and the ALL / INNER deltas are a global
         and per-layer offsets. The three letters are not reused. Retiring
         each was three edits: this entry, the block, and the negative
         control's flag (sawLabel, sawDepth) and banner.

     (e) THE LOW-COUNT SPIRAL FLAG, BOTH DIRECTIONS. The flag is the entire
         handling of golden-angle placement below eight petals (there is no
         geometric threshold to gate on — measured, see GOLDEN_ANGLE), so it
         must appear when the condition holds AND be absent when it does not:
         a flag only ever asserted present is a flag that can be stuck on. The
         threshold is imported, never retyped.

     (b) THE PATH ROUTE — reactivity through a CLOSED section. For every
         section collapsed at first load, a control inside it is driven with
         real input/change events and the app must REACT: its own read-out span
         must change (refreshLabels runs only from regenerate(), so a changed
         span is proof a rebuild happened), the app's state snapshot must carry
         the new value, and a GEOMETRY witness chosen per section must move.
         The section must still be closed afterwards.

   AND THE COLLAPSE INVARIANT ITSELF, asserted rather than believed: the app's
   whole state snapshot is IDENTICAL with every section collapsed and with
   every section expanded, and toggling every section open and shut moves no
   geometry (live triangle count and ring radius unchanged). Collapse is a
   presentation state; readUI, the gates' read-back and the export path cannot
   see it. That is the property the whole grouping rests on.

   WHY A GEOMETRY WITNESS IS PICKED PER SECTION rather than one for all. The
   obvious witness — triangle count — is the WRONG one here and would have
   made this gate a passing no-op for the form section: the four curves cost
   exactly zero triangles at every setting, by construction (fixed topology is
   what makes them free). So each closed section names a witness that its own
   control must move, and the gate fails if the witness does not move.

   WHAT THIS GATE DOES NOT COVER (read before quoting a PASS):
     - Anything about the geometry being right, watertight, or connected.
       Those are verify-bloom-export.mjs and verify-bloom-connectedness.mjs,
       and this gate's passing says nothing about either.
     - Bytes. A pure-UI change is asserted byte-identical by
       tools/diff-bloom-bytes.mjs, not here.
     - Looks. Whether the grouping READS well is a ruling made from
       tools/shot-bloom-panel.mjs's sheet; the metric screens, eyes decide.
     - Controls that are hidden by predicate at the state under test are
       censused for PRESENCE and agreement with their predicate, not driven.
       A hidden control's reactivity is the existing gates' business, which
       set every control through the same route on all 125 rows.

         RUN:  node tools/verify-bloom-panel.mjs
         node tools/verify-bloom-panel.mjs --negative-control
           Breaks all three routes on purpose — deletes one control's wrapper
           from the DOM, replaces another control's element with a
           listener-less clone (the app-does-not-react failure, exactly), and
           suppresses the accordion's toggle before the panel's own capture
           listener can see it, and freezes every wrapper's `hidden` so the
           panel stops re-evaluating visibility while its declarations stay
           perfect, and freezes a derived section label so the panel stops
           renaming a drop-down whose petal number moved, and freezes the
           hiddenReason caption so the panel stops saying why two drop-downs
           are missing — and replaces the print-preview box with a
           listener-less clone so the viewport never switches geometry, and
           freezes the read-out on the depth rows so the RINGS NARROWER THAN
           A FOOT line can never appear — and requires this run to FAIL on
           all eight. A check nobody has seen fail is a hope.

     (i) THE PRINT-PREVIEW TOGGLE (Sep 3; ALWAYS ON since F7 — the page is
         opened AS SHIPPED and the box must be CHECKED and HIDDEN with
         export geometry on screen, then driven OFF and back ON). View
         chrome, not a registry control, so route (a)'s census would fail it as a stray input if it
         ever landed inside the panel — that is asserted. Then the box is
         flipped through its real 'change' event on a configuration where
         the export floor BINDS (ALL THIN), and the app must switch
         geometry: a rebuild counted, `shownMode` reading export, `liveTris`
         null (never the export count under a live label), the hub radius
         equal to footRing()'s own export-mode answer and different from
         its live one, the read-out's first line naming PRINT PREVIEW and
         the print-truth pair's marker on the PRINTED line — with the whole
         registry state unmoved. Then the load-bearing claim: the STL
         exported with the box ON is BYTE-IDENTICAL to the one exported
         with it OFF, on the same page. Then OFF restores live. Measured on
         two mutants before this existed: an export path that read view
         chrome was invisible to every shipped instrument in the gates' own
         state (8/8 rows byte-identical), which is why this route exists.

     (q) THE CENTER CONTAINER AND ITS THREE READ-OUT CLAUSES (session 23),
         folded into routes (o) and (p) below rather than a route of their
         own, because they are properties of the same two parts on the same
         pages: the container "Center" is hidden iff BOTH parts are hidden
         (under SPHERE) and shown otherwise — the derived section rule one
         level up, asserted in both directions; the count's and the style's
         read-out spans say the sub-controls are KEPT, with their values
         equal to the state, exactly when the part is off and never when it
         is on; the stamen spread's CAP MARK (data-cap, --bl-cap, the class)
         sits at the owner's own `saturation` exactly when that is inside
         the range and is absent when it is not or the part is off; and the
         FILAMENT-AGAINST-STYLE flag on the STAMENS line is present iff both
         parts are built, its distance and height equal to the builder's own
         record, the flag iff the record says crossing. The negative control
         freezes the container's `hidden`, both spans and the cap wrapper's
         mark, and requires all four clauses to fire.

     (r) THE FLAG'S OWN WITNESS (session 23). Route (o)'s negative control
         freezes the WHOLE read-out, so on that page the clause is absent and
         the flag's own assertion — the flag iff the builder says crossing —
         is never reached. A read-out that prints the clause with the flag
         stuck OFF is a different failure. On a fresh page, six at curl 90
         beside the style must carry the flag while the builder reports the
         crossing; the negative control replaces the read-out's setter with
         one that rewrites only the flag away and keeps every other
         character, so exactly that assertion fires.

     (t) THE ANTHER'S SEVEN (session 29), and the panel's FIRST THIRD LEVEL.
         Tip is declared inside Androecium inside Center, so every step counts
         the section's enclosing <details> and requires two — route (a)'s
         census would read a Tip re-parented to the top as identical. The two
         OUTLINE controls must be shown exactly when the androecium is present
         AND the roundedness is below 1: route (d) cannot make that claim,
         because it drives from the defaults where the androecium is absent
         and both ends of the roundedness slider hide them, so its pass there
         is vacuous. The INERTNESS is behavioural and is the point — the two
         hidden controls are driven to their extremes at a roundedness of
         exactly 1 and the triangle count must not move from the shipped
         pill's, which is a stronger claim than `hidden` for a control whose
         whole job is the tessellation. Then the read-out's ANTHER line
         against the owner's own record: the lattice, the waist, the verbatim
         UNMEASURED tag, and the four flags (pinch clamped, the whole tip
         under the floor, the sphere's floored band, coincident lobes) each in
         both directions. The negative control freezes the read-out and every
         wrapper's `hidden`, and eleven assertions fire.

     (j) THE INNER-RING LINE, BOTH DIRECTIONS (Sep 3). Where a derived depth
         clamp was proposed and rejected, the read-out SAYS which rings are
         narrower than one foot. Present iff footRing()'s own
         `underFootFloor` is set on some ring — asserted on rows where it
         must appear (six layers at spread min; a shipped depth-3 row that
         was already under the floor) and rows where it must not (the
         defaults; six layers at spread max), from the app's metrics rather
         than from the row's own expectation alone, so a frozen flag in the
         owner and a stuck line in the read-out both fire.

     (w) THE STEM CHANNEL AND THE MERIDIAN PACKING MARGIN, BOTH DIRECTIONS
         (the sphere-stem session). A user who asks for 40 petals and is
         shown 33 must be told, and this project's clamped-and-told form is
         TWO places — the control's own value read-out and the read-out panel
         — so both are asserted against the BUILDER's own record rather than
         against each other (`stamenSpread`'s route, HEAD RISE's discipline).
         The margin rides here because it is TOLD on every sphere that has a
         stem and is EXACTLY EXHAUSTED at one reachable corner, so a line that
         silently stopped printing would take the word EXHAUSTED with it and
         nobody would ever have seen it print: the route drives 4 petals on a
         12 mm stem, where the margin reads 0.652 with 2 of 4 built, and the
         two INERT states (a sphere with no stem, a stem on a CAP) where both
         lines must be ABSENT. `(w)` and not `(t)`: `(t)` is the anther's
         seven, above.

     (x) THE BORE'S TWO CLOSURES ARE TOLD, AND SO IS THE CROSSOVER (the
         tip-plug session). Eva's ask was that the bottom of a bored stem
         LOOK solid; the geometry answering that is ST10's, and this route is
         the other half of the ruling — that where the two closures MEET and
         the stem becomes solid throughout, it is SAID rather than silently
         produced. Four states, each a biconditional driven on one page
         against the BUILDER's own record: a hollow stem (the plug's clause
         shown, the crossover's absent), a stem at the 3 mm floor (neither —
         there is no bore to close, so a passing "0.00 mm" would be a number
         nobody measured), the CROSSOVER itself (one sentence naming both
         closures and the stem they meet across, and NEITHER of the separate
         clauses, because "solid for the first 1.20" and "solid for the last
         1.50" of a 2.20 mm stem are two true clauses adding to a false
         picture), and length 0 (no STEM line at all). The numbers are read
         back against `__bloomMetrics`, never against each other.

     (y) THE SIZE FIELD'S TWO LINES AND ITS TWO GATED CONTROLS (organic
         variance, build 1). Two read-out lines with two owners: SIZE VARIANCE
         (the field's record — present iff the amount is on, its range and its
         law the record's own, the ALIASED clause iff the record says so, "a
         ramp" iff the frequency is 0, "phase inert" iff the arrangement is a
         fan) and NEIGHBOURS (the told flag, ruling 1's condition — on EVERY
         build, its three numbers read back against `__bloomMetrics().neighbour`
         to the decimals it prints, never against each other). And the two
         gated controls' own value read-outs: the frequency's ALIASED clause
         and the phase's INERT-on-a-fan clause, each against the builder's
         record. Six states on one page, both directions: the default (no
         field line, the flag line, both sub-controls hidden), ±50 % at 1
         cycle, 20 cycles (aliased), the ramp, a FAN at phase 90, and back to
         0. `(y)` follows `(x)`; adding a route is THREE edits — this entry,
         the block, and the negative control's flag list.

     (z) THE INFILL'S ACHIEVED COUNT IS TOLD, AND EVERY REFUSAL IS A WORD
         (the Voronoi infill, S3). Ruling 3 makes density a REQUEST, so the
         count the blade actually built must be on screen whenever it differs
         from the asked one — in BOTH places this project tells a clamp, the
         control's own value read-out and the read-out panel, each asserted
         against the BUILDER's record rather than against the other. The route
         also drives the REFUSALS (a fringe, a lobed blade, the guard off),
         because a branch is not something a number can show. `(z)` and not a
         reused `(y)`: that letter is the size field's, above, and this file's
         own route (w) records what two routes under one letter cost.
     (u) THE INFILL'S FOUR S4 CONTROLS AND THE TWO TELLINGS THEY ADD (the
         Voronoi infill, S4). Relaxation, density law, stretch and the solid
         base are hidden AND inert at the guard and shown with it on — asserted
         to APPEAR, not only to hide; the read-out's SECOND infill line speaks
         the four levers AS THE BUILDER READ THEM (a line stuck on the
         default's values while the builder moved is exactly what a frozen
         panel shows), the along-u hole distribution and the basal travel; and
         the density's dead travel is a CAP MARK on its track at the builder's
         own `densityCap`, present iff the cap sits under the range's ceiling.
         `(u)` is a free letter — (v) is retired and not reused, (g)/(h) are
         referenced in prose — checked against this enumeration before use.
     (aa) THE ROUNDNESS CONTROL TELLS THE SHAPE IT ACHIEVED (the roundness-
         control session). `infillRound` is hidden AND inert at the guard and
         shown with it on (asserted to APPEAR); its value read-out carries the
         BUILDER's own median roundness, hole area and solid fraction to the
         decimals it prints, the split — how many holes are rounded past their
         0.8 mm fillet and how many are still at it — and the per-build onset
         range below which only clamped corners move (Eva: told per build,
         never baked into the range); at 0 it says today's holes and carries no
         split. Every number is read against `__bloomMetrics().infill`, never
         against the panel. `(aa)` because every single letter is taken — (v)
         retired, the rest in the enumeration or in prose; three edits: this
         entry, the block, the negative control's flag list and banner.
     (ab) THE CUP READ-OUT UNDER COMPOUND QUOTES THE LEAFLETS (S3c). #382
         found it quoting the edge lift from the HIDDEN simple-leaf width under
         COMPOUND. The route restates each leaflet size class's width from the
         leaflet controls (basal pair, top pair, terminal; a pair and the
         terminal at one pair), requires the read-out to quote `cup x
         half-width` for each, and moves the leaflet and terminal widths so a
         read-out deaf to them is red; under SIMPLE the sentence is the one it
         was and names no leaflet. Seen red first on main's read-out. Three
         edits as ever: this entry, the block, the negative control's flags.
     (ac) THE ROUNDNESS'S DEAD TRAVEL IS HATCHED WHERE, AND ONLY WHERE, THE
         SLIDER IS DEAD (Eva's ruling 3 of Oct 9, the stamenSpread
         precedent). The dead travel is MEASURED by rebuilding the leaf at the
         slider's steps and comparing the emitted outline with the range top's
         — never read off the builder — and the cap mark must start exactly
         at the first dead step (a hatch over live travel is red; dead travel
         left unhatched is red), with the read-out SATURATED on exactly the
         dead steps. Two mutants under --negative-control, one per direction
         (the cap halved; the cap removed), each by its own sentence. Three
         edits: this entry, the block, the negative control's flags and banner.
     (ad) THE DESIGN FILE'S CONTROLS RENDER AND THE SAVE CARRIES EVERY
         REGISTRY CONTROL (bloom-file.js, the save/load session). Save, the
         Load file input and the status line render in the panel's action
         rows and NOT inside #panelControls (so route (a)'s census stays a
         census of registry controls); the page's own save, parsed, holds
         under `controls` EXACTLY the registry's ids in order and nothing
         else — the every-control-is-a-field check, with the REGISTRY as the
         census (the writer and the reader walk one table and agree about a
         row that is gone). One mutant under --negative-control: bloom-file.js
         served with a table row removed, which must fail by its own sentence.
         The format's full gate is tools/verify-bloom-design-file.mjs; this
         route is the panel's own half. Three edits: this entry, the block,
         the negative control's flag and banner.
     (ae) THE SCOPE SELECTION (Scoping-b, Eva's rulings — read
         docs/bloom-scoping-selection.md). With per-layer values ON (RADIAL,
         three layers) and per-petal values ON (FAN): the toggle alone moves
         nothing; a PICK IS A PURE LOAD (no rebuild, the shown-mesh digest, the
         raw record and the whole-bloom state all unchanged across it); an
         edit lands on the picked scope only, read off the BUILDER's per-petal
         record (`petalSlotForms[].scope`), never off the record the page
         wrote; another scope's pick loads its own value and writes nothing;
         sheet thickness is told global and an edit of it writes no offset;
         DESELECT WRITES NOTHING; per-layer OFF keeps the record and builds the
         unscoped bloom; on the fan, picking either member binds the pair and
         an edit moves both. The edited layer is the OUTER one, never the
         middle of three (the fixed point of a reversed layer order). AROUND
         THE PICK (the review's findings): whole-bloom read-outs (Foot
         delicacy, Sepal size) stay the whole bloom's under a picked width; the
         build lands on the slider's own double (global 1.70, desired 0.90); a
         load and a Reset each end the pick before they write; a file saved
         BEFORE THE ROLE RETIREMENT is migrated and told — its inner delta a
         per-layer offset, its radial labellum dropped (Q3.4); a file with no
         `overrides` keeps the page's offsets. THE COUNT CHANGES UNDER A PICK:
         a stored outer pair is kept and inert at three a side and returns on
         its own pair at four. Eleven mutants under --negative-control, each by
         its own sentence: a pick stamps the panel onto the picked scope, an
         edit lands on every scope, deselect drops the offsets, whole-bloom
         read-outs read the picked scope, the offset is the twelve-digit cut
         alone, a load / a reset does not end the pick, a pre-retirement file
         is migrated silently (bloom-file.js), a missing overrides list drops the page offsets (bloom.js),
         and a mirror pair is split, a member index is re-keyed
         (bloom-geometry.js). Three edits: this entry, the block, the negative
         control's flags and banner.
     (af) THE CURVE EDITOR (the curve-editor session, Oct 14 — read
         docs/bloom-curve-editor.md). No live registry control is a curve yet,
         so the editor is mounted through the page's capability hook
         (`__bloomCurveTest`) on a test outline with a TEST VALIDATOR the route
         writes (refuse a drawn half-width past 0.30 of the length — a stand-in
         for F3's printable curvature). Real pointer and keyboard events at the
         points the editor itself projects; every claim read off the VALUE.
         The editor renders once, outside #panelControls; a drag stores the
         FRACTION under the pointer (the editor's own proposed edit is read, so
         a value written in millimetres is named as that) and the owning length
         moves the caption and no stored number; a one-step drag to a refused
         position leaves the value EXACTLY as it was and tells the validator's
         reason — at the refused position is "never asked", anywhere else is
         "clamped"; add on the curve, double-press remove, the keyboard, an end
         that cannot be removed; two-sided starts as the left's copy and
         two-sided -> symmetric keeps the LEFT side; the design file's own
         walkers round-trip the curve clean and refuse one outside the box
         whole. THE DOUBLE PRESS IS THE BROWSER'S CLICK COUNT, NEVER A
         WALL-CLOCK WINDOW (main's red on d576262 — #408's editor judged a
         double press by 450 ms between two pointerdowns, a press released
         without a move left the window armed, and a fast runner reached the
         next gesture inside it: the first press of a real double-click removed
         the added point and the browser's own dblclick put one back; green on
         every slow box, including this one): two back-to-back single presses
         remove nothing and the CI sequence leaves the curve before the add,
         both driven over raw CDP so the gap between gestures is microseconds on
         any box — the fast side, which Playwright's per-command round trips
         cannot reach here. The editor's keys move no registry control (the
         whole UI state before and after). Six mutants under
         --negative-control, each by its own sentence: the validator ignored
         (bloom-curve.js), a refused drag that clamps (bloom.js), the mirror
         keeping the right side (bloom-curve.js), the wall-clock double press
         restored (bloom.js), points stored in absolute units (bloom.js), the
         design file dropping the curve (bloom-file.js). Three edits: this
         entry, the block, the negative control's flags and banner.
     (ag) PER-LAYER VALUES ON A LAYERED SPIRAL, AND AN OWNED WIDTH DRIVES ITS
         FOOT AND RING (Eva's rulings, Oct 16 — docs/bloom-role-retirement-
         outcome.md). Per-layer values is HIDDEN under CONTINUOUS and SHOWN
         under a layered SPIRAL; ON alone moves nothing, hides Shrink and Tilt
         step, and the picker lists the spiral's turns as "Turn 1..3"; a cup
         edit on turn 1 (the outer, never the middle) lands on that whorl's
         petals only, read off the BUILDER's per-petal record; a width edit on
         turn 2 gives that ring the foot `own x 0.4 x Foot delicacy` and the
         radius `R0 x own / Petal width`, RESTATED here from the controls and
         read off footRing()'s rings (`__bloomMetrics().rings`), with turn 3
         still on the Shrink ramp; a width of 19 on turn 3 (past the outer
         whorl's) GROWS THE HUB to that ring (Eva's ruling, Oct 16, replacing
         the rim hold) and the read-out's HUB GROWN line says so with the
         amount, restated here; deselect and OFF keep the record, and OFF
         builds the unscoped bloom. Four mutants under --negative-control,
         each by its own sentence: per-layer values left RADIAL only, the foot
         keeping the ramp, the ring keeping the ramp, the ring held at the rim
         again (all bloom-geometry.js).
     (ah) THE OUTLINE UNDER SCOPING (F6-scope, Oct 18 — docs/bloom-outline-
         curve-scope-outcome.md). Two RADIAL layers, Per-layer values ON, the
         whole bloom on the LAW: picking layer 2 writes NOTHING to the record
         and its outline controls say INHERITED; setting its mode to CURVE
         makes the mode its OWN (the record carries the mode and no curve) and
         its petals — and only its petals, read off the builder's per-petal
         census — draw the whole bloom's curve; deselected, an edit to the
         whole bloom's curve reaches layer 2 LIVE; picked again, an edit to the
         curve makes it layer 2's own (the whole bloom's curve unmoved), and
         "Outline: reset to inherited" removes the layer's values (the bar's
         button hides, the petals inherit the LAW again). Three mutants under
         --negative-control, each by its own sentence (all bloom.js): a pick
         that writes the scope's outline into its entry (selection applying
         values), the reset leaving the owned curve, and an inherited curve
         frozen at copy time. Three edits: this entry, the block, the negative
         control's flags and banner.
     (ai) THE OUTLINE-GATED CONTROLS FOLLOW THE PICKED SCOPE'S MODE (the
         infill-whorls session, Oct 19 — docs/bloom-infill-whorls-outcome.md
         §5). Every control whose visibility predicate reads
         `petalOutlineMode` (the tapers, the tip shape, the squared end, the
         fringe and the lobes — found by `predicateDrivers`, never listed) is
         shown or hidden on the PICKED scope's effective mode: its own value
         where the scope owns one, the whole bloom's where it inherits. The
         expectation is RESTATED here from the scope record the page reports
         (`__bloomDesign.scopes()`) and the whole-bloom state, through the
         registry's own `evalPredicate`, never read from the page's resolver.
         Three arrangements (a RADIAL layer, a FAN pair, a SPIRAL turn), both
         directions (whole bloom LAW / scope owns CURVE, whole bloom CURVE /
         scope owns LAW), the owning scope and an inheriting one, and the
         clause is non-vacuous by construction: the two picks must DISAGREE.
         #421's "not done" list named this as following the global mode; on
         `169fd5b` it already follows the scope, so this route is the claim's
         first witness rather than a fix. Two mutants under --negative-control,
         each by its own sentence (both bloom.js): visibility reading the
         whole bloom's outline mode, and visibility ignoring the pick. Three
         edits: this entry, the block, the negative control's flags and banner.
     (aj) THE SPINE UNDER SCOPING (F3-scope, Oct 19 — docs/bloom-spine-curve-
         scope-outcome.md). Two RADIAL layers, Per-layer values ON, the whole
         bloom on the curl SLIDERS: picking layer 2 writes NOTHING and its
         curl-mode note says INHERITED; setting its curl mode to CURVE makes the
         mode its OWN (the record carries the mode and no spine curve) and its
         petals — read off the builder's per-petal spine census — bend on the
         whole bloom's spine curve while layer 1 stays on the sliders; every
         petal control whose predicate drives on `petalCurlMode` (spine curl,
         bias, start — found by `predicateDrivers`) is shown or hidden on the
         PICKED layer's mode, restated from the record through
         `evalPredicate`, and the two picks must disagree; deselected, an edit
         to the whole bloom's spine curve reaches layer 2 LIVE; picked again, a
         curve edit makes it layer 2's own (the global unmoved); and "Spine:
         reset to inherited" removes the spine's values and KEEPS the outline
         value the layer also owns. Five mutants under --negative-control,
         each by its own sentence (all bloom.js): a pick that writes the
         spine, the spine reset leaving the owned curve, an inherited spine
         curve frozen at copy time, the spine reset dropping the outline too,
         and curl visibility reading the whole bloom's curl mode. Three edits:
         this entry, the block, the negative control's flags and banner.
     (ak) THE FOLD LIMIT ON THE PAGE (spine-cup-fold, Oct 20 — docs/bloom-
         spine-cup-fold-outcome.md). The petals on the drawn S spine at cup
         0.29, the cup slider stepped by the REAL KEYBOARD (a hand edit — the
         refusal answers trusted events only; a script-written value is a
         loaded state, clamped and told): 0.30 and 0.31 are ACCEPTED with
         nothing held, 0.32 — which would fold the sheet through itself — is
         REFUSED (the slider stays at 0.31, the spine editor's status names
         the fold, the builder holds no petal at the limit); and a cup of 0.6
         written by script is NOT refused but built clamped and told.
         Then on the curl SLIDERS at 270 x cup 1.2, which the build CLAMPS
         and tells (the slider family is never refused): the read-out's SPINE
         CURL line carries FOLD LIMIT with the radius asked and the radius
         built that the BUILDER's own worst record holds. Two mutants under
         --negative-control, each by its own sentence (both bloom.js): the cup
         listener never refusing, and the read-out's fold-limit words gone.
         Three edits: this entry, the block, the negative control's flags and
         banner.
     (al) CURVE SEEDED FROM THE SLIDER SHAPE (curves-sepals, Oct 20 — docs/
         bloom-curves-sepals-outcome.md). A HAND switch (the select focused and
         the option picked by the REAL KEYBOARD — the seed answers trusted
         events only) of the petals' Curl from to CURVE at curl 120 writes a
         curve that is not the default and says it was SEEDED with its fit
         error; switching back to SLIDER leaves the curl sliders exactly as they
         were; the outline's LAW -> CURVE seeds too, and a LATER petal-length
         step leaves the seeded outline alone (the seed does not follow); a
         sepal's Curl from seeds from the SEPAL's own curl; and a curve written
         by script with the mode (a design file's load) keeps its own points.
         Two mutants under --negative-control, each by its own sentence (both
         bloom.js): the seed never written, and the seed re-fitting on every
         later slider step. Three edits: this entry, the block, the negative
         control's flags and banner.
     (am) THE LEAF'S CURVES SEEDED FROM THE LEAF'S OWN SHAPE (curves-leaves,
         Oct 20 — docs/bloom-curves-leaves-outcome.md). A HAND switch of the
         leaf's Curl from to CURVE at Arch 60 writes a curve that is not the
         default, tells it was SEEDED from the Arch slider's spine, and BENDS
         THE TIP DOWN as the positive Arch does (the drawn curve falls toward
         the tip and the built spine turns the same way the arch did — the
         sign the leaf's twin documents); back to SLIDER leaves the Arch
         untouched; the simple blade's LAW -> CURVE seeds from the leaf's law
         outline; a COMPOUND leaf's leaflet outline seeds too. Two mutants
         under --negative-control (both bloom.js): the leaf's spine never
         seeded, and the seed fitted to the arch's MIRROR (the sign flipped).
         Three edits: this entry, the block, the negative control's flags and
         banner.
     (an) THE BRAID'S STRANDS UNDER THE PICKER (the braid session — docs/
         bloom-stamen-braid-outcome.md; Eva's ruling 3, select-and-edit, the
         scope picker reused). At 6 stamens: no bar on an INDEPENDENT coil;
         BRAIDED lists "the bundle" and 6 strands; a pick of strand 4 is a pure
         load; a length edit under it lands on strand 4 ALONE, read off the
         BUILDER's per-stamen lengths, and is told "the bundle + offset"; a
         bundle value (the curl) under the pick is told as the bundle's and
         writes no offset; strand 2 loads its own value; deselect writes
         nothing; INDEPENDENT keeps the record and builds the unscoped coil.
         Two mutants under --negative-control (both bloom.js): the picker
         listing no strands, and every pick binding strand 1. Three edits: this
         entry, the block, the negative control's flags and banner.
     (ao) SURFACE TEXTURE — THE LINE, THE SLIDERS, THE GREYING (T3, Oct 22 —
         docs/bloom-surface-texture-t3-outcome.md; Eva's rulings Q9, Q13). The
         default: no TEXTURE line, the height and size sliders hidden, nothing
         greyed. PEBBLE on: the line carries the petal lattice's own skin count
         against its floor and the height; the sliders show; the INFILL choice is
         GREYED (disabled + `bl-ctrl--disabled`), still shown, its read-out
         naming the texture — restated from the registry's own `enabledWhen` on
         the page's state. BOTH ON: refused with the word infill, NOT BUILT
         told, and NEITHER control greyed (a control that is ON is never greyed,
         or a loaded design with both could never be turned off). The infill
         alone greys the texture choice. The guard OFF with both sliders at
         their maxima: no line, hidden and inert. Two mutants under
         --negative-control (both bloom.js): the greying never applied, and the
         TEXTURE line never printed. Three edits: this entry, the block, the
         negative control's flags and banner.
     (ap) THE UMBEL'S HEAD TOGGLE ON THE PANEL (the umbel session — docs/
         bloom-umbel-outcome.md; Eva's ruling 2). On a 120 mm stem: under a
         RACEME the raceme's nodes show and the umbel's two hide; under an
         UMBEL with the head OFF (its default) the umbel's two show, the
         raceme's hide, the head-only controls (the head's petal count, the
         per-layer values toggle) HIDE, and the Petal section's derived label
         SAYS its controls shape the florets — read back off the summary
         element the page wrote; with the head ON the head-only controls are
         back and the label is "Petal". Two mutants under --negative-control
         (both bloom-registry.js): the label never derived, and the head's
         petal count left visible with the head off. Three edits: this entry,
         the block, the negative control's flags and banner.
     (aq) THE MOPHEAD'S DEPTH ON THE PANEL (the mophead session — docs/
         bloom-mophead-outcome.md; Eva's rulings 1 and 4). On a 120 mm stem:
         under a RACEME the depth control hides; under an UMBEL at depth 1 the
         depth shows and the three ray controls HIDE; at depth 2 they show, the
         depth's read-out names the REDUCED lattice and the FLORET FLOOR, and
         the count's read-out says how many florets were built — read against
         the builder's own record; at the CLAMP CORNER (12 x 12 x 12 petals at
         0.60x) the count's read-out says CLAMPED with the asked and the built
         counts the builder's budget record holds, and the bloom exports (it
         never refuses for this). Two mutants under --negative-control (both
         bloom-registry.js): the rays shown at depth 1, and the clamp never
         told. Three edits: this entry, the block, the negative control's
         flags and banner.
         DEPTH 2'S DEFAULTS (Eva's ruling, Oct 25 — the floor-floret mophead
         is depth 2's default): the registry's overlay is held against the
         ruled values restated in the block; a LOAD to depth 2 writes
         nothing; a HAND switch (the keyboard on the select) writes every
         overlay value still at its registry default, keeps a control the
         route set first and tells both on the depth's read-out; the switch
         back restores the registry defaults. Three mutants (bloom.js): the
         switch writes nothing, a set control is overwritten, a load writes
         the overlay. Still route (aq) — the route count does not move.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, CONTROLS, SECTIONS,
         RETIRED_IDS, DEFAULTS, evalPredicate, predicateDrivers, verifySections,
         SPIRAL_LEGIBLE_COUNT, exportStl, settleBuild, shownModeOf, MIN_FEATURE_MM, FOOT_MIN_WIDTH_MM, footCapRestated, footSpanRestated } from './bloom-harness.mjs';
import { sectionLabel, UMBEL_DEPTH2_DEFAULTS } from '../bloom-registry.js';
import { mirrorPartner } from '../bloom-geometry.js';

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

/* THE GEOMETRY WITNESS for each section that ships collapsed — the control to
   drive, the value to drive it to, and the number in the app's own metrics
   that MUST move as a result. Declared here beside the reason, never sniffed
   from the registry: which quantity a control moves is a fact about the
   geometry, and a gate guessing at it is a gate that passes when the control
   stops working. Every id and value is checked against the registry below, so
   a range change cannot leave this table quietly out of bounds. */
const WITNESS = {
  /* THE TUBE (corolla fusion) — collapsed at first load, witnessed by the
     BUILT panel count and the ring's own triangle count through the builder's
     tube record: the slider holds the ASKED k and the snap decides the built
     one, so the witness reads the builder's answer, never the slider. */
  tube: { id: 'tubeLayer1', value: '2',
          read: (m) => `${m.tube && m.tube.layers[0].k}/${m.tube && m.tube.rings.length ? m.tube.rings[0].ringTris : null}`, what: 'tube.layers[0].k/tube.rings[0].ringTris' },
  /* FUSION (h and BLEND) — a child of Tube, witnessed by the ring's own top
     station and row count, which the fusion height decides and no other
     control writes; it needs a fused whorl to exist, hence the pre. */
  tubeFusion: { id: 'tubeHeight', value: '0.4', pre: [{ id: 'tubeLayer1', value: '0' }],
                read: (m) => `${m.tube && m.tube.rings.length ? m.tube.rings[0].uTop : null}/${m.tube && m.tube.rings.length ? m.tube.rings[0].rows : null}`, what: 'tube.rings[0].uTop/rows' },
  /* THE STEM (session 43) — collapsed at first load, witnessed by the LENGTH
     through the builder's own stem record. The witness reaches PAST the slider
     into the hub: a stem's presence is what makes the hub-to-stem join ACTIVE,
     and the join is a DERIVED thickening with no control of its own, so
     `hubJoinActive` is a reading no stem control can write directly. A witness
     that leaves the control's own part is the stronger one — the `shape` row's
     own reasoning, applied one level down. */
  stem: { id: 'stemLength', value: '60',
          read: (m) => `${m.stem && m.stem.lengthMm}/${m.hubJoinActive}`, what: 'stem.lengthMm/hubJoinActive' },
  /* THE HUB — collapsed at first load, a child of Stem, witnessed by the
     PRONOUNCEDNESS through the builder's own derived reach and blend radius. The
     witness reaches PAST the slider the same way the others do: `hubShapeAmount`
     2 takes the join's `axisDepth` from the derived 2.52 mm to 3.83 and the
     blend radius from 6.92 to 7.95 — both `stemPlan`'s own answers, which the
     amount cannot write directly. The row needs a STEM to hang off (the hub is
     inert without one), which is why the driver sets both. */
  hub: { id: 'hubShapeAmount', value: '2', pre: [{ id: 'stemLength', value: '60' }],
         read: (m) => `${m.stem && m.stem.axisDepth}/${m.hubJoinBlendRadius}`, what: 'stem.axisDepth/hubJoinBlendRadius' },
  /* LEAVES — collapsed at first load, witnessed by the LENGTH through the
     BUILDER's own leaf record. The witness reaches PAST the slider in the same
     way the stem's does: `built` is how many leaves the builder EMITTED, which
     the length control cannot write directly (it is the node count times the
     phyllotaxy's own per-node count, both derived), and `nodeDepthsMm` is the
     node law's answer. A length that moved the slider and built nothing would
     pass a witness that only read the control back. The row needs a STEM to
     hang off, which is why the driver sets both. */
  leaves: { id: 'leafLength', value: '52', pre: [{ id: 'stemLength', value: '70' }],
            read: (m) => `${m.leaf && m.leaf.built}/${m.leaf && m.leaf.nodeDepthsMm.length}`, what: 'leaf.built/leaf.nodeDepthsMm.length' },
  /* THE SERRATION — a drop-down inside Leaves, collapsed at first load;
     witnessed by the tooth DEPTH through the builder's own count of teeth
     CUT, which is 0 at depth 0 (the guard) and the asked count above it. The
     depth cannot write that number: the count is the cut law's own answer on
     the emitted outline. */
  leafSerration: { id: 'leafToothCount', value: '12',
                   pre: [{ id: 'stemLength', value: '70' }, { id: 'leafLength', value: '52' }],
                   /* THE COUNT, NOT THE DEPTH — measured, not assumed. Driving
                      the DEPTH from its default 0.26 to 0.5 leaves the teeth
                      CUT at 9 both times, so that witness read the same number
                      twice and the gate said so. The count moves it 9 -> 10,
                      and the 10 is the cut law's OWN ceiling clamping an asked
                      12, which is a quantity no control can write directly. */
                   read: (m) => `${m.leaf && m.leaf.serration && m.leaf.serration.count}`, what: 'leaf.serration.count' },
  /* THE LEAFLETS (leaf/stem build S3) — a drop-down inside Leaves, collapsed
     at first load and shown only on a COMPOUND leaf. Witnessed by the PAIRS
     through the BUILDER's own tree: how many blades it emitted and how many
     leaflets the first leaf carries, which the slider cannot write directly
     (the count is the layout's answer, and a pairs control that moved the
     slider and built the same leaf would read the same number twice). The row
     needs a stem, a leaf and the COMPOUND type, which is why the driver sets
     all three first. */
  leafLeaflets: { id: 'leafletPairs', value: '4',
                  pre: [{ id: 'stemLength', value: '70' }, { id: 'leafLength', value: '40' }, { id: 'leafType', value: 'COMPOUND' }],
                  read: (m) => `${m.leaf && m.leaf.bladeOf && m.leaf.bladeOf.length}/${m.leaf && m.leaf.compoundBuilt && m.leaf.compoundBuilt[0] ? m.leaf.compoundBuilt[0].leaflets.length : null}`,
                  what: 'leaf.bladeOf.length/leaf.compoundBuilt[0].leaflets.length' },
  /* THE LOBES (leaf/stem build S4) — a drop-down inside Leaves, collapsed at
     first load and shown only on a LOBED leaf. Witnessed by the SINUSES the
     builder measured off its own emitted rows (one gap record per sinus), a
     quantity the slider cannot write: a lobes control that moved the slider
     and built the same blade would read the same count twice. The row needs a
     stem, a leaf and the LOBED type, which the driver sets first. */
  leafLobes: { id: 'lobedLobes', value: '5',
               pre: [{ id: 'stemLength', value: '70' }, { id: 'leafLength', value: '46' }, { id: 'leafType', value: 'LOBED' }],
               read: (m) => `${m.leaf && m.leaf.lobedBuilt && m.leaf.lobedBuilt[0] ? m.leaf.lobedBuilt[0].sinusGaps.sinuses.length : null}`,
               what: 'leaf.lobedBuilt[0].sinusGaps.sinuses.length' },
  /* SEPALS (part 1) — a top-level section after Center, collapsed at first
     load, holding the count and three drop-downs mirroring Petal's. Witnessed
     by the COUNT through the builder's own tally — a count that moved the
     slider and built nothing would pass a witness that only read it back.
     The three children need a whorl present (their guard is the count), which
     is why each driver sets it first: shape through the apex law's exponent
     the sepal blade was actually built with, form through the sepal's own
     metric ratio (the four curves cost no triangles), curl through the ANGLE
     the clamp built — a number the control cannot write directly. */
  sepals: { id: 'sepalCount', value: '5', read: (m) => `${m.sepal && m.sepal.built}`, what: 'sepal.built' },
  /* THE INFLORESCENCE (the raceme session) — a top-level section after Stem,
     collapsed at first load, holding the law enum and the axis's own controls.
     Witnessed by the NODE COUNT through the BUILDER's own tally, which reaches
     PAST the slider twice over: `built` is how many FLORETS were emitted (the
     node count times the phyllotaxy's per-node count, both derived) and
     `pedicelR` is the AREA RULE's answer floored at the print minimum — a
     number `floretNodes` cannot write directly.

     THE VALUE IS THE FLOOR, 1, AND THAT IS MEASURED RATHER THAN CHOSEN FOR
     TIDINESS. Going UP moves `built` and leaves `pedicelR` alone: the area
     rule is already below its floor at the shipping five (6 mm / 2 / sqrt(5)
     = 1.34 against a 1.50 minimum), so eight nodes reads 1.5000 exactly as
     five does and half the witness would be a number printed twice. At ONE
     node the rule is 3.0000 and clears the floor, so both halves move —
     `built` 5 -> 1 and `pedicelR` 1.5 -> 3.0. It needs a RACHIS to hang off,
     which is why the driver sets the stem and the law. */
  /* VARIANCE (organic variance, build 1) — a drop-down inside Arrangement,
     collapsed at first load, holding the size amount and its two gated
     sub-controls. Witnessed by the AMOUNT through two numbers the slider cannot
     write directly: the first emitted petal's slot scale as the BUILDER's own
     product (1 at the guard, 1.5 at ±50% on slot 0 of a 1-cycle wave), and the
     told flag's blade approach, which the field moves as a consequence
     (-1.170 -> -1.134 mm on the shipping whorl) and which is read off the
     emitted laminae rather than off any control. */
  variance: { id: 'varianceSize', value: '0.5',
              read: (m) => `${m.petalSlotSizes && m.petalSlotSizes[0] && m.petalSlotSizes[0].scale}/${m.neighbour && m.neighbour.blade && m.neighbour.blade.skinGapMm}`, what: 'petalSlotSizes[0].scale/neighbour.blade.skinGapMm' },
  /* THE INFILL (the Voronoi infill, S3) — a drop-down inside Petal, collapsed
     at first load, holding the guard and its one gated slider. Witnessed by
     the DENSITY through two numbers the slider cannot write: the count the
     blade ACHIEVED, which is Eva's ruling 3 (density is a REQUEST — the plan
     drops every cell that cannot hold a 1.5 mm hole after the 1.0 mm wall,
     recomputes and repeats), and how many drop passes it took. The witness
     reaches PAST the control's own value in the strongest form this map has:
     an asked 24 achieves SIXTEEN, so the number on the slider and the number in
     the blade are not even close, and a witness that read the control back
     would have read 24 twice. Measured 14/0 at the ruled default against 16/1
     at 24. It needs the GUARD, which is why the driver sets both.
     THE VALUE IS 24 AND NOT THE MAXIMUM, and that is measured rather than
     chosen for tidiness: the achieved count is NOT monotone in the request —
     8/16/24/32/40 asked come out as 8/14/16/15/14 built, because past the point
     where the blade is full the drop takes more cells than the extra seeds add.
     At 40 the achieved count is 14, the SAME as the ruled default's, so half
     this witness would have been a number printed twice — the `leafToothCount`
     row's own finding, in the next entry but one. */
  /* THE TEXTURE (T3) — a drop-down inside Petal, collapsed at first load;
     witnessed by the HEIGHT through the builder's own texture record: the
     petal organ's reliefMaxMm (the largest outward displacement the emitter
     actually applied, which the slider cannot write — at the guard the record
     is null) and its skin-triangle count on the lattice. The row needs the
     guard off, hence the pre. */
  texture: { id: 'textureHeight', value: '1.2', pre: [{ id: 'petalTexture', value: 'PEBBLE' }],
             read: (m) => `${m.texture && m.texture.organs.petal && m.texture.organs.petal.reliefMaxMm}/${m.texture && m.texture.organs.petal && m.texture.organs.petal.skinTris}`, what: 'texture.organs.petal.reliefMaxMm/skinTris' },
  infill: { id: 'infillDensity', value: '24', pre: [{ id: 'petalInfill', value: 'VORONOI' }],
            read: (m) => `${m.infill && m.infill.achieved}/${m.infill && m.infill.passesUsed}`,
            what: 'infill.achieved/infill.passesUsed' },
  inflorescence: { id: 'floretNodes', value: '1',
                   pre: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }],
                   read: (m) => `${m.inflorescence && m.inflorescence.built}/${m.inflorescence && m.inflorescence.pedicelR}`,
                   what: 'inflorescence.built/inflorescence.pedicelR' },
  /* THE FLORET — a drop-down inside Inflorescence, collapsed at first load,
     holding the two controls that describe the FLOWER rather than the
     arrangement. Witnessed by the PETAL COUNT through the floret UNIT's own
     triangle count, which no control writes: the unit is a whole
     `buildBloomInto` and its tally is the builder's answer to what a floret
     costs. It moves 13,888 -> 9,176 between five petals and three. */
  floret: { id: 'floretPetals', value: '3',
            pre: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }],
            read: (m) => `${m.inflorescenceBuilt && m.inflorescenceBuilt.unitTris}`,
            what: 'inflorescenceBuilt.unitTris (the floret unit the builder emitted)' },
  sepalShape: { id: 'sepalTipShape', value: '3', pre: [{ id: 'sepalCount', value: '5' }],
                read: (m) => `${m.sepal && m.sepal.petals[0] && m.sepal.petals[0].tipCap && m.sepal.petals[0].tipCap.shapeN}`, what: 'sepal.petals[0].tipCap.shapeN' },
  sepalForm: { id: 'sepalCup', value: '0.6', pre: [{ id: 'sepalCount', value: '5' }],
               read: (m) => `${m.sepal && m.sepal.petals[0] && m.sepal.petals[0].form && m.sepal.petals[0].form.metricMax}`, what: 'sepal.petals[0].form.metricMax' },
  sepalCurl: { id: 'sepalAngle', value: '-40', pre: [{ id: 'sepalCount', value: '5' }],
               read: (m) => `${m.sepal && m.sepal.limit && m.sepal.limit.angleBuiltDeg}`, what: 'sepal.limit.angleBuiltDeg' },
  shape: { id: 'petalWidth', value: '30',
           /* The silhouette costs no triangles either (fixed-topology grid),
              so width is witnessed where it reaches PAST the blade: footRing()'s
              area rule reads the petal's width, so a wider petal is a wider foot
              and a larger ring. A witness that leaves the control's own part is
              the stronger one. */
           read: (m) => `${m.ringWidth}/${m.ringRadius}`, what: 'ringWidth/ringRadius' },
  /* PETAL (the leaf tip-shape session) — the container holding Petal shape,
     Petal form, Petal curl and Petal roles, collapsed at first load, with no
     control of its own; witnessed through a CHILD's control exactly as
     "Center" is, driven while the container and the child are both shut. The
     child's own row witnesses the child. */
  petal: { id: 'petalWidth', value: '30', read: (m) => `${m.ringWidth}/${m.ringRadius}`, what: 'ringWidth/ringRadius (through the Petal shape child)' },
  form: { id: 'petalCup', value: '0.6',
          /* The four curves cost ZERO triangles by construction, so the count
             cannot be the witness. Cup is the one of the four that stretches
             the material across the width, and the metric ratio is what says
             so: 1.0000 flat, above 1 at any cup. */
          read: (m) => m.petalForm && m.petalForm.metricMax, what: 'petalForm.metricMax' },
  /* LOBES (session 38, PR 2) — a drop-down inside Petal shape, collapsed at
     first load; witnessed by the depth through the BUILDER's own lobe record,
     which reaches past the slider into what the outline was cut to: null at
     the shipping depth of 0 (the section's guard, `lobesEngaged`, is false
     and no record exists), and at 0.5 the count the cut was built with, the
     deepest sinus AS BUILT (the max with the floors applied — a number the
     slider does not hold) and the stations the ladder placed inside the
     window. The count, the coverage and the tip shape are gated on the depth
     (hidden and inert at 0, the curl family's own rule) and are the L family's
     in both STL gates, not this one's. */
  lobes: { id: 'lobeDepth', value: '0.5',
           read: (m) => (m.petalLobes ? `${m.petalLobes.countBuilt}/${m.petalLobes.sinusMinHalfMm.toFixed(6)}/${m.petalLobes.rowsInWindow}` : 'no lobe record'),
           what: "the builder's lobe count / the deepest sinus as built / the stations inside the window" },
  /* THE FRINGE (Eva's ruling, Sep 13) — a drop-down inside Petal shape,
     collapsed at first load, and the one section whose witness needs a
     PRECONDITION for a reason that is the feature itself: the fringe and the
     squared terminal are ONE feature, so at the shipping `petalTipEnd` of 0
     driving the count builds NOTHING (NO ROOM — the blade converges to
     2 x TIP_HALF_MM, which carries one tooth, and one tooth is the petal).
     Driven there the witness would read a refusal, which is a true thing about
     the geometry and a WEAK thing to test reactivity with. So the terminal is
     opened in `pre` and the count is the witness.

     IT REACHES PAST THE SLIDER, twice over. `petalTipSpans` is the EMITTER's
     own tally of how many spans the petal's END carries — a count `trimPanels`
     produces and no control holds — and the tooth width at the tip is a LENGTH
     in millimetres that the slider does not hold either, arrived at through
     the taper's admissible interval. A build that stored the number and split
     the domain anyway, or split it and drew the teeth at the wrong widths, is
     exactly what this must catch. The clamp, NO ROOM, the dead travel and the
     lobe exclusion are the FR family's in both STL gates, not this one's. */
  fringe: { id: 'fringeCount', value: '4',
            pre: [{ id: 'petalTipEnd', value: '1' }],
            read: (m) => (m.petalFringe && m.petalFringe.built
              ? `${m.petalTipSpans}/${m.petalFringe.count}/${m.petalFringe.toothTipMm.toFixed(6)}`
              : 'no fringe built'),
            what: "the emitter's own tip-span tally / the count as built / the tooth's tip width in mm" },
  /* PETAL CURL (session 16) — the spine's own section, collapsed at first
     load; witnessed by spine curl through the builder's own spine record. */
  curl: { id: 'petalSpineCurl', value: '150',
          read: (m) => (m.petalSpine ? `${m.petalSpine.curlRad}/${m.petalSpine.peakRadiusMm.toFixed(6)}` : 'no spine record'),
          what: "the spine record's curl and tightest spine radius" },
  /* HEAD (session 18) — collapsed at first load; witnessed by Head rise
     through the HUB BUILDER's own report, which reaches past the slider into
     the junction: the flat 192-triangle disc becomes the 3,456-triangle
     shell and footRing() declares a cap of its own radius. The enum's own
     transitions (CAP / SPHERE, the 6,720-triangle sphere, the hidden rise)
     are route (m)'s, on one page, in both directions. */
  head: { id: 'headRise', value: '0.5',
          read: (m) => `${m.hubBuilt ? m.hubBuilt.tris : 'no hub'}/${m.hubDome ? m.hubDome.Rd.toFixed(6) : 'flat'}`, what: "the hub builder's triangle count / the cap's radius" },
  /* ANDROECIUM (session 21) — collapsed at first load; witnessed by the count
     through the BUILDER's own free-end tally and the OWNER's disc radius,
     which reach past the slider into what was emitted: 0 / 0 / none at the
     shipping default, 6 / 6 / the area rule's radius at six. The section's
     own transitions (hidden whole under SPHERE, the sub-controls at count 0,
     the read-out's lines and flags, the two inertness clauses) are route
     (o)'s, on one page, in both directions. */
  androecium: { id: 'stamenCount', value: '6',
                read: (m) => `${m.freeEnds}/${m.stamens.length}/${m.androecium ? m.androecium.radius.toFixed(6) : 'none'}`,
                what: "the builder's free-end tally / stamens emitted / the owner's disc radius" },
  /* CENTER (session 23) — the container for the two reproductive parts,
     with no control of its own; witnessed through the androecium's count,
     driven while the container AND the androecium drop-down are both shut
     (the loop below admits a child's control for a section that holds none
     of its own, and only then). */
  center: { id: 'stamenCount', value: '6',
            read: (m) => `${m.freeEnds}/${m.stamens.length}/${m.androecium ? m.androecium.radius.toFixed(6) : 'none'}`,
            what: "the builder's free-end tally / stamens emitted / the owner's disc radius, driven through the shut container" },
  /* TIP (session 29) — the anther's seven, and the FIRST THIRD LEVEL in this
     panel: Tip sits inside Androecium, which sits inside Center, so driving
     this witness exercises a control two containers deep. Its precondition is
     the androecium being present at all (all seven are gated on
     `androeciumPresent`, so with no stamens the witness would be invisible
     and route (d) would refuse to drive it — the vacuity the `pre` mechanism
     exists for).

     THE WITNESS REACHES PAST THE CONTROL'S OWN VALUE. `antherPoints` at 12 is
     read as the emitted TRIANGLE COUNT beside the owner's own lattice: the
     point count's whole job is to change the tessellation, so a build that
     stored the number and revolved through ten sides anyway is exactly what
     this must catch. It is driven at roundedness 0 in the precondition,
     BECAUSE at the shipping roundedness of 1 the control is hidden and inert
     — driving it there would be a witness that must not move, which is route
     (k)'s job and not this one's. */
  antherTip: { id: 'antherPoints', value: '12',
         pre: [{ id: 'stamenCount', value: '6' }, { id: 'antherRoundedness', value: '0' }],
         read: (m) => `${m.liveTris}/${m.androecium ? m.androecium.anther.sides : 'none'}`,
         what: "the emitted triangle count / the owner's own tip lattice, driven through two shut containers" },
  /* THE STIGMA'S TIP (session 30) — the same witness on the other instance:
     the point count at 12 read as the triangle count beside the LOBE's own
     lattice, driven at roundedness 0 with a style present. */
  stigmaTip: { id: 'stigmaPoints', value: '12',
         pre: [{ id: 'gynoecium', value: 'STYLE' }, { id: 'stigmaRoundedness', value: '0' }],
         read: (m) => `${m.liveTris}/${m.gynoecium ? m.gynoecium.lobe.sides : 'none'}`,
         what: "the emitted triangle count / the owner's own stigma lattice, driven through two shut containers" },
  /* THE GYNOECIUM (session 22) — the builder's style record and the owner's
     descriptor; route (p)'s, on one page, in both directions. */
  gynoecium: { id: 'gynoecium', value: 'STYLE',
               read: (m) => `${m.styles.length}/${m.gynoecium ? m.gynoecium.length : 'none'}`,
               what: "styles emitted / the owner's style length" },
  /* NO `center` ENTRY (session 20): the CENTER section and its five controls
     are retired. The witness that stood here (`centerStyle` -> RING, read as
     centerStyle/centerTris) is REPLACED, not deleted silently, by route (n)
     below — the retirement route, which asserts the section and the ids are
     ABSENT from the DOM, the read-out and the metrics, and that no
     executable bloom source still references a retired id. A section that
     ships collapsed and is not in this table fails the path route by name,
     so a resurrected `center` section could not pass quietly either. */
  /* NO `roles`, `labellumGroup`, `hoodGroup` OR `petal1`..`petal9` ENTRY (the
     role retirement, Q3.4): those sections are retired with their controls.
     Their witnesses read the descriptor split and the role records, which no
     longer exist; the per-pair scope's own witness is route (ae), which edits
     a FAN pair through the picker and reads the builder's per-petal record. */
  thickness: { id: 'sheetThickness', value: '2.4',
              /* footRing()'s area rule reads the thickness the solids are
                 actually built at, so a thicker sheet moves the RING RADIUS —
                 the whole arrangement, not a wall. A witness that reaches
                 past the control's own part is the stronger one. */
              read: (m) => `${m.ringThickness}/${m.ringRadius}`, what: 'ringThickness/ringRadius' },
};

const fail = [];
const note = (m) => fail.push(m);
const ok = [];

/* verifySections() has already run at module load (the registry calls it), so
   reaching this line means the relation holds; calling it explicitly makes the
   gate's output say so rather than leaving it implicit in the absence of a
   crash. */
verifySections();
ok.push(`registry: ${SECTIONS.length} sections, ${CONTROLS.length} controls, ${RETIRED_IDS.length} retired ids — relation verified`);

/* ---------------- INSTANCED DESCRIPTOR FAMILIES SHARE ONE SPEC ----------

   A control set that is AUTHORED ONCE AND INSTANCED N TIMES cannot drift
   while it stays generated — but nothing said so, and nothing would notice if
   a tenth row were hand-written beside nine generated ones with a range that
   was nearly the same. The per-petal groups were that shape until the role
   retirement (four descriptors, nine instances, 36 controls); the parametric
   tip's two tips are that shape (Eva's Q7, session 24 — seven descriptors, instanced
   twice with an antherTip / stigmaTip prefix, "so the two tips cannot
   drift"). This clause is the guard THAT sentence needs, and it is added in
   session 3a rather than in 3b for one reason: today it has an instance to
   run on, and a check with no instance is the same untested code a generator
   with no instance would be.

   WHAT IT MEASURES: for each declared family, every instance of a given
   suffix must agree on the fields that ARE shared — kind, bounds, step,
   default, label, tier, role. What is deliberately NOT compared is `fmt`,
   `section` and `visibleWhen`: those are per-instance by design (the
   per-petal read-outs name their own group; a tip's would name its own tip),
   and demanding they match would be asserting the opposite of the design.

   ADDING A FAMILY IS ONE ROW HERE. Not finding one is a FAILURE, not a skip:
   a pattern list that silently matches nothing is this project's
   label-naming-a-computation-nobody-performed defect. */
const INSTANCED_FAMILIES = [
  /* (the per-petal groups were this clause's first family; they are retired
     with the role machinery, Q3.4, so the row is gone and the tip family is
     the clause's oldest instance) */
  /* THE TIP'S SEVEN, INSTANCED TWICE (session 30 — Eva's Q7 landed). The
     partition is STATED HERE, not read from the registry's own table: the
     shared fields are every field but `default` on Lumps and Spread (a count
     and an aim — what makes a trifid a trifid), and the instance count is
     two. A check that read TIP_PER_INSTANCE_DEFAULTS out of the registry
     would be checking the generator against itself. */
  { what: 'the two tips (session 30, anther* and stigma* from one descriptor table)',
    id: /^(anther|stigma)(Size|Elongation|Roundedness|Points|Pinch|Lumps|Spread)$/, instances: 2, perInstanceDefault: new Set(['Lumps', 'Spread']) },
  /* THE SEPAL TWINS (sepals, part 1): every petal shape, form and curl control
     instanced once for the sepals from the geometry's own SEPAL_TWINS table.
     Shared: kind, bounds, step, default, tier. PER-INSTANCE BY DESIGN and
     therefore not compared: the label ("Petal cup" reads "Cup" on a sepal)
     and the role ('petal' against 'sepal'), stated HERE rather than read from
     the table — a check that read the registry's own generator would be
     checking it against itself. */
  { what: 'the sepal twins (sepals part 1, sepal* from SEPAL_TWINS)',
    id: /^(?:petal|sepal|buckle|sepalBuckle|curl|sepalCurl)(BaseTaper|TipShape|TipTaper|CupGradient|Cup|Amp|Freq|Env|ApexSweep|RollTaper|Roll|SpineCurl|Bias|Start|Twist)$/, instances: 2, perInstanceDefault: new Set(), perInstanceLabelAndRole: true,
    /* THE SEPAL-ONLY BOUNDS (Eva's §9.1, Oct 9): the sepal's roll is -180..180
       where the petal's runs -330..330. STATED HERE, not read from the geometry's
       SEPAL_TWIN_BOUNDS — a check that read the table would be checking the
       generator against itself. Each named instance must carry EXACTLY the
       stated bound, must sit INSIDE its sibling's range (a sepal bound only
       narrows), and every other field of the suffix stays shared. */
    perInstanceBounds: { Roll: { sepalRoll: { min: -180, max: 180 } } } },
];
/* NEGATIVE CONTROL for the tip family: drift ONE instance on a shared field
   (the stigma's size range) in a COPY of the rows and require the clause to
   fire. The live registry is never touched. A guard whose firing nobody has
   seen is a guard nobody should quote. */
const familyRows = (fam) => {
  const rows = CONTROLS.map((c) => ({ c: { ...c }, m: fam.id.exec(c.id) })).filter((x) => x.m);
  if (NEGATIVE_CONTROL && /stigma/.test(String(fam.id))) { const r = rows.find((x) => x.c.id === 'stigmaSize'); if (r) r.c.max = r.c.max + 1; }
  /* ...and for the sepal-only bound (§9.1): put sepalRoll's maximum back to
     the petal's 330 in a COPY — the narrowing silently undone must fire. */
  if (NEGATIVE_CONTROL && fam.perInstanceBounds) { const r = rows.find((x) => x.c.id === 'sepalRoll'); if (r) r.c.max = 330; }
  return rows;
};
for (const fam of INSTANCED_FAMILIES) {
  const rows = familyRows(fam);
  if (!rows.length) { note(`no control matches the instanced family ${fam.id} (${fam.what}) — a pattern that matches nothing is a check that measures nothing`); continue; }
  const bySuffix = new Map();
  for (const { c, m } of rows) {
    const suffix = m[m.length - 1];
    if (!bySuffix.has(suffix)) bySuffix.set(suffix, []);
    bySuffix.get(suffix).push(c);
  }
  const boundsOwn = (suffix) => fam.perInstanceBounds && fam.perInstanceBounds[suffix];
  const spec = (c, suffix) => JSON.stringify([c.kind, boundsOwn(suffix) ? '(per-instance)' : c.min ?? null, boundsOwn(suffix) ? '(per-instance)' : c.max ?? null, c.step ?? null, fam.perInstanceDefault.has(suffix) ? '(per-instance)' : c.default, fam.perInstanceLabelAndRole ? '(per-instance)' : c.label, c.tier, fam.perInstanceLabelAndRole ? '(per-instance)' : c.role,
    (c.options || []).map((o) => [o.value, o.label])]);
  const drifted = [];
  for (const [suffix, cs] of bySuffix) {
    if (cs.length !== fam.instances) drifted.push(`"${suffix}" has ${cs.length} instances, the family declares ${fam.instances}`);
    /* A per-instance default is still BOUNDED by the shared range. */
    for (const c of cs) if (fam.perInstanceDefault.has(suffix) && (c.default < c.min || c.default > c.max)) drifted.push(`${c.id} defaults to ${c.default}, outside its own ${c.min}..${c.max}`);
    /* A per-instance BOUND: the named instance carries exactly the stated
       bound, every unnamed one the family's widest, and the named one sits
       inside it. */
    if (boundsOwn(suffix)) {
      const stated = boundsOwn(suffix);
      const named = cs.filter((c) => stated[c.id]), rest = cs.filter((c) => !stated[c.id]);
      if (named.length !== Object.keys(stated).length) drifted.push(`"${suffix}" states a per-instance bound for ${Object.keys(stated).join('/')} and ${named.length} of them exist`);
      for (const c of named) {
        const want = stated[c.id];
        if (c.min !== want.min || c.max !== want.max) drifted.push(`${c.id} spans ${c.min}..${c.max}, the gate states ${want.min}..${want.max}`);
        for (const o of rest) if (c.min < o.min || c.max > o.max) drifted.push(`${c.id} (${c.min}..${c.max}) is not inside ${o.id} (${o.min}..${o.max}) — a per-instance bound may only narrow`);
      }
    }
    const distinct = new Map();
    for (const c of cs) { const k = spec(c, suffix); if (!distinct.has(k)) distinct.set(k, []); distinct.get(k).push(c.id); }
    if (distinct.size > 1) drifted.push(`"${suffix}" has ${distinct.size} distinct specs across its ${cs.length} instances — ${[...distinct.values()].map((ids) => ids.join('/')).join(' vs ')}`);
  }
  const planted = NEGATIVE_CONTROL && (/stigma/.test(String(fam.id)) ? 'stigmaSize\'s range was drifted' : fam.perInstanceBounds ? 'sepalRoll\'s narrowed maximum was put back to 330' : null);
  if (drifted.length) { if (planted) ok.push(`NEGATIVE CONTROL: the instanced-family clause fired when ${planted} — ${drifted.join('; ')}`); else note(`instanced descriptors have DRIFTED in ${fam.what}: ${drifted.join('; ')}`); }
  else if (planted) note(`NEGATIVE CONTROL: ${planted} in a copy of the rows and the instanced-family clause did NOT fire — the anti-drift witness measures nothing`);
  else ok.push(`instanced descriptors agree: ${fam.what} — ${bySuffix.size} descriptors x ${[...bySuffix.values()][0].length} instances = ${rows.length} controls, one spec each (bounds${fam.perInstanceBounds ? ` except ${Object.values(fam.perInstanceBounds).flatMap((o) => Object.entries(o).map(([id, b]) => `${id} ${b.min}..${b.max}`)).join(', ')}, per-instance by declaration` : ''}, step, default${fam.perInstanceDefault.size ? ` except ${[...fam.perInstanceDefault].join('/')}, per-instance by declaration` : ''}, label, tier, role; fmt / section / visibleWhen are per-instance by design and are not compared)`);
}

/* ---------------- (s) THE NESTING RELATION, AT ANY DEPTH ----------------

   Session 3a lifted the two-level bound in verifySections(). Everything that
   walks the section tree is depth-general or was made so with it, and this
   route is what says so rather than a comment claiming it.

   IT NEEDS NO --negative-control MUTATION, AND THAT IS THE POINT. Four of its
   six cases are MUST-FAILs: they hand verifySections() a section array whose
   answer is written down and require it to throw. They run on EVERY
   invocation, not only under the flag, so this route carries its own positive
   control the way the flower project's clipper checks do — a written-down
   shape beats a mutation of the live tree, because on the live tree a wrong
   answer about depth 3 is unobservable (nothing here is three deep yet).

   THE LIVE TREE IS SHALLOW AND THAT IS DECLARED, NOT HIDDEN. Today's panel is
   two levels; the depth-3 claims below are made on synthetic arrays, and the
   two depth-general expressions that reach the real DOM (the descendant test
   and the on-screen walk) are pinned to the one-level expressions they replace
   ON THIS TREE, so the generalisation is measured to change no answer that
   exists. What it does at depth 3 is the synthetic half's business. */
const parentOfSec = new Map(SECTIONS.map((s) => [s.id, s.parent ?? null]));
/* Depth-general ancestry over the registry — the one owner for both this
   route and the witness-through-a-descendant test below. */
const ancestry = (id) => { const out = []; let p = parentOfSec.get(id); while (p) { out.push(p); p = parentOfSec.get(p); } return out; };
const descends = (id, ofId) => ancestry(id).includes(ofId);
const declaredDepth = (id) => ancestry(id).length;
let screenAgreed = 0;
{
  const sec = (id, parent) => ({ id, label: id, open: false, ...(parent ? { parent } : {}) });
  /* The fixture control carries `visibleWhen: { all: [] }` — the registry's
     own "never gated" sentinel — because verifySections() now refuses a
     control without one, and a fixture that is not the shape a real control
     carries would fail these six cases for a reason none of them is about.
     Two of the four MUST-FAILs check the refusal's WORDING; the other two
     only check that it threw, so a fixture defect there would have read as
     the case passing. */
  const ctl = (id, section) => ({ id, section, kind: 'slider', min: 0, max: 1, step: 1, default: 0, label: id, tier: 'standard', role: 'petal', visibleWhen: { all: [] } });
  const threw = (what, controls, sections) => {
    try { verifySections(controls, sections); return null; } catch (e) { return String(e.message); }
  };
  /* MUST PASS — three levels, each declared immediately after its parent, the
     leaf holding the only control. This is the structure the old bound
     refused by name, and the whole reason this route exists. */
  {
    const secs = [sec('a'), sec('b', 'a'), sec('c', 'b')];
    const m = threw('three levels', [ctl('x', 'c')], secs);
    if (m) note(`[nesting] a three-level section tree is REFUSED: ${m}`);
    else ok.push('[nesting] three levels declared parent-first, the leaf holding the only control, is accepted — the two-level bound is gone');
  }
  /* MUST PASS — a mid-level container holding only another container. This is
     what the witness-through-a-DESCENDANT fix below is for: at depth 3 the
     middle section has no control of its own and no direct child with one. */
  {
    const secs = [sec('a'), sec('b', 'a'), sec('c', 'b')];
    const m = threw('empty middles', [ctl('x', 'c')], secs);
    if (!m) ok.push('[nesting] a container whose only content is another container satisfies the "holds something" rule at depth 3');
  }
  /* MUST FAIL — a child declared BEFORE its parent. The convention nothing
     checked until session 3a: it passed the old verifySections() and threw in
     bloom.js on `sectionEls[s.parent]` being undefined. */
  {
    const secs = [sec('b', 'a'), sec('a')];
    const m = threw('child first', [ctl('x', 'b'), ctl('y', 'a')], secs);
    if (!m) note('[nesting] a section declared BEFORE its parent is ACCEPTED — the backwards walk in applyVisibility() and the DOM append both need the parent first');
    else if (!/before its parent/.test(m)) note(`[nesting] a child-before-parent array failed for the wrong reason: ${m}`);
    else ok.push('[nesting] a section declared before its parent is refused by name — the ordering the app was leaning on is now checked');
  }
  /* MUST FAIL — a two-section cycle. Unreachable under the old depth clause
     only because both members were "nested under something nested"; the
     precedence check refuses it outright, at any length. */
  {
    const secs = [sec('a', 'b'), sec('b', 'a')];
    const m = threw('cycle', [ctl('x', 'a'), ctl('y', 'b')], secs);
    if (!m) note('[nesting] a parent cycle is ACCEPTED — the panel build would recurse or drop a section');
    else ok.push('[nesting] a two-section parent cycle is refused');
  }
  /* MUST FAIL — a section parented to itself. */
  {
    const secs = [sec('a', 'a')];
    const m = threw('self', [ctl('x', 'a')], secs);
    if (!m) note('[nesting] a section naming ITSELF as its parent is ACCEPTED');
    else if (!/its own parent/.test(m)) note(`[nesting] a self-parented section failed for the wrong reason: ${m}`);
    else ok.push('[nesting] a section naming itself as its parent is refused by name');
  }
  /* MUST FAIL — a parent that is not in SECTIONS at all (the clause that
     survived the lift unchanged; asserted so the rewrite cannot have dropped
     it while the new clauses were being written). */
  {
    const secs = [sec('a'), sec('b', 'nosuch')];
    const m = threw('missing', [ctl('x', 'a'), ctl('y', 'b')], secs);
    if (!m) note('[nesting] a section naming a parent that is not in SECTIONS is ACCEPTED');
    else ok.push('[nesting] a section naming a parent that is not in SECTIONS is refused');
  }
  /* THE LIVE TREE, described rather than assumed: how deep it actually is, so
     a reader knows which of the claims above are exercised by the shipped
     registry and which are synthetic. */
  const depths = SECTIONS.map((s) => declaredDepth(s.id));
  ok.push(`[nesting] the shipped panel is ${Math.max(...depths) + 1} levels deep — ${SECTIONS.filter((s) => !s.parent).length} top-level sections, ${SECTIONS.filter((s) => s.parent).length} nested; every depth-3 claim above is on a written-down array, never on this one`);
}

const { server, port } = await serveRepo();
const { browser, page } = await launchPage();
await openBloom(page, port);

/* ---------------- (a) the render census ---------------- */
const census = await page.evaluate(({ controls, sections, retired, breakIt }) => {
  if (breakIt) {
    /* NEGATIVE CONTROL, route (a): a control that declares itself, builds,
       exports, and cannot be reached. Removing the WRAPPER (not the input)
       is the realistic shape — a generator loop that appended to the wrong
       parent leaves exactly this. */
    document.getElementById('petalTwist').closest('.bl-ctrl').remove();
  }
  const root = document.getElementById('panelControls');
  const out = { sections: [], controls: [], strayInputs: [], straySpans: [] };
  for (const el of root.querySelectorAll('details')) {
    /* HOW DEEP THE DOM ACTUALLY PUT IT — counted, never inferred from the
       `--sub` class or from `dataset.parent`, both of which the generator
       writes from the same field the registry declares and so cannot
       disagree with it. The ancestor chain is the independent quantity: it
       is where the element was APPENDED. */
    let depth = 0;
    for (let a = el.parentElement; a && root.contains(a); a = a.parentElement) if (a.tagName === 'DETAILS') depth++;
    out.sections.push({ id: el.dataset.section, open: el.open, hidden: el.hidden, depth,
                        parent: el.parentElement.closest('details')?.dataset.section ?? null,
                        summary: el.querySelector('summary')?.textContent ?? null });
  }
  for (const c of controls) {
    const all = root.querySelectorAll(`#${CSS.escape(c.id)}`);
    const el = all[0] || null;
    const wrap = el ? el.closest('.bl-ctrl') : null;
    const sec = wrap ? wrap.closest('details') : null;
    out.controls.push({
      id: c.id,
      count: all.length,
      wrappers: wrap ? root.querySelectorAll(`.bl-ctrl > label[for="${c.id}"]`).length : 0,
      valSpans: wrap ? wrap.querySelectorAll('.bl-val').length : 0,
      labels: wrap ? wrap.querySelectorAll('label').length : 0,
      section: sec ? sec.dataset.section : null,
      hidden: wrap ? wrap.hidden : null,
      /* Position of this control's wrapper among the control wrappers of its
         own section — the within-section order, read from the DOM. */
      indexInSection: sec ? [...sec.querySelectorAll(':scope > .bl-ctrl')].indexOf(wrap) : -1,
    });
  }
  /* Nothing in the panel that the registry does not declare. */
  const known = new Set(controls.map((c) => c.id));
  /* A CURVE control's element is its `.bl-curve` host (F3-global): the inputs
     INSIDE it (its mode select) are the editor's own, not registry controls. */
  for (const el of root.querySelectorAll('input, select, .bl-curve')) if (!el.closest('.bl-curve') || el.classList.contains('bl-curve')) if (!known.has(el.id)) out.strayInputs.push(el.id || '(no id)');
  for (const sp of root.querySelectorAll('.bl-val')) {
    const w = sp.closest('.bl-ctrl');
    const id = w ? w.querySelector('input, select, .bl-curve')?.id : null;
    if (!id || !known.has(id)) out.straySpans.push(id || '(orphan)');
  }
  out.retiredPresent = retired.filter((id) => !!document.getElementById(id));
  out.sectionOrder = out.sections.map((s) => s.id).join('>');
  out.declaredOrder = sections.map((s) => s.id).join('>');
  return out;
}, { controls: CONTROLS.map((c) => ({ id: c.id })), sections: SECTIONS.map((s) => ({ id: s.id })),
     retired: RETIRED_IDS, breakIt: NEGATIVE_CONTROL });

/* Sections: one each, in order, at the declared first-load openness. */
if (census.sectionOrder !== census.declaredOrder) {
  note(`section order in the DOM is "${census.sectionOrder}", registry declares "${census.declaredOrder}"`);
} else ok.push(`sections render once each, in registry order: ${census.declaredOrder}`);
/* THE NESTING, AS BUILT, AGAINST THE NESTING AS DECLARED (session 3a, with
   the two-level bound lifted). The order comparison above is what makes the
   DOM's document order equal the array's — it is a pre-order walk at any
   depth, which is the whole reason the census needed no change to survive the
   lift. What it CANNOT see is a nested drop-down appended into the wrong
   ancestor: `querySelectorAll('details')` would still return it in the same
   place if it were appended one level too high or too low next to its sibling.
   So the tree itself is compared, element by element: the ancestor a section
   was actually appended into, and how many `<details>` stand above it. */
{
  const wrong = [];
  for (const s of SECTIONS) {
    const r = census.sections.find((x) => x.id === s.id);
    if (!r) continue;
    const wantParent = s.parent ?? null;
    const wantDepth = declaredDepth(s.id);
    if (r.parent !== wantParent || r.depth !== wantDepth) {
      wrong.push(`"${s.id}" sits ${r.depth} deep inside ${r.parent ?? 'the panel root'}, the registry declares ${wantDepth} deep inside ${wantParent ?? 'the panel root'}`);
    }
  }
  if (wrong.length) note(`the panel's nesting does not match the registry's: ${wrong.join('; ')}`);
  else ok.push(`every section is appended into the ancestor the registry declares, at the declared depth (max ${Math.max(...census.sections.map((r) => r.depth))} — ${census.sections.filter((r) => r.depth > 0).length} nested)`);
}
for (const s of SECTIONS) {
  const rendered = census.sections.filter((r) => r.id === s.id);
  if (rendered.length !== 1) { note(`section "${s.id}" renders ${rendered.length} times, expected exactly 1`); continue; }
  if (rendered[0].open !== s.open) note(`section "${s.id}" first-load open=${rendered[0].open}, registry declares open=${s.open}`);
  if (rendered[0].summary !== sectionLabel(s, DEFAULTS)) note(`section "${s.id}" summary reads "${rendered[0].summary}", registry declares "${sectionLabel(s, DEFAULTS)}" at DEFAULTS`);
}
ok.push('first-load open state matches the registry literal for every section: '
  + SECTIONS.map((s) => `${s.id}=${s.open ? 'open' : 'closed'}`).join(' '));

/* Controls: exactly once, right section, right order, predicate agreement. */
const byId = Object.fromEntries(census.controls.map((r) => [r.id, r]));
const expectedIndex = {};
for (const s of SECTIONS) {
  CONTROLS.filter((c) => c.section === s.id).forEach((c, i) => { expectedIndex[c.id] = i; });
}
let censused = 0;
for (const c of CONTROLS) {
  const r = byId[c.id];
  if (r.count !== 1) { note(`control "${c.id}" renders ${r.count} times in the panel, expected exactly 1`); continue; }
  if (r.labels !== 1) note(`control "${c.id}" carries ${r.labels} labels, expected exactly 1`);
  if (r.valSpans !== 1) note(`control "${c.id}" carries ${r.valSpans} read-out spans, expected exactly 1`);
  if (r.section !== c.section) note(`control "${c.id}" renders in section "${r.section}", declares "${c.section}"`);
  if (r.indexInSection !== expectedIndex[c.id]) {
    note(`control "${c.id}" is at position ${r.indexInSection} within "${r.section}", registry order puts it at ${expectedIndex[c.id]}`);
  }
  /* The DECLARATION tied to the DOM: the wrapper's hidden must be exactly
     what this control's own predicate says at the state under test. */
  const want = !evalPredicate(c.visibleWhen, DEFAULTS);
  if (r.hidden !== want) note(`control "${c.id}" wrapper hidden=${r.hidden}, its predicate at DEFAULTS says hidden=${want}`);
  censused++;
}
if (censused === CONTROLS.length) ok.push(`all ${CONTROLS.length} controls render exactly once, in the declared section, in registry order, agreeing with their own predicate`);
if (census.strayInputs.length) note(`panel contains input(s) no registry control declares: ${census.strayInputs.join(', ')}`);
if (census.straySpans.length) note(`panel contains orphan read-out span(s): ${census.straySpans.join(', ')}`);
if (census.retiredPresent.length) note(`retired id(s) present in the DOM: ${census.retiredPresent.join(', ')}`);

/* A section is hidden iff every control in it is hidden AND every child
   section is — the derived rule, checked against the DOM rather than trusted
   from the code that wrote it. The child clause is what a parent holding only
   drop-downs needs: "Petal roles" has three controls of its own, all hidden at
   one whorl, and is on screen because its two rosette groups are. */
/* THE CAPTIONS A PARENT HOLDS — one per distinct hiddenReason object among its
   children (the registry declares a reason once and references it from every
   section that hides for it). A caption is predicted visible exactly when its
   `when` holds AND every section naming it is hidden. */
const captionsOf = (parentId) => {
  const seen = new Map();
  for (const x of SECTIONS) {
    if (x.parent !== parentId || !x.hiddenReason) continue;
    if (!seen.has(x.hiddenReason)) seen.set(x.hiddenReason, []);
    seen.get(x.hiddenReason).push(x.id);
  }
  return [...seen].map(([reason, sections]) => ({ reason, sections }));
};
const captionWantHidden = (cap, state, sectionHidden) => !(evalPredicate(cap.reason.when, state) && cap.sections.every((id) => sectionHidden(id) === true));
const wantSectionHidden = (secId, controlHidden, sectionHidden, captionHidden = () => true) => {
  const members = CONTROLS.filter((c) => c.section === secId);
  const kids = SECTIONS.filter((x) => x.parent === secId);
  return members.every((c) => controlHidden(c.id) === true) && kids.every((k) => sectionHidden(k.id) === true)
    && captionsOf(secId).every((cap) => captionHidden(cap) === true);
};
for (const s of SECTIONS) {
  const rendered = census.sections.find((r) => r.id === s.id);
  const want = wantSectionHidden(s.id, (id) => byId[id].hidden, (id) => census.sections.find((r) => r.id === id)?.hidden,
    (cap) => captionWantHidden(cap, DEFAULTS, (id) => census.sections.find((r) => r.id === id)?.hidden));
  if (rendered && rendered.hidden !== want) {
    note(`section "${s.id}" hidden=${rendered.hidden}, but "every member control and child section hidden" is ${want}`);
  }
}
ok.push('every section\'s hidden state equals "every control in it, and every child section, is hidden"');

/* ---------------- the accordion, and the collapse invariant ----------------

   THE PANEL OPENS AT MOST ONE SECTION. Three things are asserted, and the
   third is the one a careless version would omit:
     A1  at first load EXACTLY the section the registry declares is open;
     A2  opening any section — through a REAL click on its summary, the
         visitor's own route — leaves exactly that one open;
     A3  closing the open one leaves ZERO open and nothing springs open by
         itself, because "every section shut" is a state a visitor reaches and
         the registry is allowed to declare.

   EVERY ACCORDION ASSERTION AWAITS A FRAME, and that is a measured
   requirement rather than caution. `toggle` is QUEUED, not synchronous: two
   programmatic opens in one tick both land and the handler settles afterwards.
   A gate reading exclusivity synchronously would fail on correct code, which
   is the shape of a check that gets "fixed" by weakening the app.

   THE COLLAPSE INVARIANT IS NOW MEASURED ACROSS THE TRAVERSAL, not against an
   all-expanded state — under the accordion there is no all-expanded state to
   measure, and asserting one would be asserting something about a panel that
   cannot exist. Instead: the app's whole state snapshot and its geometry must
   be identical with every section shut and at every step of opening all five
   in turn. Collapse and the accordion are presentation; readUI, the export
   path and the gates cannot see either. */
const accordion = await page.evaluate(async ({ ids, declared, breakIt }) => {
  if (breakIt) {
    /* NEGATIVE CONTROL, the accordion route: the exclusive-open handler is
       never REACHED. `toggle` does not bubble, so the handler is a capture
       listener on the panel root; a capture listener registered later on the
       DOCUMENT still runs earlier (capture descends), and stopPropagation
       there means the panel's own listener never sees a toggle. That is the
       same defect shape as declarations-right / app-doesn't-react, aimed at
       the accordion: the sections still open and close, and nothing closes
       the others. */
    document.addEventListener('toggle', (e) => e.stopPropagation(), true);
  }
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const openNow = () => ids.filter((id) => document.getElementById(`sec-${id}`).open);
  const out = { steps: [], states: [], geometry: [] };
  const snap = () => {
    const m = window.__bloomMetrics();
    out.states.push(JSON.stringify(window.__bloomUIState()));
    out.geometry.push(`${m.liveTris}/${m.ringRadius}`);
  };

  out.firstLoad = openNow();
  out.declared = declared;
  out.lastOpened = null;
  snap();

  /* A2 — every section, opened the way a visitor opens it.

     THE ORDER IS NOT THE REGISTRY'S, and the reason is a real trap: clicking
     a summary TOGGLES. The section that starts open would be CLOSED by its
     own click, so a naive walk down SECTIONS tests the wrong transition on
     exactly one row — and reports the panel broken when it is correct. The
     initially-open section is moved to the END, where the accordion has since
     closed it, so every click in this walk is an OPENING and all five are
     exercised as transitions. The `if (!det.open)` guard keeps that true even
     if the starting state ever changes. */
  const startOpen = openNow();
  const order = [...ids.filter((id) => !startOpen.includes(id)), ...ids.filter((id) => startOpen.includes(id))];
  out.order = order;
  for (const id of order) {
    const det = document.getElementById(`sec-${id}`);
    const before = openNow();
    if (!det.open) {
      document.querySelector(`#sec-${id} > summary`).click();
      await frame();
    }
    out.steps.push({ opened: id, before, open: openNow(), clicked: true });
    snap();
  }
  /* A3 — close the section the walk ended on; nothing may spring open in its
     place. It is the LAST-OPENED one rather than "the only open one", because
     with nesting its ancestors are legitimately open beside it — and closing
     an ancestor instead would be a different transition from the one this
     clause is about. */
  out.lastOpened = order[order.length - 1];
  const lastDet = document.getElementById(`sec-${out.lastOpened}`);
  if (lastDet && lastDet.open) {
    document.querySelector(`#sec-${out.lastOpened} > summary`).click();
    await frame();
  }
  out.afterClosingLast = openNow();
  snap();
  return out;
}, { ids: SECTIONS.map((x) => x.id), declared: SECTIONS.filter((x) => x.open).map((x) => x.id), breakIt: NEGATIVE_CONTROL });

if (JSON.stringify(accordion.firstLoad) !== JSON.stringify(accordion.declared)) {
  note(`at first load the open sections are [${accordion.firstLoad.join(', ')}], the registry declares [${accordion.declared.join(', ')}]`);
} else {
  ok.push(`accordion A1: at first load exactly the declared section is open [${accordion.declared.join(', ') || 'none'}]`);
}
/* THE RULE IS EXCLUSIVITY AMONG SIBLINGS (Eva, Sep 3), which is the rule this
   panel has always had, stated one level more generally so nesting falls out
   of it. At the top level a section's siblings ARE the other top-level
   sections, so this is the old assertion verbatim there; inside "Petal roles",
   opening Petal 4 must close Petal 2 and must LEAVE THE PARENT OPEN — a child
   whose opening closed its own parent would be a panel that cannot be used.

   THE OLD FORM SAID "exactly one open in the whole panel" and CI failed 11
   rows on it the moment the sections nested. That was the gate's expectation
   going stale against a ruling, for the second time on this branch — the same
   shape as ROLES_COMBOS. What is asserted now is stronger, not looser: every
   sibling group is checked, so a nested set that failed to be exclusive would
   fire here even though the old clause had nothing to say about it. */
/* ONE OWNER FOR THE ANCESTOR WALK (session 3a). This route used to build its
   own `parentOf` map and its own while loop beside route (s)'s — two
   computations of one relation, which is the registration failure this project
   has cleaned up three times, in a file that asserts the rule. `ancestry` is
   declared once at route (s) and read here. */
const ancestorsOf = ancestry;
/* EFFECTIVELY OPEN — open, AND every ancestor open too. The distinction is not
   pedantry and the gate found it: closing "Petal roles" does not reset the
   petal drop-down open inside it (that is what `<details>` does, and it is
   what makes the panel remember where you were), so the raw open set can hold
   a section no visitor can see. Asserting over the raw set would demand the
   app forget that state — the assertion writing a behaviour rather than
   checking one. What a visitor experiences is the reachable set, so that is
   what is asserted. */
const effectivelyOpen = (open) => open.filter((id) => ancestorsOf(id).every((a) => open.includes(a)));
let exclusive = true;
for (const st of accordion.steps) {
  /* What should be REACHABLY open after opening `id`: the section itself plus
     every ancestor, and nothing else — EXCEPT what the section itself REMEMBERS.
     A `<details>` left open inside a parent that was then shut stays open, and
     the paragraph above accepts that as the panel remembering where you were;
     re-opening the parent makes that child reachable again, which is the SAME
     memory seen from the other side. So a DESCENDANT of the opened section that
     was already raw-open before this click is expected, not extra. It first
     arose here when Arrangement — the one section that ships open, and is
     therefore walked LAST — gained a child (Variance, organic variance build
     1): the walk had opened Variance inside it, a sibling's click shut
     Arrangement with Variance remembered, and the final re-open showed both.
     Siblings stay exclusive: nothing outside the opened section's own subtree
     is admitted, and the `before` set is the page's own, read before the click. */
  const descendantsRemembered = st.before.filter((id) => id !== st.opened && ancestorsOf(id).includes(st.opened) && ancestorsOf(id).every((a) => a === st.opened || st.before.includes(a) || ancestorsOf(st.opened).includes(a)));
  const want = new Set([st.opened, ...ancestorsOf(st.opened), ...descendantsRemembered]);
  const seen = effectivelyOpen(st.open);
  const extra = seen.filter((id) => !want.has(id));
  const missing = [...want].filter((id) => !seen.includes(id));
  if (extra.length || missing.length) {
    exclusive = false;
    note(`accordion A2: opening "${st.opened}" left [${st.open.join(', ')}] open`
      + (extra.length ? ` — ${extra.join(', ')} should have closed (a drop-down closes its SIBLINGS)` : '')
      + (missing.length ? ` — ${missing.join(', ')} should have stayed open (an open child inside a shut parent is unreachable)` : ''));
  }
}
if (exclusive) ok.push(`accordion A2: opening each of the ${accordion.steps.length} sections by a real summary click left exactly that one plus its ancestors open, every time (walk order ${accordion.order.join(' > ')} — the initially-open section last, so every click is an opening)`);
/* A3 — closing the last-opened section. What may remain is its ANCESTORS: the
   walk ends on a nested section, and closing a child does not close its
   parent. Nothing else may be open, and nothing may spring open. */
{
  const allowed = new Set(ancestorsOf(accordion.lastOpened));
  const sprang = effectivelyOpen(accordion.afterClosingLast).filter((id) => !allowed.has(id));
  if (sprang.length) {
    note(`accordion A3: closing the open section left [${sprang.join(', ')}] open — nothing may spring open by itself`);
  } else {
    ok.push(`accordion A3: closing the open section leaves only its ancestors [${[...allowed].join(', ') || 'none'}] open, and nothing springs open in its place`);
  }
}

const stateSet = new Set(accordion.states);
const geoSet = new Set(accordion.geometry);
if (stateSet.size !== 1) note(`the app's state snapshot CHANGED across the accordion traversal (${stateSet.size} distinct states) — collapse is reaching readUI`);
if (geoSet.size !== 1) note(`the geometry MOVED across the accordion traversal (${geoSet.size} distinct live tris / ring radius) — collapse is reaching the model`);
if (stateSet.size === 1 && geoSet.size === 1) {
  ok.push(`collapse invariant: whole-state snapshot and geometry identical across all ${accordion.states.length} accordion states (${[...geoSet][0].split('/')[0]} tris live, ring ${Number([...geoSet][0].split('/')[1]).toFixed(2)} mm)`);
}

/* ---------------- nothing in the gates depends on a section being open ----

   THE PROPERTY THE WHOLE GROUPING RESTS ON, asserted BEHAVIOURALLY rather
   than by scanning source for `.click(`. applyConfig() sets values through
   `page.evaluate` with real events and never clicks a control, so a shut
   section is invisible to it — but "the harness does not click" is a claim
   about code, and the claim that matters is about behaviour. So: shut EVERY
   section, then drive one control from EVERY section at once through the
   harness's own applyConfig, and require its read-back AND the full-registry
   fullStateDrift to come back clean. If the accordion could ever reach the
   gates, this is the row that goes red, and it uses the gates' own functions
   rather than a copy of them. */
await openBloom(page, port);
await page.evaluate(() => {
  document.querySelectorAll('#panelControls details').forEach((d) => { d.open = false; });
});
await page.waitForTimeout(120);
const acrossSections = SECTIONS.map((sec) => {
  const c = CONTROLS.find((x) => x.section === sec.id && x.kind === 'slider' && !x.visibleWhen.id);
  return c ? { id: c.id, value: String(c.max) } : null;
}).filter(Boolean);
const shutBad = await applyConfig(page, acrossSections);
const shutDrift = await fullStateDrift(page, acrossSections);
const stillShut = await page.evaluate(() => [...document.querySelectorAll('#panelControls details')].filter((d) => d.open).length);
if (shutBad.length) note(`with every section shut, applyConfig failed read-back: ${shutBad.join('; ')}`);
if (shutDrift.length) note(`with every section shut, the state is not DEFAULTS+set: ${shutDrift.join('; ')}`);
if (stillShut !== 0) note(`setting values through the harness OPENED ${stillShut} section(s) — the gates must not depend on, or disturb, the accordion`);
if (!shutBad.length && !shutDrift.length && stillShut === 0) {
  ok.push(`with ALL sections shut, the harness set ${acrossSections.length} controls — one from every section (${acrossSections.map((x) => x.id).join(', ')}) — and both the read-back and the full-registry drift check came back clean, with every section still shut`);
}

/* ---------------- (b) reactivity through a CLOSED section ---------------- */
/* ---------------- (a3) WHICH SECTIONS AND CONTROLS A VISITOR ACTUALLY SEES
     AT FIRST LOAD — asserted in BOTH directions, on the DOM rather than on
     the predicates (session B, Sep 2).

     WHY IT EXISTS AS ITS OWN ASSERTION. The declaration route already checks
     every wrapper's `hidden` against its own predicate, which is the general
     property. This is the SPECIFIC claim the session's panel story rests on,
     and a session B design report managed to state it BOTH WAYS in one
     document — the Petal roles section visible at first load in one paragraph
     and hidden in another. That was settled by evaluating the predicate, and
     a claim settled by evaluation should be settled by the gate from then on,
     or the next reader is back to reading two paragraphs. Shown AND hidden are
     different assertions (the flower's doesn't-leak-in / does-show-all rule),
     so both are listed and both are checked. */
{
  await openBloom(page, port);
  const seen = await page.evaluate(() => ({
    sections: [...document.querySelectorAll('#panelControls details')].map((d) => ({ id: d.id.replace(/^sec-/, ''), hidden: d.hidden, open: d.open })),
    shown: [...document.querySelectorAll('.bl-ctrl')].filter((w) => !w.hidden).map((w) => w.querySelector('input, select, .bl-curve').id),
  }));
  const wantShown = CONTROLS.filter((c) => evalPredicate(c.visibleWhen, DEFAULTS)).map((c) => c.id);
  const wantHidden = CONTROLS.filter((c) => !evalPredicate(c.visibleWhen, DEFAULTS)).map((c) => c.id);
  const missing = wantShown.filter((id) => !seen.shown.includes(id));
  const leaked = wantHidden.filter((id) => seen.shown.includes(id));
  if (missing.length) note(`at first load these controls should be visible and are not: ${missing.join(', ')}`);
  if (leaked.length) note(`at first load these controls should be hidden and are visible: ${leaked.join(', ')}`);
  /* Predicted from the PREDICATES (not from the DOM's own answers), children
     first so a parent's prediction reads its children's predictions. */
  const predHidden = {};
  for (let i = SECTIONS.length - 1; i >= 0; i--) {
    const sec = SECTIONS[i];
    predHidden[sec.id] = wantSectionHidden(sec.id, (id) => !evalPredicate(CONTROLS.find((c) => c.id === id).visibleWhen, DEFAULTS), (id) => predHidden[id],
      (cap) => captionWantHidden(cap, DEFAULTS, (id) => predHidden[id]));
  }
  for (const sec of seen.sections) {
    if (sec.hidden !== predHidden[sec.id]) {
      note(`at first load section "${sec.id}" is ${sec.hidden ? 'hidden' : 'shown'}, but ${predHidden[sec.id] ? 'every one of its controls and child sections is hidden' : 'it has at least one visible control or child section'} — a section is hidden iff every control and child in it is`);
    }
  }
  if (!missing.length && !leaked.length) {
    ok.push(`first load: ${seen.shown.length} of ${CONTROLS.length} controls visible, ${wantHidden.length} hidden, every section hidden iff empty of visible controls and child sections`);
    /* (the "Petal roles" first-load line went with the section, Q3.4) */
  }
}

const closed = SECTIONS.filter((s) => !s.open);
if (!closed.length) note('no section ships collapsed, so the path route has nothing to drive — the reactivity assertion would be vacuous');
for (const s of closed) {
  const w = WITNESS[s.id];
  if (!w) { note(`section "${s.id}" ships collapsed but names no geometry witness in WITNESS — the reactivity assertion for it would be vacuous`); continue; }
  const c = CONTROLS.find((x) => x.id === w.id);
  /* The witness table is checked against the registry rather than trusted:
     an id that moved section, or a value a later range change put out of
     bounds, would otherwise make this assertion quietly measure nothing. */
  if (!c) { note(`WITNESS for "${s.id}" names control "${w.id}", which is not in the registry`); continue; }
  /* A CONTAINER IS WITNESSED THROUGH A DESCENDANT (session 23; made
     depth-general in session 3a with the nesting bound). "Center" holds no
     control of its own — only its two parts as drop-downs — so its witness is
     a control inside one of them, driven while the container and the child are
     BOTH shut; the child's own row in this loop witnesses the child. A section
     WITH controls of its own must still be witnessed by one of them, so a
     witness that quietly moved into a child cannot pass here.

     WAS `x.parent === s.id` — a DIRECT child, which is one of the two places
     in this gate that really were written for one level (the census, which the
     bound's stated reason named, was not: see verifySections()). A container
     whose only content is another container has no direct child holding a
     control, and this would have refused its only honest witness. `descends`
     reduces to the old expression at depth <= 2, and the reduction is asserted
     rather than argued — see route (s). */
  const ownControls = CONTROLS.some((x) => x.section === s.id);
  const inChild = descends(c.section, s.id);
  if (c.section !== s.id && !(!ownControls && inChild)) { note(`WITNESS for "${s.id}" names "${w.id}", which now declares section "${c.section}"${ownControls ? '' : ' (a section without controls of its own is witnessed through a child section, and this is not one)'}`); continue; }
  if (c.kind === 'slider' && (Number(w.value) < c.min || Number(w.value) > c.max)) {
    note(`WITNESS for "${s.id}" drives ${w.id} to ${w.value}, outside its range ${c.min}..${c.max}`); continue;
  }
  if (c.kind === 'choice' && !c.options.some((o) => o.value === w.value)) {
    note(`WITNESS for "${s.id}" drives ${w.id} to "${w.value}", which is not one of its options`); continue;
  }

  /* Fresh page per section, so each assertion starts from the real first-load
     state — collapsed exactly as a visitor finds it. */
  await openBloom(page, port);
  const res = await page.evaluate(async ({ id, value, section, breakIt, pre }) => {
    const det = document.getElementById(`sec-${section}`);
    const el = document.getElementById(id);
    const span = el.closest('.bl-ctrl').querySelector('.bl-val');
    /* THE PRECONDITION, through real events — never by clicking, which is how
       every gate and the harness set a control. Applied BEFORE the `before`
       metrics are read, so the witness delta belongs to the witness. */
    const preState = [];
    for (const q of (pre || [])) {
      const pel = document.getElementById(q.id);
      if (!pel) { preState.push(`${q.id}: not in the DOM`); continue; }
      pel.value = q.value;
      pel.dispatchEvent(new Event('input', { bubbles: true }));
      pel.dispatchEvent(new Event('change', { bubbles: true }));
      if (String(pel.value) !== String(q.value)) preState.push(`${q.id}: set "${q.value}", reads back "${pel.value}"`);
    }
    if (pre && pre.length) await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (breakIt) {
      /* NEGATIVE CONTROL, route (b): the declarations stay perfect and the app
         stops reacting. cloneNode copies the element, its id and its value and
         drops every listener — which is the flower's `predicateDrivers`
         imported-and-never-called defect, reproduced exactly. */
      el.replaceWith(el.cloneNode(true));
    }
    const target = document.getElementById(id);
    const openBefore = det.open;
    /* THE PRECONDITION HAS TO HAVE WORKED, and this is where that is checked
       rather than hoped: a witness whose control is still HIDDEN would move
       nothing and report a pass, which is exactly the vacuity `pre` exists to
       avoid. Reported out and asserted below. */
    const witnessHidden = target.closest('.bl-ctrl').hidden;
    const sectionHidden = det.hidden;
    const labelBefore = span.textContent;
    const stateBefore = window.__bloomUIState()[id];
    const witnessBefore = window.__bloomMetrics();
    target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      preState, witnessHidden, sectionHidden,
      openBefore, openAfter: det.open,
      readback: target.value,
      labelBefore, labelAfter: span.textContent,
      stateBefore, stateAfter: window.__bloomUIState()[id],
      metricsBefore: witnessBefore, metricsAfter: window.__bloomMetrics(),
      readout: document.getElementById('readout').textContent,
    };
  }, { id: w.id, value: w.value, section: s.id, breakIt: NEGATIVE_CONTROL, pre: w.pre || null });

  const tag = `[${s.id}] ${w.id} -> ${w.value} while collapsed`;
  if (res.preState.length) note(`${tag}: the precondition did not take: ${res.preState.join('; ')}`);
  /* THE ANTI-VACUITY CLAUSE. A section reachable only behind a precondition is
     exactly where a witness can quietly measure nothing (session A's warning),
     so the gate refuses to accept one whose control is still hidden after the
     precondition ran. */
  if (res.witnessHidden) note(`${tag}: after the precondition the witness control is still HIDDEN — it would move nothing and this assertion would pass vacuously, which is precisely what a precondition mechanism must not be allowed to become`);
  if (res.sectionHidden) note(`${tag}: after the precondition the section is still HIDDEN`);
  if (res.openBefore !== false) note(`${tag}: the section was not collapsed at first load (open=${res.openBefore})`);
  if (res.openAfter !== false) note(`${tag}: driving the control OPENED the section — collapse state must belong to the visitor`);
  if (String(res.readback) !== String(w.value)) note(`${tag}: set "${w.value}", the element reads back "${res.readback}"`);
  if (String(res.stateAfter) !== String(w.value)) note(`${tag}: the app's state snapshot says "${res.stateAfter}" — readUI cannot see a control in a collapsed section`);
  if (res.labelAfter === res.labelBefore) note(`${tag}: the control's read-out span did not change ("${res.labelBefore}") — refreshLabels runs only from regenerate(), so the app did not rebuild`);
  const before = w.read(res.metricsBefore), after = w.read(res.metricsAfter);
  if (String(before) === String(after)) note(`${tag}: geometry witness ${w.what} did not move (${before}) — the value took but the model did not`);
  else ok.push(`${tag}: state "${res.stateBefore}"->"${res.stateAfter}", read-out "${res.labelBefore}"->"${res.labelAfter}", ${w.what} ${before}->${after}, section still closed`);
}

/* ---------------- (d) the VISIBILITY-TRANSITION route ---------------- */
/* THE GAP THIS CLOSES, and it predates the layer work. Route (a) evaluates
   every predicate at DEFAULTS and asserts each wrapper's `hidden` agrees. That
   is ONE DIRECTION. A control gated on `layerCount >= 2` is hidden at DEFAULTS
   and would pass route (a) even if it NEVER APPEARED — and so would
   centerRise (retired in session 20), which was gated on `centerStyle: DOME`
   from the day the centre rig shipped and never had its appearance asserted by
   this gate before this route existed. Doesn't-show
   -when-off and does-show-when-on are two properties, and the flower project
   paid for checking only one of them (Advanced silently stopped showing 25
   controls while every gate passed).

   This drives each gated control's DRIVER through the real UI and re-checks
   EVERY control's `hidden` against its own predicate at the new state — so it
   asserts appearance and disappearance in the same pass, and it does it for
   controls this session did not add. The driver set is derived from the
   registry's predicates, never listed: a new gated control is covered the day
   it lands, or this loop has nothing to say about it and says so. */
const gated = CONTROLS.filter((c) => predicateDrivers(c.visibleWhen).size > 0);
const drivers = new Map();
for (const c of gated) for (const d of predicateDrivers(c.visibleWhen)) {
  if (!drivers.has(d)) drivers.set(d, []);
  drivers.get(d).push(c.id);
}
if (!gated.length) note('no control declares a predicate with a driver, so the visibility-transition route has nothing to drive — it would be vacuous');
for (const [driverId, dependents] of drivers) {
  const dc = CONTROLS.find((c) => c.id === driverId);
  /* Drive the driver to every value that changes the dependent set, so both
     directions are exercised rather than one arbitrary end. For a slider that
     is its two ends; for a choice, every option. */
  const values = dc.kind === 'choice' ? dc.options.map((o) => o.value) : [String(dc.min), String(dc.max)];
  for (const value of values) {
    await openBloom(page, port);
    const res = await page.evaluate(async ({ id, value, breakIt }) => {
      const el = document.getElementById(id);
      if (breakIt) {
        /* NEGATIVE CONTROL, route (d): declarations stay perfect and
           applyVisibility stops running. Freezing every wrapper's `hidden`
           reproduces "the panel does not re-evaluate", which is the failure
           this route exists for and which route (a) cannot see. */
        for (const w of document.querySelectorAll('.bl-ctrl')) {
          Object.defineProperty(w, 'hidden', { get: () => false, set: () => {}, configurable: true });
        }
      }
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const seen = {};
      for (const w of document.querySelectorAll('.bl-ctrl')) {
        const input = w.querySelector('input, select, .bl-curve');
        if (input) seen[input.id] = w.hidden;
      }
      /* The summaries a visitor can currently SEE — a section hidden by its
         own derivation, or inside a hidden ANCESTOR, is not on screen.

         WAS `!d.hidden && !d.parentElement.closest('details')?.hidden` — one
         ancestor, the second of this gate's two genuinely one-level tests
         (session 3a). At three levels a drop-down inside a shown parent inside
         a HIDDEN grandparent read as on screen, because `hidden` is set per
         element and a descendant of a hidden section is not itself hidden.
         `closest` on the element ITSELF walks up through every ancestor and
         includes `d`, so this is both clauses at once, at any depth; the
         attribute form is what `el.hidden = true` reflects. Identical to the
         old expression on today's tree, asserted below rather than argued. */
      const onScreen = (d) => !d.closest('details[hidden]');
      const all = [...document.querySelectorAll('#panelControls details')];
      const visibleLabels = all.filter(onScreen)
        .map((d) => ({ id: d.dataset.section, label: d.querySelector(':scope > summary').textContent }));
      /* THE SAME-TREE CONTROL for that generalisation: at depth <= 2 the old
         one-ancestor expression and the new walk must agree on every section,
         in every state this route drives. A disagreement here is the fix
         changing an answer it was supposed to preserve. */
      const oldOnScreen = (d) => !d.hidden && !d.parentElement.closest('details')?.hidden;
      const screenDisagree = all.filter((d) => onScreen(d) !== oldOnScreen(d)).map((d) => d.dataset.section);
      return { state: window.__bloomUIState(), seen, visibleLabels, screenDisagree };
    }, { id: driverId, value, breakIt: NEGATIVE_CONTROL });


    const tag = `[visibility] ${driverId} -> ${value}`;
    /* NO TWO SECTIONS ON SCREEN AT ONCE MAY SHARE A NAME (Eva's ruling A, Sep
       3). The fan's `petal1` and the rosette's `labellumGroup` are BOTH called
       "Petal 1", and the rosette's hood group is "Petal N" for an N a fan
       group may also carry — by design, since the number is the orbit's and
       the two placements never share a screen. That last clause is the claim,
       and this is where it is measured rather than trusted: every state this
       route drives (placement to each of its four values among them) reads
       the visible summaries back and refuses a duplicate. */
    {
      const byLabel = new Map();
      for (const { id, label } of res.visibleLabels) {
        if (!byLabel.has(label)) byLabel.set(label, []);
        byLabel.get(label).push(id);
      }
      const dup = [...byLabel].filter(([, ids]) => ids.length > 1);
      if (dup.length) note(`${tag}: two visible sections share a name — ${dup.map(([l, ids]) => `"${l}" on ${ids.join(' and ')}`).join('; ')}`);
      else ok.push(`${tag}: ${res.visibleLabels.length} sections on screen, no two sharing a name`);
      if (res.screenDisagree.length) note(`${tag}: the depth-general on-screen walk and the one-ancestor expression it replaced DISAGREE on ${res.screenDisagree.join(', ')} — at this tree's depth they must be the same answer`);
      else screenAgreed++;
    }
    let wrong = 0;
    for (const c of CONTROLS) {
      const want = !evalPredicate(c.visibleWhen, res.state);
      if (res.seen[c.id] !== want) {
        note(`${tag}: control "${c.id}" wrapper hidden=${res.seen[c.id]}, its predicate at that state says hidden=${want} — the panel did not re-evaluate visibility`);
        wrong++;
      }
    }
    if (!wrong) {
      const shown = dependents.filter((id) => res.seen[id] === false);
      ok.push(`${tag}: all ${CONTROLS.length} wrappers agree with their predicates; dependents shown: ${shown.length ? shown.join(', ') : 'none'}`);
    }
  }
}

/* ---------------- (f), (g), (h) ARE RETIRED (the role retirement, Q3.4) ----------------
   See the header. The derived-label machinery (`labelFrom`, `sectionLabel`) is
   kept — it is the registry's, not the roles' — and has no user today; a
   section that declares one again owes a route here. */

/* ---------------- (e) the LOW-COUNT SPIRAL FLAG, both directions ---------- */
/* The flag is the ENTIRE handling of golden-angle placement below eight
   petals — the charter's "gate or flag" was measured and there is no
   threshold to gate on, so a label is the whole mechanism and it has to be
   worth something. A flag asserted only when it should appear is a flag that
   can be stuck on, so both directions are checked, and the threshold comes
   from SPIRAL_LEGIBLE_COUNT rather than from a number retyped here.

   WHAT IT COUNTS MOVED WITH THE CONTINUOUS ARM, and the rows below are what
   says so. The flag is about how many elements the golden angle has to work
   with: under SPIRAL each whorl runs its own sequence, so that is petalCount
   and NOTHING about those rows changes; under CONTINUOUS there is one
   sequence of petalCount x layerCount, so the SAME three petals that trip the
   flag at one turn must NOT trip it at three (9 elements), and a two-petal
   sequence has no reachable state at all since petalCount starts at 3. The
   CONTINUOUS x 3 x 1 turn / CONTINUOUS x 3 x 3 turns pair is therefore the
   two-directional assertion for the new mode specifically: same slider, same
   threshold, opposite verdicts, decided by the geometry rather than by the
   control. RADIAL rows stay in as the never-flagged control. */
for (const [placement, count, depth] of [
  ['SPIRAL', SPIRAL_LEGIBLE_COUNT - 1, 1], ['SPIRAL', SPIRAL_LEGIBLE_COUNT, 1],
  ['RADIAL', SPIRAL_LEGIBLE_COUNT - 1, 1], ['SPIRAL', 3, 1],
  ['SPIRAL', 3, 3],
  ['CONTINUOUS', 3, 1], ['CONTINUOUS', 3, 3],
  ['CONTINUOUS', SPIRAL_LEGIBLE_COUNT, 1], ['RADIAL', 3, 3],
]) {
  await openBloom(page, port);
  const set = [{ id: 'placement', value: placement }, { id: 'petalCount', value: String(count) }, { id: 'layerCount', value: String(depth) }];
  const bad = await applyConfig(page, set);
  if (bad.length) { note(`[spiral flag] ${placement} x ${count} x ${depth}: read-back failed: ${bad.join('; ')}`); continue; }
  const txt = await page.evaluate(() => document.getElementById('readout').textContent);
  const shown = /SPIRAL BELOW \d+ IN THE SEQUENCE/.test(txt);
  /* THE EXPECTATION IS DERIVED FROM THE SAME RULE THE APP STATES, not from a
     second copy of it: the sequence is petalCount under SPIRAL (each whorl
     its own) and petalCount x layerCount under CONTINUOUS. The app reads
     footRing()'s `sequenceLength`; this reads the two controls the row set,
     so the two agreeing is a real check rather than a tautology. */
  const seq = placement === 'CONTINUOUS' ? count * depth : count;
  const want = (placement === 'SPIRAL' || placement === 'CONTINUOUS') && seq < SPIRAL_LEGIBLE_COUNT;
  if (shown !== want) {
    note(`[spiral flag] ${placement} x ${count} petals x ${depth}: flag ${shown ? 'SHOWN' : 'ABSENT'}, expected ${want ? 'SHOWN' : 'ABSENT'} (sequence ${seq}, threshold SPIRAL_LEGIBLE_COUNT = ${SPIRAL_LEGIBLE_COUNT})`);
  } else {
    ok.push(`[spiral flag] ${placement} x ${count} petals x ${depth} (sequence ${seq}): ${shown ? 'shown' : 'absent'}, as the threshold requires`);
  }
}

/* ---------------- (i) THE PRINT-PREVIEW TOGGLE ---------------- */
/* ALWAYS ON SINCE F7 (Eva's ruling): the page is opened AS SHIPPED (no
   harness flip), and the box must be CHECKED, its wrapper HIDDEN, and the
   viewport on EXPORT geometry at load. Then the hidden box is still driven
   both ways through its own 'change' event, because it is hidden and not
   deleted — the gates' own route to LIVE geometry goes through it — and the
   load-bearing claim is unchanged: the STL is byte-identical either side. */
{
  const tag = '[preview]';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-panel-preview-'));
  const THIN = [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }];
  await openBloom(page, port, { asShipped: true });
  const where = await page.evaluate(() => {
    const el = document.getElementById('printPreview');
    const wrap = el && el.closest('.bl-toggle');
    return { present: !!el, inPanel: !!(el && el.closest('#panelControls')), inView: !!(el && el.closest('.bl-viewpanel')), checked: el ? el.checked : null,
      wrapHidden: !!(wrap && wrap.hidden && getComputedStyle(wrap).display === 'none'), rendered: el ? el.getClientRects().length > 0 : null,
      mode: window.__bloomMetrics().shownMode, first: document.getElementById('readout').textContent.split('\n')[0] };
  });
  if (!where.present) note(`${tag}: no #printPreview box in the page — F7 hides it, it must not be deleted`);
  else {
    if (where.inPanel || !where.inView) note(`${tag}: the box is ${where.inPanel ? 'inside #panelControls' : 'outside the VIEW box'} — it is view chrome and belongs beside Auto-rotate, not among the registry's controls`);
    if (where.checked !== true) note(`${tag}: the box is NOT checked at first load — print preview is always on (F7)`);
    if (!where.wrapHidden || where.rendered) note(`${tag}: the box is visible at first load (wrapper hidden: ${where.wrapHidden}, box rendered: ${where.rendered}) — F7 hides it`);
    if (where.mode !== 'export') note(`${tag}: the page opens on "${where.mode}" geometry — print preview is always on, it must open on EXPORT`);
    if (!/PRINT PREVIEW/.test(where.first)) note(`${tag}: the read-out's first line at load reads "${where.first}" and does not name PRINT PREVIEW`);
    const bad = await applyConfig(page, THIN);
    if (bad.length) note(`${tag}: ALL THIN did not take: ${bad.join('; ')}`);
    const on = await page.evaluate(() => { const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; return { shownMode: m.shownMode, liveTris: m.liveTris, shownTris: m.shownTris, hub: m.hubRadius, builds: window.__bloomBuildState().count, first: txt.split('\n')[0], printedMarked: /PRINTED[^\n]*← on screen/.test(txt), liveMarked: /LIVE[^\n]*← on screen/.test(txt) }; });
    const onBuf = await exportStl(page, tmp);
    const owner = await page.evaluate(async () => {
      const mod = await import('/bloom-geometry.js');
      const ui = window.__bloomUIState();
      return { liveHub: mod.footRing(ui, new mod.MeshBuilder({ exportMode: false })).hub.radius, exportHub: mod.footRing(ui, new mod.MeshBuilder({ exportMode: true })).hub.radius };
    });
    await page.evaluate(({ breakIt }) => {
      let el = document.getElementById('printPreview');
      if (breakIt) {
        /* NEGATIVE CONTROL, route (i): the box is declared, renders, and
           nothing listens — the declarations-right / app-doesn't-react
           defect, pointed at view chrome. */
        const clone = el.cloneNode(true); el.replaceWith(clone); el = clone;
      }
      el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true }));
    }, { breakIt: NEGATIVE_CONTROL });
    await settleBuild(page);
    await page.waitForTimeout(80);
    const off = await page.evaluate(() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, liveTris: m.liveTris, hub: m.hubRadius, builds: window.__bloomBuildState().count, first: document.getElementById('readout').textContent.split('\n')[0] }; });
    const offBuf = await exportStl(page, tmp);
    const drift = await fullStateDrift(page, THIN);
    await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await settleBuild(page);
    await page.waitForTimeout(80);
    const back = await page.evaluate(() => ({ shownMode: window.__bloomMetrics().shownMode, hub: window.__bloomMetrics().hubRadius }));
    const problems = [];
    if (on.shownMode !== 'export') problems.push(`shownMode reads "${on.shownMode}" with the box ON (as shipped), expected "export"`);
    if (on.liveTris !== null) problems.push(`liveTris reads ${on.liveTris} with the preview ON — an export-mode count under a live label; it must be null`);
    if (on.hub !== owner.exportHub) problems.push(`hub radius ${on.hub} with the preview ON is not footRing()'s export answer ${owner.exportHub}`);
    if (owner.exportHub === owner.liveHub) problems.push(`the floor does not bind on this row (live and export hub both ${owner.liveHub}) — the route is measuring nothing`);
    if (!/PRINT PREVIEW/.test(on.first)) problems.push(`the read-out's first line with the box ON reads "${on.first}" and does not name PRINT PREVIEW`);
    if (!on.printedMarked) problems.push('the PRINTED line does not carry the "← on screen" marker with the box ON');
    if (on.liveMarked) problems.push('the live line still says "on screen" with the box ON');
    if (!(off.builds > on.builds)) problems.push(`flipping the box did not rebuild (build count ${on.builds} -> ${off.builds})`);
    if (off.shownMode !== 'live') problems.push(`shownMode reads "${off.shownMode}" after turning the box OFF, expected "live"`);
    if (off.hub !== owner.liveHub) problems.push(`hub radius ${off.hub} after OFF is not footRing()'s live answer ${owner.liveHub}`);
    if (typeof off.liveTris !== 'number') problems.push(`liveTris reads ${off.liveTris} after OFF`);
    if (!/LIVE/.test(off.first)) problems.push(`the read-out's first line after OFF reads "${off.first}" and does not name LIVE`);
    if (drift.length) problems.push(`registry state moved with the box: ${drift.join('; ')}`);
    if (!offBuf || !onBuf) problems.push('an export did not download');
    else if (!offBuf.equals(onBuf)) problems.push(`the STL exported with the box ON differs from the one with it OFF (${onBuf.length} vs ${offBuf.length} bytes) — the toggle reached the export path`);
    if (back.shownMode !== 'export' || back.hub !== owner.exportHub) problems.push(`turning the box back ON did not restore export geometry (shownMode ${back.shownMode}, hub ${back.hub})`);
    if (problems.length) note(`${tag}: ${problems.join('; ')}`);
    else ok.push(`${tag}: the box sits in the VIEW box, CHECKED and HIDDEN at load with export geometry on screen; on ALL THIN OFF rebuilt (${on.builds} -> ${off.builds}), shownMode live, hub ${on.hub.toFixed(3)} -> ${off.hub.toFixed(3)}, and back ON restores export; the STL is byte-identical either side (${onBuf.length} bytes)`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ---------------- (j) THE INNER-RING LINE, BOTH DIRECTIONS ---------------- */
for (const [label, sets, want] of [
  ['defaults (no ring under a foot)', [], false],
  ['6 layers x spread min (rings 4–5 under the floor, feet across the axis)', [{ id: 'layerCount', value: '6' }, { id: 'spread', value: '0.6' }], true],
  ['ALL THIN x spread min x 3 layers (a shipped row already under the floor before the raise)', [{ id: 'layerCount', value: '3' }, { id: 'spread', value: '0.6' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }], true],
  ['6 layers x spread max (deep, and wide enough that no ring is under a foot)', [{ id: 'layerCount', value: '6' }, { id: 'spread', value: '6' }], false],
]) {
  const tag = `[inner rings] ${label}`;
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    /* NEGATIVE CONTROL, route (j): the read-out never changes again — the
       line cannot appear where it must, and where it must not appear the
       row still reads clean, which is why the rows are checked in BOTH
       directions and the control is seen to fire on the present ones. */
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {}, configurable: true }); });
  }
  const bad = await applyConfig(page, sets);
  if (bad.length) { note(`${tag}: config did not take: ${bad.join('; ')}`); continue; }
  const res = await page.evaluate(() => {
    const m = window.__bloomMetrics();
    return { anyUnder: m.rings.some((r) => r.underFootFloor === true), anyCross: m.rings.some((r) => r.crossesAxis === true),
             shown: /RINGS NARROWER THAN A FOOT/.test(document.getElementById('readout').textContent),
             crossSaid: /they cross the (axis|apex)/.test(document.getElementById('readout').textContent),
             inner: Math.min(...m.rings.map((r) => r.radius)) };
  });
  const problems = [];
  if (res.anyUnder !== want) problems.push(`footRing() reports ${res.anyUnder ? 'a ring' : 'no ring'} under the ${FOOT_MIN_WIDTH_MM} mm foot floor (innermost ${res.inner.toFixed(3)} mm), this row expects ${want ? 'one' : 'none'} — the owner's flag disagrees with the measured state`);
  if (res.shown !== res.anyUnder) problems.push(`the RINGS NARROWER THAN A FOOT line is ${res.shown ? 'SHOWN' : 'ABSENT'} while the owner reports ${res.anyUnder ? 'a ring under the floor' : 'none'}`);
  if (res.crossSaid !== res.anyCross) problems.push(`the axis-crossing clause is ${res.crossSaid ? 'shown' : 'absent'} while the owner reports ${res.anyCross ? 'a ring inside its overhang' : 'none'}`);
  if (problems.length) note(`${tag}: ${problems.join('; ')}`);
  else ok.push(`${tag}: line ${res.shown ? 'shown' : 'absent'}, owner agrees (innermost ring ${res.inner.toFixed(3)} mm${res.anyCross ? ', feet cross the axis' : ''})`);
}

/* ---------------- (v) IS RETIRED (Eva, Sep 20) ---------------- */
/* Route (v) asserted the read-out's ROOT BLEND line appeared iff layerCount
   was three or more, on five rows including one labelled "3 layers (the first
   depth that folds)". The line is gone (bloom.js), so the route is gone with
   it and its five rows existed only to carry it.
   NOTE FOR THE BOOKKEEPING, because it is a finding rather than a
   convenience: route (v) was in NONE of this gate's three route mechanisms —
   no entry in the header's enumeration, no flag in --negative-control's
   completeness list, and not counted in its "SEVENTEEN ROUTES" banner. It is
   exactly the shape the sphere-stem session named: A ROUTE THAT FIRES AND IS
   NOT REQUIRED IS A ROUTE THAT CAN GO SILENT WITHOUT THE GATE NOTICING. So
   removing it moves no count and no list, and the letter (v) is not reused. */

/* ---------------- (k) THE DOME LINE AND THE APEX CLAMP, BOTH DIRECTIONS ---------------- */
/* The head-rise control's read-out (Sep 4): the HEAD RISE line is shown iff
   footRing() declares a dome, which is iff the control is off zero; the
   "(CLAMPED" clause iff the owner's apex floor bound. Each asserted in both
   directions against the OWNER'S flags, never against this tool's idea of
   the geometry — the sub-8 spiral precedent, and route (j)'s. The rows:
   flat; a mid rise; the one reachable corner where the floor binds (a
   1.15 mm hub under a 2.40 mm sheet); a hemisphere on the defaults where it
   does not. (The SEAT clauses and the RING row went with the centre rig in
   session 20.) */
for (const [label, sets, wantDome, wantClamp] of [
  ['defaults (flat)', [], false, false],
  ['head rise 0.50 on the defaults', [{ id: 'headRise', value: '0.5' }], true, false],
  ['ALL MIN x sheet 2.40 x spread min x rise 1 (the apex floor binds)', [{ id: 'petalCount', value: '3' }, { id: 'petalWidth', value: '8' }, { id: 'sheetThickness', value: '2.4' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'headRise', value: '1' }], true, true],
  ['head rise 1 on the defaults (a hemisphere, no clamp)', [{ id: 'headRise', value: '1' }], true, false],
]) {
  const tag = `[dome] ${label}`;
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    /* NEGATIVE CONTROL, route (k): the read-out never changes again — the
       HEAD RISE line cannot appear where the owner declares a dome. */
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {}, configurable: true }); });
  }
  const bad = await applyConfig(page, sets);
  if (bad.length) { note(`${tag}: config did not take: ${bad.join('; ')}`); continue; }
  const res = await page.evaluate(() => {
    const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
    return { rise: Number(ui.headRise), hasDome: m.hubDome !== null, clamped: !!(m.hubDome && m.hubDome.clamped), riseBuilt: m.hubDome ? m.hubDome.riseBuilt : null,
             shown: /HEAD RISE/.test(txt), clampSaid: /\(CLAMPED: rise/.test(txt),
             reliefSaid: /local relief .* at the rim, .* at the innermost ring/.test(txt), hubBuiltDome: !!(m.hubBuilt && m.hubBuilt.dome), hubTris: m.hubBuilt ? m.hubBuilt.tris : null };
  });
  const problems = [];
  if (res.hasDome !== wantDome) problems.push(`footRing() ${res.hasDome ? 'declares a dome' : 'declares none'}, this row expects ${wantDome ? 'one' : 'none'}`);
  if (res.hasDome !== (res.rise !== 0)) problems.push(`the owner ${res.hasDome ? 'declares a dome' : 'declares none'} while the control reads ${res.rise} — the guard and the control disagree`);
  if (res.hubBuiltDome !== res.hasDome) problems.push(`the hub builder ${res.hubBuiltDome ? 'built a shell' : 'built the disc'} while the owner ${res.hasDome ? 'declares a dome' : 'declares none'}`);
  if (res.hubTris !== (res.hasDome ? 3456 : 192)) problems.push(`the hub built ${res.hubTris} triangles, expected ${res.hasDome ? 3456 : 192} — the count is a branch on the dome, not a ramp`);
  if (res.shown !== res.hasDome) problems.push(`the HEAD RISE line is ${res.shown ? 'SHOWN' : 'ABSENT'} while the owner ${res.hasDome ? 'declares a dome' : 'declares none'}`);
  if (res.hasDome && !res.reliefSaid) problems.push('the HEAD RISE line does not print the local relief at the rim and at the innermost ring');
  if (res.clamped !== wantClamp) problems.push(`the owner reports clamped ${res.clamped}, this row expects ${wantClamp}`);
  if (res.clampSaid !== res.clamped) problems.push(`the (CLAMPED clause is ${res.clampSaid ? 'shown' : 'absent'} while the owner reports clamped ${res.clamped}`);
  if (problems.length) note(`${tag}: ${problems.join('; ')}`);
  else ok.push(`${tag}: HEAD RISE line ${res.shown ? 'shown' : 'absent'}, owner agrees (rise ${res.rise}${res.clamped ? ' CLAMPED to ' + res.riseBuilt.toFixed(2) : ''}, hub ${res.hubTris} tris)`);
}

/* ===================================================================
   ROUTE (l) — THE CURL FAMILY (session 16), on ONE page, in BOTH directions.
   Route (d) drives a slider driver to its two ends only, and both ends of
   spine curl (-180, 360) are away from 0 — so it asserts that curl bias and
   curl start APPEAR and never that they DISAPPEAR again. This route drives
   curl 0 -> 150 -> 0 (and roll 0 -> 90 -> 0 for the taper) on one page and
   asserts both, every wrapper against its own predicate at each step; the
   SPINE CURL line shown iff the owner reports a curl; its "(CLAMPED"
   clause iff the owner's floor bound; SELF-CONTACT iff the owner's flag;
   each against the builder's own spine record, never this tool's idea of
   the geometry (routes (j) and (k)'s discipline). */
{
  const tag = '[curl]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    /* NEGATIVE CONTROL, route (l): the read-out never changes again — the
       SPINE CURL line cannot appear where the owner reports a curl. */
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const step = async (label, sets, want) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
      const hid = (id) => document.getElementById(id).closest('.bl-ctrl').hidden;
      const sp = m.petalSpine;
      return { curl: Number(ui.petalSpineCurl), roll: Number(ui.petalRoll), biasHidden: hid('curlBias'), startHidden: hid('curlStart'), taperHidden: hid('petalRollTaper'), gradHidden: hid('petalCupGradient'),
               hasCurl: !!(sp && sp.curlRad !== 0), clamped: (m.petalRingSpine || []).some((s) => s && s.clamped), contact: (m.petalRingSpine || []).some((s) => s && s.clearance.selfContact), under: (m.petalRingSpine || []).some((s) => s && s.underFloor), turnBuilt: sp ? sp.turnBuiltDeg : null, turnAsked: sp ? sp.turnAskedDeg : null,
               shown: /SPINE CURL/.test(txt), clampSaid: /\(CLAMPED at one sheet thickness/.test(txt), contactSaid: /SELF-CONTACT/.test(txt), underSaid: /UNDER ONE SHEET THICKNESS/.test(txt), builtSaid: /° asked, [-\d.]+° built/.test(txt) };
    });
    const p = [];
    const wantHidden = !(Math.abs(res.curl) >= 2.5);
    if (res.biasHidden !== wantHidden || res.startHidden !== wantHidden) p.push(`curl ${res.curl}: bias hidden ${res.biasHidden}, start hidden ${res.startHidden}; the registry predicate says hidden ${wantHidden}`);
    if (res.taperHidden !== !(Math.abs(res.roll) >= 2.5)) p.push(`roll ${res.roll}: taper hidden ${res.taperHidden}; the registry predicate says hidden ${!(Math.abs(res.roll) >= 2.5)}`);
    if (res.gradHidden) p.push('cup gradient is hidden — it is always visible');
    if (res.hasCurl !== (res.curl !== 0)) p.push(`the owner reports ${res.hasCurl ? 'a curl' : 'no curl'} while the control reads ${res.curl}`);
    if (res.shown !== res.hasCurl) p.push(`the SPINE CURL line is ${res.shown ? 'SHOWN' : 'ABSENT'} while the owner reports ${res.hasCurl ? 'a curl of ' + res.curl : 'no curl'}`);
    if (res.clamped !== want.clamped) p.push(`the owner reports clamped ${res.clamped}, this step expects ${want.clamped}`);
    if (res.clampSaid !== res.clamped) p.push(`the (CLAMPED clause is ${res.clampSaid ? 'shown' : 'absent'} while the owner reports clamped ${res.clamped}`);
    if (res.clamped && !res.builtSaid) p.push('the clamped line does not print the turn asked beside the turn built');
    if (res.clamped && !(Math.abs(res.turnBuilt) < Math.abs(res.turnAsked))) p.push(`clamped but the turn built (${res.turnBuilt}) is not short of the turn asked (${res.turnAsked})`);
    if (res.contact !== want.contact) p.push(`the owner reports self-contact ${res.contact}, this step expects ${want.contact}`);
    if (res.under !== !!want.under) p.push(`the owner reports a uniform arc under the floor on some ring: ${res.under}, this step expects ${!!want.under}`);
    if (res.underSaid !== res.under) p.push(`UNDER ONE SHEET THICKNESS is ${res.underSaid ? 'said' : 'absent'} while the owner reports ${res.under}`);
    if (res.contactSaid !== res.contact) p.push(`SELF-CONTACT is ${res.contactSaid ? 'said' : 'absent'} while the owner reports ${res.contact}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: bias/start ${res.biasHidden ? 'hidden' : 'shown'}, taper ${res.taperHidden ? 'hidden' : 'shown'}, SPINE CURL line ${res.shown ? 'shown' : 'absent'}${res.clamped ? ' (CLAMPED: ' + res.turnAsked + ' asked, ' + res.turnBuilt.toFixed(1) + ' built)' : ''}${res.contact ? ', SELF-CONTACT' : ''}`);
  };
  await step('defaults', [], { clamped: false, contact: false });
  await step('curl 150 (bias and start appear)', [{ id: 'petalSpineCurl', value: '150' }], { clamped: false, contact: false });
  await step('curl 150 x start 0.95 x length 20 x sheet 0.6 (the spine floor binds)', [{ id: 'curlStart', value: '0.95' }, { id: 'petalLength', value: '20' }, { id: 'sheetThickness', value: '0.6' }], { clamped: true, contact: false });
  await step('curl 360 x start 0.5 (the tip lands on its own mid-blade)', [{ id: 'petalSpineCurl', value: '360' }, { id: 'curlStart', value: '0.5' }], { clamped: false, contact: true });
  await step('curl 360 x bias 1 x start 0 (winds inside itself)', [{ id: 'curlBias', value: '1' }, { id: 'curlStart', value: '0' }], { clamped: false, contact: false });
  await step('back to curl 0 (bias and start disappear, the line goes)', [{ id: 'petalSpineCurl', value: '0' }, { id: 'curlBias', value: '0' }], { clamped: false, contact: false });
  /* A STEP THAT NAMES A STATE SETS IT: the clamp step above left the page at
     petalLength 20 x sheet 0.60, where the sixth whorl's 3.9 mm blade has a
     0.62 mm spine radius against a 0.60 mm floor — NOT under it. The first
     run of this step read false for exactly that reason. The shipping blade
     and sheet are set back explicitly. */
  await step('6 whorls x curl 360 on the shipping blade and sheet (the uniform arc under the floor on the innermost whorl — told, not clamped)', [{ id: 'petalSpineCurl', value: '360' }, { id: 'layerCount', value: '6' }, { id: 'petalLength', value: '35' }, { id: 'sheetThickness', value: '1.2' }], { clamped: false, contact: true, under: true });
  await step('back to one whorl, curl 0', [{ id: 'layerCount', value: '1' }, { id: 'petalSpineCurl', value: '0' }], { clamped: false, contact: false });
  await step('roll 90 (taper appears)', [{ id: 'petalRoll', value: '90' }], { clamped: false, contact: false });
  await step('back to roll 0 (taper disappears)', [{ id: 'petalRoll', value: '0' }], { clamped: false, contact: false });
}

/* ===================================================================
   ROUTE (m) — THE HEAD: CAP / SPHERE (session 18), on ONE page, in BOTH
   directions. `hubShape` is visible under CONTINUOUS only; SPHERE hides
   `headRise` AND makes it inert; the read-out's HEAD: FULL SPHERE line, its
   RESERVED POLE clause and its (CLAMPED) clause are asserted against the
   OWNER'S own flags (routes (k) and (l)'s discipline); the hub's triangle
   count is the three-valued branch it now is (192 / 3,456 / 6,720); and a
   stored SPHERE under RADIAL builds the cap with the enum hidden. The
   inertness clause is BEHAVIOURAL: Head rise is driven to 1 while hidden
   under SPHERE and the build's triangle count and hub radius must not move
   (the byte identity itself is the matrix's GATED rows; this is the same
   claim on the DOM path). The negative control freezes the read-out so the
   sphere line cannot appear where the geometry builds a sphere. */
{
  const tag = '[sphere]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    /* NEGATIVE CONTROL, route (m): the read-out never changes again — the
       HEAD: FULL SPHERE line cannot appear where the geometry builds one. */
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const step = async (label, sets, want = {}) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return null; }
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
      const hid = (id) => document.getElementById(id).closest('.bl-ctrl').hidden;
      return { placement: String(ui.placement), hubShape: String(ui.hubShape), rise: Number(ui.headRise),
               shapeHidden: hid('hubShape'), riseHidden: hid('headRise'),
               sphere: m.sphereMode === true, hasDome: m.hubDome !== null, closed: !!(m.hubDome && m.hubDome.closed), built: !!(m.hubBuilt && m.hubBuilt.dome && m.hubBuilt.dome.closed),
               hubTris: m.hubBuilt ? m.hubBuilt.tris : null, hubR: m.hubRadius, shownTris: m.shownTris,
               reserved: m.hubDome && m.hubDome.reserved ? m.hubDome.reserved.mm : null, clamped: !!(m.hubDome && m.hubDome.clamped),
               sphereSaid: /HEAD: FULL SPHERE/.test(txt), riseSaid: /HEAD RISE/.test(txt),
               reservedSaid: (txt.match(/RESERVED POLE clear: nearest foot ([\d.]+) mm/) || [])[1],
               clampSaid: /\(CLAMPED: the area rule/.test(txt) };
    });
    const p = [];
    const wantSphere = res.placement === 'CONTINUOUS' && res.hubShape === 'SPHERE';
    if (res.sphere !== wantSphere) p.push(`the geometry reports sphereMode ${res.sphere} while the controls read ${res.placement} x ${res.hubShape} (the registry predicate says ${wantSphere})`);
    if (res.shapeHidden !== (res.placement !== 'CONTINUOUS')) p.push(`hubShape is ${res.shapeHidden ? 'hidden' : 'shown'} under ${res.placement}`);
    if (res.riseHidden !== wantSphere) p.push(`headRise is ${res.riseHidden ? 'hidden' : 'shown'} while the head ${wantSphere ? 'is a sphere (the slider is inert and must hide)' : 'is a cap (the slider is live and must show)'}`);
    if (res.closed !== wantSphere) p.push(`the owner ${res.closed ? 'declares a closed sphere' : 'declares none'} while the controls say ${wantSphere}`);
    if (res.built !== wantSphere) p.push(`the hub builder ${res.built ? 'built a closed sphere' : 'built no closed sphere'} while the owner ${wantSphere ? 'declares one' : 'declares none'}`);
    const wantTris = wantSphere ? 6720 : (res.hasDome ? 3456 : 192);
    if (res.hubTris !== wantTris) p.push(`the hub built ${res.hubTris} triangles, expected ${wantTris} — a three-valued branch (flat / cap / sphere), never a ramp`);
    if (res.sphereSaid !== wantSphere) p.push(`the HEAD: FULL SPHERE line is ${res.sphereSaid ? 'SHOWN' : 'ABSENT'} while the geometry ${wantSphere ? 'builds a sphere' : 'builds a cap'}`);
    if (res.riseSaid !== (!wantSphere && res.hasDome)) p.push(`the HEAD RISE line is ${res.riseSaid ? 'SHOWN' : 'ABSENT'} while the head is ${wantSphere ? 'a sphere' : res.hasDome ? 'a cap' : 'flat'}`);
    if (wantSphere) {
      if (res.reservedSaid === undefined) p.push('the sphere line does not print the RESERVED POLE clearance');
      else if (Math.abs(Number(res.reservedSaid) - res.reserved) > 0.005) p.push(`the read-out says the reserved pole is clear by ${res.reservedSaid} mm, the owner says ${res.reserved}`);
      if (res.clampSaid !== res.clamped) p.push(`the (CLAMPED clause is ${res.clampSaid ? 'shown' : 'absent'} while the owner reports clamped ${res.clamped}`);
      if (want.clamped !== undefined && res.clamped !== want.clamped) p.push(`the owner reports clamped ${res.clamped}, this step expects ${want.clamped}`);
    }
    if (want.tris !== undefined && res.shownTris !== want.tris) p.push(`the build has ${res.shownTris} triangles where the previous step had ${want.tris} — the hidden Head rise reached the geometry`);
    if (want.hubR !== undefined && res.hubR !== want.hubR) p.push(`the hub radius is ${res.hubR} where the previous step had ${want.hubR} — the hidden Head rise reached the sphere`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: hubShape ${res.shapeHidden ? 'hidden' : 'shown'}, headRise ${res.riseHidden ? 'hidden' : 'shown'}, hub ${res.hubTris} tris, ${res.sphereSaid ? 'HEAD: FULL SPHERE line shown (reserved pole clear by ' + res.reservedSaid + ' mm)' : res.riseSaid ? 'HEAD RISE line shown' : 'flat'}${res.clamped ? ', CLAMPED' : ''}`);
    return res;
  };
  await step('defaults (RADIAL: the enum is hidden, the rise shown, flat)', []);
  await step('CONTINUOUS x CAP (the enum appears, the rise stays)', [{ id: 'placement', value: 'CONTINUOUS' }]);
  const sph = await step('hubShape SPHERE (the rise hides, the closed hub, the sphere line)', [{ id: 'hubShape', value: 'SPHERE' }], { clamped: false });
  if (sph) await step('Head rise 1 under SPHERE (hidden AND inert: the build must not move)', [{ id: 'headRise', value: '1' }], { tris: sph.shownTris, hubR: sph.hubR, clamped: false });
  await step('back to CAP at rise 1 (a hemisphere; the rise line returns)', [{ id: 'hubShape', value: 'CAP' }]);
  await step('RADIAL with SPHERE stored (the enum hides, the cap stays a cap)', [{ id: 'hubShape', value: 'SPHERE' }, { id: 'placement', value: 'RADIAL' }]);
  await step('back to CONTINUOUS (the sphere returns)', [{ id: 'placement', value: 'CONTINUOUS' }]);
  await step('the APEX CORNER on the sphere — ALL MIN x sheet 2.40 x spread min (held at one sheet, CLAMPED, told)', [{ id: 'headRise', value: '0' }, { id: 'petalCount', value: '3' }, { id: 'petalWidth', value: '8' }, { id: 'sheetThickness', value: '2.4' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }], { clamped: true });
}

/* ---------------- (w) THE STEM CHANNEL IS CLAMPED AND TOLD ----------------
   (w), NOT (t): (t) is session 29's ANTHER'S SEVEN, declared in this file's
   own header and named at its own banner below. Two routes under one letter
   makes "route (t) passed" say nothing about which one, which is the whole
   point of naming them. c, u, w, x, y, z were free; w is the one that cannot
   be misread as a neighbour of an existing letter.

   IT HAS TWO CONTROLS AND EACH COVERS WHAT THE OTHER CANNOT, which is worth
   saying rather than leaving implied. The FIRST is its own shape: every clause
   here is a BICONDITIONAL driven in both directions on the same page, so a
   line stuck ON fires on the two inert states (a sphere with no stem, a stem
   on a CAP, where both lines must be ABSENT), a line stuck OFF fires on the
   three active ones, and a reader whose regex never matched — or always
   matched — is caught by the same pair. What that CANNOT see is a route that
   never ran at all. The SECOND is --negative-control, which freezes the
   read-out: this route's clauses fire there on all five of its states, and
   BOTH of its lines are now REQUIRED by that run's completeness check
   (`sawChannel`, `sawPacking`). They are two lines with two owners, so a fix
   for one is no evidence about the other and the check names them separately.
   Measured: it shipped fired-but-not-required, so the summary could have
   printed a pass with the channel's lines never looked at.

   (the sphere-stem session). A user who asks for 40 petals and is shown 33
   must be told, and this project's clamped-and-told form is TWO places: the
   control's own value read-out and the read-out panel. So both are asserted,
   in BOTH DIRECTIONS, against the BUILDER's own record rather than against
   each other — `stamenSpread`'s route and HEAD RISE's discipline.

   AND THE MERIDIAN PACKING MARGIN RIDES HERE for the same reason: it is TOLD
   on every sphere that has a stem and it is EXACTLY EXHAUSTED at one
   reachable corner, so a line that silently stopped printing would take the
   one number that says the base is spent with it.

   THE INERT DIRECTION IS THE LOAD-BEARING ONE. At `stemLength` 0 — the
   shipped default — there is no stem, so there is no channel, no omission and
   no line; that is the branch that keeps every sphere row on this tree
   byte-identical to the tree before the feature, and a route that only ever
   drove the stem ON could not see it come undone. The negative control
   freezes the read-out so neither line can appear where the geometry has one. */
{
  const tag = '[stem channel]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const step = async (label, sets, want = {}) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return null; }
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
      const O = m.stemOmission;
      return {
        sphere: m.sphereMode === true, stemPresent: !!(m.stem && m.stem.present !== false && m.stem.lengthMm > 0),
        hasChannel: O !== null && O !== undefined,
        asked: O ? O.asked : null, built: O ? O.built : null, omitted: O ? O.omitted.length : null,
        margin: O && O.meridian ? O.meridian.margin : null,
        exhausted: !!(O && O.meridian && O.meridian.exhausted),
        petalsBuilt: m.petalsBuilt,
        countSaid: document.getElementById('petalCount').closest('.bl-ctrl').querySelector('.bl-val').textContent,
        chanSaid: /STEM CHANNEL/.test(txt),
        chanBuilt: (txt.match(/STEM CHANNEL (\d+) of (\d+) petals BUILT — (\d+) NOT BUILT/) || []).slice(1).map(Number),
        chanAllClear: /STEM CHANNEL every one of the \d+ petals clears the stem/.test(txt),
        nothingLeft: /NOTHING IS LEFT/.test(txt),
        packSaid: /MERIDIAN PACKING/.test(txt),
        packNum: (txt.match(/MERIDIAN PACKING ([\d.]+)x/) || [])[1],
        packNa: /MERIDIAN PACKING n\/a/.test(txt),
        packExhausted: /MERIDIAN PACKING [^\n]*EXHAUSTED/.test(txt),
      };
    });
    const p = [];
    const wantChannel = res.sphere && res.stemPresent;
    if (res.hasChannel !== wantChannel) p.push(`the builder ${res.hasChannel ? 'reports' : 'reports no'} stem channel while the state is ${res.sphere ? 'a sphere' : 'not a sphere'} with ${res.stemPresent ? 'a stem' : 'no stem'}`);
    if (res.chanSaid !== wantChannel) p.push(`the STEM CHANNEL line is ${res.chanSaid ? 'SHOWN' : 'ABSENT'} while the geometry ${wantChannel ? 'has a channel' : 'has none'}`);
    if (wantChannel) {
      if (res.omitted > 0) {
        if (res.chanAllClear) p.push(`the line says every petal clears the stem while ${res.omitted} were not built`);
        if (res.chanBuilt.length !== 3) p.push('the STEM CHANNEL line does not name built / asked / not-built');
        else if (res.chanBuilt[0] !== res.built || res.chanBuilt[1] !== res.asked || res.chanBuilt[2] !== res.omitted) p.push(`the line says ${res.chanBuilt.join('/')} where the builder says ${res.built}/${res.asked}/${res.omitted}`);
        /* THE CONTROL'S OWN HALF. A read-out sentence three panels down is not
           where somebody dragging the petal count is looking. */
        if (!new RegExp(`${res.asked} asked`).test(res.countSaid) || !new RegExp(`${res.built} BUILT`).test(res.countSaid)) {
          p.push(`the petal count control reads "${res.countSaid}" — it must say what was asked AND what was built (${res.asked} / ${res.built})`);
        }
      } else if (!res.chanAllClear) p.push('nothing was omitted, yet the line does not say every petal clears the stem');
      if (res.built !== res.petalsBuilt) p.push(`the channel says ${res.built} built, the builder's own tally is ${res.petalsBuilt}`);
      if (res.nothingLeft !== (res.built === 0)) p.push(`the NOTHING IS LEFT clause is ${res.nothingLeft ? 'shown' : 'absent'} while ${res.built} petals were built`);
      if (!res.packSaid) p.push('the MERIDIAN PACKING line is absent on a sphere with a stem — it is told on every one of them, not only where it is tight');
      else if (res.built === 0) {
        if (!res.packNa) p.push('every petal was taken, yet the MERIDIAN PACKING line prints a number — there is no surviving foot to measure the arc against');
      } else if (res.packNum === undefined) p.push('the MERIDIAN PACKING line prints no margin');
      else {
        if (Math.abs(Number(res.packNum) - res.margin) > 0.0005) p.push(`the line says ${res.packNum}x, the builder says ${res.margin}`);
        if (res.packExhausted !== res.exhausted) p.push(`the EXHAUSTED clause is ${res.packExhausted ? 'shown' : 'absent'} while the builder reports ${res.exhausted} (margin ${res.margin})`);
      }
    } else if (res.packSaid) p.push('the MERIDIAN PACKING line is shown where there is no stem channel to pack against');
    if (want.omitted !== undefined && res.omitted !== want.omitted) p.push(`${res.omitted} petals were omitted, this step expects ${want.omitted}`);
    if (want.tris !== undefined && res.petalsBuilt !== want.tris) p.push(`${res.petalsBuilt} petals were built where the previous step built ${want.tris} — the stem reached a state it should not have`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${wantChannel ? `channel ${res.built}/${res.asked} (${res.omitted} not built), margin ${res.margin === null ? 'n/a' : res.margin.toFixed(3)}${res.exhausted ? ' EXHAUSTED' : ''}` : 'no channel, no lines'}`);
    return res;
  };
  const sphere = [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }];
  const off = await step('a SPHERE at stemLength 0 — no stem, no channel, no line (the shipped default, inert by branch)', [...sphere, { id: 'petalCount', value: '8' }, { id: 'layerCount', value: '1' }]);
  await step('the shipped stem on that sphere (60 x 6 mm): two petals not built, and both places say so', [{ id: 'stemLength', value: '60' }]);
  await step('the widest stem (12 mm) — the margin is EXACTLY EXHAUSTED at one foot length', [{ id: 'stemDiameter', value: '12' }]);
  await step('40 petals on the widest stem — more petals, more omitted, a wider sphere and a looser margin', [{ id: 'petalCount', value: '40' }]);
  /* THE ONLY PLACE THE WORD *EXHAUSTED* IS REACHED. No matrix row produces a
     margin under 1 with petals still built — the shipped sphere's margin falls
     to 1.003 at the widest stem and no further — so without this cell the
     clause that prints it would never have been shown to print. 4 petals on a
     12 mm stem reads 0.652 with 2 of 4 built: a real margin under one foot's
     length, not the degenerate 0 the bare corner gives. */
  await step('4 petals on the widest stem — the margin goes UNDER one foot length and the line says EXHAUSTED', [{ id: 'petalCount', value: '4' }]);
  await step('THE BARE CORNER — a 12 mm stem on the smallest sphere takes every petal (told, not refused)', [{ id: 'petalCount', value: '3' }, { id: 'petalWidth', value: '8' }, { id: 'spread', value: '0.6' }], { omitted: 3 });
  await step('the stem back to 0 on that same corner — the channel and both lines go with it', [{ id: 'stemLength', value: '0' }]);
  if (off) await step('RADIAL with a stem — a cap has no pole the sequence runs through, so no channel', [{ id: 'placement', value: 'RADIAL' }, { id: 'stemLength', value: '60' }]);
}

/* ------- (x) THE BORE'S TWO CLOSURES, AND THE CROSSOVER, ARE TOLD -------
   (the tip-plug session).

   WHAT THIS ROUTE IS FOR, and it is not "a feature shipped so a route was
   added". Eva's ask was that the bottom of a bored stem LOOK solid. Whether
   it IS closed is ST10's, measured on the rings the builder emitted; whether
   the panel SAYS SO is nobody's but this route's, and the two are different
   claims with different failure modes. A read-out that silently stopped
   printing the plug would leave the STEM line claiming a bore that runs the
   length of the stem when it does not.

   THE CROSSOVER IS THE LOAD-BEARING CELL. Both closures are derived from
   lengths, so on a short enough stem they MEET and no bore survives. That is
   ruled to be TOLD rather than silently produced — and the sentence is ONE
   sentence, because "solid for the first 1.20 mm" and "solid for the last
   1.50 mm" of a 2.20 mm stem are two true clauses adding up to a false
   picture. So this route asserts the joint clause APPEARS and BOTH separate
   ones are ABSENT there, which no single-direction check could carry.

   AND THE 3 mm FLOOR IS THE OTHER INERT DIRECTION. There the bore is already
   closed by Eva's own rule, so there is nothing to plug: a passing
   "SOLID for the last 0.00 mm" would be a number nobody measured, and the
   clause must be absent rather than zero. That is the branch that keeps every
   solid-stem row byte-identical, and a route that only ever drove a hollow
   stem could not see it come undone.

   EVERY NUMBER IS READ BACK AGAINST `__bloomMetrics`, never against the text
   that printed it: the plan owns `tipPlugMm`, `voidMm` and `solidThrough`,
   and this route owns only the question of whether the panel agrees. */
{
  const tag = '[stem closures]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const step = async (label, sets) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
      const S = m.stem;
      return {
        present: !!S, boreR: S ? S.boreR : null, plug: S ? S.tipPlugMm : null,
        voidMm: S ? S.voidMm : null, band: S ? S.solidBandMm : null,
        solidThrough: S ? !!S.solidThrough : null,
        heightMm: S ? S.root[2] + (S.rootSpanMm || 0) - S.tip[2] : null,
        stemSaid: /\bSTEM \d/.test(txt),
        plugSaid: /SOLID for the last ([\d.]+) mm/.exec(txt),
        bandSaid: /SOLID for the first ([\d.]+) mm/.exec(txt),
        throughSaid: /SOLID THROUGHOUT — a ([\d.]+) mm root band and a ([\d.]+) mm tip plug MEET across a ([\d.]+) mm stem/.exec(txt),
        sealedSaid: /([\d.]+) mm of SEALED bore between the two/.exec(txt),
      };
    });
    const p = [];
    if (!res.present) {
      if (res.stemSaid) p.push('the STEM line is shown on a state with no stem at all');
      if (res.plugSaid || res.bandSaid || res.throughSaid) p.push('a closure clause is shown on a state with no stem at all');
    } else {
      const hollow = res.boreR > 0;
      /* THE PLUG EXISTS IFF THERE IS A BORE, and the panel must agree with the
         plan about which — not with itself. */
      if ((res.plug > 0) !== hollow) p.push(`the plan asks for a ${res.plug} mm plug on a stem whose bore radius is ${res.boreR}`);
      const wantThrough = res.solidThrough;
      const wantPlug = hollow && !wantThrough;
      const wantBand = res.band > 0 && !wantThrough;
      if (!!res.throughSaid !== wantThrough) p.push(`the SOLID THROUGHOUT clause is ${res.throughSaid ? 'shown' : 'absent'} while the builder reports solidThrough=${wantThrough} (${res.voidMm} mm of bore left)`);
      if (!!res.plugSaid !== wantPlug) p.push(`the tip-plug clause is ${res.plugSaid ? 'shown' : 'absent'} while the state ${wantPlug ? 'has a bore to close and a void that survives' : 'does not'}`);
      if (!!res.bandSaid !== wantBand) p.push(`the root-band clause is ${res.bandSaid ? 'shown' : 'absent'} while the builder reports a ${res.band} mm band and solidThrough=${wantThrough}`);
      if (res.plugSaid && Math.abs(Number(res.plugSaid[1]) - res.plug) > 0.005) p.push(`the line says the plug is ${res.plugSaid[1]} mm, the plan says ${res.plug}`);
      if (res.sealedSaid && Math.abs(Number(res.sealedSaid[1]) - res.voidMm) > 0.005) p.push(`the line says ${res.sealedSaid[1]} mm of sealed bore, the plan leaves ${res.voidMm}`);
      if (res.throughSaid) {
        if (Math.abs(Number(res.throughSaid[1]) - res.band) > 0.005) p.push(`the joint clause names a ${res.throughSaid[1]} mm band where the plan says ${res.band}`);
        if (Math.abs(Number(res.throughSaid[2]) - res.plug) > 0.005) p.push(`the joint clause names a ${res.throughSaid[2]} mm plug where the plan says ${res.plug}`);
        if (res.sealedSaid) p.push('the joint clause is shown AND a sealed-bore figure with it — there is no bore left to have a length');
      }
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${res.present ? `bore ${res.boreR}, band ${res.band}, plug ${res.plug}, void ${res.voidMm}${res.solidThrough ? ' SOLID THROUGH' : ''}` : 'no stem, no line'}`);
  };
  await step('the shipped stem on a flat hub (60 x 6 mm) — a bore to close, and the plug clause says so', [{ id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '6' }]);
  await step('the widest stem (12 mm) — the widest bore the plug ever closes', [{ id: 'stemDiameter', value: '12' }]);
  await step('the 3 mm floor — Eva\'s bore rule already closed it, so there is nothing to plug and the clause is ABSENT', [{ id: 'stemDiameter', value: '3' }]);
  /* THE CROSSOVER. The bare corner's own control set at the shortest built
     stem: a 1.20 mm root band and a 1.50 mm tip plug across a 2.20 mm stem, so
     the two overlap and nothing is left. It is the only state in this gate
     where a HOLLOW stem reports no bore, and the only one where the joint
     clause can be shown to print. */
  await step('THE TWO CLOSURES MEET — one sentence naming both, and NEITHER of the separate clauses',
    [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }, { id: 'petalCount', value: '3' },
     { id: 'spread', value: '0.6' }, { id: 'layerSize', value: '0.35' }, { id: 'stemDiameter', value: '12' }, { id: 'stemLength', value: '1' }]);
  await step('the same corner at 2 mm — half a millimetre of bore survives, so the two separate clauses come back', [{ id: 'stemLength', value: '2' }]);
  await step('the stem back to 0 — no stem, no STEM line, no closure clause', [{ id: 'stemLength', value: '0' }]);
}

/* ===================================================================
   ROUTE (n) — THE RETIREMENT (session 20). RETIRED_IDS is a reservation with
   a check behind it, and the halves that need the DOM or the SOURCE live
   here (the registry's verifySections() carries the halves that run at
   module load: live ids, option values, DEFAULTS keys, section ids).

     (i)   NO RETIRED ID RENDERS: no element carries a retired id, and the
           `#sec-center` section — BACK since session 23 as the CONTAINER for
           the two reproductive parts (Eva: a container, not a control) —
           holds NO control wrapper of its own. Between sessions 20 and 23
           this clause read "there is no #sec-center"; what it guards is a
           resurrected RIG, and a rig is a control inside the section.
     (ii)  THE READ-OUT NAMES NO CENTRE: its summary line printed
           `center disc` on the shipping default while the rig existed; a
           line naming a centre that does not exist is the label-lie this
           project retires ids over.
     (iii) THE METRICS CARRY NO CENTRE KEY: `centerStyle`, `centerTris`,
           `centerSeat` are absent from __bloomMetrics(), never null under a
           live-looking name.
     (iv)  NO EXECUTABLE BLOOM SOURCE REFERENCES A RETIRED ID AS AN IDENTIFIER
           — the flower's verify-registry-sync scan, ported. Comments and
           LITERALS are exempt: the frozen matrices name retired ids as ROW
           DATA (single- and double-quoted strings) and must, since each is
           proved deep-equal to its base commit; a regex literal's body is
           literal text too, and this gate's own negative control names
           `centerStyle` inside one. What survives and still matches
           `\bid\b` is a property access or a bare identifier — including
           one inside a `${…}`, which IS code — and that is a consumer that
           would silently read `undefined`. The file list is the coverage
           and is printed; a retired id living in a file outside it is not
           caught, which the flower's gate header says of its list too.

           IT IS A CHARACTER WALK, NOT A STACK OF REGEXES (session 25, and
           the session-22 finding closed). Five independent regexes cannot
           see nesting: `\$\{[^}]*\}` stops at the FIRST `}`, so a `${…}`
           holding a nested template literal ended the outer match at the
           INNER literal's closing backtick and every backtick after it
           paired off by one — the pass then matched the GAPS BETWEEN
           literals rather than the literals. Measured at 888a506: 20 of the
           35 scanned files left a stray backtick, the pass deleted 58,522
           of THIS FILE's 98,906 post-comment characters, and across the set
           it hid 45% of the executable source it was meant to scan. In that
           state an apostrophe written inside a template literal survived to
           the `'…'` pass, re-paired the quotes of the frozen matrices' own
           label strings and exposed `centerSize` / `centerRise` /
           `centerDish` inside them. Both directions were measured on this
           tree: restoring the twenty-two possessives sessions 22 and 24 had
           reworded away took the old pass to 48 false hits, every one
           reported at `tools/bloom-harness.mjs:599` — a line reading
           `const ar = document.getElementById('autoRotate')`, ~3,800 lines
           from the labels that produced them; and on a PRISTINE 888a506
           with two genuine references spliced in, it caught one of the two
           and reported it 2,095 lines from where it lives. A scanner that
           misses real references and misreports the ones it finds is how a
           real hit gets waved through, so this is not only about noise.

           THE WALK BLANKS TO SPACES IN PLACE AND KEEPS EVERY NEWLINE, so
           the scanned text is the same length as the source and `file:line`
           names the real line. Its own validity is asserted PER FILE —
           same length, same line count, and the walk ends with nothing
           open — and a file that fails that FAILS THE GATE rather than
           being scanned in an unknown state. A `'` or `"` string ends at
           its line's end if it is unterminated (JS forbids a raw newline in
           one), so a mis-read costs one line and can never desync the file:
           that is what makes an apostrophe in HTML prose harmless. A `/`
           begins a regex only after `( , = : [ ! & | ? { } ;`, an arrow, a
           keyword like `return`, or the start of a file, AND only if an
           unescaped `/` closes it before the newline — so `</div>` is not
           a regex and `a / b` is not either.

   NEGATIVE CONTROL: a `.bl-ctrl` holding an `<input id="centerStyle">` is
   injected INTO the real `#sec-center` and the read-out's first line is
   rewritten to carry `center disc`; (i) — both halves — and (ii) must fire. */
{
  const tag = '[retired]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => {
      const w = document.createElement('div'); w.className = 'bl-ctrl';
      const i = document.createElement('input'); i.id = 'centerStyle'; w.append(i);
      document.getElementById('sec-center').append(w);
      const r = document.getElementById('readout');
      r.textContent = r.textContent.replace(/^(petals [^\n]*)/m, '$1 · center disc');
    });
  }
  const retired = RETIRED_IDS.map((r) => r.id);
  const res = await page.evaluate((ids) => {
    const m = window.__bloomMetrics();
    return {
      rendered: ids.filter((id) => document.getElementById(id) !== null),
      centerMissing: document.getElementById('sec-center') === null,
      centerOwnControls: [...(document.getElementById('sec-center')?.querySelectorAll(':scope > .bl-ctrl') || [])].map((w) => w.querySelector('input, select, .bl-curve')?.id || '(no id)'),
      /* THE SUMMARY LINE is the one that begins `petals` — the read-out's
         first line is the on-screen MODE line (session 13), so line 0 would
         be the wrong line to read. */
      firstLine: (document.getElementById('readout').textContent.split('\n').find((l) => /^petals /.test(l)) || ''),
      metricKeys: ['centerStyle', 'centerTris', 'centerSeat'].filter((k) => k in m),
    };
  }, retired);
  const p = [];
  if (res.rendered.length) p.push(`retired id(s) still render in the panel: ${res.rendered.join(', ')}`);
  if (res.centerMissing) p.push('there is no #sec-center — the Center container (session 23) is missing from the panel');
  if (res.centerOwnControls.length) p.push(`the Center container holds control(s) of its own: ${res.centerOwnControls.join(', ')} — a container, never a control, and never the retired rig`);
  if (!/^petals /.test(res.firstLine)) p.push('the read-out carries no summary line beginning `petals` — nothing to check');
  if (/\bcent(er|re)\b/i.test(res.firstLine)) p.push(`the read-out's summary line names a centre: "${res.firstLine}"`);
  if (res.metricKeys.length) p.push(`__bloomMetrics() still carries ${res.metricKeys.join(', ')} — a number under a label naming a computation nobody performs`);
  /* (iv) the source scan. */
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const files = ['bloom.js', 'bloom-geometry.js', 'bloom-registry.js', 'bloom.html', 'bloom-view-presets.js',
    ...fs.readdirSync(path.join(root, 'tools')).filter((f) => /^(bloom-|verify-bloom-|shot-bloom|diff-bloom-bytes)/.test(f) && /\.mjs$/.test(f)).map((f) => 'tools/' + f)];
  /* A `/` opens a regex only in these positions. `<` and `>` are deliberately
     NOT here — `</div>` in bloom.html would otherwise open one — and the
     arrow is admitted as the PAIR `=>`, which is how this gate's own
     `fail.some((f) => /…centerStyle…/.test(f))` is exempted. */
  const REGEX_OK = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';']);
  const REGEX_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
  /* Blanks every comment, string, template TEXT and regex body to spaces, in
     place, keeping newlines — so an offset into the result is an offset into
     the source. A `${…}` expression is left as CODE, because it is. The
     stack holds 'tmpl' for template text and a NUMBER for a `${…}`, that
     number being its own brace depth, so an object literal inside an
     interpolation does not end it — the nesting the old regexes could not
     see. */
  const stripToCode = (src) => {
    const out = src.split('');
    const n = src.length;
    const blank = (k) => { if (k < n && out[k] !== '\n') out[k] = ' '; };
    const stack = [];
    let prevChar = '', prevPrev = '', prevWord = '';
    const after = (c) => { prevPrev = prevChar; prevChar = c; prevWord = ''; };
    let i = 0;
    while (i < n) {
      const c = src[i];
      if (stack[stack.length - 1] === 'tmpl') {
        if (c === '\\') { blank(i); blank(i + 1); i += 2; continue; }
        if (c === '`') { blank(i); stack.pop(); after(')'); i++; continue; }
        if (c === '$' && src[i + 1] === '{') { blank(i); blank(i + 1); stack.push(0); after('{'); i += 2; continue; }
        blank(i); i++; continue;
      }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') { blank(i); i++; } continue; }
      if (c === '/' && src[i + 1] === '*') {
        const end = src.indexOf('*/', i + 2), stop = end === -1 ? n : end + 2;
        while (i < stop) { blank(i); i++; }
        continue;
      }
      if (c === "'" || c === '"') {
        /* unterminated stops at the newline — one line of damage, never the file */
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        const stop = (j < n && src[j] === c) ? j + 1 : j;
        while (i < stop) { blank(i); i++; }
        after(')');
        continue;
      }
      if (c === '`') { blank(i); stack.push('tmpl'); i++; continue; }
      if (c === '/' && (REGEX_OK.has(prevChar) || REGEX_WORDS.has(prevWord) || (prevChar === '>' && prevPrev === '='))) {
        let j = i + 1, cls = false, close = -1;
        while (j < n && src[j] !== '\n') {
          const d = src[j];
          if (d === '\\') { j += 2; continue; }
          if (cls) { if (d === ']') cls = false; } else if (d === '[') cls = true;
          else if (d === '/') { close = j; break; }
          j++;
        }
        if (close !== -1) {
          while (i <= close) { blank(i); i++; }
          while (i < n && /[a-z]/.test(src[i])) { blank(i); i++; }   /* flags */
          after(')');
          continue;
        }
        /* nothing closed it before the newline, and a regex literal may not
           span one — so this `/` is a division, and falls through. */
      }
      const top = stack[stack.length - 1];
      if (typeof top === 'number') {
        if (c === '{') stack[stack.length - 1]++;
        else if (c === '}') { if (top === 0) { stack.pop(); blank(i); } else stack[stack.length - 1]--; }
      }
      if (!/\s/.test(c)) { prevPrev = prevChar; prevChar = c; prevWord = /[A-Za-z0-9_$]/.test(c) ? prevWord + c : ''; }
      i++;
    }
    return { code: out.join(''), open: stack.length };
  };
  /* PART ONE — the walk over sources whose answer is WRITTEN DOWN, before it
     is trusted on the tree. On 35 real files a walk that blanked EVERYTHING
     would also report 0 hits, and the per-file validity check below cannot
     see a mis-classified region: it only knows the text still lines up. So
     each case declares the lines a retired id must be reported on, and the
     fixtures use `centerStyle` — a genuinely retired id, so this table is
     about the real names.

     THE HISTORICAL BUG ITSELF IS NOT REPRODUCIBLE IN A FIXTURE, and that is
     stated rather than faked: the phase shift is a WHOLE-FILE parity effect
     (session 22 found that removing any ONE of thirteen messages cleared
     it), so every small fixture re-aligns and the old chain passes them.
     What the table pins is the set of properties that make it impossible,
     and it was checked against seven mutations of this walk — the
     interpolation blanked as the old pass did, `}` never closing one, a
     string running past its newline, regex literals unrecognised, an escape
     ignored inside a template, the arrow dropped as a regex position, and a
     regex spanning a newline. Each turns at least one case red. */
  const WALK_CASES = [
    ['a bare identifier is a reference', 'if (centerStyle) x();', [1]],
    ['a property access is a reference', 'const v = ui.centerStyle;', [1]],
    ['a single-quoted label is row data', "const s = 'centerStyle';", []],
    ['a double-quoted label is row data', 'const s = "DOME x centerStyle";', []],
    ['a template literal TEXT is row data', 'const s = `the centerStyle rig`;', []],
    ['an interpolation is CODE', 'const s = `x ${centerStyle} y`;', [1]],
    ['a possessive inside a template does not re-pair the next label',
      "const a = `the owner's limit`;\nconst b = 'centerStyle';\nconst c = centerStyle;", [3]],
    ['code after a ternary whose nested template interpolates is still code',
      "const s = `curl ${a}${b !== c ? ` (floored to ${d})` : ''}`;\nconst t = centerStyle;", [2]],
    ['an interpolation holding an object literal does not end early',
      'const s = `a ${f({ k: 1 })} b`;\nconst t = centerStyle;', [2]],
    ['a regex body is literal text', 'const r = /centerStyle/.test(s);', []],
    ['a regex after an arrow is literal text', 'const r = xs.some((f) => /centerStyle/.test(f));', []],
    ['a division is not a regex', 'const q = a / b; const t = centerStyle;', [1]],
    ['a block comment is exempt', '/* centerStyle went in session 20 */\nconst t = centerStyle;', [2]],
    ['a line comment is exempt', '// centerStyle went in session 20\nconst t = centerStyle;', [2]],
    ['an escaped backtick does not close a template',
      'const s = `a \\` centerStyle b`;\nconst t = centerStyle;', [2]],
    ['an escaped quote does not close a string',
      "const s = 'a \\' centerStyle b';\nconst t = centerStyle;", [2]],
    ['markup is not a regex', '</div>\nconst t = centerStyle;', [2]],
    ['an unterminated quote in prose costs its own line, never the file',
      "<!-- the flower's own vocabulary -->\nconst t = centerStyle;", [2]],
    ['a slash with no closing slash on its line is a division',
      'const r = { a: 1 } / 2;\nconst t = centerStyle / 4;', [2]],
    ['the line reported is the line it is on', '\n\n\n\nconst t = centerStyle;', [5]],
  ];
  const linesOf = (code, id) => {
    const out = [], re = new RegExp(`\\b${id}\\b`, 'g');
    let mm; while ((mm = re.exec(code))) out.push(code.slice(0, mm.index).split('\n').length);
    return out;
  };
  const caseBad = [];
  for (const [label, fixture, want] of WALK_CASES) {
    const { code, open } = stripToCode(fixture);
    if (code.length !== fixture.length || open !== 0) { caseBad.push(`${label}: the walk did not vouch for its own fixture`); continue; }
    const got = linesOf(code, 'centerStyle');
    if (String(got) !== String(want)) caseBad.push(`${label}: reported ${got.length ? 'line(s) ' + got.join(',') : 'nothing'} where the fixture says ${want.length ? 'line(s) ' + want.join(',') : 'nothing'}`);
  }
  if (caseBad.length) p.push(`the source walk fails its own written-down cases, so its reading of the tree is unverified: ${caseBad.join('; ')}`);

  const refs = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(root, f), 'utf8');
    const { code, open } = stripToCode(raw);
    /* VALIDITY, per file. A scan whose text no longer lines up with the
       source cannot name a line, so this fails the gate rather than
       reporting from an unknown state. */
    const badWalk = [];
    if (code.length !== raw.length) badWalk.push(`the walk returned ${code.length} chars for ${raw.length}`);
    if (code.split('\n').length !== raw.split('\n').length) badWalk.push('the line count moved');
    if (open !== 0) badWalk.push(`the walk ended with ${open} literal(s) still open`);
    if (badWalk.length) { p.push(`HARNESS INVALID — the source walk cannot vouch for ${f}: ${badWalk.join('; ')}`); continue; }
    const lines = raw.split('\n');
    for (const id of retired) for (const line of linesOf(code, id)) refs.push(`${f}:${line} ${id} — ${lines[line - 1].trim().slice(0, 90)}`);
  }
  if (refs.length) p.push(`retired id(s) still referenced as identifiers in executable bloom source: ${refs.slice(0, 12).join('; ')}${refs.length > 12 ? ` … and ${refs.length - 12} more` : ''}`);
  if (p.length) note(`${tag}: ${p.join('; ')}`);
  else ok.push(`${tag}: ${retired.length} retired ids (${retired.join(', ')}) absent from the DOM, the read-out's summary line, the metrics, and as identifiers in ${files.length} bloom source files — the walk passed its ${WALK_CASES.length} written-down cases and vouched for every file; the Center container holds no control of its own`);
}

/* ===================================================================
   ROUTE (o) — THE ANDROECIUM (session 21), on ONE page, in BOTH directions.
   The section is hidden whole under SPHERE and the four sub-controls hide at
   count 0; the read-out's STAMENS line, its (CLAMPED at the hub radius)
   clause, its PETAL-ROOT ANNULUS flag, its ROOTS FUSE flag and the
   SLENDERNESS line's verbatim UNMEASURED tag are asserted against the
   OWNER'S own record (routes (k)-(m)'s discipline). The inertness clauses
   are BEHAVIOURAL: six stamens are asked for while the head is a SPHERE and
   the build's triangle count must not move from the bare sphere's; every
   sub-control is driven to its maximum at count 0 and the count must not
   move from the default's (the byte identity itself is the matrix's GATED
   rows; this is the same claim on the DOM path). The negative control
   freezes the read-out so the STAMENS line cannot appear where the geometry
   builds one.

   SESSION 23 ADDS FOUR CLAUSES TO EVERY STEP (route (q) in the header): the
   Center CONTAINER hidden iff both parts are (SPHERE); the count's read-out
   span carrying the KEPT clause with the state's own values exactly at
   count 0; the stamen spread's CAP MARK at the owner's saturation exactly
   when that is inside the range; and the FILAMENT-AGAINST-STYLE flag on the
   STAMENS line against the builder's own record, present iff both parts
   are built. Three steps are added for them: the style beside six straight
   filaments (clear), six at curl 90 beside it (the flag), and one stamen (no
   dead travel, no mark). The negative control also freezes the container's
   `hidden`, the count's span and the spread wrapper's mark. */
{
  const tag = '[stamens]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => {
      const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} });
      /* Session 23's clauses: the container never hides, the count's span
         never changes, the cap mark never lands (writes to the wrapper's
         dataset, style and class list are swallowed). */
      const sec = document.getElementById('sec-center'); Object.defineProperty(sec, 'hidden', { get: () => false, set: () => {}, configurable: true });
      const span = document.getElementById('stamenCount').closest('.bl-ctrl').querySelector('.bl-val'); const s0 = span.textContent; Object.defineProperty(span, 'textContent', { get: () => s0, set: () => {} });
      const wrap = document.getElementById('stamenSpread').closest('.bl-ctrl');
      Object.defineProperty(wrap, 'dataset', { value: new Proxy({}, { set: () => true, deleteProperty: () => true, get: () => undefined }), configurable: true });
      wrap.style.setProperty = () => {}; wrap.style.removeProperty = () => {};
      wrap.classList.add = () => {}; wrap.classList.remove = () => {};
    });
  }
  /* THE COIL'S TWO SUB-CONTROLS (F1.3a) sit behind their own nested gates —
     the radius once a coil MODE is chosen, the turns once a coil is BUILT (a
     radius of exactly 0 is the plain rod by branch) — so they are held to
     those gates below, both ways, rather than to "present". */
  const COIL_SUBS = ['stamenCoilRadius', 'stamenCoilTurns'];
  const SUBS = CONTROLS.filter((c) => c.section === 'androecium' && c.id !== 'stamenCount' && !COIL_SUBS.includes(c.id)).map((c) => c.id);
  const step = async (label, sets, want = {}) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return null; }
    const res = await page.evaluate((subs) => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
      const hid = (id) => document.getElementById(id).closest('.bl-ctrl').hidden;
      const sec = document.getElementById('sec-androecium');
      const centerSec = document.getElementById('sec-center');
      const spreadWrap = document.getElementById('stamenSpread').closest('.bl-ctrl');
      return { count: Math.round(Number(ui.stamenCount)), sphere: m.sphereMode === true,
               coilMode: ui.stamenCoil, coilRadius: Number(ui.stamenCoilRadius), coilRHidden: hid('stamenCoilRadius'), coilNHidden: hid('stamenCoilTurns'),
               coilBuilt: !!(m.androecium && m.androecium.coil), coilSaid: /· COILED \(independent\)/.test(txt),
               sectionHidden: sec ? sec.hidden : null, countHidden: hid('stamenCount'), subsHidden: subs.map((id) => hid(id)),
               /* session 23: the container, the kept clause, the cap mark, the flag */
               center: centerSec ? centerSec.hidden : null,
               countSaid: document.getElementById('stamenCount').closest('.bl-ctrl').querySelector('.bl-val').textContent,
               kept: { layout: String(ui.stamenLayout).toLowerCase(), spread: Number(ui.stamenSpread).toFixed(2), length: String(ui.stamenLength), curl: String(ui.stamenCurl) },
               spreadSaid: spreadWrap.querySelector('.bl-val').textContent,
               capData: spreadWrap.dataset.cap ?? null, capVar: spreadWrap.style.getPropertyValue('--bl-cap') || null, capClass: spreadWrap.classList.contains('bl-ctrl--capped'),
               spreadMin: Number(document.getElementById('stamenSpread').min), spreadMax: Number(document.getElementById('stamenSpread').max),
               onAxis: !!(m.androecium && m.androecium.onAxis),
               styles: m.styles.length, fs: m.filamentStyle,
               fsSaid: (txt.match(/nearest filament to the style ([\d.]+) mm at (-?[\d.]+) mm up/) || []).slice(1),
               crossSaid: /\(FILAMENT AGAINST STYLE:/.test(txt),
               has: m.androecium !== null, emitted: m.stamens.length, freeEnds: m.freeEnds, shownTris: m.shownTris,
               clamped: !!(m.androecium && m.androecium.clamped), annulus: m.androecium ? m.androecium.inPetalRootAnnulus : 0,
               saturation: m.androecium ? m.androecium.saturation : null, saturationSaid: (txt.match(/([\d.]+)x is as far as this hub goes, the slider above it is dead here/) || [])[1],
               fuse: !!(m.stamenNearest && m.androecium && m.stamenNearest.root.mm < m.androecium.diameter),
               lineSaid: (txt.match(/^STAMENS (\d+) on /m) || [])[1], clampSaid: /\(CLAMPED at the hub radius/.test(txt),
               annulusSaid: /STAND INSIDE THE PETAL-ROOT ANNULUS/.test(txt), fuseSaid: /\(ROOTS FUSE\)/.test(txt),
               slenderSaid: /^SLENDERNESS L\/d (?:style [\d.]+ · )?filament [\d.]+(?: \([^()]*\))?(?: · style [\d.]+)? \((live|export)\) — UNMEASURED — no coupon has been printed$/m.test(txt) && /^SLENDERNESS L\/d (?:[^\n]* · )?filament [\d.]+/m.test(txt) };
    }, SUBS);
    const p = [];
    const wantPresent = !res.sphere && res.count >= 1;
    if (res.sectionHidden === null) p.push('there is no #sec-androecium section in the panel');
    else if (res.sectionHidden !== res.sphere) p.push(`the Androecium section is ${res.sectionHidden ? 'hidden' : 'shown'} while the head ${res.sphere ? 'is a SPHERE (hidden and inert)' : 'is a cap'}`);
    if (res.countHidden !== res.sphere) p.push(`stamenCount is ${res.countHidden ? 'hidden' : 'shown'} under a ${res.sphere ? 'sphere' : 'cap'}`);
    res.subsHidden.forEach((h, i) => { if (h !== !wantPresent) p.push(`${SUBS[i]} is ${h ? 'hidden' : 'shown'} while the androecium is ${wantPresent ? 'present' : 'absent'}`); });
    {
      const rWant = wantPresent && res.coilMode === 'INDEPENDENT', nWant = rWant && res.coilRadius !== 0;
      if (res.coilRHidden !== !rWant) p.push(`stamenCoilRadius is ${res.coilRHidden ? 'hidden' : 'shown'} while the coil mode is ${res.coilMode} on ${wantPresent ? 'a present' : 'an absent'} androecium`);
      if (res.coilNHidden !== !nWant) p.push(`stamenCoilTurns is ${res.coilNHidden ? 'hidden' : 'shown'} while ${nWant ? 'a coil is built' : 'no coil is built'} (mode ${res.coilMode}, radius ${res.coilRadius})`);
      if (res.coilBuilt !== nWant) p.push(`the owner ${res.coilBuilt ? 'declares a coil' : 'declares none'} while the controls ${nWant ? 'build one' : 'build none'}`);
      if (res.coilSaid !== nWant) p.push(`the STAMENS line's COILED clause is ${res.coilSaid ? 'shown' : 'absent'} while ${nWant ? 'a coil is built' : 'no coil is built'}`);
      if (want.coil !== undefined && want.coil !== nWant) p.push(`this step was meant to ${want.coil ? 'build' : 'not build'} a coil`);
    }
    if (res.has !== wantPresent) p.push(`the owner ${res.has ? 'declares an androecium' : 'declares none'} while the state says ${wantPresent ? 'present' : 'absent'}`);
    if (res.emitted !== (wantPresent ? res.count : 0) || res.freeEnds !== (wantPresent ? res.count : 0)) p.push(`${res.emitted} stamens emitted / ${res.freeEnds} free ends for ${wantPresent ? res.count : 0} expected`);
    if ((res.lineSaid !== undefined) !== wantPresent) p.push(`the STAMENS line is ${res.lineSaid !== undefined ? 'SHOWN' : 'ABSENT'} while the owner ${wantPresent ? 'declares an androecium' : 'declares none'}`);
    else if (wantPresent && Number(res.lineSaid) !== res.count) p.push(`the STAMENS line says ${res.lineSaid}, the control says ${res.count}`);
    if (res.slenderSaid !== wantPresent) p.push(`the SLENDERNESS line's filament part with its verbatim UNMEASURED tag is ${res.slenderSaid ? 'shown' : 'absent'} while the androecium is ${wantPresent ? 'present' : 'absent'}`);
    if (res.clampSaid !== res.clamped) p.push(`the (CLAMPED at the hub radius) clause is ${res.clampSaid ? 'shown' : 'absent'} while the owner reports clamped ${res.clamped}`);
    /* THE DEAD TRAVEL IS TOLD, AND THE NUMBER IS THE OWNER'S (Eva, Sep 6): where
       the multiplier runs out on this bloom is printed in the clamp clause and
       must equal the owner's `saturation` — a static range cannot be narrowed to
       remove dead travel that is a function of the count and the hub. */
    if (res.clamped) {
      if (res.saturationSaid === undefined) p.push('the clamp clause does not say where the multiplier runs out on this bloom');
      else if (Math.abs(Number(res.saturationSaid) - res.saturation) > 0.005) p.push(`the read-out says the multiplier runs out at ${res.saturationSaid}x, the owner says ${res.saturation}`);
    } else if (res.saturationSaid !== undefined) p.push('the read-out names a saturation point while the owner reports no clamp');
    if (res.annulusSaid !== (res.annulus > 0)) p.push(`the PETAL-ROOT ANNULUS flag is ${res.annulusSaid ? 'shown' : 'absent'} while the owner counts ${res.annulus} stamens in it`);
    if (res.fuseSaid !== res.fuse) p.push(`the ROOTS FUSE flag is ${res.fuseSaid ? 'shown' : 'absent'} while the owner's nearest roots ${res.fuse ? 'are' : 'are not'} closer than a filament`);
    for (const k of ['clamped', 'annulusFlag', 'fuse']) if (want[k] !== undefined && (k === 'annulusFlag' ? res.annulus > 0 : res[k]) !== want[k]) p.push(`this step expects ${k} ${want[k]}, the owner reports ${k === 'annulusFlag' ? res.annulus > 0 : res[k]}`);
    if (want.tris !== undefined && res.shownTris !== want.tris) p.push(`the build has ${res.shownTris} triangles where the reference step had ${want.tris} — a hidden androecium control reached the geometry`);
    /* ---- session 23, clause 1: THE CONTAINER, hidden iff both parts are ---- */
    if (res.center === null) p.push('there is no #sec-center container in the panel');
    else if (res.center !== res.sphere) p.push(`the Center container is ${res.center ? 'hidden while its parts are on screen (a cap)' : 'shown while both parts are hidden (SPHERE)'}`);
    /* ---- clause 2: THE KEPT CLAUSE on the count, with the state's values, iff the part is off ---- */
    const keptRe = /^none — its settings are kept \((\w+), spread ([\d.]+)x, (\d+) mm, curl (-?\d+)°\) and return with the count$/;
    const keptSaid = keptRe.exec(res.countSaid);
    if (res.count === 0) {
      if (!keptSaid) p.push(`the kept clause is absent at count 0 — the count read-out says "${res.countSaid}"`);
      else {
        const [, layout, spread, length, curl] = keptSaid;
        if (layout !== res.kept.layout || spread !== res.kept.spread || length !== res.kept.length || curl !== res.kept.curl) p.push(`the kept clause names (${layout}, ${spread}x, ${length} mm, ${curl}°) while the state holds (${res.kept.layout}, ${res.kept.spread}x, ${res.kept.length} mm, ${res.kept.curl}°)`);
      }
    } else if (/kept/.test(res.countSaid) || !new RegExp(`^${res.count} stamens?, pill anthers$`).test(res.countSaid)) p.push(`the kept clause is shown at ${res.count} stamens — the count read-out says "${res.countSaid}"`);
    /* ---- clause 3: THE CAP MARK at the owner's saturation, iff inside the range ---- */
    if (res.has) {
      const capWant = res.saturation < res.spreadMax;
      const frac = Math.min(1, Math.max(0, (res.saturation - res.spreadMin) / (res.spreadMax - res.spreadMin)));
      if (res.capClass !== capWant || (res.capData !== null) !== capWant || (res.capVar !== null) !== capWant) p.push(`the cap mark is ${res.capClass || res.capData !== null || res.capVar !== null ? 'drawn' : 'absent'} (class ${res.capClass}, data-cap ${res.capData}, --bl-cap ${res.capVar}) while the owner saturates at ${res.saturation.toFixed(2)}x against a range top of ${res.spreadMax}`);
      else if (capWant) {
        if (Math.abs(Number(res.capData) - res.saturation) > 0.005) p.push(`the cap mark says ${res.capData}x, the owner says ${res.saturation.toFixed(2)}x`);
        if (Math.abs(Number(res.capVar) - frac) > 0.001) p.push(`the cap mark sits at ${res.capVar} of the track, the owner puts it at ${frac.toFixed(4)}`);
      }
      const spanCap = (res.spreadSaid.match(/(?:CLAMPED at|saturates at) ([\d.]+)x/) || [])[1];
      if (res.onAxis) { if (!/ON THE AXIS/.test(res.spreadSaid)) p.push(`the spread read-out does not say ON THE AXIS on the on-axis corner: "${res.spreadSaid}"`); }
      else if (res.clamped) { if (!/CLAMPED at/.test(res.spreadSaid) || Math.abs(Number(spanCap) - res.saturation) > 0.005) p.push(`the spread read-out does not say CLAMPED at the owner's ${res.saturation.toFixed(2)}x: "${res.spreadSaid}"`); }
      else if (capWant) { if (!/saturates at/.test(res.spreadSaid) || Math.abs(Number(spanCap) - res.saturation) > 0.005) p.push(`the spread read-out does not name the cap ${res.saturation.toFixed(2)}x inside the range: "${res.spreadSaid}"`); }
      else if (!/no dead travel/.test(res.spreadSaid)) p.push(`the spread read-out names a cap while the owner saturates past the range top: "${res.spreadSaid}"`);
      if (want.cap !== undefined && capWant !== want.cap) p.push(`this step expects a cap mark ${want.cap ? 'inside' : 'outside'} the range, the owner saturates at ${res.saturation.toFixed(2)}x`);
    } else if (res.capClass || res.capData !== null || res.capVar !== null) p.push('the cap mark is still drawn with the androecium absent');
    /* ---- clause 4: THE FILAMENT-AGAINST-STYLE FLAG, present iff both parts are built, against the builder's own record ---- */
    const fsWant = res.emitted > 0 && res.styles > 0;
    if ((res.fs !== null) !== fsWant) p.push(`the owner ${res.fs !== null ? 'reports a filament-to-style approach' : 'reports none'} while ${fsWant ? 'both parts are built' : 'a part is absent'} — a claim nothing can make must read as absent`);
    if ((res.fsSaid.length > 0) !== fsWant) p.push(`the nearest-filament-to-the-style clause is ${res.fsSaid.length ? 'shown' : 'absent'} while ${fsWant ? 'both parts are built' : 'a part is absent'}`);
    else if (fsWant && res.fs !== null) {
      if (Math.abs(Number(res.fsSaid[0]) - res.fs.mm) > 0.005) p.push(`the read-out says the nearest filament is ${res.fsSaid[0]} mm from the style, the builder says ${res.fs.mm.toFixed(3)}`);
      if (Math.abs(Number(res.fsSaid[1]) - res.fs.z) > 0.05) p.push(`the read-out puts the approach at ${res.fsSaid[1]} mm up, the builder at ${res.fs.z.toFixed(2)}`);
      if (res.crossSaid !== res.fs.crossing) p.push(`the FILAMENT AGAINST STYLE flag is ${res.crossSaid ? 'shown' : 'absent'} while the owner reports ${res.fs.crossing ? 'a crossing' : 'no crossing'} (${res.fs.mm.toFixed(3)} mm against ${res.fs.threshold.toFixed(2)})`);
    }
    if (want.crossing !== undefined && (want.crossing === null ? res.fs !== null : !res.fs || res.fs.crossing !== want.crossing)) p.push(`this step expects ${want.crossing === null ? 'no approach record' : want.crossing ? 'a crossing' : 'clearance'}, the owner reports ${res.fs === null ? 'none' : `${res.fs.mm.toFixed(3)} mm, crossing ${res.fs.crossing}`}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: section ${res.sectionHidden ? 'hidden' : 'shown'}, container ${res.center ? 'hidden' : 'shown'}, ${res.emitted} stamens emitted, ${res.lineSaid !== undefined ? 'STAMENS line shown' : 'no STAMENS line'}${res.clamped ? ', CLAMPED' : ''}${res.annulus ? `, ${res.annulus} in the petal-root annulus` : ''}${res.fuse ? ', ROOTS FUSE' : ''}${res.count === 0 ? ', the kept clause on the count' : ''}${res.has ? `, cap ${res.capData !== null ? `marked at ${res.capData}x` : 'past the range'}` : ''}${res.fs ? `, nearest to the style ${res.fs.mm.toFixed(2)} mm${res.fs.crossing ? ' (FILAMENT AGAINST STYLE)' : ' (clear)'}` : ''}`);
    return res;
  };
  const dflt = await step('defaults (the section shows its count, the sub-controls hide, no androecium; the kept clause on the count)', []);
  await step('6 stamens on a RING (the sub-controls appear; the six-stamen candidate; the cap mark inside the range)', [{ id: 'stamenCount', value: '6' }], { clamped: false, annulusFlag: false, fuse: false, cap: true, crossing: null });
  await step('a style beside six STRAIGHT filaments (nearest approach is the ring radius: clear, no flag)', [{ id: 'gynoecium', value: 'STYLE' }], { crossing: false });
  await step('six at curl 90 beside the style (FILAMENT AGAINST STYLE — a flag, never a refusal)', [{ id: 'stamenCurl', value: '90' }], { crossing: true });
  await step('back to straight, the style off (the clause goes with the style)', [{ id: 'stamenCurl', value: '0' }, { id: 'gynoecium', value: 'NONE' }], { crossing: null });
  await step('1 stamen on a RING (the multiplier saturates past the range top on this hub: no cap mark)', [{ id: 'stamenCount', value: '1' }], { cap: false, clamped: false });
  await step('120 on the DISC (CLAMPED at the hub; the petal-root annulus flag; the cap mark low on the track)', [{ id: 'stamenLayout', value: 'DISC' }, { id: 'stamenCount', value: '120' }], { clamped: true, annulusFlag: true, cap: true });
  await step('6 on a RING x spread 0.60 (the roots fuse — a flag)', [{ id: 'stamenLayout', value: 'RING' }, { id: 'stamenCount', value: '6' }, { id: 'stamenSpread', value: '0.6' }], { clamped: false, fuse: true, cap: true });
  /* F1.3a: the coil's nested gates, both directions — the radius and the
     turns APPEAR with an independent coil, the turns HIDE at a radius of 0
     (the plain rod by branch), and both hide again at NONE. */
  await step('6 COILED (independent: the radius and the turns appear, the COILED clause on the STAMENS line)', [{ id: 'stamenSpread', value: '2' }, { id: 'stamenCoil', value: 'INDEPENDENT' }], { coil: true });
  await step('6 COILED x radius 0 (the plain rod by branch: the turns hide, the radius stays)', [{ id: 'stamenCoilRadius', value: '0' }], { coil: false });
  await step('back to the coil NONE (both hide)', [{ id: 'stamenCoilRadius', value: '1.5' }, { id: 'stamenCoil', value: 'NONE' }], { coil: false });
  const bare = await step('CONTINUOUS x SPHERE x count 0 (the section hides whole)', [{ id: 'stamenSpread', value: '2' }, { id: 'stamenCount', value: '0' }, { id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }]);
  if (bare) await step('6 stamens asked for under SPHERE (hidden AND inert: the build must not move)', [{ id: 'stamenCount', value: '6' }], { tris: bare.shownTris });
  await step('back to CAP (the section and the six stamens return)', [{ id: 'hubShape', value: 'CAP' }]);
  if (dflt) await step('RADIAL x count 0 x every sub-control at MAXIMUM (hidden and inert: the default\'s own count)', [{ id: 'placement', value: 'RADIAL' }, { id: 'stamenCount', value: '0' }, { id: 'stamenLayout', value: 'DISC' }, { id: 'stamenSpread', value: '6' }, { id: 'stamenLength', value: '40' }, { id: 'stamenCurl', value: '180' }], { tris: dflt.shownTris });
}

/* ===================================================================
   ROUTE (p) — THE GYNOECIUM (session 22), on ONE page, in BOTH directions,
   route (o)'s discipline on the second part of the centre. The section is
   hidden whole under SPHERE and the two sub-controls hide at NONE; the
   read-out's STYLE line, its ABOVE / BELOW-the-anthers clause (against the
   builder's own apexes), its WIDER THAN THE HUB flag and the SLENDERNESS
   line's `style` part with the verbatim UNMEASURED tag are asserted against
   the OWNER'S own record. The inertness clauses are BEHAVIOURAL: a style is
   asked for under a SPHERE and the count must not move from the bare
   sphere's; the sub-controls at maximum with NONE must not move from the
   default's; and the WHOLE centre at maximum under SPHERE must not move
   either. The negative control's frozen read-out makes the STYLE line
   absent where the geometry builds one.

   SESSION 23 ADDS TWO CLAUSES TO EVERY STEP: the Center CONTAINER hidden iff
   both parts are (SPHERE), and the style read-out span carrying the KEPT
   clause with the state's own values exactly at NONE. The negative control
   also freezes that span. */
{
  const tag = '[style]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => {
      const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} });
      const span = document.getElementById('gynoecium').closest('.bl-ctrl').querySelector('.bl-val'); const s0 = span.textContent; Object.defineProperty(span, 'textContent', { get: () => s0, set: () => {} });
    });
  }
  const SUBS = CONTROLS.filter((c) => c.section === 'gynoecium' && c.id !== 'gynoecium').map((c) => c.id);
  const step = async (label, sets, want = {}) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return null; }
    const res = await page.evaluate((subs) => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
      const hid = (id) => document.getElementById(id).closest('.bl-ctrl').hidden;
      const sec = document.getElementById('sec-gynoecium');
      const centerSec = document.getElementById('sec-center');
      const stigmaTop = m.styles.length ? Math.max(...m.styles[0].lobes.map((l) => l.apex[2])) : null;
      const antherTop = m.stamens.length ? Math.max(...m.stamens.map((a) => a.apex[2])) : null;
      return { value: ui.gynoecium, sphere: m.sphereMode === true,
               sectionHidden: sec ? sec.hidden : null, ctlHidden: hid('gynoecium'), subsHidden: subs.map((id) => hid(id)),
               center: centerSec ? centerSec.hidden : null,
               styleSaid: document.getElementById('gynoecium').closest('.bl-ctrl').querySelector('.bl-val').textContent,
               kept: { length: String(ui.styleLength), curl: String(ui.styleCurl) },
               has: m.gynoecium !== null, emitted: m.styles.length, shownTris: m.shownTris,
               wider: !!(m.gynoecium && m.gynoecium.widerThanHub), widerSaid: /WIDER THAN THE HUB/.test(txt),
               above: stigmaTop !== null && antherTop !== null ? stigmaTop >= antherTop : null,
               aboveSaid: (txt.match(/mm (ABOVE|BELOW) the highest anther/) || [])[1],
               lineSaid: /^STYLE on the axis/m.test(txt),
               slenderSaid: /^SLENDERNESS L\/d (?:filament [\d.]+ · )?style [\d.]+ \((live|export)\) — UNMEASURED — no coupon has been printed$/m.test(txt) };
    }, SUBS);
    const p = [];
    const wantPresent = !res.sphere && res.value === 'STYLE';
    if (res.sectionHidden === null) p.push('there is no #sec-gynoecium section in the panel');
    else if (res.sectionHidden !== res.sphere) p.push(`the Gynoecium section is ${res.sectionHidden ? 'hidden' : 'shown'} while the head ${res.sphere ? 'is a SPHERE (hidden and inert)' : 'is a cap'}`);
    if (res.ctlHidden !== res.sphere) p.push(`gynoecium is ${res.ctlHidden ? 'hidden' : 'shown'} under a ${res.sphere ? 'sphere' : 'cap'}`);
    res.subsHidden.forEach((h, i) => { if (h !== !wantPresent) p.push(`${SUBS[i]} is ${h ? 'hidden' : 'shown'} while the gynoecium is ${wantPresent ? 'present' : 'absent'}`); });
    if (res.has !== wantPresent) p.push(`the owner ${res.has ? 'declares a gynoecium' : 'declares none'} while the state says ${wantPresent ? 'present' : 'absent'}`);
    if (res.emitted !== (wantPresent ? 1 : 0)) p.push(`${res.emitted} styles emitted for ${wantPresent ? 1 : 0} expected`);
    if (res.lineSaid !== wantPresent) p.push(`the STYLE line is ${res.lineSaid ? 'SHOWN' : 'ABSENT'} while the owner ${wantPresent ? 'declares a gynoecium' : 'declares none'}`);
    if (res.slenderSaid !== wantPresent) p.push(`the SLENDERNESS line's style part with its verbatim UNMEASURED tag is ${res.slenderSaid ? 'shown' : 'absent'} while the gynoecium is ${wantPresent ? 'present' : 'absent'}`);
    if (res.widerSaid !== res.wider) p.push(`the WIDER THAN THE HUB flag is ${res.widerSaid ? 'shown' : 'absent'} while the owner reports ${res.wider}`);
    if ((res.aboveSaid !== undefined) !== (res.above !== null)) p.push(`the ABOVE/BELOW-the-anthers clause is ${res.aboveSaid !== undefined ? 'shown' : 'absent'} while ${res.above !== null ? 'both parts are built' : 'both parts are not built'}`);
    else if (res.above !== null && (res.aboveSaid === 'ABOVE') !== res.above) p.push(`the read-out says the stigma is ${res.aboveSaid} the highest anther, the builder's apexes say ${res.above ? 'ABOVE' : 'BELOW'}`);
    for (const k of ['wider']) if (want[k] !== undefined && res[k] !== want[k]) p.push(`this step expects ${k} ${want[k]}, the owner reports ${res[k]}`);
    if (want.above !== undefined && res.above !== want.above) p.push(`this step expects the stigma ${want.above ? 'ABOVE' : 'BELOW'} the anthers, the builder's apexes say ${res.above === null ? 'neither (a part is missing)' : res.above ? 'ABOVE' : 'BELOW'}`);
    if (want.tris !== undefined && res.shownTris !== want.tris) p.push(`the build has ${res.shownTris} triangles where the reference step had ${want.tris} — a hidden gynoecium control reached the geometry`);
    /* ---- session 23: the container, and the kept clause on the style ---- */
    if (res.center === null) p.push('there is no #sec-center container in the panel');
    else if (res.center !== res.sphere) p.push(`the Center container is ${res.center ? 'hidden while its parts are on screen (a cap)' : 'shown while both parts are hidden (SPHERE)'}`);
    const keptSaid = /^none — its settings are kept \((\d+) mm, curl (-?\d+)°\) and return with the style$/.exec(res.styleSaid);
    if (res.value === 'NONE') {
      if (!keptSaid) p.push(`the kept clause is absent at NONE — the style read-out says "${res.styleSaid}"`);
      else if (keptSaid[1] !== res.kept.length || keptSaid[2] !== res.kept.curl) p.push(`the kept clause names (${keptSaid[1]} mm, ${keptSaid[2]}°) while the state holds (${res.kept.length} mm, ${res.kept.curl}°)`);
    } else if (/kept/.test(res.styleSaid)) p.push(`the kept clause is shown with a style present — the style read-out says "${res.styleSaid}"`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: section ${res.sectionHidden ? 'hidden' : 'shown'}, container ${res.center ? 'hidden' : 'shown'}, ${res.emitted} style${res.emitted === 1 ? '' : 's'} emitted, ${res.lineSaid ? 'STYLE line shown' : 'no STYLE line'}${res.aboveSaid ? `, stigma ${res.aboveSaid} the anthers` : ''}${res.wider ? ', WIDER THAN THE HUB' : ''}${res.value === 'NONE' ? ', the kept clause on the style' : ''}`);
    return res;
  };
  const dflt = await step('defaults (the section shows its choice at NONE, the sub-controls hide, no gynoecium)', []);
  await step('a style on the bare apex (the sub-controls appear)', [{ id: 'gynoecium', value: 'STYLE' }], { wider: false });
  await step('style x 6 stamens (both present: the stigma ABOVE the anthers at 25 over 20 mm)', [{ id: 'stamenCount', value: '6' }], { above: true });
  await step('style length 5 x 6 stamens (the stigma BELOW the anthers)', [{ id: 'styleLength', value: '5' }], { above: false });
  await step('the APEX CORNER — ALL MIN x sheet 2.40 x spread min (WIDER THAN THE HUB, told)', [{ id: 'styleLength', value: '25' }, { id: 'stamenCount', value: '0' }, { id: 'petalCount', value: '3' }, { id: 'petalWidth', value: '8' }, { id: 'sheetThickness', value: '2.4' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }], { wider: true });
  const bare = await step('CONTINUOUS x SPHERE x NONE (the section hides whole)', [{ id: 'petalCount', value: '8' }, { id: 'petalWidth', value: '12' }, { id: 'sheetThickness', value: '1.2' }, { id: 'footDelicacy', value: '0.5' }, { id: 'spread', value: '2' }, { id: 'gynoecium', value: 'NONE' }, { id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }]);
  if (bare) await step('a style asked for under SPHERE (hidden AND inert: the build must not move)', [{ id: 'gynoecium', value: 'STYLE' }], { tris: bare.shownTris });
  if (bare) await step('the WHOLE centre at MAXIMUM under SPHERE (both parts hidden and inert: the build must not move)', [{ id: 'styleLength', value: '40' }, { id: 'styleCurl', value: '180' }, { id: 'stamenCount', value: '120' }, { id: 'stamenLayout', value: 'DISC' }, { id: 'stamenSpread', value: '6' }, { id: 'stamenLength', value: '40' }, { id: 'stamenCurl', value: '180' }], { tris: bare.shownTris });
  await step('back to CAP (the section, the style and the stamens return)', [{ id: 'hubShape', value: 'CAP' }]);
  if (dflt) await step('RADIAL x NONE x every sub-control at MAXIMUM (hidden and inert: the default\'s own count)', [{ id: 'placement', value: 'RADIAL' }, { id: 'stamenCount', value: '0' }, { id: 'stamenLayout', value: 'RING' }, { id: 'stamenSpread', value: '2' }, { id: 'stamenLength', value: '20' }, { id: 'stamenCurl', value: '0' }, { id: 'gynoecium', value: 'NONE' }, { id: 'styleLength', value: '40' }, { id: 'styleCurl', value: '180' }], { tris: dflt.shownTris });
}

/* ===================================================================
   ROUTE (t) — THE ANTHER'S SEVEN (session 29), on ONE page, in BOTH
   directions, route (o)'s discipline one level further in.

   WHY IT IS OWED even though route (d) already drives every predicate's
   driver: route (d) starts from the DEFAULTS, where the androecium is absent
   — so `antherPoints` is hidden at BOTH ends of the roundedness slider, its
   predicate agrees at both, and the transition this session actually added is
   never exercised. That is the vacuity the WITNESS map's `pre` mechanism
   exists for one level up, and this route is it for the roundedness
   transition: with six stamens present, roundedness 1 must HIDE the two
   outline controls and roundedness below 1 must SHOW them.

   THE INERTNESS CLAUSE IS BEHAVIOURAL AND IT IS THE POINT. The two hidden
   controls are driven to their extremes at a roundedness of exactly 1 and the
   build's TRIANGLE COUNT must not move from the shipped pill's — which is a
   stronger statement than `hidden`, because the point count's whole job is to
   change the tessellation. A shipped, hidden, NOT-inert slider is what this
   catches, and neither route (a) nor route (d) can see it.

   AND THE READ-OUT'S ANTHER LINE against the OWNER'S own record: the lattice,
   the waist, the two floor clauses in both directions, the SPHERE band, the
   COINCIDENT corner and the lobe count. The negative control freezes the
   read-out, so the ANTHER line cannot follow a geometry that moved. */
{
  const tag = '[anther]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => {
      const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} });
      for (const w of document.querySelectorAll('.bl-ctrl')) Object.defineProperty(w, 'hidden', { get: () => false, set: () => {}, configurable: true });
    });
  }
  const OUTLINE_SUBS = ['antherPoints', 'antherPinch'];
  const step = async (label, sets, want = {}) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return null; }
    const res = await page.evaluate((subs) => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
      const hid = (id) => document.getElementById(id).closest('.bl-ctrl').hidden;
      const sec = document.getElementById('sec-antherTip');
      const line = (txt.match(/^ANTHER .*$/m) || [])[0] || null;
      return { has: m.androecium !== null, anther: m.androecium ? m.androecium.anther : null,
               shownTris: m.shownTris, sectionHidden: sec ? sec.hidden : null,
               depth: sec ? (() => { let d = 0, e = sec.parentElement; while (e) { if (e.tagName === 'DETAILS') d++; e = e.parentElement; } return d; })() : null,
               subsHidden: subs.map((id) => hid(id)), rho: Number(ui.antherRoundedness),
               line, sidesSaid: (line && (line.match(/revolved through (\d+) sides/) || [])[1]) ?? null,
               waistSaid: (line && (line.match(/waist ([\d.]+) mm against the ([\d.]+) mm floor/) || []).slice(1)) || [],
               circleSaid: !!line && /outline a CIRCLE \(roundedness 1 — the points and the pinch are INERT here/.test(line),
               clampSaid: !!line && /PINCH CLAMPED to/.test(line), underSaid: !!line && /THE WHOLE TIP IS UNDER IT/.test(line),
               bandSaid: !!line && /\(A SPHERE — the band FLOORED/.test(line), coinSaid: !!line && /COINCIDENT: duplicate geometry/.test(line),
               unmeasuredSaid: !!line && line.includes('(UNMEASURED — no coupon has been printed)'),
               lobesSaid: (line && (line.match(/· (one lobe|\d+ lobes) at (\d+)° off the filament/) || []).slice(1)) || [] };
    }, OUTLINE_SUBS);
    const p = [];
    /* THE SECTION IS THE PANEL'S FIRST THIRD LEVEL — asserted as a number of
       enclosing <details>, so a Tip that quietly re-parented to the top would
       fail here rather than looking identical to route (a)'s census. */
    if (res.sectionHidden === null) p.push('there is no #sec-antherTip section in the panel');
    else if (res.depth !== 2) p.push(`the Anther section sits inside ${res.depth} drop-downs; it is declared inside Androecium inside Center, which is two`);
    if (res.has !== !!want.present) p.push(`the owner ${res.has ? 'declares an androecium' : 'declares none'} while this step expects ${want.present ? 'one' : 'none'}`);
    res.subsHidden.forEach((h, i) => {
      const shouldShow = res.has && res.rho !== 1;
      if (h === shouldShow) p.push(`${OUTLINE_SUBS[i]} is ${h ? 'hidden' : 'shown'} with the androecium ${res.has ? 'present' : 'absent'} at roundedness ${res.rho} — it must show exactly when the outline is not a circle`);
    });
    if ((res.line !== null) !== res.has) p.push(`the ANTHER line is ${res.line ? 'SHOWN' : 'ABSENT'} while the owner ${res.has ? 'declares an androecium' : 'declares none'}`);
    if (res.has && res.line) {
      const a = res.anther;
      if (Number(res.sidesSaid) !== a.sides) p.push(`the ANTHER line says ${res.sidesSaid} sides, the owner's lattice is ${a.sides}`);
      if (Math.abs(Number(res.waistSaid[0]) - a.waistMm) > 0.005) p.push(`the ANTHER line says a waist of ${res.waistSaid[0]} mm, the owner says ${a.waistMm.toFixed(3)}`);
      if (Math.abs(Number(res.waistSaid[1]) - a.minRadiusMm) > 0.005) p.push(`the ANTHER line names a floor of ${res.waistSaid[1]} mm, the geometry's is ${a.minRadiusMm}`);
      if (!res.unmeasuredSaid) p.push('the ANTHER line does not carry the verbatim UNMEASURED tag beside a floor nothing has printed a coupon for');
      if (res.circleSaid !== (a.shape.roundedness === 1)) p.push(`the CIRCLE-and-inert clause is ${res.circleSaid ? 'shown' : 'absent'} at a roundedness of ${a.shape.roundedness}`);
      if (res.clampSaid !== a.pinchFloored) p.push(`the PINCH CLAMPED clause is ${res.clampSaid ? 'shown' : 'absent'} while the owner reports floored ${a.pinchFloored}`);
      if (res.underSaid !== a.underFloor) p.push(`the WHOLE TIP UNDER IT clause is ${res.underSaid ? 'shown' : 'absent'} while the owner reports underFloor ${a.underFloor}`);
      if (res.bandSaid !== a.bandFloored) p.push(`the SPHERE band clause is ${res.bandSaid ? 'shown' : 'absent'} while the owner reports bandFloored ${a.bandFloored}`);
      if (res.coinSaid !== a.lumpsCoincident) p.push(`the COINCIDENT clause is ${res.coinSaid ? 'shown' : 'absent'} while the owner reports lumpsCoincident ${a.lumpsCoincident}`);
      const saidCount = res.lobesSaid[0] === 'one lobe' ? 1 : Number((res.lobesSaid[0] || '').split(' ')[0]);
      if (saidCount !== a.lumps || Number(res.lobesSaid[1]) !== a.spreadDeg) p.push(`the ANTHER line says ${res.lobesSaid.join(' at ')}°, the owner declares ${a.lumps} at ${a.spreadDeg}°`);
      for (const k of ['pinchFloored', 'underFloor', 'bandFloored', 'lumpsCoincident']) if (want[k] !== undefined && a[k] !== want[k]) p.push(`this step expects ${k} ${want[k]}, the owner reports ${a[k]}`);
      if (want.sides !== undefined && a.sides !== want.sides) p.push(`this step expects a ${want.sides}-side lattice, the owner built ${a.sides}`);
    }
    if (want.tris !== undefined && res.shownTris !== want.tris) p.push(`the build has ${res.shownTris} triangles where the reference step had ${want.tris} — a hidden tip control reached the geometry`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: Tip at depth ${res.depth}, outline controls ${res.subsHidden[0] ? 'hidden' : 'shown'}, ${res.has ? `${res.anther.sides} sides, waist ${res.anther.waistMm.toFixed(2)} mm` : 'no androecium'}${res.clampSaid ? ', PINCH CLAMPED' : ''}${res.underSaid ? ', UNDER THE FLOOR' : ''}${res.bandSaid ? ', A SPHERE' : ''}${res.coinSaid ? ', COINCIDENT' : ''}`);
    return res;
  };
  await step('defaults (no androecium: the seven hide with the rest of the part, no ANTHER line)', [], { present: false });
  const pill = await step('6 stamens at the shipped pill (the outline controls stay hidden — roundedness 1)', [{ id: 'stamenCount', value: '6' }], { present: true, sides: 10, pinchFloored: false, underFloor: false, bandFloored: false, lumpsCoincident: false });
  await step('roundedness 0.50 (the two outline controls APPEAR; the lattice leaves the rod\'s ten)', [{ id: 'antherRoundedness', value: '0.5' }], { present: true, sides: 16 });
  await step('a TRIANGLE — 3 points at pinch 1.00 (the polygon), roundedness 0 (12 sides, the waist clear of the floor)', [{ id: 'antherRoundedness', value: '0' }, { id: 'antherPoints', value: '3' }, { id: 'antherPinch', value: '1' }], { present: true, sides: 12, pinchFloored: false });
  await step('pinch max 7.00 at roundedness 0 (the WAIST FLOOR binds — CLAMPED, told)', [{ id: 'antherPoints', value: '4' }, { id: 'antherPinch', value: '7' }], { present: true, pinchFloored: true, underFloor: false });
  await step('pinch min 0.05 at roundedness 0 (the nearest reachable to the circle — NOT a circle: the CIRCLE clause must be absent)', [{ id: 'antherPinch', value: '0.05' }], { present: true, pinchFloored: false, sides: 16 });
  await step('size min 0.60 (the WHOLE TIP under the 0.50 mm floor — told, never refused)', [{ id: 'antherSize', value: '0.6' }], { present: true, underFloor: true, pinchFloored: false });
  await step('elongation min 1.00 (A SPHERE: the band floored so no triangle has zero area)', [{ id: 'antherSize', value: '1.6' }, { id: 'antherPinch', value: '1' }, { id: 'antherRoundedness', value: '1' }, { id: 'antherElongation', value: '1' }], { present: true, bandFloored: true, sides: 10 });
  await step('3 lobes at 40° — the trifid\'s own law on an anther', [{ id: 'antherElongation', value: '2.5' }, { id: 'antherLumps', value: '3' }, { id: 'antherSpread', value: '40' }], { present: true, lumpsCoincident: false });
  await step('2 lobes at a spread of 0 (COINCIDENT — duplicate geometry, told, never refused)', [{ id: 'antherLumps', value: '2' }, { id: 'antherSpread', value: '0' }], { present: true, lumpsCoincident: true });
  if (pill) await step('back to the pill with the two OUTLINE controls at their extremes (hidden AND INERT: the build must not move)', [{ id: 'antherLumps', value: '1' }, { id: 'antherPoints', value: '12' }, { id: 'antherPinch', value: '7' }], { present: true, tris: pill.shownTris, sides: 10 });
  await step('count 0 with every tip control at MAXIMUM (the section hides whole; no ANTHER line)', [{ id: 'stamenCount', value: '0' }, { id: 'antherSize', value: '6' }, { id: 'antherElongation', value: '6' }, { id: 'antherRoundedness', value: '0' }, { id: 'antherLumps', value: '6' }, { id: 'antherSpread', value: '90' }], { present: false });
}

/* ===================================================================
   ROUTE (r) — THE FILAMENT-AGAINST-STYLE FLAG'S OWN WITNESS (session 23).
   See the header. Six on the shipping ring at curl 90 with the style is
   session 22's own cell (0.05 mm at 8.7 mm up against 1.20): the builder
   must report the crossing, the read-out must carry the clause, and the flag
   must be on it. Negative control: the setter rewrites the flag into the
   clear-of-it phrase and leaves the rest of the line intact. */
{
  const tag = '[flag]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => {
      const el = document.getElementById('readout');
      const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      Object.defineProperty(el, 'textContent', {
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, String(v).replace(/ \(FILAMENT AGAINST STYLE:[^)]*\)/g, ' (clear of it by more than 1.20 mm)')); },
      });
    });
  }
  const bad = await applyConfig(page, [{ id: 'stamenCount', value: '6' }, { id: 'gynoecium', value: 'STYLE' }, { id: 'stamenCurl', value: '90' }]);
  if (bad.length) note(`${tag}: config did not take: ${bad.join('; ')}`);
  else {
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
      return { fs: m.filamentStyle, crossSaid: /\(FILAMENT AGAINST STYLE:/.test(txt), clauseSaid: /nearest filament to the style/.test(txt) };
    });
    const p = [];
    if (!res.fs) p.push('the builder reports no filament-to-style record with both parts built');
    else if (!res.fs.crossing) p.push(`the builder reports no crossing at curl 90 (${res.fs.mm.toFixed(3)} mm against ${res.fs.threshold.toFixed(2)}) — the witness row no longer crosses`);
    if (!res.clauseSaid) p.push('the read-out carries no nearest-filament-to-the-style clause');
    if (res.fs && res.fs.crossing && res.clauseSaid && !res.crossSaid) p.push(`the FILAMENT AGAINST STYLE flag is absent while the owner reports a crossing (${res.fs.mm.toFixed(3)} mm against ${res.fs.threshold.toFixed(2)})`);
    if (p.length) note(`${tag}: ${p.join('; ')}`);
    else ok.push(`${tag}: six at curl 90 beside the style — the builder reports ${res.fs.mm.toFixed(3)} mm against ${res.fs.threshold.toFixed(2)}, the clause is on the line and the flag is on it`);
  }
}

if (screenAgreed) ok.push(`[nesting] the depth-general on-screen walk agrees with the one-ancestor expression it replaced on every section, in all ${screenAgreed} states route (d) drives — the generalisation changes no answer this tree can produce`);

/* ===================================================================
   ROUTE (y) — THE SIZE FIELD'S TWO LINES (organic variance, build 1). See the
   header. Every number is read back against `__bloomMetrics`: the field's
   record owns the amount, the law and the aliasing; the told flag's record
   owns the pitch, the feet and the approach. This route owns only whether
   the panel agrees. */
{
  const tag = '[variance]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const step = async (label, sets) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
      const wrap = (id) => document.getElementById(id).closest('.bl-ctrl');
      return {
        V: m.variance, N: m.neighbour, fan: !!m.fan, S: m.spacingVariance,
        sline: /SPACING VARIANCE (\d+)%: pitch density from ([\d.]+)x to ([\d.]+)x of nominal — [^\n]*?every pair of petals at least ([\d.]+)x the angle it stood apart at amount 0, by construction(?:, the tightest emitted pitch ([\d.]+)x)?/.exec(txt),
        line: /SIZE VARIANCE ±(\d+)%: petals from ([\d.]+)x to ([\d.]+)x of nominal — ([^\n]*)/.exec(txt),
        aliasedSaid: /ALIASED: above ([\d.]+) cycles/.test(txt),
        rampSaid: /— a ramp /.test(txt),
        inertSaid: /\(phase inert\)/.test(txt),
        flag: /NEIGHBOURS \((live|export), told, never clamped\): tightest pitch ([\d.]+)° = ([\d.]+)x the nominal ([\d.]+)° · nearest feet ([\d.]+) mm centre to centre = ([\d.]+) foot widths[^·]*· nearest petal approach (-?[\d.]+) mm skin to skin — ([^(]+)\(laminae ([\d.]+) mm apart/.exec(txt),
        freqHidden: wrap('varianceFrequency').hidden, phaseHidden: wrap('variancePhase').hidden,
        freqSaid: wrap('varianceFrequency').querySelector('.bl-val').textContent,
        phaseSaid: wrap('variancePhase').querySelector('.bl-val').textContent,
      };
    });
    const p = [];
    const V = res.V, N = res.N, S = res.S;
    /* THE FIELD LINE, iff the record */
    if (!!res.line !== !!V) p.push(`the SIZE VARIANCE line is ${res.line ? 'shown' : 'absent'} while the builder reports ${V ? 'a field' : 'no field'}`);
    const anyField = !!(V || S);
    if (res.freqHidden !== !anyField || res.phaseHidden !== !anyField) p.push(`the frequency/phase controls are ${res.freqHidden ? 'hidden' : 'shown'}/${res.phaseHidden ? 'hidden' : 'shown'} while the builder reports ${anyField ? 'a field' : 'no field'}`);
    /* BUILD 3 — THE SPACING LINE, iff the record; its amount, range and floor
       against the record, its tightest pitch against the told flag's */
    if (!!res.sline !== !!S) p.push(`the SPACING VARIANCE line is ${res.sline ? 'shown' : 'absent'} while the builder reports ${S ? 'a spacing field' : 'no spacing field'}`);
    if (S && res.sline) {
      if (Number(res.sline[1]) !== Math.round(S.amount * 100)) p.push(`the spacing line says ${res.sline[1]}%, the record ${S.amount}`);
      if (Math.abs(Number(res.sline[2]) - (1 - S.amount)) > 0.005 || Math.abs(Number(res.sline[3]) - (1 + S.amount)) > 0.005) p.push(`the spacing line says ${res.sline[2]}x..${res.sline[3]}x for amount ${S.amount}`);
      if (Math.abs(Number(res.sline[4]) - S.floor) > 0.0005) p.push(`the spacing line says a floor of ${res.sline[4]}x, the record ${S.floor}`);
      if (N && N.pitch && (res.sline[5] === undefined || Math.abs(Number(res.sline[5]) - N.pitch.ratio) > 0.0005)) p.push(`the spacing line says a tightest emitted pitch of ${res.sline[5]}x, the told flag ${N.pitch.ratio}`);
    }
    if (V && res.line) {
      if (Number(res.line[1]) !== Math.round(V.amount * 100)) p.push(`the line says ±${res.line[1]}%, the record ${V.amount}`);
      if (Math.abs(Number(res.line[2]) - V.lo) > 0.005 || Math.abs(Number(res.line[3]) - V.hi) > 0.005) p.push(`the line says ${res.line[2]}x..${res.line[3]}x, the record ${V.lo}..${V.hi}`);
      if (res.aliasedSaid !== V.aliased) p.push(`the ALIASED clause is ${res.aliasedSaid ? 'shown' : 'absent'} while the record says aliased=${V.aliased}`);
      if (/ALIASED/.test(res.freqSaid) !== V.aliased) p.push(`the frequency control's read-out ${/ALIASED/.test(res.freqSaid) ? 'says' : 'does not say'} ALIASED while the record says aliased=${V.aliased}`);
      if (res.rampSaid !== (V.frequency === 0)) p.push(`the line ${res.rampSaid ? 'says' : 'does not say'} "a ramp" at frequency ${V.frequency}`);
      if (res.inertSaid !== (V.phaseInert && V.frequency !== 0)) p.push(`the line ${res.inertSaid ? 'says' : 'does not say'} "phase inert" while the record says phaseInert=${V.phaseInert} at frequency ${V.frequency}`);
      if (/INERT on a fan/.test(res.phaseSaid) !== res.fan) p.push(`the phase control's read-out ${/INERT on a fan/.test(res.phaseSaid) ? 'says' : 'does not say'} INERT on a ${res.fan ? 'fan' : 'non-fan'}`);
    }
    /* THE TOLD FLAG, on every state */
    if (!N) p.push('the builder reports no neighbour record');
    else if (!res.flag) p.push('the NEIGHBOURS line is absent while the builder reports a neighbour record');
    else {
      const F = res.flag;
      if (Math.abs(Number(F[2]) - N.pitch.tightDeg) > 0.005 || Math.abs(Number(F[3]) - N.pitch.ratio) > 0.0005) p.push(`the NEIGHBOURS line says pitch ${F[2]}° = ${F[3]}x while the builder reports ${N.pitch.tightDeg} = ${N.pitch.ratio}x`);
      if (Math.abs(Number(F[5]) - N.feet.d) > 0.005 || Math.abs(Number(F[6]) - N.feet.q) > 0.0005) p.push(`the NEIGHBOURS line says feet ${F[5]} mm = ${F[6]} while the builder reports ${N.feet.d} = ${N.feet.q}`);
      if (N.blade) {
        if (Math.abs(Number(F[7]) - N.blade.skinGapMm) > 0.0005) p.push(`the NEIGHBOURS line says a skin gap of ${F[7]} mm while the builder reports ${N.blade.skinGapMm}`);
        if (Math.abs(Number(F[9]) - N.blade.laminaMm) > 0.0005) p.push(`the NEIGHBOURS line says laminae ${F[9]} mm apart while the builder reports ${N.blade.laminaMm}`);
        const verdictWant = N.blade.crossing ? 'SKINS PASS THROUGH EACH OTHER' : N.blade.underFeature ? 'UNDER THE' : 'clear of the printable gap';
        if (!F[8].includes(verdictWant)) p.push(`the NEIGHBOURS verdict reads "${F[8].trim()}" while the builder reports crossing=${N.blade.crossing} underFeature=${N.blade.underFeature}`);
      }
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${V ? `±${V.amount * 100}% f ${V.frequency} phase ${V.phaseDeg}${V.aliased ? ' ALIASED' : ''}${V.phaseInert ? ' (phase inert)' : ''}` : 'no field'}, flag skin gap ${N && N.blade ? N.blade.skinGapMm.toFixed(3) : '—'}`);
  };
  await step('the shipping default — no field line, the flag line, both sub-controls hidden', []);
  await step('±50% at 1 cycle — the line, both sub-controls shown, not aliased', [{ id: 'varianceSize', value: '0.5' }]);
  await step('20 cycles on 8 slots — ALIASED on the line and on the frequency control, told not capped', [{ id: 'varianceFrequency', value: '20' }]);
  await step('the RAMP — "a ramp" on the line', [{ id: 'varianceFrequency', value: '0' }]);
  await step('a FAN at 2 cycles, phase 90 — "phase inert" on the line and INERT on the phase control', [{ id: 'placement', value: 'FAN' }, { id: 'varianceFrequency', value: '2' }, { id: 'variancePhase', value: '90' }]);
  await step('back to 0 on a RADIAL whorl — no field line, the sub-controls hidden, the flag line at the default\'s own numbers', [{ id: 'placement', value: 'RADIAL' }, { id: 'varianceSize', value: '0' }]);
  /* BUILD 3: the spacing amount ALONE — the shared frequency and phase are
     shown by it (varianceAnyPresent), the SPACING line states the floor and
     the tightest emitted pitch, and back at 0 every trace of it goes. */
  await step('spacing 0.9 alone at 1 cycle — the SPACING line, its floor 0.100x and the told pitch, the sub-controls shown', [{ id: 'varianceFrequency', value: '1' }, { id: 'variancePhase', value: '0' }, { id: 'varianceSpacing', value: '0.9' }]);
  await step('spacing 0.9 on a FAN — the floor (1 - A)/(1 + A) = 0.053x on the line', [{ id: 'placement', value: 'FAN' }]);
  await step('spacing back to 0 on a RADIAL whorl — no spacing line, the sub-controls hidden', [{ id: 'placement', value: 'RADIAL' }, { id: 'varianceSpacing', value: '0' }]);
}

/* ---------------- (z) THE ACHIEVED COUNT IS TOLD, BOTH DIRECTIONS ----------
   (the Voronoi infill, S3). Eva's ruling 3 makes DENSITY A REQUEST: the blade
   decides how many cells can hold a printable hole, and the achieved count
   must be on screen whenever it differs from the asked one. This project's
   clamped-and-told form is TWO places — the control's own value read-out and
   the read-out panel — so both are asserted against the BUILDER's own record
   rather than against each other (`stamenSpread`'s route, HEAD RISE's
   discipline).

   AND EVERY REFUSAL IS A WORD. A blade that is several panels, one with no
   room above the floor and one whose outline is not convex each come back
   with the plan naming which, and a refusal the panel cannot speak is a
   silence — so the route drives a FRINGE (refused: panels) and a LOBED blade
   (refused: outline) and requires the line to say so, and the two INERT
   states (the guard off, with the density at its maximum) where the line must
   be ABSENT and the density control HIDDEN.

   `(z)` AND NOT A REUSED LETTER, AND THIS BLOCK SHIPPED AS `(y)` FOR AN HOUR:
   that letter is the SIZE FIELD's, declared one session earlier and sitting
   forty lines above this one, so "route (y) passed" would have said nothing
   about which of the two — the exact finding the sphere-stem session paid for
   and wrote into route (w)'s own entry. Caught by re-reading the header's
   enumeration against the block rather than by any run: a collided letter
   fires both routes' clauses and reddens nothing. Adding a route here is
   THREE edits — the banner, the header entry and `--negative-control`'s flag
   list — and a fourth, unwritten one: check the letter is free. */
{
  const tag = '[infill]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const step = async (label, sets, want) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate(() => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
      const wrap = (id) => document.getElementById(id).closest('.bl-ctrl');
      return {
        F: m.infill,
        line: /INFILL ([^\n]*)/.exec(txt),
        notCut: /INFILL NOT CUT — ([^\n]*)/.exec(txt),
        densHidden: wrap('infillDensity').hidden,
        densSaid: wrap('infillDensity').querySelector('.bl-val').textContent,
        guardSaid: wrap('petalInfill').querySelector('.bl-val').textContent,
      };
    });
    const p = [];
    const F = res.F;
    if (!!res.line !== !!F) p.push(`the INFILL line is ${res.line ? 'shown' : 'absent'} while the builder reports ${F ? 'a record' : 'no record'}`);
    if (res.densHidden !== (want.guard === 'NONE')) p.push(`the density control is ${res.densHidden ? 'hidden' : 'shown'} with the guard ${want.guard}`);
    /* THE LINE'S OWN CLAUSES ONLY RUN WHERE THERE IS A LINE. Under
       `--negative-control` the read-out is FROZEN, so a record with no line is
       exactly the state this route exists to catch — and a clause that then
       reached into `res.line[1]` would THROW and take the whole sweep down
       instead of reddening, which is the failure this gate's own history
       records twice (a detail string assuming its own premise). */
    /* THE BUILDER'S OWN ANSWER IS ASKED WHETHER OR NOT THERE IS A LINE — it is
       a claim about the GEOMETRY and the row's expectation, with no read-out
       in it, so freezing the panel must not make it go quiet. */
    if (F && (F.refused || null) !== (want.refused ?? null)) p.push(`the builder says refused=${F.refused} and the row expects ${want.refused ?? 'nothing'}`);
    if (F && res.line) {
      if (want.refused) {
        if (!res.notCut) p.push(`the read-out does not say NOT CUT while the builder refused with "${F.refused}"`);
      } else {
        if (res.notCut) p.push('the read-out says NOT CUT while the builder built a field');
        /* BOTH PLACES, against the BUILDER's own record — and the LINE has two
           wordings, one per case, so the clause asks for the RIGHT one rather
           than for whichever happens to carry the number. Ruling 3's whole
           point is the case where they differ ("N cells asked -> M built, K
           holding a hole"); the equal case says "K holes, as asked" and must
           NOT be reachable while they differ, or a line that lost its arrow
           would still carry a number and pass. */
        const equal = F.achieved === F.density;
        const asAsked = new RegExp(`\\b${F.achieved} holes, as asked`).test(res.line[1]);
        const differing = new RegExp(`\\b${F.density} cells asked \\u2192 \\d+ built, ${F.achieved} holding a hole`).test(res.line[1]);
        if (equal ? !asAsked : !differing) p.push(`the INFILL line does not state the achieved count ${F.achieved} against the asked ${F.density} in the ${equal ? '"as asked"' : 'differing'} wording: "${res.line[1].slice(0, 100)}"`);
        if (equal === differing && !equal) p.push('the INFILL line uses the "as asked" wording while the two counts differ');
      }
    }
    /* THE SECOND TELLING HAS ITS OWN OWNER AND IS ASKED ON ITS OWN. The
       control's value read-out is `fmt`'s, not the read-out panel's, so it is
       outside the line's guard: the two places are two claims, and a route
       that only looked at the density control when the panel also spoke would
       be reporting on their agreement rather than on either. */
    if (F && !want.refused) {
      const askedShown = new RegExp(`\\b${F.density} cells asked`).test(res.densSaid);
      if (!askedShown) p.push(`the density control does not say "${F.density} cells asked": "${res.densSaid}"`);
      const differs = F.achieved !== F.density;
      if (differs !== /BUILT /.test(res.densSaid)) p.push(`the density control ${/BUILT /.test(res.densSaid) ? 'says' : 'does not say'} BUILT while achieved=${F.achieved} and asked=${F.density}`);
      if (!new RegExp(`\\b${F.achieved} hole`).test(res.densSaid)) p.push(`the density control does not carry the achieved count ${F.achieved}: "${res.densSaid}"`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${F ? (F.refused ? `refused ${F.refused}` : `${F.achieved} of ${F.density} asked, ${F.cells} cells`) : 'no record'}`);
  };
  await step('the shipping default — no line, the density hidden', [], { guard: 'NONE' });
  await step('the guard ON at the ruled default — the line and the achieved count in BOTH places', [{ id: 'petalInfill', value: 'VORONOI' }], { guard: 'VORONOI' });
  await step('density 40 — the achieved count differs from the asked one and BOTH places say so', [{ id: 'infillDensity', value: '40' }], { guard: 'VORONOI' });
  await step('a FRINGE — NOT CUT, several panels', [{ id: 'infillDensity', value: '16' }, { id: 'petalTipEnd', value: '1' }, { id: 'fringeCount', value: '4' }], { guard: 'VORONOI', refused: 'panels' });
  await step('a LOBED blade — NOT CUT, a non-convex outline', [{ id: 'petalTipEnd', value: '0' }, { id: 'fringeCount', value: '0' }, { id: 'lobeDepth', value: '0.6' }, { id: 'lobeCount', value: '5' }], { guard: 'VORONOI', refused: 'outline' });
  await step('the guard OFF with the density at its MAXIMUM — no line, the density hidden (hidden AND inert)', [{ id: 'lobeDepth', value: '0' }, { id: 'petalInfill', value: 'NONE' }, { id: 'infillDensity', value: '40' }], { guard: 'NONE' });
}

/* ---------------- (u) THE FOUR S4 CONTROLS AND THEIR TELLINGS ----------
   (the Voronoi infill, S4). Every clause reads the BUILDER's record through
   `__bloomMetrics().infill` and holds the panel to it, never the panel to
   itself: the second INFILL line's lever values, the base fraction's
   "cells start at u", and the density cap mark are three claims with one
   owner each. Under `--negative-control` the read-out is frozen (the same
   freeze route (z) uses), so the lever line reads the DEFAULT's values while
   the builder reports twelve passes — the failure a route that compared the
   line against itself could never see. */
{
  const tag = '[infill levers]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  const IDS = ['infillRelax', 'infillLaw', 'infillAniso', 'infillBase'];
  const step = async (label, sets, want) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate((ids) => {
      const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
      const wrap = (id) => document.getElementById(id).closest('.bl-ctrl');
      const dens = wrap('infillDensity');
      return {
        F: m.infill,
        hidden: Object.fromEntries(ids.map((id) => [id, wrap(id).hidden])),
        said: Object.fromEntries(ids.map((id) => [id, wrap(id).querySelector('.bl-val').textContent])),
        levers: /INFILL holes along the blade[^\n]*\u00b7 relaxation (\d+) pass(?:es)?, density law ([\d.]+), stretch ([\d.]+)x \u00b7 ([^\n]*)/.exec(txt),
        capped: dens.classList.contains('bl-ctrl--capped'), capAt: dens.dataset.cap,
        densMax: Number(document.getElementById('infillDensity').max),
      };
    }, IDS);
    const p = [];
    const F = res.F;
    /* THE SOLID BASE IS PARKED (Eva, the ruled-defaults session): hidden at
       EVERY state, the guard on as well as off, while its value still reaches
       the builder — which the basal clause below keeps checking. */
    for (const id of IDS) { const wantHidden = want.guard === 'NONE' || id === 'infillBase'; if (res.hidden[id] !== wantHidden) p.push(`${id} is ${res.hidden[id] ? 'hidden' : 'shown'} with the guard ${want.guard}${id === 'infillBase' ? ' — it is PARKED and must be hidden at every state' : ''}`); }
    if (want.guard === 'NONE') {
      if (F) p.push('the builder reports an infill record with the guard off');
      if (res.levers) p.push('the INFILL levers line is shown with the guard off');
      if (res.capped) p.push('the density carries a cap mark with the guard off');
    } else if (F && F.built) {
      if (!res.levers) p.push('the INFILL levers line is absent while the builder built a field');
      else {
        if (Number(res.levers[1]) !== F.passes) p.push(`the INFILL levers line says relaxation ${res.levers[1]} while the builder reports ${F.passes}`);
        if (Number(res.levers[2]) !== Number(Number(F.gamma).toFixed(2))) p.push(`the INFILL levers line says density law ${res.levers[2]} while the builder reports ${F.gamma}`);
        if (Number(res.levers[3]) !== Number(Number(F.aniso).toFixed(2))) p.push(`the INFILL levers line says stretch ${res.levers[3]} while the builder reports ${F.aniso}`);
        const start = /cells start at u ([\d.]+)/.exec(res.levers[4]);
        if (!start || Number(start[1]) !== Number(F.floorU.toFixed(3))) p.push(`the INFILL levers line's basal clause (${res.levers[4].slice(0, 80)}) does not carry the builder's floor ${F.floorU.toFixed(3)}`);
        if (F.baseTravel > 0 ? !/solid base \d+% of the travel/.test(res.levers[4]) : !/solid base: DEAD/.test(res.levers[4])) p.push(`the basal clause does not say ${F.baseTravel > 0 ? 'the travel' : 'DEAD'} while the builder reports a travel of ${F.baseTravel}`);
      }
      /* THE CONTROLS' OWN TELLINGS, one owner each. */
      if (!new RegExp(`(^|\\D)${F.passes} Lloyd pass|no relaxation`).test(res.said.infillRelax) || (F.passes === 0) !== /no relaxation/.test(res.said.infillRelax)) p.push(`the relaxation control says "${res.said.infillRelax}" while the builder reports ${F.passes} passes`);
      if (!new RegExp(`cells start at u ${F.floorU.toFixed(3)}`).test(res.said.infillBase) && F.baseTravel > 0) p.push(`the solid-base control says "${res.said.infillBase}" and not the builder's floor u ${F.floorU.toFixed(3)}`);
      /* THE CAP MARK: present iff the builder's cap sits under the ceiling,
         and AT it. */
      const wantCap = F.densityCap !== null && F.densityCap !== undefined && F.densityCap < res.densMax;
      if (res.capped !== wantCap) p.push(`the density cap mark is ${res.capped ? 'present' : 'absent'} while the builder's cap is ${F.densityCap} against a ceiling of ${res.densMax}`);
      if (wantCap && res.capped && Number(res.capAt) !== F.densityCap) p.push(`the density cap mark sits at ${res.capAt} while the builder's cap is ${F.densityCap}`);
      if (want.passes !== undefined && F.passes !== want.passes) p.push(`the builder reports ${F.passes} passes and the row asked ${want.passes}`);
    } else if (want.guard !== 'NONE') {
      p.push(`the builder reports ${F ? `refused ${F.refused}` : 'no record'} on a row that expected a field`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${F ? `${F.passes} passes / law ${F.gamma} / stretch ${F.aniso} / base ${F.baseFrac}, floor u ${F.floorU.toFixed(3)}, cap ${F.densityCap}` : 'no record, four controls hidden'}`);
  };
  await step('the shipping default — all four hidden, no levers line, no cap mark', [], { guard: 'NONE' });
  await step('the guard ON at the defaults — three APPEAR, the parked solid base stays hidden, and the line reads the defaults', [{ id: 'petalInfill', value: 'VORONOI' }], { guard: 'VORONOI', passes: DEFAULTS.infillRelax });
  await step('relaxation 12 x law 0 x stretch 3 x base 0.5 — the line follows the builder', [{ id: 'infillRelax', value: '12' }, { id: 'infillLaw', value: '0' }, { id: 'infillAniso', value: '3' }, { id: 'infillBase', value: '0.5' }], { guard: 'VORONOI', passes: 12 });
  await step('relaxation 0 — the control says so', [{ id: 'infillRelax', value: '0' }], { guard: 'VORONOI', passes: 0 });
  await step('the guard OFF with the four at their far ends — hidden AND inert', [{ id: 'petalInfill', value: 'NONE' }, { id: 'infillRelax', value: '12' }, { id: 'infillLaw', value: '2' }, { id: 'infillAniso', value: '1' }, { id: 'infillBase', value: '1' }], { guard: 'NONE' });
}

/* ---------------- (aa) THE ROUNDNESS CONTROL TELLS ITS ACHIEVED SHAPE ----------
   Under `--negative-control` the roundness control's value span is FROZEN at
   whatever it said when the route began (the guard off: no numbers at all),
   so a route that compared the telling with itself would pass while the
   builder moved; this one compares it with the builder. */
{
  const tag = '[roundness]';
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const span = document.getElementById('infillRound').closest('.bl-ctrl').querySelector('.bl-val'); const t0 = span.textContent; Object.defineProperty(span, 'textContent', { get: () => t0, set: () => {} }); });
  }
  const step = async (label, sets, want) => {
    const bad = sets.length ? await applyConfig(page, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate(() => {
      const w = document.getElementById('infillRound').closest('.bl-ctrl');
      return { F: window.__bloomMetrics().infill, hidden: w.hidden, said: w.querySelector('.bl-val').textContent };
    });
    const p = []; const F = res.F;
    if (res.hidden !== (want.guard === 'NONE')) p.push(`infillRound is ${res.hidden ? 'hidden' : 'shown'} with the guard ${want.guard}`);
    if (want.guard === 'NONE') { if (F) p.push('the builder reports an infill record with the guard off'); }
    else if (!F || !F.built || !F.roundShape) p.push(`no built infill record with a shape (${F ? F.refused : 'none'})`);
    else {
      const R = F.roundShape;
      if (F.round !== want.round) p.push(`the builder read roundness ${F.round}, the row asked ${want.round}`);
      if (!res.said.includes(`median roundness ${R.medianRoundness.toFixed(3)}`)) p.push(`the control does not carry the builder's median roundness ${R.medianRoundness.toFixed(3)}: "${res.said.slice(0, 160)}"`);
      if (!res.said.includes(`holes ${R.holeAreaMm2.toFixed(1)} `)) p.push(`the control does not carry the builder's hole area ${R.holeAreaMm2.toFixed(1)}`);
      if (!res.said.includes(`${(100 * R.solidFrac).toFixed(1)}% solid`)) p.push(`the control does not carry the builder's solid fraction ${(100 * R.solidFrac).toFixed(1)}%`);
      if (want.round === 0) {
        if (!/today\u2019s holes/.test(res.said) || /rounded past the fillet/.test(res.said)) p.push(`at roundness 0 the control does not say today's holes with no split: "${res.said.slice(0, 160)}"`);
      } else {
        const split = R.atFillet ? `${R.rounded} hole${R.rounded === 1 ? '' : 's'} rounded past the fillet, ${R.atFillet} still at it` : `all ${R.rounded} holes rounded past the fillet`;
        if (!res.said.includes(split)) p.push(`the control does not carry the builder's split "${split}": "${res.said.slice(0, 200)}"`);
        if (R.onsetMin !== null && !res.said.includes(`between ${R.onsetMin.toFixed(3)} and ${R.onsetMax.toFixed(3)}`)) p.push(`the control does not carry the builder's onset range ${R.onsetMin.toFixed(3)}..${R.onsetMax.toFixed(3)}`);
      }
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${F && F.roundShape ? `roundness ${F.round}: ${F.roundShape.rounded} rounded / ${F.roundShape.atFillet} at the fillet, median ${F.roundShape.medianRoundness.toFixed(3)}, ${F.roundShape.holeAreaMm2.toFixed(1)} mm2, ${(100 * F.roundShape.solidFrac).toFixed(1)}% solid` : 'hidden, no record'}`);
  };
  await step('the shipping default — hidden, no record', [], { guard: 'NONE' });
  await step('the guard ON at the ruled 0.60 — it APPEARS and tells the split and the onset range', [{ id: 'petalInfill', value: 'VORONOI' }], { guard: 'VORONOI', round: 0.6 });
  await step('roundness 0 — today\u2019s holes, no split', [{ id: 'infillRound', value: '0' }], { guard: 'VORONOI', round: 0 });
  await step('roundness 1 — the circle', [{ id: 'infillRound', value: '1' }], { guard: 'VORONOI', round: 1 });
  await step('the guard OFF with roundness 1 — hidden AND inert', [{ id: 'petalInfill', value: 'NONE' }], { guard: 'NONE' });
}

/* ---------------- (ab) THE CUP READ-OUT UNDER COMPOUND QUOTES THE LEAFLETS ----------
   #382 found the Cup control's read-out quoting the edge lift from the HIDDEN
   simple-leaf width under COMPOUND — right for the top lateral pair at the
   defaults by coincidence, and deaf to every leaflet width slider. The lift
   is `cup x half-width` per leaflet size class; the widths are RESTATED here
   from the leaflet controls (the basal pair at the basal ratio, floored at the
   width control's own minimum; the top pair at the width; the terminal at its
   own width) — never read off the read-out or the geometry. Under SIMPLE the
   sentence is the one it always was and names no leaflet. Under
   `--negative-control` the Cup value span is FROZEN at the SIMPLE state's
   text, so a route that compared the read-out with itself would pass. */
{
  const tag = '[leaf cup]';
  await openBloom(page, port);
  const base = [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '3' }];
  const step = async (label, sets) => {
    const bad = await applyConfig(page, sets);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const res = await page.evaluate(() => {
      const w = document.getElementById('leafCup').closest('.bl-ctrl');
      const v = (id) => Number(document.getElementById(id).value);
      return { hidden: w.hidden, said: w.querySelector('.bl-val').textContent, type: document.getElementById('leafType').value,
        cup: v('leafCup'), leafWidth: v('leafWidth'), wid: v('leafletWidth'), widMin: Number(document.getElementById('leafletWidth').min),
        basal: v('leafletBasalRatio'), pairs: v('leafletPairs'), tWid: v('leafletTerminalWidth') };
    });
    const p = [];
    if (res.hidden) p.push('the Cup control is hidden on a bloom with leaves');
    const mm = (w) => `${Math.abs(res.cup * w / 2).toFixed(2)} mm`;
    if (res.type === 'SIMPLE') {
      if (!res.said.includes(`${mm(res.leafWidth)} at the widest point`)) p.push(`the SIMPLE read-out does not quote the leaf's own ${mm(res.leafWidth)} lift: "${res.said.slice(0, 160)}"`);
      if (/leaflet|terminal|pair/i.test(res.said)) p.push(`the SIMPLE read-out names leaflets: "${res.said.slice(0, 160)}"`);
    } else {
      const classes = res.pairs > 1
        ? [['basal pair', Math.max(res.widMin, res.wid * res.basal)], ['top pair', res.wid], ['terminal', res.tWid]]
        : [['pair', res.wid], ['terminal', res.tWid]];
      for (const [name, w] of classes) if (!res.said.includes(`${mm(w)} (${name}`)) p.push(`the COMPOUND read-out does not quote the ${name}'s ${mm(w)} lift (a ${w.toFixed(2)} mm leaflet restated from the leaflet controls): "${res.said.slice(0, 200)}"`);
      if (res.leafWidth !== res.wid && res.leafWidth !== res.tWid && res.leafWidth !== Math.max(res.widMin, res.wid * res.basal) && res.said.includes(`${mm(res.leafWidth)} `)) p.push(`the COMPOUND read-out still quotes the hidden simple-leaf width's ${mm(res.leafWidth)} lift`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: "${res.said.slice(0, 140)}"`);
  };
  await step('SIMPLE leaves — the leaf’s own width, no leaflet named', base);
  if (NEGATIVE_CONTROL) {
    await page.evaluate(() => { const span = document.getElementById('leafCup').closest('.bl-ctrl').querySelector('.bl-val'); const t0 = span.textContent; Object.defineProperty(span, 'textContent', { get: () => t0, set: () => {} }); });
  }
  await step('COMPOUND at the defaults — basal pair, top pair, terminal', [...base, { id: 'leafType', value: 'COMPOUND' }]);
  await step('the leaflet width 30 — the pairs’ lifts move with it', [...base, { id: 'leafType', value: 'COMPOUND' }, { id: 'leafletWidth', value: '30' }]);
  await step('the terminal width 10 — the terminal’s lift moves', [...base, { id: 'leafType', value: 'COMPOUND' }, { id: 'leafletWidth', value: '30' }, { id: 'leafletTerminalWidth', value: '10' }]);
  await step('one pair — a pair and the terminal', [...base, { id: 'leafType', value: 'COMPOUND' }, { id: 'leafletPairs', value: '1' }]);
  await step('cup -0.5 under COMPOUND — the margins turned down, the same classes', [...base, { id: 'leafType', value: 'COMPOUND' }, { id: 'leafCup', value: '-0.5' }]);
}

/* ---------------- (ac) THE ROUNDNESS'S DEAD TRAVEL IS HATCHED WHERE, AND ONLY WHERE, THE SLIDER IS DEAD ----------
   Eva's ruling 3 of Oct 9 (the stamenSpread precedent): above the leaf's own
   saturation no sinus moves, and the track is hatched there. THE DEAD TRAVEL
   IS MEASURED HERE, NEVER READ: the route rebuilds the leaf at slider steps
   and compares the EMITTED outline (every blade's drawn half-widths and its
   lobed half-widths, row by row, exactly) against the outline at the range's
   top, finding the FIRST step from which every step builds that same leaf (a
   bisection on the steps — the dead travel is an upper run, the law's own
   structure — and the route then checks the step below it moves and the step
   above it does not). The cap mark is required BOTH WAYS: present iff that
   run is longer than the top step alone, starting exactly there (the first
   slider step at or above the mark is the first dead step), its `--bl-cap`
   the track fraction of the mark; and the read-out says SATURATED exactly on
   a dead step. A hatch over live travel and dead travel left unhatched are
   each red. Under `--negative-control` the route re-serves the registry
   twice with the cap MUTATED — halved (the hatch starts in live travel) and
   removed (the dead travel unhatched) — and each must fail by its own
   sentence. */
{
  const tag = '[roundness dead travel]';
  const MUM = [{ id: 'stemLength', value: '120' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafType', value: 'LOBED' },
    { id: 'leafNodes', value: '4' }, { id: 'leafPhyllotaxy', value: 'alternate' }, { id: 'leafDivergence', value: '137.5' }, { id: 'leafArch', value: '25' }];
  const run = async (pg, label, sets, want) => {
    const ctl = CONTROLS.find((c) => c.id === 'lobedRound');
    const steps = []; for (let k = 0; ctl.min + k * ctl.step <= ctl.max + 1e-9; k++) steps.push(Number((ctl.min + k * ctl.step).toFixed(2)));
    const at = async (v) => {
      const bad = await applyConfig(pg, [...sets, { id: 'lobedRound', value: String(v) }]);
      if (bad.length) return { bad };
      return pg.evaluate(() => {
        const m = window.__bloomMetrics(), L = m.leaf, w = document.getElementById('lobedRound').closest('.bl-ctrl');
        const R0 = L && L.lobedBuilt && L.lobedBuilt[0] && L.lobedBuilt[0].roundBottoms;
        return { key: L ? JSON.stringify([L.rowHalfMm, (L.lobedBuilt || []).map((r) => r && r.rowHalfLobeMm)]) : null,
          sat: R0 ? R0.saturatesAt : undefined,
          said: w.querySelector('.bl-val').textContent, hidden: w.hidden,
          capClass: w.classList.contains('bl-ctrl--capped'), capData: w.dataset.cap ?? null, capVar: w.style.getPropertyValue('--bl-cap') || null };
      });
    };
    const top = await at(ctl.max);
    if (top.bad) { note(`${tag} ${label}: config did not take: ${top.bad.join('; ')}`); return; }
    if (top.hidden || top.key === null) { note(`${tag} ${label}: the roundness control is ${top.hidden ? 'hidden' : 'shown'} with ${top.key === null ? 'no leaf built' : 'a leaf'} — the route needs a lobed leaf`); return; }
    const memo = new Map([[steps.length - 1, top]]);
    const get = async (i) => { if (!memo.has(i)) memo.set(i, await at(steps[i])); return memo.get(i); };
    let lo = -1, hi = steps.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((await get(mid)).key === top.key) hi = mid; else lo = mid; }
    const firstDead = hi;
    const p = [];
    if (firstDead > 0 && (await get(firstDead - 1)).key === top.key) p.push(`the step below the measured dead travel (${steps[firstDead - 1]}) builds the same leaf too — the bisection's premise failed`);
    if (firstDead + 1 < steps.length && (await get(firstDead + 1)).key !== top.key) p.push(`${steps[firstDead + 1]} builds a different leaf from the top while ${steps[firstDead]} does not — deadness is not an upper run here`);
    const dead = firstDead < steps.length - 1;
    const r = await get(firstDead), live = firstDead > 0 ? await get(firstDead - 1) : null;
    /* THE HATCH, BOTH WAYS — read where applyCaps last ran: on the top build */
    const topNow = await at(ctl.max);
    if (topNow.capClass !== dead || (topNow.capData !== null) !== dead || (topNow.capVar !== null) !== dead) p.push(dead
      ? `the dead travel from ${steps[firstDead]} to ${ctl.max} (the same leaf, measured) carries no cap mark (class ${topNow.capClass}, data-cap ${topNow.capData}) — dead travel left unhatched`
      : `the cap mark is drawn (data-cap ${topNow.capData}) while every step below the top builds a different leaf — a hatch over live travel`);
    if (dead && topNow.capData !== null) {
      const mark = Number(topNow.capData), firstAtOrAbove = steps.findIndex((v) => v >= mark - 0.005);
      if (firstAtOrAbove !== firstDead) p.push(`the cap mark sits at ${topNow.capData} (the hatch starts at step ${steps[firstAtOrAbove]}) where the measured dead travel starts at ${steps[firstDead]} — ${firstAtOrAbove < firstDead ? 'a hatch over live travel' : 'dead travel left unhatched'}`);
      const frac = (mark - ctl.min) / (ctl.max - ctl.min);
      /* (data-cap is printed to two decimals, so it stands within half a
         hundredth of the mark: that, over the range's width, is the bar) */
      if (Math.abs(Number(topNow.capVar) - frac) > 0.005 / (ctl.max - ctl.min) + 1e-6) p.push(`the cap mark sits at ${topNow.capVar} of the track where ${topNow.capData} is ${frac.toFixed(4)} of it`);
    }
    /* THE READ-OUT: SATURATED exactly on a dead step */
    if (dead && !/SATURATED/.test(r.said)) p.push(`the first dead step ${steps[firstDead]} reads "${r.said.slice(0, 160)}" — no SATURATED`);
    if (live && /SATURATED/.test(live.said)) p.push(`the live step ${steps[firstDead - 1]} reads SATURATED: "${live.said.slice(0, 160)}"`);
    if (!dead && !/no dead travel/.test(top.said)) p.push(`the top reads "${top.said.slice(0, 160)}" where no travel is dead`);
    if (want !== undefined && dead !== want) p.push(`this state is expected to ${want ? 'have' : 'have no'} dead travel; measured first dead step ${steps[firstDead]}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${dead ? `dead from ${steps[firstDead]} (the mark at ${topNow.capData}, the builder's ${topNow.sat === null ? 'null' : Number(topNow.sat).toFixed(4)})` : 'no dead travel, no mark'} — ${memo.size + 1} builds`);
  };
  await openBloom(page, port);
  await run(page, 'the mum at the ruled defaults', MUM, true);
  await run(page, 'S4 form (sinus 0.62, shape 0.70, angle 38)', [...MUM, { id: 'lobedSinus', value: '0.62' }, { id: 'lobedShape', value: '0.7' }, { id: 'lobedAngle', value: '38' }]);
  if (NEGATIVE_CONTROL) {
    /* THE TWO MUTANTS, served to a fresh page: the registry's own cap read
       mutated in the source — halved, then removed */
    const src = fs.readFileSync(new URL('../bloom-registry.js', import.meta.url), 'utf8');
    const anchor = 'return R && R.saturatesAt !== null && R.saturatesAt !== undefined ? R.saturatesAt : null;';
    if (src.split(anchor).length !== 2) note(`${tag} NEGATIVE CONTROL: the cap's anchor does not match exactly once in bloom-registry.js — the mutants cannot be applied`);
    for (const [name, to] of [['the cap halved', anchor.replace('? R.saturatesAt : null', '? R.saturatesAt / 2 : null')], ['the cap removed', 'return null;']]) {
      /* (a page of its own: launchPage registers the CDN routes on the page) */
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom-registry.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: src.replace(anchor, to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${name}): the mum`, MUM, true);
      await b2.close();
    }
  }
}

/* ---------------- (ad) THE DESIGN FILE'S CONTROLS RENDER AND THE SAVE CARRIES EVERY REGISTRY CONTROL ----------
   See the header. The census is the REGISTRY (CONTROLS' ids, in order),
   never the module under test; a save whose keys differ from it in either
   direction is red, and so is a save button or file input that is inside
   #panelControls or absent. */
{
  const tag = '[design file]';
  const run = async (pg, label) => {
    const p = [];
    const r = await pg.evaluate(() => {
      const q = (sel) => document.querySelector(sel);
      let save = null, err = null;
      try { save = window.__bloomDesign ? window.__bloomDesign.save() : null; } catch (e) { err = String(e); }
      return { hasSave: !!q('.bl-panel #saveDesign'), hasFile: !!q('.bl-panel #designFile'), hasLabel: !!q('.bl-panel label[for="designFile"]'), hasStatus: !!q('.bl-panel #designStatus'),
        inControls: !!q('#panelControls #saveDesign') || !!q('#panelControls #designFile'), save, err };
    });
    if (!r.hasSave || !r.hasFile || !r.hasLabel || !r.hasStatus) p.push(`the design file's controls do not all render (save ${r.hasSave}, file ${r.hasFile}, label ${r.hasLabel}, status ${r.hasStatus})`);
    if (r.inControls) p.push('a design-file control is inside #panelControls, among the registry controls');
    if (r.err || !r.save) p.push(`the page's save hook failed: ${r.err || 'no text'}`);
    else {
      let obj = null; try { obj = JSON.parse(r.save); } catch (e) { p.push(`the save is not JSON: ${e.message}`); }
      if (obj) {
        const keys = Object.keys(obj.controls || {});
        const ids = CONTROLS.map((c) => c.id);
        const missing = ids.filter((id) => !keys.includes(id)), extra = keys.filter((k) => !ids.includes(k));
        if (missing.length || extra.length) p.push(`the save's controls are not every registry control: missing ${missing.length ? missing.join(', ') : 'none'}; not a registry control: ${extra.length ? extra.join(', ') : 'none'}`);
        else if (JSON.stringify(keys) !== JSON.stringify(ids)) p.push('the save carries every registry control but not in the registry\'s order');
      }
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: Save, Load and the status line render outside the registry\'s controls; the save carries exactly the ${CONTROLS.length} registry ids in order`);
  };
  await openBloom(page, port);
  await run(page, 'the shipped page');
  if (NEGATIVE_CONTROL) {
    const src = fs.readFileSync(new URL('../bloom-file.js', import.meta.url), 'utf8');
    const anchor = 'export const CONTROL_FIELDS = Object.freeze(CONTROLS.map(';
    if (src.split(anchor).length !== 2) note(`${tag} NEGATIVE CONTROL: the table's anchor does not match exactly once in bloom-file.js — the mutant cannot be applied`);
    const { browser: b2, page: pg } = await launchPage();
    await pg.route('**/bloom-file.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: src.replace(anchor, "export const CONTROL_FIELDS = Object.freeze(CONTROLS.filter((c) => c.id !== 'petalCount').map(") }));
    await openBloom(pg, port);
    await run(pg, 'MUTANT (a table row removed)');
    await b2.close();
  }
}

/* ---------------- (ae) THE SCOPE SELECTION: A PICK LOADS, AN EDIT LANDS ON ITS SCOPE, DESELECT WRITES NOTHING ----------
   See the header. Every claim is read off an owner the panel does not write:
   the BUILDER's per-petal record (`petalSlotForms[].scope` / `.applied`, which
   offsets reached each petal), the build counter and the shown-mesh digest
   (did anything rebuild, did anything move), and the raw record
   (`__bloomDesign.scopes()`) — never the inputs the panel just set. A pair's
   canonical slot is RESTATED here from the fan's own involution, never read
   off the module under test. */
{
  const tag = '[scope selection]';
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const snap = (pg) => pg.evaluate(() => {
    const wrapNote = (id) => { const w = document.getElementById(id).closest('.bl-ctrl'); const n = w.querySelector('.bl-scope-note'); return { scoped: w.classList.contains('bl-ctrl--scoped'), global: w.classList.contains('bl-ctrl--global'), note: n && !n.hidden ? n.textContent : '' }; };
    const m = window.__bloomMetrics();
    return {
      count: window.__bloomBuildState().count, digest: JSON.stringify(window.__bloomShownDigest()), rec: JSON.stringify(window.__bloomDesign.scopes()),
      ui: window.__bloomUIState(), bound: window.__bloomScopeView.bound(), bar: window.__bloomScopeView.bar(),
      summary: m.scopes, slotCount: m.slotCount ?? null,
      forms: m.petalSlotForms.map((f) => ({ index: f.index, whorl: f.whorl, cup: f.applied.petalCup, curl: f.applied.petalSpineCurl, tip: f.tipShape, scope: f.scope })),
      shown: { petalCup: document.getElementById('petalCup').value, petalSpineCurl: document.getElementById('petalSpineCurl').value },
      said: Object.fromEntries(['footDelicacy', 'sepalScale', 'petalWidth'].map((id) => [id, document.getElementById(id).closest('.bl-ctrl').querySelector('.bl-val').textContent])),
      eff: window.__bloomScopeView.effective(), design: window.__bloomDesign.last(),
      cup: wrapNote('petalCup'), thick: wrapNote('sheetThickness'),
    };
  });
  const pick = async (pg, sel) => { const r = await pg.evaluate((s) => window.__bloomScopeView.select(s), sel); await settle(pg); return r; };
  const unpick = async (pg) => { await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg); };
  const sameView = (a, b) => a.count === b.count && a.digest === b.digest && a.rec === b.rec && JSON.stringify(a.ui) === JSON.stringify(b.ui);
  const what = (a, b) => [a.count !== b.count ? `rebuilt (${a.count} -> ${b.count})` : '', a.digest !== b.digest ? 'the mesh on screen moved' : '', a.rec !== b.rec ? `the record went ${a.rec} -> ${b.rec}` : '', JSON.stringify(a.ui) !== JSON.stringify(b.ui) ? 'the whole-bloom state moved' : ''].filter(Boolean).join(', ');

  /* RADIAL: per-layer values on three layers */
  const runLayers = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'layerCount', value: '3' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const off = await snap(pg);
    if (!off.bar.hidden) p.push('the scope bar shows with both toggles OFF');
    bad = await applyConfig(pg, [{ id: 'scopeLayers', value: 'ON' }]);
    if (bad.length) { note(`${tag} ${label}: the toggle did not take: ${bad.join('; ')}`); return; }
    const on = await snap(pg);
    if (on.digest !== off.digest) p.push('switching per-layer values ON with no record moved the bloom');
    if (on.bar.hidden) p.push('the scope bar is hidden with per-layer values ON');
    if (on.bar.options.length !== 4) p.push(`the picker lists ${on.bar.options.length} entries at three layers — expected the whole bloom and three layers`);
    const global = DEFAULTS.petalCup;
    /* THE EDITED LAYER IS THE OUTER ONE (index 0), never the middle of three:
       the middle is the fixed point of a layer order reversed, so a picker or a
       builder numbering layers inner-first would pass a check made there (the
       review's finding). The petal's whorl is the BUILDER's record. */
    const L = 0, L2 = 2;
    /* 1. a pick LOADS: nothing rebuilds, nothing moves, nothing is written */
    const b1 = await snap(pg);
    const got = await pick(pg, { kind: 'layer', layer: L, slot: 0 });
    const a1 = await snap(pg);
    if (!got || got.kind !== 'layer' || got.layer !== L) p.push(`picking layer ${L + 1} bound ${JSON.stringify(got)}`);
    if (!sameView(b1, a1)) p.push(`picking layer ${L + 1} was not a pure load: ${what(b1, a1)}`);
    /* 2. an edit lands on the picked layer only — read off the BUILDER's record */
    bad = await applyConfig(pg, [{ id: 'petalCup', value: '0.6' }]);
    if (bad.length) p.push(`the cup edit did not take: ${bad.join('; ')}`);
    const e = await snap(pg);
    const recE = JSON.parse(e.rec);
    if (!recE || recE.layers.length !== 1 || recE.layers[0].layer !== L || recE.layers[0].offsets.petalCup !== 0.6 - global || recE.petals.length) p.push(`after the edit the record holds ${e.rec} — expected exactly one entry, layer ${L + 1}'s cup offset ${0.6 - global}`);
    if (e.ui.petalCup !== global) p.push(`the edit moved the WHOLE-BLOOM cup to ${e.ui.petalCup}`);
    const strays = e.forms.filter((f) => f.whorl !== L && (f.scope !== null || (f.cup ?? global) !== global));
    const missed = e.forms.filter((f) => f.whorl === L && (!f.scope || f.cup !== 0.6));
    if (strays.length) p.push(`the edit reached ${strays.length} petal(s) outside the picked layer (whorls ${[...new Set(strays.map((f) => f.whorl + 1))].join(', ')})`);
    if (missed.length || !e.forms.some((f) => f.whorl === L)) p.push(`${missed.length} layer-${L + 1} petal(s) did not take the cup`);
    if (!/whole bloom 0\.00 \+ 0\.60 offset = 0\.60/.test(e.cup.note)) p.push(`the cup control does not tell the global and the offset: "${e.cup.note}"`);
    /* 3. another layer's pick loads ITS values and writes nothing (the /plot defect, one level up) */
    const b3 = await snap(pg);
    await pick(pg, { kind: 'layer', layer: L2, slot: 0 });
    const a3 = await snap(pg);
    if (!sameView(b3, a3)) p.push(`a pick WROTE to the record or moved the bloom (layer ${L + 1} -> layer ${L2 + 1}): ${what(b3, a3)}`);
    if (Number(a3.shown.petalCup) !== global) p.push(`layer ${L2 + 1}'s cup slider shows ${a3.shown.petalCup}, not its own effective value ${global}`);
    await pick(pg, { kind: 'layer', layer: L, slot: 0 });
    const back = await snap(pg);
    if (Number(back.shown.petalCup) !== 0.6) p.push(`back on layer ${L + 1} the cup slider shows ${back.shown.petalCup}, not its own 0.6`);
    /* 4. sheet thickness is never scoped: told global, an edit moves the whole bloom and writes no offset */
    if (!back.thick.global || !/never scoped/.test(back.thick.note)) p.push(`sheet thickness is not told global while a scope is picked: "${back.thick.note}"`);
    if (back.thick.scoped) p.push('sheet thickness is marked as a scoped control');
    bad = await applyConfig(pg, [{ id: 'sheetThickness', value: '1.4' }]);
    const t = await snap(pg);
    if (bad.length) p.push(`the thickness edit did not take: ${bad.join('; ')}`);
    if (t.ui.sheetThickness !== 1.4) p.push(`a thickness edit under a picked layer left the whole-bloom thickness at ${t.ui.sheetThickness}`);
    if (t.rec !== back.rec) p.push(`a thickness edit under a picked layer wrote to the record: ${t.rec}`);
    await applyConfig(pg, [{ id: 'sheetThickness', value: String(DEFAULTS.sheetThickness) }]);
    /* 5. deselect writes nothing */
    const b5 = await snap(pg);
    await unpick(pg);
    const a5 = await snap(pg);
    if (a5.bound !== null) p.push('deselecting left a scope bound');
    if (!sameView(b5, a5)) p.push(`deselecting changed the record or moved the bloom: ${what(b5, a5)}`);
    if (Number(a5.shown.petalCup) !== global) p.push(`after deselecting the cup slider shows ${a5.shown.petalCup}, not the whole bloom's ${global}`);
    /* 6. the toggle OFF keeps the record and builds the unscoped bloom */
    await applyConfig(pg, [{ id: 'scopeLayers', value: 'OFF' }]);
    const z = await snap(pg);
    if (z.rec !== a5.rec) p.push(`switching per-layer OFF changed the record to ${z.rec}`);
    if (z.digest !== off.digest) p.push('with per-layer OFF the bloom is not the unscoped one — a kept record reached the build');
    if (!z.bar.hidden) p.push('the scope bar still shows with per-layer OFF');
    if (z.forms.some((f) => f.scope !== null)) p.push('a petal carries a scope term with per-layer OFF');
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: RADIAL 3 layers — per-layer ON alone moves nothing; a pick is a pure load (no rebuild, the digest and the record unchanged); a cup edit on layer 1 (the outer whorl) lands on its 8 petals only — read off the builder's whorl — and is told "whole bloom + offset"; layer 3 loads its own value and writes nothing; sheet thickness stays global; deselect writes nothing; OFF keeps the record and builds the unscoped bloom`);
  };

  /* THE PICK'S LIFE AROUND IT (the review's findings, each a check with its own
     mutant): whole-bloom read-outs stay the whole bloom's under a pick; the
     build lands on the slider's own double; a load and a Reset end the pick
     before they write; a file without the toggles onto a page with one live is
     told; a file without `overrides` keeps the page's offsets. */
  const runLifecycle = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'layerCount', value: '3' }, { id: 'sepalCount', value: '5' }, { id: 'scopeLayers', value: 'ON' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const plain = await snap(pg);
    /* 1. whole-bloom read-outs are the whole bloom's (Foot delicacy and Sepal size read the petal width) */
    await pick(pg, { kind: 'layer', layer: 0, slot: 0 });
    bad = await applyConfig(pg, [{ id: 'petalWidth', value: '25' }]);
    if (bad.length) p.push(`the width edit did not take: ${bad.join('; ')}`);
    const w = await snap(pg);
    for (const id of ['footDelicacy', 'sepalScale']) if (w.said[id] !== plain.said[id]) p.push(`under a picked layer with its own width, the whole-bloom ${id} read-out changed: "${plain.said[id]}" -> "${w.said[id]}"`);
    if (!/25/.test(w.said.petalWidth)) p.push(`the picked layer's width read-out does not show its own 25: "${w.said.petalWidth}"`);
    /* 2. the build lands on the slider's own double — global 1.70, desired 0.90 is the case the cut alone misses */
    bad = await applyConfig(pg, [{ id: 'petalTipShape', value: '0.9' }]);
    if (bad.length) p.push(`the tip-shape edit did not take: ${bad.join('; ')}`);
    const t = await snap(pg);
    const tips = t.forms.filter((f) => f.whorl === 0).map((f) => f.tip);
    if (!tips.length || tips.some((x) => !Object.is(x, 0.9))) p.push(`the picked layer's petals were built at tip shape ${[...new Set(tips)].join(' / ')} against the slider's 0.9`);
    if (!Object.is(t.eff && t.eff.petalTipShape, 0.9)) p.push(`the scope's effective tip shape is ${t.eff && t.eff.petalTipShape}, not the slider's 0.9`);
    /* 3. a LOAD ends the pick before it writes: the file's values are the whole bloom's */
    await unpick(pg);
    const fileObj = JSON.parse(await pg.evaluate(() => window.__bloomDesign.save()));
    await pick(pg, { kind: 'layer', layer: 1, slot: 0 });
    fileObj.controls.petalCup = 0.5; fileObj.controls.petalLength = 50;
    fileObj.overrides = { layers: [], petals: [], tiers: [] };
    await pg.evaluate((t2) => window.__bloomDesign.load(t2, 'lifecycle.json'), JSON.stringify(fileObj));
    await settle(pg);
    const ld = await snap(pg);
    if (ld.bound !== null) p.push(`a load left a scope bound: ${JSON.stringify(ld.bound)}`);
    if (ld.ui.petalCup !== 0.5 || ld.ui.petalLength !== 50) p.push(`after a load under a picked layer the whole bloom reads cup ${ld.ui.petalCup}, length ${ld.ui.petalLength} — not the file's 0.5 / 50`);
    if (ld.rec !== 'null') p.push(`after loading a file with no offsets the record is ${ld.rec}`);
    /* 4. a RESET ends the pick before it writes */
    await pick(pg, { kind: 'layer', layer: 1, slot: 0 });
    bad = await applyConfig(pg, [{ id: 'petalLength', value: '45' }]);
    if (bad.length) p.push(`the length edit did not take: ${bad.join('; ')}`);
    await pg.click('#resetBtn');
    await settle(pg);
    const rs = await snap(pg);
    if (rs.bound !== null) p.push(`Reset left a scope bound: ${JSON.stringify(rs.bound)}`);
    if (rs.ui.petalLength !== DEFAULTS.petalLength) p.push(`after Reset under a picked layer the length reads ${rs.ui.petalLength}, not the default ${DEFAULTS.petalLength}`);
    if (rs.rec !== 'null') p.push(`after Reset the record is ${rs.rec}`);
    /* 5. a file saved BEFORE THE ROLE RETIREMENT (Q3.4) — no toggles, an INNER
       curl delta and a RADIAL labellum, two whorls in step — is MIGRATED AND
       TOLD: the inner delta becomes one per-layer offset (scopeLayers ON) and
       the labellum is DROPPED by ruling, each named in the status, never
       silent. */
    bad = await applyConfig(pg, [{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }, { id: 'scopeLayers', value: 'OFF' }]);
    if (bad.length) p.push(`the re-config did not take: ${bad.join('; ')}`);
    const old = JSON.parse(await pg.evaluate(() => window.__bloomDesign.save()));
    delete old.controls.scopeLayers; delete old.controls.scopePetals; old.controls['innerCurl'] = 90; old.controls['labellumSize'] = 1.6;
    await pg.evaluate((t2) => window.__bloomDesign.load(t2, 'pre-retirement.json'), JSON.stringify(old));
    await settle(pg);
    const told = await snap(pg);
    const notesOf = (d) => (d && d.notes) || [];
    if (!notesOf(told.design).some((n) => n.kind === 'migrated' && /innerCurl/.test(n.text))) p.push(`a pre-retirement file's inner delta is not told as migrated: ${JSON.stringify(notesOf(told.design).map((n) => `[${n.kind}] ${n.text}`))}`);
    if (!notesOf(told.design).some((n) => n.kind === 'retired' && /labellumSize/.test(n.text))) p.push(`a pre-retirement file's RADIAL labellum is not told as dropped: ${JSON.stringify(notesOf(told.design).map((n) => `[${n.kind}] ${n.text}`))}`);
    const recT = JSON.parse(told.rec || 'null');
    if (told.ui.scopeLayers !== 'ON' || !recT || !(recT.layers || []).some((e) => e.layer === 1 && e.offsets && e.offsets.petalSpineCurl === 90)) p.push(`a pre-retirement file's inner delta did not land as a per-layer offset with per-layer ON: scopeLayers ${told.ui.scopeLayers}, record ${told.rec}`);
    /* 6. a file with no `overrides` keeps the page's offsets (rule 3) */
    await applyConfig(pg, [{ id: 'scopeLayers', value: 'ON' }]);
    await pick(pg, { kind: 'layer', layer: 1, slot: 0 });
    await applyConfig(pg, [{ id: 'petalCup', value: '0.3' }]);
    await unpick(pg);
    const keep = await snap(pg);
    const noOv = JSON.parse(await pg.evaluate(() => window.__bloomDesign.save()));
    delete noOv.overrides;
    await pg.evaluate((t2) => window.__bloomDesign.load(t2, 'no-overrides.json'), JSON.stringify(noOv));
    await settle(pg);
    const kept = await snap(pg);
    if (keep.rec === 'null') p.push('the offset to keep was never written');
    if (kept.rec !== keep.rec) p.push(`a file with no "overrides" replaced the page's offsets: ${keep.rec} -> ${kept.rec}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: under a picked layer Foot delicacy and Sepal size keep the whole bloom's read-outs; the build lands on the slider's own 0.9 (global 1.70); a load and a Reset each end the pick before writing; a pre-retirement file is migrated and told (the inner delta a per-layer offset, the radial labellum dropped); a file with no "overrides" keeps the page's offsets`);
  };

  /* THE COUNT CHANGES UNDER A PICK (the review's fold): FAN, four a side, the
     outermost pair given its own cup, the pair inside it picked; at three a
     side the outer pair is not built — its entry KEPT and INERT, no petal
     taking its cup, the picked pair's thumbs still its own effective value —
     and at four again it returns on its own pair. */
  const runFold = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'placement', value: 'FAN' }, { id: 'fanCenterPetal', value: 'ON' }, { id: 'fanPerSide', value: '4' }, { id: 'scopePetals', value: 'ON' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const global = DEFAULTS.petalCup;
    await pick(pg, { kind: 'petal', layer: 0, slot: 4 });
    bad = await applyConfig(pg, [{ id: 'petalCup', value: '0.6' }]);
    if (bad.length) p.push(`the cup edit did not take: ${bad.join('; ')}`);
    await pick(pg, { kind: 'petal', layer: 0, slot: 3 });
    bad = await applyConfig(pg, [{ id: 'fanPerSide', value: '3' }]);
    if (bad.length) p.push(`the count change did not take: ${bad.join('; ')}`);
    const f3 = await snap(pg);
    if (!f3.bound || f3.bound.slot !== 3) p.push(`at three a side the pick of pair 3 did not survive: ${JSON.stringify(f3.bound)}`);
    const took = f3.forms.filter((f) => f.scope !== null || (f.cup ?? global) !== global);
    if (took.length) p.push(`at three a side, where the outer pair is not built, ${took.length} petal(s) took its cup (slots ${took.map((f) => f.index).join(', ')}) — the entry folded onto another pair`);
    if (f3.eff && Number(f3.shown.petalCup) !== f3.eff.petalCup) p.push(`the picked pair's cup thumb shows ${f3.shown.petalCup} while its effective value is ${f3.eff.petalCup}`);
    if (!f3.summary || JSON.stringify(f3.summary.keptPetals) !== JSON.stringify([{ layer: 0, slot: 4 }])) p.push(`at three a side the build's summary keeps ${JSON.stringify(f3.summary && f3.summary.keptPetals)}, not the outer pair`);
    bad = await applyConfig(pg, [{ id: 'fanPerSide', value: '4' }]);
    const f4 = await snap(pg);
    const n4 = f4.forms.length;
    const outer = new Set([4, (n4 - 4) % n4]);
    for (const f of f4.forms) {
      if (outer.has(f.index)) { if (f.cup !== 0.6) p.push(`back at four a side, outer slot ${f.index} reads cup ${f.cup}, not its own 0.6`); }
      else if ((f.cup ?? global) !== global) p.push(`back at four a side, slot ${f.index} reads cup ${f.cup}`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: FAN four a side, the outer pair's own cup kept and inert at three a side (no petal takes it, the picked pair's thumb is its own effective value, the summary keeps it) and back on its own pair at four`);
  };

  /* FAN: per-petal values, a mirror pair is one scope */
  const runPetals = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'placement', value: 'FAN' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const off = await snap(pg);
    bad = await applyConfig(pg, [{ id: 'scopePetals', value: 'ON' }]);
    if (bad.length) { note(`${tag} ${label}: the toggle did not take: ${bad.join('; ')}`); return; }
    const on = await snap(pg);
    if (on.digest !== off.digest) p.push('switching per-petal values ON with no record moved the bloom');
    const n = on.forms.length;
    const partner = (i) => (on.ui.fanCenterPetal === 'OFF' ? n - 1 - i : (n - i) % n);
    const key = (i) => Math.min(i, partner(i));
    const pairs = [...new Set(on.forms.map((f) => key(f.index)))].sort((a, b) => a - b);
    const listed = on.bar.options.filter((o) => o.value).map((o) => Number(o.value.split(':')[2])).sort((a, b) => a - b);
    if (JSON.stringify(listed) !== JSON.stringify(pairs)) p.push(`the picker lists slots [${listed}] — the fan's pairs are [${pairs}]`);
    /* picking either member binds the pair */
    const member = n - 2, canon = key(member);
    const b1 = await snap(pg);
    let got = await pick(pg, { kind: 'petal', layer: 0, slot: member });
    const a1 = await snap(pg);
    if (!got || got.slot !== canon) p.push(`picking slot ${member} bound ${JSON.stringify(got)}, not its pair's canonical slot ${canon}`);
    if (!sameView(b1, a1)) p.push(`picking a petal was not a pure load: ${what(b1, a1)}`);
    if (!got) got = await pick(pg, { kind: 'petal', layer: 0, slot: canon });
    bad = await applyConfig(pg, [{ id: 'petalSpineCurl', value: '120' }]);
    if (bad.length) p.push(`the curl edit did not take: ${bad.join('; ')}`);
    const e = await snap(pg);
    const recE = JSON.parse(e.rec);
    if (!recE || recE.petals.length !== 1 || recE.layers.length) p.push(`after the edit the record holds ${e.rec} — expected exactly one petal entry`);
    const want = new Set([canon, partner(canon)]);
    for (const f of e.forms) {
      if (want.has(f.index)) { if (!f.scope || f.curl !== 120) p.push(`slot ${f.index}${f.index !== canon ? ' (the mirror partner)' : ''} did not move with the pair (curl ${f.curl})`); }
      else if (f.scope !== null || (f.curl ?? DEFAULTS.petalSpineCurl) !== DEFAULTS.petalSpineCurl) p.push(`the edit reached slot ${f.index}, outside the picked pair`);
    }
    const b5 = await snap(pg);
    await unpick(pg);
    const a5 = await snap(pg);
    if (!sameView(b5, a5)) p.push(`deselecting changed the record or moved the bloom: ${what(b5, a5)}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: FAN ${n} petals — per-petal ON alone moves nothing; the picker lists the ${pairs.length} pairs; picking slot ${member} binds pair ${canon} as a pure load; a curl edit lands on slots ${[...want].join(' and ')} only; deselect writes nothing`);
  };

  await openBloom(page, port);
  await runLayers(page, 'per-layer');
  await openBloom(page, port);
  await runPetals(page, 'per-petal');
  await openBloom(page, port);
  await runLifecycle(page, 'around the pick');
  await openBloom(page, port);
  await runFold(page, 'the count changes under a pick');
  if (NEGATIVE_CONTROL) {
    const jsSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const geoSrc = fs.readFileSync(new URL('../bloom-geometry.js', import.meta.url), 'utf8');
    const fileSrc = fs.readFileSync(new URL('../bloom-file.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'a pick stamps the panel onto the picked scope', file: 'bloom.js', src: jsSrc, run: runLayers,
        from: '  const next = canonicalScope(sel, ui);\n  bindScope(next && scopeIsValid(next, ui) ? next : null);\n  relabelView();',
        to: '  const next = canonicalScope(sel, ui);\n  const shownBefore = Object.fromEntries([...SCOPE_IDS].filter((id) => !SCOPE_VALUE_SET.has(id)).map((id) => [id, Number(inputs[id].value)]));\n  bindScope(next && scopeIsValid(next, ui) ? next : null);\n  if (scopeView) { for (const id of Object.keys(shownBefore)) commitScopeOffset(id, shownBefore[id]); scheduleRegen(); }\n  relabelView();' },
      { name: 'an edit lands on every scope', file: 'bloom.js', src: jsSrc, run: runLayers,
        from: '    own.offsets[id] = d;\n  }\n  if (scopesAreEmpty(scopes)) scopes = null;',
        to: '    own.offsets[id] = d;\n    for (const o of scopeOptions(ui)) { if (o.layer === v.layer && o.slot === v.slot) continue; let x = list.find((q) => q.layer === o.layer && (v.kind === \'layer\' || q.slot === o.slot)); if (!x) { x = v.kind === \'layer\' ? { layer: o.layer, offsets: {} } : { layer: o.layer, slot: o.slot, offsets: {} }; list.push(x); } x.offsets[id] = d; }\n  }\n  if (scopesAreEmpty(scopes)) scopes = null;' },
      { name: 'deselect drops the offsets', file: 'bloom.js', src: jsSrc, run: runLayers,
        from: 'function bindScope(next) {\n  if (scopeView) {',
        to: 'function bindScope(next) {\n  if (scopeView && !next && scopes) { const v = scopeView, n = lastFoot.slotCount, u = readUI(); scopes.layers = scopes.layers.filter((x) => !(v.kind === \'layer\' && x.layer === v.layer)); scopes.petals = scopes.petals.filter((x) => !(v.kind === \'petal\' && x.layer === v.layer && scopeSlotKey(x.slot, n, u) === v.slot)); if (scopesAreEmpty(scopes)) scopes = null; scheduleRegen(); }\n  if (scopeView) {' },
      { name: 'a mirror pair is split', file: 'bloom-geometry.js', src: geoSrc, run: runPetals,
        from: '  if (!SCOPE_PAIRED_PLACEMENTS.includes(state.placement)) return slot;\n  return Math.min(slot, mirrorPartner(slot, n, mirrorFor(state)));',
        to: '  return slot;' },
      /* the review's findings, each restored */
      { name: 'whole-bloom read-outs read the picked scope', file: 'bloom.js', src: jsSrc, run: runLifecycle,
        from: '  refreshLabels(ui, scopeShown(shown), scopeView ? viewUi(ui) : null);',
        to: '  refreshLabels(viewUi(ui), scopeShown(shown), scopeView ? viewUi(ui) : null);' },
      { name: 'the offset is the twelve-digit cut alone', file: 'bloom.js', src: jsSrc, run: runLifecycle,
        from: '    if (g + d !== desired && g + (desired - g) === desired) d = desired - g;',
        to: '    void g;' },
      { name: 'a load does not end the pick', file: 'bloom.js', src: jsSrc, run: runLifecycle,
        from: "     scope's offsets. Ending a pick writes nothing. */\n  selectScope(null);\n  let applied = 0;",
        to: "     scope's offsets. Ending a pick writes nothing. */\n  let applied = 0;" },
      { name: 'a reset does not end the pick', file: 'bloom.js', src: jsSrc, run: runLifecycle,
        from: '     was reachable only through a file or a hook and Reset never touched it. */\n  selectScope(null);\n  scopes = null;',
        to: '     was reachable only through a file or a hook and Reset never touched it. */\n  scopes = null;' },
      { name: 'a pre-retirement file is migrated silently', file: 'bloom-file.js', src: fileSrc, run: runLifecycle,
        from: "  for (const n of m.notes) notes.push(note(kindOf[n.kind] || 'retired', n.id ? `controls.${n.id}: ${n.text}` : `controls: ${n.text}`));",
        to: "  void kindOf;" },
      { name: 'a missing overrides list drops the page offsets', file: 'bloom.js', src: jsSrc, run: runLifecycle,
        from: "  for (const k of ['layers', 'petals', 'tiers', 'strands']) next[k] = missing.includes(k) ?",
        to: "  for (const k of ['layers', 'petals', 'tiers', 'strands']) next[k] = false ?" },
      { name: 'a member index is re-keyed', file: 'bloom-geometry.js', src: geoSrc, run: runFold,
        from: '      if (e.layer !== layer || e.slot !== key) continue;',
        to: '      if (e.layer !== layer || scopeSlotKey(e.slot, n, state) !== key) continue;' },
    ];
    for (const m of MUTANTS) if (m.src.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in ${m.file} — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (m.src.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route(`**/${m.file}`, (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: m.src.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await m.run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (af) THE CURVE EDITOR: A DRAG MOVES THE VALUE, A REFUSED DRAG DOES NOT ----------
   See the header. No live registry control is a curve yet, so the editor is
   mounted through the page's capability hook (`__bloomCurveTest`) on a test
   outline — a function curve, symmetric / two-sided, three points — with a
   TEST VALIDATOR written here and defined in the page: it refuses any curve
   whose drawn half-width passes 0.30 of the owning length. Every pointer
   gesture is a REAL mouse event at a point the editor itself projects (its own
   `fracClient`), and every claim is read off the editor's VALUE — the object
   the design file and a scope hold — never off the drawing. The expected
   positions are written down here (fractions of the owning length), never
   read from the module under test. */
{
  const tag = '[curve editor]';
  const SPEC = { modes: ['symmetric', 'two-sided'], x: [0, 1], y: [0, 0.4], lock: { first: 'x', last: 'x' }, monotoneX: true, points: [2, 12], owner: 'petalLength' };
  const START = { mode: 'symmetric', points: [[0, 0.08], [0.45, 0.22], [1, 0.03]] };
  const LIMIT = 0.30;
  const mount = (pg) => pg.evaluate(([spec, value, limit]) => window.__bloomCurveTest.mount({
    label: 'Test outline', spec, value,
    validate: (cand) => {
      const s = window.__bloomCurveTest.law.curveSamples(cand, spec);
      const m = Math.max(...s.left.map((q) => q[1]), ...(s.right || []).map((q) => q[1]));
      return m > limit ? `the drawn half-width ${m.toFixed(3)} passes the test limit ${limit} (a stand-in for the spine's printable curvature)` : null;
    },
  }), [SPEC, START, LIMIT]);
  const T = (pg, fn, ...a) => pg.evaluate(([f, args]) => window.__bloomCurveTest[f](...args), [fn, a]);
  const J = (v) => JSON.stringify(v);
  /* a real drag: press on the handle the editor projects, move in `steps`, release */
  const drag = async (pg, side, i, to, steps = 6, release = true) => {
    const from = await T(pg, 'pointClient', side, i);
    const at = await T(pg, 'fracClient', side, to);
    await pg.mouse.move(from.x, from.y);
    await pg.mouse.down();
    await pg.mouse.move(at.x, at.y, { steps });
    if (release) await pg.mouse.up();
  };
  const run = async (pg, label) => {
    const p = [];
    await mount(pg);
    /* 1. RENDERS ONCE: one mount, one editor, one label, one read-out, three
       handles, none of it inside #panelControls, and no registry control of
       the kind (the claim this route rests on: the hook is the only reach). */
    const dom = await pg.evaluate(() => ({
      mounts: document.querySelectorAll('.bl-curve-test').length, editors: document.querySelectorAll('.bl-curve').length,
      inControls: document.querySelectorAll('#panelControls .bl-curve').length, labels: document.querySelectorAll('.bl-curve-test label[for="curveTest"]').length,
      vals: document.querySelectorAll('.bl-curve-test .bl-val').length, svgs: document.querySelectorAll('.bl-curve-test svg').length,
      handles: document.querySelectorAll('.bl-curve-test .bl-curve-pt').length, modes: [...document.querySelectorAll('.bl-curve-test select option')].map((o) => o.value),
    }));
    const curveRows = CONTROLS.filter((c) => c.kind === 'curve').length;
    /* F3-global: the page now carries registry curve controls too, so the
       editor count is the mount's one PLUS the registry's (asserted exactly
       below, in #panelControls). */
    if (dom.mounts !== 1 || dom.editors !== 1 + curveRows || dom.labels !== 1 || dom.vals !== 1 || dom.svgs !== 1) p.push(`the editor does not render exactly once (mounts ${dom.mounts}, editors ${dom.editors} for 1 + ${curveRows} registry, labels ${dom.labels}, read-outs ${dom.vals}, svgs ${dom.svgs})`);
    if (dom.inControls !== curveRows) p.push(`#panelControls holds ${dom.inControls} curve editor(s) for ${curveRows} registry curve control(s)`);
    if (dom.handles !== START.points.length) p.push(`the editor draws ${dom.handles} handles for ${START.points.length} points`);
    if (J(dom.modes) !== J(SPEC.modes)) p.push(`the mode select offers ${J(dom.modes)}, not the spec's ${J(SPEC.modes)}`);
    if (J(await T(pg, 'value')) !== J(START)) p.push(`the mounted value is ${J(await T(pg, 'value'))}, not the value handed in`);
    /* 2. A DRAG MOVES THE VALUE, TO THE FRACTION UNDER THE POINTER. The
       stored point must be the target fraction to one pixel of the editor
       (its own units-per-pixel) and to the 1e-4 grid; the ends stay put. */
    const upp = await T(pg, 'unitsPerPx');
    const c0 = await T(pg, 'counts');
    await drag(pg, 'left', 1, [0.5, 0.26]);
    const v1 = await T(pg, 'value'), c1 = await T(pg, 'counts'), lop = await T(pg, 'lastOp');
    const q = v1.points[1];
    /* what the editor PROPOSED for the pointer's last position — its own
       conversion, read before the outcome, so a value written in the wrong
       units is named as that rather than as a drag that went nowhere */
    if (!lop || lop.op !== 'move' || !lop.xy || !(Math.abs(lop.xy[0] - 0.5) <= upp + 1e-4 && Math.abs(lop.xy[1] - 0.26) <= upp + 1e-4)) p.push(`the editor proposed (${lop && lop.xy}) for the pointer at the fraction (0.5, 0.26) of the owning length — the value is not written in fractions of it`);
    if (J(v1) === J(START)) p.push('a drag on point 2 did not move the value');
    else if (!(Math.abs(q[0] - 0.5) <= upp + 1e-4 && Math.abs(q[1] - 0.26) <= upp + 1e-4)) p.push(`the stored point is (${q[0]}, ${q[1]}) — not the fraction under the pointer (0.5, 0.26) of the owning length, to one pixel (${upp.toFixed(5)})`);
    if (q.some((x) => Math.abs(x * 1e4 - Math.round(x * 1e4)) > 1e-6)) p.push(`the stored point (${q[0]}, ${q[1]}) is off the 1e-4 grid a hand's edit is quantised to`);
    if (J(v1.points[0]) !== J(START.points[0]) || J(v1.points[2]) !== J(START.points[2])) p.push('the drag moved an end point');
    if (!(c1.input > c0.input) || c1.change !== c0.change + 1) p.push(`a drag fired ${c1.input - c0.input} input and ${c1.change - c0.change} change event(s) — expected inputs during it and exactly one change at its end`);
    /* the owning length moves the millimetres and NO stored number */
    const dimsA = await T(pg, 'dims');
    let bad = await applyConfig(pg, [{ id: 'petalLength', value: '60' }]);
    if (bad.length) p.push(`the owning length did not take: ${bad.join('; ')}`);
    const v1b = await T(pg, 'value');
    const dimsB = await T(pg, 'dims');
    if (J(v1b) !== J(v1)) p.push(`changing the owning length 35 -> 60 mm changed the stored curve: ${J(v1)} -> ${J(v1b)} — the points are not fractions of it`);
    if (!/60\.0 mm/.test(dimsB) || dimsB === dimsA) p.push(`the editor's millimetre caption did not follow the owning length: "${dimsA}" -> "${dimsB}"`);
    bad = await applyConfig(pg, [{ id: 'petalLength', value: String(DEFAULTS.petalLength) }]);
    /* 3. A REFUSED DRAG DOES NOT MOVE: one step from the accepted position
       straight to a refused one (0.36 > the 0.30 limit). The value must be the
       accepted one EXACTLY, the editor must say why, and the reason must be
       the validator's own sentence. The two wrong answers are told apart by
       where the point went: AT the refused position is a validator never
       asked; anywhere else is a point moved toward it — a clamp. */
    const before = J(v1);
    await drag(pg, 'left', 1, [0.5, 0.36], 1, false);
    const mid = { v: await T(pg, 'value'), status: await T(pg, 'status'), refusal: await T(pg, 'refusal') };
    await pg.mouse.up();
    const after = await T(pg, 'value');
    if (J(after) !== before) {
      const y = after.points[1] && after.points[1][1];
      if (Math.abs(y - 0.36) <= upp + 1e-4) p.push(`a drag reached (0.5, ${y}) — the position the validator refuses: the validator was never asked`);
      else p.push(`a refused drag moved the point toward the refused position, to (${after.points[1]}) — the drag was clamped, not refused`);
    }
    if (!mid.refusal || !/passes the test limit/.test(mid.refusal.reason) || !/^refused — .*passes the test limit/.test(mid.status)) p.push(`a refused drag is not told with the validator's reason (status "${mid.status}", refusal ${J(mid.refusal)})`);
    /* 4. ADD ON THE CURVE, REMOVE, AND THE KEYBOARD. A double-click on the
       drawn curve at x 0.25 adds a point ON it (the shape is unchanged to the
       grid there); a double press on that point removes it and the value is the
       one before the add, exactly; ] then ArrowUp nudges the next point by
       0.005; + adds a point after it, Delete removes the point it focused. */
    const base = await T(pg, 'value');
    const yOn = await pg.evaluate(([v, spec]) => { const s = window.__bloomCurveTest.law.sampleCurve(v.points, spec).pts; let b = s[0]; for (const r of s) if (Math.abs(r[0] - 0.25) < Math.abs(b[0] - 0.25)) b = r; return b; }, [base, SPEC]);
    const on = await T(pg, 'fracClient', 'left', yOn);
    await pg.mouse.dblclick(on.x, on.y);
    const added = await T(pg, 'value');
    const k = added.points.findIndex((r) => Math.abs(r[0] - yOn[0]) <= upp + 1e-4);
    if (added.points.length !== base.points.length + 1 || k !== 1) p.push(`a double-click on the curve at x ${yOn[0].toFixed(3)} gave ${J(added.points)} — not one point added there`);
    else if (Math.abs(added.points[k][1] - yOn[1]) > upp + 1e-4) p.push(`the added point (${added.points[k]}) is not on the drawn curve (y ${yOn[1].toFixed(4)})`);
    if (k === 1) {
      const h = await T(pg, 'pointClient', 'left', 1);
      await pg.mouse.dblclick(h.x, h.y);
      const removed = await T(pg, 'value');
      if (J(removed) !== J(base)) p.push(`a double press on the added point left ${J(removed.points)}, not the curve before the add ${J(base.points)}`);
    }
    /* 4b. THE DOUBLE PRESS IS THE BROWSER'S OWN CLICK COUNT, NOT A WALL-CLOCK
       WINDOW — main's red on d576262 (#408's editor, green on a slow box and
       red twice on a fast runner). The first cut judged a double press itself,
       by 450 ms between two pointerdowns on one handle index; a press released
       without a move (step 3's refused drag) left that window ARMED, so on a
       runner fast enough to reach step 4 inside it the FIRST press of the
       double-click above removed the added point, the second found no handle,
       went unprevented, and the browser's own dblclick put a point back on the
       curve: four points, the exact value CI printed. Driven over raw CDP so
       every press is written to the socket before any is acknowledged — the
       stretch between gestures is then microseconds on ANY box, the fast side
       the window broke on, where Playwright's per-command round trips make it
       hundreds of milliseconds here and would let the defect pass. (i) two
       single presses on one handle, back to back, remove nothing (the browser
       counts two clicks; a window reads a double press); (ii) the CI sequence
       itself — a single press on point 2, the add at x 0.25, the double-click
       on the added point — leaves the curve before the add, exactly. A click
       count comes with each CDP press, so neither depends on a timer. */
    const cdp = await pg.context().newCDPSession(pg);
    const me = (type, x, y, clickCount) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount });
    const press = (pt, n) => [me('mousePressed', pt.x, pt.y, n), me('mouseReleased', pt.x, pt.y, n)];
    /* the browser's dblclick is dispatched after the second release; waiting on
       the editor's own counts cannot see an ABSENT event, so the only honest
       wait for "nothing happened" is a bounded one, after the batch is acked */
    const settleClicks = () => pg.waitForTimeout(300);
    /* each clause is read against the value IMMEDIATELY before its own presses,
       never against `base`: a broken editor can leave step 4 one point long,
       and a stale double press would then take it back to `base` by removing
       exactly that point — the defect passing the clause written for it */
    const h1 = await T(pg, 'pointClient', 'left', 1);
    const preTwice = await T(pg, 'value');
    await Promise.all([me('mouseMoved', h1.x, h1.y, 0), ...press(h1, 1), ...press(h1, 1)]);
    await settleClicks();
    const twice = await T(pg, 'value');
    if (J(twice) !== J(preTwice)) p.push(`two single presses on point 2, back to back, took ${J(preTwice.points)} to ${J(twice.points)} — a double press is being judged by a wall-clock window rather than the browser's click count`);
    const preFast = await T(pg, 'value');
    await Promise.all([me('mouseMoved', h1.x, h1.y, 0), ...press(h1, 1), me('mouseMoved', on.x, on.y, 0), ...press(on, 1), ...press(on, 2), ...press(on, 1), ...press(on, 2)]);
    await settleClicks();
    const fast = await T(pg, 'value');
    if (J(fast) !== J(preFast)) p.push(`a single press on point 2, then the add at x 0.25 and the double press on the added point, all back to back, took ${J(preFast.points)} to ${J(fast.points)} — an earlier press armed a stale double press (its first press removed the added point and the browser's own dblclick put one back)`);
    await cdp.detach();
    /* 4c. THE KEYBOARD. The editor's keys act on the editor's value and reach no
       registry control: the page's whole UI state is read before and after. */
    const uiBefore = await pg.evaluate(() => JSON.stringify(window.__bloomUIState()));
    await pg.focus('.bl-curve-test svg');
    await pg.keyboard.press('Home'); await pg.keyboard.press(']'); await pg.keyboard.press('ArrowUp');
    const nudged = await T(pg, 'value');
    if (!(Math.abs(nudged.points[1][1] - (base.points[1][1] + 0.005)) < 1e-9) || nudged.points[1][0] !== base.points[1][0]) p.push(`Home, ] and ArrowUp moved point 2 from (${base.points[1]}) to (${nudged.points[1]}) — not up by 0.005`);
    await pg.keyboard.press('+');
    const plus = await T(pg, 'value');
    if (plus.points.length !== nudged.points.length + 1) p.push(`+ did not add a point (${nudged.points.length} -> ${plus.points.length})`);
    await pg.keyboard.press('Delete');
    const del = await T(pg, 'value');
    if (J(del) !== J(nudged)) p.push(`Delete after + did not remove the added point: ${J(del.points)} against ${J(nudged.points)}`);
    /* removing an END is refused by the shape rule (the curve spans the length) */
    await pg.keyboard.press('Home'); await pg.keyboard.press('Delete');
    if (J(await T(pg, 'value')) !== J(del)) p.push('Delete on the first point removed it — the curve no longer spans its length');
    const uiAfter = await pg.evaluate(() => JSON.stringify(window.__bloomUIState()));
    if (uiAfter !== uiBefore) p.push(`the editor's keys (Home ] ArrowUp + Delete) moved a registry control: the page's UI state changed`);
    /* 5. THE MIRROR SWITCH KEEPS THE LEFT SIDE. symmetric -> two-sided starts
       the right side as the left's copy; the right side is then dragged to its
       own shape; two-sided -> symmetric must leave EXACTLY the left side. */
    await pg.selectOption('.bl-curve-test select', 'two-sided');
    const two = await T(pg, 'value');
    if (two.mode !== 'two-sided' || J(two.right) !== J(two.points) || J(two.points) !== J(del.points)) p.push(`symmetric -> two-sided gave ${J(two)} — the right side does not start as the left's copy`);
    await drag(pg, 'right', 1, [0.62, 0.12]);
    const two2 = await T(pg, 'value');
    if (J(two2.right) === J(two2.points)) p.push('a drag on the right side did not give it its own shape');
    if (J(two2.points) !== J(two.points)) p.push('a drag on the right side moved the left side');
    await pg.selectOption('.bl-curve-test select', 'symmetric');
    const sym = await T(pg, 'value');
    if (sym.mode !== 'symmetric' || sym.right !== undefined) p.push(`two-sided -> symmetric gave ${J(sym)}`);
    else if (J(sym.points) !== J(two2.points)) p.push(J(sym.points) === J(two2.right)
      ? `switching to symmetric kept the RIGHT side ${J(sym.points)} — the ruling is the LEFT side ${J(two2.points)}`
      : `switching to symmetric left ${J(sym.points)}, not the left side ${J(two2.points)}`);
    /* 6. THE DESIGN FILE: the page's own field-table walkers write the value
       verbatim and read it back clean; a curve the control cannot hold is
       refused whole and the page keeps its curve. */
    const want = await T(pg, 'value');
    const text = await T(pg, 'saveText');
    let saved = null; try { saved = JSON.parse(text).controls.curveTest; } catch (e) { /* reported below */ }
    if (!saved) p.push(`the design file did not carry the curve: ${text.slice(0, 160)}`);
    else if (J(saved) !== J(want)) p.push(`the design file wrote ${J(saved)}, not the value ${J(want)}`);
    await T(pg, 'set', START);
    const back = await T(pg, 'loadText', text);
    const got = await T(pg, 'value');
    if (!back.applied || back.notes.length || J(got) !== J(want)) p.push(`the design file did not carry the curve back clean: applied ${back.applied}, notes ${J(back.notes.map((n) => n.text))}, value ${J(got)} against ${J(want)}`);
    const outside = JSON.stringify({ controls: { curveTest: { mode: 'symmetric', points: [[0, 0.1], [0.5, 0.9], [1, 0.1]] } } });
    const ref = await T(pg, 'loadText', outside);
    if (ref.applied || !ref.notes.some((n) => n.kind === 'invalid' && /outside the box/.test(n.text)) || J(await T(pg, 'value')) !== J(want)) p.push(`a file curve outside the box was not refused whole and told: ${J(ref)}`);
    await T(pg, 'unmount');
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: mounted once outside #panelControls (no registry control is a curve: ${curveRows}); a drag stored the fraction under the pointer (${q}) with ${c1.input - c0.input} inputs and one change, and the owning length 35 -> 60 mm moved the caption and no stored number; a one-step drag to y 0.36 was refused with the validator's reason and the value stayed EXACTLY; add on the curve / double-press remove / ] ArrowUp / + / Delete each did what they say, the double press is the browser's click count (two back-to-back single presses remove nothing, and the CI sequence over raw CDP leaves the curve before the add), the keys reach no registry control, and an end cannot be removed; two-sided starts as the left's copy and back to symmetric keeps the LEFT side; the file round trip is clean and a curve outside the box is refused whole`);
  };
  await openBloom(page, port);
  await run(page, 'the test outline');
  if (NEGATIVE_CONTROL) {
    const src = {
      'bloom.js': fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8'),
      'bloom-curve.js': fs.readFileSync(new URL('../bloom-curve.js', import.meta.url), 'utf8'),
      'bloom-file.js': fs.readFileSync(new URL('../bloom-file.js', import.meta.url), 'utf8'),
    };
    const MUTANTS = [
      { name: 'the validator is ignored', file: 'bloom-curve.js',
        from: "  if (typeof validate === 'function') {\n    let r;", to: "  if (false && typeof validate === 'function') {\n    let r;" },
      { name: 'a refused drag clamps', file: 'bloom.js',
        from: '    if (edit({ op: \'move\', side: drag.side, i: drag.i, xy }, { during: true })) drag.moved = true;',
        to: '    if (edit({ op: \'move\', side: drag.side, i: drag.i, xy }, { during: true })) drag.moved = true;\n    else { const f = pointsOf(cur, drag.side)[drag.i]; let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (proposeEdit(cur, spec, validate, { op: \'move\', side: drag.side, i: drag.i, xy: [f[0] + (xy[0] - f[0]) * m, f[1] + (xy[1] - f[1]) * m] }).accepted) lo = m; else hi = m; } if (lo > 0 && edit({ op: \'move\', side: drag.side, i: drag.i, xy: quantised([f[0] + (xy[0] - f[0]) * lo, f[1] + (xy[1] - f[1]) * lo]) }, { during: true })) drag.moved = true; }' },
      { name: 'the mirror keeps the right side', file: 'bloom-curve.js',
        from: '  const out = { mode, points: v.points.map((p) => [p[0], p[1]]) };',
        to: "  const out = { mode, points: (mode !== 'two-sided' && v.mode === 'two-sided' ? v.right : v.points).map((p) => [p[0], p[1]]) };" },
      { name: 'the double press is a wall-clock window', file: 'bloom.js',
        from: "    if (!h) return;\n    const { side, i } = h;\n    focus = { side, i };\n    drag = { side, i, pointerId: ev.pointerId, moved: false };",
        to: "    if (!h) return;\n    const { side, i } = h;\n    ev.preventDefault(); const lp = svg.__lastPress; if (lp && ev.timeStamp - lp.t < 450 && lp.side === side && lp.i === i) { svg.__lastPress = null; edit({ op: 'remove', side, i }); return; } svg.__lastPress = { t: ev.timeStamp, side, i };\n    focus = { side, i };\n    drag = { side, i, pointerId: ev.pointerId, moved: false };" },
      { name: 'points are stored in absolute units', file: 'bloom.js',
        from: '    const xy = quantised([vb.x, fracY(drag.side, vb.y)]);',
        to: '    const xy = quantised([vb.x * ownerLength(), fracY(drag.side, vb.y) * ownerLength()]);' },
      { name: 'the design file drops the curve', file: 'bloom-file.js',
        from: '    write: (v) => (v === undefined ? undefined : cloneCurve(v)),', to: '    write: () => undefined,' },
    ];
    for (const m of MUTANTS) if (src[m.file].split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in ${m.file} — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (src[m.file].split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route(`**/${m.file}`, (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: src[m.file].replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (ag) PER-LAYER VALUES ON A SPIRAL; AN OWNED WIDTH DRIVES ITS FOOT AND RING ----------
   See the header. A turn's petals are read off the BUILDER's per-petal record
   (`petalSlotForms[].whorl` / `.scope`), the rings off footRing()'s own
   (`__bloomMetrics().rings`); the expected foot and ring are RESTATED from the
   controls here, never read off the record under test. */
{
  const tag = '[spiral layers]';
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const snap = (pg) => pg.evaluate(() => {
    const m = window.__bloomMetrics();
    const hid = (id) => document.getElementById(id).closest('.bl-ctrl').hidden;
    return {
      bar: window.__bloomScopeView.bar(), rec: JSON.stringify(window.__bloomDesign.scopes()), digest: JSON.stringify(window.__bloomShownDigest()),
      ui: window.__bloomUIState(),
      forms: m.petalSlotForms.map((f) => ({ whorl: f.whorl, cup: f.applied.petalCup, scope: f.scope })),
      rings: m.rings.map((r) => ({ radius: r.radius, width: r.width, ownWidth: r.ownWidth })),
      hubR: m.hubRadius, hubGrowth: m.hubGrowth, grownLine: (document.getElementById('readout').textContent.match(/HUB GROWN[^\n]*/) || [null])[0],
      hidden: { scopeLayers: hid('scopeLayers'), layerSize: hid('layerSize'), layerTilt: hid('layerTilt') },
    };
  });
  const pick = async (pg, layer) => { await pg.evaluate((L) => window.__bloomScopeView.select({ kind: 'layer', layer: L, slot: 0 }), layer); await settle(pg); };
  const unpick = async (pg) => { await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg); };
  const run = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'layerCount', value: '3' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const cont = await snap(pg);
    if (!cont.hidden.scopeLayers) p.push('Per-layer values is shown under CONTINUOUS, which has no layers to scope');
    bad = await applyConfig(pg, [{ id: 'placement', value: 'SPIRAL' }, { id: 'layerCount', value: '3' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const off = await snap(pg);
    if (off.hidden.scopeLayers) p.push("Per-layer values is hidden under a layered SPIRAL (Oct 16: a spiral's turns are layer scopes)");
    if (off.hidden.layerSize || off.hidden.layerTilt) p.push('Shrink / Tilt step are hidden under SPIRAL with per-layer values OFF');
    bad = await applyConfig(pg, [{ id: 'scopeLayers', value: 'ON' }]);
    if (bad.length) { p.push(`the toggle did not take under SPIRAL: ${bad.join('; ')}`); note(`${tag} ${label}: ${p.join('; ')}`); return; }
    const on = await snap(pg);
    if (on.bar.hidden) p.push('the scope bar is hidden under SPIRAL with per-layer values ON');
    if (on.digest !== off.digest) p.push('switching per-layer values ON under SPIRAL with no record moved the bloom');
    if (!on.hidden.layerSize || !on.hidden.layerTilt) p.push('Shrink / Tilt step stay shown under SPIRAL with per-layer values ON (Q3.5)');
    const turns = on.bar.options.filter((o) => o.value);
    if (turns.length !== 3 || turns.some((o, k) => !new RegExp(`^Turn ${k + 1}\\b`).test(o.label))) p.push(`the picker lists ${JSON.stringify(turns.map((o) => o.label))} — expected the spiral's three turns, named Turn 1..3`);
    /* a cup edit on turn 1 (the OUTER — never the middle of three, the fixed point of a reversed order) */
    const global = DEFAULTS.petalCup;
    await pick(pg, 0);
    bad = await applyConfig(pg, [{ id: 'petalCup', value: '0.6' }]);
    if (bad.length) p.push(`the cup edit did not take: ${bad.join('; ')}`);
    const e = await snap(pg);
    const strays = e.forms.filter((f) => f.whorl !== 0 && (f.scope !== null || (f.cup ?? global) !== global));
    const missed = e.forms.filter((f) => f.whorl === 0 && (!f.scope || f.cup !== 0.6));
    if (strays.length) p.push(`a cup edit on turn 1 reached ${strays.length} petal(s) on another turn`);
    if (missed.length || !e.forms.some((f) => f.whorl === 0)) p.push(`${missed.length} turn-1 petal(s) did not take the cup`);
    /* a width edit on turn 2 drives its foot and its ring (restated from the controls) */
    await pick(pg, 1);
    bad = await applyConfig(pg, [{ id: 'petalWidth', value: '12' }]);
    if (bad.length) p.push(`the width edit did not take: ${bad.join('; ')}`);
    const w = await snap(pg);
    const r0 = w.rings[0], r1 = w.rings[1], r2 = w.rings[2];
    /* (root support: the asked foot floored, capped at the arc it owns on its
       own ring — the harness's restatement, never the record's arc) */
    const wantFoot = r1 ? footCapRestated(Math.max(FOOT_MIN_WIDTH_MM, 12 * 0.4 * Number(DEFAULTS.footDelicacy)), r1.radius, footSpanRestated(w.ui)).width : NaN;
    if (!r1 || r1.ownWidth !== 12) p.push(`turn 2's ring reports its own width as ${r1 && r1.ownWidth}, not the 12 set`);
    if (!r1 || !Object.is(r1.width, wantFoot)) p.push(`the owned turn's foot is ${r1 && r1.width} mm across, restated ${wantFoot} — the foot did not follow its own width`);
    if (!r1 || Math.abs(r1.radius / r0.radius - 12 / Number(DEFAULTS.petalWidth)) > 1e-12) p.push(`the owned turn's ring sits at ${r1 && (r1.radius / r0.radius).toFixed(6)} of the rim, restated ${(12 / Number(DEFAULTS.petalWidth)).toFixed(6)} — the ring did not follow its own width`);
    if (!r2 || Math.abs(r2.radius / r0.radius - Math.pow(Number(DEFAULTS.layerSize), 2)) > 1e-12) p.push(`turn 3 (no own width) sits at ${r2 && (r2.radius / r0.radius).toFixed(6)} of the rim, not the Shrink ramp's ${Math.pow(Number(DEFAULTS.layerSize), 2).toFixed(6)}`);
    if (w.ui.petalWidth !== DEFAULTS.petalWidth) p.push(`a width edit on turn 2 moved the WHOLE-BLOOM width to ${w.ui.petalWidth}`);
    if (w.hubGrowth || w.grownLine) p.push(`a width of 12 on turn 2 (narrower than the outer whorl's) grew the hub: ${JSON.stringify(w.hubGrowth)} / ${w.grownLine}`);
    /* A WIDTH PAST THE OUTER WHORL'S GROWS THE HUB (Eva's ruling, Oct 16, replacing
       the rim hold): turn 3 at 19 mm puts its ring at 19/16 of R0, the rim moves
       out to it, and the read-out SAYS so with the amount — restated here */
    await pick(pg, 2);
    bad = await applyConfig(pg, [{ id: 'petalWidth', value: '19' }]);
    if (bad.length) p.push(`the over-wide edit did not take: ${bad.join('; ')}`);
    const gw = await snap(pg);
    const g0 = gw.rings[0], g2 = gw.rings[2];
    const wantHub = g0 && g0.radius * 19 / Number(DEFAULTS.petalWidth);
    if (!g2 || Math.abs(g2.radius - wantHub) > 1e-9) p.push(`the over-wide turn's ring sits at ${g2 && g2.radius}, restated R0 x 19/${DEFAULTS.petalWidth} = ${wantHub} — it was held, not placed`);
    if (Math.abs(gw.hubR - wantHub) > 1e-9) p.push(`the hub is ${gw.hubR} mm, restated ${wantHub} — the hub did not grow to the widest owned ring`);
    if (!gw.hubGrowth || gw.hubGrowth.layer !== 2) p.push(`the build reports hub growth ${JSON.stringify(gw.hubGrowth)}, restated for turn 3`);
    const byWant = wantHub - (g0 ? g0.radius : NaN);
    if (!gw.grownLine || !gw.grownLine.includes(`+${byWant.toFixed(2)} mm`) || !/layer 3/.test(gw.grownLine)) p.push(`the read-out's HUB GROWN line is ${JSON.stringify(gw.grownLine)} — it must say the hub grew for layer 3 and by +${byWant.toFixed(2)} mm`);
    /* deselect and OFF keep the record; OFF builds the unscoped bloom */
    const before = await snap(pg);
    await unpick(pg);
    const after = await snap(pg);
    if (after.rec !== before.rec) p.push(`deselecting changed the record: ${before.rec} -> ${after.rec}`);
    await applyConfig(pg, [{ id: 'scopeLayers', value: 'OFF' }]);
    const z = await snap(pg);
    if (z.rec !== after.rec) p.push(`switching per-layer OFF changed the record to ${z.rec}`);
    if (z.digest !== off.digest) p.push('with per-layer OFF the spiral is not the unscoped one — a kept record reached the build');
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: Per-layer values hidden under CONTINUOUS and shown under a 3-turn SPIRAL; ON alone moves nothing and hides Shrink / Tilt step; the picker lists Turn 1..3; a cup edit on turn 1 lands on its whorl only; a width of 12 on turn 2 gives its foot ${wantFoot.toFixed(3)} mm and its ring ${(12 / Number(DEFAULTS.petalWidth)).toFixed(4)} of the rim (restated), turn 3 still on the ramp; 19 on turn 3 grows the hub to its ring, told on the read-out; deselect and OFF keep the record, OFF builds the unscoped bloom`);
  };
  await openBloom(page, port);
  await run(page, 'per-layer on a spiral');
  if (NEGATIVE_CONTROL) {
    const geoSrc = fs.readFileSync(new URL('../bloom-geometry.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'per-layer values stay RADIAL only', from: "export const SCOPE_LAYER_PLACEMENTS = Object.freeze(['RADIAL', 'SPIRAL']);", to: "export const SCOPE_LAYER_PLACEMENTS = Object.freeze(['RADIAL']);" },
      { name: 'the foot keeps the ramp', from: '    const authoredWidth = ownWidth === null ? state.petalWidth * scale * 0.4 * state.footDelicacy : ownWidth * 0.4 * state.footDelicacy;', to: '    const authoredWidth = state.petalWidth * scale * 0.4 * state.footDelicacy;' },
      { name: 'the ring keeps the ramp', from: '    const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;', to: '    const ringFactor = scale;' },
      { name: 'the ring is held at the rim again', from: '    const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;', to: '    const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : Math.min(1, ownWidth / state.petalWidth);' },
    ];
    for (const m of MUTANTS) if (geoSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom-geometry.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (geoSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom-geometry.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: geoSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (ah) THE OUTLINE UNDER SCOPING (F6-scope) ----------
   See the header. The petals are read off the BUILDER's per-petal census
   (`petalAllOutline`: each built petal's layer, its mode and the plan's own
   points); the record off `__bloomDesign.scopes()`; what each assertion
   expects is the control value this route itself set. */
{
  const tag = '[outline scopes]';
  const SPOON = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
  const DIAMOND = { mode: 'symmetric', points: [[0, 0.03], [0.4, 0.22], [0.45, 0.25], [0.5, 0.22], [1, 0]] };
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const snap = (pg) => pg.evaluate(() => {
    const m = window.__bloomMetrics();
    const note = (id) => { const el = document.getElementById(id).closest('.bl-ctrl').querySelector('.bl-scope-note'); return el && !el.hidden ? el.textContent : ''; };
    return {
      rec: JSON.stringify(window.__bloomDesign.scopes()), ui: window.__bloomUIState(),
      petals: (m.petalAllOutline || []).filter(Boolean).map((p) => ({ whorl: Math.round(p.whorl), mode: p.mode, pts: JSON.stringify(p.pointsL) })),
      modeNote: note('petalOutlineMode'), curveNote: note('petalOutlineCurve'),
      reset: document.getElementById('scopeOutlineReset').hidden,
    };
  });
  const setValue = async (pg, id, v) => { await pg.evaluate(([i, val]) => { const el = document.getElementById(i); el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await settle(pg); };
  const run = async (pg, label) => {
    const p = [];
    const bad = await applyConfig(pg, [{ id: 'layerCount', value: '2' }, { id: 'scopeLayers', value: 'ON' }, { id: 'petalOutlineMode', value: 'LAW' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const base = await snap(pg);
    await pg.evaluate(() => window.__bloomScopeView.select({ kind: 'layer', layer: 1, slot: 0 })); await settle(pg);
    const picked = await snap(pg);
    if (picked.rec !== base.rec) p.push(`a pick WROTE an outline to the record: ${base.rec} -> ${picked.rec}`);
    if (!/INHERITED/.test(picked.modeNote) || !/INHERITED/.test(picked.curveNote + picked.modeNote)) p.push(`the picked layer's outline notes do not say INHERITED (${JSON.stringify(picked.modeNote)})`);
    await setValue(pg, 'petalOutlineMode', 'CURVE');
    const owned = await snap(pg);
    const rec1 = JSON.parse(owned.rec || 'null');
    const L1 = rec1 && rec1.layers && rec1.layers.find((e) => e.layer === 1);
    if (!L1 || !L1.values || L1.values.petalOutlineMode !== 'CURVE' || 'petalOutlineCurve' in L1.values) p.push(`after setting layer 2's mode the record is ${owned.rec} — it must carry layer 2's own mode and NO curve (the curve inherited, live)`);
    if (owned.ui.petalOutlineMode !== 'LAW') p.push(`a mode edit on layer 2 moved the WHOLE-BLOOM mode to ${owned.ui.petalOutlineMode}`);
    const g0 = JSON.stringify(owned.ui.petalOutlineCurve.points);
    const strays = owned.petals.filter((q) => q.whorl === 0 && q.mode !== 'LAW'), missed = owned.petals.filter((q) => q.whorl === 1 && (q.mode !== 'CURVE' || q.pts !== g0));
    if (strays.length || missed.length || !owned.petals.some((q) => q.whorl === 1)) p.push(`layer 2 owning CURVE: ${strays.length} layer-1 petal(s) left the LAW, ${missed.length} layer-2 petal(s) do not draw the whole bloom's curve`);
    if (!/OWN outline mode/.test(owned.modeNote)) p.push(`the mode note does not say it is layer 2's OWN: ${JSON.stringify(owned.modeNote)}`);
    if (owned.reset) p.push('the reset button is hidden while layer 2 owns its mode');
    /* deselected, an edit to the whole bloom's curve reaches layer 2 live */
    await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg);
    const des = await snap(pg);
    if (des.rec !== owned.rec) p.push(`deselecting changed the record: ${owned.rec} -> ${des.rec}`);
    await setValue(pg, 'petalOutlineCurve', SPOON);
    const live = await snap(pg);
    if (live.rec !== owned.rec) p.push(`an edit to the whole bloom's curve changed the scope record: ${live.rec}`);
    if (live.petals.filter((q) => q.whorl === 1).some((q) => q.pts !== JSON.stringify(SPOON.points))) p.push('layer 2 did not follow the whole bloom\'s curve edit — its inherited curve is not live');
    /* picked again, a curve edit makes it layer 2's own */
    await pg.evaluate(() => window.__bloomScopeView.select({ kind: 'layer', layer: 1, slot: 0 })); await settle(pg);
    await setValue(pg, 'petalOutlineCurve', DIAMOND);
    const own2 = await snap(pg);
    const rec2 = JSON.parse(own2.rec || 'null');
    const L2 = rec2 && rec2.layers && rec2.layers.find((e) => e.layer === 1);
    if (!L2 || !L2.values || !L2.values.petalOutlineCurve || JSON.stringify(L2.values.petalOutlineCurve.points) !== JSON.stringify(DIAMOND.points)) p.push(`after a curve edit on layer 2 the record is ${own2.rec} — the curve must be layer 2's own`);
    if (JSON.stringify(own2.ui.petalOutlineCurve.points) !== JSON.stringify(SPOON.points)) p.push('a curve edit on layer 2 moved the WHOLE-BLOOM curve');
    if (own2.petals.filter((q) => q.whorl === 1).some((q) => q.pts !== JSON.stringify(DIAMOND.points))) p.push('layer 2\'s petals do not draw its own curve');
    /* reset to inherited */
    await pg.click('#scopeOutlineReset'); await settle(pg);
    const rs = await snap(pg);
    const rec3 = JSON.parse(rs.rec || 'null');
    const L3 = rec3 && rec3.layers && rec3.layers.find((e) => e.layer === 1);
    if (L3 && L3.values) p.push(`the reset left layer 2 owning ${JSON.stringify(L3.values)}`);
    if (!rs.reset) p.push('the reset button is still shown after the reset');
    if (rs.petals.filter((q) => q.whorl === 1).some((q) => q.mode !== 'LAW')) p.push('after the reset layer 2 does not inherit the whole bloom\'s LAW');
    await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a pick writes nothing and says INHERITED; layer 2's mode set to CURVE is its own (no curve in the record), its 8 petals draw the whole bloom's curve and layer 1 stays LAW; deselected, the whole bloom's curve edit reaches layer 2 live; picked, a curve edit is layer 2's own and the global is unmoved; the reset removes the values and layer 2 inherits again`);
  };
  await openBloom(page, port);
  await run(page, 'per-layer outlines');
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'a pick applies the scope outline', from: '  bindScope(next && scopeIsValid(next, ui) ? next : null);\n  relabelView();', to: '  bindScope(next && scopeIsValid(next, ui) ? next : null);\n  if (scopeView && scopeView.kind !== \'tier\') { const o = scopeOwnEntry(scopeView, true); o.values = { ...(o.values || {}), petalOutlineCurve: inputs.petalOutlineCurve.value }; }\n  relabelView();' },
      /* re-anchored by F3-scope: the reset is per value GROUP now
         (`resetScopeValues`) and a curve is recognised by its registry kind
         (`isCurveId`) — the defects these two plant are unchanged */
      { name: 'the reset leaves the owned curve', from: '  for (const id of ids) delete own.values[id];', to: "  for (const id of ids) if (id !== 'petalOutlineCurve') delete own.values[id];" },
      { name: 'an inherited curve is frozen at copy time', from: '  (own.values || (own.values = {}))[id] = isCurveId(id)', to: "  if (id === 'petalOutlineMode' && !(own.values && 'petalOutlineCurve' in own.values)) (own.values || (own.values = {})).petalOutlineCurve = cloneCurve(inheritedOutlineValue(v, 'petalOutlineCurve', ui, own));\n  (own.values || (own.values = {}))[id] = isCurveId(id)" },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (ai) OUTLINE-GATED VISIBILITY FOLLOWS THE PICK -----------
   See the header. The controls are the ones whose predicate DRIVES on
   `petalOutlineMode`; the expectation is the registry's own predicate on the
   whole-bloom state with the mode RESTATED from the scope record (the scope's
   own value, else the whole bloom's), so the page's resolver is the thing
   under test and never the reference. */
{
  const tag = '[outline visibility]';
  const GATED = CONTROLS.filter((c) => predicateDrivers(c.visibleWhen).has('petalOutlineMode')).map((c) => c.id);
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const setValue = async (pg, id, v) => { await pg.evaluate(([i, val]) => { const el = document.getElementById(i); el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await settle(pg); };
  const shown = (pg) => pg.evaluate((ids) => Object.fromEntries(ids.map((i) => [i, !document.getElementById(i).closest('.bl-ctrl').hidden])), GATED);
  /* the scope's mode, restated from the record the page reports: its own value, else the whole bloom's */
  const restatedMode = (rec, ui, v) => {
    const list = v.kind === 'pair' ? (rec && rec.petals) || [] : (rec && rec.layers) || [];
    const e = list.find((x) => x.layer === v.layer && (v.kind !== 'pair' || x.slot === v.slot));
    return e && e.values && e.values.petalOutlineMode ? e.values.petalOutlineMode : ui.petalOutlineMode;
  };
  const ARR = [
    { label: 'a RADIAL layer', cfg: [{ id: 'layerCount', value: '2' }, { id: 'scopeLayers', value: 'ON' }], own: { kind: 'layer', layer: 1, slot: 0 }, inh: { kind: 'layer', layer: 0, slot: 0 } },
    { label: 'a FAN pair', cfg: [{ id: 'placement', value: 'FAN' }, { id: 'scopePetals', value: 'ON' }], own: { kind: 'pair', layer: 0, slot: 2 }, inh: { kind: 'pair', layer: 0, slot: 1 } },
    { label: 'a SPIRAL turn', cfg: [{ id: 'placement', value: 'SPIRAL' }, { id: 'layerCount', value: '2' }, { id: 'scopeLayers', value: 'ON' }], own: { kind: 'layer', layer: 1, slot: 0 }, inh: { kind: 'layer', layer: 0, slot: 0 } },
  ];
  const run = async (pg, label) => {
    const p = [];
    if (GATED.length < 10) p.push(`only ${GATED.length} control(s) drive on petalOutlineMode — the census that finds them is broken`);
    let checked = 0;
    for (const A of ARR) for (const [glob, owned] of [['LAW', 'CURVE'], ['CURVE', 'LAW']]) {
      await pg.evaluate(() => { window.__bloomScopeView.deselect(); window.__bloomScopes(null); }); await settle(pg);
      const bad = await applyConfig(pg, [...A.cfg, { id: 'petalOutlineMode', value: glob }]);
      if (bad.length) { p.push(`${A.label}: config did not take: ${bad.join('; ')}`); continue; }
      await pg.evaluate((v) => window.__bloomScopeView.select(v), A.own); await settle(pg);
      await setValue(pg, 'petalOutlineMode', owned);
      const picks = {};
      for (const [which, v] of [['owning', A.own], ['inheriting', A.inh]]) {
        await pg.evaluate((x) => window.__bloomScopeView.select(x), v); await settle(pg);
        const snapV = await pg.evaluate(() => ({ rec: window.__bloomDesign.scopes(), ui: window.__bloomUIState() }));
        const mode = restatedMode(snapV.rec, snapV.ui, v);
        const want = which === 'owning' ? owned : glob;
        if (mode !== want) p.push(`${A.label}, whole bloom ${glob}: the record says the ${which} scope's mode is ${mode}, expected ${want} — the route's own setup did not take`);
        const st = { ...snapV.ui, petalOutlineMode: mode };
        const got = await shown(pg);
        const wrong = GATED.filter((id) => got[id] !== evalPredicate(CONTROLS.find((c) => c.id === id).visibleWhen, st));
        if (wrong.length) p.push(`${A.label}, whole bloom ${glob}, the ${which} scope (mode ${mode}): ${wrong.join(', ')} ${wrong.length === 1 ? 'is' : 'are'} shown/hidden on a mode other than the picked scope's`);
        picks[which] = JSON.stringify(got);
        checked++;
      }
      if (picks.owning === picks.inheriting) p.push(`${A.label}, whole bloom ${glob}: the owning and inheriting picks show the same outline controls — the clause is vacuous here`);
      await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg);
    }
    await pg.evaluate(() => window.__bloomScopes(null)); await settle(pg);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${GATED.length} outline-gated controls follow the PICKED scope's mode on ${checked} picks (a RADIAL layer, a FAN pair, a SPIRAL turn; whole bloom LAW and CURVE; owning and inheriting), restated from the record, and the two picks disagree every time`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'scoped outline visibility');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'visibility reads the whole bloom\'s outline mode', from: '  const vui = scopeView ? viewUi(ui) : ui;', to: '  const vui = scopeView ? { ...viewUi(ui), petalOutlineMode: ui.petalOutlineMode } : ui;' },
      { name: 'visibility ignores the pick', from: "wrappers[c.id].hidden = !evalPredicate(c.visibleWhen, scopeView && idsFor(scopeView).has(c.id) ? vui : ui);", to: 'wrappers[c.id].hidden = !evalPredicate(c.visibleWhen, ui);' },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (aj) THE SPINE UNDER SCOPING (F3-scope) -------------
   See the header. Two RADIAL layers, Per-layer values ON, the whole bloom on
   the curl SLIDERS at curl 45. The petals are read off the BUILDER's per-petal
   census (`petalAllSpine`: each built petal's layer, its curl mode and the
   curve its law consumed); the record off `__bloomDesign.scopes()`; the curl-
   gated controls' visibility RESTATED through the registry's own
   `evalPredicate` on the whole-bloom state with the curl mode taken from the
   record (the scope's own value, else the whole bloom's). What each
   assertion expects is the control value this route itself set. */
{
  const tag = '[spine scopes]';
  const INCURVE = { mode: 'single', points: [[0, 0], [0.45, 0.06], [0.8, 0.3], [0.92, 0.55]] };
  const REFLEX = { mode: 'single', points: [[0, 0], [0.5, -0.05], [0.9, -0.3]] };
  const SPOON = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
  const GATED = CONTROLS.filter((c) => c.role === 'petal' && predicateDrivers(c.visibleWhen).has('petalCurlMode')).map((c) => c.id);
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const snap = (pg) => pg.evaluate((gated) => {
    const m = window.__bloomMetrics();
    const note = (id) => { const el = document.getElementById(id).closest('.bl-ctrl').querySelector('.bl-scope-note'); return el && !el.hidden ? el.textContent : ''; };
    return {
      rec: JSON.stringify(window.__bloomDesign.scopes()), ui: window.__bloomUIState(),
      petals: (m.petalAllSpine || []).filter(Boolean).map((p) => ({ whorl: Math.round(p.whorl), curve: p.curveMode, pts: p.curve ? JSON.stringify((typeof p.curve === 'string' ? JSON.parse(p.curve) : p.curve).points) : null })),
      outlines: (m.petalAllOutline || []).filter(Boolean).map((p) => ({ whorl: Math.round(p.whorl), mode: p.mode })),
      modeNote: note('petalCurlMode'), curveNote: note('petalSpineCurve'),
      spineReset: document.getElementById('scopeSpineReset').hidden, outlineReset: document.getElementById('scopeOutlineReset').hidden,
      shown: Object.fromEntries(gated.map((i) => [i, !document.getElementById(i).closest('.bl-ctrl').hidden])),
    };
  }, GATED);
  const setValue = async (pg, id, v) => { await pg.evaluate(([i, val]) => { const el = document.getElementById(i); el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await settle(pg); };
  const layerOf = (rec, k) => { const r = JSON.parse(rec || 'null'); return r && r.layers ? r.layers.find((e) => e.layer === k) : null; };
  /* the curl-gated controls against the registry's predicate on the record's restated mode */
  const visWrong = (sn, k) => {
    const e = layerOf(sn.rec, k);
    const mode = e && e.values && e.values.petalCurlMode ? e.values.petalCurlMode : sn.ui.petalCurlMode;
    const st = { ...sn.ui, petalCurlMode: mode };
    return GATED.filter((id) => sn.shown[id] !== evalPredicate(CONTROLS.find((c) => c.id === id).visibleWhen, st));
  };
  const run = async (pg, label) => {
    const p = [];
    if (GATED.length < 3) p.push(`only ${GATED.length} petal control(s) drive on petalCurlMode — the census that finds them is broken`);
    const bad = await applyConfig(pg, [{ id: 'layerCount', value: '2' }, { id: 'scopeLayers', value: 'ON' }, { id: 'petalCurlMode', value: 'SLIDER' }, { id: 'petalSpineCurl', value: '45' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const base = await snap(pg);
    await pg.evaluate(() => window.__bloomScopeView.select({ kind: 'layer', layer: 1, slot: 0 })); await settle(pg);
    const picked = await snap(pg);
    if (picked.rec !== base.rec) p.push(`a pick WROTE a spine to the record: ${base.rec} -> ${picked.rec}`);
    if (!/INHERITED/.test(picked.modeNote)) p.push(`the picked layer's curl-mode note does not say INHERITED (${JSON.stringify(picked.modeNote)})`);
    /* layer 2 owns the CURVE mode — and an outline, so the two resets can be told apart */
    await setValue(pg, 'petalCurlMode', 'CURVE');
    await setValue(pg, 'petalOutlineMode', 'CURVE');
    const owned = await snap(pg);
    const L1 = layerOf(owned.rec, 1);
    if (!L1 || !L1.values || L1.values.petalCurlMode !== 'CURVE' || 'petalSpineCurve' in L1.values) p.push(`after setting layer 2's curl mode the record is ${owned.rec} — it must carry layer 2's own mode and NO spine curve (the curve inherited, live)`);
    if (owned.ui.petalCurlMode !== 'SLIDER') p.push(`a curl-mode edit on layer 2 moved the WHOLE-BLOOM mode to ${owned.ui.petalCurlMode}`);
    const g0 = JSON.stringify((typeof owned.ui.petalSpineCurve === 'string' ? JSON.parse(owned.ui.petalSpineCurve) : owned.ui.petalSpineCurve).points);
    const strays = owned.petals.filter((q) => q.whorl === 0 && q.curve), missed = owned.petals.filter((q) => q.whorl === 1 && (!q.curve || q.pts !== g0));
    if (strays.length || missed.length || !owned.petals.some((q) => q.whorl === 1)) p.push(`layer 2 owning CURVE: ${strays.length} layer-1 petal(s) left the sliders, ${missed.length} layer-2 petal(s) do not bend on the whole bloom's spine curve`);
    if (!/OWN curl mode/.test(owned.modeNote)) p.push(`the curl-mode note does not say it is layer 2's OWN: ${JSON.stringify(owned.modeNote)}`);
    if (owned.spineReset) p.push('the spine reset button is hidden while layer 2 owns its curl mode');
    if (owned.outlineReset) p.push('the outline reset button is hidden while layer 2 owns its outline mode');
    /* the curl sliders follow the PICKED layer's mode: hidden on layer 2 (CURVE), shown on layer 1 (SLIDER) */
    const w2 = visWrong(owned, 1);
    if (w2.length) p.push(`layer 2 picked (mode CURVE): ${w2.join(', ')} shown/hidden on a curl mode other than the picked layer's`);
    await pg.evaluate(() => window.__bloomScopeView.select({ kind: 'layer', layer: 0, slot: 0 })); await settle(pg);
    const other = await snap(pg);
    const w1 = visWrong(other, 0);
    if (w1.length) p.push(`layer 1 picked (mode SLIDER): ${w1.join(', ')} shown/hidden on a curl mode other than the picked layer's`);
    if (JSON.stringify(other.shown) === JSON.stringify(owned.shown)) p.push('the two layers\' picks show the same curl controls — the visibility clause is vacuous here');
    /* deselected, an edit to the whole bloom's spine curve reaches layer 2 live */
    await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg);
    const des = await snap(pg);
    if (des.rec !== owned.rec) p.push(`deselecting changed the record: ${owned.rec} -> ${des.rec}`);
    await setValue(pg, 'petalSpineCurve', INCURVE);
    const live = await snap(pg);
    if (live.rec !== owned.rec) p.push(`an edit to the whole bloom's spine curve changed the scope record: ${live.rec}`);
    if (live.petals.filter((q) => q.whorl === 1).some((q) => q.pts !== JSON.stringify(INCURVE.points))) p.push('layer 2 did not follow the whole bloom\'s spine-curve edit — its inherited spine is not live');
    if (live.petals.filter((q) => q.whorl === 0).some((q) => q.curve)) p.push('the whole bloom\'s spine-curve edit bent layer 1, which is on the sliders');
    /* picked again, a curve edit makes the spine layer 2's own */
    await pg.evaluate(() => window.__bloomScopeView.select({ kind: 'layer', layer: 1, slot: 0 })); await settle(pg);
    await setValue(pg, 'petalSpineCurve', REFLEX);
    const own2 = await snap(pg);
    const L2 = layerOf(own2.rec, 1);
    if (!L2 || !L2.values || !L2.values.petalSpineCurve || JSON.stringify(L2.values.petalSpineCurve.points) !== JSON.stringify(REFLEX.points)) p.push(`after a spine-curve edit on layer 2 the record is ${own2.rec} — the spine curve must be layer 2's own`);
    const gNow = own2.ui.petalSpineCurve;
    if (JSON.stringify((typeof gNow === 'string' ? JSON.parse(gNow) : gNow).points) !== JSON.stringify(INCURVE.points)) p.push('a spine-curve edit on layer 2 moved the WHOLE-BLOOM spine curve');
    if (own2.petals.filter((q) => q.whorl === 1).some((q) => q.pts !== JSON.stringify(REFLEX.points))) p.push('layer 2\'s petals do not bend on its own spine curve');
    if (!/OWN spine curve/.test(own2.curveNote)) p.push(`the spine-curve note does not say it is layer 2's OWN: ${JSON.stringify(own2.curveNote)}`);
    /* the SPINE reset removes the spine's values and keeps the outline's */
    await pg.click('#scopeSpineReset'); await settle(pg);
    const rs = await snap(pg);
    const L3 = layerOf(rs.rec, 1);
    if (L3 && L3.values && ('petalCurlMode' in L3.values || 'petalSpineCurve' in L3.values)) p.push(`the spine reset left layer 2 owning ${JSON.stringify(L3.values)}`);
    if (!L3 || !L3.values || L3.values.petalOutlineMode !== 'CURVE') p.push(`the spine reset took layer 2's OUTLINE with it: ${rs.rec}`);
    if (!rs.spineReset) p.push('the spine reset button is still shown after the reset');
    if (rs.outlineReset) p.push('the outline reset button went with the spine\'s, while layer 2 still owns its outline');
    if (rs.petals.filter((q) => q.whorl === 1).some((q) => q.curve)) p.push('after the spine reset layer 2 does not inherit the whole bloom\'s SLIDER mode');
    if (rs.outlines.filter((q) => q.whorl === 1).some((q) => q.mode !== 'CURVE')) p.push('after the spine reset layer 2 no longer draws its own outline');
    await pg.evaluate(() => { window.__bloomScopeView.deselect(); window.__bloomScopes(null); }); await settle(pg);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a pick writes nothing and says INHERITED; layer 2's curl mode set to CURVE is its own (no spine curve in the record), its petals bend on the whole bloom's spine and layer 1 stays on the sliders; the ${GATED.length} curl-gated controls follow each picked layer's mode; deselected, the whole bloom's spine edit reaches layer 2 live; picked, a spine edit is layer 2's own and the global is unmoved; the spine reset removes the spine values and keeps the outline's`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'per-layer spines');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'a pick applies the scope spine', from: '  bindScope(next && scopeIsValid(next, ui) ? next : null);\n  relabelView();', to: "  bindScope(next && scopeIsValid(next, ui) ? next : null);\n  if (scopeView && scopeView.kind !== 'tier') { const o = scopeOwnEntry(scopeView, true); o.values = { ...(o.values || {}), petalSpineCurve: inputs.petalSpineCurve.value }; }\n  relabelView();" },
      { name: 'the spine reset leaves the owned spine curve', from: '  for (const id of ids) delete own.values[id];', to: "  for (const id of ids) if (id !== 'petalSpineCurve') delete own.values[id];" },
      { name: 'an inherited spine curve is frozen at copy time', from: '  (own.values || (own.values = {}))[id] = isCurveId(id)', to: "  if (id === 'petalCurlMode' && !(own.values && 'petalSpineCurve' in own.values)) (own.values || (own.values = {})).petalSpineCurve = cloneCurve(inheritedOutlineValue(v, 'petalSpineCurve', ui, own));\n  (own.values || (own.values = {}))[id] = isCurveId(id)" },
      { name: 'the spine reset drops the outline too', from: "  const ids = (v.kind === 'tier' ? SEPAL_SCOPE_VALUE_GROUPS : SCOPE_VALUE_GROUPS)[group].filter((id) => id in own.values);", to: "  const ids = Object.keys(own.values);" },
      { name: 'curl visibility reads the whole bloom\'s curl mode', from: '  const vui = scopeView ? viewUi(ui) : ui;', to: '  const vui = scopeView ? { ...viewUi(ui), petalCurlMode: ui.petalCurlMode } : ui;' },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (ak) THE FOLD LIMIT ON THE PAGE (spine-cup-fold) -----
   See the header. What each assertion expects is the value this route set or
   the BUILDER's own record (`__bloomMetrics().spineFold`), never the read-out
   read back against itself. */
{
  const tag = '[fold limit]';
  const S = { mode: 'single', points: [[0, 0], [0.3, 0.12], [0.6, -0.1], [1, 0.15]] };
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const snap = (pg) => pg.evaluate(() => {
    const m = window.__bloomMetrics();
    const st = document.getElementById('petalSpineCurve').closest('.bl-ctrl').querySelector('.bl-curve-status');
    const line = document.getElementById('readout').textContent.split('\n').find((l) => /^SPINE CU(RL|RVE)/.test(l)) || '';
    return { cup: Number(document.getElementById('petalCup').value), status: st && !st.hidden ? st.textContent : '', fold: m.spineFold, line };
  });
  const setValue = async (pg, id, v) => { await pg.evaluate(([i, val]) => { const el = document.getElementById(i); el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await settle(pg); };
  const held = (sn) => (sn.fold || []).filter((q) => q && q.bendClamped);
  const run = async (pg, label) => {
    const p = [];
    const bad = await applyConfig(pg, [{ id: 'petalCurlMode', value: 'CURVE' }, { id: 'petalSpineCurve', value: JSON.stringify(S) }, { id: 'petalCup', value: '0.29' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    /* the hand: focus the range and step it with the keyboard, settling the build between presses */
    await pg.evaluate(() => { for (let d = document.getElementById('petalCup').closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; });
    const press = async () => { await pg.focus('#petalCup'); await pg.keyboard.press('ArrowRight'); await settle(pg); return snap(pg); };
    const a1 = await press(), a = await press();
    if (a1.cup !== 0.3 || a.cup !== 0.31) p.push(`stepping the cup 0.29 -> 0.30 -> 0.31 on the drawn S read ${a1.cup} then ${a.cup} — the cups the S accepts were refused`);
    if (a.status) p.push(`an accepted cup left a refusal on the spine editor: ${JSON.stringify(a.status)}`);
    if (held(a).length) p.push(`at cup 0.31 the builder holds ${held(a).length} petal(s) at the fold limit — the boundary is not where the validator puts it`);
    const r = await press();
    if (r.cup !== 0.31) p.push(`the cup edit to 0.32 on the drawn S was accepted (the slider reads ${r.cup}) — it would fold the sheet through itself and must be refused`);
    if (!/fold through itself/.test(r.status)) p.push(`the spine editor does not say why the cup was refused: ${JSON.stringify(r.status)}`);
    if (held(r).length) p.push(`after the refused cup the builder holds ${held(r).length} petal(s) at the fold limit — the refused value reached the build`);
    /* a LOADED cup (written by script) is the build's to clamp and tell, never refused */
    await setValue(pg, 'petalCup', '0.6');
    const l = await snap(pg);
    if (l.cup !== 0.6) p.push(`a cup of 0.6 written by SCRIPT was refused (the slider reads ${l.cup}) — a loaded state is clamped and told, only a hand edit is refused`);
    else if (!held(l).length) p.push('a loaded cup of 0.6 on the drawn S built no petal at the fold limit — it must be clamped and told');
    const bad2 = await applyConfig(pg, [{ id: 'petalCurlMode', value: 'SLIDER' }, { id: 'petalSpineCurl', value: '270' }, { id: 'petalCup', value: '1.2' }]);
    if (bad2.length) { note(`${tag} ${label}: slider config did not take: ${bad2.join('; ')}`); return; }
    const c = await snap(pg);
    if (c.cup !== 1.2) p.push(`a cup edit on the curl SLIDERS was refused (the slider reads ${c.cup}) — the slider family is clamped and told, never refused`);
    const h = held(c);
    if (!h.length) p.push('curl 270 x cup 1.2: the builder held no petal at the fold limit — the route has nothing to read');
    else {
      const w = h.reduce((x, q) => (q.bend.ratio > x.bend.ratio ? q : x), h[0]).bend;
      const want = `built at ${w.limitRadiusMm.toFixed(2)} mm where ${w.askedRadiusMm.toFixed(2)} mm was asked`;
      if (!/FOLD LIMIT/.test(c.line)) p.push(`the SPINE CURL line does not tell the fold limit the builder applied: ${JSON.stringify(c.line.slice(0, 200))}`);
      else if (!c.line.includes(want)) p.push(`the SPINE CURL line's fold-limit numbers are not the builder's (${want}): ${JSON.stringify(c.line.slice(0, 400))}`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: on the drawn S the keyboard steps 0.30 and 0.31 (accepted, nothing held) and 0.32 is refused (the slider stays, the editor names the fold, nothing held); a script-written 0.6 is built clamped, not refused; on the curl sliders 270 x cup 1.2 is clamped by the build and the SPINE CURL line tells the builder's own radius asked and built`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'the S and the sliders');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the cup is never refused', from: "  if (!reason) return;\n  e.target.value = base;", to: "  if (true) return;\n  e.target.value = base;" },
      { name: 'the read-out does not tell the fold limit', from: "  const fc = sps.filter((s) => s.bendClamped && s.bend);\n  if (!fc.length) return '';", to: "  const fc = sps.filter((s) => s.bendClamped && s.bend);\n  if (fc.length >= 0) return '';" },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (al) CURVE SEEDED FROM THE SLIDER SHAPE (curves-sepals) -----
   See the header. The reference for "not the default" is the registry's own
   default for the curve control; the slider values are the ones this route set. */
{
  const tag = '[seed]';
  const defOf = (id) => JSON.stringify(typeof DEFAULTS[id] === 'string' ? JSON.parse(DEFAULTS[id]) : DEFAULTS[id]);
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const read = (pg, ids) => pg.evaluate((list) => Object.fromEntries(list.map((i) => { const el = document.getElementById(i); const w = el.closest('.bl-ctrl'); const v = w && w.querySelector('.bl-val'); return [i, { value: el.value, text: v ? v.textContent : '' }]; })), ids);
  const canon = (v) => { try { return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v); } catch { return String(v); } };
  const pick = async (pg, id, key) => { await pg.evaluate((i) => { for (let d = document.getElementById(i).closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }, id); await pg.focus(`#${id}`); await pg.keyboard.press(key); await settle(pg); };
  const run = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'petalSpineCurl', value: '120' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    await pick(pg, 'petalCurlMode', 'c');
    let r = await read(pg, ['petalCurlMode', 'petalSpineCurve', 'petalSpineCurl', 'curlBias', 'curlStart']);
    if (r.petalCurlMode.value !== 'CURVE') p.push(`the keyboard switch did not reach CURVE (the select reads ${r.petalCurlMode.value})`);
    else {
      if (canon(r.petalSpineCurve.value) === defOf('petalSpineCurve')) p.push('the hand switch to CURVE at curl 120 left the DEFAULT spine curve — the spine was not seeded from the slider shape');
      if (!/SEEDED from .* departs from it by [0-9.]+ mm/.test(r.petalSpineCurve.text)) p.push(`the spine curve's read-out does not tell the seed and its fit error: ${JSON.stringify(r.petalSpineCurve.text.slice(0, 240))}`);
    }
    const seededSpine = r.petalSpineCurve.value;
    await pick(pg, 'petalCurlMode', 's');
    r = await read(pg, ['petalCurlMode', 'petalSpineCurl', 'curlBias', 'curlStart', 'petalSpineCurve']);
    if (r.petalCurlMode.value !== 'SLIDER') p.push(`the keyboard switch back did not reach SLIDER (${r.petalCurlMode.value})`);
    if (Number(r.petalSpineCurl.value) !== 120 || Number(r.curlBias.value) !== Number(DEFAULTS.curlBias) || Number(r.curlStart.value) !== Number(DEFAULTS.curlStart)) p.push(`switching back to SLIDER moved the curl sliders (curl ${r.petalSpineCurl.value}, bias ${r.curlBias.value}, start ${r.curlStart.value}) — they must come back untouched`);
    if (canon(r.petalSpineCurve.value) !== canon(seededSpine)) p.push('switching back to SLIDER rewrote the seeded curve');
    /* the outline: LAW -> CURVE seeds; a later petal-length step leaves it alone */
    await pick(pg, 'petalOutlineMode', 'c');
    r = await read(pg, ['petalOutlineMode', 'petalOutlineCurve']);
    if (r.petalOutlineMode.value !== 'CURVE') p.push(`the keyboard switch did not reach the outline CURVE (${r.petalOutlineMode.value})`);
    else {
      if (canon(r.petalOutlineCurve.value) === defOf('petalOutlineCurve')) p.push('the hand switch to the outline CURVE left the DEFAULT outline — it was not seeded from the law');
      if (!/SEEDED from the law outline/.test(r.petalOutlineCurve.text)) p.push(`the outline curve's read-out does not tell the seed: ${JSON.stringify(r.petalOutlineCurve.text.slice(0, 240))}`);
    }
    const seededOutline = r.petalOutlineCurve.value;
    await pick(pg, 'petalLength', 'ArrowRight'); await pick(pg, 'petalLength', 'ArrowRight');
    r = await read(pg, ['petalOutlineCurve', 'petalLength']);
    if (canon(r.petalOutlineCurve.value) !== canon(seededOutline)) p.push(`a later petal-length step (to ${r.petalLength.value} mm) rewrote the seeded outline — the seed must be written once and not follow the sliders`);
    /* the sepal seeds from the SEPAL's own curl */
    bad = await applyConfig(pg, [{ id: 'sepalCount', value: '5' }, { id: 'sepalSpineCurl', value: '60' }]);
    if (bad.length) p.push(`the sepal config did not take: ${bad.join('; ')}`);
    else {
      await pick(pg, 'sepalCurlMode', 'c');
      r = await read(pg, ['sepalCurlMode', 'sepalSpineCurve']);
      if (r.sepalCurlMode.value !== 'CURVE') p.push(`the sepal's keyboard switch did not reach CURVE (${r.sepalCurlMode.value})`);
      else if (canon(r.sepalSpineCurve.value) === defOf('sepalSpineCurve') || !/SEEDED/.test(r.sepalSpineCurve.text)) p.push('the sepal\'s hand switch to CURVE at sepal curl 60 was not seeded from the sepal\'s own curl');
    }
    /* a LOAD (script, untrusted) keeps its own points */
    const own = { mode: 'single', points: [[0, 0], [0.5, -0.05], [0.9, -0.3]] };
    bad = await applyConfig(pg, [{ id: 'petalSpineCurl', value: '200' }, { id: 'petalCurlMode', value: 'CURVE' }, { id: 'petalSpineCurve', value: JSON.stringify(own) }]);
    r = await read(pg, ['petalSpineCurve']);
    if (bad.length || canon(r.petalSpineCurve.value) !== JSON.stringify(own)) p.push(`a curve written with its mode by script (a design file's load) did not keep its own points: ${bad.join('; ')} ${canon(r.petalSpineCurve.value).slice(0, 120)}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a hand switch to CURVE at curl 120 writes a seeded spine and tells its fit error; back to SLIDER leaves curl / bias / start untouched; LAW -> CURVE seeds the outline and two later petal-length steps leave it alone; the sepal seeds from its own curl; a script-written curve keeps its points`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'petals, outline, sepal, load');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the seed is never written', from: "  inputs[M.curve].value = seed.curve;\n", to: "  if (false) inputs[M.curve].value = seed.curve;\n" },
      { name: 'the seed follows later slider moves', from: "window.addEventListener('change', onSeedSwitch, true);\n", to: "window.addEventListener('change', onSeedSwitch, true);\nwindow.addEventListener('change', (e) => { if (e.isTrusted && e.target && e.target.type === 'range') for (const k of Object.keys(SEED_MODES)) if (inputs[k].value === 'CURVE') onSeedSwitch({ target: inputs[k], isTrusted: true }); }, true);\n" },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (am) THE LEAF'S CURVES SEEDED (curves-leaves) ----------
   See the header. "Not the default" is the registry's own default for each
   curve control; the arch is the one this route set; the bend's direction is
   read off the seeded points AND off the leaf the build then drew. */
{
  const tag = '[leaf seed]';
  const defOf = (id) => JSON.stringify(typeof DEFAULTS[id] === 'string' ? JSON.parse(DEFAULTS[id]) : DEFAULTS[id]);
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const read = (pg, ids) => pg.evaluate((list) => Object.fromEntries(list.map((i) => { const el = document.getElementById(i); const w = el.closest('.bl-ctrl'); const v = w && w.querySelector('.bl-val'); return [i, { value: el.value, text: v ? v.textContent : '' }]; })), ids);
  const canon = (v) => { try { return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v); } catch { return String(v); } };
  const parse = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } };
  const pick = async (pg, id, key) => { await pg.evaluate((i) => { for (let d = document.getElementById(i).closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }, id); await pg.focus(`#${id}`); await pg.keyboard.press(key); await settle(pg); };
  const run = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'stemLength', value: '70' }, { id: 'leafLength', value: '52' }, { id: 'leafArch', value: '60' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    await pick(pg, 'leafCurlMode', 'c');
    let r = await read(pg, ['leafCurlMode', 'leafSpineCurve', 'leafArch']);
    if (r.leafCurlMode.value !== 'CURVE') p.push(`the keyboard switch did not reach the leaf's CURVE (the select reads ${r.leafCurlMode.value})`);
    else {
      if (canon(r.leafSpineCurve.value) === defOf('leafSpineCurve')) p.push('the hand switch to CURVE at Arch 60 left the DEFAULT leaf spine curve — the leaf spine was not seeded from the arch');
      if (!/SEEDED from the Arch slider's spine .* departs from it by [0-9.]+ mm/.test(r.leafSpineCurve.text)) p.push(`the leaf spine curve's read-out does not tell the seed and its fit error: ${JSON.stringify(r.leafSpineCurve.text.slice(0, 240))}`);
      const pts = (parse(r.leafSpineCurve.value) || {}).points || [];
      const last = pts[pts.length - 1];
      if (!last || !(last[1] < 0)) p.push(`the seeded leaf spine ends at ${JSON.stringify(last)} — at a POSITIVE Arch the drawn curve must FALL toward the tip (the arch turns the tip DOWN); the seed bends the other way`);
      const m = await pg.evaluate(() => window.__bloomMetrics());
      const sp = m.leaf && Array.isArray(m.leaf.spineBuilt) ? m.leaf.spineBuilt.find(Boolean) : null;
      if (!sp || !(sp.turnBuiltDeg < 0)) p.push(`the leaf the seeded curve builds turns ${sp ? sp.turnBuiltDeg : 'nothing'}° — the Arch 60 it replaced turned the tip down (a negative turn)`);
    }
    const seeded = r.leafSpineCurve.value;
    await pick(pg, 'leafCurlMode', 's');
    r = await read(pg, ['leafCurlMode', 'leafArch', 'leafSpineCurve']);
    if (r.leafCurlMode.value !== 'SLIDER') p.push(`the keyboard switch back did not reach SLIDER (${r.leafCurlMode.value})`);
    if (Number(r.leafArch.value) !== 60) p.push(`switching back to SLIDER moved the Arch (${r.leafArch.value}) — it must come back untouched`);
    if (canon(r.leafSpineCurve.value) !== canon(seeded)) p.push('switching back to SLIDER rewrote the seeded leaf curve');
    await pick(pg, 'leafOutlineMode', 'c');
    r = await read(pg, ['leafOutlineMode', 'leafOutlineCurve']);
    if (r.leafOutlineMode.value !== 'CURVE') p.push(`the keyboard switch did not reach the leaf outline CURVE (${r.leafOutlineMode.value})`);
    else if (canon(r.leafOutlineCurve.value) === defOf('leafOutlineCurve') || !/SEEDED from the leaf's law outline/.test(r.leafOutlineCurve.text)) p.push(`the hand switch to the leaf outline CURVE was not seeded from the leaf's law outline: ${JSON.stringify(r.leafOutlineCurve.text.slice(0, 200))}`);
    bad = await applyConfig(pg, [{ id: 'leafType', value: 'COMPOUND' }, { id: 'leafLength', value: '40' }]);
    if (bad.length) p.push(`the compound config did not take: ${bad.join('; ')}`);
    else {
      await pick(pg, 'leafletOutlineMode', 'c');
      r = await read(pg, ['leafletOutlineMode', 'leafletOutlineCurve']);
      if (r.leafletOutlineMode.value !== 'CURVE') p.push(`the keyboard switch did not reach the leaflet outline CURVE (${r.leafletOutlineMode.value})`);
      else if (canon(r.leafletOutlineCurve.value) === defOf('leafletOutlineCurve') || !/SEEDED from the leaf's law outline/.test(r.leafletOutlineCurve.text)) p.push(`the hand switch to the leaflet outline CURVE was not seeded: ${JSON.stringify(r.leafletOutlineCurve.text.slice(0, 200))}`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a hand switch to CURVE at Arch 60 writes a seeded leaf spine that FALLS toward the tip and builds a leaf turning down, and tells its fit error; back to SLIDER leaves the Arch untouched; the simple blade's and the leaflets' outlines seed from the leaf's law`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'leaf spine, outline, leaflets');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the leaf spine is never seeded', from: "  leafCurlMode: { curve: 'leafSpineCurve', kind: 'spine', leaf: 'leaf' },\n", to: '' },
      { name: 'the leaf seed fits the mirrored arch', from: "    const sub = leafBladeState({ ...ui, leafLength: L });\n", to: "    const sub = leafBladeState({ ...ui, leafLength: L, leafArch: -Number(ui.leafArch) });\n" },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (an) THE BRAID'S STRANDS UNDER THE PICKER (the braid session) -----
   See the header. Every claim is read off the BUILDER's own per-stamen record
   (`__bloomMetrics().androecium.stamens[i].lengthMm`), the raw record
   (`__bloomDesign.scopes()`) and the mesh digest — never the inputs this
   route set. The edited strand is NOT the first (index 0 is where a picker
   binding every pick to strand 1 would land) and not the middle of an odd
   count. */
{
  const tag = '[strand picker]';
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg); };
  const snap = (pg) => pg.evaluate(() => {
    const m = window.__bloomMetrics();
    const A = m.androecium;
    const w = document.getElementById('stamenLength').closest('.bl-ctrl'); const n = w.querySelector('.bl-scope-note');
    const wc = document.getElementById('stamenCurl').closest('.bl-ctrl'); const nc = wc.querySelector('.bl-scope-note');
    return {
      count: window.__bloomBuildState().count, digest: JSON.stringify(window.__bloomShownDigest()), rec: JSON.stringify(window.__bloomDesign.scopes()),
      ui: window.__bloomUIState(), bound: window.__bloomScopeView.bound(), bar: window.__bloomScopeView.bar(),
      lengths: A ? A.stamens.map((s) => s.lengthMm) : [], mode: A && A.coil ? A.coil.mode : null,
      shown: document.getElementById('stamenLength').value,
      lenNote: n && !n.hidden ? n.textContent : '', curlNote: nc && !nc.hidden ? nc.textContent : '', curlGlobal: wc.classList.contains('bl-ctrl--global'),
    };
  });
  const pick = async (pg, sel) => { const r = await pg.evaluate((s) => window.__bloomScopeView.select(s), sel); await settle(pg); return r; };
  const unpick = async (pg) => { await pg.evaluate(() => window.__bloomScopeView.deselect()); await settle(pg); };
  const sameView = (a, b) => a.count === b.count && a.digest === b.digest && a.rec === b.rec && JSON.stringify(a.ui) === JSON.stringify(b.ui);
  const run = async (pg, label) => {
    const p = [];
    const L0 = Number(DEFAULTS.stamenLength), N = 6, S = 3;
    let bad = await applyConfig(pg, [{ id: 'stamenCount', value: String(N) }, { id: 'stamenCoil', value: 'INDEPENDENT' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const ind = await snap(pg);
    if (!ind.bar.hidden) p.push('the scope bar shows on an INDEPENDENT coil — a strand exists only in a braid');
    bad = await applyConfig(pg, [{ id: 'stamenCoil', value: 'BRAIDED' }]);
    if (bad.length) { note(`${tag} ${label}: the braid did not take: ${bad.join('; ')}`); return; }
    const on = await snap(pg);
    if (on.mode !== 'BRAIDED') p.push(`the builder reports coil mode ${on.mode} on a braid`);
    if (on.bar.hidden) p.push('the scope bar is hidden on a braid');
    const strandOpts = on.bar.options.filter((o) => /^strand:/.test(o.value));
    if (strandOpts.length !== N || !/bundle/i.test(on.bar.options[0].label)) p.push(`the picker lists ${strandOpts.length} strand(s) at ${N} stamens and a first option "${on.bar.options[0] && on.bar.options[0].label}" — expected the bundle and ${N} strands`);
    /* 1. a pick LOADS */
    const got = await pick(pg, { kind: 'strand', layer: S, slot: 0 });
    const a1 = await snap(pg);
    if (!got || got.kind !== 'strand' || got.layer !== S) p.push(`picking strand ${S + 1} bound ${JSON.stringify(got)}`);
    if (!sameView(on, a1)) p.push(`picking strand ${S + 1} was not a pure load`);
    /* 2. a length edit lands on the picked strand only — the BUILDER's lengths */
    bad = await applyConfig(pg, [{ id: 'stamenLength', value: String(L0 + 4) }]);
    if (bad.length) p.push(`the length edit did not take: ${bad.join('; ')}`);
    const e = await snap(pg);
    const recE = JSON.parse(e.rec);
    const ents = recE && recE.strands ? recE.strands : [];
    if (ents.length !== 1 || ents[0].strand !== S || ents[0].offsets.stamenLength !== 4) p.push(`after the edit the record holds ${e.rec} — expected one strand entry, strand ${S + 1}'s length offset 4`);
    if (e.ui.stamenLength !== L0) p.push(`the strand edit moved the BUNDLE's length to ${e.ui.stamenLength}`);
    const wrong = e.lengths.map((l, i) => (i === S ? (l !== L0 + 4 ? i : -1) : (l !== L0 ? i : -1))).filter((i) => i >= 0);
    if (wrong.length) p.push(`the builder's lengths read ${JSON.stringify(e.lengths)} — strand ${S + 1} should be ${L0 + 4} and every other ${L0} (wrong at ${wrong.map((i) => i + 1).join(', ')})`);
    if (!new RegExp(`the bundle ${L0} \\+ 4 offset = ${L0 + 4}`).test(e.lenNote)) p.push(`the length control does not tell the bundle and the offset: "${e.lenNote}"`);
    if (!e.curlGlobal || !/the bundle/.test(e.curlNote)) p.push(`the curl (a bundle value) is not told as the bundle's under a picked strand: "${e.curlNote}"`);
    /* 3. another strand loads ITS value; a bundle value edited under the pick writes no offset */
    await pick(pg, { kind: 'strand', layer: 1, slot: 0 });
    const a3 = await snap(pg);
    if (a3.rec !== e.rec || a3.digest !== e.digest) p.push('a pick of another strand WROTE to the record or moved the braid');
    if (Number(a3.shown) !== L0) p.push(`strand 2's length slider shows ${a3.shown}, not its own ${L0}`);
    bad = await applyConfig(pg, [{ id: 'stamenCurl', value: '30' }]);
    const c3 = await snap(pg);
    if (bad.length || c3.ui.stamenCurl !== 30 || c3.rec !== e.rec) p.push(`a curl edit under a picked strand did not move the bundle's curl alone (curl ${c3.ui.stamenCurl}, record ${c3.rec})`);
    await applyConfig(pg, [{ id: 'stamenCurl', value: String(DEFAULTS.stamenCurl) }]);
    /* 4. deselect writes nothing */
    const b4 = await snap(pg);
    await unpick(pg);
    const a4 = await snap(pg);
    if (a4.bound !== null) p.push('deselecting left a strand bound');
    if (!sameView(b4, a4)) p.push('deselecting changed the record or moved the braid');
    if (Number(a4.shown) !== L0) p.push(`after deselecting the length slider shows ${a4.shown}, not the bundle's ${L0}`);
    /* 5. INDEPENDENT keeps the record and builds the unscoped coil */
    await applyConfig(pg, [{ id: 'stamenCoil', value: 'INDEPENDENT' }]);
    const z = await snap(pg);
    if (z.rec !== a4.rec) p.push(`switching to INDEPENDENT changed the record to ${z.rec}`);
    if (z.digest !== ind.digest) p.push('INDEPENDENT with a kept strand record is not the unscoped coil — the record reached the build');
    if (!z.bar.hidden) p.push('the scope bar still shows on INDEPENDENT');
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${N} stamens — no bar on INDEPENDENT; BRAIDED lists the bundle and ${N} strands; a pick is a pure load; a length edit on strand ${S + 1} lands on that strand alone (the builder's own lengths) and is told "the bundle + offset"; the curl stays the bundle's; strand 2 loads its own value; deselect writes nothing; INDEPENDENT keeps the record and builds the unscoped coil`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'braid strands');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the picker lists no strands', from: '  if (strandsMode(ui) && lastFoot.androecium) {\n', to: '  if (false && strandsMode(ui) && lastFoot.androecium) {\n' },
      { name: 'every pick binds strand 1', from: "  if (sel.kind === 'strand') return strandsMode(ui) ? { kind: 'strand', layer: Math.round(Number(sel.layer) || 0), slot: 0 } : null;\n", to: "  if (sel.kind === 'strand') return strandsMode(ui) ? { kind: 'strand', layer: 0, slot: 0 } : null;\n" },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (ao) SURFACE TEXTURE — THE LINE, THE SLIDERS, THE GREYING (T3) -----
   See the header. Every claim is read off the BUILDER's record
   (`__bloomMetrics().texture`) and the registry's own predicates evaluated
   on the page's read-back state — never the inputs this route set. */
{
  const tag = '[texture]';
  const snap = (pg) => pg.evaluate(() => {
    const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent;
    const wrap = (id) => document.getElementById(id).closest('.bl-ctrl');
    const st = (id) => ({ hidden: wrap(id).hidden, disabled: document.getElementById(id).disabled, greyed: wrap(id).classList.contains('bl-ctrl--disabled'), said: wrap(id).querySelector('.bl-val').textContent });
    return { T: m.texture, absent: m.textureAbsent, line: /TEXTURE ([^\n]*)/.exec(txt), notBuilt: /TEXTURE NOT BUILT — ([^\n]*)/.exec(txt),
      tex: st('petalTexture'), inf: st('petalInfill'), h: st('textureHeight'), z: st('textureSize'), ui: window.__bloomUIState(),
      /* (BONE, Oct 28) its five sliders, and the dropdown's OFFERED values (a
         retired value is kept as a hidden option, never offered) */
      bone: ['bonePoreSize', 'bonePoreDensity', 'boneBandRatio', 'bonePatchCoverage', 'boneCurvature'].map((id) => ({ id, hidden: wrap(id).hidden, said: wrap(id).querySelector('.bl-val').textContent })),
      offered: [...document.getElementById('petalTexture').options].filter((o) => !o.hidden).map((o) => o.value),
      kept: [...document.getElementById('petalTexture').options].filter((o) => o.hidden).map((o) => o.value) };
  });
  const run = async (pg, label, sets, want) => {
    const bad = sets.length ? await applyConfig(pg, sets) : [];
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const r = await snap(pg);
    const p = [];
    const present = evalPredicate({ ref: 'texturePresent' }, r.ui), infOn = evalPredicate({ ref: 'infillPresent' }, r.ui);
    if (!!r.T !== present) p.push(`the builder reports ${r.T ? 'a record' : 'no record'} while the registry reads the texture ${present ? 'present' : 'absent'}`);
    if (!!r.line !== !!r.T) p.push(`the TEXTURE line is ${r.line ? 'shown' : 'absent'} while the builder reports ${r.T ? 'a record' : 'no record'}`);
    const isBone = String(r.ui.petalTexture) === 'BONE', legacy = present && !isBone;
    if (r.h.hidden !== !present || r.z.hidden !== !legacy) p.push(`the height / size sliders are ${r.h.hidden ? 'hidden' : 'shown'} / ${r.z.hidden ? 'hidden' : 'shown'} at ${r.ui.petalTexture} (the size is the retired patterns' own)`);
    for (const b of r.bone) if (b.hidden !== !isBone) p.push(`BONE's ${b.id} is ${b.hidden ? 'hidden' : 'shown'} at ${r.ui.petalTexture}`);
    if (JSON.stringify(r.offered) !== '["NONE","BONE"]' || JSON.stringify(r.kept) !== '["PEBBLE","CELLULAR"]') p.push(`the dropdown offers ${r.offered.join(' / ')} and keeps ${r.kept.join(' / ')} hidden — it must offer NONE / BONE and keep PEBBLE / CELLULAR for saved designs (Eva, Oct 23)`);
    if (r.tex.hidden || r.inf.hidden) p.push('a choice is HIDDEN — Q9 greys, never hides');
    /* THE GREYING, both ways, restated from the registry's own predicates on
       the page's state: a control is greyed iff its `enabledWhen` is false,
       and a control that is ON is never greyed (both on must stay reachable) */
    const regInf = evalPredicate(CONTROLS.find((c) => c.id === 'petalInfill').enabledWhen, r.ui), regTex = evalPredicate(CONTROLS.find((c) => c.id === 'petalTexture').enabledWhen, r.ui);
    if (r.inf.disabled !== !regInf || r.inf.greyed !== !regInf) p.push(`the infill choice is ${r.inf.disabled ? 'disabled' : 'enabled'} / ${r.inf.greyed ? 'greyed' : 'plain'} where its own enabledWhen reads ${regInf}`);
    if (r.tex.disabled !== !regTex || r.tex.greyed !== !regTex) p.push(`the texture choice is ${r.tex.disabled ? 'disabled' : 'enabled'} / ${r.tex.greyed ? 'greyed' : 'plain'} where its own enabledWhen reads ${regTex}`);
    if (want.infGreyed !== undefined && !regInf !== want.infGreyed) p.push(`the registry greys the infill ${!regInf} where this route expects ${want.infGreyed}`);
    if (want.texGreyed !== undefined && !regTex !== want.texGreyed) p.push(`the registry greys the texture ${!regTex} where this route expects ${want.texGreyed}`);
    if (!regInf && !/texture/i.test(r.inf.said)) p.push(`the greyed infill's read-out does not name the texture: "${r.inf.said}"`);
    if (!regTex && !/infill/i.test(r.tex.said)) p.push(`the greyed texture's read-out does not name the infill: "${r.tex.said}"`);
    if (r.T) {
      if ((r.T.refused || null) !== (want.refused ?? null)) p.push(`the builder says refused=${r.T.refused} and the route expects ${want.refused ?? 'nothing'}`);
      if (r.line) {
        if (want.refused) { if (!r.notBuilt || !/infill/i.test(r.notBuilt[1])) p.push('the read-out does not say NOT BUILT for the infill while the builder refused'); }
        else {
          if (r.notBuilt) p.push('the read-out says NOT BUILT while the builder relieved the sheet');
          const o = r.T.organs && r.T.organs.petal;
          if (isBone) {
            if (!/^BONE:/.test(r.line[1])) p.push(`the TEXTURE line does not name BONE: "${r.line[1].slice(0, 80)}"`);
            if (!o || !o.bone || !new RegExp(`petal: ${o.bone.displaced} of ${o.bone.vertices} vertices raised`).test(r.line[1])) p.push(`the BONE line does not carry the petal's own raised count ${o && o.bone && o.bone.displaced} of ${o && o.bone && o.bone.vertices}`);
            if (!/pore floors on the sheet/.test(r.line[1]) || !/reads round from/.test(r.line[1])) p.push('the BONE line does not say the pore floors sit on the sheet and what reads round');
          } else {
          if (!o || !new RegExp(`\\b${o.skinTris}\\b`).test(r.line[1])) p.push(`the TEXTURE line does not carry the petal lattice's own skin count ${o && o.skinTris}: "${r.line[1].slice(0, 120)}"`);
          if (!/x its floor/.test(r.line[1])) p.push('the TEXTURE line does not state the lattice against its floor');
          }
          if (!new RegExp(`${r.T.heightMm}`).test(r.line[1])) p.push(`the TEXTURE line does not carry the height ${r.T.heightMm}`);
        }
      }
      if (!want.refused && !/\bmm\b/.test(r.h.said)) p.push(`the height control's read-out is not in millimetres: "${r.h.said}"`);
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: ${r.T ? (r.T.refused ? `refused ${r.T.refused}` : `${r.T.type} H ${r.T.heightMm}`) : 'no record'}`);
  };
  const { browser: b1, page: p1 } = await launchPage();
  await openBloom(p1, port);
  if (NEGATIVE_CONTROL) {
    await p1.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {} }); });
  }
  await run(p1, 'the shipping default — no line, the sliders hidden, nothing greyed', [], { infGreyed: false, texGreyed: false });
  await run(p1, 'PEBBLE on — the line with the lattice count and the bar, the sliders shown, the INFILL greyed and told', [{ id: 'petalTexture', value: 'PEBBLE' }], { infGreyed: true, texGreyed: false });
  await run(p1, 'CELLULAR at the height ceiling', [{ id: 'petalTexture', value: 'CELLULAR' }, { id: 'textureHeight', value: '1.5' }], { infGreyed: true, texGreyed: false });
  await run(p1, 'BONE on — its line, its five sliders shown and the feature size hidden, the INFILL greyed', [{ id: 'petalTexture', value: 'BONE' }, { id: 'textureHeight', value: '0.4' }], { infGreyed: true, texGreyed: false });
  await run(p1, 'BONE at the height ceiling and full coverage', [{ id: 'petalTexture', value: 'BONE' }, { id: 'textureHeight', value: '1.5' }, { id: 'bonePatchCoverage', value: '1' }], { infGreyed: true, texGreyed: false });
  await run(p1, 'BOTH ON — refused with the word infill, NOT BUILT told, NEITHER control greyed (each stays reachable)', [{ id: 'petalInfill', value: 'VORONOI' }], { refused: 'infill', infGreyed: false, texGreyed: false });
  await run(p1, 'the infill alone — the TEXTURE choice greyed and told, no line', [{ id: 'petalTexture', value: 'NONE' }], { infGreyed: false, texGreyed: true });
  await run(p1, 'the guard OFF with both sliders at their maxima — no line, the sliders hidden (hidden AND inert)', [{ id: 'petalInfill', value: 'NONE' }, { id: 'textureHeight', value: '1.5' }, { id: 'textureSize', value: '12' }], { infGreyed: false, texGreyed: false });
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the greying is never applied', from: "    wrappers[c.id].classList.toggle('bl-ctrl--disabled', !on);\n    inputs[c.id].disabled = !on;\n", to: "    wrappers[c.id].classList.toggle('bl-ctrl--disabled', false);\n    inputs[c.id].disabled = false;\n" },
      { name: 'the texture line is never printed', from: "       + textureLine(built ? built.texture : null)\n", to: "       + ''\n" },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name}) PEBBLE on`, [{ id: 'petalTexture', value: 'PEBBLE' }], { infGreyed: true, texGreyed: false });
      await b2.close();
    }
  }
}

/* ---------------- (ap) THE UMBEL'S HEAD TOGGLE ON THE PANEL (the umbel session) -----
   See the header. Visibility is read off the wrappers the page hid (never the
   predicates this file could evaluate itself), and the label off the summary
   element the page wrote. */
{
  const tag = '[umbel head]';
  const snap = (pg) => pg.evaluate(() => {
    const vis = (id) => { const el = document.getElementById(id); const w = el && el.closest('.bl-ctrl'); return !!(w && !w.hidden); };
    const sum = document.querySelector('#sec-petal > summary');
    return { label: sum ? sum.textContent : null, petalCount: vis('petalCount'), scopeLayers: vis('scopeLayers'), floretNodes: vis('floretNodes'),
      umbelFlorets: vis('umbelFlorets'), umbelHead: vis('umbelHead'), headAbsent: window.__bloomMetrics().headAbsent, infloText: (document.getElementById('inflorescence').closest('.bl-ctrl') || document.body).textContent };
  });
  const run = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    const r = await snap(pg);
    if (!r.floretNodes || r.umbelFlorets || r.umbelHead) p.push(`under a RACEME the nodes are ${r.floretNodes ? 'shown' : 'HIDDEN'} and the umbel's count / head are ${r.umbelFlorets || r.umbelHead ? 'SHOWN' : 'hidden'}`);
    if (r.label !== 'Petal' || !r.petalCount) p.push(`under a RACEME the Petal section reads "${r.label}" and the head's petal count is ${r.petalCount ? 'shown' : 'HIDDEN'}`);
    bad = await applyConfig(pg, [{ id: 'inflorescence', value: 'UMBEL' }]);
    if (bad.length) { note(`${tag} ${label}: the umbel did not take: ${bad.join('; ')}`); return; }
    const off = await snap(pg);
    if (off.headAbsent !== true) p.push('an UMBEL at its default head (OFF) built a head');
    if (!off.umbelFlorets || !off.umbelHead || off.floretNodes) p.push(`under an UMBEL the count is ${off.umbelFlorets ? 'shown' : 'HIDDEN'}, the head toggle ${off.umbelHead ? 'shown' : 'HIDDEN'}, the raceme's nodes ${off.floretNodes ? 'SHOWN' : 'hidden'}`);
    if (off.petalCount || off.scopeLayers) p.push(`with the head OFF the head-only controls show (petal count ${off.petalCount}, per-layer values ${off.scopeLayers}) — a hidden head's controls must hide`);
    if (!/FLORETS/.test(off.label || '')) p.push(`with the head OFF the Petal section reads "${off.label}" — it must say its controls shape the florets`);
    if (!/NO head/.test(off.infloText)) p.push('with the head OFF the inflorescence read-out does not say there is no head');
    bad = await applyConfig(pg, [{ id: 'umbelHead', value: 'ON' }]);
    const on = await snap(pg);
    if (bad.length || on.headAbsent !== false) p.push(`the head ON did not build a head (${bad.join('; ')})`);
    if (!on.petalCount || !on.scopeLayers || on.label !== 'Petal') p.push(`with the head ON the petal count is ${on.petalCount ? 'shown' : 'HIDDEN'}, per-layer values ${on.scopeLayers ? 'shown' : 'HIDDEN'}, the label "${on.label}"`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a RACEME shows its nodes and hides the umbel's two; an UMBEL with the head OFF hides the raceme's nodes and the head-only controls and its Petal section reads "${off.label}"; the head ON brings them back under "Petal"`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'umbel head toggle');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const regSrc = fs.readFileSync(new URL('../bloom-registry.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the label is never derived', from: "    ? 'Petal — the head is off: these shape the umbel\\'s FLORETS' : 'Petal'), open: false },", to: "    ? 'Petal' : 'Petal'), open: false }," },
      { name: 'the head petal count shows with the head off', from: "    visibleWhen: { all: [{ not: { id: 'placement', oneOf: ['FAN'] } }, { ref: 'headPresent' }] } },", to: "    visibleWhen: { not: { id: 'placement', oneOf: ['FAN'] } } }," },
    ];
    for (const m of MUTANTS) if (regSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom-registry.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (regSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom-registry.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: regSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

/* ---------------- (aq) THE MOPHEAD'S DEPTH ON THE PANEL (the mophead session) -----
   See the header. Visibility off the wrappers the page hid, the words off the
   read-outs the page wrote, the numbers against `__bloomMetrics()`. */
{
  const tag = '[mophead]';
  const snap = (pg) => pg.evaluate(() => {
    const vis = (id) => { const el = document.getElementById(id); const w = el && el.closest('.bl-ctrl'); return !!(w && !w.hidden); };
    const txt = (id) => { const el = document.getElementById(id); const w = el && el.closest('.bl-ctrl'); return w ? w.textContent : ''; };
    const m = window.__bloomMetrics();
    const cl = m.inflorescence && m.inflorescence.budgetClamp;
    return { depth: vis('umbelDepth'), rays: vis('umbelRays'), rayLength: vis('umbelRayLength'), rayAngle: vis('umbelRayAngle'),
      depthText: txt('umbelDepth'), countText: txt('umbelFlorets'), compound: m.umbelCompound,
      clamp: cl ? { asked: cl.askedFlorets, built: cl.builtFlorets, clamped: cl.clamped } : null };
  });
  const run = async (pg, label, { corner = true } = {}) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    let r = await snap(pg);
    if (r.depth || r.rays) p.push(`under a RACEME the depth is ${r.depth ? 'SHOWN' : 'hidden'} and the rays ${r.rays ? 'SHOWN' : 'hidden'}`);
    bad = await applyConfig(pg, [{ id: 'inflorescence', value: 'UMBEL' }]);
    r = await snap(pg);
    if (bad.length || !r.depth || r.rays || r.rayLength || r.rayAngle) p.push(`under an UMBEL at depth 1 the depth is ${r.depth ? 'shown' : 'HIDDEN'} and the ray controls are ${r.rays || r.rayLength || r.rayAngle ? 'SHOWN' : 'hidden'} (${bad.join('; ')})`);
    bad = await applyConfig(pg, [{ id: 'umbelDepth', value: '2' }, { id: 'umbelRays', value: '2' }, { id: 'umbelFlorets', value: '3' }]);
    r = await snap(pg);
    if (bad.length || r.compound !== true) p.push(`depth 2 did not build a compound umbel (${bad.join('; ')})`);
    if (!r.rays || !r.rayLength || !r.rayAngle) p.push(`at depth 2 the ray controls are not all shown (rays ${r.rays}, length ${r.rayLength}, angle ${r.rayAngle})`);
    if (!/REDUCED lattice/.test(r.depthText) || !/FLORET FLOOR/.test(r.depthText)) p.push(`at depth 2 the depth's read-out does not name the REDUCED lattice and the FLORET FLOOR: "${r.depthText.slice(0, 160)}"`);
    if (!r.clamp || !new RegExp(`\\b${r.clamp.built} florets in all`).test(r.countText)) p.push(`at depth 2 the count's read-out does not say the ${r.clamp ? r.clamp.built : '?'} florets built: "${r.countText.slice(0, 200)}"`);
    if (corner) {
      bad = await applyConfig(pg, [{ id: 'umbelRays', value: '12' }, { id: 'umbelFlorets', value: '12' }, { id: 'floretPetals', value: '12' }, { id: 'floretScale', value: '0.6' }, { id: 'pedicelLength', value: '12' }, { id: 'pedicelAngle', value: '20' }]);
      r = await snap(pg);
      if (bad.length || !r.clamp || !r.clamp.clamped) p.push(`the clamp corner did not clamp (${bad.join('; ')}; record ${JSON.stringify(r.clamp)})`);
      else {
        const want = new RegExp(`CLAMPED to \\d+ a ray: ${r.clamp.asked} florets asked, ${r.clamp.built} built`);
        if (!want.test(r.countText)) p.push(`at the clamp corner the count's read-out does not say ${r.clamp.asked} asked and ${r.clamp.built} built: "${r.countText.slice(0, 220)}"`);
      }
    }
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a RACEME hides the depth; an UMBEL at depth 1 hides the rays; depth 2 shows them and names the REDUCED lattice and the FLORET FLOOR and the florets built${corner ? `; the clamp corner says CLAMPED with ${r.clamp.asked} asked and ${r.clamp.built} built` : ''}`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'mophead depth');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const regSrc = fs.readFileSync(new URL('../bloom-registry.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the rays are shown at depth 1', from: "      return `${base} · each ${(2 * p.pedicelR).toFixed(2)} mm across (the area rule off the ${(2 * p.outerR).toFixed(2)} mm stem${p.pedicelRClamped ? ', FLOORED' : ''}), converging in a knot ${(2 * p.knot.radiusMm).toFixed(2)} mm across`;\n    },\n    tier: 'standard', role: 'inflorescence', visibleWhen: { ref: 'umbelCompound' } },", to: "      return `${base} · each ${(2 * p.pedicelR).toFixed(2)} mm across (the area rule off the ${(2 * p.outerR).toFixed(2)} mm stem${p.pedicelRClamped ? ', FLOORED' : ''}), converging in a knot ${(2 * p.knot.radiusMm).toFixed(2)} mm across`;\n    },\n    tier: 'standard', role: 'inflorescence', visibleWhen: { ref: 'umbelPresent' } },", corner: false },
      { name: 'the clamp is never told', from: '          + (cl && cl.clamped ? ` — CLAMPED to ${k} a ray:', to: '          + (false ? ` — CLAMPED to ${k} a ray:', corner: true },
    ];
    for (const m of MUTANTS) if (regSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom-registry.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (regSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom-registry.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: regSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`, { corner: m.corner });
      await b2.close();
    }
  }
}

/* ---------------- (aq) DEPTH 2'S DEFAULTS ON THE HAND SWITCH (Oct 25) -----
   Eva's ruling: the floor-floret mophead is depth 2's default. The overlay is
   the registry's `UMBEL_DEPTH2_DEFAULTS`; the RULED values are restated here
   and compared against it first (a moved table is a ruling, not a refactor),
   so the expected values have an owner the page does not write. Clauses: a
   LOAD to depth 2 (applyConfig — no isTrusted event) writes nothing; a HAND
   switch (the keyboard on the select) writes every overlay value still at its
   registry default, KEEPS the one this route set first (Florets 3) and tells
   both on the depth's read-out; the hand switch back restores every registry
   default and keeps the 3. */
{
  const tag = '[depth defaults]';
  const RULED_D2 = { umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2.0, petalCup: 0.2, petalTilt: 15 };
  if (JSON.stringify(Object.entries(UMBEL_DEPTH2_DEFAULTS).sort()) !== JSON.stringify(Object.entries(RULED_D2).sort())) note(`${tag} the registry's UMBEL_DEPTH2_DEFAULTS ${JSON.stringify(UMBEL_DEPTH2_DEFAULTS)} is not Eva's ruled overlay ${JSON.stringify(RULED_D2)}`);
  const settle = async (pg) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await settleBuild(pg, 300000); };
  const ids = Object.keys(RULED_D2);
  const read = (pg) => pg.evaluate((list) => {
    const o = Object.fromEntries(list.map((i) => [i, Number(document.getElementById(i).value)]));
    const el = document.getElementById('umbelDepth'), w = el.closest('.bl-ctrl'), v = w && w.querySelector('.bl-val');
    return { vals: o, depth: el.value, text: v ? v.textContent : '' };
  }, ids);
  const pick = async (pg, key) => { await pg.evaluate(() => { for (let d = document.getElementById('umbelDepth').closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }); await pg.focus('#umbelDepth'); await pg.keyboard.press(key); await settle(pg); };
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const run = async (pg, label) => {
    const p = [];
    let bad = await applyConfig(pg, [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'UMBEL' }, { id: 'umbelFlorets', value: '3' }]);
    if (bad.length) { note(`${tag} ${label}: config did not take: ${bad.join('; ')}`); return; }
    bad = await applyConfig(pg, [{ id: 'umbelDepth', value: '2' }], null, { settleMs: 300000 });
    let r = await read(pg);
    const loadWrote = ids.filter((i) => i !== 'umbelFlorets' && !near(r.vals[i], Number(DEFAULTS[i])));
    if (bad.length || r.depth !== '2' || loadWrote.length) p.push(`a LOAD to depth 2 wrote the overlay (moved ${loadWrote.join(', ') || 'nothing'}; ${bad.join('; ')}) — only a hand switch may`);
    bad = await applyConfig(pg, [{ id: 'umbelDepth', value: '1' }]);
    await pick(pg, '2');
    r = await read(pg);
    if (r.depth !== '2') p.push(`the keyboard switch did not reach depth 2 (the select reads ${r.depth})`);
    else {
      const missed = ids.filter((i) => i !== 'umbelFlorets' && !near(r.vals[i], RULED_D2[i]));
      if (missed.length) p.push(`the hand switch to depth 2 left ${missed.map((i) => `${i} ${r.vals[i]} (ruled ${RULED_D2[i]})`).join(', ')} — depth 2's defaults were not written`);
      if (!near(r.vals.umbelFlorets, 3)) p.push(`the hand switch OVERWROTE the Florets this route set (3 -> ${r.vals.umbelFlorets}) — a control the visitor set is kept`);
      if (!/DEPTH 2'S DEFAULTS written on the switch/.test(r.text) || !/KEPT as you set them: Florets 3\b/.test(r.text)) p.push(`the depth's read-out does not tell what was written and what was kept: ${JSON.stringify(r.text.slice(0, 260))}`);
    }
    await pick(pg, '1');
    r = await read(pg);
    const notBack = ids.filter((i) => i !== 'umbelFlorets' && !near(r.vals[i], Number(DEFAULTS[i])));
    if (r.depth !== '1' || notBack.length || !near(r.vals.umbelFlorets, 3)) p.push(`the hand switch back to depth 1 did not restore the registry defaults (${notBack.map((i) => `${i} ${r.vals[i]}`).join(', ') || 'restored'}; Florets ${r.vals.umbelFlorets}, depth ${r.depth})`);
    if (!/back to depth 1: the registry defaults restored/.test(r.text)) p.push(`the read-out does not tell the restore: ${JSON.stringify(r.text.slice(0, 200))}`);
    if (p.length) note(`${tag} ${label}: ${p.join('; ')}`);
    else ok.push(`${tag} ${label}: a load to depth 2 writes nothing; a hand switch writes depth 2's ruled defaults, keeps the set Florets 3 and tells both; the switch back restores every registry default`);
  };
  const { browser: b1, page: pg1 } = await launchPage();
  await openBloom(pg1, port);
  await run(pg1, 'depth 2\'s defaults');
  await b1.close();
  if (NEGATIVE_CONTROL) {
    const appSrc = fs.readFileSync(new URL('../bloom.js', import.meta.url), 'utf8');
    const MUTANTS = [
      { name: 'the switch writes nothing', from: "window.addEventListener('change', onDepthSwitch, true);\n", to: '\n' },
      { name: 'a set control is overwritten', from: '    if (sameSlider(inputs[id].value, from)) { inputs[id].value = String(to);', to: '    if (true) { inputs[id].value = String(to);' },
      { name: 'a load writes the overlay', from: "  if (!e.isTrusted) { delete seedNotes.umbelDepth; return; }\n", to: '' },
    ];
    for (const m of MUTANTS) if (appSrc.split(m.from).length !== 2) note(`${tag} NEGATIVE CONTROL: the anchor of "${m.name}" does not match exactly once in bloom.js — the mutant cannot be applied`);
    for (const m of MUTANTS) {
      if (appSrc.split(m.from).length !== 2) continue;
      const { browser: b2, page: pg } = await launchPage();
      await pg.route('**/bloom.js', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body: appSrc.replace(m.from, m.to) }));
      await openBloom(pg, port);
      await run(pg, `MUTANT (${m.name})`);
      await b2.close();
    }
  }
}

await browser.close();
server.close();

/* ---------------- report ---------------- */
console.log('panel gate: every registry control must render exactly once and stay reachable when its section is collapsed.\n');
for (const line of ok) console.log(`  ok   ${line}`);

if (NEGATIVE_CONTROL) {
  if (fail.length) {
    console.log(`\nNEGATIVE CONTROL: PASS — the gate caught ${fail.length} deliberate break(s):`);
    for (const f of fail) console.log(`  - ${f}`);
    /* Both routes must have fired. A negative control that only proves the
       census works would leave the reactivity assertion unverified, which is
       the half that is easy to write as a no-op. */
    const sawCensus = fail.some((f) => /renders 0 times/.test(f));
    const sawPath = fail.some((f) => /did not change|did not move|state snapshot says/.test(f));
    const sawAccordion = fail.some((f) => /^accordion A[23]:/.test(f));
    const sawVisibility = fail.some((f) => /^\[visibility\]/.test(f));
    const sawPreview = fail.some((f) => /^\[preview\]: .*did not rebuild/.test(f));
    const sawInner = fail.some((f) => /^\[inner rings\] .*line is ABSENT while the owner reports a ring under the floor/.test(f));
    const sawDome = fail.some((f) => /^\[dome\] .*HEAD RISE line is ABSENT while the owner declares a dome/.test(f));
    const sawCurl = fail.some((f) => /^\[curl\] .*SPINE CURL line is ABSENT while the owner reports a curl/.test(f));
    const sawSphere = fail.some((f) => /^\[sphere\] .*HEAD: FULL SPHERE line is ABSENT while the geometry builds a sphere/.test(f));
    const sawRetired = fail.some((f) => /^\[retired\]: retired id\(s\) still render in the panel: centerStyle; the Center container holds control\(s\) of its own: centerStyle/.test(f) && /names a centre/.test(f));
    const sawStamens = fail.some((f) => /^\[stamens\] .*STAMENS line is ABSENT while the owner declares an androecium/.test(f));
    const sawStyle = fail.some((f) => /^\[style\] .*STYLE line is ABSENT while the owner declares a gynoecium/.test(f));
    /* SESSION 23's five clauses (route (q) in the header), each required to
       have seen its own frozen witness: the container that never hides, the
       two spans that never change, the cap mark that never lands, the flag
       the frozen read-out cannot show. */
    const sawContainer = fail.some((f) => /^\[(stamens|style)\] .*Center container is shown while both parts are hidden/.test(f));
    const sawKeptStamens = fail.some((f) => /^\[stamens\] .*kept clause (is shown|names)/.test(f));
    const sawKeptStyle = fail.some((f) => /^\[style\] .*kept clause (is shown|names)/.test(f));
    const sawCap = fail.some((f) => /^\[stamens\] .*cap mark is absent/.test(f));
    const sawTextureGrey = fail.some((f) => /^\[texture\] MUTANT \(the greying is never applied\).*infill choice is enabled/.test(f));
    const sawTextureLine = fail.some((f) => /^\[texture\] MUTANT \(the texture line is never printed\).*TEXTURE line is absent while the builder reports a record/.test(f));
    const sawFlag = fail.some((f) => /^\[flag\]: .*FILAMENT AGAINST STYLE flag is absent while the owner reports a crossing/.test(f));
    /* ROUTE (w), THE STEM CHANNEL. It is REQUIRED here and not merely allowed:
       route (w)'s own biconditionals catch a line stuck on or off, but nothing
       makes them run, and a route that fired NOTHING under the frozen read-out
       would leave this summary printing a pass while the channel's two lines
       were never looked at. Both are named, because they are two different
       read-out lines with two different owners and a fix for one is no
       evidence about the other. */
    const sawChannel = fail.some((f) => /^\[stem channel\] .*STEM CHANNEL line is ABSENT while the geometry has a channel/.test(f));
    const sawPacking = fail.some((f) => /^\[stem channel\] .*MERIDIAN PACKING line is absent on a sphere with a stem/.test(f));
    /* ROUTE (x), THE BORE'S TWO CLOSURES, required for route (w)'s own reason
       one session later: the route's clauses are biconditionals, and nothing
       makes them RUN. Two flags, not one — the tip plug's clause and the
       crossover's are two sentences with two owners, and a frozen read-out that
       still happened to satisfy one would otherwise print a pass. */
    const sawPlug = fail.some((f) => /^\[stem closures\] .*tip-plug clause is (shown|absent)/.test(f));
    const sawThrough = fail.some((f) => /^\[stem closures\] .*SOLID THROUGHOUT clause is (shown|absent)/.test(f));
    /* ROUTE (y), THE SIZE FIELD'S TWO LINES, required for the same reason
       one more session on: two flags for two lines with two owners — the
       field's line stuck absent, and the told flag's numbers stuck at the
       default's while the builder's moved. */
    const sawVariance = fail.some((f) => /^\[variance\] .*SIZE VARIANCE line is (shown|absent)/.test(f));
    /* ROUTE (z), THE INFILL'S ACHIEVED COUNT, required for the same reason
       again: the count is told in TWO places with two owners, and the refusals
       are words rather than numbers, so a line stuck on or off is exactly what
       its own biconditionals cannot report if the route never runs. */
    const sawInfill = fail.some((f) => /^\[infill\] .*INFILL line is (shown|absent)/.test(f));
    const sawNeighbour = fail.some((f) => /^\[variance\] .*NEIGHBOURS line says/.test(f));
    /* ROUTE (u), THE INFILL'S FOUR LEVERS: the second line read against the
       BUILDER, so a frozen panel shows the default's four values under a
       builder reporting twelve passes. */
    /* Under the freeze the read-out holds the DEFAULT's text, which has no
       INFILL line at all, so the frozen witness is the line's ABSENCE while
       the builder built a field — and a line that thawed enough to be there
       but stuck on the default's values is the "says relaxation" arm. */
    const sawLevers = fail.some((f) => /^\[infill levers\] .*INFILL levers line (is absent while the builder built a field|says relaxation)/.test(f));
    /* ROUTE (aa), THE ROUNDNESS CONTROL'S TELLING, required for route (w)'s own reason. */
    const sawRound = fail.some((f) => /^\[roundness\] .*the control does not carry the builder's median roundness/.test(f));
    /* ROUTE (ab), THE CUP READ-OUT UNDER COMPOUND, required for route (w)'s own reason. */
    const sawLeafCup = fail.some((f) => /^\[leaf cup\] .*COMPOUND read-out does not quote the/.test(f));
    /* ROUTE (ac), THE ROUNDNESS'S DEAD TRAVEL, BOTH DIRECTIONS — each mutant by its own sentence */
    const sawHatchLive = fail.some((f) => /^\[roundness dead travel\] MUTANT \(the cap halved\).*a hatch over live travel/.test(f));
    const sawDeadUnhatched = fail.some((f) => /^\[roundness dead travel\] MUTANT \(the cap removed\).*dead travel left unhatched/.test(f));
    /* ROUTE (ad), THE DESIGN FILE: the table row removed must read as a save missing petalCount */
    const sawDesign = fail.some((f) => /^\[design file\] MUTANT \(a table row removed\).*missing petalCount/.test(f));
    const sawScopeStamp = fail.some((f) => /^\[scope selection\] MUTANT \(a pick stamps the panel onto the picked scope\).*a pick WROTE to the record/.test(f));
    const sawScopeEvery = fail.some((f) => /^\[scope selection\] MUTANT \(an edit lands on every scope\).*outside the picked layer/.test(f));
    const sawScopeDeselect = fail.some((f) => /^\[scope selection\] MUTANT \(deselect drops the offsets\).*deselecting changed the record/.test(f));
    const sawScopePair = fail.some((f) => /^\[scope selection\] MUTANT \(a mirror pair is split\).*mirror partner\) did not move with the pair/.test(f));
    /* the review's findings — one flag per restored defect, each on the clause written for it */
    const sawScopeLabels = fail.some((f) => /^\[scope selection\] MUTANT \(whole-bloom read-outs read the picked scope\).*whole-bloom (footDelicacy|sepalScale) read-out changed/.test(f));
    const sawScopeExact = fail.some((f) => /^\[scope selection\] MUTANT \(the offset is the twelve-digit cut alone\).*built at tip shape/.test(f));
    const sawScopeLoad = fail.some((f) => /^\[scope selection\] MUTANT \(a load does not end the pick\).*a load left a scope bound/.test(f));
    /* under this mutant the pick DOES end — Reset writes the toggle back to its
       default OFF and the bar drops the pick — but only after the controls'
       events have landed as offsets on it, so what fires is the stray offset */
    const sawScopeReset = fail.some((f) => /^\[scope selection\] MUTANT \(a reset does not end the pick\).*(Reset left a scope bound|after Reset the record is|after Reset under a picked layer the length reads)/.test(f));
    const sawScopeTold = fail.some((f) => /^\[scope selection\] MUTANT \(a pre-retirement file is migrated silently\).*is not told as (migrated|dropped)/.test(f));
    const sawScopeKeep = fail.some((f) => /^\[scope selection\] MUTANT \(a missing overrides list drops the page offsets\).*replaced the page's offsets/.test(f));
    const sawScopeFold = fail.some((f) => /^\[scope selection\] MUTANT \(a member index is re-keyed\).*folded onto another pair/.test(f));
    /* ROUTE (af), THE CURVE EDITOR — one flag per mutant, each on the sentence written for it */
    const sawCurveValidator = fail.some((f) => /^\[curve editor\] MUTANT \(the validator is ignored\).*the validator was never asked/.test(f));
    const sawCurveClamp = fail.some((f) => /^\[curve editor\] MUTANT \(a refused drag clamps\).*the drag was clamped, not refused/.test(f));
    const sawCurveMirror = fail.some((f) => /^\[curve editor\] MUTANT \(the mirror keeps the right side\).*kept the RIGHT side/.test(f));
    const sawCurveWindow = fail.some((f) => /^\[curve editor\] MUTANT \(the double press is a wall-clock window\).*rather than the browser's click count/.test(f));
    const sawCurveUnits = fail.some((f) => /^\[curve editor\] MUTANT \(points are stored in absolute units\).*not written in fractions of it/.test(f));
    const sawCurveFile = fail.some((f) => /^\[curve editor\] MUTANT \(the design file drops the curve\).*the design file did not carry the curve/.test(f));
    /* ROUTE (ag), PER-LAYER VALUES ON A SPIRAL AND THE FOOT FOLLOWING — one flag per mutant */
    const sawSpiralRadialOnly = fail.some((f) => /^\[spiral layers\] MUTANT \(per-layer values stay RADIAL only\).*hidden under a layered SPIRAL/.test(f));
    const sawSpiralFoot = fail.some((f) => /^\[spiral layers\] MUTANT \(the foot keeps the ramp\).*the foot did not follow its own width/.test(f));
    const sawSpiralRing = fail.some((f) => /^\[spiral layers\] MUTANT \(the ring keeps the ramp\).*the ring did not follow its own width/.test(f));
    const sawSpiralHold = fail.some((f) => /^\[spiral layers\] MUTANT \(the ring is held at the rim again\).*the hub did not grow to the widest owned ring/.test(f));
    /* ROUTE (ah), THE OUTLINE UNDER SCOPING — one flag per mutant */
    const sawOutlinePick = fail.some((f) => /^\[outline scopes\] MUTANT \(a pick applies the scope outline\).*a pick WROTE an outline/.test(f));
    const sawOutlineReset = fail.some((f) => /^\[outline scopes\] MUTANT \(the reset leaves the owned curve\).*the reset left layer 2 owning/.test(f));
    const sawOutlineFrozen = fail.some((f) => /^\[outline scopes\] MUTANT \(an inherited curve is frozen at copy time\).*(NO curve|not live)/.test(f));
    /* ROUTE (ai), OUTLINE-GATED VISIBILITY FOLLOWS THE PICK — one flag per mutant */
    const sawVisMode = fail.some((f) => /^\[outline visibility\] MUTANT \(visibility reads the whole bloom's outline mode\).*on a mode other than the picked scope's/.test(f));
    const sawVisPick = fail.some((f) => /^\[outline visibility\] MUTANT \(visibility ignores the pick\).*on a mode other than the picked scope's/.test(f));
    /* ROUTE (aj), THE SPINE UNDER SCOPING — one flag per mutant */
    const sawSpinePick = fail.some((f) => /^\[spine scopes\] MUTANT \(a pick applies the scope spine\).*a pick WROTE a spine/.test(f));
    const sawSpineReset = fail.some((f) => /^\[spine scopes\] MUTANT \(the spine reset leaves the owned spine curve\).*the spine reset left layer 2 owning/.test(f));
    const sawSpineFrozen = fail.some((f) => /^\[spine scopes\] MUTANT \(an inherited spine curve is frozen at copy time\).*(NO spine curve|not live)/.test(f));
    const sawSpineGroup = fail.some((f) => /^\[spine scopes\] MUTANT \(the spine reset drops the outline too\).*took layer 2's OUTLINE with it/.test(f));
    const sawSpineVis = fail.some((f) => /^\[spine scopes\] MUTANT \(curl visibility reads the whole bloom's curl mode\).*on a curl mode other than the picked layer's/.test(f));
    /* ROUTE (ak), THE FOLD LIMIT ON THE PAGE — one flag per mutant */
    const sawFoldCup = fail.some((f) => /^\[fold limit\] MUTANT \(the cup is never refused\).*cup edit to 0\.32 on the drawn S was accepted/.test(f));
    const sawFoldWords = fail.some((f) => /^\[fold limit\] MUTANT \(the read-out does not tell the fold limit\).*does not tell the fold limit/.test(f));
    /* ROUTE (al), CURVE SEEDED FROM THE SLIDER SHAPE — one flag per mutant */
    const sawSeedIgnored = fail.some((f) => /^\[seed\] MUTANT \(the seed is never written\).*was not seeded from the slider shape/.test(f));
    const sawSeedFollows = fail.some((f) => /^\[seed\] MUTANT \(the seed follows later slider moves\).*rewrote the seeded outline/.test(f));
    /* ROUTE (am), THE LEAF'S CURVES SEEDED — one flag per mutant */
    const sawLeafSeedIgnored = fail.some((f) => /^\[leaf seed\] MUTANT \(the leaf spine is never seeded\).*was not seeded from the arch/.test(f));
    const sawLeafSeedSign = fail.some((f) => /^\[leaf seed\] MUTANT \(the leaf seed fits the mirrored arch\).*the seed bends the other way/.test(f));
    /* ROUTE (an), THE BRAID'S STRANDS UNDER THE PICKER — one flag per mutant */
    const sawStrandList = fail.some((f) => /^\[strand picker\] MUTANT \(the picker lists no strands\).*the picker lists 0 strand/.test(f));
    const sawStrandBind = fail.some((f) => /^\[strand picker\] MUTANT \(every pick binds strand 1\).*picking strand 4 bound/.test(f));
    /* ROUTE (aq), THE MOPHEAD'S DEPTH — one flag per mutant */
    const sawMopheadRays = fail.some((f) => /^\[mophead\] MUTANT \(the rays are shown at depth 1\).*ray controls are SHOWN/.test(f));
    const sawMopheadClamp = fail.some((f) => /^\[mophead\] MUTANT \(the clamp is never told\).*does not say .* asked and .* built/.test(f));
    const sawDepthWrites = fail.some((f) => /^\[depth defaults\] MUTANT \(the switch writes nothing\).*depth 2's defaults were not written/.test(f));
    const sawDepthKeeps = fail.some((f) => /^\[depth defaults\] MUTANT \(a set control is overwritten\).*OVERWROTE the Florets/.test(f));
    const sawDepthLoad = fail.some((f) => /^\[depth defaults\] MUTANT \(a load writes the overlay\).*a LOAD to depth 2 wrote the overlay/.test(f));
    /* ROUTE (ap), THE UMBEL'S HEAD TOGGLE — one flag per mutant */
    const sawUmbelLabel = fail.some((f) => /^\[umbel head\] MUTANT \(the label is never derived\).*it must say its controls shape the florets/.test(f));
    const sawUmbelCount = fail.some((f) => /^\[umbel head\] MUTANT \(the head petal count shows with the head off\).*the head-only controls show/.test(f));
    if (sawMopheadRays && sawMopheadClamp && sawDepthWrites && sawDepthKeeps && sawDepthLoad && sawUmbelLabel && sawUmbelCount && sawStrandList && sawStrandBind && sawLeafSeedIgnored && sawLeafSeedSign && sawSeedIgnored && sawSeedFollows && sawFoldCup && sawFoldWords && sawSpinePick && sawSpineReset && sawSpineFrozen && sawSpineGroup && sawSpineVis && sawVisMode && sawVisPick && sawOutlinePick && sawOutlineReset && sawOutlineFrozen && sawCensus && sawPath && sawAccordion && sawVisibility && sawPreview && sawInner && sawDome && sawCurl && sawSphere && sawRetired && sawStamens && sawStyle && sawFlag && sawChannel && sawPacking && sawInfill
        && sawPlug && sawThrough && sawVariance && sawNeighbour && sawLevers && sawRound && sawLeafCup && sawHatchLive && sawDeadUnhatched && sawDesign
        && sawScopeStamp && sawScopeEvery && sawScopeDeselect && sawScopePair
        && sawScopeLabels && sawScopeExact && sawScopeLoad && sawScopeReset && sawScopeTold && sawScopeKeep && sawScopeFold
        && sawCurveValidator && sawCurveClamp && sawCurveMirror && sawCurveWindow && sawCurveUnits && sawCurveFile
        && sawSpiralRadialOnly && sawSpiralFoot && sawSpiralRing && sawSpiralHold
        && sawTextureGrey && sawTextureLine
        && sawContainer && sawKeptStamens && sawKeptStyle && sawCap) { console.log('\nALL THIRTY-FOUR ROUTES, AND SESSION 23\u2019S FOUR CLAUSES, OBSERVED THE FAILURE they exist to catch.'); process.exit(0); }
    console.error(`\nNEGATIVE CONTROL: INCOMPLETE — census route fired: ${sawCensus}, path route fired: ${sawPath}, accordion route fired: ${sawAccordion}, visibility route fired: ${sawVisibility}, print-preview route fired: ${sawPreview}, inner-ring route fired: ${sawInner}, dome route fired: ${sawDome}, curl route fired: ${sawCurl}, sphere route fired: ${sawSphere}, retirement route fired: ${sawRetired}, androecium route fired: ${sawStamens}, gynoecium route fired: ${sawStyle}, flag route fired: ${sawFlag}, stem-channel route fired: ${sawChannel}, meridian-packing clause fired: ${sawPacking}, tip-plug clause fired: ${sawPlug}, crossover clause fired: ${sawThrough}, size-variance line fired: ${sawVariance}, infill line fired: ${sawInfill}, neighbours line fired: ${sawNeighbour}, infill levers line fired: ${sawLevers}, roundness telling fired: ${sawRound}, leaf cup read-out fired: ${sawLeafCup}, roundness hatch over live travel fired: ${sawHatchLive}, roundness dead travel unhatched fired: ${sawDeadUnhatched}, design-file route fired: ${sawDesign}, scope selection — a pick stamps: ${sawScopeStamp}, an edit on every scope: ${sawScopeEvery}, deselect drops: ${sawScopeDeselect}, a pair split: ${sawScopePair}, whole-bloom read-outs: ${sawScopeLabels}, the exact offset: ${sawScopeExact}, a load ends the pick: ${sawScopeLoad}, a reset ends the pick: ${sawScopeReset}, a pre-retirement file told: ${sawScopeTold}, missing overrides kept: ${sawScopeKeep}, a member index re-keyed: ${sawScopeFold}, curve editor — validator ignored: ${sawCurveValidator}, clamped: ${sawCurveClamp}, mirror keeps right: ${sawCurveMirror}, a wall-clock double press: ${sawCurveWindow}, absolute units: ${sawCurveUnits}, file drops the curve: ${sawCurveFile}, spiral layers — RADIAL only: ${sawSpiralRadialOnly}, foot keeps the ramp: ${sawSpiralFoot}, ring keeps the ramp: ${sawSpiralRing}, ring held at the rim again: ${sawSpiralHold}, outline scopes — a pick applies: ${sawOutlinePick}, the reset leaves the curve: ${sawOutlineReset}, inherited frozen: ${sawOutlineFrozen}, outline visibility — reads the global mode: ${sawVisMode}, ignores the pick: ${sawVisPick}, spine scopes — a pick applies: ${sawSpinePick}, the reset leaves the curve: ${sawSpineReset}, inherited frozen: ${sawSpineFrozen}, the reset drops the outline: ${sawSpineGroup}, curl visibility reads the global mode: ${sawSpineVis}, fold limit — the cup never refused: ${sawFoldCup}, the read-out silent: ${sawFoldWords}, seed — never written: ${sawSeedIgnored}, follows later sliders: ${sawSeedFollows}, leaf seed — never seeded: ${sawLeafSeedIgnored}, the mirrored arch: ${sawLeafSeedSign}, strand picker — no strands: ${sawStrandList}, every pick binds strand 1: ${sawStrandBind}, texture — greying never applied: ${sawTextureGrey}, line never printed: ${sawTextureLine}, umbel head — the label never derived: ${sawUmbelLabel}, the petal count shown: ${sawUmbelCount}, mophead — the rays at depth 1: ${sawMopheadRays}, the clamp untold: ${sawMopheadClamp}, depth 2's defaults — never written: ${sawDepthWrites}, a set control overwritten: ${sawDepthKeeps}, a load writes: ${sawDepthLoad}; session 23 clauses — container: ${sawContainer}, kept (stamens): ${sawKeptStamens}, kept (style): ${sawKeptStyle}, cap mark: ${sawCap}. All must.`);
    process.exit(1);
  }
  console.error('\nNEGATIVE CONTROL: FAILED — the gate passed a panel with a deleted control, a listener-less input, an unreachable accordion handler, a listener-less print-preview box, a frozen read-out, a frozen dome line, a frozen sphere line, a rig control inside the Center container, a frozen STAMENS line, a frozen STYLE line, a frozen container, two frozen read-out spans, a frozen cap mark, a frozen STEM CHANNEL line, a frozen MERIDIAN PACKING line, a frozen tip-plug clause, a frozen crossover clause, a frozen SIZE VARIANCE line, a frozen NEIGHBOURS line and a flag rewritten away. It is not measuring anything.');
  process.exit(1);
}

if (fail.length) {
  console.error(`\npanel gate: FAIL — ${fail.length} assertion(s):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\npanel gate: PASS — every control is declared once, rendered once, and reachable through the real UI from inside a collapsed section.');
