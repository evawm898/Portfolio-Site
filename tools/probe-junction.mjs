/*
 * probe-junction.mjs — MEASUREMENT ONLY. What the junction actually is, in numbers.
 *
 * WHY THIS EXISTS. The junction is being rebuilt to Eva's specification: "the point of
 * the junction is really just a continuation of the petal to the stem. Ideally it is
 * smooth and tied to whatever thickness the petal / petal infill has. Then the sliders
 * are for the join to the stem." Nothing in this repository measures whether that is
 * true, and the metric that was previously used to judge the junction (A_k, azimuthal
 * ripple at the petal harmonic) was validated for the WRONG PROPERTY: under this
 * specification the junction SHOULD ripple at petal frequency, because it is made of
 * petal material at petal spacing. Driving A_k down drives toward a smooth skin, and the
 * skin is the defect. A_k is reported here as a descriptive column and is not a target.
 *
 * WHAT IT MEASURES. It serves the repo with an INSTRUMENTED copy of flower-sdf.js — the
 * source verbatim plus a recorder around buildReceptacleField — so it sees the actual
 * skeleton the shipping code builds, not a replica of it. Nothing in the working tree is
 * modified and no geometry path is changed. Per row it reports:
 *
 *   CONTINUITY   rib radius just above the foot (what the petal strand is lofted at)
 *                over rib radius just below it (what the continuation runs at).
 *                Eva's specification says 1.000. Measured LIVE and at EXPORT separately,
 *                because the two differ: the petal's tube is floored to the process
 *                minimum by MeshAccumulator._floorRadius at export and the SDF skeleton
 *                is not (see FLOOR below).
 *   RUN:RISE     how far each strand travels horizontally per unit of descent between
 *                its foot and where it terminates. A continuation descends; a converging
 *                spoke runs inward. This is the number that says which one it is.
 *   LATHE        how much of the skeleton is axisymmetric — coaxial segments on the
 *                centre axis, i.e. a surface of revolution. Under the specification the
 *                answer must eventually be zero. Today it is not.
 *   ORPHANS      if the lathe were deleted, what would be left unconnected. Each strand
 *                endpoint is tested against every other non-lathe primitive at the
 *                field's own blend radius k (smooth union bridges a gap of about k), and
 *                against the stem top. This is the #97 question asked directly, because
 *                boundary === 0 cannot see a free end.
 *   FLOOR        whether the skeleton radii honour the process floor. Reported per
 *                process because the same strut is a different diameter at each.
 *   A_k          descriptive only, see above.
 *
 * VALIDITY ASSERTIONS — all hard, all abort the run. A harness that reports instead of
 * failing is a log line (see the flower-project skill).
 *   V1 INSTRUMENTED. The recorder must have fired. A probe that silently fell back to
 *      the uninstrumented module measures nothing and would report clean numbers.
 *   V2 CAP CENSUS. Every cap in the skeleton must classify as exactly one of
 *      lathe / strand / stub / collar, and the counts must reconcile against the
 *      closed-form prediction from the source (30 lathe segments, K=9 per foot, one stub
 *      per foot, collar per mode). A classifier that silently drops a cap would under-
 *      report the lathe, which is the specific thing this probe exists to detect.
 *   V3 READ-BACK. Every control a row sets is read back and compared. A value that did
 *      not take means the row measured a design nobody asked for.
 *   V4 LATHE DETECTOR PAIR. The axisymmetry detector is run against a KNOWN-GOOD input
 *      (the real skeleton, which contains a lathe — must report > 0) and a KNOWN-BAD one
 *      (the same skeleton with the lathe segments removed — must report 0). A detector
 *      that has never been shown to change its answer is not a detector.
 *
 * Each row loads a FRESH PAGE (#92/#100: spacecol triangle counts drift across rebuilds
 * within one page), applies its set, and reads back.
 *
 * RUN:  node tools/probe-junction.mjs
 *       node tools/probe-junction.mjs --negative-control
 *         Corrupts the lathe detector's input on purpose and requires V4 to fail. Run
 *         this before quoting a pass from a changed harness.
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

const PROCESS_FLOOR_MM = { sls: 1.0, sla: 0.4, fdm: 0.8 };

// ---------------------------------------------------------------------------
// The instrumented module. buildReceptacleField is renamed and a recorder put in
// front of it, so the recorder sees the EXACT arguments the app passes and the
// EXACT skeleton buildGatherSkeleton returns for them. If the replace does not
// apply (the signature moved), the probe aborts rather than measuring nothing.
// ---------------------------------------------------------------------------
const SDF_SRC = fs.readFileSync(path.join(ROOT, 'flower-sdf.js'), 'utf8');
const ANCHOR = 'export function buildReceptacleField(feet, neck, opts = {}) {';
if (!SDF_SRC.includes(ANCHOR)) { console.error('ABORT: buildReceptacleField signature moved — probe cannot instrument flower-sdf.js.'); process.exit(2); }
const INSTRUMENTED = SDF_SRC.replace(ANCHOR, `export function buildReceptacleField(feet, neck, opts = {}) {
  const __rec = { feet: feet.map((f) => ({ p: f.p.slice(), r: f.r, up: f.up.slice() })),
                  neck: { p: neck.p.slice(), r: neck.r },
                  opts: { cx: opts.cx, cz: opts.cz, tubeRadius: opts.tubeRadius, absorption: opts.absorption,
                          gatherHeight: opts.gatherHeight, buttonSize: opts.buttonSize, profile: opts.profile,
                          collar: opts.collar, exportMode: !!opts.exportMode, floorR: opts.floorR,
                          cell: opts.cell, smoothIters: opts.smoothIters } };
  try {
    const __sk = buildGatherSkeleton(feet, neck, opts);
    __rec.meta = { ...__sk.meta }; delete __rec.meta.neckR;
    __rec.caps = __sk.caps.map((c) => ({ a: c.a.slice(), b: c.b.slice(), ra: c.ra, rb: c.rb }));
    __rec.k = 0.006 + Math.max(0, Math.min(1, opts.absorption != null ? opts.absorption : 0.85)) * 0.055;
  } catch (e) { __rec.err = String(e && e.stack || e); }
  (globalThis.__sdfProbe = globalThis.__sdfProbe || []).push(__rec);
  return __probe_realBuildReceptacleField(feet, neck, opts);
}
function __probe_realBuildReceptacleField(feet, neck, opts = {}) {`);

// ---------------------------------------------------------------------------
// Classification and metrics — pure functions over a recorded skeleton, so they
// are testable against synthetic input (see V4).
// ---------------------------------------------------------------------------
const EPS = 1e-9;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const radial = (p, cx, cz) => Math.hypot(p[0] - cx, p[2] - cz);

/* A cap is LATHE when both endpoints sit on the centre axis: it is one segment of a
 * surface of revolution. That is the geometric definition, not a positional one — a
 * classifier keyed off "the first 30 caps" would silently pass a lathe that moved. */
