/* ===================================================================
   THE MOPHEAD SHEET (the mophead session, Oct 24 — Eva's rulings on
   docs/bloom-hydrangea-discovery.md: a compound umbel of depth 2, a dome and
   not a ball, smaller florets on the reduced lattice down to a derived floor,
   the floret count clamped to the budget and told). Composed so what is left
   to Eva's eye is on one page:

   (1) THE DOME — the mophead row (12 rays x 12 round four-petal florets at
       the floret floor) from the side and from below.
   (2) A 15 cm HEAD — the same dome on 55 mm rays at 45 deg.
   (3) THE FLORET FLOOR beside a 20 mm floret — one sub-umbel each, one camera.
   (4) THE REDUCED LATTICE up close against the full one — a 20 mm floret's
       petal on a depth-2 umbel (6 columns, a 2-segment bead) beside the same
       floret on a depth-1 umbel (10 columns, 4 segments), one camera.
   (5) THE CLAMP CORNER — 12 x 12 florets x 12 petals at 0.60x, asked against
       built in the caption, read off the builder's own budget record.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the inflorescence assertions (ID + UM0-UM9) run before the
   shutter — ID10 (d) aside, which is the dome's own declared fusion — the
   cell's own STL exported and required watertight. Every number in a caption
   is read off the page's metrics or the exported file. No pixel delta is
   quoted anywhere (this renderer is not deterministic between page sessions).

   RUN:  node tools/shot-bloom-mophead.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         inflorescenceAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-mophead';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-mophead-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* THE FILE'S OWN EXTENT AND VOLUME. The volume is the SUM OF THE CLOSED
   SHELLS' signed volumes — florets overlap by construction, so this counts the
   overlaps twice and is an UPPER BOUND on the printed material; it is named so
   in every caption. PA12 at 1.01 g/cm^3 (the sintered part, not the powder). */
const PA12_G_PER_MM3 = 1.01e-3;
function fileFacts(buf) {
  const n = buf.readUInt32LE(80);
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], vol = 0;
  for (let t = 0; t < n; t++) {
    const o = 84 + t * 50 + 12, v = [];
    for (let k = 0; k < 3; k++) {
      const p = [buf.readFloatLE(o + 12 * k), buf.readFloatLE(o + 12 * k + 4), buf.readFloatLE(o + 12 * k + 8)];
      for (let i = 0; i < 3; i++) { if (p[i] < lo[i]) lo[i] = p[i]; if (p[i] > hi[i]) hi[i] = p[i]; }
      v.push(p);
    }
    const [a, b, c] = v;
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return { lo, hi, volMm3: vol, massG: vol * PA12_G_PER_MM3 };
}

const VIEWS = {
  side: (f) => ({ r: f.r, at: f.at, dir: [0.12, -0.96, 0.22] }),
  below: (f) => ({ r: f.r, at: f.at, dir: [0.2, -0.4, -0.89] }),
  close: (f) => ({ r: f.r, at: f.at, dir: f.dir || [0.15, -0.3, 0.94] }),
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* Settled on the real signal: two consecutive byte-identical frames. */
async function shoot(file, view, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    const f = VIEWS[view](frame); f.r *= scale;
    await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f);
    let prev = null, buf = null;
    for (let k = 0; k < 20; k++) { await page.waitForTimeout(200); buf = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 800 } }); if (prev && buf.equals(prev)) break; prev = buf; }
    fs.writeFileSync(file, buf);
    const { width, height, data } = decodePNG(buf);
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac >= 0.02 && frac <= 0.99) return { file: path.basename(file), scale };
    if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}

/* a point of a floret placed in the world: the ray's matrix on the sub-umbel's
   own placement of it */
const mApply = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[3], M[4] * p[0] + M[5] * p[1] + M[6] * p[2] + M[7], M[8] * p[0] + M[9] * p[1] + M[10] * p[2] + M[11]];

