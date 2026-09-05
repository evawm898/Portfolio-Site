// verify-print-scaffold.mjs — behaviour gate for /print: the scaffold, the
// posing stage and the line-art stage.
//
//   node tools/verify-print-scaffold.mjs [shots-dir]
//   node tools/verify-print-scaffold.mjs [shots-dir] --mutants
//
// Serves the repo on a free port with Netlify's clean-URL behaviour emulated
// (a request for /print falls back to print.html), so the ROUTE is exercised
// and not just the file. Three.js is fulfilled from node_modules at the exact
// jsDelivr URLs print.html pins, so the gate needs no CDN egress:
//
//   npm i --no-save three@0.161.0 playwright-core
//
// SCAFFOLD. The bundle loads, the scene holds meshes, the model is actually
// LIT AND ON SCREEN in the shaded preview (measured from the screenshot bytes,
// not from readPixels — the context has no preserveDrawingBuffer, so a
// readPixels after the frame returns a cleared buffer and scores 100%
// "non-background" for a completely empty scene), a drag on the canvas moves
// the camera, and the pivot node's extras round-trip through GLTFLoader with
// the junction position, the junction tangent and a non-empty
// rotation_limits_deg. The exporter's pivot_marker sphere is found, still in
// the tree, and hidden by default, and its toggle shows and re-hides it.
//
// POSE. Measured against mesh state and rendered pixels, not against the
// control that was just written: a slider that moves a read-out and nothing
// else passes none of them.
//
// LINE ART. Same rule, one level up. Every claim is measured against either
// the extracted segment set (which the page exposes as counts, not as a
// picture) or the SCREENSHOT BYTES. The three sliders are asserted to do
// three DIFFERENT things — weight changes how wide a line is drawn without
// changing which lines exist, detail changes which CREASES exist without
// changing the silhouette, and pointillism changes which renderer consumes an
// unchanged segment set — because a single slider wired to "make it look
// different" would satisfy any one of those on its own.
//
// --mutants re-runs the whole gate against deliberately broken copies of
// print.js / print-lines.js, served in place of the real ones through this
// gate's own HTTP server. Each mutant NAMES the checks it must break; the run
// fails if a mutation does not apply (the source string moved), if a named
// check stays green, or if an unnamed check goes red for a reason the mutant
// did not claim. That last one is what stops a mutation from "passing" by
// breaking the page outright.
//
// Verified falsifiable beyond the mutants, by hand, each on the check that
// names the behaviour: not adding gltf.scene to the scene, disabling
// OrbitControls, looking for a pivot node that does not exist, removing every
// light, stripping `extras` from the bundle at generation time, leaving the
// marker visible, and REMOVING the marker from the tree instead of hiding it.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';

const ROOT = '/home/user/Portfolio-Site';
const args = process.argv.slice(2);
const WITH_MUTANTS = args.includes('--mutants') || args.some(a => a.startsWith('--mutant='));
// --mutant=<id>[,<id>] runs just those, so a claim can be corrected in two
// minutes instead of in a thirty-five minute full sweep.
const ONLY = (args.find(a => a.startsWith('--mutant=')) || '').split('=')[1];
const OUT = args.find(a => !a.startsWith('--')) || '/tmp/print-shots';
mkdirSync(OUT, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.glb':'model/gltf-binary', '.json':'application/json', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.png':'image/png' };