function classifyCaps(caps, cx, cz, feet, tube) {
  const AXIS_TOL = 1e-6;
  const stubLen = tube * 4;
  const out = { lathe: [], strand: [], stub: [], collar: [] };
  for (let i = 0; i < caps.length; i++) {
    const c = caps[i];
    const onAxisA = radial(c.a, cx, cz) < AXIS_TOL, onAxisB = radial(c.b, cx, cz) < AXIS_TOL;
    if (onAxisA && onAxisB) {
      // A collar is also coaxial but is a WIDE short disc (ra === rb, far above a lathe
      // segment's local radius); separate them by aspect so the census reconciles.
      const len = dist(c.a, c.b);
      if (c.ra === c.rb && len > EPS && Math.max(c.ra, c.rb) / len > 1.5) out.collar.push(i);
      else out.lathe.push(i);
      continue;
    }
    // A stub is the short up-segment rooted exactly at a foot position.
    const atFoot = feet.some((f) => dist(f.p, c.a) < 1e-9);
    if (atFoot && Math.abs(dist(c.a, c.b) - stubLen) < 1e-6) out.stub.push(i);
    else out.strand.push(i);
  }
  return out;
}

/* AXISYMMETRY: total arc length of coaxial (lathe) segments, and their share of the
 * skeleton's total length. Under Eva's specification this must reach zero. */
function latheMeasure(caps, cls) {
  let latheLen = 0, totalLen = 0;
  for (let i = 0; i < caps.length; i++) totalLen += dist(caps[i].a, caps[i].b);
  for (const i of cls.lathe) latheLen += dist(caps[i].a, caps[i].b);
  return { latheSegs: cls.lathe.length, latheLen, totalLen, latheFrac: totalLen > EPS ? latheLen / totalLen : 0 };
}

