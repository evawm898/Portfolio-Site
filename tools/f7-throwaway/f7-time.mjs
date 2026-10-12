// F7 phase 1: time one rebuild, full vs light A/B/C, through the prototype's own hook.
import { serveRepo, launchPage, openBloom, applyConfig, buildMatrix } from '/home/user/Portfolio-Site/tools/bloom-harness.mjs';
const ROWS = [
  ['DEFAULTS (shipping)', {}],
  ['INFILL dense: VORONOI x 40 cells', { petalInfill: 'VORONOI', infillDensity: 40 }],
  ['INFILL dense x 40 petals x 3 whorls (the infill cost corner)', { petalInfill: 'VORONOI', infillDensity: 40, petalCount: 40, layerCount: 3 }],
  ['TUBE: 40 petals x 6 whorls, every whorl k 0 (densest tube)', { petalCount: 40, layerCount: 6, tubeLayer1: 0, tubeLayer2: 0, tubeLayer3: 0, tubeLayer4: 0, tubeLayer5: 0, tubeLayer6: 0 }],
  ['LAYERS: 6 whorls x 40 petals', { layerCount: 6, petalCount: 40 }],
  ['INFLO: the raceme (defaults)', { stemLength: 120, inflorescence: 'RACEME' }],
  ['INFLO: budget corner (12 x whorled x 12 petals x 1.00, 40 mm up)', { stemLength: 120, inflorescence: 'RACEME', floretNodes: 12, floretPhyllotaxy: 'whorled', floretPetals: 12, floretScale: 1.00, pedicelLength: 40, pedicelAngle: 90 }],
  ['LEAVES: whorled x 8 nodes (24 simple leaves)', { stemLength: 90, stemDiameter: 6, leafLength: 45, leafWidth: 15, leafAngle: 35, leafNodes: 8, leafPhyllotaxy: 'whorled' }],
  ['LEAVES: LOBED whorled x 8 nodes (24 lobed leaves)', { stemLength: 90, stemDiameter: 6, leafLength: 45, leafAngle: 35, leafNodes: 8, leafPhyllotaxy: 'whorled', leafType: 'LOBED' }],
  ['MIXED: infill 40 x 3 whorls + raceme + sepals', { petalInfill: 'VORONOI', infillDensity: 40, layerCount: 3, stemLength: 120, inflorescence: 'RACEME', sepalCount: 5 }],
];
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
const REPS = 3;
const { server, port } = await serveRepo();
const out = [];
for (const [label, sets] of ROWS) {
  if (only && !only.test(label)) continue;
  const { browser, page } = await launchPage({ viewport: { width: 1200, height: 800 } });
  page.setDefaultTimeout(600000);
  await openBloom(page, port);
  const bad = await applyConfig(page, Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })));
  if (bad.length) { console.log('READ-BACK FAIL', label, bad); await browser.close(); continue; }
  const res = {};
  for (const kind of ['full', 'A', 'B', 'C']) {
    await page.evaluate((k) => window.__f7.rebuildAs(k), kind); // warm-up
    const runs = [];
    for (let i = 0; i < REPS; i++) runs.push(await page.evaluate((k) => window.__f7.rebuildAs(k), kind));
    runs.sort((a, b) => a.ms - b.ms);
    res[kind] = runs[Math.floor(REPS / 2)];
  }
  const f = (r) => `${r.ms.toFixed(0).padStart(6)} ms (b ${r.buildMs.toFixed(0)}, n ${r.normalsMs.toFixed(0)}) ${r.tris}`;
  console.log(`\n${label}\n  full ${f(res.full)}\n  A    ${f(res.A)}\n  B    ${f(res.B)}\n  C    ${f(res.C)}`);
  out.push({ label, res });
  await browser.close();
}
server.close();
console.log('\nJSON ' + JSON.stringify(out));
