/*
 * measure-junction-rim.mjs — A/B a candidate junction APPROACH LAW against the shipped one.
 *
 * Dev-only, not a CI gate. This is the rig the junction work runs on: it renders a design under
 * `?junctionLaw=<name>`, reads the junction field mesh ALONE through `?junctionProbe=1`, and
 * reports two shape numbers plus the triangle cost, live AND exported, on a fresh page per row.
 *
 * RUN:  node docs/tools/measure-junction-rim.mjs [law ...]        (default: current)
 *       node docs/tools/measure-junction-rim.mjs current mylaw    (the A/B)
 *       node docs/tools/measure-junction-rim.mjs --self-check     (estimators only, no browser)
 *
 * WHY THE PROBE. The junction is fused into one accumulator with the petals, so slicing the
 * exported STL measures petals too. Every junction number this project has quoted needed the
 * field in isolation, and `?junctionProbe=1` is the supported way to get it.
 *
 * WHAT THE NUMBERS MEAN — AND DO NOT MEAN
 *
 *   A_k   rim ripple AROUND the axis at the petal harmonic: the DFT amplitude of rim radius vs
 *         azimuth on a horizontal slice, normalised by mean rim radius, peaked over the run.
 *   M     meridional roughness: ripple ALONG the axis. RMS second difference of R(y) per
 *         azimuth, normalised by mean radius. A_k CANNOT SEE THIS — a stack of rings is
 *         perfectly axisymmetric (A_k ~ 0.002) and visibly terraced. That blindness is why this
 *         number exists; the first three candidate laws were measured on A_k alone and one of
 *         them scored beautifully while looking like a wedding cake.
 *
 * A_k IS NOT AN OBJECTIVE. Three approach laws were built to drive it down — an area rule
 * applied at every station (0.28 exported), a spacing-scaled union (never helped), and a single
 * lofted skirt (0.0056, holding across every petal count) — and ALL THREE WERE REJECTED BY EYE.
 * The ruling: the junction is not a surface to shape. It is the petal's material continuing down
 * to the stem at the petal's own thickness, so variation at petal frequency is the POINT. A low
 * A_k means a smooth skin, and the smooth skin is the defect. Report these numbers as a
 * description of the surface. Do not optimise them, and do not let a green number stand in for
 * the contact sheet: the eye ruled here and the eye was right.
 *
 * VALIDITY. Both estimators self-check before every run and ABORT on failure (--self-check runs
 * just that). A true cylinder must read ~1e-15; known flutes of 0.05 / 0.12 / 0.03 at k = 18 / 6
 * / 54 must come back within 2%; a 1% and a 12% flute must separate; and the small-radius case
 * must hold, because the first version of the slicer used a fixed world-space sample step, read
 * 22% azimuthal coverage on a 0.07-radius neck, and silently discarded the entire junction while
 * reporting confident numbers about the petals instead. Sample spacing now scales with radius
 * and coverage is asserted, not assumed.
 *
 * FRESH PAGE PER ROW is mandatory, not tidiness: space-colonisation triangle counts grow across
 * rebuilds inside one page (issue #100 — Lily 93,720 -> 390,172 over nine junction-only slider
 * moves, then the budget refuses). A single-page sweep over a spacecol design measures drift.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from '../../tools/chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

/* ------------------------------------------------------------------ estimators */

