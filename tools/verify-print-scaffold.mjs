// verify-print-scaffold.mjs — behaviour gate for the /print scaffold.
//
//   node tools/verify-print-scaffold.mjs [shots-dir]
//
// Serves the repo on a free port with Netlify's clean-URL behaviour emulated
// (a request for /print falls back to print.html), so the ROUTE is exercised
// and not just the file. Three.js is fulfilled from node_modules at the exact
// jsDelivr URLs print.html pins, so the gate needs no CDN egress:
//
//   npm i --no-save three@0.161.0 playwright-core
//
// It asserts, in one run: the bundle loads, the scene holds meshes, the model
// is actually LIT AND ON SCREEN (measured from the screenshot bytes, not from
// readPixels — the context has no preserveDrawingBuffer, so a readPixels after
// the frame returns a cleared buffer and scores 100% "non-background" for a
// completely empty scene), a drag on the canvas moves the camera, and the
// pivot node's extras round-trip through GLTFLoader with the junction position,
// the junction tangent and a non-empty rotation_limits_deg. It also asserts
// the exporter's pivot_marker sphere is found, still in the tree, and hidden
// by default, and that its toggle shows and re-hides it.
//
// Verified falsifiable — each of these turns it red, on the check that names
// the behaviour: not adding gltf.scene to the scene, disabling OrbitControls,
// looking for a pivot node that does not exist, removing every light, and
// stripping `extras` from the bundle at generation time, leaving the marker
// visible, and REMOVING the marker from the tree instead of hiding it.
//
// The POSE assertions are measured against mesh state and rendered pixels, not
// against the control that was just written: a slider that moves a read-out and
// nothing else passes none of them.
//
// ===================== BUNDLE SWAP ==========================================
// The runtime loader (file input AND drag-and-drop) is exercised against a
// SECOND bundle, generated on the fly (via GLTFExporter, in-page) from the
// same real stem+bloom mesh as the default but with the pivot moved and a
// DIFFERENT rotation_limits_deg — so a swap onto it is distinguishable from a
// no-op reload of identical numbers, while still having a real stem so the
// pose machinery (rig, leaves, handles) can be asserted exactly as above.
// Nothing here is a synthesized state hook: the file-input path is driven
// through Playwright's real `setInputFiles`, and drag-and-drop through a real
// `File`/`DataTransfer` and dispatched `DragEvent`s — the actual browser
// mechanism, not window.__printScaffold pretending a file arrived.
//
// It also asserts the two failure modes the session's brief calls out by
// name: bytes that are not valid glTF at all (a raw byte soup — measured to
// throw SYNCHRONOUSLY out of GLTFLoader.parse() rather than reach onError,
// which is exactly the "unhandled error" this gate must prove does not reach
// the page), and a well-formed glTF with no `pivot` node. Both must fail
// VISIBLY in the debug panel and leave the CURRENTLY DISPLAYED bundle and its
// pose untouched, never silently blank the viewport, and never throw an
// error Playwright's `pageerror` listener catches.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';

