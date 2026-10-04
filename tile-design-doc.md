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

### 3.1 Which way each roller rolls — and the decision that is not obvious

A roller stamps its **unrolled surface** onto the dough: rolling without slip, the surface
point at arc length `s` lands at `start + s·r̂` (`r̂` the roll direction) and its axial position
`z` lands at `z·â` (`â` the axis). Rolling direction does not change the stamp; only which way
round the roller is held does (flipping it end for end rotates the stamp 180°, §4.6). For a
roller to cut a family of lines, that family must be **periodic along the roll direction with a
period that divides the circumference**.

Each family is periodic under the whole lattice, so a roller may roll along either lattice
vector. Two candidate designs:

| | **Rings** — roller A rolls along `tA`, its lines run *around* it | **Crossbars** — roller A rolls along `tB`, its lines run *across* it |
|---|---|---|
| period along the roll | `|tA|` | `|tB|` |
| rolling support | continuous — every ring is a wheel at the tip radius | intermittent — needs rims (§3.5) |
| cutting | progressive, pizza-wheel-like | a bar comes down, ravioli-roller-like |
| **printed upright** | **every ring is a horizontal fin: an 8 mm, ~90° overhang, supported along its whole length** | every bar is a near-vertical wall; prints clean |
| index marks (§4) | consistent | consistent |

**Crossbars ship.** The deciding fact is printability: a roller is printed standing on its end,
and a ring blade is a thin horizontal fin cantilevered 8 mm off a vertical wall — it cannot be
printed without supports under every ring, and supports between closely spaced rings are the
worst kind to remove. A crossbar's wall leans at the crossing angle θ from horizontal (90° at
the default: vertical), and a thin wall prints cleanly down to roughly 20° from horizontal
(each 0.2 mm layer steps out by `0.2 / tan β`, which a 1.2 mm wall overlaps for any
`β > ~18°`). The rings' one real advantage, continuous support, is restored by **rims** (§3.5).

So, with Y the *other* family:

* **Roller A** carries the edge-A lines and **rolls along `tB`**; **roller B** carries the
  edge-B lines and **rolls along `tA`**. The angle between the two roll directions is θ.
* The **pattern period along the roll is the other pitch**: A's bars are `|tB|` apart round its
  circumference, B's are `|tA|` apart.
* **Circumference at the blade tip `C = n · |tY|`**, `n` = repeats (bars per revolution, an
  integer); **tip radius `R_tip = C / 2π`**, derived, never set. The read-out prints both
  diameters.

### 3.2 The unrolled frame

For roller X: `r̂ = tY/|tY|` and **`â = ẑ × r̂`** — the roll direction turned 90° to the left,
for BOTH rollers, so `(r̂, â, ẑ)` is right-handed for both. A sheet vector `P` (from the bar's
first corner) has unrolled coordinates `s = P·r̂` (arc length at the tip radius) and
`z = P·â` (along the axis). (A first draft signed `â` so that `tX·â > 0`; at θ = 90° that made
roller A's frame left-handed and stamped its line MIRRORED. The simulator found it — §9 — which
is the reason it derives the spin from a rigid-body roll rather than from this convention.) A **bar** is the chain of `K` copies of edge X, corner to corner,
plus a 3 mm overrun past each end corner (so the cut fully crosses the outermost line of the
other family). Bar `j` is bar 0 shifted `s += j·|tY|`, `j = 0…n−1`. At θ = 90° a bar runs straight
along the axis; otherwise each copy advances `|tX| cos θ` in arc, so the bar leans at θ from
the circumference.

On the cylinder, a bar point `(s, z)` sits at roller angle **`φ = −s / R_tip`** and height
**`Z = z + Z0`**, with the roller's +Z end held toward +`â`: **on your left as it rolls
forward**, for either roller. (The simulator re-derives the spin from the no-slip condition of a
3D rigid-body roll rather than reading this convention — a builder with the sign flipped stamps a
mirrored line and fails R and S.)

### 3.3 Spans and the cookie block

