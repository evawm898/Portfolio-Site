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
