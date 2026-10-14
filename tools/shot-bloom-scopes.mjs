#!/usr/bin/env node
/* THE SCOPE SELECTION SHEET (Scoping-b, Eva's rulings — read
   docs/bloom-scoping-selection.md). Three things, each driven through the
   page's own controls and the picker's own hook (`__bloomScopeView.select`,
   the function the picker's change handler calls — never `__bloomScopes`):

     1. a RADIAL bloom with each of its three layers different (per-layer
        values ON; each layer picked and edited through the normal panel),
        beside the same bloom with the toggle OFF (the record kept, nothing
        built from it) on ONE camera;
     2. a FAN orchid with one lateral pair changed (per-petal values ON; the
        pair picked by its second member and edited), beside the toggle OFF;
     3. the panel at each: the whole bloom with the picker listing which
        scopes carry their own values, and a picked scope with every control
        telling its whole-bloom value and its offset.

   PRINT PREVIEW ON, as a visitor sees it (`openBloom(…, { asShipped: true })`,
   read back as `shownMode === 'export'`). Every caption is read off the page
   AFTER the shot: the builder's per-petal record (`petalSlotForms[].applied`
   and `.scope`), the raw record, the build counter. The sheet REFUSES (exit 2)
   on a pick that rebuilt or moved the record, on a whole-bloom state that an
   edit moved, or on a frame that never settled. No pixel delta is quoted:
   the renderer is not deterministic between page sessions and nothing here
   needs one.

   Run: node tools/shot-bloom-scopes.mjs [out.png]   (default docs/img/scope-selection.png) */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild, stillFrame, modeTag, fullStateDrift } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/img/scope-selection.png'));
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
async function panel(open) {
  await page.setViewportSize({ width: 900, height: 2400 });
  /* open each named section AND its ancestors (a child inside a shut parent
     is not on screen), every other section shut */
  await page.evaluate((ids) => {
    for (const d of document.querySelectorAll('#panelControls details')) d.open = false;
    for (const id of ids) for (let d = document.getElementById(`sec-${id}`); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
  }, open);
  await page.waitForTimeout(300);
  const box = await page.evaluate((ids) => {
    const p = document.querySelector('.bl-panel');
    const ro = document.getElementById('readout');
    const r = p.getBoundingClientRect(), t = ro ? ro.getBoundingClientRect().top : r.bottom;
    const shut = ids.filter((id) => { const d = document.getElementById(`sec-${id}`); return !d || !d.open || d.hidden; });
    return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, t - r.top), clipped: p.scrollHeight > p.clientHeight + 1, shut };
  }, open);
  if (box.clipped) await die('the panel is clipped at this viewport — the shot would hide part of it');
  if (box.shut.length) await die(`sections ${box.shut.join(', ')} are not open on screen for the panel shot`);
  /* the read-out below the action buttons is cropped off: it is the bloom's
     long build report, not the panel the selection changes */
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  await page.setViewportSize({ width: VIEW, height: VIEW });
  return shot.toString('base64');
}
const snap = () => page.evaluate(() => ({
  count: window.__bloomBuildState().count, rec: JSON.stringify(window.__bloomDesign.scopes()),
  m: (() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, shownTris: m.shownTris, fitRadius: m.fitRadius, fitCenter: m.fitCenter, forms: m.petalSlotForms.map((f) => ({ index: f.index, whorl: f.whorl, applied: f.applied, scope: f.scope })) }; })(),
}));
/* a pick must be a pure load: no rebuild, no write */
async function pick(sel) {
  const a = await snap();
  const got = await page.evaluate((s) => window.__bloomScopeView.select(s), sel);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await settleBuild(page);
  const b = await snap();
  if (a.count !== b.count || a.rec !== b.rec) await die(`picking ${JSON.stringify(sel)} rebuilt (${a.count} -> ${b.count}) or wrote (${a.rec} -> ${b.rec})`);
  return got;
}
async function edit(sets) {
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`an edit did not take: ${bad.join('; ')}`);
}
const f2 = (v) => (v === undefined ? '—' : Number(v).toFixed(2).replace(/\.00$/, ''));

