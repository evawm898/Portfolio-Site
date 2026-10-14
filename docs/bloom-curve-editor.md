# The curve editor — the bloom panel's `curve` control kind

*Session of Oct 14. Feature map §4, §5, §6 and §11 (Q4.1, Q4.4, Q6.1, Q3.x). No geometry consumer
yet: F3 (the spine) and F6 (the outline) wire into this in their own sessions.*

**`bloom-geometry.js` is untouched, no matrix row was added, and no live control uses the kind.**
What shipped is the kind, its one value shape, its one sampler, the widget, the design file's
field-kind row, a capability hook to mount it, panel-gate route (af) with five mutants, a design-file
clause (F7) with a mutant, and a contact sheet.

## 1. The rulings it supports (not re-litigated)

| Ruling | Where it lives |
|---|---|
| Points draw a curve's SHAPE in 2D; points can be added and removed | `bloom-curve.js` value shape and edit ops; the widget's gestures (§4) |
| Points are FRACTIONS of the owning length | every coordinate is a fraction; `spec.owner` names the length control; `curveSamples(v, spec, { lengthMm })` is the one place a fraction becomes mm |
| A consumer can REFUSE a drag; the point does not move past what it rejects, no clamp-and-tell inside the widget | `proposeEdit` is the one decision; a refused edit returns the value unchanged; the widget adds no clamp |
| Symmetric (one half mirrored) and two-sided (two independent curves); two-sided -> symmetric mirrors the LEFT side | `switchMode`; `points` is always the left side |
| Per-scope: a curve is a VALUE the scoping model and the design file can hold, not page state | the value is a plain JSON object; the editor holds nothing else but a drag in progress and a focus |

## 2. The value and the spec

```
{ mode: 'symmetric', points: [[x, y], ...] }
{ mode: 'two-sided', points: [[x, y], ...], right: [[x, y], ...] }
{ mode: 'single',    points: [[x, y], ...] }
```

- `points` is ALWAYS the left side (in `symmetric`, the half the mirror is made from). `right` is stored
  in the same convention (distance from the axis, not negated), so a mirror is the identity on stored
  numbers and only the display reflects it.
- **`single` is a decision made without a ruling.** Neither ruling names it; it is what F3's spine
  needs (one curve, signed y, nothing to mirror — a fiddlehead doubles back). It costs one mode string,
  and a spec that does not list it cannot reach it. `curveSpecProblems` refuses a spec listing `single`
  beside a mirrored mode.

A registry row of kind `curve` carries a `curve` spec and an optional `validate(candidate, ui)`:

| Field | Meaning |
|---|---|
| `modes` | the modes offered; the first is the reset mode |
| `x`, `y` | `[lo, hi]`, the box a point lives in, as fractions of the owning length |
| `lock` | `{ first, last }`: `'x'` holds that end's x at the box edge (the curve spans the length), `'xy'` holds the point entirely |
| `monotoneX` | a FUNCTION curve — the outline's h(u): points strictly increasing in x AND the samples never folding back |
| `points` | `[min, max]` control points per side |
| `owner` | the owning length control (a slider id), for display |

`verifySections` checks at module load that a curve row's spec is well formed, its default is a curve
it can hold, and its owner is a live slider. `CONTROL_KINDS` (`slider` / `choice` / `curve`) is the one
list of kinds; every row's `kind` must be in it.

## 3. The law — one sampler, two arms, the spec chooses

`sampleCurve(points, spec)` is the one owner of a curve value's drawn curve, and `curveSamples` is the
front door F3 and F6 call. They must never re-implement it.

- **A 2D shape** (no `monotoneX`, e.g. a spine) takes **centripetal Catmull-Rom** (alpha 0.5) with
  mirrored phantom ends. This is /bug's `sampleOutline`, ported rather than imported: the bloom imports
  nothing from /bug, and a change on either page must not move the other.
