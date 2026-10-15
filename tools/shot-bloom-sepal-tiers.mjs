#!/usr/bin/env node
/* THE SEPAL TIERS SHEET (F1.1a — read docs/bloom-sepal-tiers-outcome.md). Three
   things, PRINT PREVIEW ON as a visitor sees it (`openBloom(…, { asShipped: true })`,
   read back as `shownMode === 'export'`):

     1. THE WINGED LANTERN — three tiers stepping DOWN the hub-to-stem join of a
        40 mm GOBLET, the top tier carrying the WING (120 x 5 mm, curled) and
        the two below stepping down in size through TIER SCOPES (per-tier
        offsets on the global sepal values, the `__bloomScopes` record the
        design file carries);
     2. TWO TIERS down a 20 mm hub, the height law alone (no scope);
     3. THE CLAMPED CASE — three tiers asked UP at 60 on a 10 mm hub, where
        tiers 2 and 3 are CLAMPED against the tier above (the contact clamp,
        drawn), with the limit each tier was built at and what it met.

   Every caption is read off the page AFTER the shot — the builder's own tier
   records (`__bloomMetrics().sepal.tiers`): present, the attachment fraction
   and z, the built angle, the limit and what it was drawn against, the
   effective length. The sheet REFUSES (exit 2) on a page error, a frame that
   never settled, a build not shown in export, or a tier the record says is
   not built where the cell claims one. No pixel delta is quoted.

   Run: node tools/shot-bloom-sepal-tiers.mjs [out.png]   (default docs/img/sepal-tiers.png) */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild, stillFrame, modeTag } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/img/sepal-tiers.png'));
const VIEW = 520, DPR = 2;
const here = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const die = async (msg) => { console.error('HARNESS INVALID: ' + msg); await browser.close(); here.server.close(); process.exit(2); };
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

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
async function edit(sets) {
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`an edit did not take: ${bad.join('; ')}`);
}
async function scopes(rec) {
  await page.evaluate((r) => window.__bloomScopes(r), rec);
  await settleBuild(page);
}
const snap = () => page.evaluate(() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, shownTris: m.shownTris, fitRadius: m.fitRadius, fitCenter: m.fitCenter, sepal: m.sepal, scopes: m.scopes }; });
const f1 = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(1));
const f3 = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(3));
const tierLine = (T) => T.present
  ? `tier ${T.tier + 1}: ${T.count} sepals, ${T.petals && T.petals[0] ? `${f1(T.petals[0].length)} mm long built` : '—'} (${T.effective && Number(T.effective.sepalLength) === 0 ? 'the petal x size' : 'own size'}), at ${f3(T.attachment && T.attachment.frac)} of the join (z ${f1(T.attachment && T.attachment.zAttach)} mm)${T.order && T.order.orderClamped ? ' ORDER-CLAMPED' : ''}, angle ${T.limit ? `${T.limit.angleBuiltDeg}°${T.limit.clamped ? ` CLAMPED (limit ${T.limit.limitDeg}°, against ${T.limit.against})` : ` (clear to ${T.limit.limitDeg}°)`}` : '—'}`
  : `tier ${T.tier + 1}: NOT BUILT — ${T.why}`;
async function cellOf(label, frame, wantBuilt) {
  const S = await snap();
  if (S.shownMode !== 'export') await die(`${label}: shown ${S.shownMode}, not with print preview on`);
  if (S.sepal.tiersBuilt !== wantBuilt) await die(`${label}: ${S.sepal.tiersBuilt} tiers built where the cell claims ${wantBuilt}`);
  const b64 = await canvas(frame(S));
  return { b64, S, cap: S.sepal.tiers.map(tierLine).join(' · ') };
}
const side = (S, k = 1.1) => `window.__bloomFrame(${S.fitRadius * k}, 0, ${JSON.stringify(S.fitCenter || [0, 0, 0])}, [1,0,0], [0,0,1])`;
const quarter = (S, k = 1.1) => `window.__bloomFrame(${S.fitRadius * k}, 0.2, ${JSON.stringify(S.fitCenter || [0, 0, 0])})`;

