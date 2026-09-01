/* ===================================================================
   bloom-harness.mjs — shared headless machinery for the bloom gates and the
   contact-sheet tool (verify-bloom-export, verify-bloom-connectedness,
   shot-bloom).

   ONE copy, from day one, on the chromium-harness.mjs precedent: the flower's
   browser-driving tools each kept private copies of this plumbing and every
   copy drifted. Chromium discovery itself is NOT re-implemented here — it is
   imported from tools/chromium-harness.mjs, the existing one owner.

   What lives here:
     - serveRepo():        local static server over the repo root
     - launchPage():       headless Chromium + the three.js CDN intercept
                           (fulfils the pinned importmap URL from
                           node_modules/three, so runs are offline)
     - openBloom():        load bloom.html fresh and wait until it has built
     - applyConfig():      set control values through the real inputs, with
                           the READ-BACK assertion — a value the UI silently
                           rewrites means the harness would measure a design
                           other than the one it names, so a mismatch is
                           returned as a failure, never a warning
     - fullStateDrift():   whole-state assertion — every registry control is
                           read back through the app's own state snapshot
                           (window.__bloomUIState) and compared against
                           DEFAULTS + the row's set
     - exportStl():        click the real Get STL button, capture the download
     - analyzeStl():       binary-STL edge census. THE PASS CRITERION IS
                           boundary === 0 AND NOTHING ELSE. `nonManifold` and
                           `shells` are UNRATED diagnostics: this geometry is
                           built from individually-closed solids that
                           interpenetrate without sharing welded vertices, so
                           the vertex-weld shell count is large on perfectly
                           healthy models and can never gate (the flower
                           measured 15–26,684 shells across healthy configs;
                           its skill records that an earlier claim of a
                           non-manifold gate was false and shaped decisions
                           for weeks).
     - BLOOM_MATRIX:       the shared config matrix both gates sweep, DEFAULT
                           FIRST — coverage starts at what actually ships
                           (charter: the flower's gate was blind at exactly
                           that row and shipped a 7-piece bare bloom).
   =================================================================== */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';   // must match the importmap in bloom.html
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

/* The registry is the source of truth for ids and defaults; the harness reads
   it rather than keeping a second copy. */
export const { CONTROLS, SECTIONS, RETIRED_IDS, DEFAULTS, valuesEqual, evalPredicate, predicateDrivers, verifySections } =
  await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

/* The geometry module is read the same way, and for the same reason: the
   roll curvature floor the form assertions check must be the number the
   builder actually clamps to. A second copy here would let the gate endorse
   a wall the geometry does not build. */
export const { ROLL_MIN_RADIUS_FACTOR, SHEET_THICKNESS_MM, MIN_FEATURE_MM, FOOT_MIN_WIDTH_MM, MAX_LAYERS, GOLDEN_ANGLE, SPIRAL_LEGIBLE_COUNT } = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);

/* THE TWO CONSTANTS THAT MUST BE ONE. SHEET_THICKNESS_MM is the geometry's
   name for the default sheet thickness and the registry carries a literal
   1.2; two constants that agree today are two constants that drift. Asserted
   at module load so every gate run and every shot tool checks it, and a
   mismatch aborts before a single row is measured rather than producing 120
   green results about a design nobody characterised. */
if (DEFAULTS.sheetThickness !== SHEET_THICKNESS_MM) {
  throw new Error(`registry default sheetThickness ${DEFAULTS.sheetThickness} !== SHEET_THICKNESS_MM ${SHEET_THICKNESS_MM} — the constant and the control have drifted`);
}

/* THE SAME MOVE FOR LAYERS, and the failure it prevents is worse than a
   drifted number. `footRing()` THROWS on a layerCount outside 1..MAX_LAYERS,
   so a registry max ABOVE the constant makes the top of a shipped slider
   crash the build; a max BELOW it silently strands geometry the builder can
   make and nothing can reach ("shipped means reachable"). One of the two is
   the owner — MAX_LAYERS, because the builder is what the bound is about —
   and this is what stops the other becoming a second one. Checked at module
   load, so the app, both gates and every shot tool get it for free rather
   than one run remembering to look. */
const LAYER_COUNT_CONTROL = CONTROLS.find((c) => c.id === 'layerCount');
if (!LAYER_COUNT_CONTROL) {
  throw new Error('the registry declares no `layerCount` control — the arrangement matrix and junctionAssertions both read it');
}
if (LAYER_COUNT_CONTROL.max !== MAX_LAYERS) {
  throw new Error(`registry layerCount.max ${LAYER_COUNT_CONTROL.max} !== MAX_LAYERS ${MAX_LAYERS} — the slider and the builder's own bound have drifted`);
}
if (LAYER_COUNT_CONTROL.min !== 1) {
  throw new Error(`registry layerCount.min ${LAYER_COUNT_CONTROL.min} !== 1 — one whorl is the byte-identical default and the guard's only case`);
}

/* The four curves. Named once, read by formAssertions and by the matrix's
   named-corner block; the ids themselves live in the registry. */
const FORM_IDS = ['petalCup', 'petalSpineCurl', 'petalRoll', 'petalTwist'];

/* Serves the repo root by default. `root` exists for ONE reason: a
   before/after contact sheet needs the OLD tree rendered by the same browser,
   the same camera and the same assertions as the new one, and the old tree
   lives in a `git worktree` — never in a mutated working tree, which stages a
   revert a stray commit can push. One server function, two roots; a private
   copy in the shot tool would be the drift this file exists to prevent. */
export function serveRepo(root = ROOT) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/bloom.html';
    fs.readFile(path.join(root, p), (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

export async function launchPage({ viewport = { width: 1000, height: 800 }, deviceScaleFactor } = {}) {
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
    catch { route.abort(); }
  });
  /* Fonts are chrome, and every gate row is a fresh page: letting each load
     reach out for webfonts adds seconds per row (or a hang on a slow proxy)
     for pixels no gate measures. Aborted, so runs are offline and fast. */
  await page.route('**fonts.googleapis.com/**', (route) => route.abort());
  await page.route('**fonts.gstatic.com/**', (route) => route.abort());
  return { browser, page };
}

/* A FRESH PAGE PER ROW is the caller's job (call this once per row): the
   flower's connectedness gate proved a reused page with a hand-kept clear
   list leaks state between rows, and a reload cannot rot. */
export async function openBloom(page, port) {
  await page.goto(`http://127.0.0.1:${port}/bloom.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => {
    const el = document.getElementById('readout');
    return el && /tris/.test(el.textContent);
  }, { timeout: 60000 });
}

/* READ-BACK: set each value through the real input, fire the real events,
   and compare what the element now holds. Returns failure strings; the
   caller must treat any as fatal for the row. */
export const applyConfig = (page, sets) => page.evaluate(({ ss, kinds }) => {
  const bad = [];
  for (const s of ss) {
    const el = document.getElementById(s.id);
    if (!el) { bad.push(`${s.id}: not in the DOM`); continue; }
    const kind = kinds[s.id];
    if (!kind) { bad.push(`${s.id}: not a registry control`); continue; }
    el.value = s.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const got = el.value;
    /* Compared IN THE CONTROL'S OWN KIND, from the registry — never sniffed
       from the value. Sniffing happened to work for these option names, and
       "happens to work" is how a <select> whose value the browser rejected
       (an option that does not exist leaves a <select> reading "") would slip
       through as a numeric-comparison edge case. A kind is declared; a sniff
       is a guess that reads like a declaration. */
    const ok = kind === 'slider'
      ? (isFinite(Number(got)) && Math.abs(Number(s.value) - Number(got)) < 1e-9)
      : String(s.value) === String(got);
    if (!ok) bad.push(`${s.id}: set "${s.value}", reads back "${got}"`);
  }
  return bad;
}, { ss: sets, kinds: Object.fromEntries(CONTROLS.map((c) => [c.id, c.kind])) });

/* FULL-STATE assertion: the app's own snapshot must equal DEFAULTS + set for
   EVERY registry control — not only the ids the row touched. */
export async function fullStateDrift(page, sets) {
  const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
  const expected = { ...DEFAULTS };
  for (const s of sets) {
    if (!byId[s.id]) throw new Error(`fullStateDrift: "${s.id}" is not a registry control`);
    expected[s.id] = s.value;
  }
  const got = await page.evaluate(() => window.__bloomUIState());
  const bad = [];
  for (const c of CONTROLS) {
    /* valuesEqual comes from the REGISTRY — the same comparison the app uses
       to decide what a control's value means. A local Number() here would
       compare NaN with NaN for every choice control, which is false, so the
       gate would have failed loudly; the worse version is a local `==` that
       passes on a coerced value nobody checked. Neither is a risk when the
       kind rule has one owner. */
    if (!valuesEqual(c, expected[c.id], got[c.id])) {
      bad.push(`${c.id}: expected "${expected[c.id]}", live "${got[c.id]}"`);
    }
  }
  return bad;
}

export async function exportStl(page, tmpDir) {
  await page.waitForTimeout(400);   // let the rAF-coalesced rebuild land
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }).catch(() => null),
    page.click('#exportStl'),
  ]);
  if (!dl) return null;
  const fp = path.join(tmpDir, 'bloom.stl');
  await dl.saveAs(fp);
  return fs.readFileSync(fp);
}

/* Binary-STL edge census. Vertices quantised so coincident corners weld; an
   edge used by exactly one triangle is a BOUNDARY (open) edge — the gated
   failure. count > 2 → nonManifold; `shells` is union-find over the welded
   vertex graph. Both of those are UNRATED — see the header.

   `degenerate` IS RATED, and it arrived with the converging tip cap (Sep 1).
   A triangle of zero area contributes edges to the census while enclosing no
   volume, so it can put a number in the nonManifold column with no cause a
   reader can find — which is exactly what the DOME did for months, closing its
   cap on 48 vertices 6.1e-17 apart because `cos(PI/2)` is not zero. A tip cap
   that converges is that same construction, so the failure it can produce is
   now MEASURED rather than argued away: any triangle whose area is at or below
   DEGENERATE_AREA_MM2 is counted, and the gate fails on a nonzero count.
   The threshold is in mm^2 because this model is in millimetres throughout;
   1e-9 mm^2 is a triangle a thousandth of a micron on a side, i.e. numerically
   zero rather than merely small. Measured at 0 across the whole matrix before
   the cap landed, which is what makes it safe to gate rather than report. */
const DEGENERATE_AREA_MM2 = 1e-9;
export function analyzeStl(buf) {
  const tris = buf.readUInt32LE(80);
  const q = (x) => Math.round(x * 1e4) / 1e4;
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const edges = new Map();
  const parent = new Map();
  const root = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); let c = x; while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; } return r; };
  const union = (a, b) => { const ra = root(a), rb = root(b); if (ra !== rb) parent.set(ra, rb); };
  let off = 84;
  let degenerate = 0;
  for (let i = 0; i < tris; i++) {
    off += 12;
    const v = [];
    /* Area is computed from the RAW floats, before quantisation: quantising
       first would manufacture degeneracies that the exported file does not
       have, and the question here is whether the emitted triangle encloses
       area, not whether two corners round together. */
    const P = [];
    for (let k = 0; k < 3; k++) {
      const x = buf.readFloatLE(off), y = buf.readFloatLE(off + 4), z = buf.readFloatLE(off + 8);
      P.push([x, y, z]);
      v.push(q(x) + ',' + q(y) + ',' + q(z));
      off += 12;
    }
    off += 2;
    const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]];
    const e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (0.5 * Math.hypot(cx, cy, cz) <= DEGENERATE_AREA_MM2) degenerate++;
    for (const p of v) if (!parent.has(p)) parent.set(p, p);
    union(v[0], v[1]); union(v[1], v[2]);
    for (let k = 0; k < 3; k++) { const e = key(v[k], v[(k + 1) % 3]); edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0, nonManifold = 0;
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  const roots = new Set();
  for (const v of parent.keys()) roots.add(root(v));
  return { tris, boundary, nonManifold, degenerate, shells: tris > 0 ? roots.size : 0 };
}

/* PREVIEW FRAME — chrome hidden and the camera still, ASSERTED.

   Ported from the flower's two silent instrument defects: the control panel
   composited into every frame for months, and autoRotate left on, which made
   the camera angle a function of wall-clock time and every cross-run pixel
   diff meaningless. Both were invisible because the numbers looked
   plausible. This lives in the harness rather than in a shot tool because
   there are now TWO shot tools, and a copy in each is a copy that drifts.

   `body.bl-preview` in bloom.css stays THE ONE OWNER of which elements are
   chrome; this only sets the class and reads the result back. Returns
   failure strings — the caller must treat any as fatal. */
export async function stillFrame(page) {
  await page.evaluate(() => {
    document.body.classList.add('bl-preview');
    const ar = document.getElementById('autoRotate');
    if (ar && ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const out = [];
    const ar = document.getElementById('autoRotate');
    if (!ar) out.push('#autoRotate missing'); else if (ar.checked) out.push('autoRotate still on');
    for (const sel of ['.bl-panel', '.bl-viewpanel', '.bl-header']) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') out.push(sel + ' still visible');
    }
    return out;
  });
}

/* ===================================================================
   CAPABILITY — the two NON-SHIPPING petal-model configurations.

   Eva's ruling (Aug 31): the silhouette model is architected for claw and
   cleft from day one, and capability is PROVEN, NOT CLAIMED. These two specs
   are the proof. They are reachable only through window.__bloomCapability —
   no registry row, no DOM input, nothing in the panel sets them — so they
   can never leak into a shipped state, and "architected for cleft" can never
   exist only as a sentence in a header.

   ONE DEFINITION, three consumers: both gates and the silhouette contact
   sheet import these rather than each spelling out its own numbers.

   CLAW  exercises a NON-MONOTONE width profile: a narrow constant stalk
         below u = 0.30 that also suppresses the foot-continuity floor, so
         the blade leaves the foot NARROWER THAN THE FOOT and then widens
         abruptly into the blade. Narrower than both its foot and its blade
         is what a claw IS, and it is asserted as a strict interior local
         minimum in the row half-widths rather than eyeballed.
   CLEFT exercises a TWO-SPAN TRIMMED DOMAIN: above u = 0.55 the petal
         carries two spans with a central gap, built as a base panel plus
         two lobe panels that reach down into it. Asserted as two spans at
         the tip row, plus watertight and connected from the export itself.
   =================================================================== */
export const CAPABILITY_CLAW = { label: 'CLAW', stalk: { until: 0.30, halfWidth: 1.4 } };
export const CAPABILITY_CLEFT = { label: 'CLEFT', cleft: { from: 0.55, gap: 0.35 } };

/* The scope of what the structural assertions below actually measure —
   printed BESIDE every capability row's result, not only in a header, so a
   future reader of a green run sees the limit next to the claim (Eva,
   Aug 31). */
export const CAPABILITY_SCOPE =
  'structural claim read from the app\'s own profile/trim evaluation, NOT from the STL; watertight + connected are measured on the export';

/* Sets the capability through the only hook that writes it, and READS BACK
   what the app now holds — the same doctrine as applyConfig. A capability
   is invisible to fullStateDrift (it is not a registry control), so this is
   the assertion that a capability row measures the design its label names.
   Also asserts the NEGATIVE for ordinary rows: no capability may be live on
   a row that did not ask for one. Returns failure strings; any is fatal for
   the RUN, never just the row. */
export async function applyCapability(page, row) {
  const spec = row.capability || null;
  if (spec) await page.evaluate((s) => window.__bloomCapability(s), spec);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const want = spec ? spec.label : null;
  const bad = [];
  if (m.capability !== want) bad.push(`capability: set ${JSON.stringify(want)}, reads back ${JSON.stringify(m.capability)}`);
  if (!spec) return bad;

  /* STRUCTURAL ASSERTIONS — what makes the row load-bearing rather than
     decorative. A capability row that only proved "it still exports" would
     prove nothing about the capability. */
  const prof = m.petalProfile;
  if (!Array.isArray(prof) || prof.length < 3) { bad.push(`capability ${want}: no petal profile reported`); return bad; }
  if (spec.stalk) {
    /* NON-MONOTONE: a strict interior local minimum, foot rows included. */
    let found = -1;
    for (let j = 1; j < prof.length - 1 && found < 0; j++) {
      let hiBefore = false, hiAfter = false;
      for (let i = 0; i < j; i++) if (prof[i] > prof[j]) hiBefore = true;
      for (let k = j + 1; k < prof.length; k++) if (prof[k] > prof[j]) hiAfter = true;
      if (hiBefore && hiAfter) found = j;
    }
    if (found < 0) bad.push(`capability ${want}: width profile has NO strict interior local minimum — [${prof.map((h) => h.toFixed(2)).join(', ')}]`);
  }
  if (spec.cleft) {
    if (m.petalTipSpans !== 2) bad.push(`capability ${want}: tip carries ${m.petalTipSpans} span(s), expected 2 — the domain was not trimmed`);
    if (!Array.isArray(m.petalPanels) || m.petalPanels.length !== 3) bad.push(`capability ${want}: panels ${JSON.stringify(m.petalPanels)}, expected base + two lobes`);
  }
  return bad;
}

/* ===================================================================
   FORM ASSERTIONS — the instrument this session had to build, because
   BOTH SHIPPED GATES ARE STRUCTURALLY BLIND to what form work can break.

   That is a derivation, not a hedge. The export gate's criterion is
   boundary edges on a mesh whose topology is FIXED (NU, NV and the panel
   count depend on no form control), and pure vertex displacement cannot
   change an edge census. The connectedness gate cannot fire either: the
   foot rows are never written by the form layer and the hub disc spans
   them, so no reachable curl / cup / roll / twist detaches a petal — a
   blade bends TOWARD things, and interpenetrating closed solids read as
   MORE connected, never less. Every failure this session can cause
   therefore leaves both gates green.

   What can actually go wrong, and what each assertion catches:
     FOOT INVARIANCE   a deformation leaking onto the foot rows. The
                       natural bug: the frame is built per row, and
                       starting the rotation at row 0 rather than at u > 0
                       is one index. It moves the junction and nothing else
                       here would notice.
     ROLL ISOMETRY     the roll ceasing to be an arc parameterised by ARC
                       LENGTH — the property that makes it a bend rather
                       than a stretch, and the premise this session was
                       told to check rather than inherit.
     CURVATURE FLOOR   a roll radius at or below t/2, where the sheet's
                       inner offset surface INVERTS and the solid
                       self-intersects while staying watertight and
                       connected.
     GUARD RESIDUAL    the all-zero short-circuit hiding a wrong form path.
                       The guard is what makes the default byte-identical;
                       this is what stops it being somewhere a bug can sit
                       unexercised.

   Like applyCapability, these read the APP'S OWN evaluation rather than the
   STL, and like it that scope is printed beside every result rather than
   only here. Returns failure strings; any is fatal for the RUN.
   =================================================================== */
export const FORM_SCOPE =
  "form claims read from the builder's own frames/telemetry, NOT from the STL; watertight + connected are measured on the export";

/* NO MODULE-CONSTANT ROLL FLOOR ANY MORE. It was
   `ROLL_MIN_RADIUS_FACTOR * SHEET_THICKNESS_MM` — 1.2 mm, computed once — and
   the thickness layer made it wrong in BOTH directions: a 0.60 mm sheet
   legitimately permits a 0.60 mm roll radius and would have failed a correct
   build, and a 2.40 mm sheet clamps at 2.40 so a genuinely inverting radius
   would have passed. The floor is now read from the builder's own telemetry
   (`rollMinRadiusMm`), which is the same one-owner move the foot assertion
   below makes: a fixed expectation becomes an expectation derived from the
   state the row is actually in. The factor is still imported, and asserted
   against the telemetry, so the floor cannot quietly stop being one sheet
   thickness. */

export async function formAssertions(page, row) {
  const m = await page.evaluate(() => window.__bloomMetrics());
  const bad = [];
  const wantsForm = (row.set || []).some((s) => FORM_IDS.includes(s.id) && Number(s.value) !== 0);

  /* READ-BACK, both directions. A form row whose telemetry is null built a
     flat petal under a label saying otherwise; a flat row WITH telemetry
     took the form path where the guard should have short-circuited — and
     that second one is the byte report's whole premise. */
  if (wantsForm && !m.petalForm) bad.push('form row reports NO form telemetry — the guard short-circuited a row that sets a curve');
  if (!wantsForm && m.petalForm) bad.push('flat row reports form telemetry — the guard did not short-circuit');

  /* FOOT INVARIANCE MOVED OUT OF HERE (Sep 1) — it is now J1 in
     junctionAssertions(), which runs on EVERY LAYER rather than on slot 0 of
     one whorl. The properties and the reasoning are unchanged (curl rotates
     the normal and lifts the centre off the hub plane; twist rotates the
     width direction; the cross-section is compared against footRing()'s own
     answer, never a re-derivation) — what changed is that "the foot" stopped
     being one ring. Leaving a copy here would have been a second owner of the
     same assertion, and the layer-0-only version would have kept passing
     while every inner whorl went unchecked. */

  if (!m.petalForm) {
    const g = m.petalGuardResidual;
    if (typeof g !== 'number') bad.push(`flat row reports guard residual ${JSON.stringify(g)} — not measured`);
    else if (!(g <= 1e-9)) bad.push(`guard residual ${g.toExponential(3)} exceeds 1e-9 — the zero-form law and the flat law have diverged`);
    return bad;
  }

  const f = m.petalForm;
  /* ROLL ISOMETRY, asserted only where it is a claim. Cup is the one curve
     that legitimately moves the metric, so a cupped row is EXCLUDED rather
     than given a loose tolerance — a tolerance wide enough for cup would be
     wide enough to miss a broken roll. Curl and twist are rigid across the
     width and must not move it either, so they are covered by the same
     assertion rather than trusted. */
  if (f.cup === 0) {
    if (!(Math.abs(f.metricMin - 1) < 1e-12 && Math.abs(f.metricMax - 1) < 1e-12)) {
      bad.push(`|dP/dv|/h is ${f.metricMin.toFixed(9)}..${f.metricMax.toFixed(9)}, not 1 — a cup-free deformation is stretching the width`);
    }
  } else if (!(f.metricMax >= 1)) {
    bad.push(`cup ${f.cup} reports a max metric factor of ${f.metricMax} — cup can only lengthen the cross-section`);
  }

  /* THE CURVATURE FLOOR — the assertion whose failure is invisible to both
     gates, which is exactly why it is here and not left to them. */
  if (f.rollDeg !== 0) {
    const floor = f.rollMinRadiusMm;
    if (!(floor > 0)) bad.push(`roll row reports no curvature floor (rollMinRadiusMm ${JSON.stringify(floor)}) — the assertion has nothing to compare against`);
    else {
      /* The floor must BE one sheet thickness of the sheet this row actually
         built — checked against the geometry's own reported thickness, so a
         floor computed from a thickness nothing has cannot pass. */
      const want = ROLL_MIN_RADIUS_FACTOR * f.sheetThicknessMm;
      if (Math.abs(floor - want) > 1e-12) bad.push(`roll floor ${floor} mm is not ${ROLL_MIN_RADIUS_FACTOR} x the emitted sheet thickness ${f.sheetThicknessMm} mm = ${want}`);
      if (!(f.rollRadiusMm >= floor - 1e-9)) {
        bad.push(`roll radius ${f.rollRadiusMm.toFixed(4)} mm is below the ${floor.toFixed(4)} mm floor (one sheet thickness at ${f.sheetThicknessMm.toFixed(2)} mm) — the sheet's inner offset surface inverts`);
      }
    }
  }
  return bad;
}

