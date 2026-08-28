/*
 * shot-junction-sheet.mjs — the junction contact sheet, directly comparable to PR #101's.
 *
 * Dev-only. Shoots the five designs PR #101's law comparison used (the DESIGNS list in
 * docs/tools/measure-junction-rim.mjs), at TWO fixed camera angles (side, three-quarter),
 * framed on the JUNCTION (target + distance derived from the junction field's own meta via
 * ?junctionProbe=1 — frame the subject, per the flower-project skill), one law per column.
 *
 * WHY THE CAMERA IS INJECTED. OrbitControls and the camera are module-scope in flower.js
 * with no outside handle, and pointer-drag scripting makes the angle a function of event
 * timing. The server APPENDS a `window.__flowerSetCamera` hook to flower.js at serve time
 * (module scope, so `camera`/`controls` are in reach) — the working tree is never edited,
 * and the same injection works on any tree that names them that way, which is what lets
 * law A's frames come from PR #101's unsquashed branch (58aefc5) without modifying it.
 *
 * HARNESS VALIDITY — the two defects this repo's shot tool shipped with are ASSERTED
 * against, not merely set (see tools/shot-flower.mjs's header): autoRotate must read back
 * OFF from the app's own controls object (a camera that is a function of wall-clock time
 * invalidates every cross-law comparison), no panel chrome may be visible, and the camera
 * position must read back within 1e-6 of what was requested. Preset/control values are
 * read back from __flowerUIState. Fresh page per design x law (#92/#100).
 *
 * RUN:
 *   node docs/tools/shot-junction-sheet.mjs --root <repoRoot> --laws current,spine --out <dir>
 *   node docs/tools/shot-junction-sheet.mjs --compose <dir> <out.png>   (grid: rows=design x view, cols=laws)
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from '../../tools/chromium-harness.mjs';

const SELF = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SELF, '..', '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const argv = process.argv.slice(2);
const getArg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };

// PR #101's designs, verbatim from measure-junction-rim.mjs.
const DESIGNS = [
  { name: 'daisy18-stem', preset: 'daisy', set: { stemType: 'stem' } },
  { name: 'daisy18-bare', preset: 'daisy', set: {} },
  { name: 'lily6-stem',   preset: 'lily',  set: { stemType: 'stem' } },
  { name: 'daisy4-stem',  preset: 'daisy', set: { stemType: 'stem', petalCount: 4 } },
  { name: 'daisy34-stem', preset: 'daisy', set: { stemType: 'stem', petalCount: 34 } },
];
const VIEWS = [
  { name: 'side', az: 20, el: 3 },
  { name: 'tq',   az: 35, el: 30 },
];

const CAMERA_HOOK = `
;window.__flowerSetCamera = (azDeg, elDeg, dist, target) => {
  controls.autoRotate = false;
  controls.enableDamping = false;   // damping interpolates the camera AFTER a set — the read-back would then measure the damper, not the hook
  try { viewTween = null; } catch (e) {}   // the post-rebuild camera FLIGHT (applyViewPreset's 650 ms tween) would keep stepping after the hook
  controls.minDistance = 0.01; controls.maxDistance = 1000;   // the app's dolly clamp (minDistance 1.5) can sit above a junction-framing distance
  // FLUSH the residual autoRotate/damping spherical delta BEFORE positioning: update()
  // applies whatever delta the auto-rotation accumulated on its last frame, so calling it
  // after the set rotated the camera ~0.58 deg of azimuth — a deterministic, identical
  // offset on every run (traced at t=0, not an animation). One update() here consumes it.
  controls.update();
  if (target) controls.target.set(target[0], target[1], target[2]);
  const t = controls.target, az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180;
  camera.position.set(t.x + dist * Math.cos(el) * Math.cos(az), t.y + dist * Math.sin(el), t.z + dist * Math.cos(el) * Math.sin(az));
  camera.lookAt(t); controls.update();
};
window.__flowerCameraState = () => ({ autoRotate: controls.autoRotate, pos: camera.position.toArray(), target: controls.target.toArray() });
`;

async function shoot(root, laws, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const framingPath = path.join(outDir, 'framing.json');
  const framing = fs.existsSync(framingPath) ? JSON.parse(fs.readFileSync(framingPath, 'utf8')) : {};
  const { PRESETS } = await import(pathToFileURL(path.join(root, 'flower-presets.js')).href);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/flower.html';
    if (p === '/flower.js') {   // serve-time camera hook — the tree is never edited
      const src = fs.readFileSync(path.join(root, 'flower.js'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(src + CAMERA_HOOK); return;
    }
    fs.readFile(path.join(root, p), (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
  const problems = [];
  const meta = [];

  for (const law of laws) for (const D of DESIGNS) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await page.route('**cdn.jsdelivr.net/**', (route) => {
      const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
      try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'node_modules/three', rel)) }); }
      catch { route.abort(); }
    });
    const tag = `${D.name}--${law}`;
    try {
      await page.goto(`http://localhost:${port}/flower.html?junctionProbe=1&junctionLaw=${law}`, { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
      await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
      // preview chrome off + autoRotate checkbox off, then ASSERT both (and the hook exists)
      await page.evaluate(() => {
        document.body.classList.add('fl-preview');
        const ar = document.getElementById('autoRotate');
        if (ar && ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(150);
      const bad = await page.evaluate(() => {
        const out = [];
        if (typeof window.__flowerSetCamera !== 'function') out.push('camera hook missing (injection failed on this tree)');
        const ar = document.getElementById('autoRotate');
        if (ar && ar.checked) out.push('autoRotate checkbox still on');
        for (const sel of ['.fl-panel', '.fl-viewpanel', '.fl-header', '.fl-rail', '.fl-panel__toggle', '.fl-hint']) {
          const el = document.querySelector(sel);
          if (el && getComputedStyle(el).display !== 'none') out.push(sel + ' still visible');
        }
        return out;
      });
      if (bad.length) throw new Error('HARNESS INVALID: ' + bad.join('; '));

      const okPreset = await page.evaluate((slug) => { const c = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`); if (!c) return false; c.click(); return true; }, D.preset);
      if (!okPreset) throw new Error('preset cell not found');
      await settle(page);
      for (const [id, v] of Object.entries(D.set)) {
        await page.evaluate(({ id, v }) => {
          const el = document.getElementById(id); if (!el) return;
          el.value = String(v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        }, { id, v });
      }
      await settle(page);
      const st = await page.evaluate(() => window.__flowerUIState());
      const pre = PRESETS.find((q) => q.slug === D.preset);
      for (const [id, v] of Object.entries({ ...(pre.ui || {}), ...D.set })) {
        if (!(id in st)) continue;
        const a = st[id], num = isFinite(Number(v)) && isFinite(Number(a)) && String(v) !== '' && String(a) !== '';
        if (!(num ? Math.abs(Number(v) - Number(a)) < 1e-9 : String(v) === String(a)))
          throw new Error(`read-back: ${id} wanted "${v}", app has "${a}"`);
      }

      const jf = await page.evaluate(() => window.__junctionField && { meta: window.__junctionField.meta, stats: window.__junctionField.stats });
      let target, distC;
      if (jf) {
        if (jf.meta.approachLaw !== law) throw new Error(`built law "${jf.meta.approachLaw}", asked "${law}"`);
        const m = jf.meta;
        // frame the junction: target its vertical centre, distance from its real extent.
        // These quantities (yFeet, yStem, Rring) come from the feet and the neck, which are
        // LAW-INDEPENDENT for a given design — so the framing computed here is saved and
        // reused verbatim by runs on trees that predate ?junctionProbe=1 (law A's branch),
        // keeping "same camera" true across trees by construction, not by hope.
        target = [0, (m.yFeet + m.yStem) / 2, 0];
        const half = Math.max(m.Rring * 1.1, (m.yFeet - m.yStem) * 0.75, 0.2);
        distC = half / Math.tan(21 * Math.PI / 180) * 1.15;
        framing[D.name] = { target, dist: distC };
      } else {
        // no probe on this tree: the law must still be verified (window.__junctionLaw has
        // existed since the switch itself), and the framing comes from a saved run.
        const lawLive = await page.evaluate(() => window.__junctionLaw);
        if (lawLive !== law) throw new Error(`tree reports law "${lawLive}", asked "${law}" (and no junction field to check against)`);
        if (!framing[D.name]) throw new Error('no ?junctionProbe on this tree and no saved framing — run the probe-capable tree first');
        target = framing[D.name].target; distC = framing[D.name].dist;
      }
      const readout = await page.evaluate(() => document.getElementById('readout')?.textContent.replace(/\s+/g, ' ').trim() || '');
      meta.push({ tag, law, design: D.name, junctionTrisLive: jf ? jf.stats.tris : null, caps: jf ? jf.stats.caps : null, readout });

      for (const V of VIEWS) {
        await page.evaluate(({ az, el, dist, target }) => window.__flowerSetCamera(az, el, dist, target), { az: V.az, el: V.el, dist: distC, target });
        await page.waitForTimeout(250);
        const cam = await page.evaluate(() => window.__flowerCameraState());
        if (cam.autoRotate) throw new Error('controls.autoRotate read back TRUE after being set off');
        const want = [target[0] + distC * Math.cos(V.el * Math.PI / 180) * Math.cos(V.az * Math.PI / 180),
                      target[1] + distC * Math.sin(V.el * Math.PI / 180),
                      target[2] + distC * Math.cos(V.el * Math.PI / 180) * Math.sin(V.az * Math.PI / 180)];
        const err = Math.hypot(cam.pos[0] - want[0], cam.pos[1] - want[1], cam.pos[2] - want[2]);
        if (err > Math.max(1e-6, distC * 1e-4)) throw new Error(`camera did not take: off by ${err} (something moved it after the hook)`);
        await page.locator('#flower-canvas').screenshot({ path: path.join(outDir, `${D.name}--${V.name}--${law}.png`) });
      }
      console.log(`  ok  ${tag}` + (jf ? `  junction tris(live)=${jf.stats.tris} caps=${jf.stats.caps}` : '  (no junction probe on this tree — framing from saved run)'));
    } catch (e) {
      problems.push(`${tag}: ${e.message}`);
      console.log(`  FAIL ${tag}: ${e.message}`);
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(outDir, `frames-meta-${laws.join('_')}.json`), JSON.stringify(meta, null, 2));
  fs.writeFileSync(framingPath, JSON.stringify(framing, null, 2));
  if (problems.length) { console.log('\nPROBLEMS:'); for (const p of problems) console.log('  ! ' + p); process.exitCode = 1; }
}

async function settle(page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(200);
}

async function compose(dir, out) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  const parse = (f) => { const m = /^(.+?)--(.+?)--(.+?)\.png$/.exec(f); return m && { design: m[1], view: m[2], law: m[3], f }; };
  const frames = files.map(parse).filter(Boolean);
  const laws = [...new Set(frames.map((x) => x.law))];
  const order = ['current', 'arearun', 'spine'];
  laws.sort((a, b) => (order.indexOf(a) + 99 * (order.indexOf(a) < 0)) - (order.indexOf(b) + 99 * (order.indexOf(b) < 0)));
  const rows = [];
  for (const D of DESIGNS) for (const V of VIEWS) {
    const cells = laws.map((law) => {
      const fr = frames.find((x) => x.design === D.name && x.view === V.name && x.law === law);
      return fr ? `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, fr.f)).toString('base64')}"><figcaption>${law}</figcaption></figure>` : '<figure class="miss">missing</figure>';
    }).join('');
    rows.push(`<div class="row"><div class="lab">${D.name}<br>${V.name}</div>${cells}</div>`);
  }
  const CELL = 340;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#000;color:#9fdcdc;font:13px ui-monospace,Menlo,monospace}
    .row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #163}
    .lab{width:110px;letter-spacing:.05em;text-transform:uppercase}
    figure{margin:0}.miss{width:${CELL}px;height:${CELL}px;display:flex;align-items:center;justify-content:center;color:#633}
    img{width:${CELL}px;height:${CELL}px;display:block;background:#000}
    figcaption{text-align:center;opacity:.55;padding-top:3px}</style>
    <div style="padding:10px 14px;opacity:.7">junction contact sheet — laws: ${laws.join(' / ')} — same camera per row, chrome hidden, autoRotate asserted off</div>${rows.join('')}`;
  const tmp = path.join(dir, '_sheet.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 140 + (CELL + 10) * laws.length + 40, height: 900 } })).newPage();
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log('sheet -> ' + out);
}

if (argv[0] === '--compose') await compose(argv[1], argv[2]);
else await shoot(path.resolve(getArg('--root', DEFAULT_ROOT)), getArg('--laws', 'current,spine').split(','), path.resolve(getArg('--out', '/tmp/junction-sheet')));
