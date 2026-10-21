#!/usr/bin/env node
// frame.mjs — one frame of one animation, big: node frame.mjs <name> <t> <out.png> [scale]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { findChromium } from '../chromium-harness.mjs';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [name, t, out, scale = '3'] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = await chromium.launch({ executablePath: findChromium() });
const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: +scale });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(`http://localhost:${server.address().port}/tools/textile-basics-proto/index.html?still`);
await page.waitForFunction(() => window.__tb && window.__tb.length === 6);
await page.evaluate(([n, t]) => window.__tb.find(p => p.host.dataset.txAnim === n).seek(+t), [name, t]);
const el = await page.$(`[data-tx-anim="${name}"] .tx-anim`); await el.scrollIntoViewIfNeeded();
await el.screenshot({ path: out }); await b.close(); server.close();