/* ---------------- 1. RADIAL, each layer different ---------------- */
const GLOBAL_R = { layerCount: 3 };
const LAYER_EDITS = [
  { layer: 0, sets: { petalSpineCurl: -40 }, says: 'layer 1 (outer): curl −40° (flared)' },
  { layer: 1, sets: { petalCup: 0.6 }, says: 'layer 2: cup 0.60' },
  { layer: 2, sets: { petalSpineCurl: 180, petalTwist: 30 }, says: 'layer 3 (inner): curl 180°, twist 30° (incurved)' },
];
await openBloom(page, here.port, { asShipped: true });
await edit(GLOBAL_R);
await edit({ scopeLayers: 'ON' });
for (const L of LAYER_EDITS) { await pick({ kind: 'layer', layer: L.layer, slot: 0 }); await edit(L.sets); }
await page.evaluate(() => window.__bloomScopeView.deselect());
await settleBuild(page);
const driftR = await fullStateDrift(page, set({ ...GLOBAL_R, scopeLayers: 'ON' }));
if (driftR.length) await die(`the whole-bloom state moved under the layer edits: ${driftR.join('; ')}`);
const R = await snap();
if (R.m.shownMode !== 'export') await die(`the RADIAL bloom is shown ${R.m.shownMode}, not with print preview on`);
const rRadius = R.m.fitRadius * 1.15;
const perWhorl = (forms) => [0, 1, 2].map((w) => { const f = forms.find((x) => x.whorl === w); return f ? `layer ${w + 1}: cup ${f2(f.applied.petalCup ?? 0)}, curl ${f2(f.applied.petalSpineCurl ?? 0)}°, twist ${f2(f.applied.petalTwist ?? 0)}°${f.scope ? '' : ' (no scope)'}` : `layer ${w + 1}: —`; }).join(' · ');
const rOnQ = await canvas(`window.__bloomFrame(${rRadius}, 0.2)`);
const rOnSide = await canvas(`window.__bloomFrame(${rRadius}, 0, [0,0,0], [1,0,0], [0,0,1])`);
const rPanelWhole = await panel(['arrangement']);
await pick({ kind: 'layer', layer: 1, slot: 0 });
const rPanelPicked = await panel(['form']);  // Petal form, inside Petal
const rPickedStatus = await page.evaluate(() => window.__bloomScopeView.bar().status);
await page.evaluate(() => window.__bloomScopeView.deselect());
await edit({ scopeLayers: 'OFF' });
const R0 = await snap();
if (R0.rec !== R.rec) await die('switching per-layer OFF changed the record');
const rOffQ = await canvas(`window.__bloomFrame(${rRadius}, 0.2)`);

