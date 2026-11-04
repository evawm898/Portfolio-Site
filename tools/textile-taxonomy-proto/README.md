# textile taxonomy prototype (unlinked)

Scratch page for the fiber / yarn-and-cord / textile-structure panel that is now
`/textile-101.html#what-is-a-textile` (Eva's ruling: option A, the three columns of the
reference stacked as three rows read top to bottom). Twelve animations, one per kind. The page
carries the same markup; `verify-page.mjs textile-101.html` checks it there.

The animations live in `/textile-taxonomy.js` at the repo root; the drawing primitives (fiber
stroke, halo, splitting a strand by depth, the yarn helix and fibre pose) are `/textile-basics.js`'s,
exported as `DRAW`, so every cell draws with one stroke language. The staple fibres are the panel's
own (shorter, with an irregular, undulating crimp). Knit and nonwoven
ARE the two `/textile-basics.js` scenes; knit's strands come from `/textile-knit-loops.js`, the
geometry section 09 bakes.

* `index.html` — the panel with its copy, styled by the `.tx-tax` rules in textile-101.css.
  `?still` turns off scroll-triggered autoplay (for recording); `?reduce` forces end frames.
* `shoot.mjs <dir> [--only=a,b] [--sheet] [--no-video]` — every animation rendered frame by
  frame (seeking t at 30 fps: the scene's own timing, not this machine's) into `<name>.mp4` and
  `<name>.gif`; end frames of the whole panel at 1280 and 390 (`end-1280.png`, `end-390.png`);
  the per-frame draw cost; `--sheet` adds `sheet.png`, each animation at t = 0 .. 1.
* `verify-page.mjs [page]` — play once on scroll-in and rest on the reduced-motion frame, stop
  and jump to the end when scrolled away mid-play, hover / tap replay, no page errors, no
  horizontal scroll, at 1280 and 390. `page` defaults to this prototype.

All need `playwright` (`NODE_PATH=/opt/node22/lib/node_modules`); `shoot.mjs` needs `ffmpeg`.
Nothing here runs in CI.