const ROOT = '/home/user/Portfolio-Site';
const OUT = process.argv[2] || '/tmp/print-shots';
mkdirSync(OUT, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.glb':'model/gltf-binary', '.json':'application/json', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.png':'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, p);
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';   // Netlify clean URL
  if (!existsSync(f) || !readFileSync) { res.writeHead(404); return res.end('nf'); }
  try {
    const body = readFileSync(f);
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

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

// hit the CLEAN url, no .html
await page.goto(`${base}/print`, { waitUntil: 'load' });
try {
  await page.waitForFunction('window.__printScaffold', { timeout: 20000 });
} catch (e) {
  console.log('page errors:', errs);
  console.log('console:', logs.join('\n'));
  console.log('debug panel:', await page.textContent('#print-debug').catch(() => '(none)'));
  throw e;
}
const ready = await page.evaluate(() => window.__printScaffold.ready);
if (!ready) {
  console.log('scaffold reported not ready:', await page.evaluate(() => window.__printScaffold));
  console.log('page errors:', errs);
  console.log('console:', logs.join('\n'));
  process.exit(1);
}

const info = await page.evaluate(() => ({ ...window.__printScaffold, cameraPosition: window.__printScaffold.cameraPosition() }));
console.log('scaffold:', JSON.stringify(info, null, 2));
console.log('debug panel:\n' + await page.textContent('#print-log'));

// The pivot_marker is the exporter's diagnostic sphere, hidden by default.
// Asserted as three separate facts, because "not on screen" has more than one
// cause and only one of them is the intended one: the node is FOUND, it is
// still IN THE TREE (hidden, not removed — so the node count and the extras
// keep describing the bundle as shipped), and it is NOT VISIBLE.
const markerFound = info.markerFound;
const markerInTree = await page.evaluate(() => window.__printScaffold.markerInTree());
const hiddenByDefault = !(await page.evaluate(() => window.__printScaffold.markerVisible()));
console.log(`pivot marker: found=${markerFound} inTree=${markerInTree} hiddenByDefault=${hiddenByDefault}`);

// and the toggle brings it back, in BOTH directions. Offered is checked
// FIRST: a hidden toggle makes page.check() sit there for its full timeout,
// which is a slow, unnamed failure rather than a stated one.
const toggleOffered = !(await page.locator('#print-marker-toggle').isHidden());
if (!toggleOffered) {
  console.log('marker toggle: offered=false — no visible toggle to drive');
  console.log('\nFAIL');
  await browser.close(); server.close();
  process.exit(1);
}
await page.check('#showPivotMarker');
const shownAfterCheck = await page.evaluate(() => window.__printScaffold.markerVisible());
await page.uncheck('#showPivotMarker');
const hiddenAfterUncheck = !(await page.evaluate(() => window.__printScaffold.markerVisible()));
console.log(`marker toggle: offered=${toggleOffered} shows=${shownAfterCheck} re-hides=${hiddenAfterUncheck}`);

await page.screenshot({ path: path.join(OUT, '01-loaded.png') });

// pixel sanity, measured from the SCREENSHOT BYTES rather than readPixels:
// the WebGL context has no preserveDrawingBuffer, so a readPixels after the
// frame returns a cleared buffer and would score 100% "non-background" for a
// completely empty scene. The screenshot is what the eye sees.
function inkFraction(png) {
  const { width, height, data } = decodePNG(png);
  const channels = 4;
  let n = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2];
    // the page background is #0c0e0e; the debug panel sits over it, so ignore
    // the top-left block where the panel is drawn
    const x = i % width, y = (i / width) | 0;
    if (x < 520 && y < 340) continue;
    if (Math.abs(r - 12) > 14 || Math.abs(g - 14) > 14 || Math.abs(b - 14) > 14) n++;
  }
  return n / (width * height);
}
const drawn = inkFraction(readFileSync(path.join(OUT, '01-loaded.png')));
console.log('lit pixel fraction (outside debug panel):', drawn.toFixed(4));

// orbit: drag across the canvas, camera must move
const before = await page.evaluate(() => window.__printScaffold.cameraPosition());
const box = await page.locator('#print-canvas').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2 + i * 22, box.y + box.height / 2 + i * 4);
await page.mouse.up();
await page.waitForTimeout(600);
const after = await page.evaluate(() => window.__printScaffold.cameraPosition());
const moved = Math.hypot(after[0]-before[0], after[1]-before[1], after[2]-before[2]);
console.log('camera before:', before.map(n=>n.toFixed(1)).join(', '));
console.log('camera after :', after.map(n=>n.toFixed(1)).join(', '));
console.log('camera moved by:', moved.toFixed(2));
await page.screenshot({ path: path.join(OUT, '02-orbited.png') });

// ===================== POSE =============================================
// Every claim below is measured against MESH STATE or a rendered pixel, never
// against the control value that was just written — a slider that updates a
// read-out and nothing else would otherwise pass everything here.

const S = () => page.evaluate(() => window.__printScaffold);
const call = (expr) => page.evaluate(expr);

const hasRig = await call(() => window.__printScaffold.hasRig);
const stemVerts = await call(() => window.__printScaffold.stemVertexCount);
const cleanSlabs = await call(() => window.__printScaffold.axisCleanSlabs);
const leafVerts0 = await call(() => window.__printScaffold.leafVertexCount());
console.log(`\nstem rig: present=${hasRig} verts=${stemVerts} axisCleanSlabs=${cleanSlabs} leafVerts=${leafVerts0}`);

