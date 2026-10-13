# The bloom design file — save and load a design (Oct 13)

Feature map §11, Q3.9 (**DEFAULT** — a bloom design file ships BEFORE scoping). The bloom persisted
nothing; it now saves a `.json` and loads one back, through a file input or a drop anywhere on the
page. `bloom-file.js` owns the format; `bloom.js` owns only the buttons, the status line and the
events. **No geometry file changed** (`bloom-geometry.js` is sha-identical to `main`) and **no matrix
row was added** — the stamen-variance session in flight adds rows; this one adds none.

## 1. The format

`bloom-design` version 1, `app: "/bloom"`:

```
{
  "format": "bloom-design", "version": 1, "app": "/bloom", "savedAt": "...",
  "controls":  { "petalCount": 8, "placement": "RADIAL", ... },   // every registry control, verbatim
  "overrides": { "layers": [], "petals": [], "tiers": [] },        // per-scope OFFSETS — empty for now
  "curves":    { "spine": [], "outline": [] }                      // curve-editor control points — empty for now
}
```

The four rules are `/plot`'s composition file's (`plot-file.js`), carried over whole:

1. **One field table, walked by both directions.** `CONTROL_FIELDS` is one row per registry control,
   DERIVED from `CONTROLS` (never a second hand-written list of 207 ids). `composeDoc` writes by
   iterating it and `readDoc` reads by iterating it. What the table says is checked against the
   REGISTRY in the gate (F0): every registry control is a field or a named `CONTROL_EXCEPTIONS` entry
   (empty today), and every row names a live control. That is the written-down census — the writer
   and the reader agree perfectly about a row that is simply gone, so only an owner neither of them
   is can see it.
2. **Every scalar is a control's own value, verbatim**, in the registry's own kind, with the BOUNDS
   read off the registry row at the moment of reading (`min` / `max` / `step` / `options`). The file
   holds no bound.
3. **A missing field is reported and the page keeps what it has** — never defaulted. Every departure
   from a clean read is a note: `missing`, `unknown`, `invalid`, `clamped` (also snapped), `retired`,
   `migrated`, `not-applied`. A clean load's status line says *every field read clean, nothing to
   report*.
4. **A newer version is refused whole**, not partly read.

**Retired ids** load through `RETIRED_IDS`' own `migrateTo`: `stemNodeProminence` 0.45 lands on
`stemNodeSwelling` AND `stemNodeKink`, told as `migrated`. An entry with no migration (`centerStyle`,
the breadths, the sharpnesses, `lobeTipShape`) is told as `retired` and its value is not applied. A
file naming a retired id AND one of its replacements is a hand-edited file: neither is applied and
the note says so (the registry's `migrateControls()` throws on that case; a reader that throws on a
hand-edited file reports nothing, so the rule is restated over the same data with a note).

**Nothing retired is ever re-saved.** The registry's RETIRED_IDS comment asked "the first feature
that persists a design" for a migration that DELETES every retired key, because the flower's reader
preserves unknown keys verbatim. This reader does not: a save writes exactly the live controls and
an unknown key is reported and dropped. The obligation is discharged by construction, and the
registry comment now says so; `schema` stays `null` on every entry because the file's version lives
in `bloom-file.js` and is not that number.

## 2. The forward shape — why this ships before scoping

Scoping (Q3.1–Q3.6) makes per-layer, per-petal and per-tier values OFFSETS on the global value, and
F3 / F6 add curve editors. Both arrive as **added fields inside containers this version already
writes empty**: `overrides.layers` gains entries, `curves.spine` gains points, and a file written
today reads back in that version with no migration. This reader REFUSES TO APPLY anything found
inside a container — an entry is told `not applied: this page cannot read per-layer overrides yet`
— and a page that fills them and bumps the version is refused whole by rule 4, which is right: the
globals alone draw a different bloom from the one such a file describes.

## 3. The page