/* RUN:RISE per foot — horizontal travel over vertical descent, foot to the far end of
 * that foot's strand chain. A continuation descends (small ratio); a spoke runs inward
 * (large ratio). Returned per foot so an outlier cannot hide in a mean. */
function runRise(caps, cls, feet, cx, cz) {
  const byFoot = feet.map(() => ({ pts: [] }));
  for (const i of cls.strand) {
    const c = caps[i];
    let best = -1, bd = Infinity;
    for (let f = 0; f < feet.length; f++) {
      // assign by azimuth: a strand chain never crosses to another foot's azimuth here
      const daz = Math.abs(Math.atan2(Math.sin(Math.atan2(c.a[2] - cz, c.a[0] - cx) - Math.atan2(feet[f].p[2] - cz, feet[f].p[0] - cx)),
                                      Math.cos(Math.atan2(c.a[2] - cz, c.a[0] - cx) - Math.atan2(feet[f].p[2] - cz, feet[f].p[0] - cx))));
      if (daz < bd) { bd = daz; best = f; }
    }
    if (best >= 0) byFoot[best].pts.push(c.b);
  }
  const rows = [];
  for (let f = 0; f < feet.length; f++) {
    const p0 = feet[f].p, pts = byFoot[f].pts;
    if (!pts.length) { rows.push(null); continue; }
    const end = pts.reduce((lo, p) => (p[1] < lo[1] ? p : lo), pts[0]);
    const run = Math.abs(radial(p0, cx, cz) - radial(end, cx, cz));
    const rise = Math.abs(p0[1] - end[1]);
    rows.push({ run, rise, ratio: rise > EPS ? run / rise : Infinity, r0: radial(p0, cx, cz), r1: radial(end, cx, cz), y0: p0[1], y1: end[1] });
  }
  return rows;
}

/* ORPHANS — the #97 question. Delete the lathe; is every remaining primitive still
 * joined to something? Two primitives are joined when their SURFACES come within the
 * field's blend radius k (smin fuses across roughly k). Each strand endpoint is tested
 * against every other non-lathe cap and against the stem top disc. Reports the free
 * length and diameter of anything that is not, per process, since the same strut is a
 * different diameter at each. */
function orphansWithoutLathe(caps, cls, k, neck, heightMM, modelSpanUnits) {
  const keep = [...cls.strand, ...cls.stub, ...cls.collar];
  const mmPerUnit = modelSpanUnits > EPS ? heightMM / modelSpanUnits : 0;
  const free = [];
  for (const i of cls.strand) {
    const c = caps[i];
    // the chain end: a strand cap whose b is not the a of any other kept cap
    let continues = false;
    for (let j = 0; j < keep.length; j++) { if (keep[j] === i) continue; if (dist(caps[keep[j]].a, c.b) < 1e-9) { continues = true; break; } }
    if (continues) continue;
    // free end: nearest surface among the other kept caps, and the stem top
    let gap = Infinity;
    for (let j = 0; j < keep.length; j++) {
      const o = caps[keep[j]]; if (keep[j] === i) continue;
      // segment-to-segment surface gap, sampled — enough resolution for a mm-scale answer
      let dmin = Infinity;
      for (let s = 0; s <= 8; s++) for (let t = 0; t <= 8; t++) {
        const p = [c.a[0] + (c.b[0] - c.a[0]) * s / 8, c.a[1] + (c.b[1] - c.a[1]) * s / 8, c.a[2] + (c.b[2] - c.a[2]) * s / 8];
        const q = [o.a[0] + (o.b[0] - o.a[0]) * t / 8, o.a[1] + (o.b[1] - o.a[1]) * t / 8, o.a[2] + (o.b[2] - o.a[2]) * t / 8];
        const d = dist(p, q) - (c.ra + c.rb) / 2 - (o.ra + o.rb) / 2;
        if (d < dmin) dmin = d;
      }
      if (dmin < gap) gap = dmin;
    }
    const dStem = Math.max(0, dist(c.b, neck.p) - (c.rb + neck.r));
    const g = Math.min(gap, dStem);
    if (g > k) free.push({ gapUnits: g, gapMM: g * mmPerUnit, diaMM: 2 * c.rb * mmPerUnit, endY: c.b[1], endR: radial(c.b, 0, 0) });
  }
  return { freeEnds: free, blendK: k, mmPerUnit };
}

