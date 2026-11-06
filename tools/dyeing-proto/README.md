# Dyeing field note — tools

`/dyeing.html` is Field Notes No. 08, "Dyeing". It has four parts and thirteen animations:

* **01 Where Color Enters.** A stage picker over the polymer → fiber → yarn → fabric chain. It is a row of four on wide screens, and under 560 px a 2 × 2 grid that draws its own labels. Then the three ways to dye yarn (skein, package, warp beam), and how far the dye gets into a yarn.
* **02 Inside, On, or Into.** Solution-dyed, pigment printed, and dyed, each shown as a fiber cross-section.
* **03 Why the Fiber Decides the Dye.** Disperse → polyester, acid → nylon, reactive → cotton. Basic/cationic dye is left out, by ruling.
* **04 One Bath, Two Dyes — Cross Dyeing.** It has two toggles, Reserve and Reality. The poly/nylon "Reality" copy slot is empty on purpose and shows nothing until Eva writes that copy (row 15).

Where the code lives:

* `/textile-dyeing.js` holds the scenes and the playback.
* `/textile-dyeing-draw.js` draws dyed yarns in `/textile-basics.js`'s stroke language (`DRAW`). It adds a fibre colour parameter and three fibre kinds that are told apart by pattern (cotton staple, smooth polyester filament, crimped nylon filament).
* `/dyeing.css` holds the page's styles. The page also uses `textile-101.css` for its section and TOC layout.

**Colour has one owner.** The dye colours are CSS custom properties on `#dyeing` in `/dyeing.css`, and each one points at a `tokens.css` companion (see `DESIGN.md`): `--dye-disperse` = indigo (on polyester), `--dye-acid` = plum (on nylon), `--dye-reactive` = mint (on cotton). The generic "a dye" of parts 01 and 02 (`--dye-colour`) is indigo too. Part 04's cross-dyed swatch still draws its polyester in petrol (`--dye-cross-poly`) beside the plum nylon (Eva, Nov 5; still open, see the PR). `textile-dyeing.js` only ever writes `var(--dye-*)`, so a palette change is a CSS edit.

**Fibre convention (DESIGN.md rule 7).** An undyed fibre is an ink outline with no fill; a dyed fibre is filled. Cross-sections (the yarn rings, the three fibre sections of part 02) fill as they take dye. A fibre drawn as a line takes the dye as its stroke, since a line has no inside to fill. Molecule shape carries the class (round disperse, diamond acid, filled triangle reactive), and mint, the companion nearest ink, is only ever a filled shape. Companions are never text, so the "dye here" labels are petrol.

Each scene builds its static fibres once per state. A frame then only sets CSS colour variables on the `<svg>` and redraws one group of moving molecules. The page takes two test switches: `?still` turns off scroll-triggered autoplay (used for recording), and `?reduce` forces end frames.

Files here:

* `shoot.mjs <dir> [--only=a,b] [--sheet] [--no-video]` writes:
  * `<clip>.mp4` and `<clip>.gif` for each animation, and for each interactive state (the chain at three stages, the chain's 2 × 2 phone layout, cross dyeing with each toggle);
  * `end-1280.png` and `end-390.png`, the page's end frames;
  * the per-frame draw cost;
  * `sheet.png` with `--sheet`, every clip at t = 0 … 1.
* `verify-page.mjs [page]` (the default page is `dyeing.html`) checks, at 1280 and 390:
  * playback: each scene plays once on scroll-in and holds its end frame; scrolled fully away mid-play it jumps to the end; hover and tap replay; under reduced motion it shows end frames only;
  * the stage buttons and the toggles;
  * the chain's two layouts, including a live resize across 560 px;
  * that no dye hex colour appears in the markup, and that changing `--dye-acid` recolours the nylon;
  * no page errors and no horizontal scroll.
* `palette-frames.html?o=1|2|3` is the palette study from before Direction A: the three earlier options in normal vision and three colour-vision simulations. It's kept as a record.

All the tools need `playwright` (`NODE_PATH=/opt/node22/lib/node_modules`); `shoot.mjs` also needs `ffmpeg`. Nothing here runs in CI: no workflow's path filter matches these files.
