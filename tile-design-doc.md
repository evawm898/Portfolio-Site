# Tessellation Rollers — design document (`/tile`)

Hidden page (`tile.html`, `tile.css`, `tile.js`, `tile-geometry.js`, `tile-roller.js`,
`tile-sim.js`; `noindex`, unlinked). A parametric tessellation designer whose output is a
**pair of 3D-printable cookie-cutter rollers plus one removable handle design**: roll A
across a sheet of dough, roll B across it in the crossing direction, and the two families of
cut lines divide the sheet into identical interlocking cookies with no waste except the
sheet's border.

This document is the reference for every file above. §3 and §4 are the parts that decide
the physical object; read them before touching `tile-roller.js`.

---

## 0. Status

Phase 1 (this document's subject): the geometry, the manual editor, the 3×3 preview, the
print parameters, the guardrails, STL and SVG export, and the gates. Phase 2 (§10) is
**design only** — image → tile.

Locked decisions (from the brief, not re-opened here): two rollers, each a full cylinder
carrying ONE family of curvy blade lines; a lattice of translated copies of one four-cornered
tile with two shared edge curves (edge A top and bottom, edge B left and right); the crossing
angle between the two roll directions a parameter (default 90°); each circumference an
integer number of pattern repeats, the diameter derived and never set; overhangs and hooks
allowed, the only shape rule being a simple tile outline; registration by index marks (pegs
on A punch a dimple track in the border waste, a toothed collar at one end of B rides it),
never a frame or jig; removable handles, one design for both rollers.

**Eva's ruling on the first version (held as PR #354): each blade is a closed wavy RING
running AROUND the circumference — a jagged pizza-wheel edge wrapped round the pin — and
each roller rolls along the direction of its own lines.** The first version laid the lines
lengthwise as crossbars and rolled each roller along the OTHER family's chord; §3 to §7, §9,
§11 and §12 are rederived for rings, and §3.1 says what the change costs.

---

## 1. The tiling

### 1.1 Four corners are a parallelogram — forced, not chosen

The tile's boundary runs C0 → C1 along **edge A** (the bottom), C1 → C2 along **edge B**
(the right), C2 → C3 along edge A again (the top, traversed backwards) and C3 → C0 along
edge B again (the left, backwards). The top is the bottom translated by some vector `v`, so
`C3 = C0 + v`, `C2 = C1 + v`; the left is the right translated by some `w`, so `C0 = C1 + w`,
`C3 = C2 + w`. Hence `C1 − C0 = C2 − C3` and `C3 − C0 = C2 − C1`: **the corners always form a
parallelogram**, with sides

    tA = C1 − C0   (edge A's chord, length = pitch A)
    tB = C3 − C0   (edge B's chord, length = pitch B)

and the tiling is the lattice `{ m·tA + k·tB }`. The **crossing angle θ** is the angle between
`tA` and `tB`. A free quadrilateral cannot tile by translation, so the editor never offers one.

### 1.2 One validity rule: the outline is simple

**If the closed outline is simple, its lattice translates tile the plane** — no gaps, no
overlaps — whatever the edges do, overhangs and hooks included. Two facts carry it:

* **The area is exact by identity.** By the shoelace integral, edge A's two traversals
  contribute `½(tA × tB)` together (everything but the translation term cancels) and edge B's
  two contribute the same, so the signed area of *any* such outline is `tA × tB`, the lattice
  cell's area — whatever shape the edges take. (The gate checks it to 1e-9.)
* **Degree.** The outline with opposite edges identified is a closed surface mapping onto the
  torus `ℝ²/lattice`; a simple outline makes that map degree one, i.e. a homeomorphism, i.e.
  a tiling. (Beauquier–Nivat: a polygon tiles by translation iff its boundary factors as
  `X·Y·X̂·Ŷ` or the hexagonal form; this is the square form.)

So the editor enforces exactly one rule — **the outline must stay simple** — and every edit
that would break it is **blocked**, never repaired (§2.4). Everything else about shape is a
*flag* (§7), not a refusal.

### 1.3 Corners are one point

All four corners are the same lattice point (`C1 = C0 + tA`, `C2 = C0 + tA + tB`,
`C3 = C0 + tB`). Four cookies meet at every corner. A corner's sharp/smooth setting is
therefore **one setting for the tile**, applied to both families of lines (§2.2).

---

## 2. The editor model

### 2.1 Lattice coordinates

Every edge point is stored in **lattice coordinates** `(u, v)`: the point is `C0 + u·tA + v·tB`.
Edge A's points have `u` running from 0 to 1 along the chord and `v` the offset off it; edge
B's the other way round. Consequences, all deliberate:

* **Edge A is stored once** and drawn twice (bottom, and top = bottom + `tB`); likewise edge B
  (left, and right = left + `tA`). An edit to either copy *is* an edit to the edge, so the shape
  always tessellates — there is no second copy to drift.
* **Pitch and angle changes are affine maps of the whole tile.** Resizing stretches the
  drawing with its box; changing θ shears it. An affine map preserves simplicity, so a pitch or
  angle change can never make the tile invalid. (The validator still runs after one, for the
  floating-point edge case, and blocks it if it ever fails.)

### 2.2 The curve law — reused from /bug

An edge is the chain *corner → interior control points → corner*. It is drawn with
**centripetal Catmull–Rom** (α = 0.5), `sampleOutline` imported from `bug-geometry.js` — the
same law /bug's wing editor uses, inherited there from the /dress curve editors. Centripetal
parameterisation has no cusps and no self-intersection within a segment.

**Sharp ↔ smooth**: each control point is smooth (the curve passes through it with a
continuous tangent) or sharp (a corner in the curve). A sharp point splits the chain into
independent runs; each run is sampled by `sampleOutline`, whose reflected phantom end points
make the run end tangent toward its own neighbour.

**The corner**: smooth by default. A smooth corner means each *line* (the chained copies of
an edge) passes through it with a continuous tangent: the run touching the corner is extended
by the **periodic neighbour** — the last interior point of the previous copy, `p_last − t` —
and the extra segment is trimmed after sampling. Centripetal CR's tangent at a point depends
only on that point and its two neighbours, so the copies on either side of the corner compute
the same tangent: the line is C1 there by construction. (The gate measures it the only way a
sampled curve allows: the turn between the last and first sampled segments at the corner falls
in proportion to the sampling — 6.83° at 20 samples a segment, 0.875° at 160, 7.8× for 8× — where
a sharp corner keeps its 52.9° at any sampling.)
A sharp corner uses reflected phantoms, so each line kinks there. The cookie itself always
has a corner at C0 (two different lines meet there); "smooth" is about each line.

### 2.3 Corners: drag to resize

The parallelogram has three shape degrees of freedom (`|tA|`, `|tB|`, θ). The four corner
handles **resize**: dragging a corner moves it under the pointer with the **opposite corner
fixed** and the edge directions kept, which sets both pitches. θ is owned by one control, the
**crossing angle** slider. (One owner per quantity: a corner drag that could also shear would
be a second owner of θ.) Pitches are clamped to 15–120 mm.

### 2.4 Edge points: add, move, delete, toggle — invalid edits are blocked

* **Click** on any copy of an edge → a point is added **on the curve**, at the click's nearest
  point (the click projected onto the drawn line, so adding a point does not move the line), into
  the control segment that point belongs to; it is selected and follows the pointer while the
  button is held.
* **Drag** any copy of a point → the point moves; the other copy follows.
* **Select + Delete/Backspace**, or **double-click** a point → it is removed. Corners cannot be
  deleted. (The double-click is detected on the second press, not by the browser's `dblclick`:
  every press redraws the editor, so the element a native double-click would name is gone.)
* **Sharp ↔ smooth** toggles the selected point (or, selected corner, the corner setting).

Every one of these goes through a function in `tile-geometry.js` (`movePoint`, `insertPoint`,
`deletePoint`, `togglePoint`, `resizeFromCorner`) that validates the outline that *would*
result and, if it would cross or touch itself, returns the tile **unchanged with the reason**.
The editor shows it ("Blocked: the outline would cross itself"). A slow drag toward a crossing
therefore stops at the last valid position — /bug's §5.3 rule, for the same reason: silently
reshaping what the hand is dragging is worse than refusing the step. Two control points closer
than 0.05 mm are also refused (the curve law divides by their distance).

---

## 3. The rollers

### 3.1 Which way each roller rolls — rings, by ruling

A roller stamps its **unrolled surface** onto the dough: rolling without slip, the surface
point at arc length `s` lands at `start + s·r̂` (`r̂` the roll direction) and its axial position
`z` lands at `z·â` (`â` the axis). Rolling direction does not change the stamp; only which way
round the roller is held does (flipping it end for end rotates the stamp 180°, §4.6). For a
roller to cut a family of lines, that family must be **periodic along the roll direction with a
period that divides the circumference**.

Each family is periodic under the whole lattice, so a roller could roll along either lattice
vector. The first version of this page rolled each roller along the OTHER family's chord, so
its lines ran lengthwise across it as crossbars. **Eva ruled that the wrong axis: each blade is a
closed wavy RING running around the circumference, and each roller rolls along the direction of
its own lines.**

| | **Rings** — roller A rolls along `tA` (ships) | Crossbars — roller A rolls along `tB` (retired) |
|---|---|---|
| period along the roll | `|tA|`, the roller's own pitch | `|tB|` |
| rolling support | continuous — every ring is a wheel at the tip radius | intermittent — it needed rims |
| cutting | progressive, pizza-wheel-like | a bar comes down, ravioli-roller-like |
| **printed upright** | **every ring is a fin standing straight out of the body: support under every ring** | every bar a near-vertical wall |

**What the ruling costs, said rather than hidden.** A roller is printed standing on its end, and
a ring blade is then a thin fin cantilevered `h` = 8 mm straight out of a vertical wall — a ~90°
overhang along its whole length. It prints with **support under every ring**; tree supports come
away most cleanly, and the rings are a pitch apart (40 mm on the default), so they can be reached.
(Printed on its side the rings would stand vertical, but the body's underside and the lower half
of every ring would overhang instead; on its end is still the better of the two.) The page's
how-to (its printing note) and the zip's README both say so. The old crossbar argument for
printability is recorded here as the price, not as a reason to go back.

So, with X a roller's own family and Y the other:

* **Roller A** carries the edge-A lines and **rolls along `tA`**; **roller B** carries the
  edge-B lines and **rolls along `tB`**. The angle between the two roll directions is θ.
* The **pattern period along the roll is the roller's own pitch**: an X-line repeats every
  `|tX|` along `tX`.
* **Circumference at the blade tip `C = n · |tX|`**, `n` = tiles round it (an integer); **tip
  radius `R_tip = C / 2π`**, derived, never set. The read-out prints both diameters.

### 3.2 The unrolled frame and the rings

For roller X: `r̂ = tX/|tX|` and **`â = ẑ × r̂`** — the roll direction turned 90° to the left,
for BOTH rollers, so `(r̂, â, ẑ)` is right-handed for both. A sheet vector `P` has unrolled
coordinates `s = P·r̂` (arc length at the tip radius) and `z = P·â` (along the axis). (The first
version signed `â` so that `tX·â > 0` and stamped a MIRRORED line; the simulator found it — §9.3 —
which is why it derives the spin from a rigid-body roll rather than from this convention.)

**Ring 0** is `n` copies of edge X, corner to corner: copy `c` is edge X moved by `c·(|tX|, 0)`.
Since `tX·â = 0`, a copy ends at the height it started, so the n-th copy ends at the first copy's
start moved by `(C, 0)` — the same point of the cylinder. **The ring closes on itself by
construction**, and because each copy meets the next at a corner through which the line is C1
(a smooth corner, §2.2), the ring is C1 all the way round, its seam included. The mesh never
emits a seam vertex: each offset loop is one period laid `n` times and wrapped back onto its own
first vertex (§3.4).

**Ring j** is line j of the family — the line moved by `j·tY` — so it is ring 0 moved by
`j·(tY·r̂, tY·â)`: turned `j·|tY| cos θ` round the roller and moved `j·(tY·â)` along it. **The
axial step is the perpendicular distance between neighbouring lines, `|tA × tB| / |tX| =
|tY| sin θ`** — 40 mm on the default square tile, `34 · sin 60° = 29.4 mm` for roller A on the
hook fixture (the gate measures it off the mesh, §9). On roller A the rings step toward +Z
(`tB·â_A = |tB| sin θ > 0`); on roller B toward −Z (`tA·â_B = −|tA| sin θ`).

On the cylinder a ring point `(s, z)` sits at roller angle **`φ = −s / R_tip`** and height
**`Z = z + Z0`**, with the roller's +Z end held toward +`â`: **on your left as it rolls
forward**, for either roller.

A ring need not be a graph over the angle: an edge that hooks back makes its ring double back
round the roller (the hook fixture does), which a radially stamped blade cuts and a dragged one
could not.

### 3.3 The sheet: cookies and rings

The sheet is **cols × rows** cookies — cols along edge A, rows along edge B. Roller A's rings
are the A-lines that bound the rows — **rows + 1 of them**, so A's LENGTH follows the rows;
roller B's rings are the B-lines that bound the columns — **cols + 1**, so B's length follows the
columns. How far a roller is rolled decides how long its lines are, and its length how many it
cuts. One pass of each cuts the cols × rows block; outside it the sheet is border waste, cut by
one family only. The cut field is the parallelogram `cols·tA × rows·tB`.

**The default is 4 × 3 = 12 cookies, 160 × 120 mm on the default tile** (Eva's ruling: at least
about 4 × 3 — the first version's page could show a strip of three). Each roller's body runs
3 mm past its outermost blade root, peg or collar.

### 3.4 The blade

A ring is a wall standing radially on the body, following the ring curve at every radius (the
same `(φ, Z)` curve from root to tip, so the cut line is exactly the tip curve). Cross-section
square to the curve: **`w_tip` at the edge** (the "blade wall thickness", the FDM floor),
widening by the **draft angle** toward the root: `w_root = w_tip + 2·(h + e)·tan(draft)`,
where `h` is the blade height and `e` = 0.4 mm the root's embedding into the body (so the two
closed shells overlap instead of touching). The draft is for release: the wall is thinnest
where it leaves the dough last.

The two side faces are true **offsets** of the ring curve — computed in each radius's own
unrolled metric (at the root, arc lengths shrink by `R_root/R_tip`, which changes angles, so the
root offset is not the tip offset scaled) — with round joins on the outside of a turn and the
self-intersection loops on the inside of a tight turn removed. A ring is PERIODIC, so its offset
is computed on one period and a loop may straddle the period's start: the raw offset of one
period is laid five times (each copy an exact translate, so indexable), cleaned in one pass, and
cut at a point of the middle period that survived and whose translate one period on survived too
— a safe cut no removed loop contains. That one period is laid `n` times round. The four offset
loops (left and right, tip and root) are zipped into four **closed** strips: **one closed tube per
ring, a torus, with no end caps and no seam vertex**.

**Blade height must exceed dough thickness + 1.5 mm** (so the body never touches the dough);
below that the STL is refused with the reason.

### 3.5 No rims — the rings are the rolling surface

The crossbar rollers needed **rims**: a bar roller is supported only by the bar that is down,
and between bars it would drop by about `R(1 − cos(π/n))`, enough to put the body into the dough.
A ring roller does not. **Every ring runs all the way round, so at every angle every ring has a
point at the bottom**: the roller rests on its blade tips at exactly `R_tip`, continuously, the
blades come down radially and never drag, and the stamp's period is exactly the circumference the
pattern was laid out on. The rims are dropped.

**And with them the rule "the dough must lie between the rims" is DROPPED — it is not needed.**
It existed only because a rim riding on dough lifts the roller by the dough's thickness and every
blade stops short of the board. A ring rides the board *through* the dough (its blade is taller
than the dough by at least 1.5 mm — the rule that stays, §3.4), so the outer rings may run over
dough or over bare board alike and the roller stays level at `R_tip` either way. Nothing bounds
the sheet now but the rollers' own lengths and how far they are rolled. The gate's R1 asserts
the rolling radius read off the mesh IS the blade-tip radius — nothing may stand proud of the
rings (a peg that did would lift every blade off the board; it has a mutant).

### 3.6 Body, bore, handle

The body is a solid of revolution: a tube of wall **`t_wall`** (the "cylinder wall") with 0.6 mm
chamfered ends, closed by end caps 8 mm thick, each with an **axle bore** (8 mm) through it; the
cavity is open to both bores, so it drains and dries. The cavity's ceiling is a 45° cone
(printable upright). Roller B adds the collar band (§4.4), roller A the groove (§4.6).

**The handle** (one design, print two): a 26 mm grip, a 45° taper to a shoulder that bears
against the roller's end face, and an axle pin `0.25 mm` under the bore radius and 3 mm longer
than the cap is thick. The roller turns on the two pins; pulling the handles off leaves bare
rollers to wash. Printed grip-down.

---

## 4. The index marks — derivation

### 4.1 What registration needs

After A, the sheet carries the edge-A lines on the lattice `{m·tA + k·tB}` (up to where A was
put down). B's lines land correctly iff B's lattice is the same lattice: B's stamp offset from
A's must be `0` mod the lattice. A rolling cylinder has exactly two free placements — its
**sideways position** (along its axis) and its **phase** (how far round it has turned at a given
point of travel). The marks must fix both, and do nothing else.

### 4.2 The collar decides the track's direction

B's toothed collar is a ring of teeth at one end of B, so as B rolls it travels along **B's roll
direction, `tB`**, at a fixed position along B's axis. For its teeth to *ride* a track, **the
track must run along `tB`** — along edge B's direction, i.e. along a B-line. It must lie outside
the cookie block (border waste), and it must be made of points B's teeth can sit in that are
lattice points of A's pattern: **the corners of one B-line outside the block, column `m*`**
(−1 normally) — the points `(m*, k) = m*·tA + k·tB`.

### 4.3 A lays the track: a slanted row of pegs, one on each ring

A rolls along `tA`, so to land a dimple on corner `(m*, k)` it needs a peg at that corner's place
on its own unrolled surface,

    s = m*·|tA| + k·|tB| cos θ        z = k·|tB| sin θ

— **one peg on each ring k, at that ring's corner of column `m*`**, `k = 0…rows`. They form a
**slanted row across A's surface**, rising `|tB| sin θ` along the axis and advancing
`|tB| cos θ` round it per ring — an axial row only at θ = 90° (Eva's hint, verified rather than
trusted: the gate's R2 finds exactly one dimple on every corner of the track to 1e-6 mm, and a
mutant that lays the row straight across A instead puts the hook fixture's row-1 dimple 17 mm off
its corner). Rolled, A lands peg k at `start + s·r̂ + z·â`, i.e. on `m*·tA + k·tB`: a straight line
of dimples along `tB`, each on a lattice corner by construction.

**Every peg stands ON its ring** — a ring passes through its own corners — so the peg's cone
stands round the blade, the two closed shells overlapping (the slicer unions them), as the
crossbar version's pegs stood on their bar. In the dough, A's line cuts through the middle of each
dimple; the dimple is in the border either way, and a tooth seats on both halves of its cone.

Each peg is a 45° cone (printable on a vertical wall) whose tip stands `δ` into the dough:
`δ = min(½·t_dough, ½·D − 0.8 mm)` — at most half the dough, so it dimples and never punches —
and the dimple is a cone of diameter `D` (the "peg/tooth size") at the dough surface. The tip is
a flat disk (radius `½·D − δ` ≥ 0.8 mm, blunt) and on a curved roller a flat disk reaches
FURTHER at its rim than at its centre (`√(ρ² + r²)` against `ρ`), so the disk is set where its
**rim** reaches `R_tip − t_dough + δ` — the 45° side's own equation with the limit at the top.
The dimple is then exactly `δ` deep (the gate measures it off the mesh: 2.2000 mm at the
defaults).

The cone's **foot** is sunk into the body so its base rim stays 0.4 mm inside the body surface —
solving `ρ² + (r_tip + top − ρ)² = (R_body − 0.4)²` for the larger root. On a small roller there
is no root (no 45° cone that tall fits inside a body that curved: its base rim, going round the
roller, always clears the surface — its least reach is `c/√2` at `ρ = c/2`); the foot then goes
to `ρ = c/2`. **Either way it stays 0.3 mm above the hollow** — the straight 30 mm tile at 5 round
would otherwise sink its feet 1.6 mm into the hollow (the gate's H4 row for it). The cone's sides
may then show a little at the foot ROUND the roller (vertical faces as printed, so no overhang),
never on its underside.

### 4.4 Where the collar sits, and why one tooth fixes both placements

In B's own unrolled frame (`s'` along `tB`, `z'` along B's axis), corner `(m, k)` is at

    s' = m·|tA| cos θ + k·|tB|        z' = −m·|tA| sin θ

relative to B's ring 0's first corner. So the collar is a ring of teeth at **`z' = −m*·|tA| sin θ`**
— the axial position of column `m*`, beyond B's ring 0 on B's +Z end (B's rings step toward −Z) —
carrying **one tooth per tile pitch round it**, `n_B` teeth, at **`s' = m*·|tA| cos θ + j·|tB|`**: an
evenly spaced ring of teeth at one height, phased by `m*·|tA| cos θ`. `m*` is the nearest column
(−1 normally) whose collar clears B's ring 0, root and wiggle included, by 1.5 mm.

**One seated tooth fixes both of B's free placements.** B's unrolled surface lands rigidly
(rolling without slip). Seat tooth `j` — B's surface point `(s'_j, z'_c)` — in the dimple of track
row `k₀`, the sheet point `D = m*·tA + k₀·tB`. Then every point `(s', z')` of B lands at

    D + (s' − s'_j)·r̂_B + (z' − z'_c)·â_B

— the tooth's two coordinates on the sheet fix the stamp's two free placements, the sideways one
along `â_B` and the phase along `r̂_B`. With `r̂_B = tB/|tB|` and `â_B = ẑ × r̂_B`,
`|tA|·(cos θ·r̂_B − sin θ·â_B) = tA` exactly, so B's corner `(m, k)` lands at

    D + (m − m*)·tA + (k − j)·tB  =  m·tA + (k₀ + k − j)·tB

— a lattice corner in column `m`. Every one of B's lines lands on its lattice column (the row
shift `k₀ − j` changes nothing: a B-line is the same line moved by `tB`), and every later tooth
`j'` comes down at `m*·tA + (k₀ + j' − j)·tB`, the next dimple, `|tB|` apart on both. **This is
checked by simulation, not argued** (§9): B posed solely by seating tooth 0 in the first dimple
puts all 20 corners of the default sheet on both families' lines (the worst 1.8e-14 mm); posed
instead by its LAST tooth in the LAST row's dimple, or a middle tooth in row 1's, it stamps the
same lines through the same corners.

Teeth are the pegs' cones 0.3 mm smaller and 0.3 mm shorter, so a tooth seats on the dimple's
cone wall and self-centres both ways. They stand on a **collar band** — a raised ring 1.2 mm high
(less on a thin blade margin) with 45° shoulders — whose flat top runs 0.5 mm past every tooth's
foot both ways. (The first ring build reused the crossbar band, and on a large roller a tooth's
foot overhung its shoulder by 0.3 mm; the gate's H4 found it, §9.3.)

### 4.5 The peg row comes round again — and when that matters

A's peg row returns after one revolution, `n_A` columns on. If that is still inside the block it
dimples a column of cookie corners (on the cut lines, so small, but a defect). It lands in the far
border iff

    n_A ≥ cols + 1 + |m*|          (A's tiles round ≥ the sheet's columns + 2, normally)

The defaults satisfy it — that is why roller A's default is 6 round (⌀ 76.4 mm on a 40 mm tile)
where B's is 5 (⌀ 63.7 mm); otherwise the page **flags** it with the column it lands on. (A has
one peg row, not one per tile: "at least once per revolution" is met by one, and every extra one
would only add cookie dimples.) B's teeth never recur inside the block: they are all on the
collar, on the track's column.

### 4.6 Orientation and order of use

Holding a roller the other way round end-for-end rotates its stamp 180°; for a tile whose edges
are not centrally symmetric that changes the cookie. B cannot be held wrong (its collar must be
on the track). **A's +Z end carries a groove ring** on its end face. Both rollers are held with
their +Z end on the LEFT as they roll forward (§3.2).

1. Roll the dough `t_dough` thick on a floured board, a little bigger than the cut field, with a
   border of about one tile on the side you start from. The rings run on the board through the
   dough; there are no rims to keep it between.
2. **Roller A** — grooved end on your **left**, rolling **along edge A** (the way its rings
   run). Put it down near the edge of the dough with its **peg row** facing down, roll it **back**
   to the edge, then **forward** across the whole sheet in one pass. The pegs press a line of
   dimples into the border: the track.
3. **Roller B** — rolling **along edge B**, **collar on the track**. Seat a tooth in the dimple at
   one end of the track, roll B **back** to the edge, then **along the track** across the whole
   sheet in one pass; each tooth drops into a dimple.
4. Lift the border away; the cols × rows cookies are already apart.

**Why "back, then forward" — measured, not cautious.** At θ ≠ 90° the peg row slants, so its pegs
come down over `|tB| cos θ` of travel per ring — at an obtuse θ the later rings' pegs come down
BEFORE the first, and are reached only by rolling back first (the first version's simulator,
rolling forward only, found exactly this at 120°: a block corner 34 mm from the nearest line).
B's lines are cut wherever B rolls, so B is rolled back from its seat to the edge, then across.
Rolling back and forward re-stamps the same lines in the same places (no slip), so the instruction
costs nothing at θ = 90°. Any dimple will seat B — one fixes both its free placements (§4.4) — so
a dimple lost off the dough edge is harmless.

---

## 5. Parameters and defaults

| group | control | default | range | notes |
|---|---|---|---|---|
| tile | pitch A (edge A's chord) | 40 mm | 15–120 | roller A's circumference unit; roller B's rings are `pitch A · sin θ` apart |
| | pitch B (edge B's chord) | 40 mm | 15–120 | roller B's circumference unit; roller A's rings are `pitch B · sin θ` apart |
| | crossing angle θ | 90° | 30–150° | between the two chords, and so between the two roll directions |
| sheet | cookies along edge A (`cols`) | 4 | 1–8 | roller B carries `cols + 1` rings — B's length |
| | cookies along edge B (`rows`) | 3 | 1–8 | roller A carries `rows + 1` rings — A's length |
| rollers | roller A — tiles round it (`n_A`) | 6 | 2–12 | `D_A = n_A · pitch A / π` |
| | roller B — tiles round it (`n_B`) | 5 | 2–12 | `D_B = n_B · pitch B / π` |
| print | dough thickness | 5 mm | 2–15 | |
| | blade height | 8 mm | 4–20 | must exceed dough + 1.5 mm |
| | blade wall (tip) | 1.2 mm | 0.6–3 | the FDM floor; also the point-spacing flag |
| | draft angle | 2° | 0–10° | wall widens toward the root |
| | cylinder wall | 3 mm | 1.6–8 | |
| | peg / tooth size | 6 mm | 3–12 | dimple diameter at the dough surface |
| | axle bore | 8 mm | 5–14 | the handle pin is 0.5 mm smaller |
| check | min cookie width | 8 mm | 3–30 | the neck/spike flag |

The two sheet sliders replace the crossbar version's "span A / span B", and the two round sliders
its "repeats (bars per revolution)". Neither old name survives, because neither old meaning does:
a roller's **diameter** now follows its OWN pitch, and its **length** follows the cookie count in
the OTHER direction (§3.3). Each control's tooltip says which roller it sizes, and the read-out
prints, per roller, its rings, their spacing, its tiles round it and which edge it rolls along.

Default tile: a wave on each edge, corners smooth, 40 mm square cell. **The page opens on
4 × 3 = 12 cookies, a 160 × 120 mm cut field** (Eva: at least about 4 × 3). Roller A is 6 tiles
round (⌀ 76.4 mm at the blade tips), roller B 5 (⌀ 63.7 mm). A is 6 rather than 5 so that its peg
row's second pass lands in the far border: `n_A = 6 ≥ cols + 1 + |m*| = 6` (§4.5); at 5 the
default would be flagged.

---

## 6. Guardrails

**Blocked** (the edit is refused, the tile unchanged, the reason shown): the outline crossing or
touching itself; two control points within 0.05 mm.

**Refused** (the design builds and shows, but the roller STLs are not given out, with the
reason): the blade cannot clear the dough (`h ≤ t_dough + 1.5`); a roller too small to hold its
bore — its body under one cylinder wall around the bore (`R_body < bore/2 + t_wall + 0.4`, e.g.
2 tiles of 40 mm round it, a 25.5 mm roller); a peg too wide for its roller (the flat tip cannot
sit with its rim on the dough line, `2·top² < (r_tip + top)²` — reachable only with big pegs on
the smallest rollers).

**Flagged** (drawn red and listed; nothing silently fixed):

1. **Necks and spikes thinner than the minimum cookie width** — the tile is rasterised at
   ≤ 0.2 mm and *opened* by a disc of that width (two exact distance transforms). A neck is a
   place where the opening splits the cookie in two; a spike is a removed sliver reaching more
   than one width beyond the opened shape (a 90° corner reaches 0.21 widths and is not flagged;
   corners sharper than about 39° are).
2. **Control points closer than the blade wall** — the blade cannot show a feature smaller than
   its own thickness. Both points ringed red.
3. **Blade height ≤ dough + 1.5 mm** — STL refused.
4. **A's peg row comes round again inside the sheet** (§4.5): `n_A < cols + 1 + |m*|`, flagged
   with the column it lands on.
5. **A roller longer than 250 mm** — beyond common printers' build height; fewer cookies in the
   direction that sets its length, or smaller tiles.
6. **A roller with no room for a hollow** — printed solid round the bore (information only).

The crossbar version's **overhang flag** (bar segments flatter than 30° from horizontal) is
**gone, deliberately**: printed upright, every ring is a fin standing straight out of the body —
a 90° overhang along its whole length — so the flag would fire on every design and tell nothing.
The cost is stated once instead, in the page's how-to (its printing note) and the zip's README:
**print with support under every ring** (§3.1).

---

## 7. Exports

* **STL**: roller A, roller B, the handle — binary, millimetres — separately or all three in a
  ZIP (JSZip from the cdnjs pin `cards.html` uses, loaded on click) with a README carrying the
  §4.6 sequence, the support note and the derived numbers. Every part is a set of closed shells
  (the body, each ring a closed tube, each peg / tooth cone); overlapping closed shells are
  unioned by the slicer.
* **SVG**: the tile and the 3×3 patch, as cut lines in millimetres.
* **Design**: saved and opened as JSON (`tessellation-roller-design`, **version 2**: the tile, the
  print settings, the sheet and the round counts — every number range-checked and the tile
  validated on the way in); the zip carries a copy. **A version-1 file** (the crossbar page's)
  still opens: its tile, print settings and sheet (`span A × span B` become `cols × rows`) are
  kept, its bar counts are not — they counted the OTHER pitch round each roller — and the page
  says what was reset. The page keeps the current design in local storage under a **new key**, so
  a design the crossbar page left behind does not reopen by itself (Eva's preview showed 3
  cookies on a 38 × 108 mm field — a 1 × 3 sheet at about 38 × 36 mm pitches, which the crossbar
  page's own 4 × 3 default never produced; most likely a design an earlier visit left in storage).

---

## 8. Food safety (as on the page)

Print in PLA or PETG from a filament sold as food-contact safe, with a stainless nozzle (some
brass nozzles contain lead). The plastic is not the problem — the layer lines are: they trap
dough and bacteria. Dust the rollers with flour before use, wash them by hand straight after in
warm soapy water with a soft brush, and let them dry completely. No dishwasher — PLA softens near
55 °C. They cut dough for minutes; don't store food in contact with them. If they wear rough or
crack, print new ones.

---

## 9. Verification

Two gates, both in CI (`.github/workflows/tile-gate.yml`), each with a negative control that
must catch every mutation by the clause that names it, every anchor checked before any mutant
runs.

### 9.1 `node tools/verify-tile.mjs` — the geometry (Node only)

Rows: every hand-drawn fixture in `tools/tile-fixtures.mjs` (the default, straight edges, a hook
at 60°, a sharp zigzag at 75°, a jigsaw knob, obtuse 120°, acute 40°, a finger, a pinch, close
points), seeded random tiles (12 by default, 40 in CI), and parameter rows: round 3/7 on a 2 × 5
sheet (its peg row comes round inside the sheet — flagged), round 8/3 on a 6 × 3 sheet (B turns
more than once to cross it), a thin print, an obtuse tile in deep dough, small rollers (a
straight 30 mm square at 5/4 round, whose peg feet are founded on the hollow's roof), and two
refusals — a blade that cannot clear the dough, a roller too small for its bore. Through the
SHIPPED modules, each clause in its own containment (a clause that throws is a finding, and the
rest of the row still runs):

* **T — tessellation, by the gate's own geometry.** T1 the outline is simple (its own segment
  test, not the builder's); T2 its signed area is `|tA × tB|` (1e-9 relative) and the nine tiles
  sum to 9×; T3 a scanline census over the 3×3 finds no run covered twice; T4 a probe 1 µm
  outside every boundary segment of the centre tile lands in exactly one neighbour and 1 µm inside
  in the centre only; T5 top = bottom + `tB`, right = left + `tA` (1e-12).
* **D — direction: every blade is a RING running AROUND its roller, never a bar along it**
  (Eva's ruling's own check), read off the MESH. D1 each blade's tip edges cover every azimuth
  (the union of their angular spans is the whole circle), and no tip edge is longer than the
  line's own sampling — so a ring cannot close by a chord across a missing copy; D2 each blade's
  axial extent is its line's own extent ACROSS the line (the gate's projection of the edge onto
  the axis) plus the root width — a bar lying along the roller is a pitch or more long; D3 the
  blades are spaced along the axis by `|tA × tB| / |chord|` (θ counted), and there are cookies + 1
  of them. The mutant that lays the line along the axis fails D1 (its "ring" closes on a 119 mm
  chord where the line is sampled every 1.1 mm).
* **S — seam.** Both rollers rolled three revolutions either way in `tile-sim.js` (and always far
  enough to cross the whole sheet, with a revolution to spare): S1 every corner of every stamped
  line lands on a lattice point (1e-6 mm), all of one row (A) or one column (B); S2 the rows
  0..rows (A) and columns 0..cols (B), each exactly once, every ring gaining exactly one period of
  travel per time round — it closes on itself, once; S3 every stamped line is the ideal line of
  its row or column, both ways, over every revolution boundary — the seam; S4 every blade's mesh
  is a closed tube round the roller (a torus: `V − E + F = 0`) whose tip face hugs its spec ring
  all the way round, the seam included.
* **R — registration.** R0 the mesh is the spec: every spec ring point has blade tip beside it,
  and every peg and tooth cone is centred on its spec point. R1 the rolling radius read off the
  mesh is the blade tips' (nothing stands proud of the rings). R2 A's slanted peg row lays exactly
  one dimple on each corner `(m*, k)`, `k = 0..rows`. R3 B, posed by seating ONE tooth in the
  first dimple and rolled both ways: every tooth that reaches the track lands in a dimple, and
  every dimple gets a tooth; and seated instead by its LAST tooth in the LAST row's dimple, or by
  a middle tooth in row 1's, it stamps the same lines — one seat fixes both free placements.
  R4 every corner of the cookie sheet lies on its A line and its B line (1e-6 mm). R5 the
  sheet's A and B lines meet at lattice corners only, `(cols+1)(rows+1)` of them.
* **W — watertight.** Each STL re-welded from its float32 bytes: no unmatched and no duplicated
  DIRECTED edge (an undirected census passes a face wound inside out), no degenerate triangle,
  every shell's signed volume positive. W5: the STL is refused exactly when the MEASURED roller
  cannot work — its blade (tip less body, off the mesh) does not clear the dough by 1.5 mm, or
  its rolling radius less the blade leaves no cylinder wall round the bore. Never read off the
  builder's own flag (the quantity under test).
* **H — heights, off the mesh.** H1 blade above the body > dough + 1.5 mm, the body's radius
  read by casting rays from the axis against the body's own triangles (a vertex scan reads the
  hollow: the outer cylinder has vertices only at its ends); H2 every peg reaches exactly
  `δ = min(½·dough, ½·D − 0.8)` into the dough and every tooth 0.3 mm less (1e-6 mm), the law
  restated in the gate; H3 the collar band clears the dough; H4 every cone's foot — the centre of
  its base — lies inside the body's material (a ray through it crosses the body's skin an odd
  number of times first).
* **F — flags.** Each fixture's neck / spike / close-point flags are exactly the ones it
  expects; the close-point bar restated; A's peg row's second pass is flagged iff the simulation
  lands a dimple on a sheet corner.
* **E — the editor, as functions.** E1 an invalid tile is refused and really crosses (the gate's
  own test); E2 a drag into a crossing is blocked at the first crossing step, tile unchanged;
  E3 moves, inserts, deletes, toggles land; E4 a corner cannot be deleted; E5 a corner resize
  keeps θ and puts the corner at the pointer; E6 a smooth corner's line is C1 (§2.2) and a sharp
  one kinks; E7 a tile round-trips through JSON and a crossing tile in a file is refused.

`--verbose` prints every row's measured heights, ring spacing and errors (the default fixture
always does). `--mutant <regex>` runs a subset of the negative control. The negative control has
**30 mutations**: smooth corners losing their periodic neighbour, the top edge not the bottom +
`tB`, the validator not checking simplicity, a corner resize ignoring the opposite corner, the
neck test never seeing two pieces, the close-point flag at a tenth of the blade; **the line laid
along the axis — a bar, not a ring** (D), the ring spacing ignoring θ (D), one ring too few (D),
the circumference laid on the other pitch (S), π as 3.14 (S), the spec ring's copies 0.05 mm off
the pitch (S), a ring one copy short bridged by a chord (R0), the offset's copies repeating the
point they meet at (W), the ring tubes or the spec rings not turned with their lines, the tip
face wound backwards, the roller axis right of the roll (the handedness defect, §3.2); the pegs
mid-tile, the peg row straight across A instead of slanted, the teeth a column too far out, the
teeth ignoring the track's phase, a peg proud of the blades (R1), pegs through the dough, the tip
disk centred on the dough line, a peg foot in the hollow (H4); and each refusal and the
recurrence flag never raised.

### 9.2 `node tools/verify-tile-page.mjs` — the page (headless Chromium)

Real pointer events, keys, clicks and downloads; every claim measured against the editor's
DRAWN marks, the downloaded bytes, the rollers' MESHES or the tile read back (validated in
Node):

P0 the page loads (four corners, both copies of every point, nine tiles, 4 + 4 cut lines, the
rollers built); P1 a dragged point lands under the pointer and its copy is drawn exactly one
lattice step away; P2 a point dragged by its COPY lands under the pointer; P3 a drag through the
left edge is blocked, the status says so, the point stops short, the tile stays valid; P4 a
click 5 px off an edge adds a point ON the curve (within 1e-6 mm of it) and selects it; P5 Delete
and a double-click each remove a point; P6 Delete on a corner is refused; P7 S toggles a point
and (on a corner) all four corners; P8 dragging C0 keeps C2 put on screen and C0 under the
pointer, θ unchanged; P9 the sliders set the tile; P10 a pinched tile shows its thin parts in
the editor and on all nine 3×3 tiles, too-close points get a ring on both copies; P11 a refused
design disables the roller buttons and says why; P12 the STL download is `84 + 50·n` bytes with
the page's own `n`; P13 the SVG downloads (one closed path; 8 cut lines over nine tiles); P14 the
zip holds both rollers, the handle, the notes and the design; P15 a saved design opens back to
the same tile; P16 it survives a reload; P17 the rollers' view draws something; **P18** the sheet
and round sliders size the right rollers — cookies along edge A sets roller B's rings to
`cols + 1` and cookies along edge B roller A's to `rows + 1`, COUNTED OFF THE MESHES, and tiles
round A sets A's diameter to `n_A · pitch A / π`; **P19** the page opens on at least 4 × 3 cookies
and says so; **P20** a version-1 (crossbar) design file opens with its sheet kept and says what
was reset; **P21** a design the crossbar page kept in local storage does not come back.

Its negative control re-serves broken copies of `tile.js` and `tile-roller.js` (thirteen
mutations: a drag ignoring which copy it holds, a blocked edit not told, a click adding itself
instead of its point on the curve, Delete doing nothing, a double-click never deleting, a corner
drag not holding the opposite corner, the 3×3 never showing thin parts, the roller buttons
ignoring a refusal, the design never kept, the sheet sliders feeding the wrong roller, the page
opening on one column of three cookies, a crossbar design file losing its sheet, and the page
still reading the crossbar version's storage).

### 9.3 What the gates found

**Rebuilding for rings** (each fixed at its cause):

* **A ray along a shared edge sees neither triangle.** At 6 tiles round, A's first peg sits at
  exactly 60°, on a seam of the revolved body, and the gate's ray-parity tests (H1's body radius,
  H4's foot) missed the hit — the gate's instrument, not the roller. Its rays take a 1e-9 slack on
  the edge test now and merge duplicate hits.
* **H4 founded a cone on a vertex of its base RIM.** It took the cone's vertex nearest the axis as
  the foot, and the base rim and centre tie on radius. It takes the base centre among the ties
  now — and the corrected clause then found a real defect: **B's collar band was too short.** It
  reused the crossbar band, and on a large roller (random seed 37) a tooth's foot overhung its
  shoulder by ~0.3 mm. The band's flat now runs 0.5 mm past every tooth's foot (§4.4).
* **A ring one copy short, closed by a chord, passed every S clause** — the tube is still a torus
  and the stamped line is read at its vertices. D1 now bounds every tip edge by the line's own
  sampling, and R0 finds the spec points along the missing copy with no blade beside them.
* **One clause's exception erased the row.** The first sweep counted mutants as missed whose
  damage had made an earlier clause throw — every finding after the throw was lost. Each clause
  runs in its own containment now; R3's re-seat, which threw when its row's dimple was absent,
  checks the dimple exists first and reports its absence.
* **A corner-based clause cannot see a half-tile shift on a symmetric tile.** The default tile's
  edges cross their chords at their midpoints, so a line moved half a pitch along itself still
  passes through every lattice corner: the mutant that puts A's pegs mid-tile left every R clause
  green on the default. It runs on the hook, whose edges are not symmetric.
* **The axial-bar mutant first crashed instead of failing** — its first form gave the periodic
  offset no safe cut, which is a crash, not a catch. It now transposes the line (each point's two
  coordinates swapped, and the period with them) — a bar along the axis that the builder builds
  and D1 refuses.

**The crossbar version's findings, kept** because the code they fixed is still there: the
handedness defect (§3.2) — R and S; the simulator's window clipping B's lines at obtuse angles —
R4, R5 (§4.6's "back, then forward"); the dough-depth law stated to the tip disk's centre while
its rim reached 0.011 mm deeper — H2; a 30 mm tile's peg feet sunk into the hollow — H4; the
gate's own H1 reading the hollow's radius as the body's (it scanned vertices); the page's
double-click never reaching the point (the press redraws the editor) — P5; two page mutants that
could not fire (a status set twice; a corner drag tested on the one corner whose opposite never
moves). And one found by reading the peg geometry's limits rather than by a red: rollers of 2
tiles of 40 mm round built a body of negative radius, silently. They are refused now, and W5
asserts the refusal from the measured rolling radius.

---

## 10. Phase 2 (design only) — image → tile

Paste, drop or load a picture of one cookie shape; get an editable tile.

1. **Segment** — `bug-image.js`'s `segment` carries over unchanged: luminance, a 3×3 blur,
   Otsu threshold, polarity from the image border, the largest component, holes filled, the
   erase brush. Its border-touch and busy-background refusals carry over too.
2. **Trace** — `traceOuter` (the silhouette loop) and `smoothLoop` carry over.
3. **Corners and angle** — new. Four boundary points `P0…P3` with `P1 − P0 = P2 − P3` (a
   parallelogram), found by searching `P0`, `P1`, `P3` along the loop's arc length and taking
   `P2` as the loop point nearest `P1 + P3 − P0`; scored by how well each arc matches its
   opposite translated (`arc(P0→P1)` against `arc(P3→P2) − (P3 − P0)`). The crossing angle is the
   parallelogram's. O(N³) over ~200 samples, pruned by the parallelogram residual first.
4. **Average opposite sides** — new. Each pair of opposite arcs is resampled by arc length and
   averaged point for point (after removing the translation): edge A from bottom and top, edge B
   from left and right. The averaged tile is the nearest tileable shape; the page reports the
   largest distance the traced outline moved.
5. **Fit** — `bug-image.js`'s `fitOutline` (the fewest Catmull–Rom points within a tolerance
   in mm) carries over, per edge, corners pinned. Points where the averaged edge turns sharply
   become sharp points.
6. **Hand off** — ordinary editor state, validated by §1.2's one rule; an invalid fit is
   refused with the reason, and the picture stays as a backdrop to trace by hand (the /bug
   backdrop pattern).

---

## 11. Decisions made without a ruling, and open questions

1. **Rings — by Eva's ruling, not a free decision** (§3.1). Its cost is recorded rather than
   argued: support under every ring when printed upright. (The first version chose crossbars for
   printability; the ruling reversed that, and nothing here re-opens it.)
2. **No rims** (§3.5) — the rings roll on their own tips; the "dough between the rims" rule is
   dropped with them.
3. **The track is column `m*`, one column outside the sheet** (corner-registered) — so a
   recurrence, if any, lands on cut junctions, not inside cookies. A track half a column out
   would save half a column of border but put any recurrence inside cookies.
4. **The collar is at the nearest column whose teeth clear B's first ring by 1.5 mm**, root and
   wiggle included — `m* = −1` normally, further out on a tile whose B edge wiggles wide.
5. **Roller A defaults to 6 tiles round, B to 5**, so A's peg row comes round outside the default
   sheet (§4.5); with both at 5 the default would be flagged.
6. **The sheet is two sliders — cookies along edge A and along edge B** — replacing span A and
   span B, and **"tiles round it"** replaces "repeats"; the tooltips say which roller each one
   sizes.
7. **A version-1 (crossbar) design keeps its tile, print settings and sheet; its round counts are
   reset**, and the local-storage key changed so an old design does not reopen by itself.
8. **Corners resize; θ is a slider.**
9. **Corners default smooth.**
10. **A's orientation mark is a groove ring on its +Z end face.**
11. **No hollow-free cavity**: the body is a tube open to its bores, so it drains.
12. **"Back, then forward"** for both rollers (§4.6) — one procedure for every angle.
13. **A roller too small for its bore is refused**, not clamped: a clamp would change the
    circumference, which is the one number the pattern is laid out on.

Open: whether `n_A ≥ cols + 1 + |m*|` should be enforced rather than flagged (it couples A's
diameter to the sheet's width); how the rings are best supported (tree supports are the
expectation, not a measurement); the handle retention (friction only today); nothing has been
printed — every printability figure here is a declared rule of thumb, not a measurement.

---

## 12. Measured (the default design)

| | roller A | roller B | handle |
|---|---|---|---|
| diameter at the blades | 76.4 mm (body 60.4) | 63.7 mm (body 47.7) | grip 26 mm |
| length | 141 mm | 219 mm | 103 mm |
| rings | 4, 40 mm apart | 5, 40 mm apart | — |
| triangles | 22,152 | 23,320 | 1,536 |
| binary STL | 1.06 MB | 1.11 MB | 75 KB |

12 cookies a pass (4 × 3), cut field 160 × 120 mm; track column −1; 4 pegs on A in a row (one per
ring), 5 teeth on B's collar. Blade 8.00 mm above the body, peg dimple 2.20 mm, tooth 1.90 mm,
collar band 6.80 mm above the board — all read off the mesh. Ring spacing 40.000 mm on both
(1.9e-13 off), every ring covering the whole circle. Sheet corners within 1.8e-14 mm of both
lines, 20/20 line meetings, stamped lines within 4.6e-13 mm of their ideal (3.3e-13 at the
seams) over 13 revolutions of A and 12 of B.

Cost in the page (Node, same code): the roller build 6–114 ms over the fixtures (60 ms at the
default, 114 ms for the jigsaw knob, the most points), the neck/spike raster 9–45 ms, a
validation 0.2–2.8 ms — so the editor validates on every pointer move and rebuilds the rollers
120 ms after the hand stops. The largest fixture STL is the jigsaw knob's roller B, 2.4 MB
(49,720 triangles). Against the crossbar version at its own defaults (A 21,420 / B 18,220
triangles, 1.02 MB / 890 KB), the ring rollers are 3% and 28% larger — B now carries five rings
of five copies of its edge each.
