/*
 * verify-tier-visibility.mjs — Standard/Advanced tier gate for the Flower Bloom
 * control panel.
 *
 * WHY (historical — applyTier() has since become applyVisibility(), one registry-driven
 * pass): applyTier() hid every non-`tier:"standard"` control while
 * Standard mode is active. That direction was already covered by earlier ("P2 tier")
 * work — a Standard visitor never sees an Advanced-only control. Nobody checked the
 * OTHER direction: does switching TO Advanced actually reveal everything it should?
 * It didn't. applyTier() only ever ADDED `hidden=true`; nothing ever cleared it on
 * leaving Standard. A control with a contextual data-* gating attribute (e.g.
 * data-hide-bilateral) got un-hidden anyway, as a side effect of that attribute's own
 * sweep recomputing its hidden state unconditionally every time it runs — but any
 * Advanced control with NO gating attribute had nothing to reverse the Standard-mode
 * hide, and stayed stuck hidden in Advanced forever. Confirmed for 25 controls
 * (curlBias, petalCup, crossSection, layerCount, continuousMargin, curlGradient,
 * sizeGradient, curlStart, and 17 more) before the fix in this file's companion change
 * to applyTier(). That ordering hazard is gone — applyVisibility() recomputes every
 * control from its declaration on every change, so no state depends on which sweep ran
 * first — but the assertion is kept because the property it protects has not changed.
 *
 * WHAT IT MEASURES (and what it would miss): this is a DOM-visibility check, not a
 * geometry check — it proves a control is reachable in the UI, not that its value does
 * anything. A control that is visible but wired to nothing would pass this gate; a
 * control that IS wired correctly but never rendered would fail it. That is exactly
 * the property this gate exists to catch (see WHY above): "I turned on Advanced and
 * the slider isn't there" should fail CI, not just get reported by a confused user.
 *
 * ASSERTION: in Advanced mode, at the DEFAULT config, every WIRED control that carries
 * no visibility predicate at all (registry `visibleWhen`) must be visible (`.fl-ctrl`
 * wrapper `hidden===false`). The three separate carve-outs this used to name — `gating`,
 * `permanentHidden`, `imperativeGate` — have collapsed into that one field, because all
 * three were ways of saying "something conditions this control" and only one of them ever
 * said what the condition was.
 *
 * SCOPE, STATED PLAINLY BECAUSE IT IS THE POINT: this checks 25 of 166 controls, in ONE of
 * two modes. `c.tier !== 'standard'` makes tier a FILTER on what gets examined, so no
 * Standard-tier control is ever checked in Standard mode — which is how edgeNoise can be
 * invisible at the default state with this gate reporting PASS. PR 2 replaces this with an
 * expectation derived from `visibleWhen` for every control in both modes; this revision only
 * carries the existing assertion across the field rename.
 * Controls WITH a gating attribute are left to their own sweep — whether they're
 * currently shown or hidden at the default config is a contextual decision this gate
 * doesn't second-guess (that's the OTHER, already-covered direction: Standard doesn't
 * leak Advanced-only options, and a gated control's own on/off logic isn't retested
 * here). This gate never re-derives a gating PREDICATE (radial vs bilateral, sepal on
 * vs off, etc.) — duplicating that logic here is exactly the "two computations that
 * happen to agree" antipattern this project has been burned by before. It only reads
 * the structural fact of whether a gating attribute exists at all, which the registry
 * already states.
 *
 * REPORTS: the count of WIRED controls visible in Advanced vs. the total WIRED count,
 * so a future regression shows up as a number dropping, not as someone not finding a
 * slider.
 *
 * RUN:  node tools/verify-tier-visibility.mjs
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const { CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'flower-registry.js')).href);
const PANEL = CONTROLS.filter((c) => !c.placeholder);
const WIRED = PANEL.filter((c) => !c.uiOnly);
// The exact three carve-outs applyTier()'s Advanced-reveal loop excludes (see that
// function's comment) — mirrored here as a STRUCTURAL fact read off the registry, not
// a re-derivation of any gating predicate.
const shouldBeVisibleInAdvanced = (c) => c.tier !== 'standard' && !c.visibleWhen;

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

// Serve the CDN three import from the local npm package (offline + pinned) — flower.js's
// module-level `import * as THREE` must succeed or NONE of its boot code (including
// applyVisibility()) ever runs, which would make this gate pass for the wrong reason.
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  const fp = path.join(ROOT, 'node_modules/three', rel);
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(fp) }); }
  catch { route.abort(); }
});

await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });

if (pageErrors.length) {
  console.error('tier-visibility: FAIL — page threw before boot completed:', pageErrors.join('; '));
  await browser.close(); server.close();
  process.exit(1);
}

// Flip Advanced on, exactly the way a visitor does — the checkbox's own 'change'
// listener drives the visibility pass, not an injected hook.
const hasToggle = await page.evaluate(() => !!document.getElementById('advancedToggle'));
if (!hasToggle) {
  console.error('tier-visibility: FAIL — #advancedToggle not found in flower.html');
  await browser.close(); server.close();
  process.exit(1);
}
await page.evaluate(() => {
  const t = document.getElementById('advancedToggle');
  t.checked = true;
  t.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(300);   // sweep chain settle

const rows = await page.evaluate((ids) => ids.map((id) => {
  const el = document.getElementById(id);
  if (!el) return { id, present: false, hidden: null };
  const wrap = el.closest('.fl-ctrl');
  return { id, present: true, hidden: wrap ? wrap.hidden : null };
}), WIRED.map((c) => c.id));

const byId = new Map(rows.map((r) => [r.id, r]));
let visibleCount = 0;
const failures = [];
for (const r of rows) if (r.present && r.hidden === false) visibleCount++;
for (const c of WIRED) {
  if (!shouldBeVisibleInAdvanced(c)) continue;
  const r = byId.get(c.id);
  if (!r || !r.present) { failures.push(`${c.id}: missing from DOM`); continue; }
  if (r.hidden !== false) failures.push(`${c.id} ("${c.label}"): still hidden in Advanced (no visibleWhen predicate to explain it)`);
}

// ---- OPTION-LEVEL TIER, BOTH DIRECTIONS ------------------------------------------
// The control-level check above says a control is reachable. It says nothing about the
// OPTIONS inside a select, and a select can be fully visible while one of its options is
// hidden — which is how TOOTHED and SCALLOPED sat unreachable in Standard for weeks
// after the reason for hiding them stopped being true.
//
// The registry declares option-level tier (`advancedOnly` on the option, plus
// `standardFallback` on the control) and flower.js derives ADV_OPTIONS from it, so there
// is one declaration. This asserts BOTH directions against that declaration, because
// "doesn't leak into Standard" and "does still show in Advanced" are different claims:
//   Standard  — exactly the advancedOnly options are hidden; every other option visible.
//   Advanced  — no option is hidden at all (except registry-`hidden` ones like CUSTOM).
const optionState = async (advanced) => {
  await page.evaluate((adv) => {
    const t = document.getElementById('advancedToggle');
    if (t && t.checked !== adv) { t.checked = adv; t.dispatchEvent(new Event('change', { bubbles: true })); }
  }, advanced);
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const out = {};
    for (const sel of document.querySelectorAll('select')) {
      out[sel.id] = [...sel.options].map((o) => ({ value: o.value, hidden: !!o.hidden, disabled: !!o.disabled }));
    }
    return out;
  });
};
const declaredHidden = (c) => new Set((c.options || []).filter((o) => o.advancedOnly).map((o) => o.value));
const registryHidden = (c) => new Set((c.options || []).filter((o) => o.hidden).map((o) => o.value));

const inStandard = await optionState(false);
const inAdvanced = await optionState(true);
let optFail = 0;
for (const c of PANEL.filter((x) => x.kind === 'select')) {
  const adv = declaredHidden(c), always = registryHidden(c);
  const st = inStandard[c.id] || [], ad = inAdvanced[c.id] || [];
  for (const o of st) {
    if (always.has(o.value)) continue;
    const shouldHide = adv.has(o.value);
    if (o.hidden !== shouldHide) {
      console.error(`  FAIL ${c.id}/${o.value}: Standard mode hidden=${o.hidden}, registry says advancedOnly=${shouldHide}`);
      optFail++;
    }
  }
  for (const o of ad) {
    if (always.has(o.value)) continue;
    if (o.hidden || o.disabled) {
      console.error(`  FAIL ${c.id}/${o.value}: hidden/disabled in ADVANCED mode — unreachable in the mode that is supposed to show everything`);
      optFail++;
    }
  }
}
const optTotal = PANEL.filter((x) => x.kind === 'select').reduce((n, c) => n + (c.options || []).length, 0);
const advOnly = PANEL.filter((x) => x.kind === 'select').flatMap((c) => (c.options || []).filter((o) => o.advancedOnly).map((o) => `${c.id}/${o.value}`));
if (optFail) failures.push(`${optFail} option-level tier disagreement(s) — see above`);
console.log(`tier-visibility: options OK — ${optTotal} select options agree with the registry in BOTH modes `
  + `(advanced-only: ${advOnly.length ? advOnly.join(', ') : 'none'}).`);

console.log(`tier-visibility: ${visibleCount}/${WIRED.length} WIRED controls visible in Advanced mode (default config).`);
console.log(`  ${WIRED.filter(shouldBeVisibleInAdvanced).length} ungated Advanced-or-Standard controls checked for the "must be visible" assertion.`);

await browser.close();
server.close();

if (failures.length) {
  console.error(`\ntier-visibility: FAIL — ${failures.length} control(s) stuck hidden in Advanced:`);
  for (const f of failures) console.error('  -', f);

  process.exit(1);
}
console.log('\ntier-visibility: PASS — every ungated WIRED control is reachable in Advanced mode.');