// The rest pose must be identity to within one float32 ULP.
const axisOff = await call(() => window.__printScaffold.axisOffsets());
const axisOnStem = axisOff.every(v => v !== null && v < 3);
console.log(`axis fit: control-point offsets (x core radius) = [${axisOff.map(v => v === null ? 'null' : v.toFixed(2))}] onStem=${axisOnStem}`);
const restUlps = await call(() => window.__printScaffold.restResidualUlps());
const restsClean = await call(() => window.__printScaffold.isRest());
console.log(`rest pose: isRest=${restsClean} residual=${restUlps.toFixed(3)} float32 ULP`);

// --- dragging a bend point moves the MESH, not just the handle ------------
const bbBefore = await call(() => window.__printScaffold.stemBBox());
const vtxBefore = await call(() => window.__printScaffold.stemVertex(7000));
const [hx, hy] = await call(() => window.__printScaffold.handleScreenPos(2));
await page.mouse.move(hx, hy);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(hx + i * 6, hy);
await page.mouse.up();
await page.waitForTimeout(300);
const bendPts = await call(() => window.__printScaffold.bendPoints());
const bbAfter = await call(() => window.__printScaffold.stemBBox());
const vtxAfter = await call(() => window.__printScaffold.stemVertex(7000));
const nowBent = !(await call(() => window.__printScaffold.isRest()));
const vtxMoved = Math.hypot(vtxAfter[0]-vtxBefore[0], vtxAfter[1]-vtxBefore[1], vtxAfter[2]-vtxBefore[2]);
const bboxMoved = Math.abs(bbAfter[1][0] - bbBefore[1][0]) + Math.abs(bbAfter[0][0] - bbBefore[0][0]);
// the root must NOT have moved — it is the anchor
const rootFixed = bendPts[0][0] === (await call(() => window.__printScaffold.bendPoints()))[0][0];
const rootAtRest = Math.hypot(...bendPts[0]) > 0 && bendPts[0][1] < bendPts[3][1];
console.log(`bend drag: bent=${nowBent} vertexMoved=${vtxMoved.toFixed(2)} bboxMoved=${bboxMoved.toFixed(2)}`);

// the leaves must SURVIVE the bend — this is the whole reason for not re-lofting
const leafVerts1 = await call(() => window.__printScaffold.leafVertexCount());
const stemVerts1 = await call(() => window.__printScaffold.stemVertexCount);
console.log(`leaves after bend: leafVerts=${leafVerts1} (was ${leafVerts0}), stemVerts=${stemVerts1} (was ${stemVerts})`);
await page.screenshot({ path: path.join(OUT, '03-bent.png') });

// --- the anchored root cannot be dragged ---------------------------------
const rootBefore = (await call(() => window.__printScaffold.bendPoints()))[0];
const [rx, ry] = await call(() => window.__printScaffold.handleScreenPos(0));
await page.mouse.move(rx, ry);
await page.mouse.down();
for (let i = 1; i <= 8; i++) await page.mouse.move(rx + i * 8, ry - i * 3);
await page.mouse.up();
await page.waitForTimeout(200);
const rootAfter = (await call(() => window.__printScaffold.bendPoints()))[0];
const rootHeldByPicking = rootBefore.every((v, i) => v === rootAfter[i]);
// ...and again past the pointer handler, straight at the rig. The pick filter
// and the rig guard are two separate anchors; dragging only ever exercises the
// first, so removing the second passed this check until forceRootMove existed.
const rootMovedByModel = await call(() => window.__printScaffold.forceRootMove());
const rootAfterForce = (await call(() => window.__printScaffold.bendPoints()))[0];
const rootHeldByRig = !rootMovedByModel && rootBefore.every((v, i) => v === rootAfterForce[i]);
console.log(`anchored root: heldAgainstDrag=${rootHeldByPicking} heldAgainstModel=${rootHeldByRig}`);