// The mutation currently being served, or null. One server for every run.
let OVERRIDE = null;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, p);
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
  if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  try {
    let body = readFileSync(f);
    if (OVERRIDE && path.basename(f) === OVERRIDE.file) body = Buffer.from(OVERRIDE.text, 'utf8');
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

// --- the mutants -----------------------------------------------------------
// Each one is a single, surgical edit that leaves the page running. `breaks`
// is the set of check names that MUST go red; everything else must stay green.
const MUTANTS = [
  { id: 'weight-ignored', file: 'print-lines.js',
    from: 'u.mat.linewidth = this.weight;', to: 'u.mat.linewidth = 1.6;',
    breaks: ['weight/material', 'weight/pixels'] },

  { id: 'weight-adds-lines', file: 'print-lines.js',
    from: 'const creaseCos = Math.cos(THREE.MathUtils.degToRad(this.creaseAngleDeg));',
    // SUBTRACTS on purpose. The weight check is measured at detail 0 (88 deg),
    // and adding to that threshold pushes it past 90 deg, where cos goes
    // negative and no crease passes at either end of the slider — the mutation
    // neutralises itself. Measured: it stayed green until this sign flipped.
    to: 'const creaseCos = Math.cos(THREE.MathUtils.degToRad(this.creaseAngleDeg - this.weight * 8));',
    breaks: ['weight/segments-unchanged'] },

  { id: 'detail-ignored', file: 'print-lines.js',
    from: 'get creaseAngleDeg() { return detailToAngleDeg(this.detail); }',
    to: 'get creaseAngleDeg() { return detailToAngleDeg(45); }',
    breaks: ['detail/creases-grow', 'detail/pixels', 'detail/readout'] },

  { id: 'detail-moves-silhouette', file: 'print-lines.js',
    from: '      } else if (a !== facing[f1]) {\n        kind = 1;                                          // silhouette',
    to: '      } else if (a !== facing[f1] && D[e] < creaseCos * 0.999) {\n        kind = 1;                                          // silhouette',
    breaks: ['detail/silhouette-held'] },

  { id: 'no-weld', file: 'print-lines.js',
    from: '      const k = `${Math.round(pos.getX(i) * inv)},${Math.round(pos.getY(i) * inv)},${Math.round(pos.getZ(i) * inv)}`;',
    to: '      const k = `v${i}`;',
    breaks: ['topology/welded', 'weight/pixels', 'detail/creases-grow', 'detail/pixels'] },

  { id: 'dots-never-drawn', file: 'print-lines.js',
    from: '        if (hash01(EI[i]) >= b) {', to: '        if (true) {',
    breaks: ['blend/dots-at-100', 'blend/mixed', 'blend/pixels'] },

  { id: 'dots-are-a-second-extraction', file: 'print-lines.js',
    from: '      const n = u.ex.extract(camLocal, creaseCos);',
    to: '      const n = u.ex.extract(camLocal, Math.cos(THREE.MathUtils.degToRad(this.creaseAngleDeg * (1 - this.blend / 200))));',
    breaks: ['blend/same-extraction'] },

  { id: 'stylize-resets-pose', file: 'print.js',
    from: '    function readStyle() {\n      art.setOptions({',
    to: '    function readStyle() {\n      if (rig) { rig.resetPose(); repose(); }\n      art.setOptions({',
    breaks: ['independence/pose-survives-sliders'] },

  { id: 'stylize-freezes-pose-controls', file: 'print.js',
    from: '  canvas.addEventListener(\'pointerdown\', (ev) => {\n    if (!rig) return;',
    to: '  canvas.addEventListener(\'pointerdown\', (ev) => {\n    if (!rig || (art && art.enabled)) return;',
    breaks: ['stylized/bend-drag-still-works', 'pose/lines-follow-bend',
             'pose/panel-reflects-state'] },

  { id: 'lines-frozen-after-first-frame', file: 'print.js',
    from: '    frameStats = art.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());',
    to: '    frameStats = frameStats || art.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());',
    breaks: ['live/orbit-moves-silhouette', 'weight/material', 'weight/pixels',
             'detail/creases-grow', 'detail/pixels', 'detail/readout',
             'blend/dots-at-100', 'blend/mixed', 'blend/pixels'] },
];

// ===========================================================================
async function run({ mutant = null, shots = false } = {}) {
  const checks = new Map();
  const details = new Map();
  const say = [];
  const out = (s) => { say.push(s); if (!mutant) console.log(s); };
  const check = (name, ok, detail = '') => {
    checks.set(name, !!ok);
    details.set(name, detail);
    out(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
    return !!ok;
  };

  const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });

  // serve three from node_modules at the exact pinned CDN URLs
  await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
    const u = new URL(route.request().url());
    const rel = u.pathname.replace('/npm/three@0.161.0/', '');
    const f = path.join(ROOT, 'node_modules/three', rel);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
  });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  const page = await ctx.newPage();
  const errs = [], logs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
  page.on('requestfailed', r => logs.push('REQFAIL ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) logs.push('HTTP ' + r.status() + ' ' + r.url()); });

  const finish = async (ok) => { await browser.close(); return { ok, checks, details, errs, logs, say }; };
  const call = (expr) => page.evaluate(expr);
  let settleResidual = Infinity;
  const settleCamera = async () => {
    let prev = await call(() => window.__printScaffold.cameraPosition());
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(100);
      const p = await call(() => window.__printScaffold.cameraPosition());
      settleResidual = Math.hypot(p[0]-prev[0], p[1]-prev[1], p[2]-prev[2]);
      prev = p;
      if (settleResidual < 1e-4) return p;
    }
    return prev;
  };
  const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(OUT, name) }); };

  // hit the CLEAN url, no .html
  await page.goto(`${base}/print`, { waitUntil: 'load' });
  try {
    await page.waitForFunction('window.__printScaffold', { timeout: 20000 });
  } catch (e) {
    out('page errors: ' + errs.join(' | '));
    out('console: ' + logs.join('\n'));
    check('boot/scaffold-ready', false);
    return finish(false);
  }
  const ready = await call(() => window.__printScaffold.ready);
  check('boot/scaffold-ready', ready);
  if (!ready) { out('page errors: ' + errs.join(' | ')); return finish(false); }
  await page.waitForFunction('window.__printLineArt', { timeout: 20000 }).catch(() => {});
  check('boot/lineart-ready', await call(() => !!window.__printLineArt));
  if (!await call(() => !!window.__printLineArt)) return finish(false);

  const info = await call(() => ({ ...window.__printScaffold, cameraPosition: window.__printScaffold.cameraPosition() }));
  if (!mutant) {
    console.log('scaffold:', JSON.stringify({ meshes: info.meshes, tris: info.tris, nodes: info.nodeNames }, null, 1));
    console.log('debug panel:\n' + await page.textContent('#print-log'));
  }

  out('\n--- scaffold ---');
  check('scaffold/meshes', info.meshes >= 1, `${info.meshes}`);
  check('scaffold/pivot-extras',
    !!(info.pivotExtras && info.pivotExtras.junction && Array.isArray(info.pivotExtras.junction.position)
      && Array.isArray(info.pivotExtras.junction.tangent) && info.pivotExtras.rotation_limits_deg
      && Object.keys(info.pivotExtras.rotation_limits_deg).length > 0));

  // The pivot_marker is the exporter's diagnostic sphere, hidden by default.
  // Three separate facts, because "not on screen" has more than one cause and
  // only one of them is the intended one.
  check('scaffold/marker-found', info.markerFound);
  check('scaffold/marker-in-tree', await call(() => window.__printScaffold.markerInTree()));
  check('scaffold/marker-hidden-by-default', !(await call(() => window.__printScaffold.markerVisible())));
  const toggleOffered = !(await page.locator('#print-marker-toggle').isHidden());
  check('scaffold/marker-toggle-offered', toggleOffered);
  if (toggleOffered) {
    await page.check('#showPivotMarker');
    check('scaffold/marker-toggle-shows', await call(() => window.__printScaffold.markerVisible()));
    await page.uncheck('#showPivotMarker');
    check('scaffold/marker-toggle-rehides', !(await call(() => window.__printScaffold.markerVisible())));
  }

  // --- panel-aware ink measurement ---------------------------------------
  // Both overlay panels are excluded by their REAL bounding boxes rather than
  // by a hardcoded rectangle: the right-hand column grew a second panel this
  // session, and a stale rectangle would have measured chrome as ink.
  const panels = [];
  for (const sel of ['#print-debug', '#print-side']) {
    const b = await page.locator(sel).boundingBox();
    if (b) panels.push(b);
  }
  function inkFraction(png, bg) {
    const { width, height, data } = decodePNG(png);
    let n = 0, seen = 0;
    for (let i = 0; i < width * height; i++) {
      const x = i % width, y = (i / width) | 0;
      if (panels.some(p => x >= p.x - 2 && x <= p.x + p.width + 2 && y >= p.y - 2 && y <= p.y + p.height + 2)) continue;
      seen++;
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      if (Math.abs(r - bg[0]) > 6 || Math.abs(g - bg[1]) > 6 || Math.abs(b - bg[2]) > 6) n++;
    }
    return n / Math.max(seen, 1);
  }
  const inkNow = async (name, bg) => {
    const buf = await page.screenshot({ path: shots ? path.join(OUT, name) : undefined });
    return inkFraction(buf, bg);
  };
  const PAPER = [242, 240, 234], DARK = [12, 14, 14];

  // --- line art is the shipped default -----------------------------------
  out('\n--- line art, shipped state ---');
  check('lineart/on-by-default', await call(() => window.__printLineArt.enabled()));
  check('lineart/panel-visible', !(await page.locator('#print-stylize').isHidden()));
  const topo = await call(() => window.__printLineArt.topology());
  if (!mutant) console.log('topology:', JSON.stringify(topo, null, 1));
  const totalEdges = topo.reduce((a, t) => a + t.edges, 0);
  const totalBoundary = topo.reduce((a, t) => a + t.boundary, 0);
  const totalTris = topo.reduce((a, t) => a + t.tris, 0);
  // A build that never welded would report ~3 vertices per triangle and every
  // single edge as a boundary — and would then draw a silhouette-only picture
  // with no creases in it at all, which nothing else here would notice.
  const weldRatio = topo.reduce((a, t) => a + t.verts, 0) / (totalTris * 3);
  check('topology/welded', weldRatio < 0.75 && totalBoundary / totalEdges < 0.01,
    `verts/3F=${weldRatio.toFixed(3)} boundary=${totalBoundary}/${totalEdges}`);

  // --- the shaded preview, and the scaffold's own pixel claim -------------
  // Done with line art OFF on purpose: the claim is that the MODEL is lit and
  // on screen, and the line art uses no lighting model at all, so leaving it
  // on would make "remove every light" unfalsifiable.
  await call(() => window.__printLineArt.setLineArt(false));
  await page.waitForTimeout(250);
  const shadedInk = await inkNow('01-shaded.png', DARK);
  check('scaffold/model-lit-and-on-screen', shadedInk > 0.005 && shadedInk < 0.9, `ink=${shadedInk.toFixed(4)}`);
  await call(() => window.__printLineArt.setLineArt(true));
  await page.waitForTimeout(250);
  const artInk = await inkNow('02-lineart.png', PAPER);
  check('lineart/draws-something', artInk > 0.002 && artInk < 0.6, `ink=${artInk.toFixed(4)}`);

  // orbit: drag across the canvas, camera must move
  const before = await call(() => window.__printScaffold.cameraPosition());
  const box = await page.locator('#print-canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2 + i * 22, box.y + box.height / 2 + i * 4);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await call(() => window.__printScaffold.cameraPosition());
  const moved = Math.hypot(after[0]-before[0], after[1]-before[1], after[2]-before[2]);
  check('scaffold/orbit-moves-camera', moved > 1, `moved ${moved.toFixed(2)}`);
  await shot('03-orbited.png');

  // ===================== POSE ===========================================
  out('\n--- pose ---');
  const hasRig = await call(() => window.__printScaffold.hasRig);
  const stemVerts = await call(() => window.__printScaffold.stemVertexCount);
  const cleanSlabs = await call(() => window.__printScaffold.axisCleanSlabs);
  const leafVerts0 = await call(() => window.__printScaffold.leafVertexCount());
  const axisOff = await call(() => window.__printScaffold.axisOffsets());
  const axisOnStem = axisOff.every(v => v !== null && v < 3);
  const restUlps = await call(() => window.__printScaffold.restResidualUlps());
  check('pose/rig-present', hasRig && stemVerts > 0 && cleanSlabs >= 4, `verts=${stemVerts} slabs=${cleanSlabs}`);
  check('pose/axis-on-stem', axisOnStem, `[${axisOff.map(v => v === null ? 'null' : v.toFixed(2))}]`);
  check('pose/rest-is-identity', restUlps <= 1 && await call(() => window.__printScaffold.isRest()),
    `${restUlps.toFixed(3)} float32 ULP`);

  // dragging a bend point moves the MESH, not just the handle. Done with LINE
  // ART ON — this is the session's "the stage is not a mode you enter" claim,
  // and a build that gates the pointer handler behind the shaded view fails
  // here rather than in a screenshot nobody diffed.
  const bbBefore = await call(() => window.__printScaffold.stemBBox());
  const vtxBefore = await call(() => window.__printScaffold.stemVertex(7000));
  const stemSegBefore = (await call(() => window.__printLineArt.topology()))[0].segments;
  const [hx, hy] = await call(() => window.__printScaffold.handleScreenPos(2));
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) await page.mouse.move(hx + i * 8, hy);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const bendPts = await call(() => window.__printScaffold.bendPoints());
  const bbAfter = await call(() => window.__printScaffold.stemBBox());
  const vtxAfter = await call(() => window.__printScaffold.stemVertex(7000));
  const nowBent = !(await call(() => window.__printScaffold.isRest()));
  const vtxMoved = Math.hypot(vtxAfter[0]-vtxBefore[0], vtxAfter[1]-vtxBefore[1], vtxAfter[2]-vtxBefore[2]);
  // ALL THREE AXES. The x extent alone is a function of where the camera
  // happens to be, so the same drag reads 3.79 from one azimuth and 0.31 from
  // another — measured, and it flaked the check before this summed the box.
  let bboxMoved = 0;
  for (let k = 0; k < 3; k++) bboxMoved += Math.abs(bbAfter[1][k] - bbBefore[1][k]) + Math.abs(bbAfter[0][k] - bbBefore[0][k]);
  check('stylized/bend-drag-still-works', nowBent && vtxMoved > 0.5 && bboxMoved > 0.5,
    `bent=${nowBent} vertex ${vtxMoved.toFixed(2)} bbox ${bboxMoved.toFixed(2)}`);

  // the leaves must SURVIVE the bend — the whole reason for not re-lofting
  const leafVerts1 = await call(() => window.__printScaffold.leafVertexCount());
  const stemVerts1 = await call(() => window.__printScaffold.stemVertexCount);
  check('pose/leaves-survive-bend', leafVerts1 === leafVerts0 && leafVerts0 > 0 && stemVerts1 === stemVerts,
    `leafVerts ${leafVerts1} (was ${leafVerts0})`);

  // ...and the LINEWORK followed it. The stem is re-extracted because its
  // vertices moved; if it were not, the segment set would be bit-identical.
  //
  // MEASURED AT ONE CAMERA. "The segment count changed after the drag" is NOT
  // enough on its own: a drag that misses the handle falls through to
  // OrbitControls, and the orbit changes the silhouette by itself — measured,
  // the mutant that freezes the pose controls while stylized passed the naive
  // version on the orbit its own failure caused. Nor can it be fixed by
  // asserting the camera held still: headless runs on software GL at ~2 fps,
  // so OrbitControls' damping has a ~4 SECOND half-life and the camera is
  // never still (measured: 12.3 units per 300 ms immediately after a drag,
  // still 4.4 six seconds later). So the page extracts rest and bent at the
  // SAME camera inside one tick and hands back both, which removes the camera
  // from the question instead of trying to hold it.
  const rvb = await call(() => window.__printLineArt.stemLinesRestVsBent());
  const stemSegAfter = (await call(() => window.__printLineArt.topology()))[0].segments;
  check('pose/lines-follow-bend', !!rvb && rvb.bent !== rvb.rest && rvb.restored === rvb.bent,
    `at one camera: rest ${rvb && rvb.rest} vs bent ${rvb && rvb.bent} (restored ${rvb && rvb.restored}); across the drag ${stemSegBefore} -> ${stemSegAfter}`);
  await shot('04-bent-stylized.png');

  // the anchored root cannot be dragged, by the picker OR by the rig
  const rootBefore = (await call(() => window.__printScaffold.bendPoints()))[0];
  const [rx, ry] = await call(() => window.__printScaffold.handleScreenPos(0));
  await page.mouse.move(rx, ry);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(rx + i * 8, ry - i * 3);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const rootAfter = (await call(() => window.__printScaffold.bendPoints()))[0];
  const rootMovedByModel = await call(() => window.__printScaffold.forceRootMove());
  const rootAfterForce = (await call(() => window.__printScaffold.bendPoints()))[0];
  check('pose/root-anchored-against-drag', rootBefore.every((v, i) => v === rootAfter[i]));
  check('pose/root-anchored-against-model', !rootMovedByModel && rootBefore.every((v, i) => v === rootAfterForce[i]));

  // hinge sliders rotate the BLOOM and stay inside the bundle's own limits
  const lim = await call(() => window.__printScaffold.limits());
  const declared = info.pivotExtras.rotation_limits_deg;
  check('pose/limits-from-bundle',
    await call(() => window.__printScaffold.limitsFromBundle())
    && JSON.stringify(lim.droop) === JSON.stringify(declared.droop)
    && JSON.stringify(lim.twist) === JSON.stringify(declared.twist),
    `${JSON.stringify(lim)} vs ${JSON.stringify(declared)}`);
  const qRest = await call(() => window.__printScaffold.bloomQuaternion());
  const cRest = await call(() => window.__printScaffold.bloomWorldCentroid());
  await call(() => window.__printScaffold.setDroop(30));
  await page.waitForTimeout(150);
  const qDroop = await call(() => window.__printScaffold.bloomQuaternion());
  const cDroop = await call(() => window.__printScaffold.bloomWorldCentroid());
  await call(() => window.__printScaffold.setTwist(-20));
  await page.waitForTimeout(150);
  const qTwist = await call(() => window.__printScaffold.bloomQuaternion());
  const qDist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3]);
  const bloomMoved = Math.hypot(cDroop[0]-cRest[0], cDroop[1]-cRest[1], cDroop[2]-cRest[2]);
  check('pose/droop-turns-bloom', qDist(qDroop, qRest) > 1e-3 && bloomMoved > 0.5, `centroid ${bloomMoved.toFixed(2)}`);
  check('pose/twist-turns-bloom', qDist(qTwist, qDroop) > 1e-3);

  // Out-of-range writes must be refused BY THE MODEL. Going through the
  // slider proves nothing: an <input max=45> given "500" reads back "45"
  // before any of the page's code runs.
  await call(() => window.__printScaffold.setDroop(500));
  await call(() => window.__printScaffold.setTwist(-999));
  const dW = await call(() => window.__printScaffold.droop()), tW = await call(() => window.__printScaffold.twist());
  await call(() => window.__printScaffold.forcePose(500, -999));
  const dO = await call(() => window.__printScaffold.droop()), tO = await call(() => window.__printScaffold.twist());
  await call(() => window.__printScaffold.forcePose(-500, 999));
  const dU = await call(() => window.__printScaffold.droop()), tU = await call(() => window.__printScaffold.twist());
  const inR = (v, r) => v >= r[0] && v <= r[1];
  check('pose/hinge-clamped-by-model',
    inR(dW, lim.droop) && inR(tW, lim.twist) && inR(dO, lim.droop) && inR(tO, lim.twist)
    && inR(dU, lim.droop) && inR(tU, lim.twist), `widget ${dW}/${tW} model ${dO}/${tO} and ${dU}/${tU}`);
  await call(() => { window.__printScaffold.setDroop(30); window.__printScaffold.setTwist(-20); });
  await page.waitForTimeout(150);

  // pose SURVIVES a camera orbit — and so does the line art's own liveness
  const poseBeforeOrbit = await call(() => window.__printScaffold.bendPoints());
  const dBefore = await call(() => window.__printScaffold.droop());
  const tBefore = await call(() => window.__printScaffold.twist());
  const camBefore = await call(() => window.__printScaffold.cameraPosition());
  const silBefore = (await call(() => window.__printLineArt.stats())).silhouette;
  const cbox = await page.locator('#print-canvas').boundingBox();
  await page.mouse.move(cbox.x + cbox.width * 0.75, cbox.y + cbox.height * 0.75);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(cbox.x + cbox.width * 0.75 - i * 16, cbox.y + cbox.height * 0.75 - i * 4);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const camAfter = await call(() => window.__printScaffold.cameraPosition());
  const camMoved = Math.hypot(camAfter[0]-camBefore[0], camAfter[1]-camBefore[1], camAfter[2]-camBefore[2]);
  const silAfter = (await call(() => window.__printLineArt.stats())).silhouette;
  const poseAfterOrbit = await call(() => window.__printScaffold.bendPoints());
  const dAfterOrbit = await call(() => window.__printScaffold.droop());
  const tAfterOrbit = await call(() => window.__printScaffold.twist());
  check('pose/survives-orbit',
    JSON.stringify(poseBeforeOrbit) === JSON.stringify(poseAfterOrbit)
    && dBefore === dAfterOrbit && tBefore === tAfterOrbit,
    `camera moved ${camMoved.toFixed(1)}; bend ${JSON.stringify(poseBeforeOrbit) === JSON.stringify(poseAfterOrbit) ? 'held' : 'MOVED ' + JSON.stringify(poseBeforeOrbit[2]) + ' -> ' + JSON.stringify(poseAfterOrbit[2])}; droop ${dBefore}->${dAfterOrbit} twist ${tBefore}->${tAfterOrbit}`);
  // THE silhouette is the outline FROM THE CURRENT CAMERA. If it does not move
  // when the camera does, it is not a silhouette — it is a fixed edge set.
  check('live/orbit-moves-silhouette', camMoved > 1 && silBefore !== silAfter,
    `${silBefore} -> ${silAfter}`);
  await shot('05-posed-orbited.png');

  const poseTxt = await call(() => window.__printScaffold.poseText());
  const dNow = await call(() => window.__printScaffold.droop()), tNow = await call(() => window.__printScaffold.twist());
  check('pose/panel-reflects-state',
    /BENT/.test(poseTxt)
    && new RegExp(`droop\\s+${dNow.toFixed(1)}`).test(poseTxt)
    && new RegExp(`twist\\s+${tNow.toFixed(1)}`).test(poseTxt),
    `stem ${/BENT/.test(poseTxt) ? 'BENT' : 'REST'}, droop ${dNow.toFixed(1)} twist ${tNow.toFixed(1)}`);

  // ===================== STYLIZE ========================================
  // Three sliders, three DIFFERENT jobs. Each is asserted on what it must
  // change AND on what it must leave alone, because a single "make it look
  // different" wire would satisfy the first half of any of them.
  out('\n--- stylize ---');
  const stats = () => call(() => window.__printLineArt.stats());
  const setStyle = (o) => call(`window.__printLineArt.setStyle(${JSON.stringify(o)})`);
  const settle = () => page.waitForTimeout(260);

  // -- weight: wider strokes, same lines ---------------------------------
  // Measured at detail 0 on purpose. Ink fraction is a COVERAGE measure and it
  // saturates: at detail 100 the bloom is already a solid black mass, so a 5x
  // stroke width moves the count by almost nothing and the check would be
  // measuring overlap rather than width. At the sparsest line set the same
  // widening reads clean, and the mutant run below reports the no-signal
  // baseline (ratio 1.00) that the threshold sits above.
  await setStyle({ detail: 0, blend: 0, weight: 1.0 }); await settle();
  const thinStats = await stats();
  const thinInk = await inkNow('06-weight-1.0.png', PAPER);
  const thinMat = await call(() => window.__printLineArt.materialWidth());
  await setStyle({ weight: 5.0 }); await settle();
  const fatStats = await stats();
  const fatInk = await inkNow('07-weight-5.0.png', PAPER);
  const fatMat = await call(() => window.__printLineArt.materialWidth());
  check('weight/material', thinMat.every(v => v === 1.0) && fatMat.every(v => v === 5.0),
    `${JSON.stringify(thinMat)} -> ${JSON.stringify(fatMat)}`);
  check('weight/pixels', fatInk > thinInk * 1.25, `ink ${thinInk.toFixed(4)} -> ${fatInk.toFixed(4)} (x${(fatInk / thinInk).toFixed(2)})`);
  // ...and it is the WIDTH that changed, not the number of lines. A "weight"
  // slider that quietly admitted more creases would also darken the frame.
  const segDrift = Math.abs(fatStats.segments - thinStats.segments) / thinStats.segments;
  check('weight/segments-unchanged', segDrift < 0.02,
    `${thinStats.segments} -> ${fatStats.segments} (${(segDrift * 100).toFixed(2)}%)`);

  // -- detail: more creases, same silhouette ------------------------------
  await setStyle({ weight: 1.4, blend: 0, detail: 0 }); await settle();
  const cleanStats = await stats();
  const cleanInk = await inkNow('08-detail-0.png', PAPER);
  const cleanTxt = await call(() => window.__printLineArt.artText());
  await setStyle({ detail: 100 }); await settle();
  const busyStats = await stats();
  const busyInk = await inkNow('09-detail-100.png', PAPER);
  const busyTxt = await call(() => window.__printLineArt.artText());
  check('detail/creases-grow', busyStats.crease > cleanStats.crease * 1.5,
    `${cleanStats.crease} -> ${busyStats.crease} creases`);
  check('detail/pixels', busyInk > cleanInk * 1.10, `ink ${cleanInk.toFixed(4)} -> ${busyInk.toFixed(4)} (x${(busyInk / cleanInk).toFixed(2)})`);
  // The silhouette is a function of the CAMERA, never of the crease
  // threshold. Nothing else here separates "detail" from "draw more edges".
  const silDrift = Math.abs(busyStats.silhouette - cleanStats.silhouette) / cleanStats.silhouette;
  check('detail/silhouette-held', silDrift < 0.02,
    `${cleanStats.silhouette} -> ${busyStats.silhouette} (${(silDrift * 100).toFixed(2)}%)`);
  // and the threshold the page REPORTS is the one the extraction used
  const angClean = await call(() => window.__printLineArt.creaseAngleDeg());
  const angDecl = await call(() => window.__printLineArt.detailToAngleDeg(100));
  check('detail/readout',
    /crease threshold\s+88\.0/.test(cleanTxt) && /crease threshold\s+6\.0/.test(busyTxt)
    && Math.abs(angClean - angDecl) < 1e-9 && cleanStats.creaseAngleDeg > busyStats.creaseAngleDeg,
    `${cleanStats.creaseAngleDeg}° -> ${busyStats.creaseAngleDeg}°`);

  // -- pointillism: the same segments, drawn as dots ----------------------
  await setStyle({ detail: 45, weight: 2.2, blend: 0 }); await settle();
  const b0 = await stats();
  const ink0 = await inkNow('10-dots-0.png', PAPER);
  await setStyle({ blend: 50 }); await settle();
  const b50 = await stats();
  await setStyle({ blend: 100 }); await settle();
  const b100 = await stats();
  const ink100 = await inkNow('11-dots-100.png', PAPER);
  check('blend/strokes-at-0', b0.strokes === b0.segments && b0.dots === 0,
    `${b0.strokes} strokes / ${b0.dots} dots of ${b0.segments}`);
  check('blend/dots-at-100', b100.strokes === 0 && b100.dots > 0,
    `${b100.strokes} strokes / ${b100.dots} dots`);
  check('blend/mixed', b50.strokes > 0 && b50.dots > 0 && b50.strokes < b0.strokes,
    `blend 50 -> ${b50.strokes} strokes + ${b50.dots} dots`);
  check('blend/pixels', Math.abs(ink100 - ink0) / ink0 > 0.05, `ink ${ink0.toFixed(4)} -> ${ink100.toFixed(4)}`);
  // ONE extraction, two consumers: the segment set must be the same at both
  // ends of the slider. A second extraction path for the dots shows up here
  // and nowhere else.
  const bDrift = Math.abs(b100.segments - b0.segments) / b0.segments;
  check('blend/same-extraction', bDrift < 0.02 && Math.abs(b100.crease - b0.crease) / Math.max(b0.crease, 1) < 0.02,
    `${b0.segments} -> ${b100.segments} segments (${(bDrift * 100).toFixed(2)}%)`);

  // -- the two axes do not touch each other -------------------------------
  out('');
  const poseSnap = async () => ({
    bend: await call(() => window.__printScaffold.bendPoints()),
    droop: await call(() => window.__printScaffold.droop()),
    twist: await call(() => window.__printScaffold.twist()),
  });
  const poseA = await poseSnap();
  // drive all three through the WIDGETS, the way a hand does
  await call(() => window.__printLineArt.setWeightWidget(3.3));
  await call(() => window.__printLineArt.setDetailWidget(72));
  await call(() => window.__printLineArt.setDotsWidget(65));
  await call(() => window.__printLineArt.setLineArt(false));
  await call(() => window.__printLineArt.setLineArt(true));
  await settle();
  const poseB = await poseSnap();
  check('independence/pose-survives-sliders', JSON.stringify(poseA) === JSON.stringify(poseB),
    `droop ${poseA.droop}->${poseB.droop} twist ${poseA.twist}->${poseB.twist}`);

  const styleA = await call(() => window.__printLineArt.style());
  const [gx, gy] = await call(() => window.__printScaffold.handleScreenPos(1));
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(gx - i * 5, gy + i * 2);
  await page.mouse.up();
  await call(() => { window.__printScaffold.setDroop(12); window.__printScaffold.setTwist(9); });
  await settle();
  const styleB = await call(() => window.__printLineArt.style());
  check('independence/style-survives-pose', JSON.stringify(styleA) === JSON.stringify(styleB),
    `${JSON.stringify(styleA)} vs ${JSON.stringify(styleB)}`);
  await shot('12-both-axes.png');

  if (!mutant) {
    console.log('\nline-art read-out:\n' + await call(() => window.__printLineArt.artText()));
    console.log('perf:', JSON.stringify(await call(() => window.__printLineArt.perf())));
  }
  check('page/no-errors', errs.length === 0, errs.join(' | '));
  return finish([...checks.values()].every(Boolean));
}

