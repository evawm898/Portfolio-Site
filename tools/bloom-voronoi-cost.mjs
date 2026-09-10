/* ===================================================================
   bloom-voronoi-cost.mjs — WHAT A VORONOI PETAL COSTS, FROM THE FLOWER'S OWN
   EMITTER, and how many of them the bloom's export budget holds.

     node tools/bloom-voronoi-cost.mjs [--json]

   WHY IT EXISTS. Session 37's discovery estimated a ported Voronoi petal at
   ~28,800 triangles by reading addSlab's loops (20 per ring point) and
   assuming a 30-point ring. That is arithmetic about the code, not a
   measurement of it, and the number decides whether Voronoi is reachable on a
   continuous bloom at all — so Eva asked for the real cost before the port is
   scheduled rather than during it.

   WHAT IT MEASURES, in the real flower page, headless:
     1  PER-PETAL TRIANGLES. The live triangle count at petalCount P and P + 1
        on the same design; the difference is ONE petal, everything included
        (its slabs, its margin strands, its beads). Taken at two P so a core
        that scaled with the count would show as two different deltas.
     2  THAT PETAL'S RING POINTS, from `buildVoronoi` called through the
        flower's own `resolveParams` with the added petal's OWN seed
        (`SEED_BASE + seedIdx * 131`, the radial rosette's law at layer 0).
        The sum of `outer.length` over its slabs is what addSlab is paid per.
     3  THE REGRESSION of (1) on (2) across the density slider 3..12. The
        SLOPE is triangles per ring point — the emitter's real cost, which
        should land on an integer if the loop reading was right — and the
        INTERCEPT is the petal's non-slab overhead (rim, strands, beads),
        which is the part that does NOT port to the bloom.
   Every set is read back; a value that did not take fails the run.

   THE BUDGET ARITHMETIC. The bloom's `EXPORT_TRI_BUDGET` is read out of
   bloom.js's source rather than retyped. A ported petal is `slope x ringPts`
   at the shipped density (the slabs ARE the sheet; the flower's rim and
   strands have no bloom counterpart), and the bloom's own petal today is
   measured from the bloom builder in the same run. The largest count is the
   budget less the hub, divided by the per-petal cost.

   WHAT IT DOES NOT PROVE, in its own header:
     - LIVE, NOT EXPORT. The flower's live and export counts differ (its
       export floor re-segments tubes). The slab emitter is fixed-topology
       (20 per ring point regardless of mode, and the bloom's own counts are
       mode-independent by construction), so the SLOPE carries across; the
       INTERCEPT does not and is not used for the bloom number.
     - ONE DESIGN. The flower's shipped default outline, every density. A
        different outline gives a different cell census; the per-ring-point
        cost does not change.
     - THE HUB AND CENTRE ARE SUBTRACTED AT THEIR SHIPPED SIZES. A dome or a
        stamen count changes the remainder; the read-out says which was used.
   =================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const JSON_OUT = process.argv.includes('--json');

/* THE HOOK — appended to flower.js when served, the mechanism
   verify-geometry-quality.mjs already uses. It reaches flower.js's own
   resolveParams, buildVoronoi, mulberry32, SEED_BASE and SLAB_THICK, so the
   cells it counts are built by the same call, with the same options, from the
   same seed as the petal the page just rendered. */
