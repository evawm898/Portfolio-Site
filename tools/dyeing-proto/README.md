# Dyeing prototype (unlinked)

This is a scratch page for section 10 of `/textile-101.html`, "Dyeing". It has four parts and thirteen animations:

* **10.1 Where Color Enters.** A stage picker over the polymer → fiber → yarn → fabric chain. It is a row of four on wide screens, and under 560 px a 2 × 2 grid that draws its own labels. Then the three ways to dye yarn (skein, package, warp beam), and how far the dye gets into a yarn.
* **10.2 Inside, On, or Into.** Solution-dyed, pigment printed, and dyed, each shown as a fiber cross-section.
* **10.3 Why the Fiber Decides the Dye.** Disperse → polyester, acid → nylon, reactive → cotton.
* **10.4 One Bath, Two Dyes — Cross Dyeing.** It has two toggles, Reserve and Reality. The poly/nylon "Reality" copy slot is left empty on purpose; that copy is Eva's to write (row 15).

The page is not linked yet. Nothing on `/textile-101.html` reads these files.

**Colour has one owner.** The dye colours are CSS custom properties on `#dyeing` in `dyeing.css`. The option 1 and option 3 values are commented next to the current ones. `dyeing.js` only ever writes `var(--dye-*)`, so the final palette pick is a three-line CSS edit. The palette is PROVISIONAL: option 2.

Drawing goes through `/textile-basics.js`'s `DRAW`, via `dye-draw.js`. That file adds a fibre colour parameter and three fibre kinds that are told apart by pattern (cotton staple, smooth polyester filament, crimped nylon filament).

Each scene builds its static fibres once per state. A frame then only sets CSS colour variables on the `<svg>` and redraws one group of moving molecules.

Files:

* `index.html` is the section with its copy. `?still` turns off scroll-triggered autoplay; `?reduce` forces end frames.
* `shoot.mjs <dir> [--only=a,b] [--sheet] [--no-video]` writes:
  * `<clip>.mp4` and `<clip>.gif` for each animation, and for each interactive state (the chain at three stages, the chain's 2 × 2 phone layout, cross dyeing with each toggle);
  * `end-1280.png` and `end-390.png`, the whole section's end frames;
  * the per-frame draw cost;
  * `sheet.png` with `--sheet`, every clip at t = 0 … 1.
* `verify-page.mjs [page]` checks, at 1280 and 390:
  * playback: each scene plays once on scroll-in and holds its end frame; scrolled away mid-play it jumps to the end; hover and tap replay; under reduced motion it shows end frames only;
  * the stage buttons and the toggles;
  * the chain's layout (a row at 1280, a 2 × 2 grid at 390 with panels at least 130 px wide), including a live resize across 560 px;
  * that no dye hex colour appears in the markup, and that changing `--dye-acid` recolours the nylon;
  * no page errors and no horizontal scroll.
* `palette-frames.html?o=1|2|3` is the palette comparison: each option in normal vision and three colour-vision simulations.

All the tools need `playwright` (`NODE_PATH=/opt/node22/lib/node_modules`); `shoot.mjs` also needs `ffmpeg`. Nothing here runs in CI.
