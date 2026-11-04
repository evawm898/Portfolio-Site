# textile-basics prototype (unlinked)

**Retired from the page.** `/textile-101.html#what-is-a-textile` now draws the fiber / yarn and cord /
textile structure panel (`/textile-taxonomy.js`, `tools/textile-taxonomy-proto/`). The scenes here stay
because `/textile-taxonomy.js` draws with this module's primitives (`DRAW`) and reuses its knit and
nonwoven scenes; the chain and types-row CSS moved into `basics.css` beside this page.

Scratch page for the six animations of `#what-is-a-textile` on `/textile-101.html`
(Fiber -> Yarn -> Fabric, then Knit / Woven / Nonwoven). The animations themselves live in
`/textile-basics.js` at the repo root — the page and this prototype import the same file.

* `index.html` — the section as it sits on the page (same markup, same CSS from textile-101.css). `?still` turns off the
  scroll-triggered autoplay (for recording); `?reduce` forces the reduced-motion end frames.
* `shoot.mjs <dir>` — renders every animation frame by frame (seeking t, 30 fps, so the timing
  is the scene's own and not this machine's) into `<name>.mp4` and `<name>.gif`, plus end-frame
  screenshots of the whole section at 1280 and 390 wide.
* `frame.mjs <name> <t> <out.png> [scale]` — one frame of one animation, for close inspection.

Both need `playwright` (`NODE_PATH=/opt/node22/lib/node_modules`) and `ffmpeg`.
* `verify-page.mjs` — drives this prototype at 1280 and 390: every animation plays once on scroll-in and rests on the reduced-motion end frame, hover / tap replays, no page errors, no horizontal scroll.