/* ===================================================================
   THICKNESS ASSERTIONS — the instrument the thickness layer had to build,
   for the same reason the form layer had to build one: BOTH SHIPPED GATES
   ARE STRUCTURALLY BLIND TO IT, and that is a derivation rather than a
   hedge.

   The export gate's criterion is boundary edges on a mesh whose topology is
   FIXED — NU, NV, the panel count and every centre segment count depend on
   no thickness control — and thickness is pure vertex offset along the
   surface normal, which cannot change an edge census. The connectedness gate
   cannot fire either: the hub slab is built at ring.thickness, the same
   number the feet are, so a thinner sheet thins BOTH and the foot stays
   inside a hub that still spans the ring. No reachable thickness or
   delicacy setting detaches anything.

   What can actually go wrong, and what catches it:
     FOOT INVARIANCE    a thickness gradient leaking onto the foot rows. The
                        natural bug is one character: evaluate the ramp on
                        the row INDEX instead of the row's u. Caught by the
                        reworked foot assertion in formAssertions() above,
                        which compares the emitted foot against footRing()'s
                        own answer. It is the positive control for this
                        session.
     THE EXPORT FLOOR   a thinned tip exporting below MIN_FEATURE_MM. Read
                        from the app's own export read-out (`min sheet`),
                        i.e. through the real Get STL path, because the live
                        build never floors anything and a live metric
                        therefore cannot answer an export question.
     THE GUARD          the uniform short-circuit hiding a wrong thick path.
                        Same role formGuardResidual plays: measured, both
                        directions, on every row.
     DEGENERACY         a sheet thin enough for the two faces to weld. The
                        thinnest reachable live sheet is 0.60 x (1 - 0.80) =
                        0.12 mm at the tip, three orders above analyzeStl's
                        1e-4 weld tolerance — asserted rather than argued.

   Like the form assertions these read the APP'S OWN evaluation, not the STL,
   and that scope is printed beside every result rather than only here.
   =================================================================== */
export const THICKNESS_SCOPE =
  "thickness claims read from the builder's own per-row profile and the app's export read-out, NOT from the STL; watertight + connected are measured on the export";

export async function thicknessAssertions(page, row) {
  const m = await page.evaluate(() => window.__bloomMetrics());
  const bad = [];
  const th = m.petalThickness;
  if (!th) { bad.push('no thickness telemetry reported'); return bad; }

  const sets = Object.fromEntries((row.set || []).map((s) => [s.id, Number(s.value)]));
  const wantsThinning = (sets.tipThinning ?? 0) !== 0;

  /* READ-BACK, both directions — the guard's own premise. */
  if (wantsThinning && th.uniform) bad.push('a row that sets tipThinning reports a UNIFORM profile — the guard short-circuited a graded row');
  if (!wantsThinning && !th.uniform) bad.push('a row with no tipThinning reports a GRADED profile — the guard did not short-circuit, and byte-identity rests on it');

  if (th.uniform) {
    const g = m.petalThicknessGuardResidual;
    if (typeof g !== 'number') bad.push(`uniform row reports guard residual ${JSON.stringify(g)} — not measured`);
    else if (!(g <= 1e-9)) bad.push(`thickness guard residual ${g.toExponential(3)} exceeds 1e-9 — the profile law and the scalar path have diverged`);
    if (th.minEmitted !== th.maxEmitted) bad.push(`uniform row emitted ${th.minEmitted}..${th.maxEmitted} mm — a uniform profile is one number`);
  } else {
    if (m.petalThicknessGuardResidual !== null) bad.push('graded row reports a guard residual — the guard is measuring a path it did not take');
    /* The gradient goes the right way: thinning REMOVES material toward the
       tip and never adds it. */
    if (!(th.tipEmitted <= th.base + 1e-12)) bad.push(`tip ${th.tipEmitted} mm is thicker than the base ${th.base} mm — the gradient is inverted`);
  }

  /* DEGENERACY. A sheet whose two faces weld would close the rim into
     nothing, and the edge census would read boundary edges with no cause a
     reader could find. */
  if (!(th.minEmitted > 1e-3)) bad.push(`minimum emitted sheet ${th.minEmitted} mm is at or below the 1e-3 mm degeneracy bound`);

  /* THE CONVERGING TIP CAP (Eva's ruling, Sep 1). Both directions, like the
     thickness guard: a pointed row must report a cap that actually converges,
     and a truncate row must report no cap at all — the second is what makes
     the byte partition a claim rather than a hope, since every breadth > 0 row
     must be bit-identical to the pre-ruling tree. */
  const tc = m.petalTipCap;
  if (!tc) bad.push('no tip-cap telemetry reported');
  else {
    const wantsPointed = Number(sets.petalTipBreadth ?? DEFAULTS.petalTipBreadth) === 0;
    if (wantsPointed !== tc.pointed) bad.push(`tip cap: row ${wantsPointed ? 'is' : 'is not'} the pointed family but the builder reports pointed=${tc.pointed}`);
    if (tc.pointed) {
      /* CONVERGING, not squared: the entry must be strictly wider than the
         terminus. The cap-entry rule guarantees at least CAP_ENTRY_FACTOR x
         the print floor at entry, so in export this is at least 2:1. */
      if (!(tc.entryHalf > tc.terminalHalf)) bad.push(`tip cap does not converge: entry ${tc.entryHalf} <= terminal ${tc.terminalHalf} — the stub is back`);
      /* The last emitted row IS the terminus, and it is never zero: a true
         apex collapses NV columns onto one edge, which is the DOME's bug. */
      if (Math.abs(tc.lastRowHalf - tc.terminalHalf) > 1e-9) bad.push(`tip cap: last row half-width ${tc.lastRowHalf} is not the terminal ${tc.terminalHalf}`);
      if (!(tc.lastRowHalf > 0)) bad.push(`tip cap: terminal half-width is ${tc.lastRowHalf} — a true apex, which collapses NV columns onto one edge (the DOME's defect)`);
    }
  }

  /* THE FOOT IS THE PROFILE WHERE THE PROFILE IS THE IDENTITY. u = 0 gives
     base * (1 - thin*0) = base * 1 = base, exactly, at every thinning value
     — so this holds structurally rather than by a guard, and asserting it
     here says the structure is still what the header claims. */
  if (th.base !== m.ringThickness) bad.push(`profile at u=0 is ${th.base}, not footRing()'s ring.thickness ${m.ringThickness} — the gradient does not start at the foot's own thickness`);
  return bad;
}

/* ===================================================================
   JUNCTION ASSERTIONS — the instrument the LAYER work had to build, and the
   only thing in this repository that can police the junction under layers.

   WHY IT EXISTS IS A MEASUREMENT, NOT A HEDGE. Both shipped STL gates were
   tested against the failure this session can cause, before this was written:

     THE WRONG-HUB MUTATION — building the hub at the WRONG layer's radius
     (min over layers instead of the owner's R0). At the defaults with three
     layers the outer whorl's feet end 7.94 mm out against a hub that stops at
     6.86 mm: DETACHED FROM THE HUB BY CONSTRUCTION. The connectedness gate
     reports ONE region, 0.00% detached — it PASSES. It passes because
     consecutive foot annuli overlap EACH OTHER (layer 0's feet span
     [7.94, 13.23], layer 1's span [5.72, 9.53]), so the outer whorl is held
     on by a CHAIN through the inner layers, and blades interpenetrate on top
     of that. Connectedness under layers is OVER-DETERMINED: the gate cannot
     tell a correct hub from an incorrect one. Measured across five
     configurations (2 and 3 layers, layerSize max, ALL THIN x spread min,
     petalCount 40) — all five pass while wrong.

     THE LIFTED-LAYER MUTATION — feet lifted off the hub plane. The junction
     derivation dies at |h| >= t = 1.20 mm (the foot's z-span stops meeting
     the hub slab's). The gate does not fire until h >= 2.5 mm, so there is a
     BLIND BAND, roughly 1.2–2.5 mm, in which the model is detached by
     derivation and reads as one piece. Confirmed across eight scenarios
     (layerSize 0.40 and 0.75, tilt step 0 and +10, phase aligned and
     alternating, ALL THIN, petalCount 3): every one detaches eventually,
     none before 2.0 mm.

   SO: A GREEN CONNECTEDNESS RUN DOES NOT ENDORSE THE JUNCTION UNDER LAYERS.
   It endorses what it measures — that the exported bytes form one body — and
   that is a weaker statement than the invariant here. These assertions carry
   the rest, in exact arithmetic, from the app's own metrics rather than from
   the STL, and both gates run them on every row.

     J1  every ring's feet are IN the hub plane and carry the ring's own
         cross-section (the pre-layer foot assertion, extended to N rings)
     J2  every ring's radius <= the hub radius              (containment)
     J3  every ring's foot REACHES the hub disc             (the wrong-hub
         mutation's only witness — radius - overhang < hub radius)
     J4  the overlap box's three dimensions against their own floors, and
         the hub built at the same thickness as the feet

   Plus the single-layer GUARD's cross-validation, which is a BOUND and not a
   zero, and the three placement components that ARE exactly 0/1 — asserted
   separately so the bound cannot hide a real leak in them.

   ===================================================================
   J5 AND J6 — THE CONTINUUM, AND THE HOLE THAT FOUND THEM (Sep 1).

   The continuous-spiral session's obvious positive control is THE QUANTIZER
   MUTATION: continuous mode silently building rings (lambda_k = floor(k/n)
   left in where k/n belongs). It was checked against J1–J4 BEFORE these were
   written, and the result is why they exist. That mutation:

     - exports WATERTIGHT (boundary 0) — fixed-topology grids, unchanged;
     - exports as ONE CONNECTED PIECE, and more comfortably than the layered
       case ever did: consecutive foot annuli overlap by 3.154 mm at the
       shipping continuous config, against 1.981 mm at three layers, so the
       flood fill is over-determined by two orders more than it was;
     - has the IDENTICAL TRIANGLE COUNT, since K is unchanged;
     - and PASSES J1, J2, J3 and J4, every one, on every row.

   It even passes the multiples-of-n identity, because floor(m*n/n) is m. So
   the instrument as it stood could not observe the thing this session is
   about. Two assertions carry it, and each catches what the other misses:

     J5  THERE ARE NO LAYERS. Under CONTINUOUS, radius and scale are STRICTLY
         decreasing across the whole sequence — no two consecutive slots share
         a ring — and tiltExtra is non-decreasing, strictly increasing
         whenever it ends above 0. This is a property of the arrangement, not
         a second copy of its law. The quantizer mutation fires it on 117 of
         119 steps at the shipping config.
     J6  THE QUANTIZER IDENTITY. The continuous sequence passes EXACTLY
         through every ringed layer: at k = m*petalCount, scale and tiltExtra
         equal the ringed layer m's, to the bit. Computed in footRing() on the
         guardResidual precedent — a gate restating Math.pow(layerSize, m)
         would be a second copy of the ringed law inside the instrument built
         to police it — and asserted here as an EQUALITY, because (m*n)/n is
         exactly m in IEEE-754. A wrong-exponent law passes J5 and fires J6.

   A THIRD MUTATION IS WHY J4b IS NOT REDUNDANT UNDER THE CONTINUUM: applying
   the foot-width floor once per SEQUENCE rather than per SLOT leaves the deep
   feet below FOOT_MIN_WIDTH_MM while the model stays watertight and one
   piece. J4b is its only witness, and it is now checked on up to 120 rings
   rather than on 3.

   Like formAssertions and thicknessAssertions these read the APP'S OWN
   evaluation, not the STL, and that scope is printed beside every result.
   =================================================================== */
