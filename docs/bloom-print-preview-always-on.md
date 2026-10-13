# F7 — print preview always on, and what a held slider shows

**Status:** built (Phase 2), on Eva's rulings from the Phase 1 comparison.
Phase 1's throwaway prototype was draft PR evawm898/Portfolio-Site#399 (branch
`claude/f7-light-preview-throwaway`), deleted when this merged.

## The rulings

1. **Print preview is always on.** The checkbox is **hidden, not deleted**: it ships
   checked, its id and every reader stay, and it can be unhidden later.
2. **While a slider is held, candidate A shows**: the same print geometry **without the
   infill cells**. On release, full print geometry builds. Not B (it needs a bead switch
   inside the geometry builder, which the ruling forbids), not C.
3. **"Get grid" follows print preview**: it exports what is on screen, now
   `bloom-grid-export.glb`.
4. **The gates keep measuring live geometry**: the harness unchecks the hidden box at
   page load. The panel gate's route (i) asserts "checked and hidden at load".
5. **The always-on view uses print normals** (the builder's bead normals, flat
   elsewhere), which is what print preview already showed. No extra work.
6. **A running build cannot be interrupted** (one thread). What is guaranteed instead:
   a queued full build is superseded, and every build reads the controls when it runs.
7. **Exports are unaffected**: full print geometry, byte-identical to before.

## What print preview is (Phase 1 discovery)

Print preview switches the viewport's build to export mode. That changes two things:

- **The print floors.** Sheet, tip and foot are floored to 1.00 mm, and the ring is
  re-derived from the floored feet (`MeshBuilder.floorThickness` / `floorFeature`, and the
  tip floor in `widthProfile`).
- **The shading.** The non-print view runs `toCreasedNormals` over the whole mesh. Print
  preview uses the builder's own bead normals and flat normals elsewhere.

The bead, the infill cells and the hole rims are **not** print-preview additions. They
are present in both views and come from their own controls.

Readers of the flag before F7: `shownMode()` in bloom.js (its one owner), used by
`regenerate()`, the grid export, the read-out's first line and print-truth marker,
`__bloomMetrics().shownMode/liveTris` and `__bloomStemlessHub`. Outside the page: both
STL gates (`shownModeAssertion(page, 'live')`), the panel gate's route (i),
`bloom-sagitta.mjs`, and about 35 contact-sheet tools that toggle the box themselves.

**No saved design carries the flag.** It was never a registry row, and the bloom saves no
design, ships no presets and keeps no URL or local-storage state. So nothing loads "off"
and nothing migrates.

## The Phase 1 measurement

One rebuild, CPU time only (no GPU upload). Median of 3 after a warm-up, headless
Chromium on the session's dev box, through the prototype's own timer. ALL MAX is one run
each; its 2,716,406 triangles match its recorded export refusal.

| config | full print | A (no infill) | B (no infill, no bead) | C (non-print view) |
|---|---|---|---|---|
| defaults | 99 ms | 83 | 63 | 135 |
| infill, 40 cells | 1,329 | 64 | 50 | 1,250 |
| infill 40 × 40 petals × 3 whorls | 12,253 | 998 | 972 | 14,639 |
| densest tube (40 × 6 whorls, all k 0) | 5,644 | 5,775 | 4,320 | 6,579 |
| 6 whorls × 40 petals | 2,036 | 1,973 | 1,827 | 3,831 |
| raceme (defaults) | 428 | 374 | 325 | 553 |
| inflorescence budget corner | 9,579 | 9,564 | 9,058 | 9,891 |
| 24 simple leaves | 384 | 418 | 325 | 565 |
| 24 lobed leaves | 807 | 765 | 523 | 1,201 |
| infill 40 × 3 whorls + raceme + 5 sepals | 5,927 | 1,640 | 1,475 | 6,724 |
| ALL MAX | 23,975 | 22,898 | 20,020 | 28,333 |

What this says:

- **Infill is the only cost a drag can shed.** A takes the infill corner from 12.3 s to
  1.0 s.
