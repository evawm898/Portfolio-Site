#!/usr/bin/env node
/* THE CURVES-SEPALS SHEET (read docs/bloom-curves-sepals-outcome.md). Four
   things, PRINT PREVIEW ON as a visitor sees it (`openBloom(…, { asShipped: true })`,
   read back as `shownMode === 'export'`):

     1. THE SEED — the petals on the curl sliders at 120°, then a HAND switch to
        CURVE (the select focused and the option picked by the real keyboard —
        the seed answers trusted events only): before and after on one camera,
        with the fit error the page itself told printed under the pair;
     2. SEPALS ON A DRAWN REFLEXED SPINE (sepal Curl from CURVE);
     3. A TWO-TIER CALYX ON TWO OUTLINES — tier 1 lanceolate, tier 2 rounded on
        a 40 mm GOBLET, each tier's values its own scope's (`__bloomScopes`);
     4. THE ANGLE LIMIT BINDING — an incurved drawn sepal asked up at 60°
        beside the straight slider sepal at the same ask: the limit is drawn on
        the CURVED lamina, so the two stop at different angles.

   Every caption is read off the page AFTER the shot (the builder's own sepal
   records, the read-out's seed sentence). The sheet REFUSES (exit 2) on a page
   error, a frame that never settled, a build not shown in export, or a seed
   that did not happen. No pixel delta is quoted.

   Run: node tools/shot-bloom-curves-sepals.mjs [out.png]   (default docs/img/curves-sepals.png) */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild, stillFrame, modeTag } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/img/curves-sepals.png'));
const VIEW = 520, DPR = 2;
const here = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const die = async (msg) => { console.error('HARNESS INVALID: ' + msg); await browser.close(); here.server.close(); process.exit(2); };
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: typeof value === 'object' ? JSON.stringify(value) : String(value) }));

async function settleOnly() {
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let a = null, b = null;
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return c;
    a = b; b = c;
  }
  return null;
}
async function canvas(frame) {
  await page.setViewportSize({ width: VIEW, height: VIEW });
  const bad = await stillFrame(page);
  if (bad.length) await die(`stillFrame: ${bad.join('; ')}`);
  await page.evaluate(frame);
  const shot = await settleOnly();
  if (!shot) await die('a canvas frame never settled');
  await page.evaluate(() => document.body.classList.remove('bl-preview'));
  return shot.toString('base64');
}
async function edit(sets) { const bad = await applyConfig(page, set(sets)); if (bad.length) await die(`an edit did not take: ${bad.join('; ')}`); }
async function scopes(rec) { await page.evaluate((r) => window.__bloomScopes(r), rec); await settleBuild(page); }
const snap = () => page.evaluate(() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, shownTris: m.shownTris, fitRadius: m.fitRadius, fitCenter: m.fitCenter, sepal: m.sepal }; });
const valText = (id) => page.evaluate((i) => { const el = document.getElementById(i); const v = el.closest('.bl-ctrl').querySelector('.bl-val'); return { value: el.value, text: v ? v.textContent : '' }; }, id);
async function handPick(id, key) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate((i) => { for (let d = document.getElementById(i).closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }, id);
  await page.focus(`#${id}`); await page.keyboard.press(key);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await settleBuild(page);
}
const side = (S, k = 1.1) => `window.__bloomFrame(${S.fitRadius * k}, 0, ${JSON.stringify(S.fitCenter || [0, 0, 0])}, [1,0,0], [0,0,1])`;
const quarter = (S, k = 1.1) => `window.__bloomFrame(${S.fitRadius * k}, 0.2, ${JSON.stringify(S.fitCenter || [0, 0, 0])})`;
const exportOnly = async (label) => { const S = await snap(); if (S.shownMode !== 'export') await die(`${label}: shown ${S.shownMode}, not with print preview on`); return S; };
const f1 = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(1));
const tierLine = (T) => (T.present
  ? `tier ${T.tier + 1}: ${T.count} sepals, turn ${T.petals && T.petals[0] && T.petals[0].spine ? f1(T.petals[0].spine.turnBuiltDeg) : '—'}°${T.petals && T.petals[0] && T.petals[0].spine && T.petals[0].spine.curveMode ? ' (drawn spine)' : ' (curl sliders)'}, angle ${T.limit ? `${T.limit.angleBuiltDeg}°${T.limit.clamped ? ` CLAMPED (limit ${T.limit.limitDeg}°, against ${T.limit.against})` : ` (clear to ${T.limit.limitDeg}°)`}` : '—'}`
  : `tier ${T.tier + 1}: NOT BUILT — ${T.why}`);
const SC = {
  reflex: { mode: 'single', points: [[0, 0], [0.5, -0.05], [0.9, -0.3]] },
  incurve: { mode: 'single', points: [[0, 0], [0.45, 0.06], [0.8, 0.3], [0.92, 0.55]] },
};
const SO = {
  lance: { mode: 'symmetric', points: [[0, 0.06], [0.25, 0.14], [0.5, 0.15], [0.8, 0.09], [1, 0]] },
  round: { mode: 'symmetric', points: [[0, 0.06], [0.3, 0.22], [0.6, 0.24], [0.9, 0.14], [1, 0]] },
};

