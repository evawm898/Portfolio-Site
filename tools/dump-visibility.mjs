/*
 * dump-visibility.mjs — record the OBSERVED visibility of every WIRED control, across the
 * whole config matrix, in BOTH tiers. Prints a stable, diffable JSON document.
 *
 * WHY: this is the instrument for a refactor that claims zero behaviour change. The claim
 * is not "the default screen looks the same" — the subject is conditional visibility, and
 * at defaults most conditions never flip. The claim is "for every control, under every
 * config in tools/visibility-matrix.mjs, in both tiers, hidden is what it was before." A
 * byte-identical dump before and after is that claim, checked, at
 * 166 controls x 34 configs x 2 tiers.
 *
 * It asserts NOTHING about whether a state is CORRECT — that is verify-tier-visibility's
 * job, which derives the expected state from the registry. This tool only records what the
 * page does. Keeping the two separate is deliberate: a refactor is verified by "unchanged",
 * a design is verified by "as declared", and collapsing them would let a wrong-but-stable
 * state pass as both.
 *
 * READ-BACK: every value is applied and read back; a value that did not take fails the run
 * rather than warning. A harness that sets a config the UI silently rewrites measures a
 * different design from the one it names and reports a pass (flower-project skill: that
 * assertion once caught 73 of 185 export configs measuring the wrong design).
 *
 * RUN:  node tools/dump-visibility.mjs > before.json
 *       node tools/dump-visibility.mjs > after.json && diff before.json after.json
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RESET, MATRIX, uncoveredDrivers } from './visibility-matrix.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const { CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'flower-registry.js')).href);
const WIRED = CONTROLS.filter((c) => !c.placeholder && !c.uiOnly);
const IDS = WIRED.map((c) => c.id);

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('dialog', (d) => d.accept().catch(() => {}));

// Serve the CDN three import from the local npm package (offline + pinned) — flower.js's
// module-level import must succeed or none of its boot code runs, which would make every
// control read "hidden" for the wrong reason.
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});

await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
if (pageErrors.length) { console.error('dump-visibility: FAIL — page threw before boot:', pageErrors.join('; ')); process.exit(1); }

const setTier = async (advanced) => {
  await page.evaluate((adv) => {
    const t = document.getElementById('advancedToggle');
    if (t && t.checked !== adv) { t.checked = adv; t.dispatchEvent(new Event('change', { bubbles: true })); }
  }, advanced);
  await page.waitForTimeout(160);
};

const applySets = async (sets) => {
  const bad = await page.evaluate((ss) => {
    const out = [];
    for (const s of ss) {
      const el = document.getElementById(s.id);
      if (!el) { out.push(`${s.id}: not in the DOM`); continue; }
      el.value = s.value;
      el.dispatchEvent(new Event(s.evt || 'input', { bubbles: true }));
      if ((s.evt || 'input') !== 'change') el.dispatchEvent(new Event('change', { bubbles: true }));
      const got = el.value;
      const num = s.value !== '' && got !== '' && isFinite(Number(s.value)) && isFinite(Number(got));
      const ok = num ? Math.abs(Number(s.value) - Number(got)) < 1e-9 : String(s.value) === String(got);
      if (!ok) out.push(`${s.id}: set "${s.value}", reads back "${got}"`);
    }
    return out;
  }, sets);
  await page.waitForTimeout(120);
  return bad;
};

const readHidden = () => page.evaluate((ids) => {
  const out = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) { out[id] = 'ABSENT'; continue; }
    const wrap = el.closest('.fl-ctrl');
    out[id] = wrap ? !!wrap.hidden : 'NO-WRAPPER';
  }
  return out;
}, IDS);

const doc = { controls: IDS.length, configs: MATRIX.length, rows: {} };
const failures = [];

for (const cfg of MATRIX) {
  // Configure in ADVANCED: Standard's option-tier fallback can rewrite a picker's live
  // value, so setting a config while Standard is active would silently measure a
  // different design. Tier is flipped only after the config is in place.
  await setTier(true);
  for (const bad of await applySets(RESET)) failures.push(`[${cfg.label}] RESET ${bad}`);
  for (const bad of await applySets(cfg.set)) failures.push(`[${cfg.label}] SET ${bad}`);
  await setTier(true);
  const advanced = await readHidden();
  await setTier(false);
  const standard = await readHidden();
  doc.rows[cfg.label] = { advanced, standard };
}

await browser.close();
server.close();

if (pageErrors.length) failures.push(`page errors during run: ${pageErrors.join('; ')}`);
if (failures.length) {
  console.error(`dump-visibility: FAIL — ${failures.length} config value(s) did not take:`);
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

// Coverage, printed rather than assumed. A predicate this matrix never flips is not
// verified by this matrix, and the config count must not be allowed to imply otherwise.
const gaps = uncoveredDrivers(WIRED);
doc.coverage = gaps.length ? { complete: false, gaps } : { complete: true };

console.log(JSON.stringify(doc, null, 1));
if (gaps.length) {
  console.error(`\ndump-visibility: COVERAGE INCOMPLETE — ${gaps.length} predicate driver(s) never varied:`);
  for (const g of gaps) console.error('  -', g);
}