/* A_k — descriptive only. Azimuthal ripple of the strand-arrival radius at the petal
 * harmonic, as a fraction of the mean. Reported so changes stay legible; NOT a target. */
function azimuthalRipple(rows, nPetalStrands) {
  const pts = rows.filter(Boolean);
  if (pts.length < 3) return null;
  const mean = pts.reduce((s, r) => s + r.r1, 0) / pts.length;
  let re = 0, im = 0;
  for (let i = 0; i < pts.length; i++) { const th = 2 * Math.PI * i / pts.length; re += pts[i].r1 * Math.cos(nPetalStrands * th); im += pts[i].r1 * Math.sin(nPetalStrands * th); }
  return mean > EPS ? 2 * Math.hypot(re, im) / pts.length / mean : null;
}

// ---------------------------------------------------------------------------
// Rows. The shipped defaults and every preset first (coverage against what actually
// ships, per the skill), then the junction-control sweep.
// ---------------------------------------------------------------------------
const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const ROWS = [
  { label: 'DEFAULT (bare bloom)', set: [] },
  { label: 'DEFAULT + stem', set: [{ id: 'stemType', value: 'stem' }] },
  ...PRESETS.map((p) => ({ label: `preset: ${p.name}`, presetSlug: p.slug })),
  // junction-control sweep: does the control reach the SDF skeleton at all?
  { label: 'gatherHeight 0.05', set: [{ id: 'gatherHeight', value: '0.05' }] },
  { label: 'gatherHeight 0.60', set: [{ id: 'gatherHeight', value: '0.6' }] },
  { label: 'buttonSize 0.00', set: [{ id: 'buttonSize', value: '0' }] },
  { label: 'buttonSize 1.00', set: [{ id: 'buttonSize', value: '1' }] },
  { label: 'absorption 0.00', set: [{ id: 'absorption', value: '0' }] },
  { label: 'absorption 1.00', set: [{ id: 'absorption', value: '1' }] },
  { label: 'blendSmoothness 0.00', set: [{ id: 'blendSmoothness', value: '0' }] },
  { label: 'blendSmoothness 1.00', set: [{ id: 'blendSmoothness', value: '1' }] },
  { label: 'convergenceTightness 0.00', set: [{ id: 'convergenceTightness', value: '0' }] },
  { label: 'convergenceTightness 1.00', set: [{ id: 'convergenceTightness', value: '1' }] },
  { label: 'receptacleDepth 0.00', set: [{ id: 'receptacleDepth', value: '0' }] },
  { label: 'receptacleDepth 1.00', set: [{ id: 'receptacleDepth', value: '1' }] },
  { label: 'bundleTightness 0.00', set: [{ id: 'bundleTightness', value: '0' }] },
  { label: 'bundleTightness 1.00', set: [{ id: 'bundleTightness', value: '1' }] },
  { label: 'flareRate 0.00', set: [{ id: 'flareRate', value: '0' }] },
  { label: 'flareRate 1.00', set: [{ id: 'flareRate', value: '1' }] },
  { label: 'receptProfile gentle', set: [{ id: 'receptProfile', value: 'gentle' }] },
  { label: 'receptProfile dome', set: [{ id: 'receptProfile', value: 'dome' }] },
  { label: 'thickScale 0.40', set: [{ id: 'thickScale', value: '0.4' }] },
  { label: 'thickScale 2.50', set: [{ id: 'thickScale', value: '2.5' }] },
  { label: 'process sla', set: [{ id: 'process', value: 'sla' }] },
];

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
const out = [];