/* ---------------- 2. FAN, one lateral pair changed ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ placement: 'FAN' });
await edit({ scopePetals: 'ON' });
const F0 = await snap();
const n = F0.m.forms.length;
const member = n - 2;                        // the second member of a lateral pair (2, n-2): Petal 3
const canon = Math.min(member, (n - member) % n);
const got = await pick({ kind: 'petal', layer: 0, slot: member });
if (!got || got.slot !== canon) await die(`picking slot ${member} bound ${JSON.stringify(got)}, not the pair ${canon}`);
await edit({ petalSpineCurl: -90, petalCup: 0.6 });
await page.evaluate(() => window.__bloomScopeView.deselect());
await settleBuild(page);
const driftF = await fullStateDrift(page, set({ placement: 'FAN', scopePetals: 'ON' }));
if (driftF.length) await die(`the whole-bloom state moved under the pair edit: ${driftF.join('; ')}`);
const F = await snap();
const fRadius = F.m.fitRadius * 1.2, fAt = JSON.stringify(F.m.fitCenter || [0, 0, 0]);
const moved = F.m.forms.filter((f) => f.scope).map((f) => f.index).sort((a, b) => a - b);
const perSlot = F.m.forms.map((f) => `${f.index}${f.scope ? `: curl ${f2(f.applied.petalSpineCurl)}°, cup ${f2(f.applied.petalCup)}` : ''}`).join(' · ');
const fOnFace = await canvas(`window.__bloomFrame(${fRadius}, 0, ${fAt}, [0,0,1], [-1,0,0])`);
const fOnQ = await canvas(`window.__bloomFrame(${fRadius}, 0.25, ${fAt})`);
await pick({ kind: 'petal', layer: 0, slot: canon });
const fPanelPicked = await panel(['form']);
const fPickedStatus = await page.evaluate(() => window.__bloomScopeView.bar().status);
await page.evaluate(() => window.__bloomScopeView.deselect());
await edit({ scopePetals: 'OFF' });
const fOffFace = await canvas(`window.__bloomFrame(${fRadius}, 0, ${fAt}, [0,0,1], [-1,0,0])`);
if (errors.length) await die(`page errors: ${errors.slice(0, 3).join(' | ')}`);

/* ---------------- compose ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = (b64, cap, w = 360) => `<figure><img src="data:image/png;base64,${b64}" style="width:${w}px"><figcaption>${esc(cap)}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0c0f0e;color:#cfd8d4;font:13px/1.45 ui-monospace,Menlo,monospace;padding:24px;width:1500px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:26px 0 8px;color:#6fb7ae}p{margin:0 0 6px;max-width:1440px}
.row{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;max-width:380px}img{display:block;border:1px solid #26302d;border-radius:4px}
figcaption{margin-top:6px;color:#9fb0aa;font-size:12px}.panel img{width:300px}.panel figure{max-width:320px}</style>
<h1>Scoping-b — the selection view (per-layer values on a RADIAL bloom, per-petal values on a FAN)</h1>
<p>Every bloom cell: ${esc(modeTag(R.m))}. Each scope was PICKED (the picker's own function) and edited through the normal panel; each pick was checked to rebuild nothing and write nothing. The whole-bloom state read back as the defaults plus the toggle after every edit. "Toggle OFF" is the same record kept and nothing built from it, on the same camera.</p>
<h2>1 · RADIAL, three layers, each its own values</h2>
<p>${esc(LAYER_EDITS.map((l) => l.says).join(' · '))}. Built: ${esc(perWhorl(R.m.forms))}. Record: ${esc(R.rec)}.</p>
<div class="row">
${cell(rOnQ, `per-layer ON — three-quarter view, ${R.m.shownTris.toLocaleString()} tris shown`)}
${cell(rOnSide, 'per-layer ON — side view (the curl and twist read in profile)')}
${cell(rOffQ, `per-layer OFF — the record kept (${R0.rec === R.rec ? 'unchanged' : 'CHANGED'}), every layer the whole bloom's; same camera, ${R0.m.shownTris.toLocaleString()} tris`)}
</div>
<div class="row panel">
${cell(rPanelWhole, 'the panel, whole bloom (Arrangement open): the Per-layer values row names the layers that carry their own values; the picker above the controls lists them', 300)}
${cell(rPanelPicked, `the panel, Layer 2 picked (Petal form open): ${rPickedStatus}`, 300)}
</div>
<h2>2 · FAN orchid, one lateral pair changed</h2>
<p>Picked by its second member (slot ${member}), bound to the pair (canonical slot ${canon}); edited to curl −90°, cup 0.60. Petals carrying the pair's offsets: slots ${moved.join(' and ')} of ${n}. Built per slot: ${esc(perSlot)}. Record: ${esc(F.rec)}.</p>
<div class="row">
${cell(fOnFace, 'per-petal ON — face-on (petal 1, the mirror-line petal, at the bottom)')}
${cell(fOnQ, 'per-petal ON — three-quarter view')}
${cell(fOffFace, 'per-petal OFF — the record kept, the fan as it ships; same camera')}
</div>
<div class="row panel">
${cell(fPanelPicked, `the panel, Petal ${canon + 1} picked (Petal form open): ${fPickedStatus}`, 300)}
</div>`;
await page.setViewportSize({ width: 1560, height: 1200 });
await page.setContent(html);
await page.waitForTimeout(400);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, await page.screenshot({ fullPage: true }));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`RADIAL: ${perWhorl(R.m.forms)}`);
console.log(`FAN: pair ${canon}+${(n - canon) % n} — ${moved.join(',')} of ${n} carry the offsets`);
await browser.close();
here.server.close();