// --- hinge sliders rotate the BLOOM and stay inside the bundle's limits ---
const limitsFromBundle = await call(() => window.__printScaffold.limitsFromBundle());
const lim = await call(() => window.__printScaffold.limits());
// Not just "limits exist" — the slider bounds must EQUAL the bundle's own
// numbers. A hardcoded [0,45]/[-30,30] would satisfy a mere existence check
// and silently ignore a re-tuned export.
const declared = (await S()).pivotExtras.rotation_limits_deg;
const limitsMatchBundle =
  JSON.stringify(lim.droop) === JSON.stringify(declared.droop) &&
  JSON.stringify(lim.twist) === JSON.stringify(declared.twist);
console.log(`hinge limits: sliders ${JSON.stringify(lim)} vs bundle ${JSON.stringify(declared)} -> match=${limitsMatchBundle}`);
const qRest = await call(() => window.__printScaffold.bloomQuaternion());
const cRest = await call(() => window.__printScaffold.bloomWorldCentroid());
await call(() => window.__printScaffold.setDroop(30));
await page.waitForTimeout(150);
const qDroop = await call(() => window.__printScaffold.bloomQuaternion());
const cDroop = await call(() => window.__printScaffold.bloomWorldCentroid());
const droopVal = await call(() => window.__printScaffold.droop());
await call(() => window.__printScaffold.setTwist(-20));
await page.waitForTimeout(150);
const qTwist = await call(() => window.__printScaffold.bloomQuaternion());
const twistVal = await call(() => window.__printScaffold.twist());
await page.screenshot({ path: path.join(OUT, '04-hinged.png') });

const qDist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3]);
const bloomMovedByDroop = Math.hypot(cDroop[0]-cRest[0], cDroop[1]-cRest[1], cDroop[2]-cRest[2]);
const droopTurned = qDist(qDroop, qRest) > 1e-3;
const twistTurned = qDist(qTwist, qDroop) > 1e-3;
console.log(`hinge: limitsFromBundle=${limitsFromBundle} droop=${lim.droop} twist=${lim.twist}`);
console.log(`       droop30 -> ${droopVal}, quat moved=${droopTurned}, bloom centroid moved ${bloomMovedByDroop.toFixed(2)}`);
console.log(`       twist-20 -> ${twistVal}, quat moved=${twistTurned}`);

// Over-range writes must be refused BY THE MODEL. Going through the slider
// proves nothing: an <input max=45> given "500" reads back "45" before any of
// the page's code runs, so a build with no clamp at all passed this check
// until it was driven through forcePose instead. Both paths are kept — the
// widget path is what a user touches, the model path is what is under test.
await call(() => window.__printScaffold.setDroop(500));
await call(() => window.__printScaffold.setTwist(-999));
const droopOverWidget = await call(() => window.__printScaffold.droop());
const twistOverWidget = await call(() => window.__printScaffold.twist());
await call(() => window.__printScaffold.forcePose(500, -999));
const droopOver = await call(() => window.__printScaffold.droop());
const twistOver = await call(() => window.__printScaffold.twist());
await call(() => window.__printScaffold.forcePose(-500, 999));
const droopUnder = await call(() => window.__printScaffold.droop());
const twistUnder = await call(() => window.__printScaffold.twist());
const inRange = (v, r) => v >= r[0] && v <= r[1];
const clamped = inRange(droopOverWidget, lim.droop) && inRange(twistOverWidget, lim.twist)
             && inRange(droopOver, lim.droop) && inRange(twistOver, lim.twist)
             && inRange(droopUnder, lim.droop) && inRange(twistUnder, lim.twist);
console.log(`       out-of-range via widget -> ${droopOverWidget}/${twistOverWidget}`);
console.log(`       out-of-range via model  -> ${droopOver}/${twistOver} and ${droopUnder}/${twistUnder} -> ${clamped}`);
await call(() => { window.__printScaffold.setDroop(30); window.__printScaffold.setTwist(-20); });
await page.waitForTimeout(150);