for (const row of ROWS) {
  const page = await ctx.newPage();                       // FRESH PAGE PER ROW (#92/#100)
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
    catch { route.abort(); }
  });
  await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.waitForTimeout(120);

  if (row.presetSlug) {
    const ok = await page.evaluate((slug) => { const c = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`); if (!c) return false; c.click(); return true; }, row.presetSlug);
    if (!ok) { failures.push(`V3 ${row.label}: preset gallery cell not found`); await page.close(); continue; }
  } else {
    for (const s of row.set) {                            // V3 READ-BACK
      const got = await page.evaluate(({ id, value }) => {
        const el = document.getElementById(id); if (!el) return { missing: true };
        el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
        return { value: el.value };
      }, s);
      if (got.missing) { failures.push(`V3 ${row.label}: no control #${s.id}`); continue; }
      const bothNum = isFinite(Number(s.value)) && isFinite(Number(got.value)) && s.value !== '' && got.value !== '';
      const ok = bothNum ? Math.abs(Number(s.value) - Number(got.value)) < 1e-9 : String(s.value) === String(got.value);
      if (!ok) failures.push(`V3 ${row.label}: ${s.id} set "${s.value}" reads back "${got.value}"`);
    }
  }
  await page.waitForTimeout(220);

  const snap = await page.evaluate(() => {
    const recs = globalThis.__sdfProbe || [];
    const ui = window.__flowerUIState ? window.__flowerUIState() : {};
    return { n: recs.length, rec: recs[recs.length - 1] || null, readout: (document.getElementById('readout') || {}).textContent || '', ui };
  });
  if (pageErrors.filter((e) => !/fonts\.googleapis/.test(e)).length) failures.push(`${row.label}: page errors — ${pageErrors.join(' | ')}`);
  if (!snap.n || !snap.rec) { failures.push(`V1 ${row.label}: recorder never fired — probe is blind on this row`); await page.close(); continue; }
  if (snap.rec.err) { failures.push(`V1 ${row.label}: recorder threw — ${snap.rec.err}`); await page.close(); continue; }
  await page.close();

  const rec = snap.rec, ui = snap.ui;
  const { cx, cz, tubeRadius, collar } = rec.opts;
  const cls = classifyCaps(rec.caps, cx, cz, rec.feet, tubeRadius);
  // V2 CAP CENSUS — reconcile against the closed form in flower-sdf.js.
  const total = cls.lathe.length + cls.strand.length + cls.stub.length + cls.collar.length;
  const expectCollar = collar === 'band' ? 1 : collar === 'ferrule' ? 3 : 0;
  const expect = 30 + rec.feet.length * 9 + rec.feet.length + expectCollar;
  if (total !== rec.caps.length) failures.push(`V2 ${row.label}: census ${total} != ${rec.caps.length} caps`);
  if (rec.caps.length !== expect) failures.push(`V2 ${row.label}: ${rec.caps.length} caps, closed form predicts ${expect} (30 lathe + ${rec.feet.length}x9 strand + ${rec.feet.length} stub + ${expectCollar} collar)`);
  if (cls.lathe.length !== 30) failures.push(`V2 ${row.label}: ${cls.lathe.length} lathe segments, source builds 30`);
  if (cls.stub.length !== rec.feet.length) failures.push(`V2 ${row.label}: ${cls.stub.length} stubs for ${rec.feet.length} feet`);

  const lathe = latheMeasure(rec.caps, cls);
  const rr = runRise(rec.caps, cls, rec.feet, cx, cz);
  const heightMM = Number(ui.heightMM) || 120;
  const span = Math.max(1e-6, (rec.meta.yFeet - rec.meta.yStem) + rec.meta.Rring * 2);   // rough model span in units
  const orph = orphansWithoutLathe(rec.caps, cls, rec.k, rec.neck, heightMM, span);
  const proc = String(ui.process || 'sls');
  const floorMM = PROCESS_FLOOR_MM[proc] || 0.8;
  const radii = rec.feet.map((f) => f.r);
  const minDiaMM = 2 * Math.min(...radii) * orph.mmPerUnit;

  out.push({
    label: row.label, feet: rec.feet.length, caps: rec.caps.length,
    latheSegs: lathe.latheSegs, latheFrac: lathe.latheFrac,
    meta: rec.meta, k: rec.k, proc, floorMM, minDiaMM, exportMode: rec.opts.exportMode, floorRPassed: rec.opts.floorR,
    ratios: rr.filter(Boolean).map((r) => r.ratio), rr,
    orphans: orph.freeEnds, mmPerUnit: orph.mmPerUnit,
    Ak: azimuthalRipple(rr, Math.max(1, Math.round(rec.feet.length / 3))),
    readout: snap.readout.replace(/\s+/g, ' ').trim(),
    radii: [...new Set(radii.map((v) => +v.toFixed(6)))],
    caps_raw: rec.caps, cls,
  });
}

await browser.close();
server.close();

