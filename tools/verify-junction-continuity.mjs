/*
 * verify-junction-continuity.mjs — every junction member must REACH the structure by
 * construction, not by proximity. The free-end gate.
 *
 * WHAT THIS MEASURES. The connectedness gate counts detached bodies; a spine attached to
 * its petal above and dangling below is ONE body and a print hazard at the same time (see
 * the flower-project skill: "connectedness counts detached bodies; it does not see free
 * ends"). This gate reads the SDF junction SKELETON the shipping code builds (instrumented
 * flower-sdf.js, same technique as tools/probe-junction.mjs) and asserts, per config:
 *
 *   T1 ONE COMPONENT   the shared-endpoint graph over all capsules is a single connected
 *                      component. Two members whose surfaces merely pass near each other
 *                      share no endpoint and are two components — that is the "contact by
 *                      coincidence of petal count" this gate exists to forbid.
 *   T2 NO FREE ENDS    every degree-1 endpoint is an ALLOWED terminal: a foot up-stub's
 *                      outer end (it overlaps the petal blade by construction) or an
 *                      on-axis endpoint (the trunk/lathe sealing into the stem or closing
 *                      the bare-bloom underside). An off-axis, non-stub terminal is a
 *                      member that stops in the air.
 *   T3 AREA RULE       at every join node (3+ capsules sharing an endpoint), the parent's
 *                      radius satisfies r_p^2 + eps >= sum(r_child^2). Recomputed here from
 *                      the raw capsules — the builder's own assertion is not trusted as
 *                      the only copy. Spine law only; the current law has no join nodes.
 *
 * WHAT IT DOES NOT COVER — read before quoting a pass. It measures the SKELETON CONTRACT,
 * not the mesh: the polygonised field, the blade geometry, watertightness and voxel
 * connectedness stay with verify-flower-export.mjs and verify-connectedness.mjs. A
 * capsule pair that shares an endpoint but whose fielded surfaces pinch apart at an
 * extreme cell size would pass here and must be caught by those gates. It also covers
 * only the configs listed below, and only the law it is pointed at.
 *
 * ============================================================================
 * RED BY DESIGN against --law current. Do not drive it green.
 * ============================================================================
 * Under the shipped law the strand chains END ON THE LATHE'S SURFACE — analytic
 * proximity, no shared endpoint — so T1 and T2 both fail on essentially every config.
 * That is the defect the spine law exists to fix (docs/flower-continuous-spine-proposal.md,
 * PR #103), recorded here as the gate's demonstration that its detector detects. CI runs
 * this gate with --law spine only; the current path's own safety net is unchanged
 * (export + connectedness gates).
 *
 * ============================================================================
 * MERGED BEFORE A LAW THAT CAN SATISFY IT — the XFAIL_LAW_MISSING marker (#106).
 * ============================================================================
 * What #106 tracks is not "the spine is unfinished". It is a defect on main TODAY,
 * independent of which construction eventually replaces the base: petal-to-base and
 * CENTRE-to-base continuity have no gate coverage anywhere, and the bloom centre
 * stays attached only because the current lathe's top shoulder happens to catch it
 * (#108 records that accident — deleting the lathe detached the centre on every
 * stemmed config, voxel-measured). This gate is the continuity coverage; it needs a
 * junction law built on constructed contact to have anything to hold green, and no
 * such law is on main yet. Whatever lands — a staggered merge tree, a plate, anything
 * else — must satisfy these assertions or state why it cannot.
 * While ?junctionLaw=spine throws the builder's "unknown approachLaw", every row
 * fails with that one uniform error; that state is EXPECTED, tracked as #106, and the
 * run reports it as an xfail and exits GREEN — by the marker below, never by a
 * weakened assertion. The lifecycle is the connectedness gate's xfail rule at tool
 * granularity: the moment ANY row BUILDS under the pending law while the marker is
 * set, the run FAILS HARD — that is a law landing, and the PR that lands it must
 * delete the marker in the same commit. A mix of unknown-law and other failures is a
 * plain failure, never an xfail. Runs against --law current are unaffected (red by
 * design, above).
 *
 * VALIDITY — all hard, all abort:
 *   V1 recorder fired; a recorded builder error fails the row with that error.
 *   V2 census: caps reconcile against the law's closed form (current: 30-segment lathe
 *      + 9 per foot + stubs + collar; spine: the builder's meta.spine counts, which this
 *      gate re-sums against the actual capsule list — the counts come from the builder,
 *      the reconciliation is real).
 *   V3 read-back: every control a row sets, and every id a preset names, read back from
 *      the app's own state. Waits are on the #building signal, never a fixed sleep.
 *   V4 detector pair: a synthetic skeleton with a deliberate dangling member must FAIL
 *      T1+T2, and a synthetic well-joined one must PASS, before any row is trusted.
 *      Runs every time, no browser needed for it.
 *
 * RUN:  node tools/verify-junction-continuity.mjs                (--law spine, the CI mode)
 *       node tools/verify-junction-continuity.mjs --law current  (red by design, see above)
 *       node tools/verify-junction-continuity.mjs --negative-control
 *         Nudges one real chain end off its node by 1e-5 and requires the run to FAIL.
 *
 * REQUIREMENTS (dev-only):  npm i three@0.161.0 playwright-core
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const NEGATIVE = process.argv.includes('--negative-control');
const lawIdx = process.argv.indexOf('--law');
const LAW = lawIdx >= 0 ? process.argv[lawIdx + 1] : 'spine';

// XFAIL — NO LAW ON MAIN CAN YET SATISFY THIS GATE. #106 tracks the real defect (base
// continuity has no coverage and the centre's attachment is a lathe-shoulder accident,
// #108) — not the spine's completeness; the reason survives whatever construction
// replaces the base. Delete this constant in the same commit that lands PENDING_LAW.
// Never null it to clear a red whose failures are not the uniform "unknown approachLaw"
// throw.
const PENDING_LAW = 'spine';
const XFAIL_LAW_MISSING_ISSUE = 106;

// ---------------------------------------------------------------------------
// Instrumented module — identical technique to tools/probe-junction.mjs: the recorder
// sees the exact arguments and the exact skeleton, and a builder throw is recorded
// rather than lost in a page crash.
// ---------------------------------------------------------------------------
const SDF_SRC = fs.readFileSync(path.join(ROOT, 'flower-sdf.js'), 'utf8');
const ANCHOR = 'export function buildReceptacleField(feet, neck, opts = {}) {';
if (!SDF_SRC.includes(ANCHOR)) { console.error('ABORT: buildReceptacleField signature moved — cannot instrument flower-sdf.js.'); process.exit(2); }
const INSTRUMENTED = SDF_SRC.replace(ANCHOR, `export function buildReceptacleField(feet, neck, opts = {}) {
  const __rec = { feet: feet.map((f) => ({ p: f.p.slice(), r: f.r, up: f.up.slice() })),
                  neck: { p: neck.p.slice(), r: neck.r },
                  opts: { cx: opts.cx, cz: opts.cz, tubeRadius: opts.tubeRadius, collar: opts.collar,
                          exportMode: !!opts.exportMode, floorR: opts.floorR, approachLaw: opts.approachLaw } };
  try {
    const __sk = buildGatherSkeleton(feet, neck, opts);
    __rec.meta = { ...__sk.meta }; delete __rec.meta.neckR;
    __rec.caps = __sk.caps.map((c) => ({ a: c.a.slice(), b: c.b.slice(), ra: c.ra, rb: c.rb }));
  } catch (e) { __rec.err = String(e && e.message || e); }
  (globalThis.__sdfProbe = globalThis.__sdfProbe || []).push(__rec);
  return __probe_realBuildReceptacleField(feet, neck, opts);
}
function __probe_realBuildReceptacleField(feet, neck, opts = {}) {`);

// ---------------------------------------------------------------------------
// The detector — pure functions over a recorded skeleton, testable synthetically (V4).
// ---------------------------------------------------------------------------
const TOL = 1e-9;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const keyOf = (p) => p.map((v) => v.toFixed(9)).join('|');

/* Build the shared-endpoint graph and classify. `feet` and `tube` identify up-stubs
 * (one endpoint at a foot, length ~ tube*4); `cx/cz` identify on-axis endpoints. */
