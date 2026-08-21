/* ===================================================================
   audit-hires.mjs — fine-detail visual-diff audit for Standard-tier controls.

   Renders a control's MIN and MAX config at high resolution (default 1200x1200,
   cropped tight to the bloom), diffs the pair, and reports a changed-pixel
   fraction per control, maxed across the three canonical AUDIT_VIEWPOINTS
   (flower-view-presets.js — shared with the live VIEW dropdown so a headless
   audit and the app can never define "3/4 view" two different ways).

   METRIC: box-blur each PNG (radius-1, ~2px kernel) to kill AA shimmer, then
   count pixels whose post-blur luminance differs by >20/255, as a percentage
   of frame. Bands: INVISIBLE <0.5%, SUBTLE 0.5-5%, CLEAR >=5% (calibrated so a
   no-op ~0% and a structural add, e.g. a lace-pattern swap, lands CLEAR). This
   is area-based — it under-rates a thin-but-real change (a fine rib covers few
   pixels) — so treat the number as a screen, not a verdict; adjudicate close
   calls against the contact-sheet crops by eye.

   Browser-based, same offline setup as verify-flower-export.mjs / verify-
   geometry-quality.mjs: serve the repo, route the three CDN import to
   node_modules/three, launch headless chromium with swiftshader (software GL —
   deterministic, but single-threaded: render sequentially, never open two
   pages at once, or the second hangs).

   RUN:  node tools/audit-hires.mjs [--size=1200] [--out=<dir>]
   =================================================================== */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG } from './pngdec.mjs';
import { AUDIT_VIEWPOINTS } from '../flower-view-presets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const THREE_VERSION = '0.161.0';
const argv = process.argv.slice(2);
const SIZE = parseInt((argv.find((a) => a.startsWith('--size=')) || '--size=1200').split('=')[1], 10);
const OUT = (argv.find((a) => a.startsWith('--out=')) || `--out=${ROOT}/audit-out`).split('=')[1];
const PAD = 1.08;   // tight crop — fine texture spans real pixels, per the handoff spec
const DIFF_THRESHOLD = 20;   // /255 post-blur luminance delta counted as "changed"
fs.mkdirSync(OUT, { recursive: true });

// ---- shared base config (Standard defaults, radial/8-petal bloom, no sepals/stem) ----
const BASE = {
  bloomType: 'radial', petalCount: 8, bloom: 78, tightness: 0.3, elevation: 0.06,
  width: 0.9, taper: 0.35, tip: 0.5, centerCurve: 0.4, petalCup: 0, shoulder: 0.5,
  clawLength: 0, cleftDepth: 0, centerArch: 'disc',
  sepalsType: 'none', stemType: 'none',
};

// ---- the four controls under test: [name, {min config}, {max config}] ----
const CONTROLS = [
  { name: 'softness',  min: { ...BASE, infillType: 'veins', softness: 0 },  max: { ...BASE, infillType: 'veins', softness: 1 } },
  { name: 'density',   min: { ...BASE, infillType: 'veins', density: 0 },   max: { ...BASE, infillType: 'veins', density: 20 } },
  { name: 'edgeNoise', min: { ...BASE, tipStyle: 'ruffled', edgeNoise: 0 }, max: { ...BASE, tipStyle: 'ruffled', edgeNoise: 1 } },
  { name: 'tipStyle',  min: { ...BASE, tipStyle: 'clean' },                 max: { ...BASE, tipStyle: 'ruffled' } },
];

// ---- the debug hook, appended to the served flower.js (module scope: shares
//      VIEW_PRESETS, camera/controls/scene/renderer/bloomGroup, inputs/readUI). ----
const DBG_HOOK = `
window.__dbgSetUI = function(obj) {
  for (const k in obj) {
    const el = inputs[k]; if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!obj[k]; else el.value = obj[k];
  }
  for (const k in obj) {
    const el = inputs[k]; if (!el) continue;
    const evt = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
    el.dispatchEvent(new Event(evt, { bubbles: true }));
  }
};
window.__dbgTris = function() {
  let t = 0;
  scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.index) t += o.geometry.index.count / 3; });
  return Math.round(t);
};
window.__dbgView = function(name, pad) {
  const p = VIEW_PRESETS[name] || VIEW_PRESETS.default;
  const box = new THREE.Box3().expandByObject(bloomGroup);
  if (box.isEmpty()) return false;
  const c = new THREE.Vector3(); box.getCenter(c);
  const sz = new THREE.Vector3(); box.getSize(sz);
  const radius = Math.max(sz.x, sz.y, sz.z) * 0.5 || 2;
  const fit = pad != null ? pad : p.fit;
  const dist = (radius / Math.tan((camera.fov * DEG) / 2)) * fit;
  const dir = new THREE.Vector3(p.dir[0], p.dir[1], p.dir[2]).normalize();
  controls.autoRotate = false;
  camera.position.copy(c).addScaledVector(dir, dist);
  camera.up.set(p.up[0], p.up[1], p.up[2]).normalize();
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.lookAt(c);
  camera.updateProjectionMatrix();
  controls.target.copy(c);
  controls.update();
  renderer.render(scene, camera);
  return true;
};
window.__dbgReady = true;
`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + DBG_HOOK); else res.end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base)) if (d.startsWith('chromium-') && !d.includes('headless')) {
    const p = path.join(base, d, 'chrome-linux', 'chrome'); if (fs.existsSync(p)) return p;
  }
  return undefined;
}

