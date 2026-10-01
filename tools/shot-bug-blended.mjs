#!/usr/bin/env node
/* shot-bug-blended.mjs <out.png> — the blended-pair STL refusal, through the real
   page: the fixture blendedThin() (pair 2 linked, below the floor; pairs 1 and 3
   clear), the editor left on pair 1 so the red pair 2 is shown by the VIEW and
   not by the editor, then a real click of "Get STL". Prints the message, the
   tinted part count and the red segment count read back off the page. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { blendedThin } from './bug-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPng = path.resolve(process.argv[2] || 'bug-blended-refusal.png');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.g*.com/**', (r) => r.abort());
await page.goto(`http://127.0.0.1:${server.address().port}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
await page.evaluate((p) => window.__bug.setParams(p), blendedThin());
await page.evaluate(() => { window.__bug.editPair(0); window.__bug.flushBuild(); window.__bug.setView('three'); });
const btn = page.locator('#exportStl'); await btn.scrollIntoViewIfNeeded();
let downloaded = false; page.once('download', () => { downloaded = true; });
await btn.click(); await page.waitForTimeout(300);
const msg = await page.locator('#exportMsg').textContent();
const view = await page.evaluate(() => window.__bug.thinView());
await page.evaluate(() => window.__bug.render());
await page.screenshot({ path: outPng });
await browser.close(); server.close();
console.log(`downloaded=${downloaded} svg preview red paths=${view.svgRed} tinted wing parts=${view.tinted} red segments=${view.redSegments}\nmessage: ${msg}`);
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