export function analyzeSkeleton(caps, feet, tube, cx, cz) {
  const AXIS_TOL = 1e-6;
  const nodes = new Map();                     // key -> { p, caps: [i...] }
  for (let i = 0; i < caps.length; i++) {
    for (const p of [caps[i].a, caps[i].b]) {
      const k = keyOf(p);
      if (!nodes.has(k)) nodes.set(k, { p: p.slice(), caps: [] });
      nodes.get(k).caps.push(i);
    }
  }
  // components over caps via shared nodes
  const par = caps.map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (const nd of nodes.values()) for (let i = 1; i < nd.caps.length; i++) {
    const a = find(nd.caps[0]), b = find(nd.caps[i]); if (a !== b) par[a] = b;
  }
  const comps = new Set(caps.map((_, i) => find(i))).size;
  // terminals: degree-1 nodes (one incident cap counting multiplicity — a cap with a==b
  // would be degenerate and is not produced here)
  const isStub = (i) => {
    const c = caps[i];
    const atFootA = feet.some((f) => dist(f.p, c.a) < TOL);
    const atFootB = feet.some((f) => dist(f.p, c.b) < TOL);
    return (atFootA || atFootB) && Math.abs(dist(c.a, c.b) - tube * 4) < 1e-6;
  };
  const freeEnds = [];
  for (const nd of nodes.values()) {
    if (nd.caps.length !== 1) continue;
    const i = nd.caps[0];
    const onAxis = Math.hypot(nd.p[0] - cx, nd.p[2] - cz) < AXIS_TOL;
    if (onAxis) continue;                                  // trunk/lathe end sealing on the axis
    if (isStub(i)) continue;                               // up-stub outer end, overlaps the blade
    freeEnds.push({ p: nd.p, cap: i });
  }
  // area rule at join nodes: 3+ caps sharing a node. Parent = the incident cap of
  // LARGEST radius at that node (the area rule makes the parent strictly the fattest
  // unless a child has zero area). Check r_parent^2 + eps >= sum(r_children^2).
  const areaViolations = [];
  for (const nd of nodes.values()) {
    if (nd.caps.length < 3) continue;
    const rAt = (i) => (dist(caps[i].a, nd.p) < TOL ? caps[i].ra : caps[i].rb);
    const rs = nd.caps.map(rAt).sort((x, y) => y - x);
    const rp = rs[0], sum = rs.slice(1).reduce((s, r) => s + r * r, 0);
    if (rp * rp + 1e-12 < sum) areaViolations.push({ p: nd.p, rp, sum: Math.sqrt(sum), n: nd.caps.length });
  }
  return { comps, freeEnds, areaViolations, nodeCount: nodes.size };
}

