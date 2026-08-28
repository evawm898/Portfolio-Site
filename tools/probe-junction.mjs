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
 *   A_k          descriptive only, see above — and CURRENTLY ALWAYS n/a. There is exactly
 *                ONE distinct foot per petal (marginFlareFactor(0) === 0 collapses each
 *                petal's three strand roots onto one point), so the petal harmonic sits
 *                exactly at the sampling frequency and is unresolvable from the skeleton
 *                at ANY petal count. The estimator returns null rather than a number that
 *                would look like a measurement. To carry A_k as a real descriptive column
 *                it has to be sampled on the POLYGONISED SURFACE — junction radius against
 *                azimuth at a few heights — not at the feet. Not built; flagged here so
 *                the empty column is a known limit rather than a silent one.
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

/* A cap is LATHE when both endpoints sit on the centre axis AND it is part of a CHAIN
 * of such caps: that is what a surface of revolution is — consecutive coaxial segments
 * sharing endpoints. A COLLAR ring is also coaxial but stands alone, sharing an endpoint
 * with nothing.
 *
 * An earlier version of this separated the two by ASPECT (wide-and-short = collar). That
 * was wrong and V2 caught it: below yStem the neck chain runs at a constant stemR, so
 * those segments are also wide-and-short, and 8 of the 30 lathe segments were filed as
 * collar on the default row (all 30 but one on Thistle). They then leaked into the
 * orphan test's kept set, where a stemR-radius cylinder sitting on the axis is closer to
 * every strand's arrival point than the arrival point is to anything real — so every row
 * reported "no free ends", which was an artifact of the misclassification, not a result.
 * Endpoint-sharing is the definition that cannot make that mistake. */
function classifyCaps(caps, cx, cz, feet, tube) {
  const AXIS_TOL = 1e-6;
  const stubLen = tube * 4;
  const out = { lathe: [], strand: [], stub: [], collar: [] };
  const coax = [];
  for (let i = 0; i < caps.length; i++) {
    const c = caps[i];
    if (radial(c.a, cx, cz) < AXIS_TOL && radial(c.b, cx, cz) < AXIS_TOL) { coax.push(i); continue; }
    const atFoot = feet.some((f) => dist(f.p, c.a) < 1e-9);   // a stub is the short up-segment at a foot
    if (atFoot && Math.abs(dist(c.a, c.b) - stubLen) < 1e-6) out.stub.push(i);
    else out.strand.push(i);
  }
  for (const i of coax) {
    const c = caps[i];
    const shares = coax.some((j) => j !== i && (dist(caps[j].a, c.b) < 1e-9 || dist(caps[j].b, c.a) < 1e-9
                                             || dist(caps[j].a, c.a) < 1e-9 || dist(caps[j].b, c.b) < 1e-9));
    (shares ? out.lathe : out.collar).push(i);
  }
  return out;
}

/* Feet at the SAME world position are one foot carrying several strands, not several
 * feet. marginFlareFactor(0) === 0 collapses both margin strands onto the midrib line at
 * u = 0, so the shipped default reports nine feet that are three. This matters twice:
 * six of the nine bezier chains are then exact duplicates of the other three (wasted
 * field work), and — the reason it is a validity concern rather than trivia — an orphan
 * test that lets a chain count its own duplicate as a neighbour reports every rod as
 * connected. Grouping is what stops that. */
function groupFeet(feet) {
  const groups = [];
  for (let i = 0; i < feet.length; i++) {
    let g = groups.find((q) => dist(feet[q.at].p, feet[i].p) < 1e-9);
    if (!g) { g = { at: i, members: [] }; groups.push(g); }
    g.members.push(i);
  }
  return groups;
}

/* TRUE CHAIN ENDS — the last bezier segment's far endpoint per distinct foot (P3 in the
 * source: the point pinned to the neck surface at yArrival). runRise() above deliberately
 * uses each chain's LOWEST sampled point instead, which on elevated coiled designs is a
 * mid-bezier dip, not the arrival — fine for a run:rise ratio, wrong for arrival geometry.
 * A strand cap is a chain end when no other strand cap starts where it ends; coincident
 * duplicate chains (collapsed margin strands) share end positions and are deduped. */
function chainEnds(caps, cls) {
  const ends = [], seen = new Set();
  for (const i of cls.strand) {
    const c = caps[i];
    let cont = false;
    for (const j of cls.strand) { if (j === i) continue; if (dist(caps[j].a, c.b) < 1e-9) { cont = true; break; } }
    if (cont) continue;
    const key = c.b.map((v) => v.toFixed(9)).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    ends.push({ p: c.b.slice(), r: c.rb });
  }
  return ends;
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
function orphansWithoutLathe(caps, cls, k, neck, heightMM, modelSpanUnits, feet, groups, cx, cz) {
  const keep = [...cls.strand, ...cls.stub, ...cls.collar];
  const mmPerUnit = modelSpanUnits > EPS ? heightMM / modelSpanUnits : 0;
  // Which foot GROUP each kept cap belongs to, by nearest foot azimuth — so a chain end
  // is never scored as "connected" to its own coincident duplicate.
  const azOf = (p) => Math.atan2(p[2] - cz, p[0] - cx);
  const groupOf = (c) => {
    let best = -1, bd = Infinity;
    for (let g = 0; g < groups.length; g++) {
      const d = Math.abs(Math.atan2(Math.sin(azOf(c.a) - azOf(feet[groups[g].at].p)), Math.cos(azOf(c.a) - azOf(feet[groups[g].at].p))));
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  };
  const gCache = new Map();
  const grp = (i) => { if (!gCache.has(i)) gCache.set(i, groupOf(caps[i])); return gCache.get(i); };
  const free = [];
  const seenEnd = new Set();   // one chain per DISTINCT foot: coincident duplicates share an end
  for (const i of cls.strand) {
    const c = caps[i];
    // the chain end: a strand cap whose b is not the a of any other kept cap IN ITS OWN GROUP
    let continues = false;
    for (let j = 0; j < keep.length; j++) { if (keep[j] === i) continue; if (grp(keep[j]) !== grp(i)) continue; if (dist(caps[keep[j]].a, c.b) < 1e-9) { continues = true; break; } }
    if (continues) continue;
    // free end: nearest surface among kept caps of OTHER groups, and the stem top
    let gap = Infinity;
    for (let j = 0; j < keep.length; j++) {
      const o = caps[keep[j]]; if (keep[j] === i) continue;
      if (grp(keep[j]) === grp(i)) continue;   // its own petal's material is not "reaching something"
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
    const key = `${c.b[0].toFixed(9)}|${c.b[1].toFixed(9)}|${c.b[2].toFixed(9)}`;
    if (seenEnd.has(key)) continue;    // a coincident duplicate of a chain already counted
    seenEnd.add(key);
    const g = Math.min(gap, dStem);
    if (g > k) free.push({ gapUnits: g, gapMM: g * mmPerUnit, diaMM: 2 * c.rb * mmPerUnit, endY: c.b[1], endR: radial(c.b, 0, 0) });
  }
  return { freeEnds: free, blendK: k, mmPerUnit };
}

/* A_k — descriptive only. Azimuthal ripple of the strand-arrival radius at the petal
 * harmonic, as a fraction of the mean. Reported so changes stay legible; NOT a target.
 *
 * Indexed by TRUE AZIMUTH over DISTINCT feet. The first version indexed by array
 * position and averaged over all nine feet including the six coincident duplicates,
 * which put a repeating triple through a harmonic-3 kernel and resonated exactly: it
 * returned 2.000 on all 30 rows, unchanged by every control including ones that visibly
 * move the geometry. A number identical across every row is a coincidence, not a result.
 *
 * NOTE ON RESOLUTION: the shipped default has THREE distinct feet. A harmonic-3 estimate
 * from three samples sits exactly at the Nyquist limit and carries no information; it is
 * returned as null rather than as a number that looks like a measurement. Rows with
 * enough distinct feet (the presets, 6 to 39) get a real figure. */
function azimuthalRipple(rows, feet, groups, nHarm, cx, cz) {
  const pts = [];
  for (const g of groups) { const r = rows[g.at]; if (r) pts.push({ az: Math.atan2(feet[g.at].p[2] - cz, feet[g.at].p[0] - cx), r1: r.r1 }); }
  if (pts.length < 2 * nHarm + 1) return null;                 // below Nyquist for this harmonic
  const mean = pts.reduce((s2, q) => s2 + q.r1, 0) / pts.length;
  let re = 0, im = 0;
  for (const q of pts) { re += q.r1 * Math.cos(nHarm * q.az); im += q.r1 * Math.sin(nHarm * q.az); }
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
  // blendSmoothness's one measured live path under cm=ON is the STEM lathe's sector count
  // (PR #101: M = clamp(round(rimFeet·lerp(11,7,blend)), 40, 120), rimFeet = petals) — a
  // bare-bloom sweep has no stem rings, so the two rows above CANNOT see it and would
  // read "inert". These two put a stem under the same sweep so the tris column can.
  { label: 'stem + blendSmoothness 0', set: [{ id: 'stemType', value: 'stem' }, { id: 'blendSmoothness', value: '0' }] },
  { label: 'stem + blendSmoothness 1', set: [{ id: 'stemType', value: 'stem' }, { id: 'blendSmoothness', value: '1' }] },
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
  // thickScale's REACHABLE range. flower.js clamps it to [0.4, 2.5] in two places but the
  // registry slider is [0.5, 2] — the outer fifth at each end is unreachable, so a row at
  // 0.4/2.5 measures 0.5/2.0 under a label that says otherwise. V3 caught exactly that.
  { label: 'thickScale 0.50 (slider min)', set: [{ id: 'thickScale', value: '0.5' }] },
  { label: 'thickScale 2.00 (slider max)', set: [{ id: 'thickScale', value: '2' }] },
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

// Wait for the app's own "building" indicator to clear (same signal measure-junction-rim
// waits on). The leading beat gives the rebuild time to be SCHEDULED — the indicator can
// read idle in the gap between an input event and the debounced regen starting.
async function settleBuild(page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(150);
}

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
    // V3 FOR PRESETS — read back the ids the preset names, from the app's own state.
    // The first version had NO read-back here, and a same-tree second run caught the
    // consequence: the fixed 220 ms wait raced the async preset rebuild, two preset rows
    // silently measured the SHIPPED DEFAULT, and every validity assertion still passed —
    // the census reconciles fine against the wrong design. "A harness that sets a config
    // must read it back" (flower-project skill) has no preset exemption.
    await settleBuild(page);
    const pre = PRESETS.find((q) => q.slug === row.presetSlug);
    const st = await page.evaluate(() => (window.__flowerUIState ? window.__flowerUIState() : {}));
    for (const [id, v] of Object.entries(pre.ui || {})) {
      if (!(id in st)) continue;                       // not a wired control on this tier — skip, don't guess
      const a = st[id], num = isFinite(Number(v)) && isFinite(Number(a)) && String(v) !== '' && String(a) !== '';
      if (!(num ? Math.abs(Number(v) - Number(a)) < 1e-9 : String(v) === String(a)))
        failures.push(`V3 ${row.label}: preset sets ${id}="${v}", app state reads "${a}" — this row did NOT measure the preset`);
    }
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
  // Wait on the real signal, not a fixed sleep — the skill records the race this replaces:
  // a fixed wait let a stale build be read while the async rebuild was still running.
  await settleBuild(page);

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
  const groups = groupFeet(rec.feet);
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
  const orph = orphansWithoutLathe(rec.caps, cls, rec.k, rec.neck, heightMM, span, rec.feet, groups, cx, cz);
  const proc = String(ui.process || 'sls');
  const floorMM = PROCESS_FLOOR_MM[proc] || 0.8;
  const radii = rec.feet.map((f) => f.r);
  const minDiaMM = 2 * Math.min(...radii) * orph.mmPerUnit;

  out.push({
    label: row.label, feet: rec.feet.length, distinctFeet: groups.length, caps: rec.caps.length,
    latheSegs: lathe.latheSegs, latheFrac: lathe.latheFrac,
    meta: rec.meta, k: rec.k, proc, floorMM, minDiaMM, exportMode: rec.opts.exportMode, floorRPassed: rec.opts.floorR,
    ratios: rr.filter(Boolean).map((r) => r.ratio), rr,
    orphans: orph.freeEnds, mmPerUnit: orph.mmPerUnit,
    Ak: azimuthalRipple(rr, rec.feet, groups, Math.max(1, groups.length), cx, cz),
    readout: snap.readout.replace(/\s+/g, ' ').trim(),
    radii: [...new Set(radii.map((v) => +v.toFixed(6)))],
    caps_raw: rec.caps, cls, feetRaw: rec.feet, tubeRadius,
    ends: chainEnds(rec.caps, cls),
  });
}

await browser.close();
server.close();

// ---- V4 LATHE DETECTOR PAIR (known-good / known-bad) -----------------------
if (out.length) {
  const s = out[0];
  const good = latheMeasure(s.caps_raw, s.cls);
  const stripped = s.caps_raw.filter((_, i) => !s.cls.lathe.includes(i));
  const clsB = classifyCaps(stripped, 0, 0, s.feetRaw, s.tubeRadius);
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
  console.log('  ' + r.label.padEnd(28)
    + `${r.feet}/${r.distinctFeet}`.padStart(9) + String(r.caps).padStart(5)
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
/* ---- ARRIVAL GEOMETRY + AREA LAW (added for the continuous-spine discovery) ----------
 * Everything printed here is read from data the probe already records (meta, the recorded
 * caps, the per-foot run:rise rows); no new instrument, no new page work. Three additions:
 *
 *   ARRIVAL   per row: where each distinct foot's strand chain ENDS (height + radius), and
 *             the SPREAD of those end heights. The source pins every strand's endpoint to
 *             one COMMON ARRIVAL height (flower-sdf.js: yArrival, P3[1] = yArrival), so the
 *             expected spread is 0 — this MEASURES it instead of asserting it, and any row
 *             where it is nonzero is a finding, not noise. Also the descent spans in mm.
 *   AREA LAW  trunk radius at stations down the descent (read from the recorded lathe caps
 *             — they sample neckR(y) directly) against √Σr² of the strands joined above
 *             that station. Under the shipped construction every strand joins at yArrival,
 *             so the "running sum" is a step; the interesting numbers are min r/Rtrunk over
 *             the descent and the stem-end ratio.
 *   CLEARANCE the arrival circle: chord spacing between neighbouring distinct arrivals vs
 *             strand diameter vs the blend radius k. surface gap = chord − 2·r̄; the field
 *             bridges ~k, so margin = k − gap. Positive margin with the lathe deleted is
 *             what would make spine contact a CONSTRUCTION; negative is a free end. This is
 *             the same physics the orphan test measures — printed here as the design number
 *             (contact margin) rather than the failure symptom (free ends).
 */
/* CONTROL CLASSIFICATION — which side of the foot a control acts on, by measured effect.
 * Two instruments per row, each with a stated blind spot:
 *   SKELETON  a rounded signature over the recorded caps (positions + radii). Sees ONLY
 *             the SDF junction skeleton. It cannot see: the rendered blade, the stem
 *             lathe's sector count (built in flower.js — the blendSmoothness trap), the
 *             polygonised field resolution, or anything the petals do.
 *   LIVE TRIS the page readout's whole-model triangle count. Sees everything and
 *             attributes nothing; on a spacecol design it also carries rebuild drift
 *             (#100) — the sweep rows here are the default design, fresh page per row,
 *             so that drift does not apply, but preset rows' counts are not comparable
 *             to each other for that reason.
 * SKELETON same + TRIS same   => inert on this design (within what these two can see)
 * SKELETON same + TRIS moved  => acts ABOVE the foot (blade/petal side) or in non-SDF
 *                                geometry (stem sectors, centre) — NOT in the junction
 * SKELETON moved              => acts BELOW the foot (junction skeleton)             */
// The signature includes the blend radius k: absorption never moves a cap (k lives in the
// field fold, not the skeleton), so a caps-only signature would file the junction's own
// blend control under "not the junction" — the same instrument-blindness this table exists
// to avoid.
const skelSig = (r) => r.k.toFixed(6) + '#' + r.caps_raw.map((c) => [...c.a, ...c.b, c.ra, c.rb].map((v) => v.toFixed(6)).join(',')).join(';');
const trisOf = (r) => { const mres = /([\d,]+)\s*tris/.exec(r.readout); return mres ? Number(mres[1].replace(/,/g, '')) : NaN; };
if (out.length) {
  const base = out[0], baseSig = skelSig(base), baseTris = trisOf(base);
  console.log('\nCONTROL CLASSIFICATION vs DEFAULT row (skeleton+k signature, live tris):');
  console.log('  ' + 'row'.padEnd(28) + 'skeleton'.padStart(10) + 'tris'.padStart(10) + 'Δtris'.padStart(9) + '  reading');
  for (const r of out) {
    if (r === base) continue;
    if (r.label.startsWith('preset:')) continue;   // a different design, not a control delta
    const sk = skelSig(r) === baseSig ? 'same' : 'MOVED';
    const t = trisOf(r), dt = t - baseTris;
    const reading = sk === 'MOVED' ? 'below the foot (junction skeleton or field blend)'
      : dt !== 0 ? 'above the foot, or non-SDF geometry — not the junction skeleton'
      : 'inert here (within what these instruments see)';
    console.log('  ' + r.label.padEnd(28) + sk.padStart(10) + (isFinite(t) ? String(t) : 'n/a').padStart(10)
      + (isFinite(dt) ? (dt > 0 ? '+' : '') + dt : 'n/a').padStart(9) + '  ' + reading);
  }
}

/* SCALE NOTE. Two mm/unit conversions exist and they disagree by ~3x:
 *   - r.mmPerUnit (the tool's original columns, and PR #102's gap quotes): heightMM over a
 *     ROUGH span (junction height + ring diameter). Labeled rough; kept for continuity.
 *   - mmT below: derived from the floor the app itself passed — floorRPassed is
 *     activeFloorMM/activeMMPerUnit/2 in flower.js, so activeMMPerUnit = floorMM/(2·floorRPassed).
 *     This is the export scale the STL is actually written at (mesh.scale.setScalar(mmPerUnit)),
 *     so mm printed with it are the mm a slicer would measure. Used for all Ø/height columns
 *     in the sections added below. */
const mmTrue = (r) => (r.floorMM && r.floorRPassed) ? r.floorMM / (2 * r.floorRPassed) : r.mmPerUnit;
console.log('\nARRIVAL GEOMETRY (per row — TRUE chain ends (P3), spread, spans in mm at the floor-derived export scale):');
console.log('  ' + 'row'.padEnd(28) + 'nEnds  yArr'.padEnd(16) + 'endY spread'.padStart(12) + 'arrR mean'.padStart(11) + 'feet→arr mm'.padStart(13) + 'arr→stem mm'.padStart(13) + 'mm/unit'.padStart(9));
for (const r of out) {
  const m = r.meta, mm = mmTrue(r);
  const spread = r.ends.length ? Math.max(...r.ends.map((q) => Math.abs(q.p[1] - m.yArrival))) : NaN;
  const arrR = r.ends.length ? r.ends.reduce((s, q) => s + Math.hypot(q.p[0], q.p[2]), 0) / r.ends.length : NaN;
  console.log('  ' + r.label.padEnd(28) + String(r.ends.length).padStart(5)
    + m.yArrival.toFixed(4).padStart(9)
    + (isFinite(spread) ? spread.toExponential(1) : 'n/a').padStart(12)
    + (isFinite(arrR) ? arrR.toFixed(4) : 'n/a').padStart(11)
    + ((m.yFeet - m.yArrival) * mm).toFixed(2).padStart(13)
    + ((m.yArrival - m.yStem) * mm).toFixed(2).padStart(13)
    + mm.toFixed(1).padStart(9));
}
console.log('\nAREA LAW DOWN THE DESCENT (trunk radius vs √Σr² of strands joined above it):');
console.log('  ' + 'row'.padEnd(28) + 'Rtrunk'.padStart(8) + 'stemR'.padStart(8) + 'stem/trunk area'.padStart(16)
  + 'swell/trunk area'.padStart(17) + 'min lathe r/Rtrunk (y)'.padStart(24) + 'Øtrunk mm'.padStart(10) + 'Østem mm'.padStart(10));
for (const r of out) {
  const m = r.meta, mm = mmTrue(r);
  // trunk profile from the recorded lathe caps, restricted to the descent (below yArrival,
  // above the stem top) — exactly the span the governing rule constrains.
  let minR = Infinity, minY = NaN;
  for (const i of r.cls.lathe) {
    const c = r.caps_raw[i];
    for (const [p, rad] of [[c.a, c.ra], [c.b, c.rb]]) {
      if (p[1] <= m.yArrival && p[1] >= m.yStem && rad < minR) { minR = rad; minY = p[1]; }
    }
  }
  console.log('  ' + r.label.padEnd(28) + m.Rtrunk.toFixed(4).padStart(8) + m.stemR.toFixed(4).padStart(8)
    + ((m.stemR / m.Rtrunk) ** 2).toFixed(2).padStart(16)
    + ((m.swell / m.Rtrunk) ** 2).toFixed(2).padStart(17)
    + (isFinite(minR) ? `${(minR / m.Rtrunk).toFixed(3)} (y=${minY.toFixed(3)})` : 'n/a').padStart(24)
    + (2 * m.Rtrunk * mm).toFixed(2).padStart(10) + (2 * m.stemR * mm).toFixed(2).padStart(10));
}
/* PRINT FLOOR ACROSS THE FOOT — the same strand's exported diameter on each side of the
 * foot. Above it the strand is an addTube primitive: _floorRadius lifts it to floorR at
 * export. Below it the same radius drives the SDF skeleton, where opts.floorR is never
 * read. Both diameters computed from the recorded foot radii and the row's own floor. */
console.log('\nPRINT FLOOR ACROSS THE FOOT (per row, mm at the floor-derived export scale):');
console.log('  ' + 'row'.padEnd(28) + 'floor Ø'.padStart(9) + 'foot Ø raw (min–max)'.padStart(22) + 'petal side exports'.padStart(20) + 'continuation'.padStart(14));
for (const r of out) {
  const mm = mmTrue(r);
  const ds = r.feetRaw.map((f) => 2 * f.r * mm);
  const lo = Math.min(...ds), hi = Math.max(...ds);
  const petal = `${Math.max(lo, r.floorMM).toFixed(2)}–${Math.max(hi, r.floorMM).toFixed(2)}`;
  console.log('  ' + r.label.padEnd(28) + r.floorMM.toFixed(2).padStart(9)
    + `${lo.toFixed(2)}–${hi.toFixed(2)}`.padStart(22) + petal.padStart(20)
    + `${lo.toFixed(2)}–${hi.toFixed(2)}`.padStart(14) + (lo < r.floorMM ? '  BELOW FLOOR' : ''));
}

console.log('\nARRIVAL CLEARANCE (per row — each TRUE chain end against its nearest neighbouring end):');
console.log('  worst = the end farthest from any neighbour. surface gap = centre dist − r_i − r_j; smin bridges ~k.');
console.log('  ' + 'row'.padEnd(28) + 'nEnds'.padStart(6) + 'gap min'.padStart(10) + 'gap worst'.padStart(11) + 'k'.padStart(8) + 'margin k−worst'.padStart(15) + '  verdict');
for (const r of out) {
  if (r.ends.length < 2) { console.log('  ' + r.label.padEnd(28) + ' <2 distinct ends — no circle'); continue; }
  const gaps = r.ends.map((e, i) => {
    let g = Infinity;
    for (let j = 0; j < r.ends.length; j++) { if (j === i) continue; const o = r.ends[j];
      const d = dist(e.p, o.p) - e.r - o.r; if (d < g) g = d; }
    return g;
  });
  const worst = Math.max(...gaps), best = Math.min(...gaps);
  const margin = r.k - worst;
  console.log('  ' + r.label.padEnd(28) + String(r.ends.length).padStart(6) + best.toFixed(4).padStart(10)
    + worst.toFixed(4).padStart(11) + r.k.toFixed(4).padStart(8) + margin.toFixed(4).padStart(15)
    + (margin > 0 ? '  all ends touch a neighbour (crowding)' : '  CLEAR — free ends without a trunk'));
}

console.log('\nFREE ENDS IF THE LATHE WERE DELETED (per row, gap beyond the blend radius k):');
for (const r of out) {
  if (!r.orphans.length) { console.log(`  ${r.label.padEnd(28)} none`); continue; }
  const g = r.orphans.map((o) => o.gapMM);
  console.log(`  ${r.label.padEnd(28)} ${r.orphans.length} free ends, gap ${Math.min(...g).toFixed(2)}–${Math.max(...g).toFixed(2)} mm, Ø ${r.orphans[0].diaMM.toFixed(2)} mm`);
}

if (failures.length) {
  console.log('\nVALIDITY FAILURES — the numbers above are UNVERIFIED:');
  for (const f of failures) console.log('  ! ' + f);
  console.log(NEGATIVE ? '\nNegative control: FAILED as required. ✓' : `\n${failures.length} validity failure(s). ✗`);
  process.exit(NEGATIVE ? 0 : 1);
}
if (NEGATIVE) { console.log('\nNegative control: the harness PASSED with a corrupted detector input — the detector is not detecting. ✗'); process.exit(1); }
console.log('\nAll validity assertions hold. ✓');
