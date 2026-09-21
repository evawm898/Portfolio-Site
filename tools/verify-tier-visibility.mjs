/*
 * verify-tier-visibility.mjs — the Flower Bloom control panel's visibility gate.
 *
 * WHAT IT ASSERTS, whole:
 *
 *     visible  <=>  (Advanced OR tier:"standard")  AND  predicate holds
 *
 * for EVERY wired control, in BOTH tiers, across every config in
 * tools/visibility-matrix.mjs. `predicate` is the control's `standardVisibleWhen` while
 * Standard is active and its `visibleWhen` otherwise; an absent predicate is TRUE.
 *
 * That expression is the rule flower.js's applyVisibility() implements. This gate does not
 * call it. It evaluates each control's REGISTRY DECLARATION here, with the registry's own
 * evalPredicate, against the state snapshot the page decided from (window.__flowerUIState,
 * i.e. readUI()), and compares the result with the DOM. One definition of the predicate
 * (the registry), two independent consumers (the app, this gate) — not two hand-written
 * computations that happen to agree, and not a gate calling the function under test.
 *
 * WHAT THE OLD VERSION MEASURED, AND THE SIZE OF THE HOLE: it asserted "must be visible in
 * Advanced" only for controls matching `c.tier !== 'standard' && !c.visibleWhen` — 25 of
 * 166 controls, in ONE of two modes, at ONE config. Tier was a FILTER on what got examined,
 * so no Standard-tier control was ever checked in Standard mode, which is how edgeNoise
 * could be invisible at the default state with this gate reporting PASS. Tier is now an
 * INPUT to the expectation and nothing is excluded from examination: every wired control,
 * in both tiers, at every config in the matrix — 10,956 assertions as this lands, against
 * 25.
 *
 * (For the record, since the old file's scope note is easy to misread: those 25 are NOT a
 * set that "fell out" of the gate by being promoted to Standard. They are the 25 the gate
 * always covered — the ungated Advanced controls — and they are still Advanced today. The
 * hole was the other 141, which the filter never looked at at all.)
 *
 * WHAT IT MEASURES, AND WHAT IT WOULD MISS: DOM visibility, not geometry. It proves a
 * control is REACHABLE in the UI and that the reason it is or isn't matches its
 * declaration. A control that is visible but wired to nothing passes this gate. A control
 * whose declared condition is a faithful description of WRONG behaviour also passes it —
 * this gate checks the code against the declaration, so a divergence both agree on (see
 * DIVERGENCES below) is reported by the gate's own output, not by a failure.
 *
 * WHY BOTH DIRECTIONS, EVERY CONTROL: "Standard doesn't leak Advanced controls" and
 * "Advanced shows everything" are different assertions, and so are "a predicate that holds
 * shows its control" and "a predicate that fails hides it". Every one of the four has been
 * broken here at least once. All four are now the same assertion, because expected and
 * observed are compared for every control rather than only where a filter allowed it.
 *
 * DIVERGENCES the declarations currently describe CORRECTLY (not gate failures — the gate
 * derives from the declaration and so expects exactly this):
 *   - issue #66: TOOTHED and SCALLOPED are selectable in Standard with no amount control.
 *     Standard's Edge picker means each style to expose exactly one relabelled "Amount"
 *     slider (flower.js EDGE_AMOUNT: jagged->tipLength, scallop->scallopHeight,
 *     ruffled->edgeNoise), but only `edgeNoise` carries tier:"standard" — tipLength and
 *     scallopHeight are Advanced, so in Standard they are correctly hidden and TOOTHED and
 *     SCALLOPED get nothing. The declarations describe that faithfully, so this gate
 *     expects it. It is reported below, from the run's own observations rather than a
 *     hardcoded claim, and left to PR 3. Deliberately NOT special-cased in either
 *     direction: encoding it as an exception would make the gate stop noticing when it is
 *     fixed, and encoding the desired state would make the gate fail for a declaration
 *     that is currently correct.
 *
 * RUN:  node tools/verify-tier-visibility.mjs
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

const { CONTROLS, PREDICATES, evalPredicate } = await import(pathToFileURL(path.join(ROOT, 'flower-registry.js')).href);
const PANEL = CONTROLS.filter((c) => !c.placeholder);
const WIRED = PANEL.filter((c) => !c.uiOnly);

// THE RULE, stated once. `advanced` is the tier the page is in; `ui` is the page's own
// state snapshot. Tier is an INPUT here, never a filter — that distinction is the whole
// change from the previous revision of this file.
const controlPredicate = (c, advanced) => (!advanced && c.standardVisibleWhen) ? c.standardVisibleWhen : c.visibleWhen;
const expectVisible = (c, advanced, ui) =>
  (advanced || c.tier === 'standard') && evalPredicate(controlPredicate(c, advanced), ui);

// A readable reason for the report, derived from the same two terms the rule uses, so a
// failure line says WHICH half of the expectation the DOM disagreed with.
const why = (c, advanced, ui) => {
  const tierOk = advanced || c.tier === 'standard';
  const pred = controlPredicate(c, advanced);
  const predOk = evalPredicate(pred, ui);
  if (!tierOk) return 'tier: Advanced-only control, Standard tier active';
  if (!predOk) return `predicate false: ${JSON.stringify(pred)}`;
  return pred ? `tier ok and predicate true: ${JSON.stringify(pred)}` : 'tier ok and no predicate (unconditional)';
};

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
// module-level `import * as THREE` must succeed or NONE of its boot code (including
// applyVisibility()) ever runs, which would make every control read hidden for the wrong
// reason and this gate fail — or, before the rewrite, pass — for the wrong reason.
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  const fp = path.join(ROOT, 'node_modules/three', rel);
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(fp) }); }
  catch { route.abort(); }
});

const die = async (msg) => { console.error(`tier-visibility: FAIL — ${msg}`); await browser.close(); server.close(); process.exit(1); };

await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
if (pageErrors.length) await die(`page threw before boot completed: ${pageErrors.join('; ')}`);
if (!await page.evaluate(() => !!document.getElementById('advancedToggle'))) await die('#advancedToggle not found in flower.html');
if (!await page.evaluate(() => typeof window.__flowerUIState === 'function')) {
  await die('window.__flowerUIState missing — the gate cannot read the state the panel decided from');
}

// Flip tier exactly the way a visitor does: the checkbox's own 'change' listener drives the
// visibility pass. No injected hook, and the toggle's state is read back rather than assumed.
const setTier = async (advanced) => {
  const got = await page.evaluate((adv) => {
    const t = document.getElementById('advancedToggle');
    if (t.checked !== adv) { t.checked = adv; t.dispatchEvent(new Event('change', { bubbles: true })); }
    return t.checked;
  }, advanced);
  if (got !== advanced) await die(`advancedToggle would not go to ${advanced}`);
  await page.waitForTimeout(160);
};

// Apply a config and READ EVERY VALUE BACK. A harness that sets a value the UI silently
// rewrites (Standard's option-tier fallback does exactly this) measures a different design
// from the one it names and reports a pass. Fail the row; never warn.
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

// Observed state: the wrapper's own `hidden`, AND whether an ancestor (a collapsed
// accordion section, in Standard) hides it anyway. "Reachable" is the property; a visible
// wrapper inside a hidden section is not reachable, and only reading the wrapper would miss
// it — the same class of mistake as auditing a frame with the panel drawn over it.
const observe = () => page.evaluate((ids) => {
  const ui = window.__flowerUIState();
  const rows = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) { rows[id] = { present: false }; continue; }
    const wrap = el.closest('.fl-ctrl');
    if (!wrap) { rows[id] = { present: true, wrapper: false }; continue; }
    rows[id] = { present: true, wrapper: true, hidden: !!wrap.hidden,
                 ancestorHidden: !wrap.hidden && !!wrap.closest('[hidden]') };
  }
  return { ui, rows, standardMode: window.__flowerStandardMode ? window.__flowerStandardMode() : null };
}, WIRED.map((c) => c.id));

const failures = [];
let assertions = 0, visibleObservations = 0;
// Observations that feed the #66 divergence report — recorded from the run, never asserted.
const edgeSectionStandard = {};
const EDGE_SECTION = new Set(WIRED.filter((c) => c.section === 'acc-edge').map((c) => c.id));

for (const cfg of MATRIX) {
  // Configure in ADVANCED: Standard's option-tier fallback can rewrite a picker's live
  // value, so setting a config while Standard is active would silently measure a different
  // design. Tier is flipped only once the config is in place.
  await setTier(true);
  for (const bad of await applySets(RESET)) failures.push(`[${cfg.label}] RESET ${bad}`);
  for (const bad of await applySets(cfg.set)) failures.push(`[${cfg.label}] SET ${bad}`);

  for (const advanced of [true, false]) {
    await setTier(advanced);
    const mode = advanced ? 'Advanced' : 'Standard';
    const { ui, rows, standardMode } = await observe();
    if (standardMode !== null && standardMode === advanced) {
      failures.push(`[${cfg.label}/${mode}] page reports standardMode=${standardMode} while the toggle says advanced=${advanced}`);
    }
    for (const c of WIRED) {
      const r = rows[c.id];
      assertions++;
      if (!r || !r.present) { failures.push(`[${cfg.label}/${mode}] ${c.id}: missing from the DOM`); continue; }
      if (!r.wrapper) { failures.push(`[${cfg.label}/${mode}] ${c.id}: no .fl-ctrl wrapper — visibility cannot be applied to it`); continue; }
      const want = expectVisible(c, advanced, ui);
      const got = !r.hidden && !r.ancestorHidden;
      if (got) visibleObservations++;
      if (!advanced && got && EDGE_SECTION.has(c.id)) (edgeSectionStandard[cfg.label] ||= []).push(c.id);
      if (want === got) continue;
      const buried = r.ancestorHidden ? ' (wrapper shown but an ancestor section is hidden)' : '';
      failures.push(`[${cfg.label}/${mode}] ${c.id} ("${c.label}"): expected ${want ? 'VISIBLE' : 'HIDDEN'}, observed `
        + `${got ? 'VISIBLE' : 'HIDDEN'}${buried} — ${why(c, advanced, ui)}`);
    }
  }
}

// ---- OPTION-LEVEL TIER, BOTH DIRECTIONS ------------------------------------------
// The control-level check above says a control is reachable. It says nothing about the
// OPTIONS inside a select, and a select can be fully visible while one of its options is
// hidden — which is how TOOTHED and SCALLOPED sat unreachable in Standard for weeks after
// the reason for hiding them stopped being true.
//
// The registry declares option-level tier (`advancedOnly` on the option, plus
// `standardFallback` on the control) and flower.js derives ADV_OPTIONS from it, so there is
// one declaration. Both directions are asserted against it, because "doesn't leak into
// Standard" and "does still show in Advanced" are different claims:
//   Standard  — exactly the advancedOnly options are hidden; every other option visible.
//   Advanced  — no option is hidden at all (except registry-`hidden` ones like CUSTOM).
const optionState = async (advanced) => {
  await setTier(advanced);
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

await setTier(true);
for (const bad of await applySets(RESET)) failures.push(`[option-tier] RESET ${bad}`);
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
      failures.push(`[option-tier/Standard] ${c.id}/${o.value}: hidden=${o.hidden}, registry says advancedOnly=${shouldHide}`);
      optFail++;
    }
  }
  for (const o of ad) {
    if (always.has(o.value)) continue;
    if (o.hidden || o.disabled) {
      failures.push(`[option-tier/Advanced] ${c.id}/${o.value}: hidden/disabled in ADVANCED — unreachable in the mode that shows everything`);
      optFail++;
    }
  }
}
const optTotal = PANEL.filter((x) => x.kind === 'select').reduce((n, c) => n + (c.options || []).length, 0);
const advOnly = PANEL.filter((x) => x.kind === 'select').flatMap((c) => (c.options || []).filter((o) => o.advancedOnly).map((o) => `${c.id}/${o.value}`));

await browser.close();
server.close();
if (pageErrors.length) failures.push(`page errors during the run: ${pageErrors.join('; ')}`);

// ---- REPORT -----------------------------------------------------------------------
console.log(`tier-visibility: ${assertions} control-state assertions — ${WIRED.length} WIRED controls x ${MATRIX.length} configs x 2 tiers.`);
console.log(`  (previous revision asserted ${WIRED.filter((c) => c.tier !== 'standard' && !c.visibleWhen).length} controls, Advanced only, at the default config.)`);
console.log(`  ${visibleObservations} of ${assertions} observations were VISIBLE, matching the derived expectation in each case.`);
console.log(`tier-visibility: options OK — ${optTotal} select options agree with the registry in BOTH modes `
  + `(advanced-only: ${advOnly.length ? advOnly.join(', ') : 'none'})${optFail ? ` — ${optFail} disagreement(s), see below` : ''}.`);

// Coverage, printed rather than assumed: a predicate this matrix never drives to both
// polarities is not verified by this matrix, and "34 configs" must not be allowed to imply
// otherwise.
const gaps = uncoveredDrivers(WIRED, (p) => (p && p.ref) ? PREDICATES[p.ref] : p);
if (gaps.length) {
  console.log(`tier-visibility: COVERAGE INCOMPLETE — ${gaps.length} predicate driver(s) the matrix never varies:`);
  for (const g of gaps) console.log('  -', g);
} else {
  console.log('tier-visibility: coverage complete — every predicate driver is varied by the matrix.');
}

// DIVERGENCE REPORT: states the declarations describe faithfully but which are not what the
// panel should do. These are NOT failures — the gate derives its expectation from the
// declaration, so it expects exactly this. Printing them keeps a known-wrong-but-declared
// state from reading as a clean bill of health.
console.log('\ntier-visibility: declared divergences (reported, not asserted against) —');
console.log('  #66  what the Edge section actually offers a STANDARD visitor, per edge style,');
console.log('       observed in this run:');
for (const label of Object.keys(edgeSectionStandard).filter((l) => l.startsWith('tip ') || l === 'defaults')) {
  console.log(`       ${label.padEnd(14)} -> ${edgeSectionStandard[label].join(', ')}`);
}
console.log('       TOOTHED and SCALLOPED get no amount slider: flower.js maps them to tipLength');
console.log('       and scallopHeight, neither of which carries tier:"standard", so Standard');
console.log('       correctly hides them and the picker offers a style with nothing to set. The');
console.log('       registry declares exactly this, which is why the gate passes. Left to PR 3.');

if (failures.length) {
  console.error(`\ntier-visibility: FAIL — ${failures.length} disagreement(s) between the DOM and the registry declarations:`);
  for (const f of failures) console.error('  -', f);
  console.error('\nDo not adjust this gate to make these pass. Each line is a declaration in');
  console.error('flower-registry.js that does not describe what the panel actually does — fix the');
  console.error('declaration (or the code, if the declaration is right).');
  process.exit(1);
}
console.log('\ntier-visibility: PASS — every wired control, in both tiers, across the whole matrix, is');
console.log('exactly as visible as (tier OR standard) AND its registry predicate says it should be.');