Two action rows under Reset / Get STL / Get grid: **Save design ↓** (downloads `bloom-design.json`)
and **Load design ↑** (a `<label>` over a hidden file input; `.json` dropped anywhere on the page
loads too). A load writes `doc.controls` into the inputs with the SAME real `input` + `change` events
the Reset button fires, so labels, visibility, the caps and the rebuild see a load as they see a
hand. `#designStatus` prints the outcome: `saved … — N controls, version 1`; `loaded … — N of 207
controls set; every field read clean, nothing to report`, or the notes one per line; `could not load
…: <reason>` on a refusal, which applies nothing. `window.__bloomDesign` (`save()`, `load(text,
name)`, `last()`) hands the gates the page's own functions, never a second path.

## 4. Verification

`node tools/verify-bloom-design-file.mjs` (in `bloom-panel.yml`, with its negative control):

| clause | what it measures | result |
|---|---|---|
| F0 | the table census against the REGISTRY; top-level keys, scopes and curves against a list written in the gate | 207 rows / 207 controls, 0 exceptions |
| F1 | compose(DEFAULTS) → every control verbatim, containers empty, reads back with 0 notes, every value `Object.is` / `===` | pass |
| F2 | every live matrix row: read(compose(state)) reports nothing and hands back every value identical | **1,302 of 1,302** |
| F3 | fifteen named rows (one per feature family; `--smoke`, `--full`), both modes: the geometry built from the round-tripped state is positionally identical under `Object.is` | 30 row-modes, 11,137,500 floats, 0 moved |
| F4 | fourteen written-down reader fixtures (missing, unknown, newer, wrong format, clamp, snap, bad choice, migration, retired + replacement, retired without migration, container entries, missing containers, no controls group) | pass |
| F5 | the page: the controls render outside `#panelControls`; the save carries exactly the registry ids in order; a load of the page's own save reports nothing and moves no control; a changed load moves state and geometry; a missing field keeps the page's value; a retired id migrates; a newer version is refused on the status line; the real file input and a real `DragEvent` drop load; save → reset → load exports the STL byte-identical (1,956,984 bytes) | pass |

**Six mutants** (`--negative-control`, every anchor checked before any runs): a field dropped on
write, a field skipped on read, a missing field defaulted, a newer version read, a retired id not
migrated, a table row removed. Each must redden exactly the clauses it names. Two things the first
sweep taught: **F3 can only see a dropped field on a row whose value is off the default** — a fresh
page fills a missing field from DEFAULTS, so the DEFAULT row cannot see it by construction; `ALL
MIN` (petalCount 3) is among the byte rows for exactly that reason — and the page clauses redden
more widely than first claimed (a save without petalCount restores the reset value after
save → reset → load, a reader that never reads it leaves every load one short), which were claimed,
not tuned out.

**Panel gate route (ad)** (`tools/verify-bloom-panel.mjs`): Save, Load and the status line render in
the panel and not among the registry controls, and the page's save holds exactly the registry's ids
— the every-control-is-a-field check with the REGISTRY as the census; one mutant (the table row
removed) under `--negative-control`, by its own sentence; twenty-four routes in the banner.

**Measured untouched:** `bloom-geometry.js` sha-identical to `main`; `buildMatrix()` 1,302 rows on
both trees. Read-back of the live matrix is what makes the byte claim a construction (the head is a
pure function of its state, `tools/verify-bloom-build-order.mjs`), and F3 measures a sample of it
anyway.

## 5. Decisions made without a ruling

- **The file name is `bloom-design.json`** and the format name `bloom-design`; a `.json` is told from
  anything else by its name (the `/plot` rule), and a non-design `.json` is refused by its `format`.
- **The containers' entry shape is NOT defined here** — only that they are lists. Defining an offset
  record before scoping is ruled would be a second definition of a thing scoping owns.
- **A load fires the control events in registry order**, so a choice that gates a slider's visibility
  lands before or after it exactly as the registry orders them; visibility never decides a value, so
  the order moves nothing.
- **A refused load leaves the previous status**: nothing is applied and the error replaces the line.
