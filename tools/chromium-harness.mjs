// tools/chromium-harness.mjs — shared headless-Chromium launch helper for the
// browser-driving dev tools (audit-hires, gen-preset-thumbs, shot-flower,
// verify-flower-export, verify-geometry-quality). Each used to keep its own copy
// of findChromium(); they had already drifted from each other — three skipped the
// CHROMIUM_EXECUTABLE override and the try/catch, two skipped excluding the
// headless-shell build — so this is the one definition all five now import.

import fs from 'node:fs';
import path from 'node:path';

// Locate a real Chromium binary: an explicit CHROMIUM_EXECUTABLE override first,
// else the first chromium-* install under PLAYWRIGHT_BROWSERS_PATH (default
// /opt/pw-browsers). Excludes any dir with "headless" in its name — a
// chromium_headless_shell-* install (present alongside chromium-* in this
// environment) doesn't ship the same chrome-linux/chrome binary these tools
// launch with GL flags. Returns undefined (letting playwright-core resolve its
// own default) if nothing is found, rather than throwing.
export function findChromium() {
  if (process.env.CHROMIUM_EXECUTABLE && fs.existsSync(process.env.CHROMIUM_EXECUTABLE)) return process.env.CHROMIUM_EXECUTABLE;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('chromium-') || d.includes('headless')) continue;
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;
}