export const JUNCTION_SCOPE =
  "junction claims read footRing()'s own per-RING answer and the emitted foot frames, NOT the STL; a green connectedness run does not endorse them (the wrong-hub mutation passes it, measured — and under CONTINUOUS the quantizer mutation passes the export gate, the connectedness gate, the triangle count AND J1-J4, which is why J5/J6 exist)";

/* The guard residual is a difference of two square roots that are the same
   number in algebra and not in IEEE-754 (`a*(b+c)` vs `a*b + a*c`, firing on
   a real row). Measured worst case at the shipping ranges: 8.88e-16 absolute
   on the default, 0.90 ULP relative. The bound is 4 ULP of the radius — wide
   enough that rounding cannot fail it, far too tight for any real leak, and
   it is RELATIVE because the radius spans 0.57 mm to 26.5 mm. */
const GUARD_ULPS = 4;

export async function junctionAssertions(page, row) {
  const m = await page.evaluate(() => window.__bloomMetrics());
  const bad = [];
  const layers = m.rings;
  const hub = { radius: m.hubRadius, thickness: m.hubThickness };
  const cont = m.continuousMode === true;

  if (!Array.isArray(layers) || layers.length < 1) {
    bad.push(`rings is ${JSON.stringify(layers)} — the junction cannot be checked`);
    return bad;
  }
  /* THE RING COUNT AGAINST THE OWNER'S OWN SHAPE. Under the ringed arm there
     is one ring per layer; under the continuous arm one per petal, and the
     sequence length is footRing()'s number rather than a product this gate
     recomputes from two controls. Checked in both directions — a continuous
     row reporting layerCount rings is the quantizer mutation arriving through
     the shape rather than through the values. */
  const wantRings = cont ? m.sequenceLength : m.layerCount;
  if (layers.length !== wantRings) {
    bad.push(`footRing() returned ${layers.length} rings but the ${cont ? 'sequence length' : 'layer count'} is ${wantRings} — the owner disagrees with itself`);
  }
  if (layers.length * m.slotsPerRing !== m.sequenceLength * (cont ? 1 : m.layerCount)) {
    bad.push(`rings ${layers.length} x slotsPerRing ${m.slotsPerRing} does not account for the bloom's petals (sequenceLength ${m.sequenceLength}, layerCount ${m.layerCount})`);
  }
  /* MAX_LAYERS bounds the DEPTH, never the ring count — a continuous bloom at
     three turns has 120 rings and is not three layers deep in violation of
     anything. Reading the ring count here would have made the cap fire on
     every continuous row. */
  if (m.layerCount > MAX_LAYERS) bad.push(`layerCount ${m.layerCount} exceeds MAX_LAYERS ${MAX_LAYERS}`);

  /* J4a — THE HUB IS BUILT AT THE FEET'S OWN THICKNESS. The charter's overlap
     derivation uses min(footT, hubT) and then says the two are EQUAL by
     construction; this is what makes that a measurement. */
  if (hub.thickness !== m.ringThickness) {
    bad.push(`J4: hub thickness ${hub.thickness} is not the foot's ${m.ringThickness} — the overlap's vertical extent is no longer min(footT, hubT) = t by construction`);
  }

  const frames = m.petalRingFootFrames;
  if (!Array.isArray(frames) || frames.length !== layers.length) {
    bad.push(`J1: expected foot frames for ${layers.length} rings, got ${JSON.stringify(frames && frames.length)}`);
  }

  layers.forEach((r, L) => {
    /* J2 — CONTAINMENT. Exact, not toleranced: layerSize < 1 makes
       radius_L <= R0 a consequence of the model, and the hub radius IS
       layers[0].radius, so at L = 0 these are literally the same double. A
       tolerance here would admit the very drift the exactness proves absent. */
    if (!(r.radius <= hub.radius)) {
      bad.push(`J2: ring ${L} radius ${r.radius} exceeds the hub radius ${hub.radius} — its feet land outside the disc that is supposed to span them`);
    }
    if (L === 0 && r.radius !== hub.radius) {
      bad.push(`J2: ring 0 radius ${r.radius} is not the hub radius ${hub.radius} — they are one quantity and something has produced a second`);
    }
    /* J3 — THE FOOT REACHES THE HUB. THIS IS THE ONE THE VOXEL GATE CANNOT
       MAKE. Feet land ON their ring and run INWARD by overhang, so the foot
       overlaps the hub disc iff its inner edge is inside the disc. Under the
       wrong-hub mutation this is the assertion that fires, and it fires on
       the layer that is actually detached rather than on a component count
       that never moves. Strict: an inner edge exactly ON the rim is a
       hairline touch, not the solid annulus the invariant is built on. */
    const innerEdge = r.radius - r.overhang;
    if (!(innerEdge < hub.radius)) {
      bad.push(`J3: ring ${L}'s foot runs inward only to ${innerEdge.toFixed(4)} mm, which is not inside the hub disc of ${hub.radius.toFixed(4)} mm — this layer is joined to nothing (note: the connectedness gate PASSES this state, see JUNCTION_SCOPE)`);
    }
    /* J4b — THE OVERLAP BOX. Each dimension against its own floor, none of
       which is a function of the layer index — which is exactly why the
       charter's >=1.5 x >=1.6 x >=1.0 mm worst case survives layers. */
    if (!(r.overhang >= 1.5 - 1e-12)) bad.push(`J4: ring ${L} overhang ${r.overhang} is below the 1.5 mm absolute floor`);
    if (!(r.width >= FOOT_MIN_WIDTH_MM - 1e-12)) bad.push(`J4: ring ${L} foot width ${r.width} is below FOOT_MIN_WIDTH_MM ${FOOT_MIN_WIDTH_MM}`);

    /* J1 — THE FEET ARE IN THE HUB PLANE, per layer. Moved here from
       formAssertions, where it only ever saw layer 0. Slot 0 of every layer
       sits at its own azimuth: RADIAL layer L starts at phase = L*layerPhase
       slots, so the ring tangent is NOT +y except where the phase is 0, and
       asserting [0,1,0] on every layer would have been a gate asserting a
       coincidence of the defaults. What is invariant is the RELATION: the
       width direction is perpendicular to the radial direction and lies in
       the hub plane, and the normal is the plane's own. */
    const ff = frames && frames[L];
    if (!Array.isArray(ff) || ff.length !== 3) {
      bad.push(`J1: ring ${L} foot frames: expected 3 rows, got ${JSON.stringify(ff && ff.length)}`);
      return;
    }
    ff.forEach((f, i) => {
      if (!(f.N[0] === 0 && f.N[1] === 0 && f.N[2] === 1)) bad.push(`J1: ring ${L} foot row ${i}: normal ${JSON.stringify(f.N)} is not exactly the hub plane's [0,0,1] — a curve reached the foot`);
      if (f.T[2] !== 0) bad.push(`J1: ring ${L} foot row ${i}: width direction ${JSON.stringify(f.T)} leaves the hub plane — a twist reached the foot`);
      /* THE RULING, ASSERTED: every foot of every layer sits at z = 0
         exactly. This is the whole of why no height control exists — a
         non-zero z here is the lifted-layer failure, and it is caught at the
         FIRST millimetre rather than at 2.5 mm where the voxel gate would
         eventually notice. */
      if (f.C[2] !== 0) bad.push(`J1: ring ${L} foot row ${i}: centre z = ${f.C[2]}, not exactly 0 — the foot left the hub plane (the junction derivation dies at |z| >= t = ${m.ringThickness}; the connectedness gate does not fire until roughly 2.5 mm)`);
      /* THE CROSS-SECTION, AGAINST EXPECTED-FROM-STATE — compared against
         footRing()'s OWN per-layer answer, never a re-derivation here. Exact,
         because both sides are literally the same double: the builder reads
         ring.width and ring.thickness rather than computing anything. */
      if (f.h !== r.width / 2) bad.push(`J1: ring ${L} foot row ${i}: half-width ${f.h} is not footRing()'s width/2 = ${r.width / 2} — something reached the foot by a second path`);
      if (f.t !== r.thickness) bad.push(`J1: ring ${L} foot row ${i}: thickness ${f.t} is not footRing()'s ${r.thickness} — a thickness gradient reached the foot`);
    });
  });

  /* THE PLACEMENT COMPONENTS THAT ARE EXACTLY IDENTITY AT ONE LAYER, asserted
     on their own rather than folded into the residual bound. Math.pow(x, 0)
     is exactly 1, `0 * layerTilt` is +0 over layerTilt's range, and
     `(0 * layerPhase * TAU) / count` is +0 — so byte-identity for scale, tilt
     and phase is structural and an EQUALITY is the honest assertion. Only the
     area-rule radius needs a tolerance, and keeping the two apart is what
     stops the tolerance covering for a leak in the other three. */
  if (!cont && m.layerCount === 1) {
    const r0 = layers[0];
    if (r0.scale !== 1) bad.push(`guard: layerCount 1 but ring 0 scale is ${r0.scale}, not exactly 1`);
    if (r0.tiltExtra !== 0) bad.push(`guard: layerCount 1 but ring 0 tiltExtra is ${r0.tiltExtra}, not exactly 0`);
    if (r0.phase !== 0) bad.push(`guard: layerCount 1 but ring 0 phase is ${r0.phase}, not exactly 0`);

    const g = m.ringGuardResidual;
    if (typeof g !== 'number') {
      bad.push(`guard: single-layer row reports residual ${JSON.stringify(g)} — the guard is not being cross-validated`);
    } else {
      const bound = GUARD_ULPS * Number.EPSILON * Math.abs(r0.derivedRadius);
      if (!(g <= bound)) {
        bad.push(`guard: area-rule residual ${g.toExponential(3)} exceeds ${GUARD_ULPS} ULP (${bound.toExponential(3)}) — the layered law and the pre-layer expression have genuinely diverged, not merely rounded`);
      }
    }
  } else if (m.ringGuardResidual !== null) {
    /* Above one layer — and in EVERY continuous row, where the pre-layer
       expression describes no reachable design because even a one-turn
       sequence has petalCount different feet — there IS no guard law, so a
       number here would be a claim nothing can support: the "null that
       renders like a value" defect this project has already been bitten by. */
    bad.push(`guard: ${cont ? 'a CONTINUOUS row' : `layerCount ${m.layerCount}`} reports a residual ${m.ringGuardResidual} — there is no single-layer guard law to compare against here`);
  }

  /* ===================================================================
     J5 — THERE ARE NO LAYERS. The property the whole session is about, and
     the only one that observes the quantizer mutation (see this function's
     header: that mutation passes both STL gates, the triangle count, and
     J1-J4). Asserted as a property of the arrangement, never by restating
     lambda_k = k/petalCount here — the law has one owner and this is not it.

     ASSERTED IN BOTH DIRECTIONS, because "strictly decreasing" checked only
     under CONTINUOUS would leave the ringed arm free to become a continuum by
     accident: a layered row must have EQUAL radii within nothing (its rings
     are distinct too) but must carry exactly `layerCount` of them, which the
     ring-count check above already makes. What the ringed arm asserts here
     instead is that it is NOT reporting a continuous sequence's shape. */
  if (cont) {
    let firstFlat = -1, firstTiltDrop = -1;
    for (let k = 0; k + 1 < layers.length; k++) {
      if (!(layers[k + 1].radius < layers[k].radius) || !(layers[k + 1].scale < layers[k].scale)) { firstFlat = k; break; }
    }
    for (let k = 0; k + 1 < layers.length; k++) {
      if (layers[k + 1].tiltExtra < layers[k].tiltExtra) { firstTiltDrop = k; break; }
    }
    if (firstFlat >= 0) {
      const a = layers[firstFlat], b = layers[firstFlat + 1];
      const flats = layers.filter((r, k) => k + 1 < layers.length && !(layers[k + 1].radius < r.radius)).length;
      bad.push(`J5: CONTINUOUS but rings ${firstFlat} and ${firstFlat + 1} do not step — radius ${a.radius} -> ${b.radius}, scale ${a.scale} -> ${b.scale} (${flats} of ${layers.length - 1} steps are flat). This is a layered arrangement wearing a continuous label, and NO other check here can see it: both STL gates pass it and so do J1-J4.`);
    }
    if (firstTiltDrop >= 0) bad.push(`J5: CONTINUOUS but tiltExtra decreases between rings ${firstTiltDrop} and ${firstTiltDrop + 1} (${layers[firstTiltDrop].tiltExtra} -> ${layers[firstTiltDrop + 1].tiltExtra}) — the affine angle is not monotone in depth`);
    const lastTilt = layers[layers.length - 1].tiltExtra;
    if (lastTilt > 0) {
      const stuck = layers.findIndex((r, k) => k + 1 < layers.length && !(layers[k + 1].tiltExtra > r.tiltExtra));
      if (stuck >= 0) bad.push(`J5: CONTINUOUS with a tilt gain (ends at ${lastTilt}°) but tiltExtra is flat between rings ${stuck} and ${stuck + 1} — the tilt is being quantized to whole turns`);
    } else if (!layers.every((r) => r.tiltExtra === 0)) {
      bad.push(`J5: the sequence ends at tiltExtra 0 but not every ring is exactly 0 — a tilt gain of zero must be zero everywhere`);
    }
  }

  /* ===================================================================
     J6 — THE QUANTIZER IDENTITY, an EQUALITY and deliberately not a bound.
     footRing() computes it (the guardResidual precedent: the owner
     cross-validates, the gate does not keep a second copy of the ringed law)
     and both gates assert exact zero here, because (m*petalCount)/petalCount
     is exactly m in IEEE-754 for every reachable m and n. A wrong-exponent
     continuous law passes J5 and fires this. */
  const qr = m.quantizerResiduals;
  if (cont) {
    if (!Array.isArray(qr) || qr.length !== m.layerCount) {
      bad.push(`J6: a CONTINUOUS row reports quantizerResiduals ${JSON.stringify(qr)} — expected one entry per turn (${m.layerCount}); the continuum is not being cross-validated against the ringed law at all`);
    } else {
      qr.forEach((q) => {
        if (q.dScale !== 0) bad.push(`J6: at k = ${q.m} x petalCount the continuous scale differs from the ringed layer ${q.m}'s by ${q.dScale} — the two are meant to be ONE law under two quantizers, and this is an exact identity, not a tolerance`);
        if (q.dTilt !== 0) bad.push(`J6: at k = ${q.m} x petalCount the continuous tiltExtra differs from the ringed layer ${q.m}'s by ${q.dTilt} — same identity, same exactness`);
      });
    }
  } else if (qr !== null) {
    bad.push(`J6: a ringed row reports quantizerResiduals ${JSON.stringify(qr)} — there is no second law to compare against here, and a claim nothing can make must read as absent`);
  }

  return bad;
}

