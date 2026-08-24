/*
 * seam-contact-sheet.mjs — the basal seam, looked at rather than measured.
 *
 * A per-lobe partition cuts the petal at the sinus floor, u = 1 - cleftDepth. Half the
 * seeds sit in the basal region below that cut, and no void statistic will say whether
 * the cut reads as a new visible defect — it is a contact sheet question. This renders
 * the candidate cells over the true material outline at 2, 4 and 7 lobes, with the cut
 * line drawn, so the seam can be judged by eye before anything is written into
 * flower-geometry.js.
 *
 * MEASUREMENT ONLY — imports the page, writes an SVG. Changes nothing.
 * RUN: node docs/tools/seam-contact-sheet.mjs docs/lobed-voronoi-seam.svg
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from '../../tools/chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.argv[2] || path.join(ROOT, 'docs', 'lobed-voronoi-seam.svg');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const THREE_VERSION = '0.161.0';
const HOOK = fs.readFileSync(path.join(ROOT, 'docs', 'tools', '_diag2-hook.js'), 'utf8');
const SET_HOOK = `
window.__diagSet2 = function(obj) { const rejected = [];
  for (const k in obj) { const el = inputs[k];
    if (!el) { rejected.push(k + ': no such control'); continue; }
    if (el.type === 'checkbox') { el.checked = !!obj[k]; continue; }
    el.value = obj[k]; const want = obj[k], got = el.value;
    const num = want !== '' && got !== '' && isFinite(Number(want)) && isFinite(Number(got));
    const ok = num ? Math.abs(Number(want) - Number(got)) < 1e-9 : String(want) === String(got);
    if (!ok) rejected.push(k + ': set ' + JSON.stringify(want) + ' reads ' + JSON.stringify(got)); }
  return rejected; };
`;
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u); if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => { if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + SET_HOOK + '\n' + HOOK); else res.end(buf); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.route('**/cdn.jsdelivr.net/**', (route) => {
  const m = route.request().url().match(new RegExp('three@' + THREE_VERSION.replace(/\./g,'\\.') + '/(.*)$'));
  if (!m) return route.continue();
  try { return route.fulfill({ status:200, headers:{'Content-Type':'text/javascript','Access-Control-Allow-Origin':'*'}, body: fs.readFileSync(path.join(THREE_DIR, m[1])) }); }
  catch { return route.fulfill({ status:404, body:'nf' }); }
});
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil:'load', timeout:30000 });
await page.waitForFunction('window.__diag2Ready === true', { timeout:30000 });
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change',{bubbles:true})); } });

const LOBED = { width:0.95, taper:0.35, clawLength:0, clawWidth:0.3, shoulder:0.55,
                cleftDepth:0.55, cleftLobes:2, cleftWidth:0.3, tip:0.85, curlAmount:0.4,
                edgeCurve:0.05, edgeProfile:0, petalCup:0.1 };
const RESET = { cleftDepth:0, cleftLobes:2, cleftWidth:0.3, voronoiDensityLaw:0, voronoiAniso:1, voronoiLloyd:0, density:7, continuousMargin:'on' };
const ROWS = [2, 4, 7];
const data = [];
for (const lobes of ROWS) {
  const bad = await page.evaluate((u) => window.__diagSet2(u),
    { ...RESET, ...LOBED, cleftLobes: lobes, density: lobes === 7 ? 12 : 7, infillType:'voronoi' });
  if (bad.length) { console.error('CONFIG DID NOT TAKE:', lobes, bad.join('; ')); process.exit(1); }
  data.push(await page.evaluate(() => window.__diagCells(true)));   // 0.25 mm-simplified bound
  console.error('captured', lobes, 'lobes');
}
// SEAM METRIC — the picture is the verdict, but give it a number that can be re-checked:
// how much cell-boundary length lies ON the cut line x = xFloor, against the petal's
// full width there. Today and clip-only are the controls; both should be ~0.
const seam = data.map((d) => {
  const tol = d.L * 0.004;
  const at = (cells) => { let len = 0;
    for (const c of cells) for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[(i + 1) % c.length];
      if (Math.abs(a.x - d.xFloor) < tol && Math.abs(b.x - d.xFloor) < tol) len += Math.abs(b.y - a.y);
    } return len; };
  // full material width at the cut, for scale
  let lo = Infinity, hi = -Infinity;
  for (const q of d.material) if (Math.abs(q.x - d.xFloor) < d.L * 0.02) { if (q.y < lo) lo = q.y; if (q.y > hi) hi = q.y; }
  const width = (hi - lo) || 1;
  return { lobes: d.lobes, widthAtCut: +width.toFixed(3),
           today: +(at(d.cellsToday) / width).toFixed(3),
           clipOnly: +(at(d.cellsClipOnly) / width).toFixed(3),
           partition: +(at(d.cellsPartition) / width).toFixed(3) };
});
console.error('SEAM (cell-edge length lying on the cut, / petal width there):');
for (const r of seam) console.error('  %d lobes: today %s  clipOnly %s  partition %s', r.lobes, r.today, r.clipOnly, r.partition);
// SLIVERS IN THE SINUS — the stray strokes visible in the clip-only column. A cell whose
// area is negligible against its perimeter is a degenerate ring, not a cell.
const slivers = data.map((d) => {
  const A = (c) => { let a = 0; for (let i = 0; i < c.length; i++) { const p = c[i], q = c[(i+1)%c.length]; a += p.x*q.y - q.x*p.y; } return Math.abs(a*0.5); };
  const Per = (c) => { let l = 0; for (let i = 0; i < c.length; i++) { const p = c[i], q = c[(i+1)%c.length]; l += Math.hypot(q.x-p.x, q.y-p.y); } return l; };
  const count = (cells) => cells.filter((c) => Per(c) > 1e-9 && (4 * Math.PI * A(c)) / (Per(c) * Per(c)) < 0.02).length;
  return { lobes: d.lobes, today: count(d.cellsToday), clipOnly: count(d.cellsClipOnly), partition: count(d.cellsPartition) };
});
console.error('DEGENERATE CELLS (isoperimetric ratio < 0.02 — a ring with no area):');
for (const r of slivers) console.error('  %d lobes: today %d  clipOnly %d  partition %d', r.lobes, r.today, r.clipOnly, r.partition);
fs.writeFileSync(OUT.replace(/\.svg$/, '.metrics.json'), JSON.stringify({ seam, slivers }, null, 1));

await browser.close(); server.close();

// ---- draw ----
const CW = 300, CH = 300, PAD = 26, HEADER = 54, LABEL = 22;
const COLS = [
  ['today — envelope clip', 'cellsToday'],
  ['cleft-aware clip only', 'cellsClipOnly'],
  ['per-lobe partition', 'cellsPartition'],
];
const W = PAD + COLS.length * (CW + PAD), H = HEADER + ROWS.length * (CH + LABEL + PAD);
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace,Menlo,monospace">
<rect width="${W}" height="${H}" fill="#0b0d0d"/>
<text x="${PAD}" y="26" fill="#2fa3a3" font-size="13" letter-spacing="1.6">LOBED + VORONOI — THE BASAL SEAM, BEFORE BUILDING</text>
<text x="${PAD}" y="44" fill="#8b9494" font-size="10.5">cells over the true material outline · bound simplified at 0.25 mm · dashed line = the partition cut at u = 1 − cleftDepth = 0.45 · nothing here is built</text>`;
data.forEach((d, ri) => {
  const sx = CW / (d.L * 1.06), sy = CH / (d.W * 2.4);
  const s = Math.min(sx, sy);
  const y0 = HEADER + ri * (CH + LABEL + PAD);
  COLS.forEach(([title, key], ci) => {
    const x0 = PAD + ci * (CW + PAD);
    const X = (p) => x0 + 10 + p.x * s;
    const Y = (p) => y0 + CH / 2 - p.y * s;
    const pts = (poly) => poly.map((p) => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
    svg += `<g><rect x="${x0}" y="${y0}" width="${CW}" height="${CH}" fill="#101313" stroke="rgba(233,236,236,.16)"/>`;
    svg += `<polygon points="${pts(d.material)}" fill="#161b1b" stroke="#565f5f" stroke-width="0.8"/>`;
    for (const c of d[key]) svg += `<polygon points="${pts(c)}" fill="rgba(47,163,163,.14)" stroke="#2fa3a3" stroke-width="0.55"/>`;
    if (key === 'cellsPartition' && d.xFloor != null) {
      const xs = X({ x: d.xFloor, y: 0 });
      svg += `<line x1="${xs.toFixed(1)}" y1="${(y0+8)}" x2="${xs.toFixed(1)}" y2="${(y0+CH-8)}" stroke="#e0a33a" stroke-width="1.1" stroke-dasharray="5 4"/>`;
      for (const cy of d.centers) {
        const yy = Y({ x:0, y: cy });
        svg += `<line x1="${xs.toFixed(1)}" y1="${yy.toFixed(1)}" x2="${X({x:d.L,y:0}).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e0a33a" stroke-width="0.7" stroke-dasharray="3 5" opacity="0.75"/>`;
      }
    }
    svg += `<text x="${x0+6}" y="${y0+CH+15}" fill="#8b9494" font-size="10">${esc(title)} · ${d[key].length} cells</text></g>`;
  });
  svg += `<text x="${PAD - 4}" y="${y0 + 14}" fill="#e0a33a" font-size="10" transform="rotate(-90 ${PAD-4} ${y0+14})" text-anchor="end">${d.lobes} LOBES</text>`;
});
svg += '</svg>';
fs.writeFileSync(OUT, svg);
console.log('wrote', OUT);