// --- pose SURVIVES a camera orbit ----------------------------------------
const poseBeforeOrbit = await call(() => window.__printScaffold.bendPoints());
const dBefore = await call(() => window.__printScaffold.droop());
const tBefore = await call(() => window.__printScaffold.twist());
const camBefore = await call(() => window.__printScaffold.cameraPosition());
const cbox = await page.locator('#print-canvas').boundingBox();
await page.mouse.move(cbox.x + cbox.width * 0.75, cbox.y + cbox.height * 0.75);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(cbox.x + cbox.width * 0.75 - i * 16, cbox.y + cbox.height * 0.75 - i * 4);
await page.mouse.up();
await page.waitForTimeout(400);
const poseAfterOrbit = await call(() => window.__printScaffold.bendPoints());
const dAfter = await call(() => window.__printScaffold.droop());
const tAfter = await call(() => window.__printScaffold.twist());
const camAfter = await call(() => window.__printScaffold.cameraPosition());
const camReallyMoved = Math.hypot(camAfter[0]-camBefore[0], camAfter[1]-camBefore[1], camAfter[2]-camBefore[2]);
const poseHeld = JSON.stringify(poseBeforeOrbit) === JSON.stringify(poseAfterOrbit)
              && dBefore === dAfter && tBefore === tAfter;
console.log(`orbit over pose: camera moved ${camReallyMoved.toFixed(1)}, pose held=${poseHeld}`);
await page.screenshot({ path: path.join(OUT, '05-posed-orbited.png') });

// --- the panel REFLECTS the pose, read back from the DOM -----------------
const poseTxt = await call(() => window.__printScaffold.poseText());
const panelShowsBend = /BENT/.test(poseTxt);
const panelShowsDroop = new RegExp(`droop\\s+${dAfter.toFixed(1)}`).test(poseTxt);
const panelShowsTwist = new RegExp(`twist\\s+${tAfter.toFixed(1)}`).test(poseTxt);
const panelShowsDelta = /\u0394 \[/.test(poseTxt) && !/^\s*\u0394 \[0, 0, 0\]/m.test(poseTxt.split('mid2')[1] || '');
console.log(`panel: bent=${panelShowsBend} droop=${panelShowsDroop} twist=${panelShowsTwist}`);
console.log('pose panel:\n' + poseTxt);

const poseOK = hasRig && stemVerts > 0 && cleanSlabs >= 4 && restUlps <= 1 && axisOnStem
  && nowBent && vtxMoved > 0.5 && bboxMoved > 0.5
  && leafVerts1 === leafVerts0 && leafVerts0 > 0 && stemVerts1 === stemVerts
  && rootHeldByPicking && rootHeldByRig
  && limitsFromBundle && limitsMatchBundle && droopTurned && twistTurned && bloomMovedByDroop > 0.5 && clamped
  && camReallyMoved > 1 && poseHeld
  && panelShowsBend && panelShowsDroop && panelShowsTwist;

// ===================== BUNDLE SWAP =========================================
console.log('\n--- bundle swap: generating a second bundle in-page (GLTFExporter) ---');
const secondB64 = await page.evaluate(async () => {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const gltf = await new Promise((res, rej) =>
    new GLTFLoader().load(location.origin + '/assets/print-test/flower-test-bundle.glb', res, undefined, rej));
  const root = gltf.scene;
  let pivot = null;
  root.traverse(o => { if ((o.name || '').toLowerCase() === 'pivot') pivot = o; });
  if (!pivot) throw new Error('source bundle has no exact "pivot" node to relocate');
  // A clearly DIFFERENT pivot position and rotation_limits_deg — a swap onto
  // this must not read back as though the first bundle were still active.
  // Kept modest (not e.g. +12 in X): a bigger shift moves the bloom enough to
  // change the re-framed camera's projection of the bend-point handles,
  // which can push one of them under the debug panel's on-screen footprint
  // and produce a drag that silently hits the panel instead of the canvas —
  // measured, and not what this section means to test.
  pivot.position.set(pivot.position.x + 6, pivot.position.y + 2, pivot.position.z - 3);
  pivot.userData = { ...pivot.userData,
    junction: { ...(pivot.userData.junction || {}), position: pivot.position.toArray() },
    rotation_limits_deg: { droop: [5, 20], twist: [-10, 10] } };
  const buf = await new Promise((res, rej) => new GLTFExporter().parse(root, res, rej, { binary: true }));
  const bytes = new Uint8Array(buf);
  let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
});
const secondBundleBuf = Buffer.from(secondB64, 'base64');
console.log(`second bundle: ${secondBundleBuf.length} bytes, pivot moved, rotation_limits_deg=[5,20]/[-10,10]`);

// --- swap via the FILE INPUT ----------------------------------------------
// The page is currently BENT and HINGED (droop 30 / twist -20, left that way
// by the pose section above) — the state a reset must actually overwrite,
// not a rest state a bug could pass by accident.
const beforeInput = { isRest: await call(() => window.__printScaffold.isRest()),
  droop: await call(() => window.__printScaffold.droop()), twist: await call(() => window.__printScaffold.twist()) };
console.log(`before file-input swap: isRest=${beforeInput.isRest} droop=${beforeInput.droop} twist=${beforeInput.twist}`);

await page.setInputFiles('#bundleFile', { name: 'second-test-bundle.glb', mimeType: 'model/gltf-binary', buffer: secondBundleBuf });
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.source === 'second-test-bundle.glb', { timeout: 15000 });