// r(theta) at a horizontal slice: max rim radius per azimuth bin, gaps interpolated.
export function sliceRim(positions, indices, Y, { bins = 1440, cx = 0, cz = 0, rMax = Infinity } = {}) {
  const acc = new Float64Array(bins).fill(-1);
  for (let i = 0; i < indices.length; i += 3) {
    const p = [0, 1, 2].map((k) => { const a = indices[i + k] * 3; return [positions[a], positions[a + 1], positions[a + 2]]; });
    const hits = [];
    for (let e = 0; e < 3; e++) {
      const A = p[e], B = p[(e + 1) % 3];
      if ((A[1] - Y) * (B[1] - Y) > 0 || A[1] === B[1]) continue;
      const t = (Y - A[1]) / (B[1] - A[1]);
      if (t < 0 || t > 1) continue;
      hits.push([A[0] + t * (B[0] - A[0]), A[2] + t * (B[2] - A[2])]);
    }
    if (hits.length < 2) continue;
    const [a, b] = hits;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // Sample spacing SCALES WITH RADIUS: a bin subtends arc 2*pi*r/bins, so a fixed world-space
    // step leaves most bins empty on a small-radius neck. See the header.
    const rmin = Math.max(1e-4, Math.min(Math.hypot(a[0] - cx, a[1] - cz), Math.hypot(b[0] - cx, b[1] - cz)));
    const step = Math.max(1e-5, (2 * Math.PI * rmin / bins) * 0.4);
    const n = Math.min(4000, Math.max(2, Math.ceil(L / step)));
    for (let s = 0; s <= n; s++) {
      const u = s / n, x = a[0] + u * (b[0] - a[0]) - cx, z = a[1] + u * (b[1] - a[1]) - cz;
      const r = Math.hypot(x, z); if (r > rMax) continue;
      let th = Math.atan2(z, x); if (th < 0) th += Math.PI * 2;
      const j = Math.min(bins - 1, Math.floor(th / (Math.PI * 2) * bins));
      if (r > acc[j]) acc[j] = r;
    }
  }
  let filled = 0, gap = 0, run = 0;
  for (let j = 0; j < bins * 2; j++) { if (acc[j % bins] >= 0) { if (j < bins) filled++; run = 0; } else { run++; if (run > gap) gap = run; } }
  if (!filled) return { r: null, coverage: 0, maxGapDeg: 360 };
  const out = new Float64Array(bins);
  for (let j = 0; j < bins; j++) {
    if (acc[j] >= 0) { out[j] = acc[j]; continue; }
    let lo = j, hi = j;
    while (acc[((lo % bins) + bins) % bins] < 0) lo--;
    while (acc[hi % bins] < 0) hi++;
    const a = acc[((lo % bins) + bins) % bins], b = acc[hi % bins];
    out[j] = a + ((j - lo) / (hi - lo)) * (b - a);
  }
  return { r: out, coverage: filled / bins, maxGapDeg: gap / bins * 360 };
}

export function harmonic(r, k) {
  const N = r.length; let re = 0, im = 0, mean = 0;
  for (let j = 0; j < N; j++) mean += r[j]; mean /= N;
  for (let j = 0; j < N; j++) { const a = -2 * Math.PI * k * j / N; re += r[j] * Math.cos(a); im += r[j] * Math.sin(a); }
  return { amp: (2 / N) * Math.hypot(re, im) / mean, mean };
}
export function spectrum(r, kMax = 60) {
  kMax = Math.min(kMax, Math.floor(r.length / 2) - 1);   // above Nyquist a DFT bin is an alias
  const out = []; for (let k = 1; k <= kMax; k++) out.push({ k, ...harmonic(r, k) }); return out;
}

// Ripple ALONG the axis — the thing A_k is blind to.
export function meridionalRoughness(positions, indices, y0, y1, { nY = 90, bins = 360, rMax = Infinity } = {}) {
  const cols = [];
  for (let i = 0; i < nY; i++) {
    const s = sliceRim(positions, indices, y0 + (y1 - y0) * (i + 0.5) / nY, { bins, rMax });
    cols.push(s.r && s.maxGapDeg <= 5 ? s.r : null);
  }
  const good = cols.filter(Boolean);
  if (good.length < 8) return { rough: NaN, rows: good.length };
  let acc = 0, n = 0;
  for (let j = 0; j < bins; j++) {
    const col = good.map((c) => c[j]);
    let mean = 0; for (const v of col) mean += v; mean /= col.length;
    for (let i = 1; i < col.length - 1; i++) { const d2 = (col[i + 1] - 2 * col[i] + col[i - 1]) / mean; acc += d2 * d2; n++; }
  }
  return { rough: Math.sqrt(acc / n), rows: good.length };
}