// ---- box-blur (radius 1) + changed-pixel-fraction diff ----
function boxBlur(px, w, h) {
  const out = Buffer.alloc(px.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
      const i = (yy * w + xx) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
    }
    const o = (y * w + x) * 4;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return out;
}
const luma = (px, i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
function changedFraction(pngA, pngB) {
  if (pngA.width !== pngB.width || pngA.height !== pngB.height) throw new Error('size mismatch');
  const { width: w, height: h } = pngA;
  const a = boxBlur(pngA.data, w, h), b = boxBlur(pngB.data, w, h);
  let changed = 0;
  for (let i = 0; i < w * h * 4; i += 4) if (Math.abs(luma(a, i) - luma(b, i)) > DIFF_THRESHOLD) changed++;
  return changed / (w * h);
}
function band(frac) { return frac < 0.005 ? 'INVISIBLE' : frac < 0.05 ? 'SUBTLE' : 'CLEAR'; }

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const results = [];
try {
  // sequential pages — swiftshader is single-threaded; a second concurrent page hangs.
  for (const ctrl of CONTROLS) {
    const shots = { min: {}, max: {} };
    const thumbs = { min: {}, max: {} };
    let trisMin = null, trisMax = null;
    for (const which of ['min', 'max']) {
      const ctx = await browser.newContext({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.route('**/cdn.jsdelivr.net/**', (route) => {
        const m = route.request().url().match(new RegExp('three@' + THREE_VERSION.replace(/\./g, '\\.') + '/(.*)$'));
        if (!m) return route.continue();
        try { return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(THREE_DIR, m[1])) }); }
        catch { return route.fulfill({ status: 404, body: 'nf' }); }
      });
      await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction('window.__dbgReady === true', { timeout: 30000 });
      // strip the chrome (control panel / view panel / header) so the canvas capture is
      // just the bloom — same 'fl-preview' body class the gallery thumbnailer uses
      // (tools/gen-preset-thumbs.mjs), applied directly rather than via the iframe-message
      // PREVIEW code path.
      await page.evaluate(() => document.body.classList.add('fl-preview'));
      await page.evaluate((cfg) => window.__dbgSetUI(cfg), ctrl[which]);
      await page.waitForTimeout(300);   // rebuild settle
      const tris = await page.evaluate(() => window.__dbgTris());
      if (which === 'min') trisMin = tris; else trisMax = tris;
      for (const vp of AUDIT_VIEWPOINTS) {
        const ok = await page.evaluate(({ vp, PAD }) => window.__dbgView(vp, PAD), { vp, PAD });
        if (!ok) throw new Error(`${ctrl.name}/${which}: empty bounds for view ${vp}`);
        await page.waitForTimeout(50);
        const file = path.join(OUT, `${ctrl.name}-${which}-${vp}.png`);
        await page.locator('#flower-canvas').screenshot({ path: file });
        // small JPEG thumbnail (contact-sheet use — cheap to embed, not used for the metric)
        const thumb = await page.evaluate(() => {
          const c = document.getElementById('flower-canvas');
          const t = document.createElement('canvas'); t.width = 360; t.height = 360;
          t.getContext('2d').drawImage(c, 0, 0, 360, 360);
          return t.toDataURL('image/jpeg', 0.85);
        });
        shots[which][vp] = file;
        (thumbs[which] || (thumbs[which] = {}))[vp] = thumb;
      }
      await page.close(); await ctx.close();
    }
    let worst = 0, worstVp = null;
    const perView = {};
    for (const vp of AUDIT_VIEWPOINTS) {
      const a = decodePNG(fs.readFileSync(shots.min[vp]));
      const b = decodePNG(fs.readFileSync(shots.max[vp]));
      const frac = changedFraction(a, b);
      perView[vp] = frac;
      if (frac > worst) { worst = frac; worstVp = vp; }
    }
    const row = { name: ctrl.name, trisMin, trisMax, dTris: trisMax - trisMin, perView, worst, worstVp, band: band(worst), thumbs };
    results.push(row);
    console.log(`${ctrl.name.padEnd(10)} worst=${(worst * 100).toFixed(3)}%  (${worstVp})  ${band(worst)}  ` +
      `perView={${AUDIT_VIEWPOINTS.map((v) => `${v}:${(perView[v] * 100).toFixed(3)}%`).join(' ')}}  dTris=${row.dTris}`);
  }
} finally {
  await browser.close(); server.close();
}
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(`\nwrote ${path.join(OUT, 'results.json')} and per-view PNGs to ${OUT}`);
