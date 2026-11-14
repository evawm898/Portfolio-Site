# Textile 101 section figures: scratch page and tools (unlinked)

The figures of sections 02, 03 and 08 of `/textile-101.html` live in `/textile-101-figures.js`.
They draw with `/textile-basics.js`'s `DRAW`, weave with `/textile-taxonomy.js`'s tube kit and
`/weave-draft.js`'s drawdown, and are played by `mountScenes` (once on scroll-in, hold, replay
on hover / tap; reduced motion = end frame).

* `index.html` — every figure on one page. `?still` turns off autoplay; `?reduce` forces end frames.
* `verify-page.mjs [page]` — playback of the twelve figures and of the section 09 knit panels at
  1280 and 390; tokens-only colours; no page errors; no horizontal scroll. Defaults to `textile-101.html`.
* `shoot.mjs <dir> [--tag=after] [--video]` — per-section screenshots at 1280 and 390;
  `--video` adds one mp4 per figure, rendered frame by frame.

All need `playwright` (`NODE_PATH=/opt/node22/lib/node_modules`); `--video` needs `ffmpeg`.
Nothing here runs in CI. Audit: `docs/textile-101-audit.md`.
