/* ===================================================================
   flower-gate-harness.mjs — shared offline-headless-Chromium plumbing for every
   browser-based flower gate/audit script (verify-flower-export.mjs, verify-
   geometry-quality.mjs, gen-preset-thumbs.mjs, audit-hires.mjs). Each of those
   independently hand-copied the same ~50 lines (locate a pinned Chromium binary,
   serve the repo over HTTP, redirect the CDN three.js import to the local npm
   copy) and had already drifted from each other in small, unintentional ways —
   e.g. only some honored CHROMIUM_EXECUTABLE. One copy here, imported by all four.

   RUN: nothing — this is a library module, not a script.
   =================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

// Locate a pinned Chromium binary: CHROMIUM_EXECUTABLE env var first, else scan
// PLAYWRIGHT_BROWSERS_PATH (default /opt/pw-browsers) for a chrome-linux/chrome
// under a `chromium-*` dir. The prefix match already excludes Playwright's separate
// `chromium_headless_shell-*` build (underscore, not hyphen) — the explicit
// `!d.includes('headless')` guard is redundant against today's naming but cheap
// insurance against a future rename; keep both. Falls through to playwright-core's
// own default resolution (undefined) if nothing is found.
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

// Serve `root` (the repo) over HTTP on 127.0.0.1, an ephemeral port. If `hook` (a
// JS source string) is given, it's appended to the served copy of flower.js only —
// the file on disk is never touched — so a script can reach into flower.js's
// module scope (resolveParams, readUI, inputs, the imported geometry fns, ...)
// without modifying the app. Returns { server, port } with the server already
// listening; call `server.close()` when done.
export async function serveRepo(root, { hook = null, mime = DEFAULT_MIME } = {}) {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/') u = '/flower.html';
    const abs = path.join(root, u);
    if (!abs.startsWith(root)) { res.writeHead(403); return res.end('no'); }
    fs.readFile(abs, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('nf'); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
      if (hook && abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + hook);
      else res.end(buf);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

// Redirect the flower.html importmap's CDN three.js import to the local npm copy
// (node_modules/three), so the page runs fully offline against the version pinned
// in package-lock-equivalent (THREE_VERSION here must match flower.html's importmap).
export async function routeThreeCDN(page, root, threeVersion = '0.161.0') {
  const versionPattern = threeVersion.replace(/\./g, '\\.');
  await page.route('**/cdn.jsdelivr.net/**', (route) => {
    const m = route.request().url().match(new RegExp(`three@${versionPattern}/(.*)$`));
    if (!m) return route.continue();
    try {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' },
        body: fs.readFileSync(path.join(root, 'node_modules', 'three', m[1])),
      });
    } catch { return route.fulfill({ status: 404, body: 'nf' }); }
  });
}