async function cell({ label, set: sets, views, ruling = '', frameOf }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const inf = await inflorescenceAssertions(page, { label, set: sets });
  const fatal = inf.filter((l) => !/^ID10: \(d\)/.test(l));     // the dome's declared fusion (docs/bloom-mophead-outcome.md)
  if (fatal.length) await die(`${label}: inflorescence: ${fatal.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download — a depth-2 umbel never refuses for its florets`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const facts = fileFacts(buf);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const fr = frameOf(m0, facts);
  const shots = {};
  for (const view of views) shots[view] = (await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr)).file;
  await setPreview(false);
  const P = m0.inflorescence, B = m0.inflorescenceBuilt;
  const sub = B && B.sub;
  const rec = { label, ruling, shots, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: stl.tris, shownTris: m.shownTris, facts,
    compound: !!(P && P.compound), rays: B ? B.count : 0, perRay: sub ? sub.count : (B ? B.count : 0), clamp: P && P.budgetClamp,
    floret: sub ? { L: sub.plan.petalLength, W: sub.plan.petalWidth, floor: sub.plan.bodyFloor, lattice: sub.floretUnit && sub.floretUnit.lattice && sub.floretUnit.lattice[0] && sub.floretUnit.lattice[0].lattice, tris: sub.floretUnit && sub.floretUnit.tris }
      : P ? { L: P.petalLength, W: P.petalWidth, lattice: (m0.headPetalLattices || [])[0] || null } : null };
  const across = Math.max(facts.hi[0] - facts.lo[0], facts.hi[1] - facts.lo[1]);
  console.log(`  ${label.padEnd(64)} tris ${stl.tris} · ${rec.rays} x ${rec.perRay} · ${across.toFixed(1)} mm across · <= ${facts.massG.toFixed(1)} g PA12`);
  return rec;
}

/* the whole dome: centred between the boss and the farthest floret */
const domeFrame = (m, f) => {
  const c = [(f.lo[0] + f.hi[0]) / 2, (f.lo[1] + f.hi[1]) / 2, Math.max(f.lo[2], m.inflorescenceBuilt.knot.centre[2] - 10) * 0.5 + f.hi[2] * 0.5];
  return { at: c, r: 0.62 * Math.max(f.hi[0] - f.lo[0], f.hi[1] - f.lo[1], f.hi[2] - Math.max(f.lo[2], m.inflorescenceBuilt.knot.centre[2] - 30)) };
};
/* one sub-umbel: ray 0's sub-boss centre, the sub-umbel's own reach */
const subFrame = (reach) => (m) => {
  const B = m.inflorescenceBuilt, S = B.sub, M = B.placed[0].M;
  return { at: mApply(M, S.knot.centre), r: reach };
};
/* one floret petal: ray 0, floret 0, its head */
const floretFrame = (reach) => (m) => {
  const B = m.inflorescenceBuilt;
  if (B.sub) { const M = B.placed[0].M, q = B.sub.placed[0]; return { at: mApply(M, q.headAt), r: reach, dir: [0.1, -0.25, 0.96] }; }
  return { at: B.placed[0].headAt, r: reach, dir: [0.1, -0.25, 0.96] };
};

const MOP = { stemLength: 120, inflorescence: 'UMBEL', umbelDepth: '2' };
const ROUND = { floretPetals: 4, petalWidth: 16, petalTipShape: 2.0, petalCup: 0.2, petalTilt: 15 };
const DOME = { ...MOP, ...ROUND, umbelFlorets: 12, pedicelLength: 12, pedicelAngle: 20, floretScale: 0.2 };
console.log('THE MOPHEAD SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, ID + UM0-UM9 asserted before the shutter.\n');
const dome = await cell({ label: 'THE MOPHEAD — 12 rays x 12 round four-petal florets at the floor', set: set(DOME), views: ['side', 'below'], frameOf: domeFrame,
  ruling: 'rays of 40 mm at 50 deg (the registry\'s defaults), sub-umbels on 12 mm pedicels at 20 deg' });
