#!/usr/bin/env node
/* THE CURVES-LEAVES SHEET (read docs/bloom-curves-leaves-outcome.md). Four
   things, PRINT PREVIEW ON as a visitor sees it (`openBloom(…, { asShipped: true })`,
   read back as `shownMode === 'export'`):

     1. THE SEED — a leaf on the Arch slider at 60°, then a HAND switch of the
        leaf's Curl from to CURVE (the select focused and the option picked by
        the real keyboard — the seed answers trusted events only): before and
        after on one camera, the fit error the page itself told printed under
        the pair;
     2. A TOOTHED DRAWN OUTLINE — an oak-ish ASYMMETRIC blade (two halves, the
        teeth cut into each), face-on down the blade's own normal;
     3. THE COMPOUND ROSE on a drawn rachis, one leaflet curve shared by every
        leaflet (each at its own scale), side and face-on;
     4. THE ARCH-SIGN PAIR — Arch +60 on the slider beside a hand-DRAWN curve
        that FALLS toward the tip: the same bend, the tip down in both (the
        leaf's arch is the one control whose positive value turns the tip DOWN).

   Every caption is read off the page AFTER the shot (the builder's own leaf
   records, the read-out's seed sentence). The sheet REFUSES (exit 2) on a page
   error, a frame that never settled, a build not shown in export, or a seed
   that did not happen. No pixel delta is quoted.

   Run: node tools/shot-bloom-curves-leaves.mjs [out.png]   (default docs/img/curves-leaves.png) */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild, stillFrame, modeTag } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/img/curves-leaves.png'));
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
const snap = () => page.evaluate(() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, shownTris: m.shownTris, leaf: m.leaf }; });
const valText = (id) => page.evaluate((i) => { const el = document.getElementById(i); const v = el.closest('.bl-ctrl').querySelector('.bl-val'); return { value: el.value, text: v ? v.textContent : '' }; }, id);
async function handPick(id, key) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate((i) => { for (let d = document.getElementById(i).closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }, id);
  await page.focus(`#${id}`); await page.keyboard.press(key);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await settleBuild(page);
}
const exportOnly = async (label) => { const S = await snap(); if (S.shownMode !== 'export') await die(`${label}: shown ${S.shownMode}, not with print preview on`); if (!S.leaf || !S.leaf.built) await die(`${label}: no leaf was built`); return S; };
/* the camera ON THE LEAF: its mid-row centre, from the side (across the leaf's
   own plane — the leaf stands at azimuth `az`, so the side is along its
   tangent) or face-on down the mid-row's own normal */
const leafMid = (L, i = 0) => { const C = L.rowCentre[i]; return C[Math.floor(C.length / 2)]; };
const sideOf = (L, r = 34, i = 0) => { const az = L.azimuths.flat()[i] || 0; return `window.__bloomFrame(${r}, 0, ${JSON.stringify(leafMid(L, i))}, ${JSON.stringify([-Math.sin(az), Math.cos(az), 0])}, [0,0,1])`; };
const faceOf = (L, r = 34, i = 0) => { const C = L.rowCentre[i], N = L.rowNormal[i][Math.floor(C.length / 2)], a = C[0], b = C[C.length - 1]; return `window.__bloomFrame(${r}, 0, ${JSON.stringify(leafMid(L, i))}, ${JSON.stringify(N)}, ${JSON.stringify([b[0] - a[0], b[1] - a[1], b[2] - a[2]])})`; };
const f1 = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(1));
const spineCap = (L) => { const sp = (L.spineBuilt || []).find(Boolean); return sp ? `drawn spine, turn ${f1(sp.turnBuiltDeg)}°${sp.bendClamped ? ' (FOLD LIMIT, told)' : ''}${sp.floorClamped ? ' (floor clamped)' : ''}` : `Arch ${L.archDeg}° on the slider`; };
const outlineCap = (L) => { const o = (L.outlineBuilt || []).filter(Boolean); return o.length ? `drawn outline on ${o.length} blade(s), width scale ${o.map((x) => Number(x.scale).toFixed(3)).filter((v, k, A) => A.indexOf(v) === k).join(' / ')}${o[0].twoSided ? ' (asymmetric — two halves)' : ''}` : 'law outline'; };
const teethCap = (L) => { const S0 = (L.serrationBuilt || [])[0]; if (!S0) return 'no teeth'; return S0.twoSided && S0.sides ? `teeth: left ${S0.sides.left ? S0.sides.left.countBuilt : 0}, right ${S0.sides.right ? S0.sides.right.countBuilt : 0}` : `teeth: ${S0.countBuilt}`; };
const SP = { droop: { mode: 'single', points: [[0, 0], [0.5, -0.06], [0.95, -0.3]] } };
const OUT_C = {
  oak: { mode: 'two-sided', points: [[0, 0.06], [0.3, 0.22], [0.65, 0.19], [1, 0]], right: [[0, 0.06], [0.25, 0.14], [0.6, 0.17], [1, 0]] },
  leaflet: { mode: 'symmetric', points: [[0, 0.1], [0.3, 0.3], [0.65, 0.27], [1, 0]] },
};
const BASE = { stemLength: 70, stemDiameter: 6, leafLength: 52, leafNodes: 1, leafAngle: 20 };