/* THE EXPORT FLOOR, asserted through the REAL export path. The live build
   never floors — floorThickness() is a no-op outside export mode — so no
   live metric can answer "did the print stay above the minimum feature". The
   app prints `min sheet X mm` in the read-out after a real Get STL, from the
   accumulator that built the exported geometry; this reads that. Call it
   AFTER exportStl(). Returns failure strings. */
export async function exportFloorAssertion(page) {
  const txt = await page.evaluate(() => document.getElementById('readout')?.textContent || '');
  const mm = /min sheet ([0-9.]+) mm/.exec(txt);
  if (!mm) return [`export read-out carries no "min sheet" figure — the floor cannot be checked. Read-out was: ${txt.replace(/\s+/g, ' ').trim().slice(0, 200)}`];
  const min = Number(mm[1]);
  if (!(min >= MIN_FEATURE_MM - 1e-9)) return [`exported minimum sheet ${min} mm is below the ${MIN_FEATURE_MM} mm minimum feature — the export floor did not hold`];
  return [];
}

/* ===================================================================
   THE MATRIX — the shared sweep both gates run. Order matters: the SHIPPING
   DEFAULT is row 1, then the arrangement sweep, then every slider at min and
   max, then the centre rig, then the corners. Anything added to the registry
   must be added here — a control with no min/default/max rows is unknown, not
   passing.

   CENTRE COVERAGE STARTS FROM WHAT SHIPS — AND WHAT SHIPS CHANGED. Until the
   archetype ruling, `centerStyle` defaulted to NONE, so the default row and
   the whole arrangement sweep exercised the bare bloom for free. DISC is the
   default now, which silently DELETED that coverage: NONE went from "most
   rows" to zero rows in one character. That is precisely the flower's defect
   — it shipped a 7-piece bare bloom for months because every gate row enabled
   the thing that hid it — so NONE is now covered EXPLICITLY, by its own named
   row and by the same spread sweep the three styles get. A default is not
   coverage; it is only coverage until someone changes it.

   A SUB-CONTROL ROW CARRIES THE STYLE THAT ENABLES IT. `centerRise` at its
   maximum with centerStyle NONE builds no dome and measures nothing, while
   printing a label that says it did. Every sub-control row therefore sets its
   style alongside it — that is the same registration discipline the registry
   applies to visibility, applied to coverage.

   A CHOICE ROW IS ALSO THE KIND TEST. `centerStyle DOME` exercises readUI's
   coercion, applyConfig's read-back and fullStateDrift's comparison against a
   <select> rather than a range input. If any of those three had kept its own
   numeric rule, these rows fail the RUN on read-back rather than quietly
   measuring a NaN.
   =================================================================== */
const STYLES = ['DOME', 'DISC', 'RING'];
/* Every centre state the model can be in, NONE included. STYLES drives the
   sub-control blocks (NONE has no sub-controls to sweep); this drives the
   coverage that must exist whatever the default happens to be. */
const CENTRE_STATES = ['NONE', ...STYLES];
/* The sub-control each style enables — read from the registry's own
   visibility predicates, never hand-listed, so a new gated control cannot be
   added without the matrix noticing. */
function subControlsFor(style) {
  return CONTROLS.filter((c) => {
    const p = c.visibleWhen;
    return p && p.id === 'centerStyle' && Array.isArray(p.oneOf)
      && p.oneOf.length === 1 && p.oneOf[0] === style;
  });
}
const SLIDERS = () => CONTROLS.filter((c) => c.kind === 'slider');
const SHARED_CENTER = () => CONTROLS.filter((c) => c.id === 'centerSize');

/* THE LAYER SUB-CONTROLS — the same rule `subControlsFor(style)` applies to
   the centre, one level up, and derived from the registry's own predicates
   rather than hand-listed for the same reason: a new gated control must not
   be addable without the matrix noticing.

   WHY THEY ARE EXCLUDED FROM THE BLANKET SWEEP. `layerSize` at layerCount 1
   builds no second layer and measures NOTHING while printing a label saying
   it did — exactly the defect the centre rig's "a sub-control row carries the
   style that enables it" rule exists to prevent. They are swept under
   layerCount 3 in block 7 instead.

   `layerCount` ITSELF IS NOT EXCLUDED, and that has a pre-declared
   consequence: ALL MAX sets every non-centre slider to its maximum, which now
   means three layers, so those four rows legitimately MOVE. That is the
   matrix's own definition of "ALL MAX" growing, not a default moving — no
   default moves — and it is reported by `--partition-value` on the resolved
   layerCount rather than explained afterwards.

   DERIVED FROM `predicateDrivers`, NOT FROM THE PREDICATE'S SHAPE (Sep 1, and
   the change that forced it is the reason it is worth a note). This used to
   read `c.visibleWhen.id === 'layerCount'` — a SHAPE SNIFF, correct only
   while every layer sub-control's predicate happened to be a bare leaf. The
   continuous-spiral session gave `layerPhase` a second condition (it is
   meaningless with no whorls to offset), so its predicate became an `all`
   node with no `.id` at all — and the sniff would have silently stopped
   matching it, dropping it OUT of this set and INTO the blanket sweep, where
   a `layerPhase` row at layerCount 1 builds the shipping default and reports
   a pass under a label naming a control that did nothing. Exactly the defect
   the exclusion exists to prevent, reintroduced by a registry edit two files
   away. `predicateDrivers` is the registry's own answer to "what does this
   control depend on" and cannot drift from the predicate. */
const LAYER_SUBS = () => CONTROLS.filter((c) => c.visibleWhen && predicateDrivers(c.visibleWhen).has('layerCount'));
const LAYER_SUB_IDS = () => new Set(LAYER_SUBS().map((c) => c.id));
/* Every non-centre, non-layer-gated slider — the set the blanket sweep and
   the ALL MIN / ALL MAX corners are entitled to move. */
const SWEEPABLE = () => SLIDERS().filter((c) => c.role !== 'center' && !LAYER_SUB_IDS().has(c.id));