const afterInput = await page.evaluate(() => ({
  source: window.__printScaffold.source,
  isRest: window.__printScaffold.isRest(),
  droop: window.__printScaffold.droop(),
  twist: window.__printScaffold.twist(),
  limits: window.__printScaffold.limits(),
  limitsFromBundle: window.__printScaffold.limitsFromBundle(),
  hasRig: window.__printScaffold.hasRig,
  meshes: window.__printScaffold.meshes,
  leafVerts: window.__printScaffold.leafVertexCount(),
  pivotPos: window.__printScaffold.pivotExtras && window.__printScaffold.pivotExtras.junction.position,
  markerFound: window.__printScaffold.markerFound,
}));
const logAfterInput = await page.textContent('#print-log');
console.log('after file-input swap:', JSON.stringify(afterInput));

const inputSwapOK = afterInput.source === 'second-test-bundle.glb'
  && afterInput.isRest === true && afterInput.droop === 0 && afterInput.twist === 0
  && afterInput.limitsFromBundle === true
  && JSON.stringify(afterInput.limits) === JSON.stringify({ droop: [5, 20], twist: [-10, 10] })
  && afterInput.hasRig === true && afterInput.meshes >= 1 && afterInput.leafVerts > 0
  && afterInput.markerFound === true
  && Math.abs(afterInput.pivotPos[0] - 6.09) < 0.1
  && /second-test-bundle\.glb/.test(logAfterInput) && /\[5, 20\]/.test(logAfterInput);

// posing and orbiting the NEW bundle must still work — this is the same
// canvas-drag / slider machinery as the baseline checks above, now run a
// second time against the swapped-in geometry. Checked against the CANVAS,
// not assumed: the re-framed camera puts the handle at a different screen
// position than on the first bundle, and if that ever lands under the debug
// panel the drag would silently hit the panel instead — see the comment on
// the pivot offset above, which is what keeps this clear in practice.
const [ihx, ihy] = await call(() => window.__printScaffold.handleScreenPos(2));
const handle2OnCanvas = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  return !!el && el.id === 'print-canvas';
}, [ihx, ihy]);
if (!handle2OnCanvas) console.log(`  WARNING: handle2 at (${ihx.toFixed(0)}, ${ihy.toFixed(0)}) is not over the canvas — drag below will not reach it`);
await page.mouse.move(ihx, ihy); await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(ihx + i * 6, ihy);
await page.mouse.up(); await page.waitForTimeout(200);
const newBundleBends = handle2OnCanvas && !(await call(() => window.__printScaffold.isRest()));
await call(() => window.__printScaffold.forcePose(500, -999)); // out of range for [5,20]/[-10,10]
const newBundleClampsToOwnLimits = (await call(() => window.__printScaffold.droop())) === 20
  && (await call(() => window.__printScaffold.twist())) === -10;
const camBeforeNew = await call(() => window.__printScaffold.cameraPosition());
const nbox = await page.locator('#print-canvas').boundingBox();
await page.mouse.move(nbox.x + nbox.width / 2, nbox.y + nbox.height / 2);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(nbox.x + nbox.width / 2 + i * 18, nbox.y + nbox.height / 2 + i * 5);
await page.mouse.up(); await page.waitForTimeout(400);
const camAfterNew = await call(() => window.__printScaffold.cameraPosition());
const newBundleOrbits = Math.hypot(...camAfterNew.map((v, i) => v - camBeforeNew[i])) > 1;
console.log(`new bundle still posable: bends=${newBundleBends} clampsToOwnLimits=${newBundleClampsToOwnLimits} orbits=${newBundleOrbits}`);
await page.screenshot({ path: path.join(OUT, '06-swapped-file-input.png') });

