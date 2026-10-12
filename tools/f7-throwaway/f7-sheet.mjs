// F7 phase 1 sheet: a heavy config mid-drag under A / B / C beside FULL.
// Each cell is the prototype's own rebuild of that kind, chrome hidden,
// autoRotate off, settled until two consecutive frames are byte-identical.
import fs from 'node:fs';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame } from '/home/user/Portfolio-Site/tools/bloom-harness.mjs';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const CONFIGS = [
  ['Dense infill (VORONOI x 40 cells), one whorl', { petalInfill: 'VORONOI', infillDensity: 40 }],
  ['Mixed heavy: infill 40 x 3 whorls + raceme + 5 sepals', { petalInfill: 'VORONOI', infillDensity: 40, layerCount: 3, stemLength: 120, inflorescence: 'RACEME', sepalCount: 5 }],
  ['Leaves: 24 lobed leaves, whorled x 8 nodes', { stemLength: 90, stemDiameter: 6, leafLength: 45, leafAngle: 35, leafNodes: 8, leafPhyllotaxy: 'whorled', leafType: 'LOBED' }],
];
const KINDS = [['full', 'FULL print (what release shows)'], ['A', 'A — print minus infill'], ['B', 'B — print minus infill + bead'], ['C', 'C — non-print (live) view']];
async function settled(page, loc) {
  let prev = null;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(250);
    const b = await loc.screenshot();
    if (prev && b.equals(prev)) return b;
    prev = b;
  }
  return prev;
}
const { server, port } = await serveRepo();
const cells = [];
for (const [label, sets] of CONFIGS) {
  const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 } });
  page.setDefaultTimeout(600000);
  await openBloom(page, port);
  const bad = await applyConfig(page, Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })));
  if (bad.length) throw new Error(label + ': ' + bad.join('; '));
  const sf = await stillFrame(page); if (sf.length) throw new Error(sf.join('; '));
  // frame once on the FULL build so every kind shares one camera
  await page.evaluate(() => window.__f7.rebuildAs('full'));
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const views = [['whole', () => page.evaluate((r) => window.__bloomFrame(r, 0.15), m0.fitRadius)]];
  if (m0.petalMid && m0.petalNormal) views.push(['petal close-up', () => page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: 14, at: m0.petalMid, dir: m0.petalNormal })]);
  const row = { label, cells: [] };
  for (const [vname, frame] of views) {
    for (const [k, kl] of KINDS) {
      const r = await page.evaluate((kk) => window.__f7.rebuildAs(kk), k);
      await frame();
      const m = await page.evaluate(() => window.__bloomMetrics());
      const png = await settled(page, page.locator('#bloom-canvas'));
      const fn = `${cells.length}-${k}-${vname.replace(/\W+/g, '')}.png`;
      fs.writeFileSync(`${OUT}/${fn}`, png);
      row.cells.push({ fn, cap: `${kl}<br>${vname} · shownMode ${m.shownMode} · ${r.tris.toLocaleString()} tris · rebuild ${r.ms.toFixed(0)} ms` });
      cells.push(fn);
    }
  }
  CONFIGS.rows = (CONFIGS.rows || []).concat([row]);
  await browser.close();
}
const html = `<!doctype html><meta charset=utf-8><style>body{background:#0a0a0c;color:#ddd;font:12px monospace;margin:16px}h2{font-size:14px;color:#6fb7ae;margin:18px 0 6px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.c img{width:100%;display:block;border:1px solid #333}.c div{padding:3px 0 8px;line-height:1.35}</style>
<h1 style="font-size:16px">F7 — what a slider drag would show (light A / B / C) beside full print geometry</h1>
<p>Throwaway prototype, Phase 1. Every cell is the page's own rebuild of that kind; one camera per row, framed on the FULL build. Rebuild ms is the CPU time of that one rebuild in headless Chromium on this box (excludes the GPU upload of the next frame).</p>
${CONFIGS.rows.map((r) => `<h2>${r.label}</h2><div class=g>${r.cells.map((c) => `<div class=c><img src="${c.fn}"><div>${c.cap}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(`${OUT}/index.html`, html);
const { browser, page } = await launchPage({ viewport: { width: 1600, height: 900 } });
await page.goto('file://' + OUT + '/index.html');
await page.screenshot({ path: `${OUT}/f7-light-candidates.png`, fullPage: true });
await browser.close(); server.close();
console.log('wrote', `${OUT}/f7-light-candidates.png`);