const big = await cell({ label: 'A 15 cm HEAD — the same dome on 55 mm rays at 45 deg', set: set({ ...DOME, umbelRayLength: 55, umbelRayAngle: 45 }), views: ['side'], frameOf: domeFrame });
const floorCell = await cell({ label: 'the FLORET FLOOR (floretScale 0.20 asked) — one sub-umbel', set: set({ ...MOP, umbelRays: 6, umbelFlorets: 6, floretScale: 0.2 }), views: ['close'], frameOf: subFrame(48) });
const twenty = await cell({ label: 'a 20 mm floret (a 40 mm head petal at 0.50x) — one sub-umbel', set: set({ ...MOP, umbelRays: 6, umbelFlorets: 6, petalLength: 40, floretScale: 0.5 }), views: ['close'], frameOf: subFrame(48) });
const reduced = await cell({ label: 'the REDUCED lattice — a 20 mm floret on a depth-2 umbel', set: set({ ...MOP, umbelRays: 6, umbelFlorets: 6, petalLength: 40, floretScale: 0.5 }), views: ['close'], frameOf: floretFrame(16) });
const full = await cell({ label: 'the FULL lattice — the same floret on a depth-1 umbel', set: set({ stemLength: 120, inflorescence: 'UMBEL', umbelFlorets: 6, petalLength: 40, floretScale: 0.5 }), views: ['close'], frameOf: floretFrame(16) });
const corner = await cell({ label: 'THE CLAMP CORNER — 12 x 12 florets x 12 petals at 0.60x', set: set({ ...MOP, umbelFlorets: 12, floretPetals: 12, floretScale: 0.6, pedicelLength: 12, pedicelAngle: 20 }), views: ['side'], frameOf: domeFrame });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const latt = (L) => (L ? `${L.columns} columns, a ${L.beadCap}-segment bead` : '—');
const num = (c) => {
  const f = c.facts, across = Math.max(f.hi[0] - f.lo[0], f.hi[1] - f.lo[1]);
  const fl = c.floret ? ` · florets ${c.floret.L.toFixed(2)} x ${c.floret.W.toFixed(2)} mm, ${latt(c.floret.lattice)}${c.floret.tris ? `, ${c.floret.tris.toLocaleString('en-US')} tris a floret` : ''}` : '';
  const cl = c.clamp ? (c.clamp.clamped ? `<br><b>BUDGET CLAMPED: ${c.clamp.askedFlorets} florets asked, ${c.clamp.builtFlorets} built</b> (one floret ${c.clamp.floretTris.toLocaleString('en-US')} tris, measured; asked ${c.clamp.askedTotal.toLocaleString('en-US')} tris, built ${c.clamp.predictedTotal.toLocaleString('en-US')} against ${c.clamp.budget.toLocaleString('en-US')})` : ` · ${c.clamp.builtFlorets} florets, ${c.clamp.predictedTotal.toLocaleString('en-US')} tris of the ${c.clamp.budget.toLocaleString('en-US')} budget`) : '';
  return `<b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1048576).toFixed(1)} MiB, ${c.tris.toLocaleString('en-US')} tris export)<br>${c.compound ? `${c.rays} rays x ${c.perRay} florets · ` : ''}${across.toFixed(1)} mm across, ${(f.hi[2] - f.lo[2]).toFixed(1)} mm tall (stem included) · at most ${f.massG.toFixed(1)} g of PA12 (the shells' summed volume, overlaps counted twice)${fl}${cl}`;
};
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap})</i>${c.ruling ? `<br><small>${esc(c.ruling)}</small>` : ''}<br>${num(c)}</figcaption></figure>`;
const bf = floorCell.floret.floor;
const html = `<title>Mophead</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The mophead — a compound umbel, depth 2</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; the inflorescence assertions (ID and UM0-UM9: the depth's two statements, the reduced lattice read off the emitted rim, the budget clamp, every floret's root inside its sub-boss and every sub-boss on its ray, the floret floor restated) ran before every shutter and each cell's own STL exported watertight. The dome's florets fuse into one surface by construction, and that is declared by value (docs/bloom-mophead-outcome.md). The floret floor is <b>${bf ? `${bf.lengthMm.toFixed(2)} x ${bf.widthMm.toFixed(2)} mm (${bf.scale.toFixed(3)}x the head's 35 x 16 petal)` : '—'}</b> — the least scale at which a petal still keeps its full sheet body ${bf ? bf.taperMm.toFixed(1) : '3'} mm in from both margins and the drawn tip, past the root blend.</p>
<h2>1. The dome</h2>
<main>${fig(dome, 'side', 'from the side')}${fig(dome, 'below', 'from below')}</main>
<h2>2. A 15 cm head</h2>
<main>${fig(big, 'side', 'from the side')}</main>
<h2>3. The floret floor beside a 20 mm floret — one sub-umbel each, one camera</h2>
<main>${fig(floorCell, 'close', 'one sub-umbel')}${fig(twenty, 'close', 'one sub-umbel')}</main>
<h2>4. The reduced lattice up close against the full one — one camera</h2>
<main>${fig(reduced, 'close', 'one floret')}${fig(full, 'close', 'one floret')}</main>
<h2>5. The clamp corner</h2>
<main>${fig(corner, 'side', 'from the side')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close();
server.close();
