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
// BUNDLE SWAP. The runtime loader (file input AND drag-and-drop) is exercised against a
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
    // The line this edits MOVED when the weight went two-tier, and the sweep
    // said so rather than reporting a green mutant: "mutation did not apply".
    // That guard is the reason a stale mutant cannot quietly stop testing.
    from: 'tier.mat.linewidth = tier.kind === 1 ? this.contourWeight : this.interiorWeight;',
    to: 'tier.mat.linewidth = tier.kind === 1 ? 2.2 : 2.2 * INTERIOR_WEIGHT_RATIO;',
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
    // ...and the interior tier cannot track a slider that does nothing.
    breaks: ['detail/creases-grow', 'detail/pixels', 'detail/readout',
             'tier/interior-tracks-detail'] },

  { id: 'detail-moves-silhouette', file: 'print-lines.js',
    from: '      } else if (a !== facing[f1]) {\n        kind = 1;                                          // silhouette',
    to: '      } else if (a !== facing[f1] && D[e] < creaseCos * 0.999) {\n        kind = 1;                                          // silhouette',
    // It also breaks the smoothing comparison, and legitimately: decimating
    // the silhouette set leaves fragments rather than chains, and smoothing a
    // fragment cannot do much (measured under the mutant: 53.3 -> 52.4 deg,
    // against 44.0 -> 31.1 on the real code).
    // It also makes the CONTOUR track detail (measured: 64% drift), which is
    // the half of tier/interior-tracks-detail that says only the interior may.
    breaks: ['detail/silhouette-held', 'smooth/contour-is-not-faceted',
             'tier/interior-tracks-detail'] },

  { id: 'no-weld', file: 'print-lines.js',
    from: '      const k = `${Math.round(pos.getX(i) * inv)},${Math.round(pos.getY(i) * inv)},${Math.round(pos.getZ(i) * inv)}`;',
    to: '      const k = `v${i}`;',
    // Every edge becomes a boundary edge, so: no creases at all (the interior
    // tier is empty), every "chain" is one edge long (no interior points, so
    // no turn joins to measure), and what survives curation barely marks the
    // page. Measured under the mutant: 24,789 one-edge contour chains, 0
    // interior, ink 0.0014. All claimed rather than explained away.
    breaks: ['topology/welded', 'lineart/draws-something', 'weight/pixels',
             'detail/creases-grow', 'detail/pixels', 'chain/both-tiers-populated',
             'smooth/contour-is-not-faceted', 'tier/interior-tracks-detail'] },

  { id: 'dots-never-drawn', file: 'print-lines.js',
    // moved when the stroke/dot partition went per CHAIN instead of per edge
    from: '      if (hash01(chainV[s0]) >= blend) {', to: '      if (true) {',
    breaks: ['blend/dots-at-100', 'blend/mixed', 'blend/pixels'] },

  { id: 'dots-are-a-second-extraction', file: 'print-lines.js',
    from: '      u.ex.extract(camLocal, creaseCos);',
    to: '      u.ex.extract(camLocal, Math.cos(THREE.MathUtils.degToRad(this.creaseAngleDeg * (1 - this.blend / 200))));',
    breaks: ['blend/same-extraction'] },

  { id: 'smoothing-off', file: 'print-lines.js',
    from: '  smoothIters: 6,', to: '  smoothIters: 0,',
    breaks: ['smooth/contour-is-not-faceted'] },

  { id: 'simplify-off', file: 'print-lines.js',
    from: '  simplifyPx: 1.1,', to: '  simplifyPx: 0,',
    breaks: ['simplify/reduces-points'] },

  { id: 'curation-off', file: 'print-lines.js',
    from: '  minChainPx: 5,      // a chain shorter than this on screen is noise, not line\n  minCreasePx: 16,',
    to: '  minChainPx: 0,\n  minCreasePx: 0,',
    // NOT curate/prunes-by-length: that check drives curation itself, so it
    // passes whatever the default is. Measured — zeroing the bar left it green.
    breaks: ['curate/default-prunes-something'] },

  { id: 'interior-same-weight-as-contour', file: 'print-lines.js',
    from: 'get interiorWeight() { return this.weight * INTERIOR_WEIGHT_RATIO; }',
    to: 'get interiorWeight() { return this.weight; }',
    breaks: ['weight/material', 'tier/two-weights'] },

  // Both tiers chained from the SILHOUETTE set. The interior tier then draws
  // contour chains, so it stops tracking the detail slider — which is the only
  // thing that sees it. TWO earlier attempts at this mutation were wrong and
  // the sweep said so: the first edited one of five `wantKind` tests and
  // changed almost nothing (green everywhere); the second passed a SPREAD COPY
  // of the tier, so the stats were written to the copy and the page drew
  // nothing at all — a broken page pretending to be a negative control, which
  // is exactly what the "unclaimed check went red" rule exists to catch.
  { id: 'tiers-chained-together', file: 'print-lines.js',
    from: '    ex.buildChains(tier.kind);',
    to: '    ex.buildChains(1);',
    // ...and the detail slider stops adding ink, because it no longer adds
    // interior lines to a tier that is drawing the silhouette (measured:
    // 1.02x, against 1.10 required).
    breaks: ['tier/interior-tracks-detail', 'detail/pixels'] },

  // A camera move never recomputes. NOT skip/idle-is-free: a pose change bumps
  // the geometry version, which fails the guard before this line is reached,
  // so that check still sees its un-skip. Measured, and the claim corrected.
  { id: 'skip-never-recomputes', file: 'print-lines.js',
    from: '      if (movedPx < 0.05) { this.skipped = true; this.skippedPx = movedPx; return this.stats; }',
    to: '      { this.skipped = true; this.skippedPx = movedPx; return this.stats; }',
    breaks: ['live/orbit-moves-silhouette', 'pose/lines-follow-bend'] },

  // ...and the other direction, which is what actually negative-controls the
  // skip: it never fires, so two identical updates both recompute.
  { id: 'skip-always-recomputes', file: 'print-lines.js',
    from: '      if (movedPx < 0.05) { this.skipped = true;',
    to: '      if (movedPx < -1) { this.skipped = true;',
    breaks: ['skip/idle-is-free'] },

  { id: 'stylize-resets-pose', file: 'print.js',
    // readStyle() is now wired up ONCE at module scope (a bundle swap reuses
    // it rather than redefining it per load), so its body is at 0-indent with
    // an `if (!art) return;` guard the single-bundle version never needed —
    // the string this mutation matches moved for that reason, not a rewrite
    // of the claim it tests.
    from: 'function readStyle() {\n  if (!art) return;\n  art.setOptions({',
    to: 'function readStyle() {\n  if (!art) return;\n  if (rig) { rig.resetPose(); repose(); }\n  art.setOptions({',
    breaks: ['independence/pose-survives-sliders'] },

  { id: 'stylize-freezes-pose-controls', file: 'print.js',
    // Same reason as above: the drag handlers are hoisted to module scope
    // (0-indent) instead of living inside the per-bundle load callback.
    from: 'canvas.addEventListener(\'pointerdown\', (ev) => {\n  if (!rig) return;',
    to: 'canvas.addEventListener(\'pointerdown\', (ev) => {\n  if (!rig || (art && art.enabled)) return;',
    breaks: ['stylized/bend-drag-still-works', 'pose/lines-follow-bend',
             'pose/panel-reflects-state'] },

  { id: 'lines-frozen-after-first-frame', file: 'print.js',
    from: '    frameStats = art.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());',
    to: '    frameStats = frameStats || art.update(camera, [canvas.clientWidth, canvas.clientHeight], renderer.getPixelRatio());',
    // Nothing responds to anything, so the curation and smoothing checks —
    // which drive a parameter and look for a change — go red too. All of it
    // measured, none of it explained away.
    breaks: ['live/orbit-moves-silhouette', 'weight/material', 'weight/pixels',
             'detail/creases-grow', 'detail/pixels', 'detail/readout',
             'blend/dots-at-100', 'blend/mixed', 'blend/pixels',
             'smooth/contour-is-not-faceted', 'curate/prunes-by-length',
             'curate/prunes-the-drawing', 'tier/interior-tracks-detail'] },
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
  // The two fixed COLUMNS, not the individual panels inside them: the left
  // column holds LOAD BUNDLE and BUNDLE as separate boxes now, so measuring
  // '#print-debug' alone leaves the other one's chrome counted as ink — which
  // is the stale-rectangle failure this comment already warns about, and it
  // duly happened. A missing selector is a hard failure rather than a silently
  // skipped exclusion, for the same reason.
  const panels = [];
  for (const sel of ['#print-left', '#print-side']) {
    const b = await page.locator(sel).boundingBox();
    if (!b) { check('harness/panel-rect-' + sel, false, 'selector matched nothing — ink would count chrome'); }
    else panels.push(b);
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

  // --- the panels are ALWAYS present, and each collapses on its own --------
  // The old contract showed POSE and STYLIZE only once a bundle had produced
  // a rig / a drawable mesh, so "the panel is missing" and "the stage is
  // broken" looked identical. Now the panel is on screen from the first paint
  // and reports its own emptiness. `hidden` is asserted on the ELEMENT, not
  // inferred from a screenshot, because a panel scrolled out of the column
  // would read as absent either way.
  const panelIds = ['print-debug', 'print-pose', 'print-stylize'];
  const panelsPresent = [];
  for (const id of panelIds) panelsPresent.push(!(await page.locator('#' + id).isHidden()));
  check('panel/all-present', panelsPresent.every(Boolean),
    panelIds.map((id, i) => `${id}=${panelsPresent[i]}`).join(' '));
  check('panel/all-are-details',
    await page.evaluate(ids => ids.every(id => document.getElementById(id).tagName === 'DETAILS'), panelIds),
    'native <details>, so no JS owns open/closed');

  // Collapsing one must not collapse or hide the others.
  await page.click('#print-stylize > summary');
  const afterCollapse = await page.evaluate(ids => ids.map(id => ({
    id, open: document.getElementById(id).open,
    present: !document.getElementById(id).hidden,
  })), panelIds);
  check('panel/collapse-is-individual',
    afterCollapse.find(p => p.id === 'print-stylize').open === false
      && afterCollapse.filter(p => p.id !== 'print-stylize').every(p => p.open && p.present),
    JSON.stringify(afterCollapse));

  // THE TRAP THE CARDS PANEL ALREADY SHIPPED ONCE: a control inside a
  // COLLAPSED section must still read, write and rebuild. Driven through the
  // widget while STYLIZE is shut, and measured on the extracted segment set —
  // not on the read-out, which is inside the collapsed section and would
  // agree with itself.
  const collapsedBefore = await call(() => window.__printLineArt.stats());
  await call(() => window.__printLineArt.setDetailWidget(88));
  await page.waitForTimeout(260);
  const collapsedAfter = await call(() => window.__printLineArt.stats());
  const collapsedStillShut = await page.evaluate(() => !document.getElementById('print-stylize').open);
  check('panel/control-works-while-collapsed',
    collapsedStillShut && collapsedBefore && collapsedAfter
      && collapsedBefore.crease !== collapsedAfter.crease,
    `shut=${collapsedStillShut} crease ${collapsedBefore && collapsedBefore.crease} -> ${collapsedAfter && collapsedAfter.crease}`);
  await page.click('#print-stylize > summary');       // leave it open for what follows
  await call(() => window.__printLineArt.setDetailWidget(45));
  await page.waitForTimeout(260);
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
  // THE DRAG MUST START ON BARE CANVAS. At 0.75 of the width this landed
  // INSIDE the right-hand panel — on a slider — so the pointerdown was
  // captured by the panel and the canvas never saw the drag. Everything still
  // looked green: "camera moved 21.2" was OrbitControls' damping still easing
  // from the previous orbit, not this one, and the reported orbit was never
  // performed at all. It surfaced only because a mutant that resets the pose
  // from a style slider then reddened THIS check instead of the independence
  // check that names it. Start in the gap between the two panels, and demand
  // a movement only a real orbit produces.
  const gapX = Math.max(...panels.map(p => p.x)) - 40;   // just left of the side panel
  const gapY = Math.max(...panels.map(p => p.y + p.height)) + 20;
  const cbox = await page.locator('#print-canvas').boundingBox();
  const ox = Math.min(Math.max(gapX, cbox.x + 40), cbox.x + cbox.width - 40);
  const oy = Math.min(gapY, cbox.y + cbox.height - 40);
  await page.mouse.move(ox, oy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(ox - i * 16, oy - i * 4);
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
  // > 100, not > 1. Damping alone drifts ~21 units in this window, so a bar of
  // 1 was met by a drag that never reached the canvas.
  check('live/orbit-moves-silhouette', camMoved > 100 && silBefore !== silAfter,
    `camera moved ${camMoved.toFixed(1)} from (${ox.toFixed(0)}, ${oy.toFixed(0)}); silhouette ${silBefore} -> ${silAfter}`);
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
  // Per TIER: [contour, interior] for each mesh. The contour carries the
  // slider, the interior carries the fixed ratio, and BOTH have to move —
  // a build that scaled only the contour would still pass a "weight changed"
  // check that looked at one number.
  const ratio = (await call(() => window.__printLineArt.curation())).interiorWeightRatio;
  const tiersOK = (mats, w) => mats.every(m => Math.abs(m[0] - w) < 1e-6 && Math.abs(m[1] - w * ratio) < 1e-6);
  check('weight/material', tiersOK(thinMat, 1.0) && tiersOK(fatMat, 5.0),
    `${JSON.stringify(thinMat)} -> ${JSON.stringify(fatMat)} (ratio ${ratio})`);
  check('tier/two-weights',
    thinMat.every(m => m[1] < m[0]) && fatMat.every(m => m[1] < m[0]) && ratio > 0 && ratio < 1,
    `interior is ${ratio} of contour, on every mesh and at both ends of the slider`);
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
  // NOT `strokes === segments` any more. That held when one raw edge was one
  // drawn segment; chaining, curation and resampling all legitimately move
  // that number, so the structural claim is what is asserted instead: at
  // blend 0 everything is drawn as strokes and nothing as dots.
  check('blend/strokes-at-0', b0.strokes > 0 && b0.dots === 0,
    `${b0.strokes} stroke segs / ${b0.dots} dots (from ${b0.segments} raw edges)`);
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

  // -- chain / curate / smooth --------------------------------------------
  // The claims here are SHAPE and STRUCTURE, never a segment count: curation
  // parameters legitimately move every count in this section, which is the
  // whole reason the assertions are written this way.
  await setStyle({ detail: 45, weight: 2.4, blend: 0 }); await settle();
  const cur = await call(() => window.__printLineArt.curation());
  const sm = await stats();
  if (!mutant) console.log('curation:', JSON.stringify(cur), '\nstats:', JSON.stringify(sm, null, 1));

  check('chain/edges-become-strokes', sm.chains > 0 && sm.chains < sm.segments / 3,
    `${sm.segments} raw edges -> ${sm.chains} chained strokes`);
  check('chain/both-tiers-populated',
    sm.contourChains > 0 && sm.interiorChains > 0 && sm.contourStrokes > 0 && sm.interiorStrokes > 0,
    `contour ${sm.contourChains} chains / ${sm.contourStrokes} segs, interior ${sm.interiorChains} / ${sm.interiorStrokes}`);
  check('simplify/reduces-points', sm.ptsOut > 0 && sm.ptsOut < sm.ptsIn * 0.7,
    `${sm.ptsIn} -> ${sm.ptsOut} points (${(100 * sm.ptsOut / sm.ptsIn).toFixed(1)}%)`);

  // THE SHAPE CLAIM, measured as a COMPARISON rather than against a bar.
  // A faceted staircase turns hard at nearly every join; a smoothed contour
  // does not. An absolute threshold looked tempting and was wrong: the mean
  // turn depends on how big the model is on screen (short chains turn more),
  // so the shipped number sat at 31.1 deg against a bar of 32 with the
  // unsmoothed baseline at 37 — a flake, not a measurement. This runs BOTH
  // states at the same camera and pose instead, so the claim is "the pass
  // does something", which is what the mutant has to break.
  //
  // Turn statistics are sampled 1 frame in 8, so each side is demanded and
  // waited for; reading them straight would read the previous state's numbers.
  const turnsAt = async (iters) => {
    await call(`window.__printLineArt.setCuration({ smoothIters: ${iters} })`);
    await settle();
    await call(() => window.__printLineArt.measureTurnsNow());
    await page.waitForTimeout(900);
    const t = await stats();
    return { mean: t.contourTurnMean, over: t.contourTurnOver30, joins: t.contourTurnJoins };
  };
  const smoothOn = await turnsAt(cur.smoothIters);
  const smoothOff = await turnsAt(0);
  await call(`window.__printLineArt.setCuration({ smoothIters: ${cur.smoothIters} })`);
  await settle();
  const fracOn = smoothOn.over / Math.max(smoothOn.joins, 1);
  const fracOff = smoothOff.over / Math.max(smoothOff.joins, 1);
  check('smooth/contour-is-not-faceted',
    smoothOn.joins > 100 && smoothOff.joins > 100
    && smoothOn.mean < smoothOff.mean * 0.85 && fracOn < fracOff * 0.7,
    `mean ${smoothOff.mean.toFixed(1)}° -> ${smoothOn.mean.toFixed(1)}°, joins over 30° ${(fracOff * 100).toFixed(1)}% -> ${(fracOn * 100).toFixed(1)}%`);

  // Curation is a real filter, and it is DRIVEN here rather than assumed:
  // raising the bar must drop more chains and keep fewer, at an unchanged
  // camera and pose. `setCuration` reaches past the panel on purpose — the
  // stage ships three sliders and curation is not one of them.
  const curBefore = await stats();
  await call(() => window.__printLineArt.setCuration({ minChainPx: 60, minCreasePx: 120 }));
  await settle();
  const curAfter = await stats();
  await call(`window.__printLineArt.setCuration(${JSON.stringify({ minChainPx: cur.minChainPx, minCreasePx: cur.minCreasePx })})`);
  await settle();
  const restored = await stats();
  check('curate/prunes-by-length',
    curAfter.chains < curBefore.chains && curAfter.dropped > curBefore.dropped
    && Math.abs(restored.chains - curBefore.chains) / curBefore.chains < 0.1,
    `${curBefore.chains} chains -> ${curAfter.chains} at a 60px bar, back to ${restored.chains}`);
  // ...and it prunes STROKES, not just the counter
  check('curate/prunes-the-drawing', curAfter.strokes < curBefore.strokes,
    `${curBefore.strokes} -> ${curAfter.strokes} stroke segments`);
  // AT THE SHIPPED DEFAULTS. The two checks above drive curation themselves,
  // so they pass whatever the shipped constants are — measured: zeroing
  // `minChainPx` in the source left both of them green. This one is the only
  // thing that sees the default.
  check('curate/default-prunes-something',
    curBefore.dropped > curBefore.chains * 0.3,
    `${curBefore.dropped} dropped vs ${curBefore.chains} kept at the shipped ${cur.minChainPx}px / ${cur.minCreasePx}px`);

  // The interior tier is CREASES, and creases are what the detail slider
  // makes more of. If the two tiers were chained from the same edge set they
  // would move together; only the interior may track detail.
  await setStyle({ detail: 0 }); await settle();
  const tierLow = await stats();
  await setStyle({ detail: 100 }); await settle();
  const tierHigh = await stats();
  await setStyle({ detail: 45 }); await settle();
  const contourDrift = Math.abs(tierHigh.contourChains - tierLow.contourChains) / Math.max(tierLow.contourChains, 1);
  check('tier/interior-tracks-detail',
    tierHigh.interiorChains > tierLow.interiorChains * 2 && contourDrift < 0.2,
    `interior ${tierLow.interiorChains} -> ${tierHigh.interiorChains}, contour ${tierLow.contourChains} -> ${tierHigh.contourChains} (${(contourDrift * 100).toFixed(1)}%)`);
  // The post-process is skipped when the view has not moved by even a
  // twentieth of a pixel — and a pose change has to un-skip it, or the
  // optimisation would freeze the drawing.
  const sk = await call(() => window.__printLineArt.skipRepeat());
  check('skip/idle-is-free', sk.second === true && sk.afterPose === false,
    `repeat update skipped=${sk.second}, after a pose change skipped=${sk.afterPose}`);
  await shot('13-smoothed.png');

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

  // ===================== BUNDLE SWAP ======================================
  // Exercises the runtime loader (file input AND drag-and-drop) against a
  // SECOND bundle, generated on the fly (via GLTFExporter, in-page) from the
  // same real stem+bloom mesh as the default but with the pivot moved and a
  // DIFFERENT rotation_limits_deg — so a swap onto it is distinguishable from
  // a no-op reload of identical numbers. Skipped during --mutants: none of
  // the MUTANTS above touch bundle-loading code, and this is the single most
  // expensive section in the file (it builds and re-parses a second ~5.6 MB
  // bundle through several load cycles), so paying for it on every one of
  // the mutant re-runs would slow the sweep down for zero added signal.
  if (!mutant) {
    const errsBeforeSwap = errs.length;
    out('\n--- bundle swap: generating a second bundle in-page (GLTFExporter) ---');
    const secondB64 = await page.evaluate(async () => {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      const gltf = await new Promise((res, rej) =>
        new GLTFLoader().load(location.origin + '/assets/print-test/flower-test-bundle.glb', res, undefined, rej));
      const root = gltf.scene;
      let pivot = null;
      root.traverse(o => { if ((o.name || '').toLowerCase() === 'pivot') pivot = o; });
      if (!pivot) throw new Error('source bundle has no exact "pivot" node to relocate');
      // A clearly DIFFERENT pivot position and rotation_limits_deg — a swap
      // onto this must not read back as though the first bundle were still
      // active. Kept modest (not e.g. +12 in X): a bigger shift moves the
      // bloom enough to change the re-framed camera's projection of the
      // bend-point handles, which can push one of them under the debug
      // panel's on-screen footprint and produce a drag that silently hits
      // the panel instead of the canvas — measured, and not what this
      // section means to test.
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
    out(`second bundle: ${secondBundleBuf.length} bytes, pivot moved, rotation_limits_deg=[5,20]/[-10,10]`);

    // --- swap via the FILE INPUT ------------------------------------------
    // The page is currently BENT and HINGED (left that way by the pose and
    // independence checks above) — read live rather than assumed, so this
    // stays correct regardless of what state precedes it.
    const beforeInput = { isRest: await call(() => window.__printScaffold.isRest()),
      droop: await call(() => window.__printScaffold.droop()), twist: await call(() => window.__printScaffold.twist()) };
    out(`before file-input swap: isRest=${beforeInput.isRest} droop=${beforeInput.droop} twist=${beforeInput.twist}`);

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
    out(`after file-input swap: ${JSON.stringify(afterInput)}`);

    check('bundle-swap/file-input',
      afterInput.source === 'second-test-bundle.glb'
      && afterInput.isRest === true && afterInput.droop === 0 && afterInput.twist === 0
      && afterInput.limitsFromBundle === true
      && JSON.stringify(afterInput.limits) === JSON.stringify({ droop: [5, 20], twist: [-10, 10] })
      && afterInput.hasRig === true && afterInput.meshes >= 1 && afterInput.leafVerts > 0
      && afterInput.markerFound === true
      && Math.abs(afterInput.pivotPos[0] - 6.09) < 0.1
      && /second-test-bundle\.glb/.test(logAfterInput) && /\[5, 20\]/.test(logAfterInput),
      `pose reset, limits ${JSON.stringify(afterInput.limits)}, pivot ${JSON.stringify(afterInput.pivotPos)}`);

    // posing and orbiting the NEW bundle must still work — the same
    // canvas-drag / slider machinery as the checks above, now run a second
    // time against the swapped-in geometry. Checked against the CANVAS, not
    // assumed: the re-framed camera puts the handle at a different screen
    // position than on the first bundle, and if that ever lands under the
    // debug panel the drag would silently hit the panel instead — see the
    // comment on the pivot offset above, which is what keeps this clear.
    const [ihx, ihy] = await call(() => window.__printScaffold.handleScreenPos(2));
    const handle2OnCanvas = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return !!el && el.id === 'print-canvas';
    }, [ihx, ihy]);
    if (!handle2OnCanvas) out(`  WARNING: handle2 at (${ihx.toFixed(0)}, ${ihy.toFixed(0)}) is not over the canvas — drag below will not reach it`);
    await page.mouse.move(ihx, ihy); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(ihx + i * 6, ihy);
    await page.mouse.up(); await page.waitForTimeout(200);
    const newBundleBends = handle2OnCanvas && !(await call(() => window.__printScaffold.isRest()));
    check('bundle-swap/new-bundle-still-posable', newBundleBends, `handleOnCanvas=${handle2OnCanvas}`);

    await call(() => window.__printScaffold.forcePose(500, -999)); // out of range for [5,20]/[-10,10]
    const clampDroop = await call(() => window.__printScaffold.droop());
    const clampTwist = await call(() => window.__printScaffold.twist());
    check('bundle-swap/new-bundle-clamps-to-own-limits', clampDroop === 20 && clampTwist === -10,
      `droop=${clampDroop} twist=${clampTwist} (bundle limits [5,20]/[-10,10], not the first bundle's [0,45]/[-30,30])`);

    const camBeforeNew = await call(() => window.__printScaffold.cameraPosition());
    const nbox = await page.locator('#print-canvas').boundingBox();
    await page.mouse.move(nbox.x + nbox.width / 2, nbox.y + nbox.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(nbox.x + nbox.width / 2 + i * 18, nbox.y + nbox.height / 2 + i * 5);
    await page.mouse.up(); await page.waitForTimeout(400);
    const camAfterNew = await call(() => window.__printScaffold.cameraPosition());
    const newBundleOrbits = Math.hypot(...camAfterNew.map((v, i) => v - camBeforeNew[i])) > 1;
    check('bundle-swap/new-bundle-orbits', newBundleOrbits);
    await shot('06-swapped-file-input.png');

    // --- swap via DRAG-AND-DROP -------------------------------------------
    // Re-establish a non-rest pose (both the hinge AND a bend point this
    // time), then drop the SAME bytes again through a REAL
    // File/DataTransfer/DragEvent — proving the reset fires on ANY
    // successful load, not only when the content happens to differ from
    // what's already showing.
    await call(() => { window.__printScaffold.setDroop(15); window.__printScaffold.setTwist(-8); });
    const [dhx, dhy] = await call(() => window.__printScaffold.handleScreenPos(1));
    await page.mouse.move(dhx, dhy); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(dhx - i * 6, dhy);
    await page.mouse.up(); await page.waitForTimeout(200);
    const bentBeforeDrop = !(await call(() => window.__printScaffold.isRest()));

    // the hint overlay must show WHILE dragging and hide again once it's
    // gone, independent of whether the drop that follows succeeds
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
    out(`hint overlay: hiddenIdle=${hintHiddenIdle} shownWhileDragging=${hintShownWhileDragging} hiddenAfterDrop=${hintHiddenAfterDrop}`);
    out(`before drop: bent=${bentBeforeDrop}; after drop: ${JSON.stringify(afterDrop)}`);

    check('bundle-swap/drop-hint-overlay', hintHiddenIdle && hintShownWhileDragging && hintHiddenAfterDrop,
      `idle=${hintHiddenIdle} dragging=${hintShownWhileDragging} afterDrop=${hintHiddenAfterDrop}`);
    check('bundle-swap/drop',
      bentBeforeDrop === true && afterDrop.source === 'dropped-bundle.glb' && afterDrop.isRest === true
      && afterDrop.droop === 0 && afterDrop.twist === 0,
      `bentBeforeDrop=${bentBeforeDrop}, after=${JSON.stringify(afterDrop)}`);
    await shot('07-swapped-drop.png');

    // --- a file that is not valid glTF at all: fail VISIBLY, change NOTHING
    // Posed first (non-rest droop/twist), so "untouched" is a real claim
    // rather than a coincidence of the current bundle already being at rest.
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
    out(`invalid file: sceneUnchanged=${sourceAfterBad === sourceBeforeBad} lastLoadError="${lastLoadErrorBad}" newPageErrors=${errs.length - errsBeforeBad}`);
    out(`             poseBefore=${JSON.stringify(poseBeforeBad)} poseAfter=${JSON.stringify(poseAfterBad)}`);

    check('bundle-swap/invalid-file-handled',
      sourceAfterBad === sourceBeforeBad                                 // scene NOT swapped
      && typeof lastLoadErrorBad === 'string' && /garbage\.glb/.test(lastLoadErrorBad)
      && /failed to load .garbage\.glb./.test(logAfterBad)
      && /dropped-bundle\.glb/.test(logAfterBad)                         // prior bundle's info still shown, not wiped
      && JSON.stringify(poseAfterBad) === JSON.stringify(poseBeforeBad)  // prior pose byte-for-byte untouched
      && errs.length === errsBeforeBad,                                 // no unhandled page error
      `lastLoadError="${lastLoadErrorBad}"`);

    // --- a valid glTF with no pivot node: fail VISIBLY, still show what
    // loaded --------------------------------------------------------------
    await page.evaluate(() => {
      const json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'root' }] });
      const file = new File([new TextEncoder().encode(json)], 'no-pivot.glb', { type: 'model/gltf-binary' });
      const dt = new DataTransfer(); dt.items.add(file);
      window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });
    await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.source === 'no-pivot.glb', { timeout: 15000 });
    const noPivotExtras = await call(() => window.__printScaffold.pivotExtras);
      // The POSE panel is ALWAYS on screen now; what a bundle with no rig changes
  // is its BODY, which is replaced by the panel's own empty note. Asserting
  // the panel itself is hidden would be asserting the old contract.
  const noPivotPoseHidden = await page.evaluate(() => {
    const p = document.getElementById('print-pose');
    const empty = document.getElementById('poseEmpty');
    const body = [...p.children].filter(c => c.tagName !== 'SUMMARY' && c !== empty);
    return !p.hidden && !empty.hidden && body.every(c => c.hidden);
  });
    const noPivotMeshes = await call(() => window.__printScaffold.meshes);
    const logAfterNoPivot = await page.textContent('#print-log');
    out(`no-pivot file: swapped=true extras=${JSON.stringify(noPivotExtras)} poseHidden=${noPivotPoseHidden} meshes=${noPivotMeshes}`);

    check('bundle-swap/no-pivot-handled',
      noPivotExtras === null && noPivotPoseHidden === true && noPivotMeshes === 0
      && /pivot\s+NOT FOUND/.test(logAfterNoPivot) && errs.length === errsBeforeBad,
      `extras=${JSON.stringify(noPivotExtras)} poseHidden=${noPivotPoseHidden}`);
    await shot('08-no-pivot-file.png');

    // --- recovery: a good drop after two bad ones must still work ---------
    const defaultBundleBuf = readFileSync(path.join(ROOT, 'assets/print-test/flower-test-bundle.glb'));
    await page.setInputFiles('#bundleFile', { name: 'flower-test-bundle.glb', mimeType: 'model/gltf-binary', buffer: defaultBundleBuf });
    await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.source === 'flower-test-bundle.glb', { timeout: 15000 });
    const recovered = await page.evaluate(() => ({
      hasRig: window.__printScaffold.hasRig, meshes: window.__printScaffold.meshes,
      pivotFound: !!window.__printScaffold.pivotExtras, isRest: window.__printScaffold.isRest(),
    }));
    out(`recovery after bad drops: ${JSON.stringify(recovered)}`);
    check('bundle-swap/recovers-after-bad-drops',
      recovered.hasRig && recovered.meshes >= 1 && recovered.pivotFound && recovered.isRest === true,
      JSON.stringify(recovered));
    await shot('09-recovered.png');

    check('bundle-swap/no-new-page-errors', errs.length === errsBeforeSwap,
      `${errs.length - errsBeforeSwap} new error(s): ${errs.slice(errsBeforeSwap).join(' | ')}`);
  }

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
