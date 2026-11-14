# Textile 101 overhaul: decisions log

Self-run session, Nov 14. Each entry: the call, what was rejected, how to undo it.

**D1. PR #492 was already merged; nothing of the dyeing page was touched.** Dyeing is its own page. The only shared code is `DRAW` in `textile-basics.js`, which this run reads and does not change.

**D2. One player for every figure.** `mountTaxonomy`'s playback loop became `mountScenes(scenes, attr)` in `textile-taxonomy.js`; `mountTaxonomy` now calls it, and so does `mountFigures`. The panel's behaviour is unchanged (its gate passes on the page). *Rejected:* a second copy of the loop in the new module. *Undo:* inline it back.

**D3. New figures draw in tokens; the taxonomy panel's colours were NOT changed.** The panel (and the dyeing page) draw with `DRAW.INK = #EDEDE8` and `DRAW.ACCENT = #5FA0A0`, the pre-token palette. The brief says tokens only, so the new figures use `var(--color-ink)` and `var(--color-petrol)`. Moving `DRAW` onto tokens would be the full cohesion fix, but `textile-dyeing.js` parses `DRAW.INK` as a hex to mix dye colours, so the change reaches a page I was told to leave alone. The visible result: the panel's teal is slightly greyer than the petrol used by the new figures, the knit panels and the page's links. *Eva's call* (accuracy sheet, item 11).

**D4. Section 02 title changed** from "Fibers: Natural vs. Synthetic" to "Fibers: Natural & Manufactured". The old title is the error the section corrects. The anchor `#fibers` is unchanged.

**D5. Acetate sits with the regenerated cellulosics in its own sub-row, "cellulose esters".** The brief lists acetate under manufactured-regenerated. Strictly it is a cellulose derivative, not regenerated cellulose (16 CFR 303.7). The column is headed "Manufactured — from natural polymers" so both rows are true.

**D6. The regain chart uses measured ranges, not ASTM commercial regain.** Commercial regain is a defined trading value; I could source only two of its entries. Flax, modal and elastane were left off the chart because no reliable figure was found. Lyocell is on it with a weak source, flagged.

**D7. Brand names removed** from section 02 (three fibre brands) and section 05 (three product names). The brief asked for this in spec examples; I applied it to the fibre cards too, where the brands were also the cause of a misclassification.

**D8. The three "Bio-based / Recycled / Functionalized" cards were kept, as text.** They were Eva's content. They are reframed as labels that cut across the classes, and their decorative icons were dropped.

**D9. Cross-sections: eight cells, two rows.** Viscose is in row A with the natural fibres because its shape is not set by the spinneret hole. A "channelled" cell was added because the old "hollow = quick-dry" claim belongs to that shape. *Rejected:* light-ray and glint marks for lustre; they were built, read as stray whiskers, and were removed.

**D10. Petrol means "the feature the caption is about"** in the cross-sections (lumen, scale edges, the orifice, the hollow core, water in the grooves), and "the one pick to follow" in the weaves. Companions are used only for the three fibre classes of the chart, each also named by its heading and marker shape.

**D11. The weaves come from `/weave-draft.js`.** `applyPreset()` + `drawdown()` on the presets `plain`, `twill22`, `satin5`. The satin is therefore warp-faced with move number 2, as that preset defines it. *Rejected:* 3/1 twill (denim) as the twill; 2/2 shows the diagonal more plainly and the caption names denim.

**D12. Draft beside the cloth, rows aligned; one weave per row of the page.** Three across at desktop made each draft too small to read. The draft row fills as its pick is laid, which is the link between the two pictures. Pick 1 is at the bottom in both, as on point paper. `/weave` itself draws pick 1 at the top; here the cloth grows upward like the woven cell in the panel above.

**D13. The three spec cards were replaced, not repaired.** One original was ambiguous, one likely had the wrong unit, one was implausible (see the audit). There are still three, because Yarn Characterization links here for "three more worked specs".

**D14. Section 09: only the animation rule changed.** The knit strands looped for ever; they now play once, hold and replay, like everything else. The baked markup was not regenerated. *Undo:* restore the old `.yarn-path` rules.

**D15. Sections 06 and 07 stay as two sections.** They overlap, but both are in the table of contents and are linked from other notes.

**D16. Screenshots and recordings are committed** under `docs/img/textile-101/` so the PR can show them. The recordings are rendered by seeking each scene frame by frame, so they show the scene's timing, not this machine's.