export function buildMatrix() {
  const rows = [{ label: 'DEFAULT (the shipping configuration)', set: [] }];

  /* 1. Arrangement, centre OFF — the shipping state, swept. */
  for (let n = 3; n <= 40; n++) {
    rows.push({ label: `petalCount ${n}`, set: [{ id: 'petalCount', value: String(n) }] });
  }
  for (const c of SLIDERS()) {
    if (c.id === 'petalCount') continue;                 // swept exhaustively above
    if (c.role === 'center') continue;                   // needs a style; see block 3
    if (LAYER_SUB_IDS().has(c.id)) continue;             // needs layerCount >= 2; see block 7
    rows.push({ label: `${c.id} min (${c.min})`, set: [{ id: c.id, value: String(c.min) }] });
    rows.push({ label: `${c.id} max (${c.max})`, set: [{ id: c.id, value: String(c.max) }] });
  }

  /* 1b. NAMED SILHOUETTE FAMILY CORNERS. A change report is only as good as
        where it sampled: the min/max rows above move one silhouette control
        at a time, and the region this change is actually FOR is the combined
        one — a broad tip against a shifted shoulder. These two are also the
        candidate defaults on the contact sheet, so a regression reads
        "ROSE-ish", not "config N". They are ROWS, not presets: the bloom
        has no preset machinery yet, and inventing one here would be a
        second source of truth for authored values. */
  for (const [name, sets] of [
    ['ROSE-ish (obovate, broad tip)', { petalBaseTaper: 2, petalTipTaper: 1.1, petalTipBreadth: 0.3 }],
    ['POPPY-ish (orbicular, truncate)', { petalBaseTaper: 0.6, petalTipTaper: 0.7, petalTipBreadth: 0.5 }],
  ]) {
    rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });
  }

  /* 2. Every style x spread {min, default, max} — the ruling's explicit ask.
        The spread-1.00 row of each style is also that style's plain
        defaults-elsewhere row. */
  const spread = CONTROLS.find((c) => c.id === 'spread');
  for (const style of CENTRE_STATES) {
    /* The tag is 'default', never the default's current VALUE spelled out: an
       earlier version hardcoded '1.00' beside `spread.default`, so the moment
       Eva ruled the default to 2.00 every one of these rows printed
       "spread 1.00 (2)" — a label naming a number it no longer held, in a
       passing gate. The value still appears, from the variable. */
    for (const [tag, v] of [['min', spread.min], ['default', spread.default], ['max', spread.max]]) {
      rows.push({
        label: `${style} × spread ${tag} (${v})`,
        set: [{ id: 'centerStyle', value: style }, { id: 'spread', value: String(v) }],
      });
    }
  }

  /* 3. Centre sub-controls at min and max, each under a style that shows it:
        the shared size under all three, each per-style control under its own. */
  for (const style of STYLES) {
    for (const c of [...SHARED_CENTER(), ...subControlsFor(style)]) {
      for (const [tag, v] of [['min', c.min], ['max', c.max]]) {
        rows.push({
          label: `${style} × ${c.id} ${tag} (${v})`,
          set: [{ id: 'centerStyle', value: style }, { id: c.id, value: String(v) }],
        });
      }
    }
  }

  /* 4. Corners. The two centre-OFF corners are the pre-change rows, kept
        byte-comparable; then the same extremes with each style turned on and
        its own controls pushed to the same end. ALL MIN × spread 0.60 is the
        deliberately ugly state: the ring is tighter than the area rule's
        derived radius and the feet cross the axis. */
  const extremes = [['MIN', 'min'], ['MAX', 'max']];
  /* PINNED to NONE, not inheriting it. These rows are named "(centre off)"
     and under a DISC default an inherited value would have made that label a
     lie — the exact defect shape this project keeps finding, arriving here as
     a side effect of a one-character default change rather than as new code. */
  for (const [tag, k] of extremes) {
    rows.push({
      label: `ALL ${tag} (centre off)`,
      set: [
        ...SWEEPABLE().map((c) => ({ id: c.id, value: String(c[k]) })),
        { id: 'centerStyle', value: 'NONE' },
      ],
    });
  }
  for (const [tag, k] of extremes) {
    for (const style of STYLES) {
      rows.push({
        label: `ALL ${tag} × ${style} ${k}`,
        set: [
          ...SWEEPABLE().map((c) => ({ id: c.id, value: String(c[k]) })),
          { id: 'centerStyle', value: style },
          ...[...SHARED_CENTER(), ...subControlsFor(style)].map((c) => ({ id: c.id, value: String(c[k]) })),
        ],
      });
    }
  }
  /* 5. THE PETAL'S 3D FORM — four curves at min and max, then the named
        corners. The four are swept SEPARATELY first and only then together,
        deliberately: they are four different things that all sound like
        "curve", and a matrix that only ever moved them as a block would
        make a regression in one read as a regression in any of them.

        The min/max rows themselves are NOT written here: block 1's sweep
        over every non-centre slider already produces them from the
        registry, and adding a second loop for the same eight rows is a
        second source of truth for coverage — it produced eight duplicate
        rows the first time this was written. This block adds only what
        that sweep cannot know: the named corners.

        Each named corner is ONE curve doing the thing it is for, so a red
        row says which curve broke in the words the project uses for it.
        ROLL CLAMP is the load-bearing one: it is the only row where the
        curvature floor actually binds, and the floor guards a failure
        (the sheet's inner offset surface inverting) that stays watertight
        and connected and is therefore invisible to both gates. */
  const ALL_FORM_MAX = { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 };
  const ALL_FORM_MIN = { petalCup: -0.8, petalSpineCurl: -180, petalRoll: -330, petalTwist: -180 };
  for (const [name, sets] of [
    ['FORM: QUILL (roll alone, toward a tube)', { petalRoll: 330 }],
    ['FORM: FIDDLEHEAD (spine curl alone)', { petalSpineCurl: 360 }],
    ['FORM: CONTORTED (twist alone)', { petalTwist: 180 }],
    ['FORM: REFLEXED (cup min x curl below the plane)', { petalCup: -0.8, petalSpineCurl: -180 }],
    ['FORM: ROLL CLAMP (roll max x narrowest petal)', { petalRoll: 330, petalWidth: 8 }],
    ['FORM: ALL MAX (all four curves together)', ALL_FORM_MAX],
    ['FORM: ALL MIN (all four curves together)', ALL_FORM_MIN],
  ]) {
    rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });
  }

  /* 5b. THE THICKNESS LAYER'S NAMED CORNERS. Block 1 already sweeps each of
        the three new sliders at min and max from the registry, and those six
        rows are not repeated here — a second loop over the same rows is a
        second source of truth for coverage, which is how eight duplicate
        form rows appeared the first time that block was written.

        WHAT BLOCK 1 CANNOT REACH, AND WHY THESE EXIST. `ALL MIN` IS NOT
        ALL-THIN: tipThinning's minimum is 0, i.e. no thinning at all, so the
        min/max sweep and both existing ALL corners leave the thin extreme —
        exactly the region this layer affects — unvisited. A default is not
        coverage and neither is an endpoint sweep. Each row below is one
        question:
          ALL THIN                the thinnest reachable sheet, tip and foot
                                  at once, with the centre pinned OFF so the
                                  label is not a lie under a DISC default.
          x DISC                  the same against what actually ships.
          x spread min            the tightest ring against the most delicate
                                  foot — the junction's worst overlap case,
                                  where the by-construction argument is
                                  thinnest.
          x petalCount 40         the most feet on the thinnest ring.
          x form max              a thin sheet LOWERS the roll curvature
                                  floor (the floor is one sheet thickness),
                                  so this is the only place the two clamps
                                  interact, and inverting the sheet stays
                                  watertight and connected — invisible to
                                  both gates by construction.
          x ALL MIN               the thin extreme at the smallest geometry,
                                  where the foot-width floor binds hardest.
          THICK GRADIENT          the ONLY state where tip thinning has real
                                  export headroom: 2.40 mm tapering to
                                  1.00 mm is a genuine 2.4:1 printed wedge,
                                  where at the 1.20 mm default the floor caps
                                  the printed taper at 17%.
          CLEFT x ALL THIN        three panels at minimum thickness: the lobe
                                  panels' shared slab is where a thin sheet
                                  could plausibly stop being a shared volume. */
  const ALL_THIN = { sheetThickness: 0.6, tipThinning: 0.8, footDelicacy: 0.25 };
  const thinRows = [
    ['THIN: ALL THIN (centre off)', { ...ALL_THIN, centerStyle: 'NONE' }],
    ['THIN: ALL THIN × DISC', { ...ALL_THIN, centerStyle: 'DISC' }],
    ['THIN: ALL THIN × spread min', { ...ALL_THIN, spread: 0.6 }],
    ['THIN: ALL THIN × petalCount 40', { ...ALL_THIN, petalCount: 40 }],
    ['THIN: ALL THIN × form max', { ...ALL_THIN, ...ALL_FORM_MAX }],
    ['THIN: ALL THIN × ALL MIN', { ...ALL_THIN, petalCount: 3, petalLength: 20, petalWidth: 8, petalTilt: 0 }],
    ['THIN: THICK GRADIENT (sheet max × thinning max)', { sheetThickness: 2.4, tipThinning: 0.8 }],
  ];
  for (const [name, sets] of thinRows) {
    rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });
  }

  /* 5c. THE CONVERGING TIP CAP's named rows (Eva's ruling, Sep 1). The four
        FORM corners already sit at petalTipBreadth 0, so they exercise the cap
        for free — but "for free" is exactly the coverage that disappears the
        moment a default moves, which is the lesson the centre rig cost. These
        are explicit, and each is one question:
          x roll max / twist max   where the cap's columns are LEAST PLANAR.
                                   A naive cap folds here and nowhere else.
          x taper max              the case a fixed-length cap could not have
                                   handled: at petalTipTaper 4 the print floor
                                   flattens TEN of 28 rows and the profile is
                                   0.125 mm by u = 0.80, so the cap entry is
                                   found by the crossing rule instead.
          truncate (breadth max)   THE HELD SIDE of the partition, named. It
                                   must not converge and must be bit-identical
                                   to the pre-ruling tree.
          x ALL THIN               the new cap on the thinnest sheet, where the
                                   terminal face is smallest in both modes. */
  for (const [name, sets] of [
    ['TIP: pointed × roll max', { petalRoll: 330 }],
    ['TIP: pointed × twist max', { petalTwist: 180 }],
    ['TIP: pointed × taper max (floor dominates)', { petalTipTaper: 4 }],
    ['TIP: truncate (breadth max) — must NOT converge', { petalTipBreadth: 0.6 }],
    ['TIP: pointed × ALL THIN', { ...ALL_THIN }],
  ]) {
    rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });
  }

  /* 6. CAPABILITY — the two non-shipping rows. Registry state is DEFAULTS
        (they set no control), so fullStateDrift still applies unchanged and
        the capability carries its own read-back in applyCapability(). These
        are last so the matrix still opens on what ships. */
  rows.push({ label: 'CAPABILITY: claw (non-monotone width)', set: [], capability: CAPABILITY_CLAW });
  rows.push({ label: 'CAPABILITY: cleft (two-span domain)', set: [], capability: CAPABILITY_CLEFT });
  /* CAPABILITY x FORM. The cleft row is the load-bearing one and it is not
     decoration: a clefted petal is three panels, and each lobe evaluates
     the row's cross-section over ITS OWN span of v. If the cross-section
     were ever a function of a panel's LOCAL parameter rather than the
     global v, the two lobes would sit on two different arcs and pull apart
     under roll — watertight, and in pieces. This row is what says they do
     not. The claw row does the same for a non-monotone width under a
     deformation that scales with width. */
  rows.push({ label: 'CAPABILITY: claw x form max', capability: CAPABILITY_CLAW,
    set: Object.entries(ALL_FORM_MAX).map(([id, value]) => ({ id, value: String(value) })) });
  rows.push({ label: 'CAPABILITY: cleft x roll max', capability: CAPABILITY_CLEFT,
    set: [{ id: 'petalRoll', value: '330' }] });
  rows.push({ label: 'CAPABILITY: cleft x all thin', capability: CAPABILITY_CLEFT,
    set: Object.entries(ALL_THIN).map(([id, value]) => ({ id, value: String(value) })) });

  /* 7. PLACEMENT. A CHOICE row is also the kind test (same reason the centre
        styles are), and SPIRAL is swept across the count range because the
        thing it changes IS the count-to-azimuth map — a single spiral row at
        the default would sample one point of the only axis this control has.

        THE SUB-8 ROWS ARE COVERAGE OF THE FLAGGED REGION, not of a defect.
        Low-count spiral is a shipping state, allowed and labelled; it is in
        the matrix because it is reachable, and because "the flag is on" must
        not be allowed to mean "the geometry went unmeasured". */
  for (const n of [3, 5, 7, SPIRAL_LEGIBLE_COUNT, 13, 21, 40]) {
    rows.push({
      label: `SPIRAL x petalCount ${n}${n < SPIRAL_LEGIBLE_COUNT ? ' (below the legibility flag)' : ''}`,
      set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: String(n) }],
    });
  }
  rows.push({ label: 'SPIRAL x defaults', set: [{ id: 'placement', value: 'SPIRAL' }] });

  /* 8. THE LAYER SUB-CONTROLS, each at min and max UNDER A LAYER COUNT THAT
        ENABLES IT — the centre rig's rule one level up. At layerCount 1 every
        one of these rows would build the shipping default and report a pass
        under a label naming a control that did nothing. */
  const maxLayers = CONTROLS.find((c) => c.id === 'layerCount').max;
  for (const c of LAYER_SUBS()) {
    for (const [tag, v] of [['min', c.min], ['max', c.max]]) {
      rows.push({
        label: `${maxLayers} layers x ${c.id} ${tag} (${v})`,
        set: [{ id: 'layerCount', value: String(maxLayers) }, { id: c.id, value: String(v) }],
      });
    }
  }
  /* Layer count x placement — the two arrangement axes crossed, because a
     spiral is applied PER LAYER (each whorl runs its own golden-angle
     sequence, offset by its own layerPhase) and nothing else in the matrix
     exercises that combination. */
  for (const n of [2, 3]) {
    for (const p of ['RADIAL', 'SPIRAL']) {
      rows.push({ label: `${n} layers x ${p}`, set: [{ id: 'layerCount', value: String(n) }, { id: 'placement', value: p }] });
    }
  }

  /* 9. THE LAYERED CORNERS — max layers against the extremes, because that is
        where this session's new failure modes live and A DEFAULT IS NOT
        COVERAGE. The junction argument under layers rests on every foot
        landing at radius <= hub radius, in the hub plane, with an overlap box
        floored independently of the layer index; each row below is one
        question about where that could stop being true.

        LAYERS x CENTRE OFF is here for the reason the centre rig learned the
        hard way: DISC is the default, so a layered BARE bloom is exercised by
        nothing unless it is written down. That is the exact shape of the
        flower's seven-piece bloom, which shipped for months because every
        gate row enabled the thing that hid it.

        THE COINCIDENCE ROW is the measured one: layerSize at its MAXIMUM with
        layerPhase 0 is as close to two identical whorls as the ranges allow.
        At layerSize 1.00 that state exports 14,832 non-manifold edges; the
        0.90 cap is what makes it unreachable, and this row is what says the
        cap works rather than asserting it. */
  const layeredCorners = [
    ['LAYERS: 3 x spread min', { layerCount: 3, spread: 0.6 }],
    ['LAYERS: 3 x ALL THIN', { layerCount: 3, ...ALL_THIN }],
    ['LAYERS: 3 x ALL THIN x spread min', { layerCount: 3, ...ALL_THIN, spread: 0.6 }],
    ['LAYERS: 3 x ALL THIN x spread min x petalCount 40', { layerCount: 3, ...ALL_THIN, spread: 0.6, petalCount: 40 }],
    ['LAYERS: 3 x ALL THIN x spread min x petalCount 3', { layerCount: 3, ...ALL_THIN, spread: 0.6, petalCount: 3 }],
    ['LAYERS: 3 x layerSize min x ALL THIN (deepest foot floored)', { layerCount: 3, layerSize: 0.35, ...ALL_THIN }],
    ['LAYERS: 3 x ALL FORM MAX', { layerCount: 3, ...ALL_FORM_MAX }],
    ['LAYERS: 3 x SPIRAL x ALL THIN x spread min x petalCount 40', { layerCount: 3, placement: 'SPIRAL', ...ALL_THIN, spread: 0.6, petalCount: 40 }],
    ['LAYERS: 3 x centre OFF (the layered BARE bloom)', { layerCount: 3, centerStyle: 'NONE' }],
    ['LAYERS: 3 x layerTilt max (135° effective at petalTilt max)', { layerCount: 3, layerTilt: 30, petalTilt: 75 }],
    ['LAYERS: 2 x layerSize max x layerPhase 0 (the coincidence corner)', { layerCount: 2, layerSize: 0.9, layerPhase: 0, layerTilt: 0 }],
    ['LAYERS: 3 x ALL MIN elsewhere', { layerCount: 3, petalCount: 3, petalLength: 20, petalWidth: 8, petalTilt: 0, spread: 0.6 }],
  ];
  for (const [name, sets] of layeredCorners) {
    rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });
  }
  /* A clefted petal on an inner layer: three panels at a layer scale the
     capability rows have never been evaluated at. The cleft's lobes are the
     one place a panel seam could stop being a shared volume, and layerSize
     scales the blade that carries it. */
  rows.push({ label: 'CAPABILITY: cleft x 3 layers', capability: CAPABILITY_CLEFT,
    set: [{ id: 'layerCount', value: '3' }] });

  /* 10. THE CONTINUOUS SPIRAL — one sequence winding inward, every petal on
         its own ring (Sep 1). This block is the region the change affects,
         and it is sized like the two blocks it parallels rather than by
         taste: SPIRAL got a count sweep because the thing it changes IS the
         count-to-azimuth map, and layers got named corners because that is
         where their failure modes live. CONTINUOUS needs both, because it
         changes the count-to-RING map and reaches deeper than layers can.

         THE COUNT SWEEP IS THE SAME SEVEN COUNTS AS SPIRAL'S, at three turns
         so the sequence is long enough for the map to be exercised at all —
         a continuous row at one turn samples 0.875 of a turn and would leave
         the deep end of every count unmeasured. The sub-8 counts are here for
         SPIRAL's reason (a flagged shipping state must not go unmeasured) with
         one difference worth knowing: under CONTINUOUS the flag counts the
         SEQUENCE, so petalCount 3 x 3 turns is 9 elements and is NOT flagged.
         That is the flag's own claim tracking the geometry rather than the
         slider, and the panel gate asserts it in both directions.

         THE CORNERS ARE THE CONTINUUM'S OWN, not the layered ones renamed:
         `layerSize` min at three turns is where the sequence runs deepest
         (scale 0.35^2.975 = 0.0440, a 1.54 mm blade on a floored 1.60 mm
         foot, 67 of 120 feet at the floor) and `layerSize` max is where it is
         shallowest and closest to the coincidence the 0.90 cap exists for.
         The tilt corner is genuinely NEW rather than inherited: continuous
         accumulates 86.25 degrees of tilt gain at petalTilt/layerTilt max
         against the layered arm's 60, so the effective tilt reaches 161.25
         degrees — past the 135-degree state the charter photographed, and a
         state no combination of the layered controls can reach.

         THE BARE CONTINUOUS BLOOM IS HERE FOR THE FLOWER'S OWN LESSON: DISC
         is the default, so a centre-off continuum is exercised by nothing
         unless it is written down, and that is the exact shape of the
         seven-piece bloom that shipped for months. */
  for (const n of [3, 5, 7, SPIRAL_LEGIBLE_COUNT, 13, 21, 40]) {
    rows.push({
      label: `CONTINUOUS x petalCount ${n} x 3 turns (${n * 3} in sequence)`,
      set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'petalCount', value: String(n) }, { id: 'layerCount', value: '3' }],
    });
  }
  rows.push({ label: 'CONTINUOUS x defaults (one turn)', set: [{ id: 'placement', value: 'CONTINUOUS' }] });
  rows.push({ label: 'CONTINUOUS x 2 turns', set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'layerCount', value: '2' }] });
  rows.push({ label: 'CONTINUOUS x 3 turns', set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'layerCount', value: '3' }] });

  const continuousCorners = [
    ['CONT: 3 turns x layerSize min x petalCount 40 (the deepest foot)', { placement: 'CONTINUOUS', layerCount: 3, layerSize: 0.35, petalCount: 40 }],
    ['CONT: 3 turns x layerSize max x petalCount 40 (the shallowest gradient)', { placement: 'CONTINUOUS', layerCount: 3, layerSize: 0.9, petalCount: 40 }],
    ['CONT: 3 turns x ALL THIN x spread min x petalCount 40 (the overlap box at 120 rings)', { placement: 'CONTINUOUS', layerCount: 3, ...ALL_THIN, spread: 0.6, petalCount: 40 }],
    ['CONT: 3 turns x ALL THIN x spread min x petalCount 3 (the sparsest continuum)', { placement: 'CONTINUOUS', layerCount: 3, ...ALL_THIN, spread: 0.6, petalCount: 3 }],
    ['CONT: 3 turns x layerSize min x ALL THIN x petalCount 40 (deepest foot, thinnest sheet)', { placement: 'CONTINUOUS', layerCount: 3, layerSize: 0.35, ...ALL_THIN, petalCount: 40 }],
    ['CONT: 3 turns x footDelicacy min (floored from ring 1)', { placement: 'CONTINUOUS', layerCount: 3, footDelicacy: 0.25 }],
    ['CONT: 3 turns x spread max (the hub plate under a continuum)', { placement: 'CONTINUOUS', layerCount: 3, spread: 6 }],
    ['CONT: 3 turns x layerTilt max x petalTilt max (161.25° effective — past the layered 135°)', { placement: 'CONTINUOUS', layerCount: 3, layerTilt: 30, petalTilt: 75 }],
    ['CONT: 3 turns x ALL FORM MAX', { placement: 'CONTINUOUS', layerCount: 3, ...ALL_FORM_MAX }],
    ['CONT: 3 turns x centre OFF (the continuous BARE bloom)', { placement: 'CONTINUOUS', layerCount: 3, centerStyle: 'NONE' }],
    ['CONT: 3 turns x ALL MIN elsewhere', { placement: 'CONTINUOUS', layerCount: 3, petalCount: 3, petalLength: 20, petalWidth: 8, petalTilt: 0, spread: 0.6 }],
  ];
  for (const [name, sets] of continuousCorners) {
    rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });
  }
  /* A clefted petal on a deep continuous ring: three panels at a ring scale
     nothing else evaluates, and the panel seam is the one place a lobe pair
     could stop being a shared volume. */
  rows.push({ label: 'CAPABILITY: cleft x CONTINUOUS x 3 turns', capability: CAPABILITY_CLEFT,
    set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'layerCount', value: '3' }] });

  return rows;
}

/* The pre-spread, pre-centre matrix, frozen. tools/diff-bloom-bytes.mjs runs
   exactly these rows on both trees so the byte comparison is like-for-like:
   the new controls sit at their defaults and every one of these rows must
   come back bit-identical. Frozen means frozen — it is a record of what the
   scaffold's matrix was at 37e160d, not a view over the live registry, so it
   must never be rewritten to track a registry change. Note that its rows PIN
   only the four original sliders, so they inherit every later default — a
   deliberate change to one (e.g. the spread default) moves them all, by
   design. See diff-bloom-bytes.mjs's header on why that is not a regression. */
export function legacyMatrix() {
  const ids = ['petalCount', 'petalLength', 'petalWidth', 'petalTilt'];
  const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
  const rows = [{ label: 'DEFAULT (the shipping configuration)', set: [] }];
  for (let n = 3; n <= 40; n++) rows.push({ label: `petalCount ${n}`, set: [{ id: 'petalCount', value: String(n) }] });
  for (const id of ids.slice(1)) {
    rows.push({ label: `${id} min (${byId[id].min})`, set: [{ id, value: String(byId[id].min) }] });
    rows.push({ label: `${id} max (${byId[id].max})`, set: [{ id, value: String(byId[id].max) }] });
  }
  rows.push({ label: 'ALL MIN (fewest, smallest, flat)', set: ids.map((id) => ({ id, value: String(byId[id].min) })) });
  rows.push({ label: 'ALL MAX (most petals, largest, steepest tilt)', set: ids.map((id) => ({ id, value: String(byId[id].max) })) });
  return rows;
}

/* ===================================================================
   phase3Matrix() — THE 86 ROWS AS THEY STOOD AT 6626961, frozen.

   The like-for-like baseline for the FORM layer, standing to it exactly as
   phase2Matrix() stands to the silhouette engine. A NEW frozen matrix
   beside the old one, never an edit to it: phase2Matrix()'s own header says
   so, and the reason is that a frozen matrix is a record of one commit
   rather than a view over anything. Both now run, and both must report zero.

   FROZEN AGAINST: 6626961 ("Bloom: the petal silhouette model — width
   profile over a trimmable domain", #114), the commit immediately before
   the four form curves.

   WHY BOTH MATRICES AND NOT JUST THIS ONE. phase2Matrix covers the centre
   rig and the arrangement as they stood two commits back and pins the
   controls that existed then; phase3Matrix adds the three silhouette
   controls and the two named family corners. They overlap heavily and that
   is the point — the 76 are the rows whose bytes have now been unmoved
   across two consecutive feature layers, which is a stronger statement than
   either matrix makes alone.

   Row set and values are LITERALS here, deliberately, so a later range
   change cannot silently rewrite what the baseline means. Transcribing 86
   rows by hand is exactly the sort of thing that looks right and is not, so
   it is not trusted either: `--verify-frozen` proves this function deep-
   equal to the base commit's own buildMatrix() output rather than to a
   reading of it.

   These rows PIN only the controls that existed at 6626961, so they inherit
   every later default. The four form controls default to exactly 0, which
   is exactly flat, so the expected result here is 0 of 86 moved.
   =================================================================== */