/* ---------------- 1. the seed ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ ...BASE, leafArch: 60 });
let S = await exportOnly('the arched leaf');
const before = await canvas(sideOf(S.leaf));
const beforeCap = spineCap(S.leaf);
await handPick('leafCurlMode', 'c');
const mode = await valText('leafCurlMode'), seedTxt = await valText('leafSpineCurve');
if (mode.value !== 'CURVE' || !/SEEDED/.test(seedTxt.text)) await die(`the hand switch did not seed (mode ${mode.value}, note ${JSON.stringify(seedTxt.text.slice(0, 160))})`);
const seedNote = seedTxt.text.replace(/^.*?SEEDED/, 'SEEDED');
S = await exportOnly('the seeded leaf');
const after = await canvas(sideOf(S.leaf));
const afterCap = spineCap(S.leaf);

/* ---------------- 2. the toothed asymmetric drawn outline ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ ...BASE, leafAngle: 0, leafWidth: 22, leafToothDepth: 0.35, leafToothCount: 6, leafOutlineMode: 'CURVE', leafOutlineCurve: OUT_C.oak });
S = await exportOnly('the oak');
const oak = { b64: await canvas(faceOf(S.leaf, 34)), cap: `${outlineCap(S.leaf)} · ${teethCap(S.leaf)}` };

/* ---------------- 3. the compound rose on a drawn rachis ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafAngle: 20, leafType: 'COMPOUND', leafletToothDepth: 0.15, leafCurlMode: 'CURVE', leafSpineCurve: SP.droop, leafletOutlineMode: 'CURVE', leafletOutlineCurve: OUT_C.leaflet });
S = await exportOnly('the compound rose');
const roseMid = await page.evaluate(() => { const m = window.__bloomMetrics(); const c = m.leaf.compoundBuilt && m.leaf.compoundBuilt[0]; return c && c.axisRod ? c.axisRod.centres[Math.floor(c.axisRod.centres.length / 2)] : null; });
if (!roseMid) await die('the compound leaf reports no axis rod');
const az0 = S.leaf.azimuths.flat()[0] || 0;
const rose = {
  side: await canvas(`window.__bloomFrame(40, 0, ${JSON.stringify(roseMid)}, ${JSON.stringify([-Math.sin(az0), Math.cos(az0), 0])}, [0,0,1])`),
  top: await canvas(`window.__bloomFrame(40, 0, ${JSON.stringify(roseMid)}, [0,0,1], ${JSON.stringify([Math.cos(az0), Math.sin(az0), 0])})`),
  cap: `${spineCap(S.leaf)} (the RACHIS) · ${outlineCap(S.leaf)}`,
};

/* ---------------- 4. the arch-sign pair ---------------- */
await openBloom(page, here.port, { asShipped: true });
await edit({ ...BASE, leafArch: 60 });
S = await exportOnly('Arch +60');
const archPos = { b64: await canvas(sideOf(S.leaf)), cap: spineCap(S.leaf) };
await edit({ leafCurlMode: 'CURVE', leafSpineCurve: SP.droop });
S = await exportOnly('the drawn falling curve');
const drawn = { b64: await canvas(sideOf(S.leaf)), cap: spineCap(S.leaf) };
if (errors.length) await die(`page errors: ${errors.slice(0, 3).join(' | ')}`);

/* ---------------- compose ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = (b64, cap, w = 440) => `<figure><img src="data:image/png;base64,${b64}" style="width:${w}px"><figcaption>${esc(cap)}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0c0f0e;color:#cfd8d4;font:13px/1.45 ui-monospace,Menlo,monospace;padding:24px;width:1460px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:26px 0 8px;color:#6fb7ae}p{margin:0 0 6px;max-width:1400px}
.row{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;max-width:460px}img{display:block;border:1px solid #26302d;border-radius:4px}
figcaption{margin-top:6px;color:#9fb0aa;font-size:12px}</style>
<h1>curves-leaves — the leaf's spine and outline curves; the seed's fit to its tolerance</h1>
<p>Every cell: ${esc(modeTag(S))}. Captions are the builder's own leaf records and the page's own read-out, read after the shot. Side views look across the leaf's own plane; face-on views look down its mid-row normal.</p>
<h2>1 · the seed — the leaf on the Arch slider at +60°, then a hand switch to CURVE</h2>
<p>The page's own sentence: ${esc(seedNote)}</p>
<div class="row">${cell(before, `BEFORE — ${beforeCap}`)}${cell(after, `AFTER — ${afterCap} (the Arch kept, hidden)`)}</div>
<h2>2 · a toothed drawn outline — an oak-ish asymmetric blade, the teeth cut into each half (face-on)</h2>
<div class="row">${cell(oak.b64, oak.cap)}</div>
<h2>3 · the compound rose on a drawn rachis — one leaflet curve on every leaflet, each at its own scale</h2>
<div class="row">${cell(rose.side, `side — ${rose.cap}`)}${cell(rose.top, 'from above')}</div>
<h2>4 · the arch-sign pair — Arch +60 on the slider, and a drawn curve that FALLS toward the tip: the same bend, tip down</h2>
<div class="row">${cell(archPos.b64, archPos.cap)}${cell(drawn.b64, `${drawn.cap} — the curve drawn falling (y down toward the tip)`)}</div>`;
await page.setViewportSize({ width: 1520, height: 1200 });
await page.setContent(html);
await page.waitForTimeout(400);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, await page.screenshot({ fullPage: true }));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`SEED: ${seedNote}`);
console.log(`BEFORE: ${beforeCap} · AFTER: ${afterCap}`);
console.log(`OAK: ${oak.cap}`);
console.log(`ROSE: ${rose.cap}`);
console.log(`ARCH +60: ${archPos.cap} · DRAWN: ${drawn.cap}`);
await browser.close();
here.server.close();