A bar's length in tiles is the roller's **span**: roller A's bars span `K_A` tile *columns*,
roller B's span `K_B` *rows*. One pass of each cuts a block of `K_A × K_B` whole cookies; the
number of lines each roller stamps is set by how far it rolls (A stamps rows `0…K_B`, B stamps
columns `0…K_A`). Outside the block the sheet is border waste (cut by one family only).

### 3.4 The blade

A bar is a wall standing radially on the body, following the bar curve at every radius (the
same `(φ, Z)` curve from root to tip, so the cut line is exactly the tip curve). Cross-section
square to the curve: **`w_tip` at the edge** (the "blade wall thickness", the FDM floor),
widening by the **draft angle** toward the root: `w_root = w_tip + 2·(h + e)·tan(draft)`,
where `h` is the blade height and `e` = 0.4 mm the root's embedding into the body (so the two
closed shells overlap instead of touching). The draft is for release: the wall is thinnest
where it leaves the dough last.

The two side faces are true **offsets** of the bar curve — computed in each radius's own
unrolled metric (at the root, arc lengths shrink by `R_root/R_tip`, which changes angles, so the
root offset is not the tip offset scaled) — with round joins on the outside of a turn and the
self-intersection loops on the inside of a tight turn removed. The four offset polylines (left
and right, tip and root) are zipped into four strips and closed with two end caps: one closed
tube per bar.

**Blade height must exceed dough thickness + 1.5 mm** (so the body never touches the dough);
below that the STL is refused with the reason.

### 3.5 Rims

A crossbar roller is supported only by the bar that is down; between bars it would drop by
about `R(1 − cos(π/n)) ≈ π|tY|/(4n)` — 6 mm on a 40 mm tile at 5 repeats, enough to put the
body into the dough. So each roller has a **rim at each end**: a 4 mm band at exactly the
blade-tip radius that rolls **on the board beside the dough**. With the rims the roller rolls at
exactly `R_tip`: the bars come down radially, never drag, and the stamp's period is exactly the
circumference the pattern was laid out on. The rims' inner shoulders ("skirts") are 45° cones,
so they print without support.

**The dough must lie between the rims.** A rim that runs onto dough lifts the roller by the
dough's thickness and every blade stops short of the board. The clear span between the skirts'
feet is `L − 2·(rim + h)` — 181 mm on the default A, 175 mm on B — and the page's how-to states
both. This bounds the sheet: no wider than A's span across A's path and B's across B's. Since
each roller's bars already span the cookie field plus a 3 mm overrun, the border this leaves is
narrow at the sides (a few millimetres past the field) and a tile or so at the near edge (the
track). The cut field is a parallelogram `K_A·tA × K_B·tB`; at θ ≠ 90° the sheet is best laid as
one too.

### 3.6 Body, bore, handle

The body is a solid of revolution: a tube of wall **`t_wall`** (the "cylinder wall"), closed by
end caps 8 mm thick, each with an **axle bore** (8 mm) through it; the cavity is open to both
bores, so it drains and dries. The cavity's ceiling is a 45° cone (printable upright).

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
**sideways position** (along its axis) and its **phase** (which bar is down at a given point of
travel). The marks must fix both, and do nothing else.

### 4.2 The collar decides the track's direction

B's toothed collar is at one end of B, so as B rolls it travels along **B's roll direction,
`tA`**, at a fixed position along B's axis. For its teeth to *ride* a track, **the track must
run along `tA`** — i.e. along the edge-A lines. And it must lie **outside the cookie block**
(border waste), at the edge B's collar end passes over: the edge of the block on B's
collar side, which is the edge A **crosses first**.

### 4.3 A lays the track with its own bars

A line of dimples along `tA` is exactly what one of A's bars stamps (a bar *is* an edge-A
line). So: **the pegs ride on one bar of A, at that bar's corners** — one peg per tile pitch
along the bar, `K_A + 1` of them, i.e. "a row of pegs running lengthwise along the surface"
(at θ = 90° the bar is exactly lengthwise; otherwise it leans at θ like every bar), once per
revolution. The user starts A with the **pegged bar down first**, one row (or `|k*|` rows,
§4.4) outside the block; that first bar stamps the track row `k*`: an edge-A line in the border
plus a dimple on each of its corners. Dimples at corners are on the lattice by construction,
so each is a lattice point of A's pattern.