// --- swap via DRAG-AND-DROP -------------------------------------------------
// Re-establish a non-rest pose (both the hinge AND a bend point this time),
// then drop the SAME bytes again through a REAL File/DataTransfer/DragEvent —
// proving the reset fires on ANY successful load, not only when the content
// happens to differ from what's already showing.
await call(() => { window.__printScaffold.setDroop(15); window.__printScaffold.setTwist(-8); });
const [dhx, dhy] = await call(() => window.__printScaffold.handleScreenPos(1));
await page.mouse.move(dhx, dhy); await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(dhx - i * 6, dhy);
await page.mouse.up(); await page.waitForTimeout(200);
const bentBeforeDrop = !(await call(() => window.__printScaffold.isRest()));

// the hint overlay must show WHILE dragging and hide again once it's gone,
// independent of whether the drop that follows succeeds
const hintHiddenIdle = await page.locator('#print-dropzone-hint').isHidden();
await page.evaluate((b64) => {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  window.__dropFile = new File([arr], 'dropped-bundle.glb', { type: 'model/gltf-binary' });
  window.__dt = new DataTransfer(); window.__dt.items.add(window.__dropFile);
  window.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
  window.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
}, secondB64);
const hintShownWhileDragging = !(await page.locator('#print-dropzone-hint').isHidden());
await page.evaluate(() => {
  window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
});
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.source === 'dropped-bundle.glb', { timeout: 15000 });
const hintHiddenAfterDrop = await page.locator('#print-dropzone-hint').isHidden();

const afterDrop = await page.evaluate(() => ({
  source: window.__printScaffold.source,
  isRest: window.__printScaffold.isRest(),
  droop: window.__printScaffold.droop(),
  twist: window.__printScaffold.twist(),
}));
console.log(`hint overlay: hiddenIdle=${hintHiddenIdle} shownWhileDragging=${hintShownWhileDragging} hiddenAfterDrop=${hintHiddenAfterDrop}`);
console.log(`before drop: bent=${bentBeforeDrop}; after drop:`, JSON.stringify(afterDrop));

const dropSwapOK = hintHiddenIdle && hintShownWhileDragging && hintHiddenAfterDrop
  && bentBeforeDrop === true
  && afterDrop.source === 'dropped-bundle.glb' && afterDrop.isRest === true
  && afterDrop.droop === 0 && afterDrop.twist === 0;
await page.screenshot({ path: path.join(OUT, '07-swapped-drop.png') });

// --- a file that is not valid glTF at all: fail VISIBLY, change NOTHING ----
// Posed first (non-rest droop/twist), so "untouched" is a real claim rather
// than a coincidence of the current bundle already being at rest.
await call(() => { window.__printScaffold.setDroop(12); window.__printScaffold.setTwist(-5); });
const sourceBeforeBad = await call(() => window.__printScaffold.source);
const poseBeforeBad = { isRest: await call(() => window.__printScaffold.isRest()),
  droop: await call(() => window.__printScaffold.droop()), twist: await call(() => window.__printScaffold.twist()) };
const errsBeforeBad = errs.length;
await page.evaluate(() => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // not JSON, not GLB magic
  const file = new File([bytes], 'garbage.glb', { type: 'model/gltf-binary' });
  const dt = new DataTransfer(); dt.items.add(file);
  window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
});
await page.waitForTimeout(400); // file.arrayBuffer() + parse are async
const sourceAfterBad = await call(() => window.__printScaffold.source);
const lastLoadErrorBad = await call(() => window.__printScaffold.lastLoadError);
const logAfterBad = await page.textContent('#print-log');
const poseAfterBad = { isRest: await call(() => window.__printScaffold.isRest()),
  droop: await call(() => window.__printScaffold.droop()), twist: await call(() => window.__printScaffold.twist()) };