// ---- V4: the detector must fail on a known-bad skeleton and pass a known-good one ----
function detectorPair() {
  const feet = [{ p: [1, 0, 0], r: 0.02 }, { p: [-1, 0, 0], r: 0.02 }];
  const good = [
    { a: [1, 0, 0], b: [0.1, -0.5, 0], ra: 0.02, rb: 0.02 },     // member A -> join
    { a: [-1, 0, 0], b: [0.1, -0.5, 0], ra: 0.02, rb: 0.02 },    // member B -> same join (shared endpoint)
    { a: [0.1, -0.5, 0], b: [0, -1, 0], ra: 0.0283, rb: 0.0283 },// parent, area rule ok, ends ON AXIS
    { a: [1, 0, 0], b: [1, 0.08, 0], ra: 0.02, rb: 0.02 },       // up-stub (tube = 0.02 -> len 0.08)
    { a: [-1, 0, 0], b: [-1, 0.08, 0], ra: 0.02, rb: 0.02 },
  ];
  const g = analyzeSkeleton(good, feet, 0.02, 0, 0);
  if (g.comps !== 1 || g.freeEnds.length !== 0 || g.areaViolations.length !== 0)
    throw new Error(`V4 known-good failed: comps=${g.comps} freeEnds=${g.freeEnds.length} areaViol=${g.areaViolations.length}`);
  const bad = good.map((c) => ({ ...c, a: c.a.slice(), b: c.b.slice() }));
  bad[1] = { ...bad[1], b: [0.1005, -0.5, 0] };                  // member B stops 5e-4 short of the join
  const bd = analyzeSkeleton(bad, feet, 0.02, 0, 0);
  if (!(bd.comps > 1) || !(bd.freeEnds.length >= 1))
    throw new Error(`V4 known-bad NOT flagged: comps=${bd.comps} freeEnds=${bd.freeEnds.length} — the detector does not detect`);
  const fat = good.map((c) => ({ ...c }));
  fat[2] = { ...fat[2], ra: 0.02, rb: 0.02 };                    // parent thinner than its children
  const fv = analyzeSkeleton(fat, feet, 0.02, 0, 0);
  if (fv.areaViolations.length !== 1)
    throw new Error(`V4 area-rule control: expected 1 violation, got ${fv.areaViolations.length}`);
  return { good: g, bad: bd };
}