/* ------------------------------------------------- validity: aborts, never warns */

function flutedCylinder(R, ampFrac, k, { nTh = 2048, nY = 8 } = {}) {
  const pos = [], idx = [];
  for (let iy = 0; iy <= nY; iy++) { const y = -1 + 2 * iy / nY;
    for (let it = 0; it < nTh; it++) { const th = it / nTh * Math.PI * 2, r = R * (1 + ampFrac * Math.cos(k * th));
      pos.push(r * Math.cos(th), y, r * Math.sin(th)); } }
  for (let iy = 0; iy < nY; iy++) for (let it = 0; it < nTh; it++) {
    const a = iy * nTh + it, b = iy * nTh + (it + 1) % nTh, c = (iy + 1) * nTh + it, d = (iy + 1) * nTh + (it + 1) % nTh;
    idx.push(a, b, c, b, d, c); }
  return { positions: pos, indices: idx };
}
function coneMesh(R0, R1, { nY = 120, nTh = 512, steps = 0 } = {}) {
  const pos = [], idx = [];
  for (let iy = 0; iy <= nY; iy++) {
    let t = iy / nY; if (steps > 0) t = Math.floor(t * steps) / steps;
    const R = R0 + (R1 - R0) * t, y = -0.3 + 0.35 * (iy / nY);
    for (let it = 0; it < nTh; it++) { const th = it / nTh * Math.PI * 2; pos.push(R * Math.cos(th), y, R * Math.sin(th)); }
  }
  for (let iy = 0; iy < nY; iy++) for (let it = 0; it < nTh; it++) {
    const a = iy * nTh + it, b = iy * nTh + (it + 1) % nTh, c = (iy + 1) * nTh + it, d = (iy + 1) * nTh + (it + 1) % nTh;
    idx.push(a, b, c, b, d, c); }
  return { positions: pos, indices: idx };
}

export function assertValid() {
  const ok = [];
  const die = (m) => { throw new Error('ESTIMATOR VALIDITY FAILED — ' + m); };
  { const m = flutedCylinder(1, 0, 18), s = sliceRim(m.positions, m.indices, 0);
    if (!(s.coverage > 0.999)) die(`round cylinder coverage ${s.coverage}`);
    const worst = Math.max(...spectrum(s.r, 40).map((x) => x.amp));
    if (!(worst < 2e-3)) die(`a true cylinder reads A_k ${worst}`);
    ok.push(['A1 true cylinder', worst.toExponential(2)]); }
  for (const [k, amp] of [[18, 0.05], [6, 0.12], [54, 0.03]]) {
    const m = flutedCylinder(0.35, amp, k), s = sliceRim(m.positions, m.indices, 0);
    const got = harmonic(s.r, k).amp;
    const leak = Math.max(...spectrum(s.r, 60).filter((x) => x.k !== k).map((x) => x.amp));
    if (!(Math.abs(got - amp) / amp < 0.02)) die(`k=${k}: got ${got}, want ${amp}`);
    if (!(leak < amp * 0.1)) die(`k=${k}: leakage ${leak}`);
    ok.push([`A2 k=${k} amp ${amp}`, `${got.toFixed(5)} (leak ${leak.toExponential(1)})`]); }
  { const hi = flutedCylinder(0.35, 0.12, 18), lo = flutedCylinder(0.35, 0.01, 18);
    const a = harmonic(sliceRim(lo.positions, lo.indices, 0).r, 18).amp;
    const b = harmonic(sliceRim(hi.positions, hi.indices, 0).r, 18).amp;
    if (!(b / a > 8)) die(`does not separate 1% from 12% (${a} vs ${b})`);
    ok.push(['A3 separation 1% vs 12%', `${a.toFixed(4)} vs ${b.toFixed(4)} (${(b / a).toFixed(1)}x)`]); }
  { // the junction's REAL radius — the case the first slicer silently threw away
    const m = flutedCylinder(0.07, 0.08, 18), s = sliceRim(m.positions, m.indices, 0);
    if (!(s.coverage > 0.999)) die(`small-radius coverage ${s.coverage} — sample spacing is not tracking radius`);
    const got = harmonic(s.r, 18).amp;
    if (!(Math.abs(got - 0.08) / 0.08 < 0.02)) die(`small radius: ${got}`);
    ok.push(['A4 small radius r=0.07', `${got.toFixed(5)} (coverage ${s.coverage.toFixed(3)})`]); }
  { const sm = coneMesh(0.35, 0.09), st = coneMesh(0.35, 0.09, { steps: 10 }), fi = coneMesh(0.35, 0.09, { steps: 30 });
    const a = meridionalRoughness(sm.positions, sm.indices, -0.29, 0.04).rough;
    const b = meridionalRoughness(st.positions, st.indices, -0.29, 0.04).rough;
    const c = meridionalRoughness(fi.positions, fi.indices, -0.29, 0.04).rough;
    if (!(a < 5e-3)) die(`smooth cone reads M ${a}`);
    if (!(b > 20 * Math.max(a, 1e-9))) die(`M does not separate a staircase (${a} vs ${b})`);
    if (!(c < b)) die(`M did not fall as the steps got finer (${c} vs ${b})`);
    ok.push(['M1 smooth cone', a.toExponential(2)]);
    ok.push(['M2 10-step staircase', b.toFixed(4)]);
    ok.push(['M3 30-step < 10-step', `${c.toFixed(4)} < ${b.toFixed(4)}`]); }
  return ok;
}