// ===========================================================================
const main = await run({ shots: true });
console.log('\npage errors:', main.errs.length ? main.errs : 'none');
const failed = [...main.checks].filter(([, v]) => !v).map(([k]) => k);
console.log(`\n${main.checks.size} checks, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);

let mutantsOK = true;
if (WITH_MUTANTS) {
  console.log('\n=== mutants ===');
  const wanted = ONLY ? ONLY.split(',') : null;
  for (const m of MUTANTS) {
    if (wanted && !wanted.includes(m.id)) continue;
    const src = readFileSync(path.join(ROOT, m.file), 'utf8');
    if (!src.includes(m.from)) {
      console.log(`  [FAIL] ${m.id}: mutation did not apply — the source it edits has moved`);
      mutantsOK = false; continue;
    }
    OVERRIDE = { file: m.file, text: src.replace(m.from, m.to) };
    const r = await run({ mutant: m.id });
    OVERRIDE = null;
    const red = [...r.checks].filter(([, v]) => !v).map(([k]) => k);
    const missed = m.breaks.filter(k => !red.includes(k));
    const extra = red.filter(k => !m.breaks.includes(k));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) mutantsOK = false;
    console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${m.id.padEnd(34)} red: ${red.length ? red.join(', ') : '(none)'}`);
    if (missed.length) console.log(`         MISSED (stayed green): ${missed.join(', ')}`);
    if (extra.length) console.log(`         UNCLAIMED (also red): ${extra.join(', ')}`);
    if (!ok) for (const k of [...missed, ...extra]) console.log(`           ${k}: ${r.details.get(k) || '(no detail)'}`);
  }
} else {
  console.log('\n(mutants not run — pass --mutants to negative-control every assertion above)');
}

server.close();
const ok = main.ok && mutantsOK;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
