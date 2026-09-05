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
  && poseOK && errs.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
