# The stigma's seven and the generator, session 30 (tip plan 4) — one table, two tips, JG6, `frozen/phase19`

Session 24 ruled the parametric tip in eight parts and sized it at four sessions. Session 26 was
the primitive (zero controls), 27 lifted the nesting bound and derived the census, 29 shipped
the anther's seven **authored plainly, no generator**, on the grounds that "instanced twice" was
not yet observable. **This is session 4: the stigma's seven, instanced from the anther's spec
through the one-table generator, and the anti-drift witness that can finally fire.** Building on
`96f2d40` (#179) and `eb3543f` (#183). The lattice-jump fix is session 31 and is not here.

---

## What ships

Fourteen controls from **one table**. `TIP_DESCRIPTORS` in `bloom-registry.js` states the seven
descriptors once — kind, bounds (imported from the geometry's `TIP_*_RANGE`), step, family
default, label, tier, role, and a read-out that takes the *instance* as a fourth argument.
`TIP_INSTANCES` states what varies: the id prefix, the section and its parent, the presence
predicate the seven are gated on, the words the read-outs use, where in the shown build's record
the owner's numbers live, and the two defaults that make a trifid a trifid (`Lumps`, `Spread`).
`tipControls(instance)` is called once per instance from inside `CONTROLS`; it refuses an
instance that overrides a default outside `TIP_PER_INSTANCE_DEFAULTS`, so a per-instance number
that reached a shared field is a load-time error, never a drift.

| control | anther | stigma | default |
|---|---|---|---|
| Size | `antherSize` | `stigmaSize` | 1.60 (`ANTHER_DIAMETER_FACTOR`) |
| Elongation | `antherElongation` | `stigmaElongation` | 2.50 (`ANTHER_LENGTH_FACTOR`) |
| Roundedness | `antherRoundedness` | `stigmaRoundedness` | 1 |
| Points | `antherPoints` | `stigmaPoints` | 4 |
| Sharpness | `antherSharpness` | `stigmaSharpness` | **1.00** (`TIP_SHARPNESS_DEFAULT`, both) |
| Lobes | `antherLumps` | `stigmaLumps` | **1** / **3** (`STIGMA_LOBES`) — per instance |
| Lobe spread | `antherSpread` | `stigmaSpread` | **0** / **40°** (`STIGMA_LOBE_SPREAD_DEG`) — per instance |

The two tip drop-downs are `antherTip` ("Anther", inside Androecium — session 29's `tip`,
renamed; `section` is never persisted) and `stigmaTip` ("Stigma", inside Gynoecium), each
produced by `tipSection(prefix)` from the same instance table and declared **in render order**
directly after its parent, because the panel gate's census compares document order against the
`SECTIONS` array. Two sections both labelled "Tip" would have shared a name on screen, which the
gate refuses.

**The generator has THREE owners, one per layer, and that is the design:**

- **Geometry** — `tipDescriptor(state, prefix, diameter)` in `bloom-geometry.js` is the one
  place the seven controls become a tip record (size, length, shape, floor, lattice, count,
  spread, the three flags). `footRing()` calls it once for the anther on the filament's diameter
  and once for the stigma's lobe on the style's. `TIP_SHAPE` and `TIP_SHARPNESS` — the frozen
  object the stigma read from session 26 to 29 — are **retired**; nothing imports either.
  `STIGMA_LOBES` and `STIGMA_LOBE_SPREAD_DEG` are the two controls' *defaults* now, imported by
  the registry and asserted paired at harness load, exactly as the anther's two factors were in
  session 29.
- **Registry** — the table and the instances above.
- **Harness** — `tipSevenClauses(tag, who, prefix, record, ui, t)`: session 29's JS7 body with
  the prefix as a parameter, called as **JS7** on the anther and **JG6** on the stigma's lobe.
  One statement for both tips; it also asserts the record was built from the *right* prefix
  (`a.prefix`), so two tips crossed in `footRing()` fail by name.

### The naming deviation, stated

The brief said `antherTip*` / `stigmaTip*`. The ids shipped are `anther*` / `stigma*`, and the
*sections* are `antherTip` / `stigmaTip`. Renaming the anther's seven one session after they
shipped would have retired seven ids into `RETIRED_IDS` and moved every one of phase18's 21
anther rows, whose definitions name `antherSize` and the rest — a frozen matrix pins row
definitions, and a rename is a definition change. The prefix is the instance's one word and
"Tip" is the section's; the ids read `antherSize` inside `Androecium ▸ Anther`, which is what
the panel shows.

---

## The anti-drift witness, and its negative control

The panel gate's *instanced descriptor families share one spec* clause (session 27) has its
second family. For `/^(anther|stigma)(Size|…|Spread)$/` every suffix must have exactly two
instances agreeing on kind, bounds, step, label, tier, role and options, and on `default` for
every suffix **except** `Lumps` and `Spread` — the partition is stated in the gate, not read
from the registry's table (a check that reads the generator's own declaration is checking the
generator against itself). A per-instance default is still bounded by the shared range.

**The mutation the brief asked for**: `--negative-control` drifts `stigmaSize.max` by one in a
*copy* of the rows and requires the clause to fire. It does:

> NEGATIVE CONTROL: the instanced-family clause fired on a drifted stigmaSize range — "Size" has
> 2 distinct specs across its 2 instances — antherSize vs stigmaSize

On the shipped tree the clause reads `7 descriptors x 2 instances = 14 controls, one spec each`.
The harness's module-load table is the second half of the same guard, per prefix and per suffix
— range equal to the geometry's, default equal to the expected constant, section equal to
`${prefix}Tip` — plus a stray check that fails load on an eighth `anther*`/`stigma*` control the
harness does not know. (It fired once, on `antherSpread`, because a default of `0` is falsy and
the first draft tested truthiness instead of membership. Fixed with `in`.)

---

## The stigma's sharpness default — RE-DERIVED, and the premise checked

Eva's instruction: *"Do not copy 1.00 from the anther … a trifid lobe is a different size, so the
floor binds at a different sharpness."* The premise was checked before the value was chosen and
**it does not hold on this tree**: a stigma lobe is `ANTHER_DIAMETER_FACTOR × thickness` with the
style one sheet thick, exactly as the anther is `antherSize × thickness` with the filament one
sheet thick — `partRadius` is the one owner of both rods' radius since session 24 — so the lobe
radius *is* the anther's: **0.96 mm** on the default 1.20 mm sheet, in both modes, since the
export floor only raises a sheet under `MIN_FEATURE_MM`.

The floor `s ≥ 1 / (½ − log₂((need − ρ)/(1 − ρ)))`, `need = 0.50 / a`, depends on that radius
and roundedness alone. Computed at the stigma's own dimensions (`scratchpad/floor.mjs`, the
table below at ρ = 0):

