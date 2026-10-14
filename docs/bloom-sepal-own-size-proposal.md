# Sepals get their own length and width — discovery and proposal (QA.1, §8A)

**Status: PROTOTYPE, WAITING ON EVA. Nothing in the generator moved; `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js` and the harness are untouched on this branch.** The ruling
(feature map §11 QA.1) is that a sepal has its own length and width and may be longer than the
petals. Today `sepalScale` (0.20–1.00) multiplies the petal's length AND width through
`slot.scale`, the sepal's foot (`outer.width × scale × breadth`) and the angle scan's seam step
(`state.petalLength * sepals.scale`), so a sepal's proportion is the petal's and it is never
longer than one.

The sheet is `docs/img/sepal-own-size-proto.png` (`docs/img/sepal-own-size-proto.json` beside it):
Node, EXPORT mode (print preview on), the deterministic soft renderer, sepals green, every caption
measured on its cell. Every cell is built on a PATCHED COPY of `bloom-geometry.js`
(`tools/scratch-sepal-own-size/patch.mjs`, two anchors, each required to match exactly once)
that reads `sepalLengthMm` / `sepalWidthMm` when they are set and is proved float-identical to
`main` on a stemmed, curled sepal state with neither set (379,800 floats, 0 differ, both modes).

## 4. The twin question first — what is there

`SEPAL_TWINS` holds fifteen pairs (tapers, tip shape, cup, cup gradient, buckle ×3, apex sweep,
roll, roll taper, spine curl, bias, start, twist) and **no length or width pair**. Its own
comment excludes size on purpose ("size (`sepalScale` scales the petal's length and width
together)"). Nothing hidden exists. And a twin cannot be the answer: `sepalTwinControls()` copies
the petal's own range and `SEPAL_TWIN_BOUNDS` may only NARROW it, so a twin of `petalLength` could
never reach past 60 mm or a twin of `petalWidth` under 8 mm. The two new rows are their own
controls (the `sepalAngle` shape), with their own `SEPAL_LENGTH_RANGE` / `SEPAL_WIDTH_RANGE`.

## 1. Units — recommend ABSOLUTE MILLIMETRES

- The leaf's precedent (ruling 5): a fraction of another organ is why proportions came out wrong.
- The ruling itself ("may be longer than the petals") is a statement about millimetres; a ratio
  with a ceiling past 1 re-couples the sepal to every petal size change, which is the coupling
  being removed.
- The stamen's length (F1.2) is already an absolute 5..120 mm; the leaf's 0..120 / 3..40. One
  vocabulary for "a blade's size".
- Measured on the wing family (angle −10, curl +120, bias 0.9, start 0.6, tapers 3/4, tip 0.6,
  5 sepals, default petals 35 × 16): the look §8A found only by forcing the petals to 60 × 8 is
  reached at 60 × 5 / 90 × 5 / 120 × 5 mm with the petals untouched (sheet, section 1).

## 2. Ranges — propose length 5..120 mm, width 3..30 mm; the reasons are not round numbers

Measured over 8 lengths × 7 widths at the wing pose (`tools/scratch-sepal-own-size/grid.jsonl`):