// ---- V4 LATHE DETECTOR PAIR (known-good / known-bad) -----------------------
if (out.length) {
  const s = out[0];
  const good = latheMeasure(s.caps_raw, s.cls);
  const stripped = s.caps_raw.filter((_, i) => !s.cls.lathe.includes(i));
  const clsB = classifyCaps(stripped, s.meta ? 0 : 0, 0, [], 0);
  const bad = latheMeasure(stripped, clsB);
  const detectorLatheSegs = NEGATIVE ? good.latheSegs : bad.latheSegs;   // negative control: feed it the WRONG input
  if (!(good.latheSegs > 0)) failures.push('V4 known-good: detector found no lathe in the real skeleton — it cannot detect one');
  if (detectorLatheSegs !== 0) failures.push(`V4 known-bad: detector reported ${detectorLatheSegs} lathe segments after the lathe was removed`);
}

// ---- report ---------------------------------------------------------------
const f2 = (x) => (x == null || !isFinite(x) ? '  n/a' : x.toFixed(2));
const f3 = (x) => (x == null || !isFinite(x) ? '   n/a' : x.toFixed(3));
console.log('Junction probe — is the junction a continuation of the petal, or a skin?\n');
console.log('  A_k is DESCRIPTIVE ONLY. It is not a target and nothing is tuned to it.\n');
console.log('  ' + 'row'.padEnd(26) + 'feet caps  lathe  lathe%  run:rise(min/med/max)   A_k    freeEnds  minDia');
for (const r of out) {
  const rs = r.ratios.slice().sort((a, b) => a - b);
  const med = rs.length ? rs[rs.length >> 1] : NaN;
  console.log('  ' + r.label.padEnd(26)
    + String(r.feet).padStart(4) + String(r.caps).padStart(5)
    + String(r.latheSegs).padStart(7) + (100 * r.latheFrac).toFixed(1).padStart(7) + '%'
    + `   ${f2(rs[0])}/${f2(med)}/${f2(rs[rs.length - 1])}`.padEnd(24)
    + f3(r.Ak).padStart(7) + String(r.orphans.length).padStart(10)
    + (r.minDiaMM ? r.minDiaMM.toFixed(2) : 'n/a').padStart(8));
}
console.log('\nGEOMETRY OF THE APPROACH (default row):');
if (out[0]) {
  const m = out[0].meta;
  console.log(`  Rring=${m.Rring.toFixed(4)}  yFeet=${m.yFeet.toFixed(4)}  yStem=${m.yStem.toFixed(4)}  yArrival=${m.yArrival.toFixed(4)}`);
  console.log(`  Rtrunk(area rule √Σr²)=${m.Rtrunk.toFixed(4)}   stemR=${m.stemR.toFixed(4)}   ratio stemR/Rtrunk=${(m.stemR / m.Rtrunk).toFixed(2)}`);
  console.log(`  swell=${m.swell.toFixed(4)}  maxWidth=${m.maxWidth.toFixed(4)}  blend k=${out[0].k.toFixed(4)}`);
  console.log(`  strand foot radii present: ${out[0].radii.join(', ')}`);
  console.log(`  opts.floorR passed in = ${out[0].floorRPassed} — grep flower-sdf.js: it is never read.`);
}
console.log('\nFREE ENDS IF THE LATHE WERE DELETED (per row, gap beyond the blend radius k):');
for (const r of out) {
  if (!r.orphans.length) { console.log(`  ${r.label.padEnd(26)} none`); continue; }
  const g = r.orphans.map((o) => o.gapMM);
  console.log(`  ${r.label.padEnd(26)} ${r.orphans.length} free ends, gap ${Math.min(...g).toFixed(2)}–${Math.max(...g).toFixed(2)} mm, Ø ${r.orphans[0].diaMM.toFixed(2)} mm`);
}

if (failures.length) {
  console.log('\nVALIDITY FAILURES — the numbers above are UNVERIFIED:');
  for (const f of failures) console.log('  ! ' + f);
  console.log(NEGATIVE ? '\nNegative control: FAILED as required. ✓' : `\n${failures.length} validity failure(s). ✗`);
  process.exit(NEGATIVE ? 0 : 1);
}
if (NEGATIVE) { console.log('\nNegative control: the harness PASSED with a corrupted detector input — the detector is not detecting. ✗'); process.exit(1); }
console.log('\nAll validity assertions hold. ✓');
