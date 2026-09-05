// shot-print-lines.mjs — contact sheet for the /print line-art stage.
//
//   node tools/shot-print-lines.mjs <dir> [base-tree]
//
// With a `base-tree` (a commit-ish), the sheet opens a git worktree of it and
// renders the SAME cells from that tree first, so the before/after pair is a
// real render of the old code rather than a remembered one. The camera is
// driven by the same wheel and drag sequence on both sides from the same
// bundle, so the two framings match to within OrbitControls' damping.
//
// Every cell is a REAL SCREENSHOT of the live page driven through its own
// controls — a slider input, a pointer drag, a wheel zoom. Nothing here writes
// state the hand cannot reach, for the same reason the pose sheet does not:
// a picture of an unreachable configuration is not evidence about the tool.
// The one exception is `setCuration`, which reaches past the panel because
// curation is a constant and not a fourth slider; the cells that use it say so.
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = '/home/user/Portfolio-Site';
const OUT = process.argv[2] || '/tmp/print-lines-sheet';
const BASE = process.argv[3] || null;
mkdirSync(OUT, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.glb':'model/gltf-binary', '.json':'application/json', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.png':'image/png' };

function serve(root) {
  const server = http.createServer((req, res) => {
    let f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
    // the bundle lives in the working tree; a worktree of an older commit has
    // its own copy, but fall back so a tree that predates it still renders
    if (!existsSync(f)) f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  return server;
}

async function session(root, prefix, cells) {
  const server = serve(root);
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    const f = path.join(ROOT, 'node_modules/three', rel);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
  });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${base}/print`, { waitUntil: 'load' });
  await page.waitForFunction('window.__printLineArt', { timeout: 40000 });
  const call = e => page.evaluate(e);

  // one camera for the whole sheet, reached the way a hand reaches it
  const box = await page.locator('#print-canvas').boundingBox();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.24);
  for (let i = 0; i < 13; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.62);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width * 0.62 - i * 6, box.y + box.height * 0.62 - i * 2);
  await page.mouse.up();
  await page.waitForTimeout(900);

  await cells({ page, call, box, prefix });
  console.log(`  ${prefix} page errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await browser.close(); server.close();
  return errs;
}

const line = (tag, st) =>
  `  ${tag.padEnd(36)} raw ${String(st.segments).padStart(6)} | ` +
  (st.chains === undefined
    ? `drawn ${String(st.strokes).padStart(6)} strokes + ${String(st.dots).padStart(6)} dots`
    : `chains ${String(st.chains).padStart(5)} (c ${st.contourChains}/i ${st.interiorChains}) | ` +
      `pts ${st.ptsIn}→${st.ptsOut} | drawn ${st.strokes} + ${st.dots} dots | ` +
      `turn ${st.contourTurnMean.toFixed(1)}° over30 ${st.contourTurnOver30}/${st.contourTurnJoins} | ${st.frameMs.toFixed(1)}ms`);

const shoot = async ({ page, call, prefix }, name, style) => {
  if (style) await call(`window.__printLineArt.setStyle(${JSON.stringify(style)})`);
  await page.waitForTimeout(500);
  await call(() => window.__printLineArt.measureTurnsNow && window.__printLineArt.measureTurnsNow());
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${prefix}${name}.png`) });
  console.log(line(`${prefix}${name}`, await call(() => window.__printLineArt.stats())));
};

// ---------------------------------------------------------------------------
let worktree = null;
if (BASE) {
  worktree = '/tmp/print-base-tree';
  rmSync(worktree, { recursive: true, force: true });
  execFileSync('git', ['-C', ROOT, 'worktree', 'prune']);
  execFileSync('git', ['-C', ROOT, 'worktree', 'add', '--detach', worktree, BASE], { stdio: 'inherit' });
  console.log(`\nBEFORE — ${BASE}, raw triangle edges drawn as straight polylines`);
  await session(worktree, '00-before-', async (c) => {
    await shoot(c, 'detail45', { detail: 45, weight: 2.2, blend: 0 });
    await shoot(c, 'detail0', { detail: 0, weight: 2.2, blend: 0 });
  });
}

console.log('\nAFTER — chained, curated, smoothed, two-tier');
await session(ROOT, '01-after-', async (c) => {
  await shoot(c, 'detail45', { detail: 45, weight: 2.2, blend: 0 });
  await shoot(c, 'detail0', { detail: 0, weight: 2.2, blend: 0 });

  console.log('\n  detail x weight, post-smoothing');
  await shoot(c, '-w1.2-d0', { detail: 0, weight: 1.2 });
  await shoot(c, '-w4.0-d0', { detail: 0, weight: 4.0 });
  await shoot(c, '-w1.2-d70', { detail: 70, weight: 1.2 });
  await shoot(c, '-w4.0-d70', { detail: 70, weight: 4.0 });

  console.log('\n  pointillism over the smoothed chains');
  await shoot(c, '-dots40', { detail: 45, weight: 2.4, blend: 40 });
  await shoot(c, '-dots100', { detail: 45, weight: 2.4, blend: 100 });

  console.log('\n  curation, swept past the shipped default (setCuration, not a slider)');
  await c.call(() => window.__printLineArt.setStyle({ detail: 45, weight: 2.4, blend: 0 }));
  for (const cu of [{ minChainPx: 5, minCreasePx: 16 }, { minChainPx: 26, minCreasePx: 55 }, { minChainPx: 45, minCreasePx: 90 }]) {
    await c.call(`window.__printLineArt.setCuration(${JSON.stringify(cu)})`);
    await shoot(c, `-curate-${cu.minChainPx}px`);
  }
  await c.call(() => window.__printLineArt.setCuration({ minChainPx: 5, minCreasePx: 16 }));

  console.log('\n  live under a pose change — the stage is still a layer, not a mode');
  await shoot(c, '-pose-before', { detail: 45, weight: 2.2, blend: 0 });
  const [hx, hy] = await c.call(() => window.__printScaffold.handleScreenPos(2));
  await c.page.mouse.move(hx, hy);
  await c.page.mouse.down();
  for (let i = 1; i <= 16; i++) await c.page.mouse.move(hx + i * 6, hy + i * 1);
  await c.page.mouse.up();
  await shoot(c, '-pose-bent');
  await c.call(() => { window.__printScaffold.setDroop(38); window.__printScaffold.setTwist(-24); });
  await shoot(c, '-pose-bent-hinged');
  console.log('\n  read-out:\n' + await c.call(() => window.__printLineArt.artText()));
});

if (worktree) {
  execFileSync('git', ['-C', ROOT, 'worktree', 'remove', '--force', worktree]);
}
console.log('\nsheet:', OUT);