// ---------------------------------------------------------------------------
// Rows — the shipped default, the low-count states the discovery flagged (2 and 6
// members), a stemmed + sepalled row (sepal connector members), and every preset.
// ---------------------------------------------------------------------------
const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const ROWS = [
  { label: 'DEFAULT (bare bloom)', set: [] },
  { label: 'DEFAULT + stem', set: [{ id: 'stemType', value: 'stem', evt: 'change' }] },
  { label: 'radial 2 petals, bare', set: [{ id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '2' }] },
  { label: 'radial 6 petals, bare', set: [{ id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '6' }] },
  { label: 'radial 9 + stem + sepals', set: [{ id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' }, { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }] },
  ...PRESETS.map((p) => ({ label: `preset: ${p.name}`, presetSlug: p.slug })),
];

async function settleBuild(page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(150);
}

async function main() {
  console.log(`junction-continuity — law "${LAW}"${LAW === 'current' ? '  (RED BY DESIGN — see header)' : ''}`);
  const pair = detectorPair();
  console.log(`  V4 detector pair: known-good clean, known-bad flagged (comps=${pair.bad.comps}, freeEnds=${pair.bad.freeEnds.length}). ok\n`);

  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/flower.html';
    if (p === '/flower-sdf.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(INSTRUMENTED); return; }
    fs.readFile(path.join(ROOT, p), (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const failures = [];
  let negativeApplied = false;
  let builtRows = 0, unknownLawRows = 0;

  for (const row of ROWS) {
    const page = await ctx.newPage();                     // fresh page per row (#92/#100)
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await page.route('**cdn.jsdelivr.net/**', (route) => {
      const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
      try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
      catch { route.abort(); }
    });
    await page.goto(`http://localhost:${port}/flower.html?junctionLaw=${LAW}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => globalThis.__sdfProbe && globalThis.__sdfProbe.length > 0, { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
    await settleBuild(page);

    if (row.presetSlug) {
      const ok = await page.evaluate((slug) => { const c = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`); if (!c) return false; c.click(); return true; }, row.presetSlug);
      if (!ok) { failures.push(`V3 ${row.label}: preset cell not found`); await page.close(); continue; }
      await settleBuild(page);
      const pre = PRESETS.find((q) => q.slug === row.presetSlug);
      const st = await page.evaluate(() => (window.__flowerUIState ? window.__flowerUIState() : {}));
      for (const [id, v] of Object.entries(pre.ui || {})) {
        if (!(id in st)) continue;
        const a = st[id], num = isFinite(Number(v)) && isFinite(Number(a)) && String(v) !== '' && String(a) !== '';
        if (!(num ? Math.abs(Number(v) - Number(a)) < 1e-9 : String(v) === String(a)))
          failures.push(`V3 ${row.label}: preset sets ${id}="${v}", app reads "${a}" — wrong design measured`);
      }
    } else {
      for (const s of row.set) {
        const got = await page.evaluate(({ id, value, evt }) => {
          const el = document.getElementById(id); if (!el) return { missing: true };
          el.value = value; el.dispatchEvent(new Event(evt || 'input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
          return { value: el.value };
        }, s);
        if (got.missing) { failures.push(`V3 ${row.label}: no control #${s.id}`); continue; }
        const num = isFinite(Number(s.value)) && isFinite(Number(got.value)) && s.value !== '' && got.value !== '';
        if (!(num ? Math.abs(Number(s.value) - Number(got.value)) < 1e-9 : String(s.value) === String(got.value)))
          failures.push(`V3 ${row.label}: ${s.id} set "${s.value}" reads back "${got.value}"`);
      }
      await settleBuild(page);
    }

    const snap = await page.evaluate(() => {
      const recs = globalThis.__sdfProbe || [];
      return { n: recs.length, rec: recs[recs.length - 1] || null };
    });
    await page.close();
    if (!snap.n || !snap.rec) { failures.push(`V1 ${row.label}: recorder never fired`); continue; }
    const rec = snap.rec;
    if (rec.err) {
      if (/unknown approachLaw/.test(rec.err)) unknownLawRows++;
      failures.push(`${row.label}: builder threw under law "${LAW}" — ${rec.err}`);
      continue;
    }
    builtRows++;
    if (rec.opts.approachLaw !== LAW) { failures.push(`${row.label}: app passed law "${rec.opts.approachLaw}", asked for "${LAW}"`); continue; }

    // V2 census
    if (LAW === 'current') {
      const expectCollar = rec.opts.collar === 'band' ? 1 : rec.opts.collar === 'ferrule' ? 3 : 0;
      const expect = 30 + rec.feet.length * 9 + rec.feet.length + expectCollar;
      if (rec.caps.length !== expect) failures.push(`V2 ${row.label}: ${rec.caps.length} caps, closed form predicts ${expect}`);
    } else if (rec.meta.spine) {
      const s = rec.meta.spine;
      const expect = s.chainSegs + s.joinSegs + s.couplingSegs + s.stubs;
      if (rec.caps.length !== expect)
        failures.push(`V2 ${row.label}: ${rec.caps.length} caps, builder meta sums to ${expect} (chain ${s.chainSegs} + join ${s.joinSegs} + coupling ${s.couplingSegs} + stubs ${s.stubs})`);
    } else {
      failures.push(`V2 ${row.label}: no meta.spine counts from the builder — census impossible`);
    }

    let caps = rec.caps;
    if (NEGATIVE && !negativeApplied && caps.length > 40) {
      // nudge one non-stub cap end off its node — the run MUST then fail
      const i = Math.floor(caps.length / 2);
      caps = caps.map((c) => ({ ...c, a: c.a.slice(), b: c.b.slice() }));
      caps[i].b[0] += 1e-5;
      negativeApplied = true;
    }
    const an = analyzeSkeleton(caps, rec.feet, rec.opts.tubeRadius || 0.0168, rec.opts.cx, rec.opts.cz);
    const probs = [];
    if (an.comps !== 1) probs.push(`T1 components=${an.comps}`);
    if (an.freeEnds.length) probs.push(`T2 free ends=${an.freeEnds.length}`);
    if (LAW !== 'current' && an.areaViolations.length) probs.push(`T3 area-rule violations=${an.areaViolations.length} (worst r_p=${an.areaViolations[0].rp.toFixed(5)} vs sqrtSum=${an.areaViolations[0].sum.toFixed(5)})`);
    const status = probs.length ? 'FAIL' : 'ok';
    console.log(`  ${status.padEnd(5)} ${row.label.padEnd(30)} caps=${String(caps.length).padStart(5)} comps=${an.comps} freeEnds=${an.freeEnds.length}${probs.length ? '   ' + probs.join('; ') : ''}`);
    if (probs.length) failures.push(`${row.label}: ${probs.join('; ')}`);
  }

  await browser.close();
  server.close();

  if (XFAIL_LAW_MISSING_ISSUE != null && LAW === PENDING_LAW) {
    if (builtRows > 0) {
      console.log(`\nXPASS — law "${LAW}" BUILT on ${builtRows} row(s) while XFAIL_LAW_MISSING_ISSUE (#${XFAIL_LAW_MISSING_ISSUE}) is still set.`);
      console.log('That is the law landing: delete the marker in the same commit. A stale marker is a hole in the gate. Failing hard.');
      process.exit(1);
    }
    if (!NEGATIVE && unknownLawRows === ROWS.length && failures.length === unknownLawRows) {
      console.log(`\nxfail — law "${LAW}" is not implemented yet: all ${ROWS.length} rows failed with the builder's own "unknown approachLaw" throw, and nothing else.`);
      console.log(`Known and tracked as #${XFAIL_LAW_MISSING_ISSUE}; GREEN by that marker alone. The gate runs for real the moment the law lands (and fails hard if this marker outlives it).`);
      process.exit(0);
    }
  }
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log('  ! ' + f);
    if (NEGATIVE) { console.log('\nNegative control: FAILED as required. ✓'); process.exit(0); }
    process.exit(1);
  }
  if (NEGATIVE) { console.log('\nNegative control: the run PASSED with a corrupted skeleton — the gate is not gating. ✗'); process.exit(1); }
  console.log('\njunction-continuity: OK — every member reaches the structure by construction.');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