/* ---------------- 1. the seed ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ petalSpineCurl: 120 });
let S = await exportOnly('the slider petals');
const before = await canvas(quarter(S));
await handPick('petalCurlMode', 'c');
const mode = await valText('petalCurlMode'), seedTxt = await valText('petalSpineCurve');
if (mode.value !== 'CURVE' || !/SEEDED/.test(seedTxt.text)) await die(`the hand switch did not seed (mode ${mode.value}, note ${JSON.stringify(seedTxt.text.slice(0, 160))})`);
const seedNote = seedTxt.text.replace(/^.*?SEEDED/, 'SEEDED');
const after = await canvas(quarter(S));

/* ---------------- 2. the reflexed sepals ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ sepalCount: 5, sepalLength: 30, sepalCurlMode: 'CURVE', sepalSpineCurve: SC.reflex });
S = await exportOnly('the reflexed sepals');
const reflex = { b64: await canvas(side(S)), cap: S.sepal.tiers.map(tierLine).join(' · ') };

/* ---------------- 3. two tiers on two outlines ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ sepalCount: 5, sepalTiers: 2, stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40, sepalLength: 30, sepalWidth: 12 });
await scopes({ layers: [], petals: [], tiers: [
  { tier: 0, offsets: {}, values: { sepalOutlineMode: 'CURVE', sepalOutlineCurve: SO.lance } },
  { tier: 1, offsets: {}, values: { sepalOutlineMode: 'CURVE', sepalOutlineCurve: SO.round, sepalCurlMode: 'CURVE', sepalSpineCurve: SC.reflex } }] });
S = await exportOnly('the two-tier calyx');
if (S.sepal.tiersBuilt !== 2) await die(`the two-tier calyx built ${S.sepal.tiersBuilt} tiers`);
const tiers = { b64: await canvas(side(S)), q: await canvas(quarter(S)), cap: S.sepal.tiers.map(tierLine).join(' · ') };

/* ---------------- 4. the angle limit binding ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ sepalCount: 5, sepalAngle: 60 });
S = await exportOnly('the straight sepal');
const straight = { b64: await canvas(side(S)), cap: S.sepal.tiers.map(tierLine).join(' · ') };
await edit({ sepalCurlMode: 'CURVE', sepalSpineCurve: SC.incurve });
S = await exportOnly('the incurved sepal');
const T0 = S.sepal.tiers[0];
if (!T0.limit || !T0.limit.clamped) await die('the incurved sepal at 60 was not clamped by the angle limit');
const incurved = { b64: await canvas(side(S)), cap: S.sepal.tiers.map(tierLine).join(' · ') };
if (errors.length) await die(`page errors: ${errors.slice(0, 3).join(' | ')}`);

/* ---------------- compose ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = (b64, cap, w = 440) => `<figure><img src="data:image/png;base64,${b64}" style="width:${w}px"><figcaption>${esc(cap)}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0c0f0e;color:#cfd8d4;font:13px/1.45 ui-monospace,Menlo,monospace;padding:24px;width:1460px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:26px 0 8px;color:#6fb7ae}p{margin:0 0 6px;max-width:1400px}
.row{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;max-width:460px}img{display:block;border:1px solid #26302d;border-radius:4px}
figcaption{margin-top:6px;color:#9fb0aa;font-size:12px}</style>
<h1>curves-sepals — CURVE seeded from the slider shape; sepal spine and outline curves, per tier</h1>
<p>Every cell: ${esc(modeTag(S))}. Captions are the builder's own sepal records and the page's own read-out, read after the shot.</p>
<h2>1 · the seed — petal curl 120° on the sliders, then a hand switch to CURVE</h2>
<p>The page's own sentence: ${esc(seedNote)}</p>
<div class="row">${cell(before, 'BEFORE — Curl from SLIDER, curl 120°')}${cell(after, 'AFTER — Curl from CURVE, the seeded spine (the sliders kept, hidden)')}</div>
<h2>2 · sepals on a drawn REFLEXED spine (sepal Curl from CURVE, 30 mm sepals)</h2>
<div class="row">${cell(reflex.b64, reflex.cap)}</div>
<h2>3 · a two-tier calyx on two outlines — tier 1 lanceolate, tier 2 rounded on the reflex (a 40 mm GOBLET, 30 x 12 mm sepals)</h2>
<div class="row">${cell(tiers.b64, `side view — ${tiers.cap}`)}${cell(tiers.q, 'three-quarter view')}</div>
<h2>4 · the angle limit binding — the same 60° ask, drawn on the curved lamina</h2>
<div class="row">${cell(straight.b64, `straight (curl sliders at 0) — ${straight.cap}`)}${cell(incurved.b64, `incurved drawn spine — ${incurved.cap}`)}</div>`;
await page.setViewportSize({ width: 1520, height: 1200 });
await page.setContent(html);
await page.waitForTimeout(400);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, await page.screenshot({ fullPage: true }));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`SEED: ${seedNote}`);
console.log(`REFLEX: ${reflex.cap}`);
console.log(`TIERS: ${tiers.cap}`);
console.log(`STRAIGHT: ${straight.cap}`);
console.log(`INCURVED: ${incurved.cap}`);
await browser.close();
here.server.close();