const HOOK = `
window.__vcCells = function (seedIdx) {
  const P = resolveParams(readUI());
  const seed = SEED_BASE + seedIdx * 131;
  const vor = buildVoronoi(P, mulberry32(seed), {
    density: P.density, softness: P.softness, lloyd: P.voronoiLloyd,
    anisotropy: P.voronoiAniso, cellDensityLaw: P.voronoiDensityLaw,
    weightHierarchy: P.voronoiWeight, weightFalloff: P.voronoiWeightFalloff,
    slabTaper: P.voronoiSlabTaper, minCellSize: 3 * P.tubeRadius * SLAB_THICK,
  });
  let ringPts = 0; for (const s of vor.slabs) ringPts += s.outer.length;
  return { cells: vor.slabs.length, ringPts, culled: vor.culled, culledDegenerate: vor.culledDegenerate, density: P.density };
};
window.__vcTris = () => { const m = /~([\\d,]+) tris/.exec(document.getElementById('readout').textContent); return m ? +m[1].replace(/,/g, '') : null; };
window.__vcPetalsShown = () => { const m = /(\\d+) petals?/.exec(document.getElementById('readout').textContent); return m ? +m[1] : null; };
window.__vcBuilding = () => { const b = document.getElementById('building'); return !!(b && b.classList.contains('is-on')); };
`;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  const abs = path.join(ROOT, p);
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + HOOK); else res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => /tris/.test(document.getElementById('readout')?.textContent || ''), { timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });

const fails = [];
/* SET, THEN READ BACK — the export gate's discipline. */
async function set(id, value, evt = 'input') {
  const got = await page.evaluate(({ id, value, evt }) => {
    const el = document.getElementById(id); if (!el) return { missing: true };
    el.value = value; el.dispatchEvent(new Event(evt, { bubbles: true })); return { value: el.value };
  }, { id, value, evt });
  if (got.missing) throw new Error(`no control #${id}`);
  const ok = isFinite(+value) && isFinite(+got.value) ? Math.abs(+value - +got.value) < 1e-9 : String(value) === String(got.value);
  if (!ok) fails.push(`${id} set "${value}" but reads back "${got.value}"`);
}
/* WAIT ON THE REAL SIGNAL: the build indicator off AND the read-out naming
   the petal count just asked for — never a fixed sleep. */
async function settled(petals) {
  await page.waitForFunction((n) => !window.__vcBuilding() && window.__vcPetalsShown() === n, petals, { timeout: 120000 });
  return page.evaluate(() => window.__vcTris());
}

await set('infillType', 'voronoi', 'change');
const P0 = 4;                                     // the flower's shipped petalCount
const samples = [];
for (let density = 3; density <= 12; density++) {
  await set('density', String(density));
  await set('petalCount', String(P0));      const t0 = await settled(P0);
  await set('petalCount', String(P0 + 1));  const t1 = await settled(P0 + 1);
  await set('petalCount', String(P0 + 2));  const t2 = await settled(P0 + 2);
  const cA = await page.evaluate((i) => window.__vcCells(i), P0);       // the petal P0 -> P0+1 added
  const cB = await page.evaluate((i) => window.__vcCells(i), P0 + 1);   // the petal P0+1 -> P0+2 added
  if (cA.density !== density) fails.push(`density ${density}: resolveParams reports ${cA.density}`);
  samples.push({ density, dTris: t1 - t0, ringPts: cA.ringPts, cells: cA.cells, culled: cA.culled + cA.culledDegenerate, seedIdx: P0 });
  samples.push({ density, dTris: t2 - t1, ringPts: cB.ringPts, cells: cB.cells, culled: cB.culled + cB.culledDegenerate, seedIdx: P0 + 1 });
  process.stderr.write(`  density ${String(density).padStart(2)}: +petal ${t1 - t0} / ${t2 - t1} tris   ring points ${cA.ringPts} / ${cB.ringPts}   cells ${cA.cells} / ${cB.cells}\n`);
}
await browser.close(); server.close();

/* THE REGRESSION — least squares of dTris on ringPts. */
const n = samples.length;
const mx = samples.reduce((a, s) => a + s.ringPts, 0) / n, my = samples.reduce((a, s) => a + s.dTris, 0) / n;
let sxy = 0, sxx = 0, syy = 0;
for (const s of samples) { sxy += (s.ringPts - mx) * (s.dTris - my); sxx += (s.ringPts - mx) ** 2; syy += (s.dTris - my) ** 2; }
const slope = sxy / sxx, intercept = my - slope * mx, r2 = (sxy * sxy) / (sxx * syy);
let maxResid = 0;
for (const s of samples) maxResid = Math.max(maxResid, Math.abs(s.dTris - (intercept + slope * s.ringPts)));

