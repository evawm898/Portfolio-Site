/* tools/tile-page-harness.mjs — serves the repository and opens /tile in
   headless Chromium, for tools/verify-tile-page.mjs and tools/shot-tile.mjs.

   three.js is served from node_modules at the exact jsDelivr URL tile.html pins
   (npm i --no-save three@0.161.0 playwright-core), the Google fonts are
   aborted (chrome, not content), and JSZip is served from node_modules when it
   is there (npm i --no-save jszip) at the cdnjs URL the page loads on demand —
   so no check needs egress. `root` may be another tree (a worktree of the base
   commit), which is how a BEFORE cell is a real render of the old code. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

export async function openTile({ root = REPO, viewport = { width: 1440, height: 900 }, dsf = 1, storage = null, override = null } = {}) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (override && override[rel] !== undefined) { res.writeHead(200, { 'content-type': TYPES[path.extname(rel)] || 'text/plain' }); res.end(override[rel]); return; }
    const p = path.join(root, rel);
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport, deviceScaleFactor: dsf, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(REPO, 'node_modules/three', rel)) }); } catch { route.abort(); }
  });
  await page.route('**cdnjs.cloudflare.com/ajax/libs/jszip/**', (route) => {
    const p = path.join(REPO, 'node_modules/jszip/dist/jszip.min.js');
    if (fs.existsSync(p)) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(p) }); else route.abort();
  });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  // the stored design is set ONCE per tab (an init script runs on every load,
  // and a reload must find what the page itself saved)
  if (storage !== null) await page.addInitScript((s) => { try { if (sessionStorage.getItem('__tileSeeded')) return; sessionStorage.setItem('__tileSeeded', '1'); localStorage.clear(); if (s) localStorage.setItem('tessellation-rollers-v1', s); } catch {} }, storage);
  await page.goto(`${base}/tile.html`);
  await page.waitForFunction(() => !!window.__tile && !!window.__tile.layout());
  const close = async () => { await browser.close(); server.close(); };
  return { page, browser, context, base, errors, close };
}