Each peg is a 45° cone (printable on a vertical wall) whose tip stands `δ` into the dough:
`δ = min(½·t_dough, ½·D − 0.8 mm)` — at most half the dough, so it dimples and never punches —
and the dimple is a cone of diameter `D` (the "peg/tooth size") at the dough surface. The tip is
a flat disk (radius `½·D − δ` ≥ 0.8 mm, blunt) and on a curved roller a flat disk reaches
FURTHER at its rim than at its centre (`√(ρ² + r²)` against `ρ`), so the disk is set where its
**rim** reaches `R_tip − t_dough + δ` — the 45° side's own equation with the limit at the top.
The dimple is then exactly `δ` deep (the gate measures it off the mesh: 2.2000 mm at the
defaults; the disk centred on the dough line instead reached 2.2110).

The cone's **foot** is sunk into the body so its base rim stays 0.4 mm inside the body surface —
solving `ρ² + (r_tip + top − ρ)² = (R_body − 0.4)²` for the larger root. On a small roller there
is no root (no 45° cone that tall fits inside a body that curved: its base rim, going round the
roller, always clears the surface — its least reach is `c/√2` at `ρ = c/2`); the foot then goes
to `ρ = c/2`. **Either way it stays 0.3 mm above the hollow** — on the straight 30 mm tile the
root lands at 11.25 mm, inside a 12.87 mm hollow, and the gate's H4 caught exactly that. The
cone's sides may then show a little at the foot ROUND the roller (vertical faces as printed, so
no overhang), never on its underside.

### 4.4 Where the collar sits