export function phase3Matrix() {
  const rows = [{ label: 'DEFAULT (the shipping configuration)', set: [] }];
  for (let n = 3; n <= 40; n++) rows.push({ label: `petalCount ${n}`, set: [{ id: 'petalCount', value: String(n) }] });

  /* Frozen ranges — the values these controls carried at 6626961. */
  const RANGE = {
    petalCount: [3, 40], petalLength: [20, 60], petalWidth: [8, 30], petalTilt: [0, 75],
    petalBaseTaper: [0.3, 3], petalTipTaper: [0.6, 4], petalTipBreadth: [0, 0.6], spread: [0.6, 6],
  };
  const SPREAD_DEFAULT = 2;
  const CENTER = {
    DOME: [['centerSize', 0.25, 1], ['centerRise', 0.15, 1.2]],
    DISC: [['centerSize', 0.25, 1], ['centerDish', 0, 0.9]],
    RING: [['centerSize', 0.25, 1], ['centerBore', 0.2, 0.75]],
  };
  const STYLES_F = ['DOME', 'DISC', 'RING'];
  /* Order matters: it is the order buildMatrix emitted at 6626961, which is
     registry order for the sliders. */
  const SWEPT = ['petalLength', 'petalWidth', 'petalTilt', 'petalBaseTaper', 'petalTipTaper', 'petalTipBreadth', 'spread'];

  for (const id of SWEPT) {
    rows.push({ label: `${id} min (${RANGE[id][0]})`, set: [{ id, value: String(RANGE[id][0]) }] });
    rows.push({ label: `${id} max (${RANGE[id][1]})`, set: [{ id, value: String(RANGE[id][1]) }] });
  }
  for (const [name, sets] of [
    ['ROSE-ish (obovate, broad tip)', { petalBaseTaper: 2, petalTipTaper: 1.1, petalTipBreadth: 0.3 }],
    ['POPPY-ish (orbicular, truncate)', { petalBaseTaper: 0.6, petalTipTaper: 0.7, petalTipBreadth: 0.5 }],
  ]) rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });

  for (const style of STYLES_F) {
    for (const [tag, v] of [['min', RANGE.spread[0]], ['default', SPREAD_DEFAULT], ['max', RANGE.spread[1]]]) {
      rows.push({ label: `${style} × spread ${tag} (${v})`, set: [{ id: 'centerStyle', value: style }, { id: 'spread', value: String(v) }] });
    }
  }
  for (const style of STYLES_F) {
    for (const [id, lo, hi] of CENTER[style]) {
      for (const [tag, v] of [['min', lo], ['max', hi]]) {
        rows.push({ label: `${style} × ${id} ${tag} (${v})`, set: [{ id: 'centerStyle', value: style }, { id, value: String(v) }] });
      }
    }
  }
  const ALL = ['petalCount', 'petalLength', 'petalWidth', 'petalTilt', 'petalBaseTaper', 'petalTipTaper', 'petalTipBreadth', 'spread'];
  for (const [tag, k] of [['MIN', 0], ['MAX', 1]]) {
    rows.push({ label: `ALL ${tag} (centre off)`, set: ALL.map((id) => ({ id, value: String(RANGE[id][k]) })) });
  }
  for (const [tag, k] of [['MIN', 0], ['MAX', 1]]) {
    for (const style of STYLES_F) {
      rows.push({
        label: `ALL ${tag} × ${style} ${k === 0 ? 'min' : 'max'}`,
        set: [
          ...ALL.map((id) => ({ id, value: String(RANGE[id][k]) })),
          { id: 'centerStyle', value: style },
          ...CENTER[style].map(([id, lo, hi]) => ({ id, value: String(k === 0 ? lo : hi) })),
        ],
      });
    }
  }
  rows.push({ label: 'CAPABILITY: claw (non-monotone width)', set: [], capability: CAPABILITY_CLAW });
  rows.push({ label: 'CAPABILITY: cleft (two-span domain)', set: [], capability: CAPABILITY_CLEFT });
  return rows;
}

/* THE COMMIT EACH FROZEN MATRIX CLAIMS TO SNAPSHOT — one list, read by
   `--verify-frozen` in CI so the claim is checked rather than asserted, and
   quoted by each function's own header. Until Aug 31 the claim lived only in
   those headers, beside a citation of a check that did not exist; a name for
   a commit is not a comparison against it. Never edit an entry: a frozen
   matrix is a record of one commit, so a new baseline is a NEW entry beside
   the old ones. */
export const FROZEN_BASE_COMMITS = {
  phase2: '21d4602',   // the A/B centre rig, spread exposed — before the silhouette model
  phase3: '6626961',   // the silhouette model — before the four form curves
  phase4: '3c542fb',   // the form curves and the DISC default — before the thickness layer
  phase5: 'deacded',   // the thickness layer, tip cap and sectioned panel — before layers and spiral
};

/* ===================================================================
   phase4Matrix() — THE 106 ROWS AS THEY STOOD AT 3c542fb, frozen.

   The like-for-like baseline for the THICKNESS layer, standing to it exactly
   as phase3Matrix() stands to the form layer and phase2Matrix() to the
   silhouette engine. A NEW frozen matrix beside the older two, never an edit
   to either — a frozen matrix is a record of one commit, not a view over
   anything.

   FROZEN AGAINST: 3c542fb ("Bloom: the petal's 3D form — four curves, and
   DISC as the shipping centre", #115), the commit immediately before the
   thickness profile and foot delicacy.

   WHY IT IS THE STRONGEST OF THE THREE. phase2 (76) and phase3 (86) each
   predate a feature layer, so neither exercises the FORM curves; this one
   carries all seven named FORM corners and all four CAPABILITY rows, so a
   thickness change that moved a curled, rolled or clefted petal's bytes at
   the new defaults would show here and nowhere else. All three still run:
   the 76 are the rows unmoved across THREE consecutive feature layers.

   Row set and values are LITERALS, deliberately, so a later range change
   cannot silently rewrite what the baseline means. Transcribing 106 rows by
   hand is exactly the sort of thing that looks right and is not — and this
   session found that the `--verify-frozen` the older headers cited as the
   remedy DID NOT EXIST. It does now
   (tools/diff-bloom-bytes.mjs --verify-frozen --phase4 --base <worktree>),
   and this function is proved deep-equal to 3c542fb's own buildMatrix()
   rather than to a careful reading of it.

   These rows PIN only the controls that existed at 3c542fb, so they inherit
   every later default. The three thickness controls default to values that
   reproduce the constant exactly, so the expected result here is 0 of 106
   moved. What that CANNOT show is a leak inside the new controls themselves
   — every frozen row sits at their defaults, which is the same blindness
   the form layer measured on --phase3. The live-matrix partition is the
   instrument for those.
   =================================================================== */
export function phase4Matrix() {
  const rows = [{ label: 'DEFAULT (the shipping configuration)', set: [] }];
  for (let n = 3; n <= 40; n++) rows.push({ label: `petalCount ${n}`, set: [{ id: 'petalCount', value: String(n) }] });

  /* Frozen ranges — the values these controls carried at 3c542fb. */
  const RANGE = {
    petalCount: [3, 40], petalLength: [20, 60], petalWidth: [8, 30], petalTilt: [0, 75],
    petalBaseTaper: [0.3, 3], petalTipTaper: [0.6, 4], petalTipBreadth: [0, 0.6],
    petalCup: [-0.8, 1.2], petalSpineCurl: [-180, 360], petalRoll: [-330, 330], petalTwist: [-180, 180],
    spread: [0.6, 6],
  };
  const SPREAD_DEFAULT = 2;
  const CENTER = {
    DOME: [['centerSize', 0.25, 1], ['centerRise', 0.15, 1.2]],
    DISC: [['centerSize', 0.25, 1], ['centerDish', 0, 0.9]],
    RING: [['centerSize', 0.25, 1], ['centerBore', 0.2, 0.75]],
  };
  const STYLES_F = ['DOME', 'DISC', 'RING'];
  const CENTRE_STATES_F = ['NONE', ...STYLES_F];
  /* Registry order for the sliders, petalCount swept exhaustively above. */
  const SWEPT = ['petalLength', 'petalWidth', 'petalTilt', 'petalBaseTaper', 'petalTipTaper', 'petalTipBreadth',
    'petalCup', 'petalSpineCurl', 'petalRoll', 'petalTwist', 'spread'];
  const ALL = ['petalCount', ...SWEPT];

  for (const id of SWEPT) {
    rows.push({ label: `${id} min (${RANGE[id][0]})`, set: [{ id, value: String(RANGE[id][0]) }] });
    rows.push({ label: `${id} max (${RANGE[id][1]})`, set: [{ id, value: String(RANGE[id][1]) }] });
  }
  for (const [name, sets] of [
    ['ROSE-ish (obovate, broad tip)', { petalBaseTaper: 2, petalTipTaper: 1.1, petalTipBreadth: 0.3 }],
    ['POPPY-ish (orbicular, truncate)', { petalBaseTaper: 0.6, petalTipTaper: 0.7, petalTipBreadth: 0.5 }],
  ]) rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });

  for (const style of CENTRE_STATES_F) {
    for (const [tag, v] of [['min', RANGE.spread[0]], ['default', SPREAD_DEFAULT], ['max', RANGE.spread[1]]]) {
      rows.push({ label: `${style} \u00d7 spread ${tag} (${v})`, set: [{ id: 'centerStyle', value: style }, { id: 'spread', value: String(v) }] });
    }
  }
  for (const style of STYLES_F) {
    for (const [id, lo, hi] of CENTER[style]) {
      for (const [tag, v] of [['min', lo], ['max', hi]]) {
        rows.push({ label: `${style} \u00d7 ${id} ${tag} (${v})`, set: [{ id: 'centerStyle', value: style }, { id, value: String(v) }] });
      }
    }
  }
  for (const [tag, k] of [['MIN', 0], ['MAX', 1]]) {
    rows.push({ label: `ALL ${tag} (centre off)`, set: [...ALL.map((id) => ({ id, value: String(RANGE[id][k]) })), { id: 'centerStyle', value: 'NONE' }] });
  }
  for (const [tag, k] of [['MIN', 0], ['MAX', 1]]) {
    for (const style of STYLES_F) {
      rows.push({
        label: `ALL ${tag} \u00d7 ${style} ${k === 0 ? 'min' : 'max'}`,
        set: [
          ...ALL.map((id) => ({ id, value: String(RANGE[id][k]) })),
          { id: 'centerStyle', value: style },
          ...CENTER[style].map(([id, lo, hi]) => ({ id, value: String(k === 0 ? lo : hi) })),
        ],
      });
    }
  }
  const ALL_FORM_MAX_F = { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 };
  const ALL_FORM_MIN_F = { petalCup: -0.8, petalSpineCurl: -180, petalRoll: -330, petalTwist: -180 };
  for (const [name, sets] of [
    ['FORM: QUILL (roll alone, toward a tube)', { petalRoll: 330 }],
    ['FORM: FIDDLEHEAD (spine curl alone)', { petalSpineCurl: 360 }],
    ['FORM: CONTORTED (twist alone)', { petalTwist: 180 }],
    ['FORM: REFLEXED (cup min x curl below the plane)', { petalCup: -0.8, petalSpineCurl: -180 }],
    ['FORM: ROLL CLAMP (roll max x narrowest petal)', { petalRoll: 330, petalWidth: 8 }],
    ['FORM: ALL MAX (all four curves together)', ALL_FORM_MAX_F],
    ['FORM: ALL MIN (all four curves together)', ALL_FORM_MIN_F],
  ]) rows.push({ label: name, set: Object.entries(sets).map(([id, value]) => ({ id, value: String(value) })) });

  rows.push({ label: 'CAPABILITY: claw (non-monotone width)', set: [], capability: CAPABILITY_CLAW });
  rows.push({ label: 'CAPABILITY: cleft (two-span domain)', set: [], capability: CAPABILITY_CLEFT });
  rows.push({ label: 'CAPABILITY: claw x form max', capability: CAPABILITY_CLAW,
    set: Object.entries(ALL_FORM_MAX_F).map(([id, value]) => ({ id, value: String(value) })) });
  rows.push({ label: 'CAPABILITY: cleft x roll max', capability: CAPABILITY_CLEFT,
    set: [{ id: 'petalRoll', value: '330' }] });
  return rows;
}

/* ===================================================================
   phase5Matrix() — THE 125 ROWS AS THEY STOOD AT deacded, frozen.

   The like-for-like baseline for the ARRANGEMENT layer (layers and spiral),
   standing to it exactly as phase4Matrix() stands to the thickness layer. A
   NEW frozen matrix beside the older three, never an edit to any of them: a
   frozen matrix is a record of one commit, not a view over anything.

   FROZEN AGAINST: deacded ("Bloom: group the control panel into sections,
   declared in the registry", #120), the commit immediately before layerCount,
   layerSize, layerPhase, layerTilt and placement.

   WHY IT IS NOW THE STRONGEST OF THE FOUR, on the same reasoning that made
   phase4 the strongest of three: it is the only frozen matrix that carries
   the THICKNESS layer's own corners — the seven THIN rows, the five TIP rows
   and the converging tip cap's held/moved partition — as well as everything
   phase4 had. An arrangement change that moved a thin, capped or clefted
   petal's bytes at the new defaults would show here and in none of the
   others. All four still run: the 76 are the rows unmoved across FOUR
   consecutive feature layers.

   GENERATED FROM deacded's OWN buildMatrix(), not transcribed — 125 rows by
   hand is exactly the sort of thing that looks right and is not — and then
   proved deep-equal to it by
   `node tools/diff-bloom-bytes.mjs --verify-frozen --phase5 --base <worktree>`,
   which runs in CI. The rows are LITERALS regardless, so a later range change
   cannot silently rewrite what the baseline means.

   These rows PIN only the controls that existed at deacded, so they inherit
   every later default. layerCount defaults to 1 and placement to RADIAL,
   which take the pre-layer path verbatim, so the expected result is 0 of 125
   moved. What that CANNOT show is a leak inside the new controls themselves —
   every frozen row sits at their defaults, the same blindness every frozen
   matrix has to the layer that follows it. The live-matrix partition on the
   resolved (layerCount, placement) is the instrument for those.
   =================================================================== */
