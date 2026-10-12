import { serveRepo, launchPage, openBloom, buildMatrix } from '/home/user/Portfolio-Site/tools/bloom-harness.mjs';
const row = buildMatrix().find((r) => r.label === 'ALL MAX');
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1200, height: 800 } });
page.setDefaultTimeout(900000);
await openBloom(page, port);
// set every value with input events but WITHOUT the harness's 30 s settle; then one synchronous rebuild per kind
await page.evaluate((ss) => { for (const s of ss) { const el = document.getElementById(s.id); el.value = s.value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }, row.set);
await page.waitForFunction(() => window.__bloomBuildState().pending === false, null, { timeout: 900000, polling: 1000 });
const back = await page.evaluate((ss) => ss.filter((s) => { const el = document.getElementById(s.id); return String(el.value) !== String(s.value) && Math.abs(Number(el.value) - Number(s.value)) > 1e-9; }).map((s) => `${s.id}: set ${s.value} got ${document.getElementById(s.id).value}`), row.set);
console.log('read-back mismatches:', back.length ? back.join('; ') : 'none', '| rows set', row.set.length);
for (const k of ['full', 'A', 'B', 'C']) {
  const t = Date.now();
  try { const r = await page.evaluate((kk) => window.__f7.rebuildAs(kk), k); console.log(k, r.ms.toFixed(0), 'ms', r.tris, 'tris'); }
  catch (e) { console.log(k, 'FAILED after', Date.now() - t, 'ms:', String(e).slice(0, 200)); }
}
await browser.close(); server.close();