- **A function curve** (`monotoneX`, an outline) takes the shape-preserving **monotone cubic**
  (Fritsch–Carlson PCHIP, /frame's profile law). **This is a measurement, not a preference.** Over
  20,000 random point sets with x strictly increasing and both ends on the box edges, centripetal
  Catmull-Rom's samples fold back in x on **6,176 (30.9%)**, almost all at the ends where the mirrored
  phantom drives the curve past x = 1 and back. PCHIP folds on **0 of 20,000**: x is linear in each
  span, and y never overshoots its two points.
- Either way, the shape rule (`curveShapeRefusal`) checks the samples on every edit (no fold, inside
  the box), so the property is measured rather than assumed of the law.

## 4. The widget

`makeCurveInput` in `bloom.js`. The element behaves like an input: `.value` reads a COPY of the curve
and writes one (a write fires nothing), and a hand's edit fires `input` (during a drag) and `change`
(at its end). So the generator, `readUI()`, Reset, a design-file load and a scope load need no curve arm.

Every edit goes through `proposeEdit`. That covers a drag step, an add, a remove, a nudge and a mode
switch. **A refused edit leaves the value as it was.** The status line under the editor says why, in
the validator's own words, and the refused point is ringed while the drag lasts.

**The gestures, decided without a ruling and listed so they can be changed:**

- **Mouse:**
  - drag a point;
  - double-click on the drawn curve, within 8 px, to add a point there;
  - double-press a point, or right-click it, to remove it.
- **Keyboard, with the editor focused:**
  - `[` / `]`, or Home / End, pick a point;
  - the arrows nudge it by 0.005 of the owning length (Shift: 0.05);
  - `+` or Insert adds a point on the curve after it;
  - Delete / Backspace removes it.
- **Modes:**
  - in `symmetric` the mirror is drawn dashed and has no handles;
  - in `two-sided` the left side is above the axis and the right side below it, each with its own handles.

**Two measured findings shaped the gesture code:**

- **A double-click on a handle never arrives as `dblclick`.** After a pointerdown whose default is
  prevented and which captures the pointer, Chromium delivers no click or dblclick. The events reach
  the svg as pointerdown / pointerup only. So a double press is detected inside pointerdown (two presses
  within 450 ms on one handle). The first cut removed nothing.
- **Handles are hit-tested by screen distance, never by the event's target.** The editor re-renders on
  pointerdown, so the second click lands on a new element.

**Every stored number is a fraction of the owning length.** The pointer is read in the SVG's own
viewBox, which IS the fraction box. It is quantised to `CURVE_GRID` (1e-4 of the length, 3.5 µm on the
shipping petal) and stored. Millimetres appear only in the caption under the editor
(`box 35.0 × 14.0 mm of Petal length 35.0 mm`), which re-renders on every rebuild so it follows the
owner live. A file's own value is never rounded (bloom-file.js rule 2); only a hand's edit is quantised.

**What the widget does NOT do:**

- **It is not a drag in the F7 sense.** The drag-light build engages on a range input. A curve drag
  triggers the full build on every input, and that is F3's to decide once a curve moves geometry.
- **It has no curvature overlay** (feature map §6's "dead or clamped overlay"). The ruling is refusal,
  so the boundary shows as the point not moving plus the told reason. A drawn limit belongs to the
  consumer that owns the limit.

## 5. The design file

`FIELD_KINDS` in `bloom-file.js` has one row per registry kind. Each row is `{ write, read }`, and
`coerceField` dispatches on it.

**The curve row:**

- **Writing:** the value is written verbatim.
- **Reading:** it goes through `readCurveValue`. A curve the spec cannot hold is REFUSED WHOLE and told
  (`not a curve this control can hold — <why>; the page keeps its curve`), never clamped point by
  point. Clamping one point of a shape can make a shape the rule refuses, and a curve is one value.
  This is rule 2's "verbatim", stated for a kind whose bounds are a shape rather than a range.
- **The walkers:** `composeControls` / `readControls` are now exported, together with `fieldFor(descriptor)`
  for a row outside the registry. `composeDoc` / `readDoc` walk `CONTROL_FIELDS` with them, so the
  test mount's one-row table is walked by the shipped code.

**THE BRIEF SAID "ADD THE ROW".** With no live curve control, `CONTROL_FIELDS` (derived from the
registry) has no curve row to add. **The row added is the KIND's** (`FIELD_KINDS.curve`), so the day F3
adds a curve control it is a field of the file automatically. F0 now holds `FIELD_KINDS` to
`CONTROL_KINDS`, both directions. The alternative was a parked, never-shown registry row of kind curve:
a dead control every saved file would carry, whose id and default F3 would inherit. It was not taken.
**This is a reading of the brief, made without a ruling.**

**A finding for F3: the `curves` container.** The design-file session wrote `curves: {spine, outline}`
empty, as a future home for curve points. The ruling that a curve is a VALUE a scope can hold puts a
curve control's value under `controls`, like every other control's. The container is still written
empty and its entries still told "not applied". Whether it retires or gains a meaning is the first
session with a live curve control's to decide. Nothing was changed here.

**Scoping:** a scope entry's `offsets` are DELTAS on sliders, and the reader refuses any other kind by
name (`a curve has no offset`). A per-scope curve is an ABSOLUTE value (an offset on a shape has no
meaning). Where a scope entry holds one is the scoped-curve session's. What this session guarantees is
that the value is a plain, copyable, comparable object (`cloneCurve` / `curveEquals`) that any container
can hold.

## 6. Verification

- **Panel gate route (af), the test outline through `__bloomCurveTest`:**
  - The editor renders once, outside `#panelControls`, and no registry control is a curve.
  - A real drag stores the fraction under the pointer, read off the editor's own proposed edit. The
    owning length 35 → 60 mm moves the caption and no stored number.
  - A one-step drag to a refused position leaves the value EXACTLY as it was and tells the validator's
    reason.
  - Add on the curve, double-press remove, the keyboard, and an end that cannot be removed each behave.
  - two-sided starts as the left side's copy, and back to symmetric keeps the LEFT side.
  - The file walkers round-trip the curve clean and refuse one outside the box whole.
- **Five mutants under `--negative-control`, each caught by its own sentence:**

  | Mutant | File | Caught by |
  |---|---|---|
  | the validator is ignored | `bloom-curve.js` | the drag reaching the refused position — "never asked" |
  | a refused drag clamps (bisects to the boundary) | `bloom.js` | the point moving toward it — "clamped, not refused" |
  | the mirror keeps the right side | `bloom-curve.js` | the mirror-switch sentence |
  | points stored in absolute units | `bloom.js` | the editor proposing (17.5, 9.1) for the fraction (0.5, 0.26) |
  | the design file drops the curve | `bloom-file.js` | the file round-trip sentence |

  The panel gate's banner says TWENTY-SIX routes now; adding the route was three edits (header entry,
  block, flags and banner).
- **Design-file gate, F7:**
  - Two curve values round-trip verbatim through the shipped walkers: an off-grid coordinate to the bit,
    and a two-sided right side whole.
  - Seven values the spec cannot hold are refused whole and told.
  - F0 holds the field kinds to the registry's kinds.
  - The new mutant `the-curve-kind-is-not-written` reddens F7.
  - The existing mutant `a-dropped-field-on-write` was **re-anchored** onto the moved writer loop:
    the same mutation, on the line that now does the writing.
- **0 moved:**
  - `bloom-geometry.js` and the harness are sha-identical to `cde5a60`.
  - `verify-bloom-presentation-only --base cde5a60` passes clauses 2–4: all 1,316 matrix rows
    deep-equal; CONTROLS / SECTIONS / DEFAULTS / PREDICATES / RETIRED_IDS deep-equal, every function by
    source; 4,173 read-out values identical. It fails clause 1 on `bloom.css` only. That file is in its
    predeclared list, and this session styled the widget there; CSS decides no export.
  - The positional byte comparison over the whole matrix is in the PR body.
- **The sheet:** `node tools/shot-bloom-curve-editor.mjs <dir> --png docs/img/curve-editor.png` produces
  `docs/img/curve-editor.png`. It shows symmetric, a refused drag with the pointer still down, and
  two-sided, each at 1280 × 900 and at 390 × 844. The panel is a fixed 250 px on both, so the editor
  reads the same; that is the page, not the sheet. No pixel delta is quoted.

## 7. Recorded, not fixed

- **`bloom-curve.js` is in NO workflow's path filter.** Workflows were out of bounds this session. A
  change touching ONLY that file, or only `tools/shot-bloom-curve-editor.mjs`, runs no gate. The fix is
  one line in `bloom-panel.yml`'s two `paths` lists (and in the export and connectedness gates' lists
  once F3 makes it a geometry input). It is an edit to an EXISTING workflow file, so per CLAUDE.md it
  costs every frozen tag dispatched afterwards from an older base. Dispatch owed tags first.
- **The `bloom-panel.yml` step name says "six broken copies of bloom-file.js";** it is seven now. It is
  a label in a workflow file, recorded for the same session.
- **The first LIVE curve control owes the harness a curve arm.** `tools/bloom-harness.mjs`'s
  `applyConfig` / `fullStateDrift` and the matrix's `{ id, value: <string> }` row format know sliders and
  choices only, and so do `bloom-smoke`'s census and `diff-bloom-bytes`' captures. None of them meets a
  curve today because no registry row is one. The day F3 adds one, a row that sets it, and the
  read-back of it, must exist before any gate can claim to measure it.
- **What F3 and F6 call:**
  - `curveSamples(value, spec, { lengthMm })` for the drawn curve in millimetres;
  - `curveYAtX(samples, x)` for a function curve's y at x;
  - a row's `validate(candidate, ui)` for the refusal (Q4.4: return the reason string to refuse).
  - Spine curvature is derived from the samples (Q4.1). That derivation is F3's, and it must call
    this sampler rather than restating it.