/* ------------------------------------------------------------------ the A/B run */

const DESIGNS = [
  { name: 'Daisy 18 + stem', preset: 'daisy', set: { stemType: 'stem' }, petals: 18 },
  { name: 'Daisy 18 bare',   preset: 'daisy', set: {},                   petals: 18 },
  { name: 'Lily 6 + stem',   preset: 'lily',  set: { stemType: 'stem' }, petals: 6  },
  { name: 'Daisy 4 + stem',  preset: 'daisy', set: { stemType: 'stem', petalCount: 4 },  petals: 4  },
  { name: 'Daisy 34 + stem', preset: 'daisy', set: { stemType: 'stem', petalCount: 34 }, petals: 34 },
];

function shape(d, petals) {
  let ymin = 1e9, ymax = -1e9;
  for (let i = 1; i < d.positions.length; i += 3) { const y = d.positions[i]; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  let peak = { ampP: 0 }, worst = { bestAmp: 0 };
  for (let i = 1; i < 80; i++) {
    const s = sliceRim(d.positions, d.indices, ymin + (ymax - ymin) * i / 80, { rMax: d.meta.swell * 10 });
    if (!s.r || s.maxGapDeg > 5) continue;
    const sp = spectrum(s.r, Math.max(80, petals * 3 + 10));
    const hP = sp.find((x) => x.k === petals), b = sp.slice().sort((x, y2) => y2.amp - x.amp)[0];
    if (hP.amp > peak.ampP) peak = { ampP: hP.amp };
    if (b.amp > worst.bestAmp) worst = { bestK: b.k, bestAmp: b.amp };
  }
  const span = d.meta.yFeet - d.meta.yStem;
  const mr = meridionalRoughness(d.positions, d.indices, d.meta.yStem + span * 0.05, d.meta.yStem + span * 0.98, { rMax: d.meta.swell * 10 });
  return { ...peak, ...worst, rough: mr.rough };
}

async function main() {
  const laws = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!laws.length) laws.push('current');
  console.log('ESTIMATOR VALIDITY');
  for (const [n, v] of assertValid()) console.log(`  ok  ${n}: ${v}`);
  console.log('');
  if (process.argv.includes('--self-check')) return;

  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/flower.html';
    fs.readFile(path.join(ROOT, p), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const rows = [], problems = [];

  for (const law of laws) for (const D of DESIGNS) {
    // FRESH PAGE PER ROW — see the header (#100).
    const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 1000 } })).newPage();
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await page.route('**cdn.jsdelivr.net/**', (route) => {
      const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
      try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
      catch { route.abort(); }
    });
    const rec = { law, design: D.name };
    try {
      await page.goto(`http://localhost:${port}/flower.html?junctionProbe=1&junctionLaw=${law}`, { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
      await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
      await page.evaluate(() => { const h = document.querySelector('.fl-acc__head[aria-controls="acc-make"]'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); });
      await page.evaluate((s) => document.querySelector(`#presetRow .fl-preset[data-slug="${s}"]`)?.click(), D.preset);
      await settle(page);
      for (const [id, v] of Object.entries(D.set)) await page.evaluate(({ id, v }) => {
        const el = document.getElementById(id); if (!el) return;
        el.value = String(v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      }, { id, v });
      await settle(page);
      // SET, THEN READ BACK, from the app's own state — a value the UI silently rewrote would
      // make this measure a different design from the one it names, and report a pass.
      const st = await page.evaluate(() => window.__flowerUIState());
      for (const [id, v] of Object.entries(D.set)) {
        const a = st[id], num = isFinite(Number(v)) && isFinite(Number(a));
        if (!(num ? Math.abs(Number(v) - Number(a)) < 1e-9 : String(v) === String(a))) problems.push(`${law}/${D.name}: ${id} set "${v}" reads back "${a}"`);
      }
      const live = await page.evaluate(() => window.__junctionField && { positions: Array.from(window.__junctionField.positions), indices: Array.from(window.__junctionField.indices), meta: window.__junctionField.meta, stats: window.__junctionField.stats });
      if (!live) throw new Error('no junction field — is ?junctionProbe=1 wired?');
      if (live.meta.approachLaw !== law) problems.push(`${law}/${D.name}: built law "${live.meta.approachLaw}"`);
      rec.liveTris = live.stats.tris; rec.live = shape(live, D.petals);
      await page.evaluate(() => { delete window.__junctionField; });
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }).catch(() => null), page.click('#exportStl')]);
      if (dl) {
        const exp = await page.evaluate(() => window.__junctionField && { positions: Array.from(window.__junctionField.positions), indices: Array.from(window.__junctionField.indices), meta: window.__junctionField.meta, stats: window.__junctionField.stats });
        if (exp) { rec.expTris = exp.stats.tris; rec.exp = shape(exp, D.petals); }
      }
    } catch (e) { rec.error = e.message; problems.push(`${law}/${D.name}: ${e.message}`); }
    rows.push(rec);
    await browser.close();
  }
  server.close();

  console.log(`${'law'.padEnd(10)}${'design'.padEnd(18)}${'A_k live'.padStart(10)}${'A_k exp'.padStart(10)}${'worst k'.padStart(12)}${'M live'.padStart(10)}${'tris live'.padStart(11)}${'tris exp'.padStart(11)}`);
  for (const r of rows) {
    if (r.error) { console.log(`${r.law.padEnd(10)}${r.design.padEnd(18)}  ERROR ${r.error.slice(0, 70)}`); continue; }
    console.log(r.law.padEnd(10) + r.design.padEnd(18)
      + r.live.ampP.toFixed(4).padStart(10) + (r.exp ? r.exp.ampP.toFixed(4) : '-').padStart(10)
      + `k${r.live.bestK}:${r.live.bestAmp.toFixed(3)}`.padStart(12)
      + r.live.rough.toFixed(4).padStart(10)
      + String(r.liveTris).padStart(11) + String(r.expTris ?? '-').padStart(11));
  }
  console.log('\nA_k is a description, not a target — see the header before drawing a conclusion from it.');
  if (problems.length) { console.log('\nPROBLEMS (these rows measured something other than what they name):'); for (const p of problems) console.log('  ! ' + p); process.exitCode = 1; }
}

async function settle(page) {
  await page.waitForTimeout(120);
  await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(160);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