console.log(`invalid file: sceneUnchanged=${sourceAfterBad === sourceBeforeBad} lastLoadError="${lastLoadErrorBad}" newPageErrors=${errs.length - errsBeforeBad}`);
console.log(`             poseBefore=${JSON.stringify(poseBeforeBad)} poseAfter=${JSON.stringify(poseAfterBad)}`);

const invalidFileOK = sourceAfterBad === sourceBeforeBad          // scene NOT swapped
  && typeof lastLoadErrorBad === 'string' && /garbage\.glb/.test(lastLoadErrorBad)
  && /failed to load .garbage\.glb./.test(logAfterBad)
  && /dropped-bundle\.glb/.test(logAfterBad)                       // prior bundle's info still shown, not wiped
  && JSON.stringify(poseAfterBad) === JSON.stringify(poseBeforeBad) // prior pose byte-for-byte untouched
  && errs.length === errsBeforeBad;                                // no unhandled page error

// --- a valid glTF with no pivot node: fail VISIBLY, still show what loaded -
await page.evaluate(() => {
  const json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'root' }] });
  const file = new File([new TextEncoder().encode(json)], 'no-pivot.glb', { type: 'model/gltf-binary' });
  const dt = new DataTransfer(); dt.items.add(file);
  window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
});
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.source === 'no-pivot.glb', { timeout: 15000 });
const noPivotExtras = await call(() => window.__printScaffold.pivotExtras);
const noPivotPoseHidden = await page.locator('#print-pose').isHidden();
const noPivotMeshes = await call(() => window.__printScaffold.meshes);
const logAfterNoPivot = await page.textContent('#print-log');
console.log(`no-pivot file: swapped=true extras=${JSON.stringify(noPivotExtras)} poseHidden=${noPivotPoseHidden} meshes=${noPivotMeshes}`);

const noPivotOK = noPivotExtras === null && noPivotPoseHidden === true && noPivotMeshes === 0
  && /pivot\s+NOT FOUND/.test(logAfterNoPivot) && errs.length === errsBeforeBad;
await page.screenshot({ path: path.join(OUT, '08-no-pivot-file.png') });

// --- recovery: a good drop after a bad one must still work -----------------
const defaultBundleBuf = readFileSync(path.join(ROOT, 'assets/print-test/flower-test-bundle.glb'));
await page.setInputFiles('#bundleFile', { name: 'flower-test-bundle.glb', mimeType: 'model/gltf-binary', buffer: defaultBundleBuf });
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.source === 'flower-test-bundle.glb', { timeout: 15000 });
const recovered = await page.evaluate(() => ({
  hasRig: window.__printScaffold.hasRig, meshes: window.__printScaffold.meshes,
  pivotFound: !!window.__printScaffold.pivotExtras, isRest: window.__printScaffold.isRest(),
}));
console.log('recovery after bad drops:', JSON.stringify(recovered));
const recoveryOK = recovered.hasRig && recovered.meshes >= 1 && recovered.pivotFound && recovered.isRest === true;
await page.screenshot({ path: path.join(OUT, '09-recovered.png') });

const swapOK = inputSwapOK && newBundleBends && newBundleClampsToOwnLimits && newBundleOrbits
  && dropSwapOK && invalidFileOK && noPivotOK && recoveryOK;
console.log(`\nbundle swap summary: fileInput=${inputSwapOK} stillPosable=${newBundleBends} clampsToOwnLimits=${newBundleClampsToOwnLimits} stillOrbits=${newBundleOrbits} drop=${dropSwapOK} invalidFileHandled=${invalidFileOK} noPivotHandled=${noPivotOK} recovers=${recoveryOK}`);

console.log('\npage errors:', errs.length ? errs : 'none');
console.log('console:\n' + logs.join('\n'));
await browser.close(); server.close();

const ok = info.ready && info.meshes >= 1 && info.pivotExtras
  && info.pivotExtras.junction && Array.isArray(info.pivotExtras.junction.position)
  && Array.isArray(info.pivotExtras.junction.tangent) && info.pivotExtras.rotation_limits_deg
  && Object.keys(info.pivotExtras.rotation_limits_deg).length > 0
  && drawn > 0.01 && drawn < 0.9 && moved > 1
  && markerFound && markerInTree && hiddenByDefault
  && toggleOffered && shownAfterCheck && hiddenAfterUncheck
  && poseOK && swapOK && errs.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