| what | reading over 21..150 mm × 3..16 mm |
|---|---|
| gap (`sepal-self`, the 1.00 mm bar) | **1.242–1.265 mm on every cell** — flat; the sepal's self-approach is its own curl's and length does not bring it closer |
| within-shell census | **0 pairs on every cell** |
| triangles | **3,062 a sepal at every size** (the lattice is fixed); 40 × 40 at 90 × 30 mm reads the same 363,834 as at 60 × 30 — the budget corner is NOT a lever and `ALL MAX` cannot move (the new rows are `SEPAL_SUBS`, out of the blanket sweep) |
| bounding box (default petals) | 81 mm today → 96 at 60 × 5 → 136 at 90 × 5 → **175 at 120 × 5** → 215 at 150 × 5; 203 at 120 × 16 |
| drawn length at tip shape 0.60 | a narrow blade meets the 0.8 mm floor early: **90 asked draws 66.9 at 5 mm wide, 58.4 at 3, 48.8 at 2** (the stub's share is a width question, 15–21 % here) — the asked length stays the slider's, the read-out should say the drawn one |

So neither the gap nor the census sets a ceiling anywhere in the range; what does is the box
(the skill records 180 mm as dyed PA12's cap on the longest axis: 120 × 5 lands at 175 mm, and the
stem's own 120 mm ceiling already sits on the same figure) and the leaf's / stamen's 120. **Width
floor 3 mm** is the leaf's own floor and the narrowest cell that still reads as a blade (at 2 mm the
blade is a stub plus a foot; the 1.6 mm foot floor and the 1.6 mm tip stub meet). **Width ceiling
30** is `petalWidth`'s own top. **Length floor 5** keeps today's 0.2 × 20 = 4 mm reachable to within a
step and matches the stamen's floor.

**The angle limit does NOT bind the wing pose, and where it reads is the finding.** At every
length the asked −10 / 0 / −25 builds as asked; the limit is an UPPER limit (+17 today). It then
READS HIGHER WITH LENGTH — +17 at 21 mm, +22 at 60, +23 at 90, +24 at 120, **"+90 = no contact in
the range" at 150 × 5 and at 120 × 5 with 8 sepals** — and that is not the geometry clearing, it is
the scan going blind: `laminaFromPanels` drops the sepal's rows at `u < ROOT_BLEND_END` (0.30), a
FRACTION of the sepal's own length standing for the physical root-overlap region, so the excluded
stretch grows from 6 mm at 21 mm to **45 mm at 150**, which is exactly where a long sepal meets the
35 mm petals. With only the foot rows dropped the limit reads +14 / +14 / +14 / +16 / +19 / +20 over
21..150 (`tools/scratch-sepal-own-size/blind.mjs`). The sheet's "angle +40 asked" cell shows it:
built at the "limit" 24, the 120 mm sepals stand up through the petals. **Mode-and-sampling rule:
derive the exclusion from a LENGTH (mm from the ring), never from a row fraction — the build
session's first job, before the ceiling means anything.** (Keeping every root row over-counts the
by-design root overlap at 21 mm: 14 against 17; the right stretch is in mm and is to be measured.)

## 3. Migration — recommend KEEP `sepalScale` LIVE, mm rows default to 0 = "the petal's × size", win when set

Three options costed:

| option | mechanism | frozen rows (248 naming `sepalScale` + 31 `ALL MAX` + every sepal row) | saved designs (every file since 57f64f7 carries `sepalScale`) | cost |
|---|---|---|---|---|
| **A. keep `sepalScale`; `sepalLengthMm` / `sepalWidthMm` default 0 = follow the petal × size (a BRANCH); when a mm row is > 0 it wins for its axis and `sepalScale` hides (Q3.5's "per-layer wins, the global hides")** | no migration, no `RETIRED_IDS` entry | **bit-identical by construction** — no stored set names the new ids, so every one builds through the branch it builds through today | identical: a file without the field is reported missing and the page keeps 0 | one sentinel on each mm slider (the leaf's `leafLength 0` guard shape); `sepalScale`'s fmt must say what it still owns; the foot keeps `outer.width × scale × breadth` until the width row is set, then `× (sepalWidthMm / petalWidth)` — one owner, one branch |
| B. retire `sepalScale`, computed migration `sepalLength = petalLength × scale` | `migrateTo` is DATA (copies a value) and cannot express a product; needs a new declarative rule kind in `RETIRED_IDS` applied over the FULL state (a frozen row's set lacks `petalLength`, so `ALL MAX`'s 60 × 0.6 = 36 only comes from the merged defaults) | the eight frozen values (21, 9.6, 7, 3.2, 35, 16, 36, 18) are exact doubles, so predicted identical — a prediction, to be measured | **NOT identical in general**: 265 of 697 reachable (length × scale) products and 144 width products are not the double the page's range input sanitises them to (measured), so a design at e.g. 37 × 0.65 moves by one ulp through the browser | a new migration mechanism, a step of 0.05 on both mm rows, `ALL MAX`'s live set rewritten, the panel route (n) and `bloom-file`'s reader taught the rule, and a byte gate over all 1,404 stored sets |
| C. retire `sepalScale`, absolute defaults (21 × 9.6), no migration | the id refused on load | **moves `ALL MAX` in all 31 phases** (its sepals are 36 × 18 today) and every size-pinned row | a design's sepals re-size | cheapest to write, fails the ruling's own condition |

A is the only option that is byte-identical by construction rather than by measured luck of the
stored values, and it is the shape Eva already ruled for per-layer size. Its price is honest: two
ways to size a sepal exist in the file for as long as `sepalScale` exists, told on the panel.

## What the build session owes after the ruling

The exclusion in mm (above); `sepalLengthMm` / `sepalWidthMm` as own rows in `Sepals`, out of the
sweep as `SEPAL_SUBS`; the seam-step producer at `sepalAngleLimit` reading the substate (the second
producer of the sepal's length — found here, patched in the prototype); the foot law's branch; SP5
re-derived onto the new owner; block 35 rows at both ends; the combination gate's
`sepalscale-x-sepalcurl` pair re-pointed; a frozen phase (rows added) registered at `main`'s
newest number at the time.