| sheet (mm) | lobe radius a | floor binds below s = | waist at 0.50 | 0.75 | **1.00** | 1.25 | 1.50 | 2.00 |
|---|---|---|---|---|---|---|---|---|
| 0.60 live | 0.480 | UNDER — no sharpness saves it | 0.170 | 0.269 | 0.339 | 0.390 | 0.428 | 0.480 |
| 1.00 (the export floor, i.e. any sheet ≤ 1.00 in export) | 0.800 | **0.849** | 0.283 C | 0.449 **C** | **0.566** | 0.650 | 0.713 | 0.800 |
| 1.20 (default, both modes) | 0.960 | **0.694** | 0.339 C | 0.539 | **0.679** | 0.780 | 0.855 | 0.960 |
| 2.40 | 1.920 | 0.410 | 0.679 | 1.078 | 1.358 | 1.560 | 1.711 | 1.920 |

(C = clamped by `tipSharpnessFloor`.) At ρ = 0.25 the default sheet's floor is 0.508, at 0.50 it
is 0.197, at 0.75 it never binds.

**So the floor binds at the same sharpness on both tips, and the derivation lands on the same
number for the same reason.** 1.00 is the largest *named* value (the `|cos| + |sin|` family)
clear of the floor on the default sheet (36% headroom against 0.75's 8%) — and, a corner the
session-29 ruling did not print, **on any sheet the export floors to 1.00 mm the bound moves to
0.849, where 0.75 clamps and 1.00 still clears by 13%.** That is the argument for 1.00 over 0.75
that survives the thinnest printable sheet. It ships as **one constant**, `TIP_SHARPNESS_DEFAULT`
(renamed from `ANTHER_SHARPNESS_DEFAULT`, which named one tip), because it is one derivation on
one radius; a second constant with the same value would be exactly the drift this session
exists to make impossible. **A different stigma value is one per-instance default in
`TIP_INSTANCES` the day Eva rules it** — the mechanism is built; the sheet's third group is the
space either side (0.50, 0.75, 1.00, 1.25, 1.50, and the thin-sheet 0.75) for that ruling.

**A correction made on the tree, recorded rather than smoothed.** The first draft of this
derivation said 0.75 "clamps in export" *on the default sheet*, having applied the 1.00 mm floor
to a 1.20 mm sheet. The sheet's quick run refused it: the 0.75 cell read `waist 0.54 mm` clear,
in export. The floor only raises thinner sheets, so the export-mode claim is the thin-sheet
corner's, not the default's. The comment, the sheet and this doc say so now; the conclusion did
not change, its scope did.

---

## 0 moved is a CONSTRUCTION, and here is the construction

Every default reproduces today's trifid and today's pill **by the expressions' own form**:

- `size * diameter` stands where `ANTHER_DIAMETER_FACTOR * diameter` stood, and
  `elongation * size * diameter` where `ANTHER_LENGTH_FACTOR * ANTHER_DIAMETER_FACTOR * diameter`
  stood — same two products, same order, same doubles (`(e * s) * d` is not `e * (s * d)`).
- `spread * D2R` stands where `STIGMA_LOBE_SPREAD_DEG * D2R` stood; `Math.round(3)` is 3.
- Roundedness 1 makes the blend `1 + 0 * h`, exactly 1 for any finite `h`, and `tipSides()`
  returns the rod's own ten — so the stigma's sharpness moving from the frozen 2.00 to 1.00
  reaches **nothing emitted**. That is the same sentence session 29 wrote for the anther.
- The anther's record now comes through the same function; its expressions are term for term
  what session 29 shipped.

**Measured, not argued** — `frozen/phase19` (549 rows at `eb3543f`, the newest baseline, the
first carrying the anther's seven as controls) exported on a worktree of the base commit and on
the final tree: **549/549 byte-identical, 0 moved** (`diff-bloom-bytes --compare`, the base worktree at `eb3543f` against this tree; the two exports ran in parallel on one machine, so both sides are in the same state). And the sheet's before/after pair from the base worktree: same
triangle count (14,400), the STYLE line's numbers identical, `macro` 0 px against a 0 px
control.

---

## JG6, JG4, and what changed in the gynoecium's family

- **JG6 is the new family**: `tipSevenClauses('JG6', 'the stigma lobe', 'stigma', G.lobe, ui, t)`.
  A trifid built perfectly from the wrong seven passes JG4 and JG5; JG6 is the only witness.
- **JG4** stops reading constants. Session 22's three fixed-constant clauses (three lobes, 40°,
  the anther's fixed proportion) are retired *into* JG6; the trifid property is asserted from the
  descriptor's `lumps` and `spreadRad` (which JG6 holds to the controls); the census is
  `tippedRodTris(lumps, sides)`; the azimuth step is asked only above one lobe and off a spread
  of 0; and *distinct apexes* became a **biconditional with `lumpsCoincident`** — three lobes at
  a spread of 0 share an apex by the law and the read-out says so.
- **JG5** drops session 29's hard-wired-`TIP_SHAPE` clause, as that session said it would.
- **Census**: `node tools/bloom-smoke.mjs --check --negative-control` — **41 families, all 41
  claimed, both directions** (was 39 + JS7 + JG6 = 41). The scanner learned the second helper:
  `tipSevenClauses(tag, …)` pushes under its caller's tag, so `FAMILY_TAGGED` matches
  `tip(?:Seven)?Clauses(`. Without that, JS7 would have vanished from the roster the moment its
  literal `bad.push(\`JS7:` sites became `${tag}:` — the census caught exactly nothing there
  because the pattern was extended in the same edit, which is the right order.

---

## Matrix block 26 and `frozen/phase19`

Block 26 (22 rows) is block 25 on the other tip plus what only the stigma has: the circle's own exponent (sharpness exactly 2.00 at roundedness 0 — the singular point, pinned because the sheet found JS6/JG5 firing on it), **one** lobe (a
pill on the style — the anther's own default shape), six at 90°, the trifid's own COINCIDENT
corner (three at a spread of 0), the four outline shapes and the floor, the lattice extremes,
the 120-anther cushion around a shaped stigma, the mum, the fat style, the INERT row, both GATED
directions — and **THE FAMILY row**, the same seven on both tips at once (3-point stars at
sharpness 1, roundedness 0, six anthers around the trifid), which is the pair the sheet puts in
front of Eva. Live matrix 549 → **571**.

`phase19Matrix()` is `eb3543f`'s own `buildMatrix()` (549 rows), generated from a worktree and
proved deep-equal by `--verify-frozen --phase19` (PASS, locally and in CI). `FROZEN_BASE_COMMITS`
gains `phase19: 'eb3543f'`; `diff-bloom-bytes` gains `--phase19`. A phase IS owed: the row set
changed. `frozen/phase19` is published by the `bloom-frozen-tags` workflow after the merge, and
`phase5` will still refuse (the workflow-tree limit in that script's header).

---

## The panel, the read-out, the smoke subset

- Route (t) reads `#sec-antherTip` (was `#sec-tip`); the WITNESS map carries `antherTip` and a
  new `stigmaTip` entry (`stigmaPoints` at 12 with a style present at roundedness 0, read as the
  triangle count beside the lobe's own lattice). The gate's first run failed on three things and
  all three were the tool being right: sections declared out of render order, an unwitnessed
  collapsed section, and the accordion route confused by the first. Fixed at the declaration.
- **A STIGMA line** joins the read-out, from the same `tipLine()` the ANTHER line comes from; the
  ANTHER line's text is character for character what session 29 shipped (route (t) parses it).
  The STYLE line names the stigma's count and aim from the descriptor and points at its own line.
- Smoke block 26: six rows (the triangle, the floor, one lobe, coincident, THE FAMILY, INERT)
  claiming JG6 and the JG4/JG5 arms they engage. Blind, stated in its header: the two proportions
  off their constants on the stigma, the lattice extremes, the leaning corner, the 120-cushion
  and the fat style are live-matrix rows.

---

## The sheet — `node tools/shot-bloom-stigma.mjs <dir> [base-tree] [--quick]`

Five groups, every row with its own same-tree control at three scales (`whole`, `lens` 16 mm,
`macro` framed from the stigma's own extent), print preview on, JS0–JS7 and JG0–JG6 before every
shutter. **No pixel claim on `whole` or `lens`** — the control there is bimodal (it read 0 px on
one run of the reference row and 5,826 px on another, same tree, same camera). The exact claims
carry the weight:

1. **Today's trifid at rest**, six stamens and 120 on the disc — the reference cells.
2. **The new sharpness opened**: roundedness 0 at the default 1.00, at both count extremes, and
   the circle it replaces (sharpness 2.00 at roundedness 0 — the lattice jumps, the form does
   not, which is session 31's brief).
3. **The space either side**: 0.50 (CLAMPED, asserted), 0.75, 1.00, 1.25, 1.50 (asserted clear),
   and the thin-sheet corner where 0.75 clamps (asserted).
4. **The pair**: the same seven on both tips; one lobe on the style beside six pills; six lobes
   at 90°; trifid anthers.
5. **INERT**: 12 points at sharpness 0.25 with roundedness 1 — the trifid's triangle count and
   STIGMA line character for character, `macro` inside the two rows' own controls.

Plus the before/after pair from the base worktree, predeclared to hold (above).

**Two instrument defects found on two rows, not on the grid** (the charter's rule, followed):
the STYLE-line comparison cut the line at the new clause instead of removing it; and the macro
frame computed from the tip at 1.3× the sum put the default trifid at a **10 mm** radius — wider
than the 8 mm lens, so the two views coincided. Framed from the stigma's own extent, centred half
a lobe above the tip, it is 5.4 mm. Neither was about the bloom.

Sheet results: FILLME_SHEET.

---

## What this session is blind to, or did not do — stated

- **The lattice jump** (10 → 16 sides the moment roundedness leaves 1, at any sharpness) is
  session 31's, ruled so; it moves bytes and gets its own commit. The sheet photographs it in
  group 2's third cell.
- **The `gynoecium` choice's read-out at NONE** lists the style's kept settings and not the
  stigma's seven. Adding them is one `fmt` edit; left, to keep this diff to the generator.
- **`tools/verify-bloom-tip-bytes.mjs` is untouched and not run** — its rows predeclare that the
  trifid *moves*, which was true of session 26 and false here; it would fail its own vacuity
  guard for the right reason.
- **`tools/verify-bloom-presentation-only.mjs` is not run** — its registry-deep-equal clause is
  false by design on a tree that adds seven controls; the byte claim is phase19's.
- **`tools/shot-bloom-gynoecium.mjs`'s page text** still says the stigma is "ONE shape (S2
  TRIFID, FIXED) … never controls". It renders session 22's cells and is untouched; the sentence
  is now history rather than description.
- **The default is still the bare apex** (no androecium, no gynoecium), so the shipping export is
  byte-identical trivially; the stigma's seven are reachable only with a style present.
- **The diff is past the stopping rule's line**: 1,152 insertions / 312 deletions across seven
  code files, of which 549 are phase19's generated rows and roughly a third of the rest is
  comment prose moved with the code it describes. The rule's trigger — past ~600 *before the
  assertions are green* — did not fire: the census, the frozen check, the export gate on block
  26, the panel gate in both directions and the quick sheet were green before the docs were
  written. Said here because the number is over, whatever the reason.

---

## Predeclared untouched, verified on the final tree

Named before the first edit and re-verified by `git status --porcelain` at the close: the session
touched exactly **seven code files** — `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`,
`tools/bloom-harness.mjs`, `tools/bloom-smoke.mjs`, `tools/diff-bloom-bytes.mjs`,
`tools/verify-bloom-panel.mjs` — added `tools/shot-bloom-stigma.mjs` and this doc, and edited
`CLAUDE.md` and `docs/bloom-charter.md`. **Everything else is untouched: 220 tracked files under
the bloom, flower, print, plot, cards, tracker, `tools/` and `.github/workflows/` trees**, among
them `bloom.html`, `bloom.css` (the third-level rule already covers a second third-level
section), `bloom-view-presets.js`, `bloom-grid-gltf.js`, `tools/bloom-crowding.mjs`,
`tools/bloom-plan-coverage.mjs`, `tools/bloom-solid-angle-coverage.mjs`,
`tools/verify-bloom-export.mjs`, `tools/verify-bloom-connectedness.mjs`,
`tools/verify-bloom-grid.mjs`, `tools/verify-bloom-tip-bytes.mjs`,
`tools/verify-bloom-presentation-only.mjs`, `tools/publish-frozen-tags.sh`, all twenty-two
`tools/shot-bloom-*.mjs` that existed before this session, and all six
`.github/workflows/bloom-*.yml`.

**Both STL gates and the connectedness gate are UNTOUCHED**, so the export gate that passed block
26 is the one that shipped at `eb3543f`; what changed in the harness they import is the tip
module-load table, `tipSevenClauses`, JG4/JG5/JG6, block 26, `phase19Matrix()` and the
singular-point exemption in `tipClauses`.

---

## The close

| instrument | result |
|---|---|
| `diff-bloom-bytes --compare` (phase19, both trees) | **549/549 byte-identical; 0 moved** — the base worktree at `eb3543f` against this tree |
| `diff-bloom-bytes --verify-frozen --phase19` | **PASS** — deep-equal to `eb3543f`'s own `buildMatrix()`, 549 rows |
| `verify-bloom-export.mjs --only "^STIGMA:…"` | **25/25 watertight**, identical live/export counts, 0 degenerate — all of block 26 plus four control rows |
| `verify-bloom-panel.mjs` | **PASS** — 191 ok lines, including the tip family's one-spec clause and both tip witnesses |
| `verify-bloom-panel.mjs --negative-control` | **all fifteen routes observed their failure**, and the tip family's clause fired on the drifted `stigmaSize` |
| `bloom-smoke.mjs --check --negative-control` | 50 rows over 22 blocks of 571; **41 families, both directions**; census negative control PASS |
| `bloom-smoke.mjs` (50 rows) | **50/50 watertight, identical live/export counts, 0 degenerate** — on the final tree, 270 s; 4 rows CROWDED-flagged (the mum rows, expected) |
| `shot-bloom-stigma.mjs --quick` | PASS — pair HELD (macro 0 px vs 0), both clamped cells CLAMPED |

**Triangle counts, live = export:** a style at rest with six stamens **14,400**; a shaped
stigma (16 or 12 sides) **14,760**; THE FAMILY row **14,760**; the INERT row **11,040** (the
trifid alone at rest); GATED with NONE **10,080** (the shipping default, unchanged).

WAITING ON EVA: the sheet's ruling — does the pair read as one family, and does the stigma keep
the family's 1.00 or take its own value?