The track is the edge-A line of row `k*` (< 0), i.e. the corners `C0 + m·tA + k*·tB`. In B's
own unrolled frame (`s'` along `tA`, `z'` along B's axis), corner `(m, k)` is at

    s' = m·|tA| + k·|tB| cos θ        z' = k·|tB| sin θ

relative to B's first bar's first corner. So the collar is a ring at **`z' = k*·|tB| sin θ`** — the
axial position of row `k*`, outside B's bars on B's collar end — carrying **one tooth per bar**,
`n_B` of them, at **`s' = m·|tA| + k*·|tB| cos θ`**: each tooth sits where its bar would cross
row `k*` if the bar went on (at θ = 90° directly in line with the bar). Teeth are the pegs'
cones offset 0.3 mm smaller and 0.3 mm shorter, so a tooth seats on the dimple's cone wall and
self-centres sideways. `k*` is the nearest row (−1 normally) whose collar clears B's bars,
including their overrun and the lowest dip of edge B, by 1.5 mm.

Seat any tooth in the first dimple and B's lattice equals A's: the sideways position is fixed
by the tooth sitting in the track's line, the phase by the tooth sitting on that dimple; B
then rolls without slip on its rims, so every following tooth meets every following dimple
(`|tA|` apart on both). **This is checked by simulation, not argued** (§9).

### 4.5 The peg row comes round again — and when that matters

A's pegged bar returns after one revolution, `n_A` rows later. If that is still inside the
block it dimples a row of cookie corners (on the cut lines, so small, but a defect). It lands
in the far border iff

    n_A ≥ K_B + 1 + |k*|          (A's repeats ≥ B's rows + 2, normally)

The defaults satisfy it; otherwise the page **flags** it with the row it lands on. (A has one
pegged bar, not one per tile: "at least once per revolution" is met by one, and every extra
one would only add cookie dimples.)

### 4.6 Orientation and order of use

Holding a roller the other way round end-for-end rotates its stamp 180°; for a tile whose
edges are not centrally symmetric that changes the cookie. B cannot be held wrong (its collar
must be on the track). **A's +Z end carries a groove ring** on its end face. Both rollers are
held with their +Z end on the LEFT as they roll forward (§3.2).

With `tB` pointing away from you (so `tA` points right at θ = 90°):

1. Roll the dough `t_dough` thick on a floured board, no wider than the rollers' rims allow
   (§3.5) — the rims run on the board.
2. **Roller A** — grooved end on your **left**. Set it down at the near edge with the **pegged
   bar** about to touch the dough, roll it **back** to the edge, then **away** from you across the
   whole sheet in one pass. The pegs press a line of dimples into the near border: the track.
3. **Roller B** — **collar end toward you**, collar on the track. Seat a tooth in the **first
   dimple on the left**, roll B **back** to the left edge, then **along the track** across the whole
   sheet in one pass; each tooth drops into a dimple.
4. Lift the border away; the `K_A × K_B` cookies are already apart.

**Why "back, then forward" — measured, not cautious.** A bar leans at θ (§3.2), so its features
come down at different points of travel. At an obtuse θ the parts of B's columns that lean back
past the seated tooth are reached only by rolling back first: the simulator's first version
rolled B forward from the seat only, and at 120° it found a block corner 34 mm from the nearest
B line and 16 line meetings where 20 were owed. A's pegs lean the same way along the pegged bar. Rolling a
roller back and forward re-stamps the same lines in the same place (no slip), so the instruction
costs nothing at θ ≤ 90°. Any dimple will seat B — one fixes both its free placements (§4.1) —
so a dimple lost off the dough edge is harmless.

---

## 5. Parameters and defaults

| group | control | default | range | notes |
|---|---|---|---|---|
| tile | pitch A (edge A's chord) | 40 mm | 15–120 | roller B's bar spacing |
| | pitch B (edge B's chord) | 40 mm | 15–120 | roller A's bar spacing |
| | crossing angle θ | 90° | 30–150° | the angle between the roll directions; bars lean at θ |
| rollers | repeats A (bars per revolution) | 5 | 2–12 | `D_A = n_A·pitch B / π` |
| | repeats B | 5 | 2–12 | `D_B = n_B·pitch A / π` |
| | span A (cookie columns) | 4 | 1–8 | roller A's length |
| | span B (cookie rows) | 3 | 1–8 | roller B's length |
| print | dough thickness | 5 mm | 2–15 | |
| | blade height | 8 mm | 4–20 | must exceed dough + 1.5 mm |
| | blade wall (tip) | 1.2 mm | 0.6–3 | the FDM floor; also the point-spacing flag |
| | draft angle | 2° | 0–10° | wall widens toward the root |
| | cylinder wall | 3 mm | 1.6–8 | |
| | peg / tooth size | 6 mm | 3–12 | dimple diameter at the dough surface |
| | axle bore | 8 mm | 5–14 | the handle pin is 0.5 mm smaller |
| check | min cookie width | 8 mm | 3–30 | the neck/spike flag |

Default tile: a wave on each edge, corners smooth, 40 mm square cell. The default rollers are
63.7 mm across the blade tips; A spans 4 columns, B 3 rows (plus the collar row), 12 cookies a
pass; `n_A = 5 ≥ 3 + 2`, so no cookie is dimpled.

---

## 6. Guardrails

**Blocked** (the edit is refused, the tile unchanged, the reason shown): the outline crossing or
touching itself; two control points within 0.05 mm.

**Refused** (the design builds and shows, but the roller STLs are not given out, with the
reason): the blade cannot clear the dough (`h ≤ t_dough + 1.5`); a roller too small to hold its
bore — its body under one cylinder wall around the bore (`R_body < bore/2 + t_wall + 0.4`, e.g.
2 repeats of a 40 mm tile, a 25.5 mm roller); a peg too wide for its roller (the flat tip cannot
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
4. **The pegged bar returns inside the cookie block** (§4.5).
5. **Bar segments flatter than 30° from horizontal** in the upright print orientation — they
   need support. Listed as the share of blade length.
6. **A roller longer than 250 mm** — beyond common printers' build height.
7. **A roller with no room for a hollow** — printed solid round the bore (information only).

---

## 7. Exports

* **STL**: roller A, roller B, the handle — binary, millimetres — separately or all three in a
  ZIP (JSZip from the cdnjs pin `cards.html` uses, loaded on click) with a README carrying the
  §4.6 sequence and the derived numbers. Every part is a set of closed shells (body, each bar,
  each peg / tooth); overlapping closed shells are unioned by the slicer.
* **SVG**: the tile and the 3×3 patch, as cut lines in millimetres.
* **Design**: saved and opened as JSON (`tessellation-roller-design`, version 1: the tile, the
  print and roller settings — every number range-checked and the tile validated on the way in);
  the page also keeps the current design in local storage, and the zip carries a copy.

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
points), seeded random tiles (12 by default, 40 in CI), and parameter rows (unequal repeats and
spans — one dimpling cookies and flagged, one where B turns twice to cross the block — a thin
print, a deep dough, small rollers whose peg feet are founded below the curve, and two refusals:
a blade that cannot clear the dough, and a roller too small for its bore). Through the SHIPPED
modules:

* **T — tessellation, by the gate's own geometry.** T1 the outline is simple (its own segment
  test, not the builder's); T2 its signed area is `|tA × tB|` (1e-9 relative) and the nine tiles
  sum to 9×; T3 a scanline census over the 3×3 finds no run covered twice; T4 a probe 1 µm
  outside every boundary segment of the centre tile lands in exactly one neighbour and 1 µm inside
  in the centre only; T5 top = bottom + `tB`, right = left + `tA` (1e-12).
* **S — seam.** Both rollers rolled three revolutions each way in `tile-sim.js` (and always far
  enough to cross the whole block, with a revolution to spare): every stamped line starts on a
  lattice point (S1, 1e-6 mm); the rows (A) and columns (B) are one contiguous run, each exactly
  once, across every revolution boundary (S2); every stamped line is the ideal line of its row
  or column, both ways (S3).
* **R — registration.** R0 the mesh is the spec (every blade tip within half a blade of its
  centreline, every centreline point with a tip beside it, every cone centred on its point);
  R1 the rolling radius read off the mesh is the blade tips'; R2 A's pegged bar lays exactly one
  dimple on each corner of the track row; R3 B, posed by seating ONE tooth in the first dimple
  and rolled both ways, lands every tooth that reaches the track in a dimple and feeds every
  dimple; R4 every corner of the cookie block lies on its A line and its B line (1e-6 mm);
  R5 A's and B's lines meet at lattice corners only, `(K_A+1)(K_B+1)` of them.
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
  restated in the gate; H3 the collar band clears the dough; H4 every cone's foot lies inside the
  body's material (a ray through it crosses the body's skin an odd number of times first).
* **F — flags.** Each fixture's neck / spike / close-point flags are exactly the ones it
  expects; the close-point bar restated; the pegged bar's second pass is flagged iff the
  simulation lands a dimple on a cookie corner.
* **E — the editor, as functions.** E1 an invalid tile is refused and really crosses (the gate's
  own test); E2 a drag into a crossing is blocked at the first crossing step, tile unchanged;
  E3 moves, inserts, deletes, toggles land; E4 a corner cannot be deleted; E5 a corner resize
  keeps θ and puts the corner at the pointer; E6 a smooth corner's line is C1 (§2.2) and a sharp
  one kinks; E7 a tile round-trips through JSON and a crossing tile in a file is refused.

`--verbose` prints every row's measured heights and errors (the default fixture always does).
The negative control has 22 mutations, among them: smooth corners losing their periodic
neighbour, the top edge not the bottom + `tB`, the validator not checking simplicity, the roller
axis right of the roll (the handedness defect above), each roller laid on its own pitch, π as
3.14, the collar a row too far out, teeth ignoring the bars' slant, pegs mid-tile, a bar losing
its end cap, a face wound backwards, rims proud of the blades, every refusal never raised, pegs
reaching through the dough, the tip disk centred on the dough line, a peg foot sunk into the
hollow.

### 9.2 `node tools/verify-tile-page.mjs` — the page (headless Chromium)

Real pointer events, keys, clicks and downloads; every claim measured against the editor's
DRAWN marks, the downloaded bytes or the tile read back (validated in Node):

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
the same tile; P16 it survives a reload; P17 the rollers' view draws something.

Its negative control re-serves broken copies of `tile.js` (nine mutations: a drag ignoring which
copy it holds, a blocked edit not told, a click adding itself instead of its point on the curve,
Delete doing nothing, a double-click never deleting, a corner drag not holding the opposite
corner, the 3×3 never showing thin parts, the roller buttons ignoring a refusal, the design never
kept).

### 9.3 What the gates found

Red clauses, each fixed at its cause:

* the handedness defect (§3.2) — R and S;
* the simulator's window clipping B's columns at obtuse angles (§4.6) — R4, R5;
* the dough-depth law stated to the tip disk's centre while its rim reached 0.011 mm deeper — H2;
* a 30 mm tile's peg feet sunk into the hollow — H4;
* the gate's own H1 reading the hollow's radius as the body's (it scanned vertices) — found when a
  smaller roller's hollow fell under its window and the measurement became infinite;
* the page's double-click never reaching the point (the press redraws the editor) — P5;
* two page mutants that could not fire (a status set twice; a corner drag tested on the one
  corner whose opposite never moves) — the page gate's own negative control.

And one found by reading the peg geometry's limits rather than by a red: rollers of 2 repeats
of a 40 mm tile built a body of negative radius, silently. They are refused now, and W5 asserts
the refusal from the measured rolling radius.

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

1. **Crossbars, not rings** (§3.1) — printability. Reversing it would mean supports under every
   ring.
2. **Rims at the tip radius** (§3.5) — without them a crossbar roller bumps and its body hits the
   dough. They run on the board or cut a line in the border.
3. **The track is one tile row outside the block** (corner-registered) — so recurrences, if any,
   land on cut junctions, not in cookies. A track half a row out would save half a row of border
   but put any recurrence inside cookies.
4. **Corners resize; θ is a slider.**
5. **Corners default smooth.**
6. **A's orientation mark is a groove ring on its +Z end face.**
7. **No hollow-free cavity**: the body is a tube open to its bores, so it drains.
8. **The dough lies between the rims** (§3.5) — the rims ride the board. The alternative (rims
   riding on the dough) lifts every blade off the board.
9. **"Back, then forward"** for both rollers (§4.6) — one procedure for every angle.
10. **A roller too small for its bore is refused**, not clamped: a clamp would change the
    circumference, which is the one number the pattern is laid out on.
11. **The overhang flag is at 30° from horizontal**, an advisory threshold: a 1.2 mm wall
    printed at 0.2 mm layers steps out `0.2 / tan β` a layer.

Open: whether `n_A ≥ K_B + 2` should be enforced rather than flagged (it couples A's diameter to
B's length); the rims' width; the handle retention (friction only today); nothing has been
printed — every printability figure here is a declared rule of thumb, not a measurement.

---

## 12. Measured (the default design)

| | roller A | roller B | handle |
|---|---|---|---|
| diameter at the blades | 63.7 mm (body 47.7) | 63.7 mm (body 47.7) | grip 26 mm |
| length | 205 mm | 199 mm | 103 mm |
| clear span between the skirts | 181 mm | 175 mm | — |
| triangles | 21,420 | 18,220 | 1,536 |
| binary STL | 1.02 MB | 890 KB | 75 KB |

12 cookies a pass (4 × 3), field 160 × 120 mm; track row −1; 5 pegs on one bar of A, 5 teeth on
B's collar. Blade 8.00 mm above the body, peg dimple 2.20 mm, tooth 1.90 mm, collar band 6.80 mm
above the board — all read off the mesh. Block corners within 3.2e-14 mm of both lines, 20/20
line meetings, stamped lines within 2.3e-13 mm of their ideal over nine revolutions.

Cost in the page (Node, same code): the roller build 9–85 ms over the fixtures (63 ms at the
default, 85 ms for the jigsaw knob, the most points), the neck/spike raster 9–45 ms, a validation
0.2–2.8 ms — so the editor validates on every pointer move and rebuilds the rollers 120 ms after
the hand stops. The largest fixture STL is the jigsaw knob's roller A, 2.0 MB (41,660
triangles).
