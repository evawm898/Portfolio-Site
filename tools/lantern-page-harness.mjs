/* tools/lantern-page-harness.mjs — serves the repository and opens /lantern in
   headless Chromium, for tools/verify-lantern-page.mjs and tools/shot-lantern.mjs
   (the tile harness's shape). three.js is served from node_modules at the exact
   jsDelivr URL lantern.html pins (npm i --no-save three@0.161.0 playwright-core
   jszip), the Google fonts are aborted (chrome, not content), JSZip and jsPDF
   are served from node_modules when present at the cdnjs URLs the page loads on
   demand — so no check needs egress. `override` maps a request path to a body
   (a mutant's broken copy of a module). */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

export async function openLantern({ root = REPO, viewport = { width: 1440, height: 900 }, dsf = 1, storage = null, override = null, waitFor = null } = {}) {
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
  const serveLocal = (pattern, file) => page.route(pattern, (route) => { const p = path.join(REPO, file); if (fs.existsSync(p)) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(p) }); else route.abort(); });
  await serveLocal('**cdnjs.cloudflare.com/ajax/libs/jszip/**', 'node_modules/jszip/dist/jszip.min.js');
  await serveLocal('**cdnjs.cloudflare.com/ajax/libs/jspdf/**', 'node_modules/jspdf/dist/jspdf.umd.min.js');
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  if (storage !== null) await page.addInitScript((s) => { try { if (sessionStorage.getItem('__lanternSeeded')) return; sessionStorage.setItem('__lanternSeeded', '1'); localStorage.clear(); if (s) localStorage.setItem('lantern-v1', s); } catch {} }, storage);
  await page.goto(`${base}/lantern.html`);
  await page.waitForFunction(waitFor || (() => !!window.__lantern && !!window.__lantern.model()));
  const close = async () => { await browser.close(); server.close(); };
  return { page, browser, context, base, errors, close };
}