/* THE BLOOM SIDE — read, never retyped. */
const bloomSrc = fs.readFileSync(path.join(ROOT, 'bloom.js'), 'utf8');
const budget = +(/EXPORT_TRI_BUDGET\s*=\s*([\d_]+)/.exec(bloomSrc)?.[1] || '0').replace(/_/g, '');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const acc = new G.MeshBuilder({ exportMode: true });
G.buildBloomInto(acc, DEFAULTS, { below: null, capability: null });
const bloomTotal = acc.positions.length / 9;
const acc1 = new G.MeshBuilder({ exportMode: true });
const fr = G.footRing(DEFAULTS, acc1);
let bloomPetal = 0;
G.buildWhorlInto({ count: fr.slotCount, radius: fr.slotRings[0][0].radius, height: 0, sizeRamp: () => fr.slotRings[0][0].scale, angleRamp: () => fr.slotRings[0][0].tiltExtra, phase: fr.slotRings[0][0].phase, placement: DEFAULTS.placement, fan: fr.fan,
  blade: (slot) => { if (slot.index === 0) { const b = acc1.positions.length; G.buildPetalInto(acc1, DEFAULTS, fr.slotRings[0][0], slot, null); bloomPetal = (acc1.positions.length - b) / 9; } } });
const hub = bloomTotal - bloomPetal * DEFAULTS.petalCount;   // what is not petals at the shipped default
const shipped = samples.find((s) => s.density === 7 && s.seedIdx === P0);
const perPetalPorted = Math.round(slope * shipped.ringPts);
const maxPetals = Math.floor((budget - hub) / perPetalPorted);

if (!budget) fails.push('could not read EXPORT_TRI_BUDGET out of bloom.js');
if (!(r2 > 0.99)) fails.push(`the fit is poor (R^2 ${r2.toFixed(4)}) — the ring-point count is not predicting the emitted triangles, so the seed or the options do not match the render`);
if (pageErrors.length) fails.push(`page errors: ${pageErrors.join(' | ')}`);

const out = {
  samples, slope, intercept, r2, maxResid, budget, bloomPetal, bloomTotal, hub,
  shippedDensity: { density: 7, cells: shipped.cells, ringPts: shipped.ringPts, dTrisFlower: shipped.dTris, perPetalPorted },
  maxPetals,
};
if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
else {
  console.log(`\nPER-PETAL COST vs RING POINTS, ${n} samples (densities 3..12, two petals each):`);
  console.log(`  slope     ${slope.toFixed(4)} triangles per ring point   <- the emitter's real cost`);
  console.log(`  intercept ${intercept.toFixed(1)} triangles per petal        <- rim + strands + beads: does NOT port`);
  console.log(`  R^2 ${r2.toFixed(6)}   max residual ${maxResid.toFixed(1)} tris`);
  console.log(`\nAT THE SHIPPED DENSITY (7), the flower's default outline:`);
  console.log(`  ${shipped.cells} cells, ${shipped.ringPts} ring points -> a flower petal adds ${shipped.dTris} tris live; the SLABS alone are ${perPetalPorted}`);
  console.log(`\nTHE BLOOM (export mode, shipped default): ${bloomTotal.toLocaleString()} tris total, ${bloomPetal.toLocaleString()} per petal, ${hub.toLocaleString()} not petals`);
  console.log(`  a ported Voronoi petal at density 7 ~ ${perPetalPorted.toLocaleString()} tris = ${(perPetalPorted / bloomPetal).toFixed(1)}x today's petal`);
  console.log(`  EXPORT_TRI_BUDGET ${budget.toLocaleString()} -> at most ${maxPetals} petals with Voronoi on every one`);
}
if (fails.length) { console.log(`\nFAIL — ${fails.length} finding(s):`); for (const f of fails) console.log('  ' + f); process.exit(1); }
