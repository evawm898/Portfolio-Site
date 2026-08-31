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
export const { CONTROLS, DEFAULTS, valuesEqual } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

export function serveRepo() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/bloom.html';
    fs.readFile(path.join(ROOT, p), (err, data) => {
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
   vertex graph. Both of those are UNRATED — see the header. */
export function analyzeStl(buf) {
  const tris = buf.readUInt32LE(80);
  const q = (x) => Math.round(x * 1e4) / 1e4;
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const edges = new Map();
  const parent = new Map();
  const root = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); let c = x; while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; } return r; };
  const union = (a, b) => { const ra = root(a), rb = root(b); if (ra !== rb) parent.set(ra, rb); };
  let off = 84;
  for (let i = 0; i < tris; i++) {
    off += 12;
    const v = [];
    for (let k = 0; k < 3; k++) { v.push(q(buf.readFloatLE(off)) + ',' + q(buf.readFloatLE(off + 4)) + ',' + q(buf.readFloatLE(off + 8))); off += 12; }
    off += 2;
    for (const p of v) if (!parent.has(p)) parent.set(p, p);
    union(v[0], v[1]); union(v[1], v[2]);
    for (let k = 0; k < 3; k++) { const e = key(v[k], v[(k + 1) % 3]); edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0, nonManifold = 0;
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  const roots = new Set();
  for (const v of parent.keys()) roots.add(root(v));
  return { tris, boundary, nonManifold, shells: tris > 0 ? roots.size : 0 };
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
   THE MATRIX — the shared sweep both gates run. Order matters: the SHIPPING
   DEFAULT is row 1, then the arrangement sweep, then every slider at min and
   max, then the centre rig, then the corners. Anything added to the registry
   must be added here — a control with no min/default/max rows is unknown, not
   passing.

   CENTRE COVERAGE STARTS FROM WHAT SHIPS. `centerStyle` defaults to NONE, so
   the default row and the whole arrangement sweep exercise the bloom with NO
   centre at all — which is the shipping configuration and stays the state
   most rows measure. The centre is then exercised ON across every style. The
   flower shipped a 7-piece bare bloom for months because every gate row
   enabled the thing that hid the defect; the same mistake here would be a
   matrix where every row turned the centre on.

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

export function buildMatrix() {
  const rows = [{ label: 'DEFAULT (the shipping configuration)', set: [] }];

  /* 1. Arrangement, centre OFF — the shipping state, swept. */
  for (let n = 3; n <= 40; n++) {
    rows.push({ label: `petalCount ${n}`, set: [{ id: 'petalCount', value: String(n) }] });
  }
  for (const c of SLIDERS()) {
    if (c.id === 'petalCount') continue;                 // swept exhaustively above
    if (c.role === 'center') continue;                   // needs a style; see block 3
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
  for (const style of STYLES) {
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
  for (const [tag, k] of extremes) {
    rows.push({
      label: `ALL ${tag} (centre off)`,
      set: SLIDERS().filter((c) => c.role !== 'center').map((c) => ({ id: c.id, value: String(c[k]) })),
    });
  }
  for (const [tag, k] of extremes) {
    for (const style of STYLES) {
      rows.push({
        label: `ALL ${tag} × ${style} ${k}`,
        set: [
          ...SLIDERS().filter((c) => c.role !== 'center').map((c) => ({ id: c.id, value: String(c[k]) })),
          { id: 'centerStyle', value: style },
          ...[...SHARED_CENTER(), ...subControlsFor(style)].map((c) => ({ id: c.id, value: String(c[k]) })),
        ],
      });
    }
  }
  /* 5. CAPABILITY — the two non-shipping rows. Registry state is DEFAULTS
        (they set no control), so fullStateDrift still applies unchanged and
        the capability carries its own read-back in applyCapability(). These
        are last so the matrix still opens on what ships. */
  rows.push({ label: 'CAPABILITY: claw (non-monotone width)', set: [], capability: CAPABILITY_CLAW });
  rows.push({ label: 'CAPABILITY: cleft (two-span domain)', set: [], capability: CAPABILITY_CLEFT });

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