- **Tube, layers, inflorescence and leaves barely move under any candidate.** Their cost is
  elsewhere: the tube builds the body three times, and the inflorescence plan builds floret
  units in both modes.
- **The non-print view was the slower one.** Its smoothing pass cost more than the print
  floors, so making print preview the default speeds every rebuild up.
- **"Dense Voronoi + TUBE" cannot be built**: the tube is unavailable whenever infill is on.

The A/B/C sheet and the timing scripts lived on the deleted throwaway branch.

## What Phase 2 built

All of it is in bloom.js. The geometry builder is untouched.

- **The box.** In `bloom.html` it is checked, and its wrapper carries `hidden`, with a
  `.bl-toggle[hidden]` rule in `bloom.css` so the wrapper's flex display cannot override
  it.
- **The light build.** `DRAG_LIGHT_OVERRIDE` (`{ petalInfill: 'NONE' }`) is laid over
  `readUI()` for that one build through `buildGeometry`'s `override`. The export handlers
  never pass one.
- **What counts as a drag.** It starts with a pointerdown on a range input. It ends on
  pointerup, pointercancel, a range `change`, or the window losing focus. All of these
  listeners run in the capture phase, so a `change` ends the drag before the slider's own
  listener queues a rebuild.
- **The kind of a build is decided when it runs**: `regenerate()` calls `dragLight()`
  itself, so a build queued before the drag runs light, and one queued before the release
  runs full.
- **A design with no infill has nothing to shed**: its drag build is the full build, so
  nothing about it changes.
- **What the read-out says.** During a drag its first line reads *"on screen while
  dragging: the infill cells are dropped — full print geometry rebuilds on release"*. The
  infill controls keep the last full build's numbers instead of going blank.
- **Hooks for the gates:** `__bloomDragState()`, `__bloomShownDigest()` and
  `__bloomMetrics().shownLight`.

**Why typed values and arrow keys are safe by construction.** F5's commit and an arrow key
fire `input` and then `change` in one task, with no pointerdown on the slider. Even a
defect that "entered the drag" on them could leave nothing on screen, because the
`change` ends the drag before the rAF build runs. Two mutants written to test exactly that
were equivalent mutants, and are recorded as such in the gate.

## Verification

- **Smoke subset, STL bytes against `main` (`d83bcb3`)**:
  `tools/verify-bloom-print-preview-bytes.mjs`. Each row runs on a fresh page opened as
  shipped, so print preview is on for every head row and off for every base row. The real
  Get STL button is clicked and the file hashed.
  - **217 of 218 rows byte-identical, 0 differ, 0 failed.**
  - **ALL MAX** is refused on both trees at 2,716,406 triangles. It runs locally here
    because the tool waits up to 300 s for the build; the gates' 30 s wait is unchanged.
  - The comparison fails on a changed hash, a dropped row and a planted failure (all
    three tried).
- **The drag-preview gate**: `tools/verify-bloom-drag-preview.mjs`, D0–D9 all pass. It
  compares what is on screen with the exported STL's positions (a different owner) after:
  - a pointerup alone (a drag that returns to its start value, so no `change` fires);
  - a `change` alone;
  - a typed value;
  - arrow keys;
  - a drag that supersedes a queued build.

  **Its negative control is six mutants of bloom.js, each reddening exactly the clauses it
  names.** It found a real gap in the first draft: a plain drag-and-release is rescued by
  the `change` the browser fires on release, so pointerup was never tested alone until D2
  became the return-to-start drag. It runs in `bloom-panel.yml`.
- **The panel gate passes, with route (i) rewritten**, and its negative control observes
  all 23 routes failing.
- **The panel, before and after** (`tools/shot-bloom-print-preview.mjs`,
  `docs/img/f7-print-preview-panel.png`):
  - The VIEW box loses the checkbox row: 145×122 → 138×103 px. "Print preview" was its
    widest row, so the box also narrows.
  - The control panel is identical: 0 px differ collapsed as shipped, and 0 px differ on
    each of its 42 sections opened in turn.
  - The read-out differs only in its mode labels: the first line, and the "(live)" vs
    "(export)" figures.
- **No frozen phase is owed**: no matrix row moved.