export function phase5Matrix() {
  return [
  { label: `DEFAULT (the shipping configuration)`, set: [] },
  { label: `petalCount 3`, set: [{ id: 'petalCount', value: '3' }] },
  { label: `petalCount 4`, set: [{ id: 'petalCount', value: '4' }] },
  { label: `petalCount 5`, set: [{ id: 'petalCount', value: '5' }] },
  { label: `petalCount 6`, set: [{ id: 'petalCount', value: '6' }] },
  { label: `petalCount 7`, set: [{ id: 'petalCount', value: '7' }] },
  { label: `petalCount 8`, set: [{ id: 'petalCount', value: '8' }] },
  { label: `petalCount 9`, set: [{ id: 'petalCount', value: '9' }] },
  { label: `petalCount 10`, set: [{ id: 'petalCount', value: '10' }] },
  { label: `petalCount 11`, set: [{ id: 'petalCount', value: '11' }] },
  { label: `petalCount 12`, set: [{ id: 'petalCount', value: '12' }] },
  { label: `petalCount 13`, set: [{ id: 'petalCount', value: '13' }] },
  { label: `petalCount 14`, set: [{ id: 'petalCount', value: '14' }] },
  { label: `petalCount 15`, set: [{ id: 'petalCount', value: '15' }] },
  { label: `petalCount 16`, set: [{ id: 'petalCount', value: '16' }] },
  { label: `petalCount 17`, set: [{ id: 'petalCount', value: '17' }] },
  { label: `petalCount 18`, set: [{ id: 'petalCount', value: '18' }] },
  { label: `petalCount 19`, set: [{ id: 'petalCount', value: '19' }] },
  { label: `petalCount 20`, set: [{ id: 'petalCount', value: '20' }] },
  { label: `petalCount 21`, set: [{ id: 'petalCount', value: '21' }] },
  { label: `petalCount 22`, set: [{ id: 'petalCount', value: '22' }] },
  { label: `petalCount 23`, set: [{ id: 'petalCount', value: '23' }] },
  { label: `petalCount 24`, set: [{ id: 'petalCount', value: '24' }] },
  { label: `petalCount 25`, set: [{ id: 'petalCount', value: '25' }] },
  { label: `petalCount 26`, set: [{ id: 'petalCount', value: '26' }] },
  { label: `petalCount 27`, set: [{ id: 'petalCount', value: '27' }] },
  { label: `petalCount 28`, set: [{ id: 'petalCount', value: '28' }] },
  { label: `petalCount 29`, set: [{ id: 'petalCount', value: '29' }] },
  { label: `petalCount 30`, set: [{ id: 'petalCount', value: '30' }] },
  { label: `petalCount 31`, set: [{ id: 'petalCount', value: '31' }] },
  { label: `petalCount 32`, set: [{ id: 'petalCount', value: '32' }] },
  { label: `petalCount 33`, set: [{ id: 'petalCount', value: '33' }] },
  { label: `petalCount 34`, set: [{ id: 'petalCount', value: '34' }] },
  { label: `petalCount 35`, set: [{ id: 'petalCount', value: '35' }] },
  { label: `petalCount 36`, set: [{ id: 'petalCount', value: '36' }] },
  { label: `petalCount 37`, set: [{ id: 'petalCount', value: '37' }] },
  { label: `petalCount 38`, set: [{ id: 'petalCount', value: '38' }] },
  { label: `petalCount 39`, set: [{ id: 'petalCount', value: '39' }] },
  { label: `petalCount 40`, set: [{ id: 'petalCount', value: '40' }] },
  { label: `petalLength min (20)`, set: [{ id: 'petalLength', value: '20' }] },
  { label: `petalLength max (60)`, set: [{ id: 'petalLength', value: '60' }] },
  { label: `petalWidth min (8)`, set: [{ id: 'petalWidth', value: '8' }] },
  { label: `petalWidth max (30)`, set: [{ id: 'petalWidth', value: '30' }] },
  { label: `petalBaseTaper min (0.3)`, set: [{ id: 'petalBaseTaper', value: '0.3' }] },
  { label: `petalBaseTaper max (3)`, set: [{ id: 'petalBaseTaper', value: '3' }] },
  { label: `petalTipTaper min (0.6)`, set: [{ id: 'petalTipTaper', value: '0.6' }] },
  { label: `petalTipTaper max (4)`, set: [{ id: 'petalTipTaper', value: '4' }] },
  { label: `petalTipBreadth min (0)`, set: [{ id: 'petalTipBreadth', value: '0' }] },
  { label: `petalTipBreadth max (0.6)`, set: [{ id: 'petalTipBreadth', value: '0.6' }] },
  { label: `petalCup min (-0.8)`, set: [{ id: 'petalCup', value: '-0.8' }] },
  { label: `petalCup max (1.2)`, set: [{ id: 'petalCup', value: '1.2' }] },
  { label: `petalTilt min (0)`, set: [{ id: 'petalTilt', value: '0' }] },
  { label: `petalTilt max (75)`, set: [{ id: 'petalTilt', value: '75' }] },
  { label: `petalSpineCurl min (-180)`, set: [{ id: 'petalSpineCurl', value: '-180' }] },
  { label: `petalSpineCurl max (360)`, set: [{ id: 'petalSpineCurl', value: '360' }] },
  { label: `petalRoll min (-330)`, set: [{ id: 'petalRoll', value: '-330' }] },
  { label: `petalRoll max (330)`, set: [{ id: 'petalRoll', value: '330' }] },
  { label: `petalTwist min (-180)`, set: [{ id: 'petalTwist', value: '-180' }] },
  { label: `petalTwist max (180)`, set: [{ id: 'petalTwist', value: '180' }] },
  { label: `sheetThickness min (0.6)`, set: [{ id: 'sheetThickness', value: '0.6' }] },
  { label: `sheetThickness max (2.4)`, set: [{ id: 'sheetThickness', value: '2.4' }] },
  { label: `tipThinning min (0)`, set: [{ id: 'tipThinning', value: '0' }] },
  { label: `tipThinning max (0.8)`, set: [{ id: 'tipThinning', value: '0.8' }] },
  { label: `footDelicacy min (0.25)`, set: [{ id: 'footDelicacy', value: '0.25' }] },
  { label: `footDelicacy max (1)`, set: [{ id: 'footDelicacy', value: '1' }] },
  { label: `spread min (0.6)`, set: [{ id: 'spread', value: '0.6' }] },
  { label: `spread max (6)`, set: [{ id: 'spread', value: '6' }] },
  { label: `ROSE-ish (obovate, broad tip)`, set: [{ id: 'petalBaseTaper', value: '2' }, { id: 'petalTipTaper', value: '1.1' }, { id: 'petalTipBreadth', value: '0.3' }] },
  { label: `POPPY-ish (orbicular, truncate)`, set: [{ id: 'petalBaseTaper', value: '0.6' }, { id: 'petalTipTaper', value: '0.7' }, { id: 'petalTipBreadth', value: '0.5' }] },
  { label: `NONE × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'NONE' }, { id: 'spread', value: '0.6' }] },
  { label: `NONE × spread default (2)`, set: [{ id: 'centerStyle', value: 'NONE' }, { id: 'spread', value: '2' }] },
  { label: `NONE × spread max (6)`, set: [{ id: 'centerStyle', value: 'NONE' }, { id: 'spread', value: '6' }] },
  { label: `DOME × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'spread', value: '0.6' }] },
  { label: `DOME × spread default (2)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'spread', value: '2' }] },
  { label: `DOME × spread max (6)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'spread', value: '6' }] },
  { label: `DISC × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'spread', value: '0.6' }] },
  { label: `DISC × spread default (2)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'spread', value: '2' }] },
  { label: `DISC × spread max (6)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'spread', value: '6' }] },
  { label: `RING × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'spread', value: '0.6' }] },
  { label: `RING × spread default (2)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'spread', value: '2' }] },
  { label: `RING × spread max (6)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'spread', value: '6' }] },
  { label: `DOME × centerSize min (0.25)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '0.25' }] },
  { label: `DOME × centerSize max (1)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '1' }] },
  { label: `DOME × centerRise min (0.15)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerRise', value: '0.15' }] },
  { label: `DOME × centerRise max (1.2)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerRise', value: '1.2' }] },
  { label: `DISC × centerSize min (0.25)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '0.25' }] },
  { label: `DISC × centerSize max (1)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '1' }] },
  { label: `DISC × centerDish min (0)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerDish', value: '0' }] },
  { label: `DISC × centerDish max (0.9)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerDish', value: '0.9' }] },
  { label: `RING × centerSize min (0.25)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '0.25' }] },
  { label: `RING × centerSize max (1)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '1' }] },
  { label: `RING × centerBore min (0.2)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerBore', value: '0.2' }] },
  { label: `RING × centerBore max (0.75)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerBore', value: '0.75' }] },
  { label: `ALL MIN (centre off)`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `ALL MAX (centre off)`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `ALL MIN × DOME min`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '0.25' }, { id: 'centerRise', value: '0.15' }] },
  { label: `ALL MIN × DISC min`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '0.25' }, { id: 'centerDish', value: '0' }] },
  { label: `ALL MIN × RING min`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '0.25' }, { id: 'centerBore', value: '0.2' }] },
  { label: `ALL MAX × DOME max`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '1' }, { id: 'centerRise', value: '1.2' }] },
  { label: `ALL MAX × DISC max`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '1' }, { id: 'centerDish', value: '0.9' }] },
  { label: `ALL MAX × RING max`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '1' }, { id: 'centerBore', value: '0.75' }] },
  { label: `FORM: QUILL (roll alone, toward a tube)`, set: [{ id: 'petalRoll', value: '330' }] },
  { label: `FORM: FIDDLEHEAD (spine curl alone)`, set: [{ id: 'petalSpineCurl', value: '360' }] },
  { label: `FORM: CONTORTED (twist alone)`, set: [{ id: 'petalTwist', value: '180' }] },
  { label: `FORM: REFLEXED (cup min x curl below the plane)`, set: [{ id: 'petalCup', value: '-0.8' }, { id: 'petalSpineCurl', value: '-180' }] },
  { label: `FORM: ROLL CLAMP (roll max x narrowest petal)`, set: [{ id: 'petalRoll', value: '330' }, { id: 'petalWidth', value: '8' }] },
  { label: `FORM: ALL MAX (all four curves together)`, set: [{ id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }] },
  { label: `FORM: ALL MIN (all four curves together)`, set: [{ id: 'petalCup', value: '-0.8' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }] },
  { label: `THIN: ALL THIN (centre off)`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `THIN: ALL THIN × DISC`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'centerStyle', value: 'DISC' }] },
  { label: `THIN: ALL THIN × spread min`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }] },
  { label: `THIN: ALL THIN × petalCount 40`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'petalCount', value: '40' }] },
  { label: `THIN: ALL THIN × form max`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }] },
  { label: `THIN: ALL THIN × ALL MIN`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalTilt', value: '0' }] },
  { label: `THIN: THICK GRADIENT (sheet max × thinning max)`, set: [{ id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }] },
  { label: `TIP: pointed × roll max`, set: [{ id: 'petalRoll', value: '330' }] },
  { label: `TIP: pointed × twist max`, set: [{ id: 'petalTwist', value: '180' }] },
  { label: `TIP: pointed × taper max (floor dominates)`, set: [{ id: 'petalTipTaper', value: '4' }] },
  { label: `TIP: truncate (breadth max) — must NOT converge`, set: [{ id: 'petalTipBreadth', value: '0.6' }] },
  { label: `TIP: pointed × ALL THIN`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }] },
  { label: `CAPABILITY: claw (non-monotone width)`, set: [], capability: CAPABILITY_CLAW },
  { label: `CAPABILITY: cleft (two-span domain)`, set: [], capability: CAPABILITY_CLEFT },
  { label: `CAPABILITY: claw x form max`, set: [{ id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }], capability: CAPABILITY_CLAW },
  { label: `CAPABILITY: cleft x roll max`, set: [{ id: 'petalRoll', value: '330' }], capability: CAPABILITY_CLEFT },
  { label: `CAPABILITY: cleft x all thin`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }], capability: CAPABILITY_CLEFT },
  ];
}

/* ===================================================================
   phase2Matrix() — THE 76 ROWS AS THEY STOOD AT 21d4602, frozen.

   WHAT IT IS FOR. tools/diff-bloom-bytes.mjs runs exactly these rows on two
   trees so the silhouette engine's byte report is like-for-like. `--full`
   cannot do that job: it builds its rows from the LIVE harness, and the live
   matrix now sets control ids the pre-change tree's registry does not have,
   so every row would fail read-back against the old tree. legacyMatrix()
   can do it but covers only the four original sliders — it would leave the
   entire centre rig unmeasured for byte drift.

   FROZEN AGAINST: 21d4602 ("Bloom: the designed centre as an A/B rig,
   spread exposed, spread default 2.00"), the commit immediately before the
   petal silhouette model. Both the ROW SET and the VALUES are literals here,
   deliberately — legacyMatrix() looks its min/max up in the live registry,
   which means a later range change would silently rewrite what that
   "frozen" matrix means. This one cannot drift that way.

   FROZEN MEANS FROZEN. Do not update it to track the registry. It is not a
   view over anything; it is a record of one commit. If a future change
   needs a newer baseline, add a NEW frozen matrix beside this one and say
   which commit it snapshots. Never edit this function to make a comparison
   pass — a comparison that has to be edited to pass is the finding.

   These rows PIN only the controls that existed at 21d4602, so they inherit
   every later default. That is deliberate and is the same property
   legacyMatrix() has: a deliberate change to a NEW control's default would
   move them all, correctly. The silhouette engine's new controls default to
   values that reproduce the placeholder exactly, so the expected result here
   is 0 of 76 moved.
   =================================================================== */
export function phase2Matrix() {
  const rows = [{ label: 'DEFAULT (the shipping configuration)', set: [] }];
  for (let n = 3; n <= 40; n++) rows.push({ label: `petalCount ${n}`, set: [{ id: 'petalCount', value: String(n) }] });

  /* Frozen ranges — the values these controls carried at 21d4602. */
  const RANGE = { petalCount: [3, 40], petalLength: [20, 60], petalWidth: [8, 30], petalTilt: [0, 75], spread: [0.6, 6] };
  const SPREAD_DEFAULT = 2;
  const CENTER = {
    DOME: [['centerSize', 0.25, 1], ['centerRise', 0.15, 1.2]],
    DISC: [['centerSize', 0.25, 1], ['centerDish', 0, 0.9]],
    RING: [['centerSize', 0.25, 1], ['centerBore', 0.2, 0.75]],
  };
  const STYLES_F = ['DOME', 'DISC', 'RING'];
  const SWEPT = ['petalLength', 'petalWidth', 'petalTilt', 'spread'];   // petalCount swept exhaustively above

  for (const id of SWEPT) {
    rows.push({ label: `${id} min (${RANGE[id][0]})`, set: [{ id, value: String(RANGE[id][0]) }] });
    rows.push({ label: `${id} max (${RANGE[id][1]})`, set: [{ id, value: String(RANGE[id][1]) }] });
  }
  for (const style of STYLES_F) {
    for (const [tag, v] of [['min', RANGE.spread[0]], ['default', SPREAD_DEFAULT], ['max', RANGE.spread[1]]]) {
      rows.push({ label: `${style} × spread ${tag} (${v})`, set: [{ id: 'centerStyle', value: style }, { id: 'spread', value: String(v) }] });
    }
  }
  for (const style of STYLES_F) {
    for (const [id, lo, hi] of CENTER[style]) {
      for (const [tag, v] of [['min', lo], ['max', hi]]) {
        rows.push({ label: `${style} × ${id} ${tag} (${v})`, set: [{ id: 'centerStyle', value: style }, { id, value: String(v) }] });
      }
    }
  }
  const ALL = ['petalCount', 'petalLength', 'petalWidth', 'petalTilt', 'spread'];
  for (const [tag, k] of [['MIN', 0], ['MAX', 1]]) {
    rows.push({ label: `ALL ${tag} (centre off)`, set: ALL.map((id) => ({ id, value: String(RANGE[id][k]) })) });
  }
  for (const [tag, k] of [['MIN', 0], ['MAX', 1]]) {
    for (const style of STYLES_F) {
      rows.push({
        label: `ALL ${tag} × ${style} ${k === 0 ? 'min' : 'max'}`,
        set: [
          ...ALL.map((id) => ({ id, value: String(RANGE[id][k]) })),
          { id: 'centerStyle', value: style },
          ...CENTER[style].map(([id, lo, hi]) => ({ id, value: String(k === 0 ? lo : hi) })),
        ],
      });
    }
  }
  return rows;
}

/* ===================================================================
   phase6Matrix() — THE 158 ROWS AS THEY STOOD AT c1886d0, frozen.

   FROZEN AGAINST: c1886d0 ("Bloom: the arrangement grows up — layers and
   spiral placement", #123), the commit immediately before the continuous
   spiral. It is the NEWEST of the six frozen baselines and, on the same
   reasoning that made phase5 the strongest of five, it is now the strongest:
   it is the only one carrying the LAYER corners and the SPIRAL count sweep,
   which is exactly the region a continuous-placement change is most likely
   to disturb. A change that moved a layered or spiral export while leaving
   every earlier baseline clean would be invisible to phase2–phase5.

   WHY A NEW ONE RATHER THAN `--full`. The live matrix grew by 22 rows this
   session and every one of them selects `placement: CONTINUOUS`, an option
   value the pre-change registry does not have — so `--full` against the old
   tree would fail read-back on all 22 and could not produce a like-for-like
   comparison at all. This freezes the row set the two trees SHARE.

   FROZEN MEANS FROZEN, exactly as it does for the five above: a record of
   one commit, never a view over the live registry, and never edited to make
   a comparison pass. `--verify-frozen --phase6` proves it deep-equal to
   c1886d0's own buildMatrix() rather than trusting this transcription, and
   that check runs in CI.

   These rows PIN only the controls that existed at c1886d0 — none of them
   names `placement: CONTINUOUS` — so they inherit every later default. The
   continuous arm ships as a new option value that nothing selects, so the
   expected result here is 0 of 158 moved, and it is a two-sided measurement
   rather than a hope. */