/* ---------------- 1. the winged lantern ---------------- */
const LANTERN = { stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40, sepalCount: 5, sepalTiers: 3, sepalLength: 30, sepalWidth: 8, sepalAngle: 20, sepalTipShape: 1.7 };
const LANTERN_SCOPES = { layers: [], petals: [],
  tiers: [
    { tier: 0, offsets: { sepalLength: 90, sepalWidth: -3, sepalAngle: -30, sepalSpineCurl: 120, sepalCurlBias: 0.4, sepalTipShape: -1.1 } },  // the WING on top: 120 x 5, angle -10, curl +120 to the tip
    { tier: 2, offsets: { sepalLength: -12, sepalWidth: -2 } },                                                                               // the bottom tier a step smaller
  ] };
await openBloom(page, here.port, { asShipped: true });
await edit(LANTERN);
await scopes(LANTERN_SCOPES);
const L = await cellOf('the lantern', side, 3);
const Lq = await canvas(quarter(L.S));
await scopes(null);
const L0 = await cellOf('the lantern, no scopes', side, 3);

/* ---------------- 2. two tiers, the height law alone ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 20, sepalCount: 5, sepalTiers: 2, sepalAngle: 15 });
const T2 = await cellOf('two tiers', side, 2);

/* ---------------- 3. the clamped case ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 10, sepalCount: 5, sepalTiers: 3, sepalAngle: 60 });
const C = await cellOf('the clamped case', side, 3);
const clampedTiers = C.S.sepal.tiers.filter((T) => T.present && T.limit && T.limit.clamped && /tier/.test(T.limit.against || ''));
if (!clampedTiers.length) await die('the clamped case: no tier is clamped against the tier above');
if (errors.length) await die(`page errors: ${errors.slice(0, 3).join(' | ')}`);

/* ---------------- compose ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = (b64, cap, w = 440) => `<figure><img src="data:image/png;base64,${b64}" style="width:${w}px"><figcaption>${esc(cap)}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0c0f0e;color:#cfd8d4;font:13px/1.45 ui-monospace,Menlo,monospace;padding:24px;width:1460px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:26px 0 8px;color:#6fb7ae}p{margin:0 0 6px;max-width:1400px}
.row{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;max-width:460px}img{display:block;border:1px solid #26302d;border-radius:4px}
figcaption{margin-top:6px;color:#9fb0aa;font-size:12px}</style>
<h1>F1.1a — stacked sepal tiers (N tiers down the hub-to-stem join; tier 1 is today's whorl)</h1>
<p>Every cell: ${esc(modeTag(L.S))}. Every caption is the builder's own tier record read after the shot: where each tier attached (a fraction of the join, and z), its size, its built angle and the limit it was drawn to — and what it met.</p>
<h2>1 · the winged lantern — three tiers stepping down a 40 mm GOBLET join, the WING on top (tier scopes)</h2>
<p>Globals: 5 sepals a tier, 30 x 8 mm, angle 20. Scopes: tier 1 +90 mm / −3 mm / angle −30 / curl +120 to the tip / tip 0.60 (the WING); tier 3 −12 mm / −2 mm. Record: ${esc(JSON.stringify(L.S.scopes))}.</p>
<div class="row">
${cell(L.b64, `side view — ${L.cap}`)}
${cell(Lq, `three-quarter view, ${L.S.shownTris.toLocaleString()} tris shown`)}
${cell(L0.b64, `the same three tiers with NO scopes (every tier the global 30 x 8 at 20°) — ${L0.cap}`)}
</div>
<h2>2 · two tiers down a 20 mm hub — the height law alone</h2>
<p>Sepal height 0.75 places tier 1; tier k sits at height x (N − k + 1) / N of the join, floored one gap (two sheet half-thicknesses) under the tier above.</p>
<div class="row">${cell(T2.b64, T2.cap)}</div>
<h2>3 · the clamped case — three tiers asked UP at 60 on a 10 mm hub</h2>
<p>Tier 1's limit is drawn against the petals as before; each lower tier's limit is drawn against the petals AND every tier above it, so a tier asked up stops under the one above. ${esc(clampedTiers.map((T) => `tier ${T.tier + 1} clamped at ${T.limit.angleBuiltDeg}° against ${T.limit.against}`).join('; '))}.</p>
<div class="row">${cell(C.b64, C.cap)}</div>`;
await page.setViewportSize({ width: 1520, height: 1200 });
await page.setContent(html);
await page.waitForTimeout(400);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, await page.screenshot({ fullPage: true }));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`LANTERN: ${L.cap}`);
console.log(`TWO: ${T2.cap}`);
console.log(`CLAMPED: ${C.cap}`);
await browser.close();
here.server.close();