export function phase6Matrix() {
  return [
  { label: `DEFAULT (the shipping configuration)`, set: [] },
  { label: `petalCount 3`, set: [{ id: 'petalCount', value: '3' }] },
  { label: `petalCount 4`, set: [{ id: 'petalCount', value: '4' }] },
  { label: `petalCount 5`, set: [{ id: 'petalCount', value: '5' }] },
  { label: `petalCount 6`, set: [{ id: 'petalCount', value: '6' }] },
  { label: `petalCount 7`, set: [{ id: 'petalCount', value: '7' }] },
  { label: `petalCount 8`, set: [{ id: 'petalCount', value: '8' }] },
  { label: `petalCount 9`, set: [{ id: 'petalCount', value: '9' }] },
  { label: `petalCount 10`, set: [{ id: 'petalCount', value: '10' }] },
  { label: `petalCount 11`, set: [{ id: 'petalCount', value: '11' }] },
  { label: `petalCount 12`, set: [{ id: 'petalCount', value: '12' }] },
  { label: `petalCount 13`, set: [{ id: 'petalCount', value: '13' }] },
  { label: `petalCount 14`, set: [{ id: 'petalCount', value: '14' }] },
  { label: `petalCount 15`, set: [{ id: 'petalCount', value: '15' }] },
  { label: `petalCount 16`, set: [{ id: 'petalCount', value: '16' }] },
  { label: `petalCount 17`, set: [{ id: 'petalCount', value: '17' }] },
  { label: `petalCount 18`, set: [{ id: 'petalCount', value: '18' }] },
  { label: `petalCount 19`, set: [{ id: 'petalCount', value: '19' }] },
  { label: `petalCount 20`, set: [{ id: 'petalCount', value: '20' }] },
  { label: `petalCount 21`, set: [{ id: 'petalCount', value: '21' }] },
  { label: `petalCount 22`, set: [{ id: 'petalCount', value: '22' }] },
  { label: `petalCount 23`, set: [{ id: 'petalCount', value: '23' }] },
  { label: `petalCount 24`, set: [{ id: 'petalCount', value: '24' }] },
  { label: `petalCount 25`, set: [{ id: 'petalCount', value: '25' }] },
  { label: `petalCount 26`, set: [{ id: 'petalCount', value: '26' }] },
  { label: `petalCount 27`, set: [{ id: 'petalCount', value: '27' }] },
  { label: `petalCount 28`, set: [{ id: 'petalCount', value: '28' }] },
  { label: `petalCount 29`, set: [{ id: 'petalCount', value: '29' }] },
  { label: `petalCount 30`, set: [{ id: 'petalCount', value: '30' }] },
  { label: `petalCount 31`, set: [{ id: 'petalCount', value: '31' }] },
  { label: `petalCount 32`, set: [{ id: 'petalCount', value: '32' }] },
  { label: `petalCount 33`, set: [{ id: 'petalCount', value: '33' }] },
  { label: `petalCount 34`, set: [{ id: 'petalCount', value: '34' }] },
  { label: `petalCount 35`, set: [{ id: 'petalCount', value: '35' }] },
  { label: `petalCount 36`, set: [{ id: 'petalCount', value: '36' }] },
  { label: `petalCount 37`, set: [{ id: 'petalCount', value: '37' }] },
  { label: `petalCount 38`, set: [{ id: 'petalCount', value: '38' }] },
  { label: `petalCount 39`, set: [{ id: 'petalCount', value: '39' }] },
  { label: `petalCount 40`, set: [{ id: 'petalCount', value: '40' }] },
  { label: `petalLength min (20)`, set: [{ id: 'petalLength', value: '20' }] },
  { label: `petalLength max (60)`, set: [{ id: 'petalLength', value: '60' }] },
  { label: `petalWidth min (8)`, set: [{ id: 'petalWidth', value: '8' }] },
  { label: `petalWidth max (30)`, set: [{ id: 'petalWidth', value: '30' }] },
  { label: `petalBaseTaper min (0.3)`, set: [{ id: 'petalBaseTaper', value: '0.3' }] },
  { label: `petalBaseTaper max (3)`, set: [{ id: 'petalBaseTaper', value: '3' }] },
  { label: `petalTipTaper min (0.6)`, set: [{ id: 'petalTipTaper', value: '0.6' }] },
  { label: `petalTipTaper max (4)`, set: [{ id: 'petalTipTaper', value: '4' }] },
  { label: `petalTipBreadth min (0)`, set: [{ id: 'petalTipBreadth', value: '0' }] },
  { label: `petalTipBreadth max (0.6)`, set: [{ id: 'petalTipBreadth', value: '0.6' }] },
  { label: `petalCup min (-0.8)`, set: [{ id: 'petalCup', value: '-0.8' }] },
  { label: `petalCup max (1.2)`, set: [{ id: 'petalCup', value: '1.2' }] },
  { label: `petalTilt min (0)`, set: [{ id: 'petalTilt', value: '0' }] },
  { label: `petalTilt max (75)`, set: [{ id: 'petalTilt', value: '75' }] },
  { label: `petalSpineCurl min (-180)`, set: [{ id: 'petalSpineCurl', value: '-180' }] },
  { label: `petalSpineCurl max (360)`, set: [{ id: 'petalSpineCurl', value: '360' }] },
  { label: `petalRoll min (-330)`, set: [{ id: 'petalRoll', value: '-330' }] },
  { label: `petalRoll max (330)`, set: [{ id: 'petalRoll', value: '330' }] },
  { label: `petalTwist min (-180)`, set: [{ id: 'petalTwist', value: '-180' }] },
  { label: `petalTwist max (180)`, set: [{ id: 'petalTwist', value: '180' }] },
  { label: `sheetThickness min (0.6)`, set: [{ id: 'sheetThickness', value: '0.6' }] },
  { label: `sheetThickness max (2.4)`, set: [{ id: 'sheetThickness', value: '2.4' }] },
  { label: `tipThinning min (0)`, set: [{ id: 'tipThinning', value: '0' }] },
  { label: `tipThinning max (0.8)`, set: [{ id: 'tipThinning', value: '0.8' }] },
  { label: `footDelicacy min (0.25)`, set: [{ id: 'footDelicacy', value: '0.25' }] },
  { label: `footDelicacy max (1)`, set: [{ id: 'footDelicacy', value: '1' }] },
  { label: `spread min (0.6)`, set: [{ id: 'spread', value: '0.6' }] },
  { label: `spread max (6)`, set: [{ id: 'spread', value: '6' }] },
  { label: `layerCount min (1)`, set: [{ id: 'layerCount', value: '1' }] },
  { label: `layerCount max (3)`, set: [{ id: 'layerCount', value: '3' }] },
  { label: `ROSE-ish (obovate, broad tip)`, set: [{ id: 'petalBaseTaper', value: '2' }, { id: 'petalTipTaper', value: '1.1' }, { id: 'petalTipBreadth', value: '0.3' }] },
  { label: `POPPY-ish (orbicular, truncate)`, set: [{ id: 'petalBaseTaper', value: '0.6' }, { id: 'petalTipTaper', value: '0.7' }, { id: 'petalTipBreadth', value: '0.5' }] },
  { label: `NONE × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'NONE' }, { id: 'spread', value: '0.6' }] },
  { label: `NONE × spread default (2)`, set: [{ id: 'centerStyle', value: 'NONE' }, { id: 'spread', value: '2' }] },
  { label: `NONE × spread max (6)`, set: [{ id: 'centerStyle', value: 'NONE' }, { id: 'spread', value: '6' }] },
  { label: `DOME × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'spread', value: '0.6' }] },
  { label: `DOME × spread default (2)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'spread', value: '2' }] },
  { label: `DOME × spread max (6)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'spread', value: '6' }] },
  { label: `DISC × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'spread', value: '0.6' }] },
  { label: `DISC × spread default (2)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'spread', value: '2' }] },
  { label: `DISC × spread max (6)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'spread', value: '6' }] },
  { label: `RING × spread min (0.6)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'spread', value: '0.6' }] },
  { label: `RING × spread default (2)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'spread', value: '2' }] },
  { label: `RING × spread max (6)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'spread', value: '6' }] },
  { label: `DOME × centerSize min (0.25)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '0.25' }] },
  { label: `DOME × centerSize max (1)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '1' }] },
  { label: `DOME × centerRise min (0.15)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerRise', value: '0.15' }] },
  { label: `DOME × centerRise max (1.2)`, set: [{ id: 'centerStyle', value: 'DOME' }, { id: 'centerRise', value: '1.2' }] },
  { label: `DISC × centerSize min (0.25)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '0.25' }] },
  { label: `DISC × centerSize max (1)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '1' }] },
  { label: `DISC × centerDish min (0)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerDish', value: '0' }] },
  { label: `DISC × centerDish max (0.9)`, set: [{ id: 'centerStyle', value: 'DISC' }, { id: 'centerDish', value: '0.9' }] },
  { label: `RING × centerSize min (0.25)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '0.25' }] },
  { label: `RING × centerSize max (1)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '1' }] },
  { label: `RING × centerBore min (0.2)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerBore', value: '0.2' }] },
  { label: `RING × centerBore max (0.75)`, set: [{ id: 'centerStyle', value: 'RING' }, { id: 'centerBore', value: '0.75' }] },
  { label: `ALL MIN (centre off)`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'layerCount', value: '1' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `ALL MAX (centre off)`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'layerCount', value: '3' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `ALL MIN × DOME min`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'layerCount', value: '1' }, { id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '0.25' }, { id: 'centerRise', value: '0.15' }] },
  { label: `ALL MIN × DISC min`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'layerCount', value: '1' }, { id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '0.25' }, { id: 'centerDish', value: '0' }] },
  { label: `ALL MIN × RING min`, set: [{ id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalBaseTaper', value: '0.3' }, { id: 'petalTipTaper', value: '0.6' }, { id: 'petalTipBreadth', value: '0' }, { id: 'petalCup', value: '-0.8' }, { id: 'petalTilt', value: '0' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'layerCount', value: '1' }, { id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '0.25' }, { id: 'centerBore', value: '0.2' }] },
  { label: `ALL MAX × DOME max`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'layerCount', value: '3' }, { id: 'centerStyle', value: 'DOME' }, { id: 'centerSize', value: '1' }, { id: 'centerRise', value: '1.2' }] },
  { label: `ALL MAX × DISC max`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'layerCount', value: '3' }, { id: 'centerStyle', value: 'DISC' }, { id: 'centerSize', value: '1' }, { id: 'centerDish', value: '0.9' }] },
  { label: `ALL MAX × RING max`, set: [{ id: 'petalCount', value: '40' }, { id: 'petalLength', value: '60' }, { id: 'petalWidth', value: '30' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipBreadth', value: '0.6' }, { id: 'petalCup', value: '1.2' }, { id: 'petalTilt', value: '75' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }, { id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '1' }, { id: 'spread', value: '6' }, { id: 'layerCount', value: '3' }, { id: 'centerStyle', value: 'RING' }, { id: 'centerSize', value: '1' }, { id: 'centerBore', value: '0.75' }] },
  { label: `FORM: QUILL (roll alone, toward a tube)`, set: [{ id: 'petalRoll', value: '330' }] },
  { label: `FORM: FIDDLEHEAD (spine curl alone)`, set: [{ id: 'petalSpineCurl', value: '360' }] },
  { label: `FORM: CONTORTED (twist alone)`, set: [{ id: 'petalTwist', value: '180' }] },
  { label: `FORM: REFLEXED (cup min x curl below the plane)`, set: [{ id: 'petalCup', value: '-0.8' }, { id: 'petalSpineCurl', value: '-180' }] },
  { label: `FORM: ROLL CLAMP (roll max x narrowest petal)`, set: [{ id: 'petalRoll', value: '330' }, { id: 'petalWidth', value: '8' }] },
  { label: `FORM: ALL MAX (all four curves together)`, set: [{ id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }] },
  { label: `FORM: ALL MIN (all four curves together)`, set: [{ id: 'petalCup', value: '-0.8' }, { id: 'petalSpineCurl', value: '-180' }, { id: 'petalRoll', value: '-330' }, { id: 'petalTwist', value: '-180' }] },
  { label: `THIN: ALL THIN (centre off)`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `THIN: ALL THIN × DISC`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'centerStyle', value: 'DISC' }] },
  { label: `THIN: ALL THIN × spread min`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }] },
  { label: `THIN: ALL THIN × petalCount 40`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'petalCount', value: '40' }] },
  { label: `THIN: ALL THIN × form max`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }] },
  { label: `THIN: ALL THIN × ALL MIN`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalTilt', value: '0' }] },
  { label: `THIN: THICK GRADIENT (sheet max × thinning max)`, set: [{ id: 'sheetThickness', value: '2.4' }, { id: 'tipThinning', value: '0.8' }] },
  { label: `TIP: pointed × roll max`, set: [{ id: 'petalRoll', value: '330' }] },
  { label: `TIP: pointed × twist max`, set: [{ id: 'petalTwist', value: '180' }] },
  { label: `TIP: pointed × taper max (floor dominates)`, set: [{ id: 'petalTipTaper', value: '4' }] },
  { label: `TIP: truncate (breadth max) — must NOT converge`, set: [{ id: 'petalTipBreadth', value: '0.6' }] },
  { label: `TIP: pointed × ALL THIN`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }] },
  { label: `CAPABILITY: claw (non-monotone width)`, set: [], capability: CAPABILITY_CLAW },
  { label: `CAPABILITY: cleft (two-span domain)`, set: [], capability: CAPABILITY_CLEFT },
  { label: `CAPABILITY: claw x form max`, set: [{ id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }], capability: CAPABILITY_CLAW },
  { label: `CAPABILITY: cleft x roll max`, set: [{ id: 'petalRoll', value: '330' }], capability: CAPABILITY_CLEFT },
  { label: `CAPABILITY: cleft x all thin`, set: [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }], capability: CAPABILITY_CLEFT },
  { label: `SPIRAL x petalCount 3 (below the legibility flag)`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '3' }] },
  { label: `SPIRAL x petalCount 5 (below the legibility flag)`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '5' }] },
  { label: `SPIRAL x petalCount 7 (below the legibility flag)`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '7' }] },
  { label: `SPIRAL x petalCount 8`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '8' }] },
  { label: `SPIRAL x petalCount 13`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '13' }] },
  { label: `SPIRAL x petalCount 21`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '21' }] },
  { label: `SPIRAL x petalCount 40`, set: [{ id: 'placement', value: 'SPIRAL' }, { id: 'petalCount', value: '40' }] },
  { label: `SPIRAL x defaults`, set: [{ id: 'placement', value: 'SPIRAL' }] },
  { label: `3 layers x layerSize min (0.35)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerSize', value: '0.35' }] },
  { label: `3 layers x layerSize max (0.9)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerSize', value: '0.9' }] },
  { label: `3 layers x layerPhase min (0)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerPhase', value: '0' }] },
  { label: `3 layers x layerPhase max (1)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerPhase', value: '1' }] },
  { label: `3 layers x layerTilt min (0)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerTilt', value: '0' }] },
  { label: `3 layers x layerTilt max (30)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerTilt', value: '30' }] },
  { label: `2 layers x RADIAL`, set: [{ id: 'layerCount', value: '2' }, { id: 'placement', value: 'RADIAL' }] },
  { label: `2 layers x SPIRAL`, set: [{ id: 'layerCount', value: '2' }, { id: 'placement', value: 'SPIRAL' }] },
  { label: `3 layers x RADIAL`, set: [{ id: 'layerCount', value: '3' }, { id: 'placement', value: 'RADIAL' }] },
  { label: `3 layers x SPIRAL`, set: [{ id: 'layerCount', value: '3' }, { id: 'placement', value: 'SPIRAL' }] },
  { label: `LAYERS: 3 x spread min`, set: [{ id: 'layerCount', value: '3' }, { id: 'spread', value: '0.6' }] },
  { label: `LAYERS: 3 x ALL THIN`, set: [{ id: 'layerCount', value: '3' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }] },
  { label: `LAYERS: 3 x ALL THIN x spread min`, set: [{ id: 'layerCount', value: '3' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }] },
  { label: `LAYERS: 3 x ALL THIN x spread min x petalCount 40`, set: [{ id: 'layerCount', value: '3' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'petalCount', value: '40' }] },
  { label: `LAYERS: 3 x ALL THIN x spread min x petalCount 3`, set: [{ id: 'layerCount', value: '3' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'petalCount', value: '3' }] },
  { label: `LAYERS: 3 x layerSize min x ALL THIN (deepest foot floored)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerSize', value: '0.35' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }] },
  { label: `LAYERS: 3 x ALL FORM MAX`, set: [{ id: 'layerCount', value: '3' }, { id: 'petalCup', value: '1.2' }, { id: 'petalSpineCurl', value: '360' }, { id: 'petalRoll', value: '330' }, { id: 'petalTwist', value: '180' }] },
  { label: `LAYERS: 3 x SPIRAL x ALL THIN x spread min x petalCount 40`, set: [{ id: 'layerCount', value: '3' }, { id: 'placement', value: 'SPIRAL' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'petalCount', value: '40' }] },
  { label: `LAYERS: 3 x centre OFF (the layered BARE bloom)`, set: [{ id: 'layerCount', value: '3' }, { id: 'centerStyle', value: 'NONE' }] },
  { label: `LAYERS: 3 x layerTilt max (135° effective at petalTilt max)`, set: [{ id: 'layerCount', value: '3' }, { id: 'layerTilt', value: '30' }, { id: 'petalTilt', value: '75' }] },
  { label: `LAYERS: 2 x layerSize max x layerPhase 0 (the coincidence corner)`, set: [{ id: 'layerCount', value: '2' }, { id: 'layerSize', value: '0.9' }, { id: 'layerPhase', value: '0' }, { id: 'layerTilt', value: '0' }] },
  { label: `LAYERS: 3 x ALL MIN elsewhere`, set: [{ id: 'layerCount', value: '3' }, { id: 'petalCount', value: '3' }, { id: 'petalLength', value: '20' }, { id: 'petalWidth', value: '8' }, { id: 'petalTilt', value: '0' }, { id: 'spread', value: '0.6' }] },
  { label: `CAPABILITY: cleft x 3 layers`, set: [{ id: 'layerCount', value: '3' }], capability: CAPABILITY_CLEFT },
  ];
}
